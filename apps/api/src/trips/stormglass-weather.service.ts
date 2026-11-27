import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { WeatherSnapshot } from './weather-gate.service';
import { finiteNumericInput } from '../geo/coordinate-input';
import { forecastWindow, hasWeatherMeasurements } from './weather-review-context';
import { boundedProviderJson, stormglassEndpoint } from '../integrations/provider-read-http';
import { provenance, providerReadFailure, ProviderReadUnavailable, utcTime } from '../integrations/provider-read-policy';
import { Prisma } from '@prisma/client';

type StormglassMetric = { sg?: number; noaa?: number; meteo?: number; [source:string]:number|undefined };
type StormglassHour = Record<string, StormglassMetric | string | undefined> & { time?: string };
type StormglassResponse = { hours?: StormglassHour[] };

const value = (hour: StormglassHour, key: string) => {
  const metric = hour[key];
  if (!metric || typeof metric === 'string') return undefined;
  // A different model must never be silently attributed to requested source sg.
  const numeric=finiteNumericInput(metric.sg);
  if(numeric===null)return undefined;
  if(key.endsWith('Direction'))return numeric>=0&&numeric<360?numeric:undefined;
  if(key==='waterTemperature')return numeric>=-273.15?numeric:undefined;
  return numeric>=0?numeric:undefined;
};
const validDate=(value:Date|string|undefined)=>{
  const date=value instanceof Date?value:new Date(value??Date.now());
  if(Number.isNaN(date.getTime()))throw new BadRequestException('Valid forecast time is required.');
  return date;
};

@Injectable()
export class StormglassWeatherService {
  constructor(private readonly integrations: IntegrationService) {}

  async sourceCurrent(snapshot:WeatherSnapshot,tx?:Prisma.TransactionClient){
    if(!snapshot.provenance)return false;
    try{const source=await this.integrations.providerSource('WEATHER_MARINE',tx);return source.policyHash===snapshot.provenance.policyHash&&source.documentId===snapshot.provenance.documentId&&source.version===snapshot.provenance.documentVersion&&source.sourceHash===snapshot.provenance.sourceHash;}catch{return false;}
  }

  async snapshot(latitude: number, longitude: number, at?:Date|string): Promise<WeatherSnapshot> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid latitude and longitude are required.');
    }
    const target=validDate(at);
    this.integrations.requireOperational('WEATHER_MARINE', { allowSandbox: true });
    const apiKey = process.env.STORMGLASS_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Stormglass API key is not configured.');

    const url=stormglassEndpoint();
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lng', String(longitude));
    url.searchParams.set('params', 'windSpeed,gust,windDirection,waveHeight,waveDirection,wavePeriod,swellHeight,swellDirection,swellPeriod,currentSpeed,currentDirection,waterTemperature');
    url.searchParams.set('source','sg');
    const window=forecastWindow(target.getTime());
    url.searchParams.set('start',String(window.start/1000));
    url.searchParams.set('end',String(window.end/1000));
    return this.integrations.withProviderRead('WEATHER_MARINE',async source=>{
    const signal = AbortSignal.timeout(8_000);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: apiKey, Accept:'application/json' }, redirect:'error', signal });
    } catch {
      await this.integrations.recordProviderSignal('WEATHER_MARINE','PROVIDER_FAILURE');
      return providerReadFailure('PROVIDER_FAILED');
    }
    let payload:StormglassResponse;
    try{payload = await boundedProviderJson(response) as StormglassResponse;}catch(error){await this.integrations.recordProviderSignal('WEATHER_MARINE','PROVIDER_FAILURE');if(error instanceof ProviderReadUnavailable)throw error;return providerReadFailure('PROVIDER_RESPONSE_INVALID');}
    const hours=payload&&Array.isArray(payload.hours)?payload.hours:[];
    const hour=hours.reduce<StormglassHour|undefined>((best,current)=>{
      if(!current||typeof current!=='object'||Array.isArray(current))return best;
      const currentTime=utcTime(current.time);
      if(!Number.isFinite(currentTime)||currentTime<window.start||currentTime>window.end)return best;
      if(!best)return current;
      const bestTime=best.time?new Date(best.time).getTime():Number.NaN;
      return !Number.isFinite(bestTime)||Math.abs(currentTime-target.getTime())<Math.abs(bestTime-target.getTime())?current:best;
    },undefined);
    if (!hour){await this.integrations.recordProviderSignal('WEATHER_MARINE','PROVIDER_FAILURE');throw new ServiceUnavailableException('Stormglass returned no marine forecast for the trip time.');}
    const snapshot:WeatherSnapshot={
      provider: 'STORMGLASS',
      source:'sg',
      provenance:provenance(source),
      observedAt: new Date(utcTime(hour.time)).toISOString(),
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
    if(!hasWeatherMeasurements(snapshot)){await this.integrations.recordProviderSignal('WEATHER_MARINE','PROVIDER_FAILURE');throw new ServiceUnavailableException('Stormglass returned no valid marine measurements for the trip time.');}
    await this.integrations.recordProviderSignal('WEATHER_MARINE','SUCCESS');
    return snapshot;
    });
  }
}
