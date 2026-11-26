import { BadRequestException } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest, RequestOptions } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { hash, object, text } from '../organizations/procurement.domain';
import { MAX_EXCHANGE_BYTES, PROCUREMENT_EXCHANGE_KINDS, PROCUREMENT_EXCHANGE_PROTOCOL } from './procurement-api-contract';

export type ProcurementApiSettings = { displayName: string; protocol: typeof PROCUREMENT_EXCHANGE_PROTOCOL; endpoint: string | null; credentialRef: string | null; authMode: 'BEARER' | 'API_KEY' | 'NONE' };
type Credential = { ref: string; label: string; origin: string; secret: string; authMode: 'BEARER' | 'API_KEY' };
export type ConnectionCheckResult = { status: 'SUCCEEDED' | 'FAILED'; code: string; checkedAt: string; externalRequestAttempted: boolean | null };
export type TransportDependencies = { lookup: (hostname: string) => Promise<Array<{ address: string; family: number }>>; request: typeof httpsRequest };
const defaults: TransportDependencies = { lookup: hostname => dnsLookup(hostname, { all: true, verbatim: true }), request: httpsRequest };
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const) blocked.addSubnet(address, prefix, 'ipv6');

export function publicProcurementAddress(address: string, family: number) {
  return family === 4 ? isIP(address) === 4 && !blocked.check(address, 'ipv4')
    : family === 6 && isIP(address) === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

export function procurementApiEndpoint(value: unknown): string | null {
  if (value === null || value === '') return null;
  const raw = text(value, 'API endpoint', 1000);
  let url: URL;
  try { url = new URL(raw); } catch { throw new BadRequestException('Use an absolute HTTPS API base URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port && url.port !== '443'
    || isIP(url.hostname.replace(/^\[|\]$/g, '')) || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(url.hostname)
    || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|invalid|test)$/i.test(url.hostname)
    || /[\\\u0000-\u0020\u007f]/u.test(raw) || /%(?:2f|5c|00|0a|0d)/i.test(url.pathname)) throw new BadRequestException('The API base must use HTTPS port 443 and a public DNS hostname, without URL credentials, query or fragment.');
  url.pathname = url.pathname.replace(/\/+$/, '') + '/';
  return url.toString();
}

export function procurementApiSettings(value: unknown): ProcurementApiSettings {
  const row = object(value, ['displayName', 'protocol', 'endpoint', 'credentialRef', 'authMode']);
  if (row.protocol !== PROCUREMENT_EXCHANGE_PROTOCOL || typeof row.authMode !== 'string' || !['BEARER', 'API_KEY', 'NONE'].includes(row.authMode)) throw new BadRequestException('Choose a supported exchange protocol and authentication mode.');
  const credentialRef = row.credentialRef === null || row.credentialRef === '' ? null : text(row.credentialRef, 'Credential reference', 64);
  if (credentialRef && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(credentialRef)) throw new BadRequestException('Choose a registered credential reference.');
  if (row.authMode === 'NONE' && credentialRef) throw new BadRequestException('Unauthenticated metadata checks cannot include a credential reference.');
  return { displayName: text(row.displayName, 'Connection display name', 120), protocol: PROCUREMENT_EXCHANGE_PROTOCOL, endpoint: procurementApiEndpoint(row.endpoint), credentialRef, authMode: row.authMode as ProcurementApiSettings['authMode'] };
}

/** The browser never supplies environment variable names or credential values. */
function registry(environment: NodeJS.ProcessEnv): Credential[] {
  const raw = environment.HYDROLAND_PROCUREMENT_API_CREDENTIALS;
  if (!raw || raw.length > 32_768) return [];
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values) || values.length > 20) return [];
    const results: Credential[] = [];
    for (const input of values) {
      const row = object(input, ['ref', 'label', 'origin', 'secretEnv', 'authMode']);
      const ref = text(row.ref, 'Credential reference', 64), label = text(row.label, 'Credential label', 120);
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(ref) || results.some(value => value.ref === ref) || typeof row.authMode !== 'string' || !['BEARER', 'API_KEY'].includes(row.authMode)) return [];
      // Only dedicated, administratively registered procurement secrets can be resolved.
      if (typeof row.secretEnv !== 'string' || !/^HYDROLAND_PROCUREMENT_API_SECRET_[A-Z0-9_]{1,64}$/.test(row.secretEnv)) return [];
      const endpoint = procurementApiEndpoint(row.origin);
      if (!endpoint || new URL(endpoint).pathname !== '/') return [];
      const secret = environment[row.secretEnv]?.trim() ?? '';
      if (secret && (!/^[\x21-\x7e]{8,4096}$/.test(secret))) return [];
      results.push({ ref, label, origin: new URL(endpoint).origin, secret, authMode: row.authMode as Credential['authMode'] });
    }
    return results;
  } catch { return []; }
}

export function procurementCredentialOptions(environment: NodeJS.ProcessEnv = process.env) {
  return registry(environment).map(row => ({ ref: row.ref, label: row.label, configured: Boolean(row.secret) }));
}

