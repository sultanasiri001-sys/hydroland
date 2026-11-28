import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

// Synthetic native prerequisites only. This helper is intentionally unavailable
// outside explicitly disposable loopback CI databases. It issues no external
// credentials and never claims an external authority's actual approval.
export async function crewAssignmentFixture(db, options = {}) {
  const url = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.NODE_ENV, 'test');
  assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert(/(?:test|_ci)(?:_|$)/.test(url.pathname), 'Disposable CI/test database required');
  const require = createRequire(import.meta.url);
  const build = process.env.F02_API_BUILD_DIR || resolve(new URL('../dist/', import.meta.url).pathname);
  const load = options.load || (file => require(resolve(build, file)));
  const {crewSourceTemplate, crewJson, crewHash} = load('trips/crew-assignment-evidence.js');
  const {CrewAssignmentService} = load('trips/crew-assignment.service.js');
  const {PolicyControlService} = load('trips/policy-control.service.js');
  const {AuditService} = load('audit/audit.service.js');
  if (!db.serializable) db.serializable = load('database/database.service.js').DatabaseService.prototype.serializable.bind(db);
  const audit = options.audit || new AuditService(db), service = new CrewAssignmentService(db, new PolicyControlService(db, audit), audit);
  const created = {accounts: [], organizations: [], memberships: [], units: [], positions: [], employments: [], agreements: [], terms: [], credentials: [], documents: [], resources: [], assignments: []};
  const actor = async (name, roles=[]) => {
    const row = await db.account.create({data: {email: 'f02-'+randomUUID()+'@example.invalid', passwordHash: 'SYNTHETIC-NOT-A-LOGIN', status: 'ACTIVE', emailVerifiedAt: new Date(),
      person: {create: {firstName: 'Synthetic F02', lastName: name}}, roleAssignments: {create: roles.map(role => ({role, status: 'ACTIVE'}))}}});
    created.accounts.push(row); return row;
  };
  const key = 'PLATFORM_STAFFING_ORGANIZATION:v1', prior = await db.operationalSetting.findUnique({where: {key}});
  let platform = prior && await db.organization.findUnique({where: {id: prior.value.organizationId}});
  if (!platform) {
    const owner = await actor('platform owner', ['ADMIN']);
    platform = await db.organization.create({data: {kind: 'HYDROLAND_INTERNAL_PLATFORM', displayName: 'Synthetic F02 platform', status: 'ACTIVE', ownerId: owner.id}});
    created.organizations.push(platform);
    await db.operationalSetting.upsert({where: {key}, create: {key, value: {organizationId: platform.id}}, update: {value: {organizationId: platform.id}}});
  }
  let unit = await db.orgUnit.findUnique({where: {organizationId_code: {organizationId: platform.id, code: 'MARINE_OPERATIONS'}}});
  if (!unit) { unit = await db.orgUnit.create({data: {organizationId: platform.id, type: 'DEPARTMENT', code: 'MARINE_OPERATIONS', nameAr: 'Synthetic F02 operations'}}); created.units.push(unit); }
  const position = await db.position.create({data: {orgUnitId: unit.id, code: 'F02-'+randomUUID(), titleAr: 'Synthetic F02 authorized operator'}}); created.positions.push(position);
  const staff = async name => {
    const account = await actor(name, ['STAFF','REVIEWER']);
    const membership = await db.organizationMember.create({data: {organizationId: platform.id, accountId: account.id, role: 'STAFF', status: 'ACTIVE'}}); created.memberships.push(membership);
    const employment = await db.employment.create({data: {organizationId: platform.id, accountId: account.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE'}}); created.employments.push(employment);
    return account;
  };
  const requester = await staff('requester'), approver = await staff('independent approver');
  await db.documentBrandSnapshot.upsert({where: {organizationId_brandVersion: {organizationId: platform.id, brandVersion: 1}}, create: {organizationId: platform.id, brandVersion: 1}, update: {}});
  const template = await db.documentTemplate.upsert({where: {organizationId_code_version: {organizationId: platform.id, code: crewSourceTemplate.code, version: 1}},
    create: {organizationId: platform.id, ...crewSourceTemplate, fields: crewJson(crewSourceTemplate.fields)}, update: {}});
  const sourceCache = new Map();
  async function candidate(tripId, {roleType='INSTRUCTOR', account, resource} = {}) {
    const trip = await db.trip.findUniqueOrThrow({where: {id: tripId}}), organizationId = trip.organizationId || platform.id;
    const organization = await db.organization.findUniqueOrThrow({where: {id: organizationId}});
    const person = account || await actor('crew member', [roleType === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STAFF']);
    assert(person.email.endsWith('@example.invalid'), 'Only synthetic accounts may be enriched');
    if (!person.emailVerifiedAt) await db.account.update({where: {id: person.id}, data: {emailVerifiedAt: new Date()}});
    await db.roleAssignment.upsert({where: {accountId_role: {accountId: person.id, role: roleType === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STAFF'}},
      create: {accountId: person.id, role: roleType === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STAFF', status: 'ACTIVE'}, update: {status: 'ACTIVE'}});
    const oldMembership = await db.organizationMember.findUnique({where: {organizationId_accountId: {organizationId, accountId: person.id}}});
    if (!oldMembership) {const membership = await db.organizationMember.create({data: {organizationId, accountId: person.id, role: roleType === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STAFF', status: 'ACTIVE'}}); created.memberships.push(membership);}
    const now = new Date(), expiry = new Date(Math.max(trip.endsAt.getTime()+86400000, Date.now()+365*86400000));
    const issuer = 'F02-SYNTHETIC-ISSUER', title = 'SYNTHETIC '+roleType+' QUALIFICATION';
    const credential = await db.credential.create({data: {personId: person.personId, issuer, title, issuedAt: new Date(Date.now()-3600000), expiresAt: expiry, verificationStatus: 'VERIFIED'}}); created.credentials.push(credential);
    await audit.record({actorId: approver.id, action: 'CREDENTIAL_REVIEWED', resource: 'Credential', resourceId: credential.id,
      metadata: {reviewerAccountId: approver.id, status: 'VERIFIED', fixture: 'SYNTHETIC-F02-NO-EXTERNAL-QUALIFICATION', externalVerification: false}}, db);
    const cacheKey = [organizationId, trip.type, roleType, expiry.toISOString()].join(':');
    let source = sourceCache.get(cacheKey);
    if (!source) {
      const payload = {purpose: 'F02_CREW_QUALIFICATION', organizationId, tripType: trip.type, roleType,
        effectiveFrom: new Date(Date.now()-3600000).toISOString(), validUntil: expiry.toISOString(), sourceAuthority: 'SYNTHETIC CI ONLY',
        sourceReference: 'SYNTHETIC-NO-REAL-APPROVAL-'+randomUUID(), sourceVersion: 'CI-1', sourceClause: 'SYNTHETIC-FIXTURE', applicabilityReason: 'Synthetic isolated native acceptance fixture only',
        credentialRequirements: JSON.stringify([{issuer, title, expiryRequired: true, externalVerificationRequired: false}])};
      source = await db.managedDocument.create({data: {organizationId: platform.id, templateId: template.id, referenceNumber: 'F02-SYNTHETIC-'+randomUUID(), department: 'MARINE_OPERATIONS',
        status: 'APPROVED', contentHash: 'sha256:'+crewHash(payload), documentBrandVersion: 1, payload, createdByAccountId: requester.id, approvedByAccountId: approver.id, approvedAt: now}}); created.documents.push(source);
      await db.documentRevision.create({data: {documentId: source.id, version: 1, contentHash: source.contentHash, payload, createdByAccountId: requester.id}});
      await db.documentLifecycleEvent.create({data: {documentId: source.id, actorAccountId: approver.id, action: 'APPROVED', fromStatus: 'PENDING_APPROVAL', toStatus: 'APPROVED', version: 1, occurredAt: now, metadata: {synthetic: true}}});
      sourceCache.set(cacheKey, source);
    }
    let agreement, term;
    if (roleType === 'INSTRUCTOR') {
      const old = await db.instructorCompensationAgreement.findFirst({where: {organizationId, instructorAccountId: person.id}, orderBy: {revision: 'desc'}});
      agreement = await db.instructorCompensationAgreement.create({data: {organizationId, instructorAccountId: person.id, revision: (old?.revision||0)+1, mode: 'FIXED', rateBps: 0, fixedMinor: 12500, currency: 'SAR', recordedByAccountId: organization.ownerId,
        earningTiming: 'SYNTHETIC: after approved attendance', reversalTerms: 'SYNTHETIC: independent review before any reversal'}}); created.agreements.push(agreement);
    } else {
      let compensationUnit = unit;
      if (organizationId !== platform.id) {
        compensationUnit = await db.orgUnit.create({data: {organizationId, type: 'DEPARTMENT', code: 'F02-'+randomUUID(), nameAr: 'Synthetic F02 payroll'}}); created.units.push(compensationUnit);
      }
      const employment = await db.employment.create({data: {accountId: person.id, organizationId, orgUnitId: compensationUnit.id, workerClass: 'EMPLOYEE', status: 'ACTIVE', startsAt: new Date(Date.now()-86400000)}}); created.employments.push(employment);
      const reviewer = await actor('compensation reviewer', ['HR_REVIEWER']);
      term = await db.compensationTerm.create({data: {employmentId: employment.id, effectiveFrom: new Date(Date.now()-86400000), baseAmountMinor: 400000, currency: 'SAR', status: 'APPROVED',
        requestedByAccountId: requester.id, reviewedByAccountId: reviewer.id, approvedByAccountId: approver.id}}); created.terms.push(term);
    }
    const r = resource || await db.calendarResource.create({data: {type: roleType, name: 'Synthetic F02 '+roleType, referenceId: person.id}});
    if (!resource) created.resources.push(r);
    return {trip, organization, account: person, resource: r, source, credential, agreement, term};
  }
  async function ready(tripId, options={}) {
    const fixture = await candidate(tripId, options);
    const proposal = await service.propose(requester.id, tripId, {requestId: randomUUID(), resourceId: fixture.resource.id, sourceId: fixture.source.id, reason: 'Synthetic F02 readiness prerequisite', waitlisted: false});
    created.assignments.push(proposal.assignmentId);
    const approved = await service.command(approver.id, proposal.assignmentId, {requestId: randomUUID(), expectedRevision: proposal.revision, action: 'APPROVE', reason: 'Independent synthetic F02 assignment approval'});
    await service.respond(fixture.account.id, proposal.assignmentId, 'ACCEPTED', {requestId: randomUUID(), expectedRevision: approved.revision, reason: 'Synthetic crew accepts the recorded terms'});
    return {...fixture, assignmentId: proposal.assignmentId};
  }
  return {actor, requester, approver, platform, template, service, audit, candidate, ready, created};
}
