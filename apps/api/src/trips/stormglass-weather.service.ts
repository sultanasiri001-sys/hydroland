import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { WeatherSnapshot } from './weather-gate.service';
import { finiteNumericInput } from '../geo/coordinate-input';
import { forecastWindow, hasWeatherMeasurements } from './weather-review-context';
import { marineEvidenceDigest, marineUtcInstant } from '../integrations/marine-provider-evidence';
import { marineProviderFailure, marineProviderJson, marineProviderOrigin } from '../integrations/marine-provider-transport';

type StormglassMetric = { sg?: number; noaa?: number; meteo?: number; [source:string]:number|undefined };
type StormglassHour = Record<string, StormglassMetric | string | undefined> & { time?: string };
type StormglassResponse = { hours?: StormglassHour[] };

const value = (hour: StormglassHour, key: string) => {
  const metric = hour[key];
  if (!metric || typeof metric !== 'object' || Array.isArray(metric)) return undefined;
  return finiteNumericInput(metric.sg) ?? undefined;
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

    const base=marineProviderOrigin('STORMGLASS');
    const url=new URL('/v2/weather/point',base);
    const lifecycle=process.env.HYDROLAND_INTEGRATION_WEATHER_MARINE_STATUS;
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lng', String(longitude));
    url.searchParams.set('params', 'windSpeed,gust,windDirection,waveHeight,waveDirection,wavePeriod,swellHeight,swellDirection,swellPeriod,currentSpeed,currentDirection,waterTemperature');
    url.searchParams.set('source','sg');
    const window=forecastWindow(target.getTime());
    url.searchParams.set('start',String(window.start/1000));
    url.searchParams.set('end',String(window.end/1000));
    try {
    const received=await marineProviderJson('STORMGLASS',url,{Authorization:apiKey,Accept:'application/json'});
    this.integrations.requireOperational('WEATHER_MARINE', { allowSandbox: true });
    if(base!==marineProviderOrigin('STORMGLASS')||apiKey!==process.env.STORMGLASS_API_KEY?.trim()||lifecycle!==process.env.HYDROLAND_INTEGRATION_WEATHER_MARINE_STATUS)throw marineProviderFailure('MARINE_CONFIGURATION_CHANGED');
    const payload=received.payload as StormglassResponse;
    const hours=payload&&Array.isArray(payload.hours)?payload.hours:[];
    const hour=hours.reduce<StormglassHour|undefined>((best,current)=>{
      if(!current||typeof current!=='object'||Array.isArray(current))return best;
      const instant=marineUtcInstant(current.time),currentTime=instant?Date.parse(instant):Number.NaN;
      if(!Number.isFinite(currentTime)||currentTime<window.start||currentTime>window.end)return best;
      if(!best)return current;
      const bestTime=best.time?new Date(best.time).getTime():Number.NaN;
      return !Number.isFinite(bestTime)||Math.abs(currentTime-target.getTime())<Math.abs(bestTime-target.getTime())?current:best;
    },undefined);
    if (!hour)throw marineProviderFailure('WEATHER_FORECAST_WINDOW_EMPTY');
    const snapshot:WeatherSnapshot={
      provider: 'STORMGLASS',
      source:'sg',
      observedAt: marineUtcInstant(hour.time)!,
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
    if(!hasWeatherMeasurements(snapshot))throw marineProviderFailure('WEATHER_REQUESTED_SOURCE_MISSING');
    snapshot.sourceEvidence={schemaVersion:1,provider:'STORMGLASS',dataset:'sg',requestedFor:target.toISOString(),
      windowStart:new Date(window.start).toISOString(),windowEnd:new Date(window.end).toISOString(),
      dataDigest:marineEvidenceDigest({latitude,longitude,target:target.toISOString(),snapshot})};
    await this.integrations.recordProviderSignal('WEATHER_MARINE','SUCCESS');
    return snapshot;
    }catch(error){
      await this.integrations.recordProviderSignal('WEATHER_MARINE','PROVIDER_FAILURE');
      throw error;
    }
  }
}
