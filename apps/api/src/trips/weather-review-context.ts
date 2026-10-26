import type { WeatherSnapshot } from './weather-gate.service';

export const FORECAST_WINDOW_MS = 3_600_000;
export type WeatherReviewContext = {
  version: 1;
  tripId: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  latitude: number;
  longitude: number;
  locationRevision: string;
};
export const weatherMetricKeys = ['windSpeedKph', 'windGustKph', 'windDirectionDeg', 'waveHeightM', 'waveDirectionDeg', 'wavePeriodS', 'swellHeightM', 'swellDirectionDeg', 'swellPeriodS', 'currentSpeedMps', 'currentDirectionDeg', 'waterTemperatureC'] as const;
const date = (value: unknown) => value instanceof Date ? value.getTime() : typeof value === 'string' && value.trim() ? new Date(value).getTime() : NaN;

export function weatherContext(trip: { id: string; startsAt: Date; endsAt: Date }, location: { locationName: string; latitude: number; longitude: number; revision?: string } | null): WeatherReviewContext | null {
  const startsAt = date(trip.startsAt), endsAt = date(trip.endsAt);
  if (!location || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt || !location.revision || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) return null;
  return { version: 1, tripId: trip.id, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), locationName: location.locationName, latitude: location.latitude, longitude: location.longitude, locationRevision: location.revision };
}

export function sameWeatherContext(a: WeatherReviewContext | null | undefined, b: WeatherReviewContext | null | undefined): boolean {
  return Boolean(a && b && Object.keys(b).every(key => a[key as keyof WeatherReviewContext] === b[key as keyof WeatherReviewContext]));
}

export function forecastWindow(target: number) {
  return { start: Math.floor((target - FORECAST_WINDOW_MS) / 1000) * 1000, end: Math.ceil((target + FORECAST_WINDOW_MS) / 1000) * 1000 };
}

export function hasWeatherMeasurements(snapshot: WeatherSnapshot | null | undefined): boolean {
  return Boolean(snapshot && weatherMetricKeys.some(key => typeof snapshot[key] === 'number' && Number.isFinite(snapshot[key])));
}

export function validWeatherReview(snapshot: WeatherSnapshot | null | undefined, context: WeatherReviewContext | null | undefined, fetchedAt: Date | string | null | undefined, now = Date.now()): boolean {
  if (!snapshot || !context || !sameWeatherContext(snapshot.forecastContext, context) || !hasWeatherMeasurements(snapshot)) return false;
  const target = date(context.startsAt), observed = date(snapshot.observedAt), fetched = date(fetchedAt);
  if (![target, observed, fetched].every(Number.isFinite) || fetched > now) return false;
  const window = forecastWindow(target);
  // This is the provider's existing requested trip window, not an invented age TTL.
  // A future forecast is valid; only a future fetch-record timestamp is invalid.
  return observed >= window.start && observed <= window.end;
}

export function canonicalWeatherJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalWeatherJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonicalWeatherJson(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
