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

@Injectable()
export class StormglassWeatherService {
  constructor(private readonly integrations: IntegrationService) {}

  async snapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid latitude and longitude are required.');
    }
    this.integrations.requireOperational('WEATHER_MARINE', { allowSandbox: true });
    const apiKey = process.env.STORMGLASS_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Stormglass Sandbox is not configured.');

    const url = new URL('https://api.stormglass.io/v2/weather/point');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lng', String(longitude));
    url.searchParams.set('params', 'windSpeed,windGust,windDirection,waveHeight,waveDirection,wavePeriod,swellHeight,swellDirection,waterTemperature');
    const signal = AbortSignal.timeout(8_000);
    let response: Response;
    try {
      response = await fetch(url, { headers: { Authorization: apiKey }, signal });
    } catch {
      throw new ServiceUnavailableException('Stormglass weather request failed.');
    }
    if (!response.ok) throw new ServiceUnavailableException(`Stormglass weather request failed (${response.status}).`);
    const payload = await response.json() as StormglassResponse;
    const hour = payload.hours?.[0];
    if (!hour) throw new ServiceUnavailableException('Stormglass returned no marine forecast.');
    return {
      provider: 'STORMGLASS',
      observedAt: hour.time ?? new Date().toISOString(),
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
      reason: 'Marine forecast supplied by Stormglass; operational approval remains human-reviewed.',
    };
  }
}
