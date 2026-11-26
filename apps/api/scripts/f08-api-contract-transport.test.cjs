'use strict';

const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const https = require('node:https');

const dist = path.resolve(process.env.F08_API_CONTRACT_DIST || path.join(__dirname, '../dist'));
const contract = require(path.join(dist, 'procurement-lab/procurement-api-contract.js'));
const transport = require(path.join(dist, 'procurement-lab/procurement-api-transport.js'));
const {
  PROCUREMENT_EXCHANGE_PROTOCOL: PROTOCOL, PROCUREMENT_EXCHANGE_KINDS: KINDS,
  MAX_EXCHANGE_BYTES: MAX_BYTES, procurementExchangeContract, validateExchangeMessage,
} = contract;
const {
  publicProcurementAddress, procurementApiEndpoint, procurementApiSettings,
  procurementCredentialOptions, procurementConnectionBinding, checkProcurementConnection,
} = transport;

const HOST = 'provider.f08.example';
const ORIGIN = `https://${HOST}`;
const SECRET = 'F08_SYNTHETIC_SECRET_ONLY_37ec72db';
const ROTATED_SECRET = 'F08_SYNTHETIC_ROTATED_ONLY_19dc657a';
const SECRET_ENV = 'HYDROLAND_PROCUREMENT_API_SECRET_FIXTURE';
const PUBLIC_DNS = [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }];
const clone = value => structuredClone(value);
const examples = () => procurementExchangeContract().examples;
const baseSettings = overrides => procurementApiSettings({
  displayName: 'Synthetic provider connection', protocol: PROTOCOL,
  endpoint: `${ORIGIN}/exchange/`, credentialRef: 'fixture', authMode: 'BEARER', ...overrides,
});
const registryEntry = overrides => ({
  ref: 'fixture', label: 'Synthetic credential', origin: ORIGIN,
  secretEnv: SECRET_ENV, authMode: 'BEARER', ...overrides,
});
const environment = (entries = [registryEntry()], secret = SECRET) => ({
  HYDROLAND_PROCUREMENT_API_CREDENTIALS: JSON.stringify(entries), [SECRET_ENV]: secret,
  DATABASE_URL: 'synthetic-non-procurement-secret-never-resolved',
});

function rejected(message, label) {
  const result = validateExchangeMessage(message);
  assert.equal(result.valid, false, label);
  assert.equal(result.normalized, null, label);
  assert.equal(result.messageDigest, null, label);
  assert.equal(result.execution, 'VALIDATION_ONLY');
  assert.equal(result.businessEffects, false);
  assert.ok(Array.isArray(result.issues) && result.issues.length > 0);
}

function safeResult(result, code, attempted = true) {
  assert.deepEqual(Object.keys(result).sort(), ['checkedAt', 'code', 'externalRequestAttempted', 'status']);
  assert.equal(result.code, code);
  assert.equal(result.status, code === 'CAPABILITIES_VERIFIED' ? 'SUCCEEDED' : 'FAILED');
  assert.equal(result.externalRequestAttempted, attempted);
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  const serialized = JSON.stringify(result);
  for (const value of [SECRET, ROTATED_SECRET, SECRET_ENV, 'Authorization', 'X-API-Key']) assert.ok(!serialized.includes(value));
}

function noNetworkDependencies(lookup) {
  return {
    lookup: lookup || (async () => { throw new Error('Unexpected DNS use'); }),
    request: () => { throw new Error('Unexpected HTTPS use'); },
  };
}

let directory, provider, port, ca, providerKey, providerCertificate;
const sockets = new Set();
const replies = new Map();
const received = [];
let routeSequence = 0;

