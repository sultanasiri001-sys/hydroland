import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const action = 'PUBLIC_SEARCH_SUBMITTED', resource = 'PublicSearch', schemaVersion = 'D12.search.v1';
const bindingKey = 'PLATFORM_STAFFING_ORGANIZATION:v1';
function isolated(base) {
  const db = new URL(process.env.DATABASE_URL);
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(db.hostname, '127.0.0.1');
  assert.equal(db.pathname, '/hydroland_d12_uat');
  assert.equal(new URL(base).hostname, '127.0.0.1');
}
const event = (organizationId, occurredAt = new Date(), overrides = {}) => {
  const id = randomUUID();
  return { id, action, resource, resourceId:id, occurredAt, actorId:null, ipAddress:null, requestId:null,
    metadata:{organizationId,schemaVersion,scope:'PLATFORM'}, ...overrides };
};
const post = (base, body, suffix = '', headers = {}) => fetch(new URL('discovery/search-events'+suffix, base), {
  method:'POST', headers:{'Content-Type':'application/json',...headers}, body:JSON.stringify(body),
});

export async function verifyPublicSearchHTTP({db,base,platform,center}) {
  isolated(base);
  const countSearch = () => db.auditEvent.count({where:{action,resource}});
  const count = await countSearch();
  const binding = await db.operationalSetting.findUniqueOrThrow({where:{key:bindingKey}});
  await db.operationalSetting.delete({where:{key:bindingKey}});
  try { assert.equal((await post(base,{eventId:randomUUID(),schemaVersion})).status,503); }
  finally { await db.operationalSetting.create({data:binding}); }
  assert.equal(await countSearch(),count);
  await db.organization.update({where:{id:platform.id},data:{status:'SUSPENDED'}});
  try { assert.equal((await post(base,{eventId:randomUUID(),schemaVersion})).status,503); }
  finally { await db.organization.update({where:{id:platform.id},data:{status:'ACTIVE'}}); }
  assert.equal(await countSearch(),count);
  const valid = {eventId:randomUUID(),schemaVersion};
  for (const invalid of [null, [], {}, {...valid,eventId:'not-a-uuid'}, {...valid,schemaVersion:'D12.search.v2'},
    {...valid,query:'private search'}, {...valid,accountId:'private account'}, {...valid,organizationId:center.id}, {...valid,ip:'private address'}]) {
    assert.equal((await post(base,invalid)).status,400);
  }
  assert.equal((await post(base,valid,'?query=private')).status,400);
  assert.equal(await countSearch(),count);
  const results = await Promise.all(Array.from({length:8},()=>post(base,valid,'',{'X-Forwarded-For':'198.51.100.19'})));
  assert.deepEqual(results.map(r=>r.status),Array(8).fill(204));
  assert.equal(await db.auditEvent.count({where:{id:valid.eventId}}),1);
  const stored = await db.auditEvent.findUniqueOrThrow({where:{id:valid.eventId}});
  assert.equal(stored.actorId,null); assert.equal(stored.ipAddress,null); assert.equal(stored.requestId,null);
  assert.deepEqual(stored.metadata,{organizationId:platform.id,schemaVersion,scope:'PLATFORM'});
  assert.equal(stored.resourceId,valid.eventId);
  assert.equal((await post(base,valid)).status,204);
  assert.deepEqual(await db.auditEvent.findUniqueOrThrow({where:{id:valid.eventId}}),stored);
  const collision = await db.auditEvent.create({data:{id:randomUUID(),action:'fixture.other',resource:'Fixture',resourceId:randomUUID(),metadata:{private:'unchanged'}}});
  assert.equal((await post(base,{eventId:collision.id,schemaVersion})).status,409);
  assert.deepEqual(await db.auditEvent.findUniqueOrThrow({where:{id:collision.id}}),collision);
  console.log('PASS public search HTTP: strict version/body/query, missing platform fail-closed, concurrent UUID deduplication, immutable replay/collision, no identity or query persisted');

  const from = new Date('2026-10-01T21:00:00Z'), day = new Date('2026-10-02T12:00:00Z'), until = new Date('2026-10-02T21:00:00Z');
  await db.auditEvent.createMany({data:[event(platform.id,from),event(platform.id,day),event(platform.id,until),
    event(center.id,day),event(platform.id,day,{metadata:{organizationId:platform.id,schemaVersion,scope:'CENTER'}}),
    event(platform.id,day,{metadata:{organizationId:platform.id,schemaVersion:'D12.search.v0',scope:'PLATFORM'}}),
    event(platform.id,day,{ipAddress:'private fixture address'})]});
  return {eventId:valid.eventId,schemaVersion};
}

export async function verifyPublicSearchCapacity({db,base,platform,replay}) {
  isolated(base);
  // Keep this short concurrency check away from a wall-clock minute rollover.
  const seconds = new Date().getUTCSeconds();
  if (seconds >= 55) await new Promise(resolve=>setTimeout(resolve,(61-seconds)*1000));
  const now = new Date(), start = new Date(Math.floor(now.getTime()/60_000)*60_000), end = new Date(start.getTime()+60_000);
  const where = {action,resource,occurredAt:{gte:start,lt:end},metadata:{path:['organizationId'],equals:platform.id}};
  const existing = await db.auditEvent.count({where});
  assert(existing<59);
  await db.auditEvent.createMany({data:Array.from({length:59-existing},()=>event(platform.id,now))});
  const candidates = Array.from({length:6},()=>({eventId:randomUUID(),schemaVersion}));
  const responses = await Promise.all(candidates.map(body=>post(base,body)));
  assert.equal(responses.filter(r=>r.status===204).length,1);
  assert.equal(responses.filter(r=>r.status===429).length,5);
  assert.equal(await db.auditEvent.count({where}),60);
  assert.equal((await post(base,replay)).status,204,'replay does not consume new-event capacity');
  assert.equal((await post(base,{eventId:randomUUID(),schemaVersion},'',{'X-Forwarded-For':'203.0.113.99'})).status,429);
  assert.equal(await db.auditEvent.count({where}),60);
  console.log('PASS public search write budget: shared 60-new-events/minute limit under concurrent requests, replay preserved, forwarded address cannot bypass');
}