export function procurementConnectionBinding(settings: ProcurementApiSettings, environment: NodeJS.ProcessEnv = process.env) {
  const missing: string[] = [];
  if (!settings.endpoint) missing.push('ENDPOINT_REQUIRED');
  const credential = settings.credentialRef ? registry(environment).find(value => value.ref === settings.credentialRef) : undefined;
  if (settings.authMode !== 'NONE') {
    if (!settings.credentialRef) missing.push('CREDENTIAL_REFERENCE_REQUIRED');
    else if (!credential) missing.push('CREDENTIAL_REFERENCE_UNAVAILABLE');
    else {
      if (!credential.secret) missing.push('CREDENTIAL_SECRET_REQUIRED');
      if (credential.authMode !== settings.authMode) missing.push('CREDENTIAL_AUTH_MODE_MISMATCH');
      if (settings.endpoint && credential.origin !== new URL(settings.endpoint).origin) missing.push('CREDENTIAL_DESTINATION_MISMATCH');
    }
  }
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': 'HYDROLAND-Procurement-Readiness/1' };
  if (!missing.length && credential && settings.authMode !== 'NONE') headers[settings.authMode === 'BEARER' ? 'Authorization' : 'X-API-Key'] = settings.authMode === 'BEARER' ? `Bearer ${credential.secret}` : credential.secret;
  return { missing, headers, digest: hash({ settings, secret: credential?.secret ?? null, origin: credential?.origin ?? null, mode: credential?.authMode ?? null }) };
}

function capabilities(value: unknown) {
  try {
    const row = object(value, ['protocol', 'version', 'capabilities', 'currency']);
    return row.protocol === PROCUREMENT_EXCHANGE_PROTOCOL && row.version === 1 && row.currency === 'SAR'
      && Array.isArray(row.capabilities) && row.capabilities.length === PROCUREMENT_EXCHANGE_KINDS.length
      && new Set(row.capabilities).size === PROCUREMENT_EXCHANGE_KINDS.length && PROCUREMENT_EXCHANGE_KINDS.every(kind => (row.capabilities as unknown[]).includes(kind));
  } catch { return false; }
}

/** One bounded GET. All DNS answers must be public; TLS uses the selected, pinned answer. */
export async function checkProcurementConnection(settings: ProcurementApiSettings, environment: NodeJS.ProcessEnv = process.env, dependencies: TransportDependencies = defaults): Promise<ConnectionCheckResult> {
  const binding = procurementConnectionBinding(settings, environment);
  const finish = (code: string, attempted = false): ConnectionCheckResult => ({ status: code === 'CAPABILITIES_VERIFIED' ? 'SUCCEEDED' : 'FAILED', code, checkedAt: new Date().toISOString(), externalRequestAttempted: attempted });
  if (binding.missing.length || !settings.endpoint) return finish(binding.missing[0] ?? 'ENDPOINT_REQUIRED');
  const endpoint = procurementApiEndpoint(settings.endpoint);
  if (!endpoint) return finish('ENDPOINT_REQUIRED');
  const url = new URL('capabilities', endpoint);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let addresses: Awaited<ReturnType<TransportDependencies['lookup']>>;
  try {
    addresses = await Promise.race([dependencies.lookup(url.hostname), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), 2000); })]);
  } catch { return finish('DNS_UNAVAILABLE'); }
  finally { if (timer) clearTimeout(timer); }
  if (!addresses.length || addresses.length > 32 || addresses.some(row => !publicProcurementAddress(row.address, row.family))) return finish('DESTINATION_NOT_PUBLIC');
  const selected = addresses[0];
  return new Promise(resolve => {
    let done = false;
    let request: ReturnType<typeof httpsRequest> | undefined;
    const complete = (code: string) => { if (done) return; done = true; clearTimeout(deadline); resolve(finish(code, true)); request?.destroy(); };
    const deadline = setTimeout(() => complete('CONNECTION_TIMEOUT'), 6000);
    const options: RequestOptions = {
      protocol: 'https:', hostname: url.hostname, servername: url.hostname, port: 443, path: url.pathname,
      method: 'GET', headers: binding.headers, agent: false, rejectUnauthorized: true,
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      },
    };
    try {
      request = dependencies.request(options, response => {
        if (response.statusCode !== 200) { response.resume(); complete(response.statusCode === 401 || response.statusCode === 403 ? 'AUTHENTICATION_REJECTED' : response.statusCode && response.statusCode >= 300 && response.statusCode < 400 ? 'REDIRECT_REFUSED' : 'HTTP_RESPONSE_REJECTED'); return; }
        if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(String(response.headers['content-type'] ?? ''))) { response.resume(); complete('CONTENT_TYPE_REJECTED'); return; }
        if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.resume(); complete('CONTENT_ENCODING_REJECTED'); return; }
        const declared = response.headers['content-length'];
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_EXCHANGE_BYTES)) { response.resume(); complete('RESPONSE_TOO_LARGE'); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        response.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > MAX_EXCHANGE_BYTES) { complete('RESPONSE_TOO_LARGE'); return; } chunks.push(Buffer.from(chunk)); });
        response.on('error', () => complete('CONNECTION_FAILED'));
        response.on('aborted', () => complete('CONNECTION_FAILED'));
        response.on('end', () => {
          if (done) return;
          try { complete(capabilities(JSON.parse(Buffer.concat(chunks).toString('utf8'))) ? 'CAPABILITIES_VERIFIED' : 'PROTOCOL_MISMATCH'); }
          catch { complete('INVALID_JSON_RESPONSE'); }
        });
      });
      request.on('error', () => complete('CONNECTION_FAILED'));
      if (done) { request.destroy(); return; }
      request.end();
    } catch { complete('CONNECTION_FAILED'); }
  });
}