before(async () => {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'This gate requires TLS verification');
  directory = mkdtempSync(path.join(tmpdir(), 'hydroland-f08-contract-tls-'));
  chmodSync(directory, 0o700);
  const file = name => path.join(directory, name);
  const openssl = args => execFileSync('openssl', args, { cwd: directory, stdio: 'pipe' });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '1',
    '-subj', '/CN=Ephemeral F08 test CA', '-keyout', 'ca.key', '-out', 'ca.pem',
    '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  openssl(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-sha256',
    '-subj', `/CN=${HOST}`, '-keyout', 'provider.key', '-out', 'provider.csr']);
  writeFileSync(file('provider.ext'), `subjectAltName=DNS:${HOST}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`, { mode: 0o600 });
  openssl(['x509', '-req', '-in', 'provider.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key',
    '-CAcreateserial', '-out', 'provider.pem', '-days', '1', '-sha256', '-extfile', 'provider.ext']);
  for (const name of ['ca.key', 'provider.key']) chmodSync(file(name), 0o600);
  ca = readFileSync(file('ca.pem'));
  providerKey = readFileSync(file('provider.key'));
  providerCertificate = readFileSync(file('provider.pem'));
  provider = https.createServer({ key: providerKey, cert: providerCertificate }, (request, response) => {
    received.push({ path: request.url, method: request.method, authorization: request.headers.authorization,
      apiKey: request.headers['x-api-key'], remoteAddress: request.socket.remoteAddress, servername: request.socket.servername });
    const reply = replies.get(request.url);
    if (!reply) { response.writeHead(404); response.end(); return; }
    if (reply.slow) return;
    response.writeHead(reply.status || 200, { 'content-type': 'application/json', ...reply.headers });
    if (reply.abort) {
      response.write('{"protocol":');
      setImmediate(() => response.destroy());
    } else if (reply.chunks) {
      for (const chunk of reply.chunks) response.write(chunk);
      response.end();
    } else {
      response.end(reply.body === undefined ? JSON.stringify(procurementExchangeContract().capabilitiesResponseExample) : reply.body);
    }
  });
  provider.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  provider.on('tlsClientError', () => {}); // The untrusted CA/name cases intentionally fail before HTTP.
  await new Promise((resolve, reject) => {
    provider.once('error', reject);
    provider.listen(0, '127.0.0.1', resolve);
  });
  port = provider.address().port;
});

after(async () => {
  for (const socket of sockets) socket.destroy();
  if (provider) await new Promise(resolve => provider.close(resolve));
  if (directory) rmSync(directory, { recursive: true, force: true });
});

/** The only socket destination is loopback. Original public pinning, SNI, TLS
 * verification and response handling still run; the injected dialer maps the
 * checked public address to this ephemeral local provider, never the internet. */
async function localCheck(reply = {}, options = {}) {
  const route = `/case-${++routeSequence}/capabilities`;
  replies.set(route, reply);
  const state = { dnsCalls: 0, requestCalls: 0, socketLookups: 0, verifiedSockets: 0, remoteAddresses: [], pinned: [] };
  const settings = baseSettings({ endpoint: `${ORIGIN}${route.slice(0, -'capabilities'.length)}`, ...options.settings });
  const entries = [registryEntry({ authMode: settings.authMode === 'API_KEY' ? 'API_KEY' : 'BEARER' })];
  const env = environment(entries);
  const answers = options.answers || PUBLIC_DNS;
  const selected = answers[0];
  const dependencies = {
    lookup: async hostname => {
      assert.equal(hostname, HOST);
      state.dnsCalls++;
      // A second resolution would model rebinding. Production must use the
      // first validated answer through its request-level lookup callback.
      return state.dnsCalls === 1 ? clone(answers) : [{ address: '127.0.0.1', family: 4 }];
    },
    request: (requestOptions, callback) => {
      state.requestCalls++;
      assert.equal(requestOptions.hostname, HOST);
      assert.equal(requestOptions.servername, HOST);
      assert.equal(requestOptions.protocol, 'https:');
      assert.equal(requestOptions.port, 443);
      assert.equal(requestOptions.method, 'GET');
      assert.equal(requestOptions.path, route);
      assert.equal(requestOptions.agent, false);
      assert.equal(requestOptions.rejectUnauthorized, true);
      requestOptions.lookup(HOST, { all: false }, (error, address, family) => {
        assert.equal(error, null); assert.equal(address, selected.address); assert.equal(family, selected.family);
        state.pinned.push({ address, family });
      });
      requestOptions.lookup(HOST, { all: true }, (error, addresses) => {
        assert.equal(error, null); assert.deepEqual(addresses, [selected]);
        state.pinned.push(...addresses);
      });
      const actual = { ...requestOptions, port, ca: options.untrusted ? undefined : ca,
        servername: options.wrongServername ? 'other.f08.example' : requestOptions.servername,
        headers: { ...requestOptions.headers, Host: HOST },
        lookup: (hostname, lookupOptions, callbackForSocket) => {
          state.socketLookups++;
          requestOptions.lookup(hostname, lookupOptions, (error, address, family) => {
            assert.equal(error, null);
            if (lookupOptions.all) assert.deepEqual(address, [selected]);
            else { assert.equal(address, selected.address); assert.equal(family, selected.family); }
            if (lookupOptions.all) callbackForSocket(null, [{ address: '127.0.0.1', family: 4 }]);
            else callbackForSocket(null, '127.0.0.1', 4);
          });
        },
      };
      const request = https.request(actual, callback);
      request.on('socket', socket => {
        socket.on('secureConnect', () => {
          assert.equal(socket.authorized, true);
          state.verifiedSockets++;
          state.remoteAddresses.push(socket.remoteAddress);
        });
      });
      return request;
    },
  };
  const result = await checkProcurementConnection(settings, env, dependencies);
  assert.equal(state.dnsCalls, 1);
  assert.equal(state.requestCalls, 1);
  assert.ok(state.pinned.length >= 2);
  assert.ok(state.remoteAddresses.every(address => address === '127.0.0.1'));
  return { result, state, request: received.find(item => item.path === route), route };
}

