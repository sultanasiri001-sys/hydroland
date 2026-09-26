import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { WeatherSnapshot } from './weather-gate.service';

type StormglassMetric = { sg?: number; noaa?: number; meteo?: number; [source:string]:number|undefined };
type StormglassHour = Record<string, StormglassMetric | string | undefined> & { time?: string };
type StormglassResponse = { hours?: StormglassHour[] };

const value = (hour: StormglassHour, key: string) => {
  const metric = hour[key];
  if (!metric || typeof metric === 'string') return undefined;
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
    if (!apiKey) throw new ServiceUnavailableException('Stormglass API key is not configured.');

    const base=process.env.STORMGLASS_API_BASE_URL?.trim()||'https://api.stormglass.io';
    let url:URL;
    try{url=new URL('/v2/weather/point',base);}catch{throw new ServiceUnavailableException('Stormglass endpoint is not configured correctly.');}
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lng', String(longitude));
    url.searchParams.set('params', 'windSpeed,gust,windDirection,waveHeight,waveDirection,wavePeriod,swellHeight,swellDirection,swellPeriod,currentSpeed,currentDirection,waterTemperature');
    url.searchParams.set('source','sg');
    url.searchParams.set('start',String(Math.floor((target.getTime()-3_600_000)/1000)));
    url.searchParams.set('end',String(Math.ceil((target.getTime()+3_600_000)/1000)));
    const signal = AbortSignal.timeout(8_000);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: apiKey, Accept:'application/json' }, signal });
    } catch {
      throw new ServiceUnavailableException('Stormglass weather request failed.');
    }
    if (!response.ok) {
      if(response.status===429)throw new ServiceUnavailableException('Stormglass request quota is temporarily exhausted.');
      if(response.status===401||response.status===403)throw new ServiceUnavailableException('Stormglass authentication failed.');
      throw new ServiceUnavailableException(`Stormglass weather request failed (${response.status}).`);
    }
    let payload:StormglassResponse;
    try{payload = await response.json() as StormglassResponse;}catch{throw new ServiceUnavailableException('Stormglass returned an invalid response.');}
    const hours=Array.isArray(payload.hours)?payload.hours:[];
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
      source:'sg',
      observedAt: typeof hour.time==='string' ? hour.time : target.toISOString(),
      windSpeedKph: value(hour, 'windSpeed') === undefined ? undefined : value(hour, 'windSpeed')! * 3.6,
      windGustKph: value(hour, 'gust') === undefined ? undefined : value(hour, 'gust')! * 3.6,
      windDirectionDeg: value(hour, 'windDirection'),
      waveHeightM: value(hour, 'waveHeight'),
      waveDirectionDeg: value(hour, 'waveDirection'),
      wavePeriodS: value(hour, 'wavePeriod'),
      swellHeightM: value(hour, 'swellHeight'),
      swellDirectionDeg: value(hour, 'swellDirection'),
      swellPeriodS:value(hour,'swellPeriod'),
      currentSpeedMps:value(hour,'currentSpeed'),
      currentDirectionDeg:value(hour,'currentDirection'),
      waterTemperatureC: value(hour, 'waterTemperature'),
      decision: 'REVIEW_REQUIRED',
      reason: 'Marine forecast supplied by Stormglass source sg for the trip window; operational approval remains human-reviewed.',
    };
  }
}
