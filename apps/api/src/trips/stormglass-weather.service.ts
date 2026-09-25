import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { WeatherSnapshot } from './weather-gate.service';

type StormglassHour = Record<string, { sg?: number; noaa?: number; meteo?: number } | undefined> & { time?: string };
type StormglassResponse = { hours?: StormglassHour[] };

const value = (hour: StormglassHour, key: string) => {
  const metric = hour[key];
  if (!metric) return undefined;
  return metric.sg ?? metric.noaa ?? metric.meteo;
};
const validDate=(value:Date|string|undefined)=>{
  const date=value instanceof Date?value:new Date(value??Date.now());
  if(Number.isNaN(date.getTime()))throw new BadRequestException('Valid forecast time is required.');
  return date;
};

@Injectable()
export class StormglassWeatherService {
  constructor(private readonly integrations: IntegrationService) {}

  async snapshot(latitude: number, longitude: number, at?:Date|string): Promise<WeatherSnapshot> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid latitude and longitude are required.');
    }
    const target=validDate(at);
    this.integrations.requireOperational('WEATHER_MARINE', { allowSandbox: true });
    const apiKey = process.env.STORMGLASS_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Stormglass Sandbox is not configured.');

    const base=process.env.STORMGLASS_API_BASE_URL?.trim()||'https://api.stormglass.io';
    let url:URL;
    try{url=new URL('/v2/weather/point',base);}catch{throw new ServiceUnavailableException('Stormglass endpoint is not configured correctly.');}
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lng', String(longitude));
    url.searchParams.set('params', 'windSpeed,windGust,windDirection,waveHeight,waveDirection,wavePeriod,swellHeight,swellDirection,waterTemperature');
    url.searchParams.set('start',String(Math.floor((target.getTime()-3_600_000)/1000)));
    url.searchParams.set('end',String(Math.ceil((target.getTime()+3_600_000)/1000)));
    const signal = AbortSignal.timeout(8_000);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: apiKey }, signal });
    } catch {
      throw new ServiceUnavailableException('Stormglass weather request failed.');
    }
    if (!response.ok) throw new ServiceUnavailableException(`Stormglass weather request failed (${response.status}).`);
    const payload = await response.json() as StormglassResponse;
    const hours=payload.hours??[];
    const hour=hours.reduce<StormglassHour|undefined>((best,current)=>{
      const currentTime=current.time?new Date(current.time).getTime():Number.NaN;
      if(!Number.isFinite(currentTime))return best;
      if(!best)return current;
      const bestTime=best.time?new Date(best.time).getTime():Number.NaN;
      return !Number.isFinite(bestTime)||Math.abs(currentTime-target.getTime())<Math.abs(bestTime-target.getTime())?current:best;
    },undefined);
    if (!hour) throw new ServiceUnavailableException('Stormglass returned no marine forecast for the trip time.');
    return {
      provider: 'STORMGLASS',
      observedAt: hour.time ?? target.toISOString(),
      windSpeedKph: value(hour, 'windSpeed') === undefined ? undefined : value(hour, 'windSpeed')! * 3.6,
      windGustKph: value(hour, 'windGust') === undefined ? undefined : value(hour, 'windGust')! * 3.6,
      windDirectionDeg: value(hour, 'windDirection'),
      waveHeightM: value(hour, 'waveHeight'),
      waveDirectionDeg: value(hour, 'waveDirection'),
      wavePeriodS: value(hour, 'wavePeriod'),
      swellHeightM: value(hour, 'swellHeight'),
      swellDirectionDeg: value(hour, 'swellDirection'),
      waterTemperatureC: value(hour, 'waterTemperature'),
      decision: 'REVIEW_REQUIRED',
      reason: 'Marine forecast supplied by Stormglass for the trip window; operational approval remains human-reviewed.',
    };
  }
}