test('published protocol declares four strict message variants and a non-executing lab', () => {
  const published = procurementExchangeContract();
  assert.equal(published.protocol, 'HYDROLAND_PROCUREMENT_EXCHANGE_V1');
  assert.equal(published.transport.method, 'GET');
  assert.equal(published.transport.capabilitiesPath, 'capabilities');
  assert.equal(published.transport.maximumResponseBytes, 65536);
  assert.equal(published.messageSchema.oneOf.length, 4);
  for (const variant of published.messageSchema.oneOf) {
    assert.equal(variant.additionalProperties, false);
    assert.equal(variant.properties.payload.additionalProperties, false);
    assert.deepEqual(new Set(variant.required), new Set(Object.keys(variant.properties)));
  }
  assert.equal(published.boundary.businessWrites, false);
  assert.equal(published.boundary.liveConnectionRequiredForLab, false);
  assert.equal(published.boundary.independentAcceptanceGranted, false);
  assert.equal(published.boundary.receivedMessagesExecuteBusinessActions, false);
  assert.match(published.boundary.supportedProvider, /adapter/i);
});

for (const name of ['purchaseOrder', 'invoice', 'receipt', 'reversal']) {
  test(`${name} authored fixture validates reproducibly without mutating input or executing a business effect`, () => {
    const input = examples()[name], original = clone(input);
    const result = validateExchangeMessage(input);
    assert.equal(result.valid, true);
    assert.deepEqual(result.normalized, original);
    assert.equal(result.execution, 'VALIDATION_ONLY');
    assert.equal(result.businessEffects, false);
    assert.match(result.messageDigest, /^[a-f0-9]{64}$/);
    assert.equal(result.messageDigest, validateExchangeMessage(input).messageDigest);
    assert.deepEqual(input, original);
    assert.equal(validateExchangeMessage({ ...input, mode: 'LIVE' }).businessEffects, false);
  });
}

test('mode, kind and version require their real enum types rather than arrays or coercion', () => {
  for (const [key, values] of Object.entries({ mode: [['TEST'], ['LIVE'], {}, 1, null, 'test'], kind: [['INVOICE'], {}, 'PAYMENT'], schemaVersion: [[PROTOCOL], 1] })) {
    for (const value of values) rejected({ ...examples().purchaseOrder, [key]: value }, `${key}=${JSON.stringify(value)}`);
  }
});

test('JSON monetary, quantity and revision fields reject numeric strings at every message boundary', () => {
  rejected({ ...examples().purchaseOrder, sourceRevision: '1' });
  for (const name of ['purchaseOrder', 'invoice']) {
    for (const key of ['quantity', 'unitPriceMinor', 'taxMinor']) {
      const input = examples()[name]; input.payload.lines[0][key] = String(input.payload.lines[0][key]); rejected(input, `${name}.${key}`);
    }
    const input = examples()[name]; input.payload.totalMinor = String(input.payload.totalMinor); rejected(input);
  }
  for (const name of ['receipt', 'reversal']) {
    const input = examples()[name]; input.payload.quantities[0].quantity = '1'; rejected(input);
  }
  const input = examples().reversal; input.payload.amountMinor = '4300'; rejected(input);
});

