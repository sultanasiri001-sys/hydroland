import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createStaticServer } from './serve.mjs';

test('production HTTP server rejects malformed and escaping paths and stays available', async t => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'hydroland-static-'));
  const publicRoot = path.join(fixture, 'dist');
  await mkdir(publicRoot);
  await mkdir(path.join(fixture, 'dist-private'));
  await writeFile(path.join(publicRoot, 'index.html'), '<h1>HYDROLAND</h1>');
  await writeFile(path.join(publicRoot, 'app.js'), 'window.loaded = true;');
  const secret = path.join(fixture, 'dist-private', 'secret.txt');
  await writeFile(secret, 'must-not-be-public');
  await symlink(secret, path.join(publicRoot, 'linked.txt'));
  const server = createStaticServer(publicRoot);
  t.after(async () => {
    if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(fixture, { recursive: true, force: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const request = requestPath => new Promise((resolve, reject) => {
    get({ hostname: '127.0.0.1', port: server.address().port, path: requestPath }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body, type: response.headers['content-type'] }));
      response.on('error', reject);
    }).on('error', reject);
  });
  for (const malformed of ['/%E0%A4%A', '/%FF', '/%00']) {
    assert.equal((await request(malformed)).status, 400, malformed);
    assert.equal((await request('/')).body, '<h1>HYDROLAND</h1>', 'healthy request after malformed request');
  }
  for (const escaping of ['/..%2fdist-private/secret.txt', '/linked.txt']) {
    const response = await request(escaping);
    assert.equal(response.status, 403, escaping);
    assert.ok(!response.body.includes('must-not-be-public'));
  }
  const asset = await request('/app.js');
  assert.equal(asset.status, 200);
  assert.match(asset.type, /^text\/javascript/);
  assert.equal(asset.body, 'window.loaded = true;');
  assert.equal((await request('/portal/center')).body, '<h1>HYDROLAND</h1>', 'SPA fallback remains available');
  await rm(path.join(publicRoot, 'index.html'));
  assert.equal((await request('/')).status, 404, 'missing build handled without uncaught rejection');
  assert.equal((await request('/app.js')).status, 200, 'server survives missing entrypoint');
});
