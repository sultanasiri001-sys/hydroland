// D04 native HTTP/PostgreSQL acceptance. All identities, observations and
// documents are synthetic in the disposable loopback D01 fixture only.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { participationFixture, hash } = require('./d01-participation-fixture.cjs');

async function main() {
  const f = await participationFixture(), checks = [];
  const check = async (name, work) => { await work(); checks.push(name); console.log('PASS D04 ' + name); };
  const { db, ok, denied, call } = f;
  const endpoint = id => '/trips/return-accountability/' + id;
  const incidentPath = id => '/safety/incidents/admin/' + id + '/status';
  const preview = async (tripId, actor = f.centerOwner) => ok(await call(actor, endpoint(tripId)));
  const command = (p, extra = {}) => ({ requestId: randomUUID(), expectedRevision: p.revision, expectedState: p.stateToken,
    observedAt: new Date().toISOString(), reason: 'Synthetic observed return accountability; no actual trip or emergency.',
    entries: p.roster.map(r => ({ kind: r.kind, id: r.id, status: 'RETURNED' })), ...extra });
  const saved = async id => (await db.$queryRaw`SELECT * FROM "TripReturnRecord" WHERE "tripId"::text=${id}`)[0] ?? null;
  const snapshot = async id => JSON.stringify([await saved(id), await db.safetyIncident.findMany({ where: { tripId: id }, orderBy: { id: 'asc' } }),
    await db.auditEvent.findMany({ where: { OR: [{ resourceId: id }, { metadata: { path: ['tripId'], equals: id } }] }, orderBy: { id: 'asc' } })]);
  const rejectsUnchanged = async (tripId, body, statuses = [400, 409], actor = f.centerOwner) => {
    const before = await snapshot(tripId); denied(await call(actor, endpoint(tripId), 'POST', body), statuses); assert.equal(await snapshot(tripId), before);
  };
  const makeTrip = async (extra = {}) => db.trip.create({ data: { organizationId: f.center.id, title: 'Synthetic D04 return fixture', type: 'SHORE_DIVE',
    capacity: 2, status: 'OPEN', startsAt: new Date(Date.now() - 7200000), endsAt: new Date(Date.now() - 3600000), ...extra } });
  const report = async (tripId, reporter = f.participant) => ok(await call(reporter, '/safety/incidents', 'POST', {
    tripId, severity: 'HIGH', title: 'Synthetic D04 incident', description: 'PRIVATE_REPORTER_NARRATIVE_D04', locationName: 'Synthetic site only' }));
  const decision = (incident, extra = {}) => ({ requestId: randomUUID(), expectedUpdatedAt: new Date(incident.updatedAt).toISOString(), status: 'CLOSED',
    resolutionNotes: 'PRIVATE_INDEPENDENT_RESOLUTION_D04', capaRequired: false,
    applicabilityReason: 'Synthetic fixture: independent reviewer records why this isolated test observation needs no corrective action.', ...extra });
  const currentIncident = id => db.safetyIncident.findUniqueOrThrow({ where: { id } });
  const requireReturn = f.load('trips/trip-return.service.js').requireAccountedReturn;
  // Instrument only this isolated fixture's transaction object. The real HTTP
  // controller, SQL, row locks and database commit still execute unchanged.
  const raceNativeLock = async (fragment, revoke, write) => {
    const original = db.serializable; let entered, pending, timer;
    const barrier = new Promise(resolve => { entered = resolve; });
    db.serializable = work => original.call(db, tx => work(new Proxy(tx, { get(target, property) {
      if (property !== '$queryRaw') return Reflect.get(target, property);
      return (...args) => { const sql = Array.isArray(args[0]) ? args[0].join('') : String(args[0]?.sql || '');
        if (sql.includes(fragment) && sql.includes('FOR SHARE')) entered(); return target.$queryRaw(...args); };
    } })));
    try {
      await db.$transaction(async tx => {
        await revoke(tx); pending = write();
        await Promise.race([barrier, pending.then(r => { throw new Error('Command returned before the native lock barrier: ' + JSON.stringify(r)); }),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Native write lock barrier not reached')), 5000); })]);
        clearTimeout(timer);
      }, { timeout: 10000 });
      return await pending;
    } finally { clearTimeout(timer); db.serializable = original; if (pending) await pending; }
  };
  let success = false;
  try {
    await db.roleAssignment.create({ data: { accountId: f.outsider.id, role: 'DIVE_CENTER', status: 'ACTIVE' } });
    await db.organizationMember.create({ data: { organizationId: f.foreign.id, accountId: f.outsider.id, role: 'OWNER', status: 'ACTIVE' } });
    const trip = await makeTrip();
    const booking = await db.booking.create({ data: { tripId: trip.id, accountId: f.participant.id, status: 'CONFIRMED', seats: 2 } });
    const participants = [];
    for (const [actor, name] of [[f.participant, 'Synthetic return participant'], [f.guardian, 'Synthetic absent participant']]) participants.push(await db.bookingParticipant.create({ data: {
      bookingId: booking.id, accountId: actor.id, fullName: name, eligibilityStatus: 'APPROVED', identitySnapshot: { private: 'PRIVATE_IDENTITY_D04' } } }));
    const resource = await db.calendarResource.create({ data: { type: 'CREW', name: 'Synthetic legacy accepted crew', referenceId: f.signer.id } });
    const crew = await db.crewAssignment.create({ data: { tripId: trip.id, resourceId: resource.id, accountId: f.signer.id, roleType: 'DIVE_LEADER', status: 'ACCEPTED' } });
    let p = await preview(trip.id);
    await check('private scoped preview includes factual legacy crew without disclosing identity or account data', async () => {
      const response = await call(f.centerOwner, endpoint(trip.id)); ok(response); assert.equal(response.headers['cache-control'], 'private, no-store');
      assert.equal(p.roster.length, 3); assert.ok(p.roster.some(r => r.kind === 'CREW' && r.id === crew.id));
      assert.equal(p.confirmedSeats, 2); assert.equal(p.participantCount, 2); assert.equal(p.saved, null);
      assert.equal(p.externalDistressSent, false); assert.equal(p.operationalAuthority, false);
      assert.doesNotMatch(JSON.stringify(p), /PRIVATE_IDENTITY_D04|accountId|identitySnapshot|email|medical/i);
      denied(await call(null, endpoint(trip.id)), 401); denied(await call(f.outsider, endpoint(trip.id)), 404); denied(await call(f.viewer, endpoint(trip.id)), 403);
    });
    const initial = command(p);
    await check('strict input, full roster, current source and observed time reject without side effects', async () => {
      for (const extra of [{ status: 'COMPLETE' }, { requestId: 'invalid' }, { expectedRevision: -1 }, { expectedState: 'old' }, { reason: 'x' },
        { entries: [] }, { entries: initial.entries.slice(1) }, { entries: [...initial.entries, initial.entries[0]] },
        { entries: [{ ...initial.entries[0], kind: ['PARTICIPANT'] }, ...initial.entries.slice(1)] },
        { entries: [{ ...initial.entries[0], status: ['RETURNED'] }, ...initial.entries.slice(1)] },
        { entries: [{ ...initial.entries[0], status: 'TRANSFERRED' }, ...initial.entries.slice(1)] },
        { entries: [{ ...initial.entries[0], id: randomUUID() }, ...initial.entries.slice(1)] },
        { observedAt: new Date(Date.now() + 3600000).toISOString() }, { observedAt: new Date(Date.now() - 10800000).toISOString() }]) await rejectsUnchanged(trip.id, { ...initial, ...extra });
      const foreign = await makeTrip({ organizationId: f.foreign.id }); const foreignIncident = await report(foreign.id);
      await rejectsUnchanged(trip.id, { ...initial, entries: [{ ...initial.entries[0], status: 'TRANSFERRED', incidentId: foreignIncident.id, handoverReference: 'Synthetic handover' }, ...initial.entries.slice(1)] });
      await db.serializable(tx => assert.rejects(() => requireReturn(tx, trip.id, participants.map(v => v.id)), /حصر/));
    });
    await check('seat names must be complete before recording return', async () => {
      await f.changed('booking', { id: booking.id }, { seats: 3 }, async () => { const changed = await preview(trip.id); await rejectsUnchanged(trip.id, command(changed), 409); });
    });
    const assistance = command(await preview(trip.id));
    assistance.entries = assistance.entries.map(e => ({ ...e, status: e.id === participants[0].id ? 'ASSISTANCE_REQUIRED' : e.id === participants[1].id ? 'NOT_BOARDED' : 'RETURNED' }));
    let assistanceId;
    await check('concurrent assistance retries create one native critical incident, one return and one notice per admin', async () => {
      const results = await Promise.all([call(f.centerOwner, endpoint(trip.id), 'POST', assistance), call(f.centerOwner, endpoint(trip.id), 'POST', assistance)]);
      results.forEach(ok); assert.equal(results[0].data.revision, 1); assert.equal(results[1].data.revision, 1);
      assert.equal(results[0].data.state, 'ASSISTANCE_REQUIRED'); assert.equal(results[0].data.externalDistressSent, false);
      assert.equal(await db.safetyIncident.count({ where: { tripId: trip.id } }), 1);
      const incident = await db.safetyIncident.findFirstOrThrow({ where: { tripId: trip.id } }); assistanceId = incident.id;
      assert.equal(incident.severity, 'CRITICAL'); assert.equal(incident.status, 'OPEN');
      const entry = (await saved(trip.id)).entries.find(e => e.id === participants[0].id); assert.equal(entry.incidentId, incident.id);
      assert.equal(await db.auditEvent.count({ where: { action: 'TRIP_RETURN_RECORDED', resourceId: trip.id } }), 1);
      assert.equal(await db.notification.count({ where: { accountId: f.reviewer.id, type: 'SAFETY_INCIDENT_REPORTED', payload: { path: ['resourceId'], equals: incident.id } } }), 1);
      assert.equal(ok(await call(f.centerOwner, endpoint(trip.id), 'POST', assistance)).alreadyApplied, true);
      await rejectsUnchanged(trip.id, { ...assistance, reason: 'Changed meaning with same command ID' }, 409);
      await db.serializable(tx => assert.rejects(() => requireReturn(tx, trip.id, [participants[0].id]), /حصر/));
    });
    await check('cancellation and changed crew never remove an already recorded person needing help', async () => {
      await f.changed('booking', { id: booking.id }, { status: 'CANCELLED' }, async () => {
        const current = await preview(trip.id); assert.equal(current.saved.sourceCurrent, false); assert.equal(current.roster.length, 3);
        assert.ok(current.roster.find(r => r.id === participants[0].id).historical); assert.equal(current.saved.counts.assistanceRequired, 1);
        await rejectsUnchanged(trip.id, command(current, { entries: current.roster.filter(r => r.id !== participants[0].id).map(r => ({ kind: r.kind, id: r.id, status: 'RETURNED' })) }), 409);
      });
      await f.changed('crewAssignment', { id: crew.id }, { status: 'REJECTED' }, async () => {
        const current = await preview(trip.id); assert.ok(current.roster.find(r => r.id === crew.id).historical); assert.equal(current.saved.sourceCurrent, false);
      });
    });
    await check('audit failure rolls back accountability, assistance incident and notifications atomically', async () => {
      const current = await preview(trip.id), input = command(current), requestId = input.requestId;
      input.entries[0].status = 'ASSISTANCE_REQUIRED'; const before = await snapshot(trip.id); const notices = await db.notification.count();
      assert.match(requestId, /^[a-f0-9-]{36}$/);
      await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT d04_return_audit_failure CHECK (("metadata"->>'requestId') IS DISTINCT FROM '${requestId}') NOT VALID`);
      try { denied(await call(f.centerOwner, endpoint(trip.id), 'POST', input), 500); assert.equal(await snapshot(trip.id), before); assert.equal(await db.notification.count(), notices); }
      finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT d04_return_audit_failure'); }
    });
    await check('evidenced transfer resolves accountability; attendance and stale revisions remain enforced', async () => {
      const current = await preview(trip.id), input = command(current, { entries: current.saved.entries.map(e => e.status === 'ASSISTANCE_REQUIRED' ? { ...e, status: 'TRANSFERRED', handoverReference: 'Synthetic recipient and handover reference, no real transfer' } : e) });
      const result = ok(await call(f.centerOwner, endpoint(trip.id), 'POST', input)); assert.equal(result.revision, 2); assert.equal(result.state, 'ACCOUNTED'); assert.equal(result.counts.transferred, 1);
      const evidence = await db.serializable(tx => requireReturn(tx, trip.id, [participants[0].id])); assert.equal(evidence.revision, 2);
      await db.serializable(tx => assert.rejects(() => requireReturn(tx, trip.id, participants.map(v => v.id)), /الحضور/));
      await rejectsUnchanged(trip.id, { ...input, requestId: randomUUID() }, 409);
      const audit = await db.auditEvent.findFirstOrThrow({ where: { resourceId: trip.id, action: 'TRIP_RETURN_RECORDED', metadata: { path: ['requestId'], equals: input.requestId } } });
      assert.equal(audit.metadata.previousRevision, 1); assert.ok(audit.metadata.previousEntries.some(e => e.status === 'ASSISTANCE_REQUIRED'));
    });
    await check('revoked account, role and membership deny preview and exact retries', async () => {
      await f.changed('organizationMember', { id: f.ownerMember.id }, { status: 'SUSPENDED' }, async () => { denied(await call(f.centerOwner, endpoint(trip.id)), 404); denied(await call(f.centerOwner, endpoint(trip.id), 'POST', assistance), 404); });
      await f.changed('roleAssignment', { accountId_role: { accountId: f.centerOwner.id, role: 'DIVE_CENTER' } }, { status: 'SUSPENDED' }, async () => { denied(await call(f.centerOwner, endpoint(trip.id)), 403); });
      await f.changed('account', { id: f.centerOwner.id }, { status: 'SUSPENDED' }, async () => { denied(await call(f.centerOwner, endpoint(trip.id)), [401, 403]); });
    });
    await check('a committed center-role revocation wins a real concurrent accountability write', async () => {
      const input = command(await preview(trip.id)), before = await snapshot(trip.id);
      const authority = await db.roleAssignment.findUniqueOrThrow({ where: { accountId_role: { accountId: f.centerOwner.id, role: 'DIVE_CENTER' } } });
      try {
        const response = await raceNativeLock('DIVE_CENTER', tx => tx.roleAssignment.update({ where: { id: authority.id }, data: { status: 'SUSPENDED' } }), () => call(f.centerOwner, endpoint(trip.id), 'POST', input));
        denied(response, 403); assert.equal(await snapshot(trip.id), before);
      } finally { await db.roleAssignment.update({ where: { id: authority.id }, data: { status: authority.status, updatedAt: authority.updatedAt } }); }
    });
    for (const actor of [f.creator, f.approver, f.signer]) await db.organizationMember.create({ data: { organizationId: f.center.id, accountId: actor.id, role: 'ADMIN', status: 'ACTIVE' } });
    const templates = {};
    for (const [code, keys] of [['SAF-CAPA', ['incidentNo', 'rootCause', 'correctiveAction']], ['SAF-EFFECTIVENESS-CLOSE', ['correctiveActionRef', 'verificationMethod', 'independentVerifierRef', 'closureDecisionRef']]]) templates[code] = ok(await call(f.creator, '/documents/templates', 'POST', {
      organizationId: f.center.id, code, titleAr: 'نموذج اصطناعي ' + code, titleEn: 'Synthetic D04 ' + code, department: 'SAFETY_COMPLIANCE_RISK', printable: true,
      fields: keys.map(key => ({ key, labelAr: key, labelEn: key, type: 'TEXT', required: true })) }));
    const nativeDocument = async (code, payload, creator = f.creator, approver = f.approver, organizationId = f.center.id, templateId = templates[code].id) => {
      const doc = ok(await call(creator, '/documents', 'POST', { organizationId, templateId, department: 'SAFETY_COMPLIANCE_RISK', contentHash: 'sha256:' + hash(payload), payload }));
      ok(await call(creator, '/documents/' + doc.id + '/submit', 'POST')); return ok(await call(approver, '/documents/' + doc.id + '/approve', 'POST'));
    };
    const packPin = doc => ({ documentId: doc.id, version: doc.version, contentHash: doc.contentHash });
    const incident = await report(trip.id), privateIncident = await report(trip.id, f.creator);
    const capa = await nativeDocument('SAF-CAPA', { incidentNo: incident.id, rootCause: 'Synthetic investigated cause', correctiveAction: 'Synthetic corrective action completed in fixture only' });
    const effectivenessPayload = { correctiveActionRef: capa.referenceNumber, verificationMethod: 'Synthetic independent observed verification', independentVerifierRef: 'Synthetic independent reviewer reference', closureDecisionRef: 'Synthetic closure evidence reference' };
    const effectiveness = await nativeDocument('SAF-EFFECTIVENESS-CLOSE', effectivenessPayload, f.signer, f.approver);
    const full = decision(incident, { capaRequired: true, capa: packPin(capa), effectiveness: packPin(effectiveness) }); delete full.applicabilityReason;
    await check('native independently approved source revisions appear in private closure context', async () => {
      const response = await call(f.reviewer, '/safety/incidents/admin/' + incident.id + '/closure-context'); const context = ok(response);
      assert.equal(response.headers['cache-control'], 'private, no-store'); assert.equal(context.incident.updatedAt, incident.updatedAt);
      assert.ok(context.candidates.some(c => c.documentId === capa.id)); assert.ok(context.candidates.some(c => c.documentId === effectiveness.id));
      denied(await call(f.centerOwner, '/safety/incidents/admin/' + incident.id + '/closure-context'), 403);
      assert.equal(await db.documentRevision.count({ where: { documentId: { in: [capa.id, effectiveness.id] } } }), 2);
      assert.equal(await db.documentLifecycleEvent.count({ where: { documentId: { in: [capa.id, effectiveness.id] }, action: 'APPROVED' } }), 2);
    });
    await check('free text cannot bypass applicability, source version, original incident or independent decision', async () => {
      const before = await currentIncident(incident.id);
      for (const body of [{ status: 'CLOSED', resolutionNotes: 'Legacy free text' }, { ...full, capaRequired: undefined }, { ...full, status: ['CLOSED'] },
        { ...full, capa: { ...full.capa, version: 2 } }, { ...full, effectiveness: { ...full.effectiveness, contentHash: '0'.repeat(64) } },
        { ...full, capa: { ...full.capa, documentId: randomUUID() } }, { ...full, capaRequired: false }]) denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', body), [400, 409]);
      denied(await call(f.centerOwner, incidentPath(incident.id), 'PATCH', full), 403);
      denied(await call(f.creator, incidentPath(privateIncident.id), 'PATCH', decision(privateIncident)), 403);
      denied(await call(f.reviewer, incidentPath(privateIncident.id), 'PATCH', { ...full, requestId: randomUUID(), expectedUpdatedAt: privateIncident.updatedAt }), 409);
      assert.deepEqual(await currentIncident(incident.id), before);
      await f.changed('managedDocument', { id: capa.id }, { status: 'DRAFT' }, async () => { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', full), 409); });
      await f.changed('documentTemplate', { id: templates['SAF-CAPA'].id }, { status: 'INACTIVE' }, async () => { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', full), 409); });
      await f.changed('managedDocument', { id: capa.id }, { payload: { ...capa.payload, rootCause: 'Altered without original revision' } }, async () => { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', full), 409); });
    });
    await check('effectiveness verifier cannot be the original corrective-action author', async () => {
      const dependent = await nativeDocument('SAF-EFFECTIVENESS-CLOSE', effectivenessPayload, f.signer, f.creator);
      denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', { ...full, effectiveness: packPin(dependent) }), 409);
    });
    await check('same document reference in another allowed organization cannot substitute effectiveness evidence', async () => {
      const platform = await db.organization.create({ data: { ownerId: f.outsider.id, kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', displayName: 'Synthetic D04 platform', legalName: 'Synthetic fixture only', registrationNumber: randomUUID(), address: 'Disposable loopback database' } });
      for (const actor of [f.creator, f.approver, f.signer]) await db.organizationMember.create({ data: { organizationId: platform.id, accountId: actor.id, role: 'ADMIN', status: 'ACTIVE' } });
      const otherTemplates = {};
      for (const [code, source] of Object.entries(templates)) otherTemplates[code] = ok(await call(f.creator, '/documents/templates', 'POST', { organizationId: platform.id, code, titleAr: 'اختبار جهة ثانية', titleEn: 'Synthetic other organization', department: 'SAFETY_COMPLIANCE_RISK', fields: source.fields }));
      const otherCapa = await nativeDocument('SAF-CAPA', { incidentNo: privateIncident.id, rootCause: 'Different synthetic incident', correctiveAction: 'Different synthetic corrective action' }, f.creator, f.approver, platform.id, otherTemplates['SAF-CAPA'].id);
      assert.equal(otherCapa.referenceNumber, capa.referenceNumber, 'References are deliberately identical across two native organization counters');
      const otherEffectiveness = await nativeDocument('SAF-EFFECTIVENESS-CLOSE', { ...effectivenessPayload, correctiveActionRef: otherCapa.referenceNumber }, f.signer, f.approver, platform.id, otherTemplates['SAF-EFFECTIVENESS-CLOSE'].id);
      const key = 'PLATFORM_STAFFING_ORGANIZATION:v1'; assert.equal(await db.operationalSetting.findUnique({ where: { key } }), null);
      await db.operationalSetting.create({ data: { key, value: { organizationId: platform.id } } });
      try { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', { ...full, effectiveness: packPin(otherEffectiveness) }), 409); }
      finally { await db.operationalSetting.delete({ where: { key } }); }
    });
    await check('closure and native audit roll back together on persistence failure', async () => {
      const input = { ...full, requestId: randomUUID() }, before = await currentIncident(incident.id);
      await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT d04_closure_audit_failure CHECK (("metadata"->>'requestId') IS DISTINCT FROM '${input.requestId}') NOT VALID`);
      try { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', input), 500); assert.deepEqual(await currentIncident(incident.id), before);
        assert.equal(await db.auditEvent.count({ where: { action: 'SAFETY_INCIDENT_STATUS_SET', resourceId: incident.id } }), 0); }
      finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT d04_closure_audit_failure'); }
    });
    await check('retiring a source template during closure blocks the decision before any commit', async () => {
      const template = await db.documentTemplate.findUniqueOrThrow({ where: { id: templates['SAF-CAPA'].id } }), before = await currentIncident(incident.id);
      try {
        const response = await raceNativeLock('DocumentTemplate', tx => tx.documentTemplate.update({ where: { id: template.id }, data: { status: 'INACTIVE' } }), () => call(f.reviewer, incidentPath(incident.id), 'PATCH', full));
        denied(response, 409); assert.deepEqual(await currentIncident(incident.id), before);
      } finally { await db.documentTemplate.update({ where: { id: template.id }, data: { status: template.status, updatedAt: template.updatedAt } }); }
    });
    await check('concurrent independently evidenced closure is exactly once and terminal', async () => {
      const responses = await Promise.all([call(f.reviewer, incidentPath(incident.id), 'PATCH', full), call(f.reviewer, incidentPath(incident.id), 'PATCH', full)]);
      responses.forEach(ok); assert.equal(responses[0].data.status, 'CLOSED'); assert.equal(responses[1].data.status, 'CLOSED');
      assert.equal(responses[0].data.closure.capa.sourceHash.length, 64); assert.equal(responses[0].data.closure.independentDecision, true);
      assert.equal(ok(await call(f.reviewer, incidentPath(incident.id), 'PATCH', full)).alreadyApplied, true);
      denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', { ...full, resolutionNotes: 'Different command meaning' }), 409);
      denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', decision(await currentIncident(incident.id))), 409);
      assert.equal(await db.auditEvent.count({ where: { action: 'SAFETY_INCIDENT_STATUS_SET', resourceId: incident.id } }), 1);
      await f.changed('roleAssignment', { accountId_role: { accountId: f.reviewer.id, role: 'ADMIN' } }, { status: 'SUSPENDED' }, async () => { denied(await call(f.reviewer, incidentPath(incident.id), 'PATCH', full), 403); });
    });
    await check('explicit independently recorded non-applicability is retained without invented source approvals', async () => {
      const input = decision(privateIncident); const result = ok(await call(f.reviewer, incidentPath(privateIncident.id), 'PATCH', input));
      assert.equal(result.closure.capaRequired, false); assert.equal(result.closure.applicabilityReason, input.applicabilityReason); assert.equal(result.closure.independentDecision, true);
    });
    await check('returned passengers and historical participants remain accounted without forcing dive attendance', async () => {
      const current = await preview(trip.id), input = command(current, { entries: current.saved.entries.map(e => ({ kind: e.kind, id: e.id, status: 'RETURNED' })) });
      ok(await call(f.centerOwner, endpoint(trip.id), 'POST', input));
      await db.serializable(tx => requireReturn(tx, trip.id, [participants[0].id]));
      await db.serializable(tx => requireReturn(tx, trip.id, []));
      assert.equal(await db.diveLog.count({ where: { sourceTripId: trip.id } }), 0);
      await f.changed('booking', { id: booking.id }, { status: 'CANCELLED' }, async () => {
        const changed = await preview(trip.id); ok(await call(f.centerOwner, endpoint(trip.id), 'POST', command(changed)));
        const evidence = await db.serializable(tx => requireReturn(tx, trip.id, [])); assert.equal(evidence.counts.total, 3);
        await db.serializable(tx => assert.rejects(() => requireReturn(tx, trip.id, [participants[0].id]), /الحضور/));
      });
      const restored = await preview(trip.id); ok(await call(f.centerOwner, endpoint(trip.id), 'POST', command(restored)));
    });
    await check('Incident Pack is read-only, digest-bound and private to reporter, operator and authorized administration', async () => {
      const before = await snapshot(trip.id), path = '/safety/incidents/' + incident.id + '/pack';
      const response = await call(f.reviewer, path), adminPack = ok(response); assert.equal(response.headers['cache-control'], 'private, no-store');
      const { contentDigest, generatedAt, ...content } = adminPack; assert.equal(contentDigest, hash(content)); assert.ok(generatedAt);
      assert.equal(adminPack.protocol, 'HYDROLAND_INCIDENT_PACK_V1'); assert.equal(adminPack.scope, 'AUTHORIZED_ADMIN'); assert.equal(adminPack.closure.capa.documentId, capa.id);
      assert.equal(adminPack.returnEvidence.persons.length, 3); assert.equal(adminPack.externalDistressSent, false); assert.equal(adminPack.externalTransmission, 'NOT_IMPLEMENTED'); assert.equal(adminPack.operationalAuthority, false);
      const operatorPack = ok(await call(f.centerOwner, path)); assert.equal(operatorPack.scope, 'TRIP_OPERATOR'); assert.equal(operatorPack.incident.description, null); assert.equal(operatorPack.incident.resolutionNotes, null);
      assert.equal(operatorPack.returnEvidence.persons.length, 3); assert.doesNotMatch(JSON.stringify(operatorPack), /PRIVATE_|reportedByAccountId|resolvedByAccountId|identitySnapshot|accountId/);
      const reporterPack = ok(await call(f.participant, path)); assert.equal(reporterPack.scope, 'REPORTER'); assert.equal(reporterPack.incident.description, 'PRIVATE_REPORTER_NARRATIVE_D04'); assert.equal(reporterPack.incident.resolutionNotes, null); assert.equal(reporterPack.returnEvidence, null); assert.deepEqual(reporterPack.trip, { id: trip.id });
      denied(await call(f.outsider, path), 404); denied(await call(f.viewer, path), 404); denied(await call(null, path), 401);
      assert.equal(await snapshot(trip.id), before); assert.equal(f.externalAttempts.length, 0); assert.equal((await currentIncident(assistanceId)).status, 'OPEN');
    });
    await check('self-reporting on a foreign trip never grants access to its return or operational data', async () => {
      const outsiderReport = await report(trip.id, f.outsider);
      const pack = ok(await call(f.outsider, '/safety/incidents/' + outsiderReport.id + '/pack'));
      assert.equal(pack.scope, 'REPORTER'); assert.equal(pack.returnEvidence, null); assert.deepEqual(pack.trip, { id: trip.id });
      assert.equal(pack.incident.description, 'PRIVATE_REPORTER_NARRATIVE_D04'); assert.doesNotMatch(JSON.stringify(pack), /Synthetic return participant|assistanceRequired|confirmedSeats|startsAt|endsAt|sourceCurrent/);
    });
    success = true;
  } finally {
    const version = await db.$queryRaw`SELECT version() AS version`;
    const receipt = { protocol: 'D04_TRIP_RETURN_INCIDENT_ACCEPTANCE_V1', generatedAt: new Date().toISOString(), passed: checks.length, failed: success ? 0 : 1,
      nodeVersion: process.version, databaseVersion: version[0].version, commit: process.env.GITHUB_SHA || null, checks, synthetic: true, realOperationalAcceptance: false,
      externalDistressSent: false, externalHttpAttempts: f.externalAttempts.length, originalParticipationGatePreserved: true,
      originalSafetyAndClearanceGatePreserved: true, originalAppendOnlyAuditPreserved: true };
    const target = resolve(process.env.D04_ACCEPTANCE_OUTPUT || 'artifacts/d04-trip-return-incident-acceptance.json'); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ d04: success ? 'PASS' : 'FAIL', checks: checks.length, receipt: target })); await f.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