test('unknown root, payload, line and quantity fields cannot pass the published contract', () => {
  for (const name of Object.keys(examples())) {
    const input = examples()[name]; input.extra = true; rejected(input);
    const nested = examples()[name]; nested.payload.extra = true; rejected(nested);
  }
  const line = examples().invoice; line.payload.lines[0].financeEntryId = 'untrusted'; rejected(line);
  const receipt = examples().receipt; receipt.payload.quantities[0].approved = true; rejected(receipt);
  const dangerous = examples().purchaseOrder;
  Object.defineProperty(dangerous.payload, '__proto__', { value: {}, enumerable: true }); rejected(dangerous);
});

test('currency and explicit totals cannot silently change or ignore taxes', () => {
  for (const name of ['purchaseOrder', 'invoice', 'reversal']) {
    const input = examples()[name]; input.payload.currency = 'USD'; rejected(input);
  }
  for (const totalMinor of [4000, 4299, 4301, 0, -1, 4300.01]) {
    const input = examples().invoice; input.payload.totalMinor = totalMinor; rejected(input);
  }
});

test('tax treatment, tax amount and justification must agree', () => {
  for (const [taxTreatment, taxMinor, taxReason] of [['TAXABLE', 0, 'basis'], ['EXEMPT', 1, 'basis'], ['ZERO_RATED', 1, 'basis'], ['TAXABLE', -1, 'basis'], ['OTHER', 0, 'basis'], ['TAXABLE', 300, '   ']]) {
    const input = examples().purchaseOrder;
    Object.assign(input.payload.lines[0], { taxTreatment, taxMinor, taxReason });
    input.payload.totalMinor = 4000 + taxMinor;
    rejected(input);
  }
  const valid = examples().invoice;
  Object.assign(valid.payload.lines[0], { taxTreatment: 'ZERO_RATED', taxMinor: 0, taxReason: 'Explicit synthetic zero-rate basis.' });
  valid.payload.totalMinor = 4000;
  assert.equal(validateExchangeMessage(valid).valid, true);
});

test('duplicate source line identifiers, including trimmed aliases, are rejected', () => {
  for (const name of ['purchaseOrder', 'invoice']) {
    const input = examples()[name]; input.payload.lines[1].lineId = ` ${input.payload.lines[0].lineId} `; rejected(input);
  }
  for (const name of ['receipt', 'reversal']) {
    const input = examples()[name]; input.payload.quantities.push(clone(input.payload.quantities[0])); rejected(input);
  }
});

test('line products, aggregates, fractions and non-finite amounts stay inside the integer boundary', () => {
  for (const bad of [2147483648, Number.MAX_SAFE_INTEGER, 1.5, NaN, Infinity]) {
    const input = examples().purchaseOrder; input.payload.lines[0].quantity = bad; rejected(input);
  }
  const product = examples().invoice;
  Object.assign(product.payload.lines[0], { quantity: 2, unitPriceMinor: 2147483647, taxMinor: 0, taxTreatment: 'EXEMPT' }); rejected(product);
  const aggregate = examples().invoice;
  aggregate.payload.lines = [0, 1].map(index => ({ lineId: `L${index}`, description: 'Synthetic', quantity: 1, unitPriceMinor: 2147483647, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'Synthetic basis' }));
  aggregate.payload.totalMinor = 4294967294; rejected(aggregate);
});

test('the exact maximum legal minor-unit total is accepted without rounding', () => {
  const input = examples().invoice;
  input.payload.lines = [{ lineId: 'MAXIMUM', description: 'Synthetic boundary', quantity: 1, unitPriceMinor: 2147483647, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'Synthetic basis' }];
  input.payload.totalMinor = 2147483647;
  const result = validateExchangeMessage(input);
  assert.equal(result.valid, true);
  assert.equal(result.normalized.payload.totalMinor, 2147483647);
});

