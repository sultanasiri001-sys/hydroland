import { providerReadFailure, ProviderReadUnavailable } from './provider-read-policy';

export async function boundedProviderJson(response: Response, maxBytes = 131072): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return providerReadFailure(response.status === 429 ? 'PROVIDER_QUOTA_EXHAUSTED' : [401,403].includes(response.status) ? 'PROVIDER_ENTITLEMENT_REJECTED' : 'PROVIDER_FAILED');
  }
  if (Number(response.headers.get('content-length') || 0) > maxBytes) { await response.body?.cancel().catch(() => undefined); return providerReadFailure('PROVIDER_RESPONSE_TOO_LARGE'); }
  const reader = response.body?.getReader();
  if (!reader) return providerReadFailure('PROVIDER_RESPONSE_INVALID');
  const parts: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); return providerReadFailure('PROVIDER_RESPONSE_TOO_LARGE'); }
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch (error) { if (error instanceof ProviderReadUnavailable) throw error; return providerReadFailure('PROVIDER_RESPONSE_INVALID'); }
  finally { reader.releaseLock(); }
}

export function stormglassEndpoint(): URL {
  const configured = process.env.STORMGLASS_API_BASE_URL?.trim() || 'https://api.stormglass.io';
  let base: URL; try { base = new URL(configured); } catch { return providerReadFailure('PROVIDER_ENDPOINT_INVALID'); }
  const official = base.origin === 'https://api.stormglass.io';
  // Isolated local transport fixtures cannot enable a remote substitute or
  // override a real deployment's destination, even with SANDBOX lifecycle.
  const fixture = process.env.NODE_ENV === 'test' && ['127.0.0.1','[::1]'].includes(base.hostname) && base.protocol === 'http:';
  if ((!official && !fixture) || base.username || base.password || base.search || base.hash || base.pathname !== '/') return providerReadFailure('PROVIDER_ENDPOINT_INVALID');
  return new URL('/v2/weather/point', base);
}
