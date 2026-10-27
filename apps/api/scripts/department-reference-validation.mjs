import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { DepartmentReferencesService } = require('../dist/legal-governance/department-references.service.js');
const { HYDROLAND_DEPARTMENTS } = require('../dist/governance/department-ownership.domain.js');
const { DEPARTMENT_REFERENCE_CATALOG: catalog } = require('../dist/legal-governance/department-reference-catalog.js');
const { departmentOperatingCycle } = require('../dist/document-forms/department-operating-cycle.catalog.js');
const actorId = '11111111-1111-4111-8111-111111111111';
const expectedTemplateCounts = { HR:21, TRAINING:13, MARINE_OPERATIONS:11, INVENTORY_LOGISTICS:11, FINANCE:10, SAFETY_COMPLIANCE_RISK:9, CUSTOMER_EXPERIENCE:9, MARKETING_GROWTH:10, TECHNOLOGY_CYBERSECURITY:11, FACILITIES_ASSETS_MAINTENANCE:10, ADMIN_AFFAIRS_RECORDS:10, EXECUTIVE_GOVERNANCE:11, RND_MARKET_INTELLIGENCE:10, LEGAL_CONTRACTS_INSURANCE:11 };
let permitted = true, privateReads = 0;
const controls = [
  { category: 'HR_COMPLIANCE', ruleKey: 'HR-LAB-EMP-001', labelAr: 'Fixture HR control', state: 'DISABLED', metadata: { regulatoryRequirementId: 'unapproved-fixture' } },
  { category: 'PAYMENT', ruleKey: 'PAYMENT_REQUIRED', labelAr: 'Fixture payment control', state: 'ENABLED', metadata: { regulatoryRequirementId: 'fixture-requirement', regulatoryVersion: 'fixture-v1', evidenceIds: ['fixture-evidence'], legalApprovalReference: 'fixture-approval', privateMarker: 'never-return-this' } },
];
const tx = {
  departmentClosureAssessment: {findFirst: async () => null},
  account: { findFirst: async ({ where }) => {
    assert.equal(where.id, actorId); assert.equal(where.status, 'ACTIVE'); assert.deepEqual(where.emailVerifiedAt, { not: null });
    assert.deepEqual(where.roleAssignments, { some: { role: 'ADMIN', status: 'ACTIVE' } });
    return permitted ? { id: actorId, personId: 'fixture-person' } : null;
  } },
  operationalSetting: { findUnique: async () => { privateReads++; return { value: { organizationId: 'fixture-platform' } }; } },
  organization: { findUnique: async () => ({ id: 'fixture-platform', ownerId: actorId, kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE' }) },
  orgUnit: { findMany: async ({ where }) => { assert.deepEqual(where, { organizationId: 'fixture-platform', type: 'DEPARTMENT' }); return HYDROLAND_DEPARTMENTS.map(d => ({ code: d.code, active: true })); } },
  policyControl: { findMany: async () => { privateReads++; return structuredClone(controls); } },
  documentTemplate: { findMany: async ({where,select}) => {
    privateReads++; assert.equal(where.organizationId,'fixture-platform'); assert.equal(new Set(where.code.in).size,157); assert(where.code.in.includes('TRN-TRAINING-PLAN')); assert(where.code.in.includes('FIN-PROVIDER-RECONCILIATION')); assert.equal(select.fields,undefined);
    return [
      { code:'HR-EMPLOYEE-REPORT',department:'HR',version:1,status:'INACTIVE',printable:true },
      { code:'HR-EMPLOYEE-REPORT',department:'HR',version:2,status:'ACTIVE',printable:true },
      { code:'HR-LEAVE-REQUEST',department:'HR',version:1,status:'ACTIVE',printable:true },
      { code:'HR-LEAVE-REQUEST',department:'HR',version:2,status:'ACTIVE',printable:true },
      { code:'FIN-TRANSACTION-REPORT',department:'HR',version:1,status:'ACTIVE',printable:true },
    ];
  } },
  managedDocument: { groupBy: async ({where,by}) => {
    privateReads++; assert.equal(where.organizationId,'fixture-platform'); assert.equal(where.OR.length,14); assert.deepEqual(by,['department','status']);
    for(const scope of where.OR){ assert.equal(scope.template.organizationId,'fixture-platform'); assert.equal(scope.template.department,scope.department); assert.equal(scope.template.code.in.length,expectedTemplateCounts[scope.department]); }
    return [{department:'HR',status:'DRAFT',_count:{_all:2}},{department:'HR',status:'ARCHIVED',_count:{_all:5}}];
  } },
};
const service = new DepartmentReferencesService({ serializable: async fn => fn(tx) });
const before = JSON.stringify(controls), result = await service.list(actorId);
assert.equal(result.referenceOnly, true); assert.equal(result.canActivate, false);
assert.equal(result.canonicalDepartmentCount, 14); assert.equal(result.recordedDepartmentCount, 14);
assert.equal(result.authorities.length, 19); assert.equal(result.legalReferences.length, 15); assert.equal(result.hrSources.length, 6); assert.equal(result.hrControlCandidates.length, 7);
assert.equal(result.marineArchives.length, 10);
assert.equal(result.isoReferences.length,11); assert.equal(result.canonicalSourceTemplateCount,157); assert.equal(result.completeDocumentInventoryVerified,false);
assert.deepEqual(result.referencePrecedence,['SAUDI_APPLICABLE_REGULATION','ISO_APPLICABLE_SCOPE','WRSTC_APPLICABLE_SCOPE','TRAINING_AGENCY_PROGRAM_VERSION']);
for (const source of result.isoReferences) {
  assert.equal(new URL(source.url).hostname,'www.iso.org'); assert.equal(source.adoptionDecisionReference,null); assert.equal(source.licensedCopyLibraryFileId,null); assert.equal(source.certificationClaim,false); assert.equal(source.clauseMappingStatus,'REVIEW_REQUIRED');
  for (const code of source.departmentCodes) assert(HYDROLAND_DEPARTMENTS.some(d=>d.code===code));
}
assert.equal(result.isoReferences.find(s=>s.id==='ISO-9001').designation,'ISO 9001:2026');
for (const number of ['9001','45001','31000']) assert.equal(new URL(result.isoReferences.find(s=>s.id==='ISO-'+number).url).pathname,'/standard/'+number,'Management standards use publisher edition landing URLs, not numeric catalog-item IDs');
for (const source of result.marineArchives) { assert.equal(source.officialSourceByteIdentityVerified, false); assert.equal(source.regulatoryVersion, null); assert.equal(source.legalApprovalReference, null); assert(source.sourceLibraryFileId.startsWith('libfile_')); assert(source.sourceFileId.startsWith('file_')); }
assert.deepEqual(result.departments.map(d => d.code), HYDROLAND_DEPARTMENTS.map(d => d.code));
assert.equal(result.effectivePolicyCount, 2); assert.equal(result.policiesWithRecordedReferences, 1);
const ids = [...result.authorities, ...result.legalReferences, ...result.marineArchives, ...result.hrSources].map(s => s.id);
assert.equal(new Set(ids).size, ids.length);
for (const department of result.departments) {
  assert(department.nameAr); assert(department.unitRecorded); assert(department.unitActive); assert.equal(department.canActivate, false);
  assert.equal(department.applicabilityStatus, 'REVIEW_REQUIRED'); assert.equal(department.businessOwner, department.code);
  assert.equal(department.legalReviewOwner, 'LEGAL_CONTRACTS_INSURANCE');
  assert(existsSync(fileURLToPath(new URL('../../../' + department.sourceBoundary, import.meta.url))), department.sourceBoundary);
  const refs = [...department.authorityIds, ...department.legalReferenceIds, ...department.marineArchiveIds, ...department.hrSourceIds];
  assert(refs.length > 0, department.code); for (const id of refs) assert(ids.includes(id));
  const cycle=department.operatingCycle;
  assert.equal(cycle.departmentClosed,false); assert.equal(cycle.closureAssessment,'NOT_ASSESSED'); assert.equal(cycle.completeDocumentInventoryVerified,false); assert.equal(cycle.closureDecisionReference,null);
  assert.equal(cycle.templates.length,expectedTemplateCounts[department.code]); assert.equal(cycle.closureGates.length,7); assert(cycle.closureGates.every(g=>g.verificationStatus==='NOT_ASSESSED'));
  for (const flow of cycle.cycles) { assert(flow.stepsAr.length>=6); for (const path of flow.sourcePaths) assert(existsSync(fileURLToPath(new URL('../../../'+path,import.meta.url))),path); }
  assert.deepEqual(cycle.sharedDocumentStates,['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED']);
  for (const id of department.isoReferenceIds) assert(result.isoReferences.some(s=>s.id===id));
}
const hr=result.departments.find(d=>d.code==='HR').operatingCycle;
assert.equal(hr.templates.find(t=>t.code==='HR-EMPLOYEE-REPORT').availability,'ACTIVE_VERSION_RECORDED');
assert.equal(hr.templates.find(t=>t.code==='HR-LEAVE-REQUEST').availability,'MULTIPLE_ACTIVE_VERSIONS');
assert.equal(hr.templates.find(t=>t.code==='HR-PERFORMANCE-REVIEW').availability,'NO_ACTIVE_VERSION_RECORDED');
assert.equal(result.departments.find(d=>d.code==='FINANCE').operatingCycle.templates.find(t=>t.code==='FIN-TRANSACTION-REPORT').availability,'NO_ACTIVE_VERSION_RECORDED','Wrong-department row is not proof of a valid finance template');
assert.deepEqual(hr.documentCounts,[{status:'DRAFT',count:2},{status:'ARCHIVED',count:5}]);
assert.equal(hr.departmentClosed,false,'Five archived documents are not a department closure decision');
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
const savedOrganization=tx.operationalSetting.findUnique;
tx.operationalSetting.findUnique=async()=>null;
const noOrg=await service.list(actorId); assert.equal(noOrg.recordedDepartmentCount,0); assert(noOrg.departments.every(d=>d.operatingCycle.templates.every(t=>t.availability==='ORGANIZATION_NOT_RECORDED'))); assert(noOrg.departments.every(d=>d.operatingCycle.documentCounts.length===0));
tx.operationalSetting.findUnique=savedOrganization;
permitted = false; const reads = privateReads;
await assert.rejects(() => service.list(actorId), e => e.getStatus?.() === 403); assert.equal(privateReads, reads, 'No private data read before fresh authorization');
console.log('Department reference validation passed: canonical ownership, all 157 templates across 14 operating cycles, organization/department-scoped counts, retained closure gates, missing/conflicting versions, source paths, fresh authorization, privacy and no writes.');