test('identifiers and source digests reject malformed, uppercase and overlong input', () => {
  for (const sourceDigest of ['a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(65), ['a'.repeat(64)]]) rejected({ ...examples().receipt, sourceDigest });
  for (const messageId of ['', 'bad/id', 'x'.repeat(161), '\u0000hidden']) rejected({ ...examples().receipt, messageId });
});

test('timestamps require a valid calendar, explicit offset and nonfuture occurrence', () => {
  for (const occurredAt of ['2999-01-01T00:00:00Z', '2026-02-30T00:00:00Z', '2026-01-01T00:00:00', '2026-01-01T00:00:00+14:01', '2026-01-01T24:00:00Z', '2026-01-01T00:00:60Z']) rejected({ ...examples().receipt, occurredAt });
  const accepted = validateExchangeMessage({ ...examples().receipt, occurredAt: '2026-01-01T03:00:00+03:00' });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.normalized.occurredAt, '2026-01-01T00:00:00.000Z');
});

test('empty receipts and unbounded line tables are rejected before execution', () => {
  const empty = examples().receipt; empty.payload.quantities = []; rejected(empty);
  const invoice = examples().invoice;
  invoice.payload.lines = Array.from({ length: 51 }, (_, index) => ({ ...invoice.payload.lines[0], lineId: `L${index}` })); rejected(invoice);
  const receipt = examples().receipt;
  receipt.payload.quantities = Array.from({ length: 51 }, (_, index) => ({ lineId: `L${index}`, quantity: 1 })); rejected(receipt);
});

test('normalized exchange bytes are bounded for both ASCII and multibyte text', () => {
  for (const description of ['a'.repeat(1000), 'س'.repeat(1000)]) {
    const input = examples().purchaseOrder;
    input.payload.lines = Array.from({ length: 50 }, (_, index) => ({ lineId: `L${index}`, description, quantity: 1, unitPriceMinor: 1, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'b'.repeat(1000) }));
    input.payload.totalMinor = 50;
    assert.ok(Buffer.byteLength(JSON.stringify(input)) > MAX_BYTES);
    rejected(input);
  }
});

test('connection settings reject enum arrays, raw secrets and unregistered reference syntax', () => {
  for (const authMode of [['BEARER'], ['API_KEY'], ['NONE'], {}, null, 'bearer']) assert.throws(() => baseSettings({ authMode }), /authentication mode/i);
  for (const credentialRef of ['../secret', 'SECRET ENV', 'x'.repeat(65), ['fixture']]) assert.throws(() => baseSettings({ credentialRef }));
  assert.throws(() => baseSettings({ secret: SECRET }), /Unsupported/);
  assert.throws(() => baseSettings({ secretEnv: 'DATABASE_URL' }), /Unsupported/);
  assert.throws(() => baseSettings({ authMode: 'NONE', credentialRef: 'fixture' }), /Unauthenticated/);
});

test('API bases normalize public HTTPS paths and allow an explicitly unconfigured endpoint', () => {
  assert.equal(procurementApiEndpoint('https://PROVIDER.f08.example:443/v1///'), `${ORIGIN}/v1/`);
  assert.equal(procurementApiEndpoint(ORIGIN), `${ORIGIN}/`);
  assert.equal(procurementApiEndpoint(null), null);
  assert.equal(procurementApiEndpoint(''), null);
});

test('malformed URLs, IP forms, private hostnames and credential-bearing URLs are rejected', () => {
  const inputs = [
    'not-a-url', `http://${HOST}/`, `ftp://${HOST}/`, 'file:///etc/hosts',
    'https://127.0.0.1/', 'https://2130706433/', 'https://0x7f000001/', 'https://[::1]/',
    'https://[::ffff:127.0.0.1]/', 'https://localhost/', 'https://app.local/',
    'https://metadata.internal/', 'https://provider.test/', 'https://service/',
    `https://user:password@${HOST}/`, `${ORIGIN}:8443/`, `${ORIGIN}/?secret=x`,
    `${ORIGIN}/#fragment`, `${ORIGIN}/a%2fb`, `${ORIGIN}/a%5cb`, `${ORIGIN}/%00`,
    `${ORIGIN}/%0a`, `${ORIGIN}/%0d`, `${ORIGIN}/a\\b`, `${ORIGIN}/a b`, `${ORIGIN}/a\r\nb`,
  ];
  for (const input of inputs) assert.throws(() => procurementApiEndpoint(input), undefined, input);
});

test('credential options expose only ref/label/configured and never the secret or its environment key', () => {
  const options = procurementCredentialOptions(environment());
  assert.deepEqual(options, [{ ref: 'fixture', label: 'Synthetic credential', configured: true }]);
  const serialized = JSON.stringify(options);
  assert.ok(!serialized.includes(SECRET));
  assert.ok(!serialized.includes(SECRET_ENV));
  assert.deepEqual(procurementCredentialOptions(environment(undefined, '')), [{ ref: 'fixture', label: 'Synthetic credential', configured: false }]);
});

test('the registry refuses arbitrary secret environment names and malformed auth/reference/origin records', () => {
  for (const entry of [
    registryEntry({ secretEnv: 'DATABASE_URL' }), registryEntry({ secretEnv: 'HYDROLAND_PROCUREMENT_API_SECRET_' }),
    registryEntry({ secretEnv: 'HYDROLAND_PROCUREMENT_API_SECRET_bad' }), registryEntry({ secretEnv: ['DATABASE_URL'] }),
    registryEntry({ authMode: ['BEARER'] }), registryEntry({ authMode: 'NONE' }),
    registryEntry({ origin: `${ORIGIN}/private/` }), registryEntry({ origin: 'https://127.0.0.1' }),
    registryEntry({ ref: '../credential' }), registryEntry({ password: SECRET }),
  ]) assert.deepEqual(procurementCredentialOptions(environment([entry])), []);
  assert.deepEqual(procurementCredentialOptions(environment([registryEntry(), registryEntry()])), []);
  assert.deepEqual(procurementCredentialOptions(environment(Array.from({ length: 21 }, (_, index) => registryEntry({ ref: `ref${index}` })))), []);
  assert.deepEqual(procurementCredentialOptions({ HYDROLAND_PROCUREMENT_API_CREDENTIALS: '{broken' }), []);
  assert.deepEqual(procurementCredentialOptions(environment(undefined, `${SECRET}\r\nX-Injected: yes`)), []);
});

test('credentials bind to the exact origin and authentication mode before any authorization header exists', () => {
  const matching = procurementConnectionBinding(baseSettings(), environment());
  assert.deepEqual(matching.missing, []);
  assert.equal(matching.headers.Authorization, `Bearer ${SECRET}`);
  assert.match(matching.digest, /^[a-f0-9]{64}$/);
  const key = procurementConnectionBinding(baseSettings({ authMode: 'API_KEY' }), environment([registryEntry({ authMode: 'API_KEY' })]));
  assert.equal(key.headers['X-API-Key'], SECRET);
  assert.equal(key.headers.Authorization, undefined);
  for (const settings of [
    baseSettings({ endpoint: 'https://other.f08.example/' }),
    baseSettings({ endpoint: 'https://sub.provider.f08.example/' }),
    baseSettings({ authMode: 'API_KEY' }), baseSettings({ credentialRef: 'missing' }),
  ]) {
    const binding = procurementConnectionBinding(settings, environment());
    assert.ok(binding.missing.length > 0);
    assert.equal(binding.headers.Authorization, undefined);
    assert.equal(binding.headers['X-API-Key'], undefined);
  }
});

test('missing secrets fail closed and secret rotation invalidates the connection binding digest', () => {
  const missing = procurementConnectionBinding(baseSettings(), environment(undefined, ''));
  assert.ok(missing.missing.includes('CREDENTIAL_SECRET_REQUIRED'));
  assert.equal(missing.headers.Authorization, undefined);
  const old = procurementConnectionBinding(baseSettings(), environment());
  const rotated = procurementConnectionBinding(baseSettings(), environment(undefined, ROTATED_SECRET));
  assert.notEqual(old.digest, rotated.digest);
});

test('public-address classification rejects loopback/private/mapped/NAT64/documentation/multicast addresses', () => {
  for (const [address, family] of [
    ['0.0.0.0', 4], ['10.1.2.3', 4], ['100.64.0.1', 4], ['127.0.0.1', 4], ['169.254.169.254', 4],
    ['172.16.0.1', 4], ['192.168.0.1', 4], ['192.0.2.1', 4], ['198.18.0.1', 4],
    ['198.51.100.1', 4], ['203.0.113.1', 4], ['224.0.0.1', 4], ['255.255.255.255', 4],
    ['::', 6], ['::1', 6], ['::ffff:127.0.0.1', 6], ['::ffff:8.8.8.8', 6], ['64:ff9b::7f00:1', 6],
    ['fc00::1', 6], ['fe80::1', 6], ['2001:db8::1', 6], ['2002:7f00:1::', 6], ['3fff::1', 6],
    ['ff02::1', 6], ['8.8.8.8', 6], ['not-an-ip', 4], ['8.8.8.8', 3],
  ]) assert.equal(publicProcurementAddress(address, family), false, `${address}/${family}`);
  assert.equal(publicProcurementAddress('8.8.8.8', 4), true);
  assert.equal(publicProcurementAddress('2606:4700:4700::1111', 6), true);
});

test('every DNS answer must be public before the HTTPS request can start', async () => {
  for (const answers of [[], [...PUBLIC_DNS, { address: '127.0.0.1', family: 4 }],
    [...PUBLIC_DNS, { address: '::ffff:169.254.169.254', family: 6 }],
    Array.from({ length: 33 }, () => PUBLIC_DNS[0])]) {
    let requestCalls = 0;
    const result = await checkProcurementConnection(baseSettings(), environment(), {
      lookup: async () => answers, request: () => { requestCalls++; throw new Error('Must not reach transport'); },
    });
    safeResult(result, 'DESTINATION_NOT_PUBLIC', false);
    assert.equal(requestCalls, 0);
  }
});

test('missing configuration and origin mismatch do not invoke DNS or HTTPS', async () => {
  for (const [settings, code] of [
    [baseSettings({ endpoint: null }), 'ENDPOINT_REQUIRED'],
    [baseSettings({ credentialRef: null }), 'CREDENTIAL_REFERENCE_REQUIRED'],
    [baseSettings({ credentialRef: 'unknown' }), 'CREDENTIAL_REFERENCE_UNAVAILABLE'],
    [baseSettings({ endpoint: 'https://other.f08.example/' }), 'CREDENTIAL_DESTINATION_MISMATCH'],
  ]) {
    let lookups = 0, requests = 0;
    const result = await checkProcurementConnection(settings, environment(), {
      lookup: async () => { lookups++; return PUBLIC_DNS; }, request: () => { requests++; throw new Error(SECRET); },
    });
    safeResult(result, code, false);
    assert.equal(lookups, 0); assert.equal(requests, 0);
  }
});

test('DNS rejection is sanitized and a stalled resolver is bounded', { timeout: 6000 }, async () => {
  safeResult(await checkProcurementConnection(baseSettings(), environment(), noNetworkDependencies(async () => { throw new Error(SECRET); })), 'DNS_UNAVAILABLE', false);
  const start = performance.now();
  safeResult(await checkProcurementConnection(baseSettings(), environment(), noNetworkDependencies(() => new Promise(() => {}))), 'DNS_UNAVAILABLE', false);
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 1500 && elapsed < 5500, `DNS timeout elapsed ${elapsed}ms`);
});

