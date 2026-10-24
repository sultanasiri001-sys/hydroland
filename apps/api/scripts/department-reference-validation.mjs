import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { DepartmentReferencesService } = require('../dist/legal-governance/department-references.service.js');
const { HYDROLAND_DEPARTMENTS } = require('../dist/governance/department-ownership.domain.js');
const { DEPARTMENT_REFERENCE_CATALOG: catalog } = require('../dist/legal-governance/department-reference-catalog.js');
const actorId = '11111111-1111-4111-8111-111111111111';
let permitted = true, privateReads = 0;
const controls = [
  { category: 'HR_COMPLIANCE', ruleKey: 'HR-LAB-EMP-001', labelAr: 'Fixture HR control', state: 'DISABLED', metadata: { regulatoryRequirementId: 'unapproved-fixture' } },
  { category: 'PAYMENT', ruleKey: 'PAYMENT_REQUIRED', labelAr: 'Fixture payment control', state: 'ENABLED', metadata: { regulatoryRequirementId: 'fixture-requirement', regulatoryVersion: 'fixture-v1', evidenceIds: ['fixture-evidence'], legalApprovalReference: 'fixture-approval', privateMarker: 'never-return-this' } },
];
const tx = {
  account: { findFirst: async ({ where }) => {
    assert.equal(where.id, actorId); assert.equal(where.status, 'ACTIVE'); assert.deepEqual(where.emailVerifiedAt, { not: null });
    assert.deepEqual(where.roleAssignments, { some: { role: 'ADMIN', status: 'ACTIVE' } });
    return permitted ? { id: actorId, personId: 'fixture-person' } : null;
  } },
  operationalSetting: { findUnique: async () => { privateReads++; return { value: { organizationId: 'fixture-platform' } }; } },
  organization: { findUnique: async () => ({ id: 'fixture-platform', ownerId: actorId, kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE' }) },
  orgUnit: { findMany: async ({ where }) => { assert.deepEqual(where, { organizationId: 'fixture-platform', type: 'DEPARTMENT' }); return HYDROLAND_DEPARTMENTS.map(d => ({ code: d.code, active: true })); } },
  policyControl: { findMany: async () => { privateReads++; return structuredClone(controls); } },
};
const service = new DepartmentReferencesService({ serializable: async fn => fn(tx) });
const before = JSON.stringify(controls), result = await service.list(actorId);
assert.equal(result.referenceOnly, true); assert.equal(result.canActivate, false);
assert.equal(result.canonicalDepartmentCount, 14); assert.equal(result.recordedDepartmentCount, 14);
assert.equal(result.authorities.length, 19); assert.equal(result.legalReferences.length, 15); assert.equal(result.hrSources.length, 6); assert.equal(result.hrControlCandidates.length, 7);
assert.deepEqual(result.departments.map(d => d.code), HYDROLAND_DEPARTMENTS.map(d => d.code));
assert.equal(result.effectivePolicyCount, 2); assert.equal(result.policiesWithRecordedReferences, 1);
const ids = [...result.authorities, ...result.legalReferences, ...result.hrSources].map(s => s.id);
assert.equal(new Set(ids).size, ids.length);
for (const department of result.departments) {
  assert(department.nameAr); assert(department.unitRecorded); assert(department.unitActive); assert.equal(department.canActivate, false);
  assert.equal(department.applicabilityStatus, 'REVIEW_REQUIRED'); assert.equal(department.businessOwner, department.code);
  assert.equal(department.legalReviewOwner, 'LEGAL_CONTRACTS_INSURANCE');
  assert(existsSync(fileURLToPath(new URL('../../../' + department.sourceBoundary, import.meta.url))), department.sourceBoundary);
  const refs = [...department.authorityIds, ...department.legalReferenceIds, ...department.hrSourceIds];
  assert(refs.length > 0, department.code); for (const id of refs) assert(ids.includes(id));
}
for (const a of result.authorities) { assert.equal(a.routingStatus, 'PROPOSED_OWNER_ROUTING'); for (const code of a.departmentCodes) assert(result.departments.some(d => d.code === code)); }
for (const control of result.hrControlCandidates) {
  assert.equal(control.enabled, false); assert.equal(control.regulatoryRequirementId, null); assert.equal(control.regulatoryVersion, null); assert.equal(control.legalApprovalReference, null); assert.deepEqual(control.evidenceIds, []);
  for (const id of control.sourceIds) assert(result.hrSources.some(s => s.id === id));
}
assert.equal(result.departments.find(d => d.code === 'HR').existingHrReviewPath, '/admin/employees/compliance-controls');
assert.equal(result.departments.find(d => d.code === 'HR').policies[0].referencesRecorded, false);
assert.equal(result.departments.find(d => d.code === 'FINANCE').policies[0].referencesRecorded, true);
assert(!JSON.stringify(result).includes('never-return-this')); assert(!JSON.stringify(result).includes(actorId));
assert.equal(JSON.stringify(controls), before);
const filtered = await service.list(actorId, 'HR'); assert.equal(filtered.departments.length, 1); assert.equal(filtered.departments[0].code, 'HR'); assert.equal(filtered.canonicalDepartmentCount, 14);
for (const bad of ['UNKNOWN', '', ['HR'], { code: 'HR' }]) await assert.rejects(() => service.list(actorId, bad), e => e.getStatus?.() === 400);
result.legalReferences[0].titleAr = 'mutated response'; assert.equal((await service.list(actorId)).legalReferences[0].titleAr, catalog.legalReferences[0].titleAr);
permitted = false; const reads = privateReads;
await assert.rejects(() => service.list(actorId), e => e.getStatus?.() === 403); assert.equal(privateReads, reads, 'No private data read before fresh authorization');
console.log('Department reference validation passed: canonical ownership and source integrity, historical routing and review boundaries, live organization scope, recorded-reference semantics, fresh authorization, privacy and no writes.');
