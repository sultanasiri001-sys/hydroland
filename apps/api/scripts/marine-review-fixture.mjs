import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID, createHmac } from 'node:crypto';

export async function marineTestToken(db, accountId, secret) {
  const session = await db.session.create({ data: { accountId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 900000) } });
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: accountId, sid: session.id, iat: now, exp: now + 900 });
  return body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
}

export async function marineReviewFixture(db, base, centerOwner, platformOwner, { storage = false } = {}) {
  for (const url of [process.env.DATABASE_URL, base]) {
    assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname), 'Local review fixtures only');
  }
  const pointer = 'PLATFORM_STAFFING_ORGANIZATION:v1';
  const previous = await db.operationalSetting.findUnique({ where: { key: pointer } });
  const center = await db.organization.create({ data: { displayName: 'E2E dive center', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: centerOwner } });
  const platform = await db.organization.create({ data: { displayName: 'E2E platform', kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', ownerId: platformOwner } });
  await db.operationalSetting.upsert({ where: { key: pointer }, create: { key: pointer, value: { organizationId: platform.id } }, update: { value: { organizationId: platform.id } } });
  const objects = new Map();
  let server;
  if (storage) {
    server = http.createServer(async (request, response) => {
      const key = request.url.split('?')[0];
      if (request.method === 'PUT') {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        objects.set(key, Buffer.concat(chunks));
      } else if (request.method === 'DELETE') objects.delete(key);
      else if (!objects.has(key)) response.statusCode = 404;
      response.end(request.method === 'GET' ? objects.get(key) : undefined);
    });
    await new Promise((resolve, reject) => server.once('error', reject).listen(3199, '127.0.0.1', resolve));
  }
  async function call(token, path, method = 'GET', data) {
    return fetch(base + '/marine-operations/' + path, {
      method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
  }
  async function ok(...args) {
    const response = await call(...args);
    const body = await response.json();
    assert(response.ok, response.status + ' ' + JSON.stringify(body));
    return body;
  }
  async function pending(token, stage, id) {
    return (await ok(token, stage + '/documents/pending')).find(doc => doc.id === id);
  }
  async function decide(token, stage, doc, outcome, note) {
    return ok(token, stage + '/documents/' + doc.id + '/decision', 'POST', { expectedRevision: doc.reviewRevision, outcome, note });
  }
  return {
    center, call, ok, pending, decide,
    file() {
      return { originalName: 'registration.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4\n% Synthetic ' + randomUUID() + '\n%%EOF').toString('base64') };
    },
    bind: (token, assetId) => ok(token, 'assets/' + assetId + '/review-center', 'POST', { centerId: center.id }),
    async close() {
      if (server) await new Promise(resolve => server.close(resolve));
      if (previous) await db.operationalSetting.update({ where: { key: pointer }, data: { value: previous.value, updatedAt: previous.updatedAt } });
      else await db.operationalSetting.delete({ where: { key: pointer } });
      await db.organization.deleteMany({ where: { id: { in: [center.id, platform.id] } } });
    }
  };
}