test('real local HTTPS verifies the test CA/name and pins one public DNS answer without re-resolution', async () => {
  const { result, state, request } = await localCheck();
  safeResult(result, 'CAPABILITIES_VERIFIED');
  assert.equal(state.verifiedSockets, 1);
  assert.ok(state.socketLookups >= 1);
  assert.equal(request.method, 'GET');
  assert.equal(request.servername, HOST);
  assert.equal(request.remoteAddress, '127.0.0.1');
  assert.equal(request.authorization, `Bearer ${SECRET}`);
  assert.equal(request.apiKey, undefined);
});

test('API-key transport uses its named header and supports a JSON vendor media type', async () => {
  const { result, state, request } = await localCheck({ headers: { 'content-type': 'application/vnd.synthetic+json; charset=utf-8' } }, { settings: { authMode: 'API_KEY' } });
  safeResult(result, 'CAPABILITIES_VERIFIED');
  assert.equal(state.verifiedSockets, 1);
  assert.equal(request.apiKey, SECRET);
  assert.equal(request.authorization, undefined);
});

test('an unauthenticated capabilities request sends neither credential header', async () => {
  const { result, request } = await localCheck({}, { settings: { authMode: 'NONE', credentialRef: null } });
  safeResult(result, 'CAPABILITIES_VERIFIED');
  assert.equal(request.authorization, undefined);
  assert.equal(request.apiKey, undefined);
});

