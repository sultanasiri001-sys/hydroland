import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type MarineProvider = 'STORMGLASS' | 'MARINETRAFFIC';
export const MARINE_RESPONSE_LIMIT_BYTES = 262_144;
export const MARINE_REQUEST_TIMEOUT_MS = 8_000;
const origins = { STORMGLASS: 'https://api.stormglass.io', MARINETRAFFIC: 'https://services.marinetraffic.com' } as const;

export function marineProviderFailure(code: string): ServiceUnavailableException {
  return new ServiceUnavailableException({ code, message: 'Marine provider evidence is unavailable; no operational approval has been granted.' });
}

export function marineProviderOrigin(provider: MarineProvider): string {
  const configured = provider === 'STORMGLASS' ? process.env.STORMGLASS_API_BASE_URL : process.env.MARINETRAFFIC_API_BASE_URL;
  let url: URL;
  try { url = new URL(configured?.trim() || origins[provider]); } catch { throw marineProviderFailure('MARINE_ENDPOINT_NOT_ALLOWED'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw marineProviderFailure('MARINE_ENDPOINT_NOT_ALLOWED');
  if (url.origin === origins[provider]) return url.origin;
  // Only an explicitly confirmed disposable test process may address a literal
  // loopback HTTP origin. Production cannot opt into arbitrary hosts or DNS.
  const isolated = process.env.CI === 'true' && process.env.NODE_ENV === 'test'
    && process.env.D03_MARINE_TEST_CONFIRM === 'DISPOSABLE_LOOPBACK_ONLY';
  if (isolated && url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname) && url.port) return url.origin;
  throw marineProviderFailure('MARINE_ENDPOINT_NOT_ALLOWED');
}

export async function marineProviderJson(provider: MarineProvider, url: URL, headers: Record<string, string>) {
  if (url.origin !== marineProviderOrigin(provider) || url.username || url.password || url.hash) throw marineProviderFailure('MARINE_ENDPOINT_NOT_ALLOWED');
  const signal = AbortSignal.timeout(MARINE_REQUEST_TIMEOUT_MS);
  let response: Response;
  try { response = await fetch(url, { method: 'GET', headers, redirect: 'manual', signal }); }
  catch { throw marineProviderFailure(signal.aborted ? 'MARINE_PROVIDER_TIMEOUT' : 'MARINE_PROVIDER_REQUEST_FAILED'); }
  const reject = async (code: string): Promise<never> => {
    await response.body?.cancel().catch(() => undefined);
    throw marineProviderFailure(code);
  };
  if (response.status >= 300 && response.status < 400 || response.redirected) return reject('MARINE_PROVIDER_REDIRECT_REFUSED');
  if (!response.ok) return reject(response.status === 429 ? 'MARINE_PROVIDER_QUOTA_EXHAUSTED'
    : [401, 403].includes(response.status) ? 'MARINE_PROVIDER_AUTHENTICATION_FAILED' : 'MARINE_PROVIDER_REQUEST_FAILED');
  if (!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) return reject('MARINE_PROVIDER_CONTENT_TYPE_INVALID');
  const declaredLength = response.headers.get('content-length');
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MARINE_RESPONSE_LIMIT_BYTES)) return reject('MARINE_PROVIDER_RESPONSE_TOO_LARGE');
  if (!response.body) return reject('MARINE_PROVIDER_RESPONSE_INVALID');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MARINE_RESPONSE_LIMIT_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw marineProviderFailure('MARINE_PROVIDER_RESPONSE_TOO_LARGE');
      }
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof ServiceUnavailableException) throw error;
    throw marineProviderFailure(signal.aborted ? 'MARINE_PROVIDER_TIMEOUT' : 'MARINE_PROVIDER_RESPONSE_INVALID');
  } finally { reader.releaseLock(); }
  try {
    const bytes = Buffer.concat(chunks), text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { payload: JSON.parse(text) as unknown, responseHash: createHash('sha256').update(bytes).digest('hex'), fetchedAt: new Date().toISOString() };
  } catch { throw marineProviderFailure('MARINE_PROVIDER_RESPONSE_INVALID'); }
}
