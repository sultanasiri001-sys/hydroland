import assert from 'node:assert/strict';
import { randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const base = process.env.STAFFING_E2E_BASE_URL || 'http://127.0.0.1:3103/api/v1';
for (const url of [base, process.env.DATABASE_URL || 'postgresql://missing']) assert(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname), 'Reference fixtures require loopback API and database');
assert(process.env.CI === 'true' || process.env.NODE_ENV === 'test', 'Reference fixtures are test-only');
const db = new PrismaClient(), suffix = randomUUID(), accounts = [], people = [];
const password = 'Isolated-reference-fixture-2026!', salt = 'reference-fixture', passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const call = async (path, token, body) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type':'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json().catch(() => null) };
};
const fixture = async (name, role) => {
  const person = await db.person.create({ data: { firstName:'Reference', lastName:name } }); people.push(person.id);
  const account = await db.account.create({ data: { personId:person.id, email:`reference-${name}-${suffix}@example.invalid`, passwordHash, status:'ACTIVE', emailVerifiedAt:new Date() } }); accounts.push(account.id);
  await db.roleAssignment.create({ data: { accountId:account.id, role, status:'ACTIVE' } }); return account;
};
const login = async account => { const r = await call('/auth/login', null, { email:account.email, password }); assert.equal(r.status,200); return r.body.accessToken; };
const endpoint = '/admin/department-references';
const effects = () => Promise.all([db.policyControl.findMany({orderBy:[{category:'asc'},{ruleKey:'asc'}]}),db.employment.count(),db.organizationMember.count(),db.managedDocument.count(),db.aiAgentTask.count()]);
try {
  const admin = await fixture('admin','ADMIN'), ordinary = await fixture('ordinary','STAFF'), token = await login(admin), other = await login(ordinary), before = await effects();
  assert.equal((await call(endpoint)).status,401); assert.equal((await call(endpoint,other)).status,403);
  const response = await call(endpoint,token); assert.equal(response.status,200); assert.equal(response.cache,'no-store');
  const data = response.body; assert.equal(data.referenceOnly,true); assert.equal(data.canActivate,false); assert.equal(data.canonicalDepartmentCount,14); assert.equal(data.departments.length,14);
  assert.equal(data.authorities.length,19); assert.equal(data.legalReferences.length,15); assert.equal(data.hrSources.length,6); assert.equal(data.hrControlCandidates.length,7);
  for (const candidate of data.hrControlCandidates) { assert.equal(candidate.enabled,false); assert.equal(candidate.legalApprovalReference,null); assert.deepEqual(candidate.evidenceIds,[]); }
  for (const department of data.departments) assert.equal(department.canActivate,false);
  const filtered = await call(endpoint+'?department=HR',token); assert.equal(filtered.status,200); assert.equal(filtered.body.departments.length,1); assert.equal(filtered.body.departments[0].code,'HR');
  assert.equal((await call(endpoint+'?department=UNKNOWN',token)).status,400); assert.equal((await call(endpoint+'?department=HR&department=FINANCE',token)).status,400);
  assert.equal((await call(endpoint,token,{activate:true})).status,404);
  assert(!/passwordHash|accessToken|refreshToken|requestedByAccountId|approvedByAccountId/.test(JSON.stringify(data)), 'No private identity or raw policy metadata');
  await db.account.update({where:{id:admin.id},data:{emailVerifiedAt:null}}); assert.equal((await call(endpoint,token)).status,403);
  await db.account.update({where:{id:admin.id},data:{emailVerifiedAt:new Date()}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'SUSPENDED'}}); assert.equal((await call(endpoint,token)).status,403);
  assert.deepEqual(await effects(),before,'Discovery cannot alter policies, employees, memberships, documents or AI tasks');
  console.log('Department reference HTTP/PostgreSQL passed: real guards and fresh revocation, uncached discovery, canonical sources, bounded filtering, no activation route and no business-state changes.');
} finally {
  await db.auditEvent.deleteMany({where:{actorId:{in:people}}}); await db.notification.deleteMany({where:{accountId:{in:accounts}}}); await db.session.deleteMany({where:{accountId:{in:accounts}}}); await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}}); await db.account.deleteMany({where:{id:{in:accounts}}}); await db.person.deleteMany({where:{id:{in:people}}}); await db.$disconnect();
}