test('real TLS refuses an untrusted CA and a mismatched server name before HTTP', async () => {
  for (const options of [{ untrusted: true }, { wrongServername: true }]) {
    const { result, state, request } = await localCheck({}, options);
    safeResult(result, 'CONNECTION_FAILED');
    assert.equal(state.verifiedSockets, 0);
    assert.equal(request, undefined);
  }
});

test('a capabilities body at exactly 64 KiB is accepted without relaxing the byte limit', async () => {
  const json = JSON.stringify(procurementExchangeContract().capabilitiesResponseExample);
  const body = json + ' '.repeat(MAX_BYTES - Buffer.byteLength(json));
  assert.equal(Buffer.byteLength(body), MAX_BYTES);
  const { result } = await localCheck({ headers: { 'content-length': String(MAX_BYTES) }, body });
  safeResult(result, 'CAPABILITIES_VERIFIED');
});

test('capabilities must contain the exact protocol, numeric version, currency and unique four kinds', async () => {
  const published = procurementExchangeContract().capabilitiesResponseExample;
  for (const body of [
    { ...published, protocol: 'OTHER_PROTOCOL' }, { ...published, version: '1' }, { ...published, currency: 'USD' },
    { ...published, capabilities: KINDS.slice(1) }, { ...published, capabilities: [KINDS[0], KINDS[0], KINDS[2], KINDS[3]] },
    { ...published, capabilities: [...KINDS, 'PAYMENT'] }, { ...published, extra: SECRET },
  ]) {
    const { result } = await localCheck({ body: JSON.stringify(body) });
    safeResult(result, 'PROTOCOL_MISMATCH');
  }
});

test('redirect responses never follow the Location or forward credentials to a second destination', async () => {
  const { result, state } = await localCheck({ status: 302, headers: { location: 'https://127.0.0.1/secret' }, body: SECRET });
  safeResult(result, 'REDIRECT_REFUSED');
  assert.equal(state.dnsCalls, 1);
  assert.equal(state.requestCalls, 1);
});

test('authentication and server failures return bounded codes without response body or credential disclosure', async () => {
  for (const status of [401, 403, 500]) {
    const { result } = await localCheck({ status, body: SECRET });
    safeResult(result, status === 500 ? 'HTTP_RESPONSE_REJECTED' : 'AUTHENTICATION_REJECTED');
  }
});

test('non-JSON content, encoded bodies and malformed JSON are rejected independently', async () => {
  for (const [reply, code] of [
    [{ headers: { 'content-type': 'text/html' }, body: `<p>${SECRET}</p>` }, 'CONTENT_TYPE_REJECTED'],
    [{ headers: { 'content-encoding': 'gzip' } }, 'CONTENT_ENCODING_REJECTED'],
    [{ body: `{"invalid":${SECRET}` }, 'INVALID_JSON_RESPONSE'],
  ]) {
    const { result } = await localCheck(reply); safeResult(result, code);
  }
});

test('declared and chunked responses one byte above the limit are both refused', async () => {
  const declared = await localCheck({ headers: { 'content-length': String(MAX_BYTES + 1) }, body: ' ' });
  safeResult(declared.result, 'RESPONSE_TOO_LARGE');
  const json = JSON.stringify(procurementExchangeContract().capabilitiesResponseExample);
  const streamed = await localCheck({ headers: { 'transfer-encoding': 'chunked' }, chunks: [json, ' '.repeat(MAX_BYTES + 1 - Buffer.byteLength(json))] });
  safeResult(streamed.result, 'RESPONSE_TOO_LARGE');
});

test('an aborted local HTTPS response settles as a sanitized failure', async () => {
  const { result } = await localCheck({ abort: true });
  safeResult(result, 'CONNECTION_FAILED');
});

test('a real slow HTTPS provider is cut off by the bounded request deadline', { timeout: 12000 }, async () => {
  const start = performance.now();
  const { result, state } = await localCheck({ slow: true });
  safeResult(result, 'CONNECTION_TIMEOUT');
  assert.equal(state.verifiedSockets, 1);
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 5000 && elapsed < 11000, `HTTPS timeout elapsed ${elapsed}ms`);
});

test('a synchronous low-level request failure cannot expose the credential or leave the deadline running', async () => {
  const result = await checkProcurementConnection(baseSettings(), environment(), {
    lookup: async () => PUBLIC_DNS, request: () => { throw new Error(`synthetic failure ${SECRET}`); },
  });
  safeResult(result, 'CONNECTION_FAILED');
});
