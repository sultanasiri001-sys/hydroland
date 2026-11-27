const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {writeFileSync, mkdirSync} = require('node:fs');
const {dirname} = require('node:path');
const {openFixture} = require('./c06-campaign-lifecycle-fixture.cjs');

(async () => {
  const results = [], startedAt = new Date().toISOString(); let f;
  const group = async (name, run) => {await run(); results.push({name, status: 'PASS'}); console.log(`PASS ${results.length}: ${name}`);};
  const receipt = {schemaVersion: 1, policy: 'C06_NATIVE_CAMPAIGN_ACCEPTANCE_V1', startedAt, status: 'FAIL', passed: 0, failed: 0, skipped: 0, results,
    syntheticOnly: true, realOwnerApproval: false, realRightsVerified: false, realBudgetApproved: false, externalPublicationExecuted: false, spendExecuted: false, providerVerified: false, externalHttpRequests: 0};
  try {
    f = await openFixture();
    const {db, actors, org, otherFinance, root, path, call, ok, denied, detail, sources, makeCampaign, makeSources, prepareInput, prepare, command, decide, makeReady, makeEvidence, snapshot} = f;
    const owner = actors.owner;
    let main, original, prepared, approved, originalPrepare;
    await group('owner-only readonly campaign workspace retains the original planning draft', async () => {
      main = await makeCampaign('primary');
      const before = await snapshot(), response = await call(owner, path(main.id));
      assert.match(response.cache, /no-store/); const view = ok(response);
      assert.equal(view.lifecycle, null); assert.equal(view.readiness.ready, false); assert.equal(view.publication.status, 'PENDING_CHANNEL');
      assert.equal(view.measurements.aggregate, null); assert.equal(view.measurements.roi, null); assert.equal(view.spend.amountMinor, null);
      await sources(main.id); assert.equal(await snapshot(), before);
    });
    await group('non-owner ADMIN, staff, viewer and missing sessions have no campaign lifecycle access', async () => {
      const before = await snapshot();
      denied(await call(null, path(main.id)), 401);
      for (const actor of [actors.outsider, actors.reviewer, actors.viewer]) {
        denied(await call(actor, path(main.id)), [401, 403]); denied(await call(actor, path(main.id) + '/sources'), [401, 403]);
        denied(await call(actor, root + '/lifecycle/templates/install', 'POST', {}), [401, 403]);
      }
      assert.equal(await snapshot(), before);
    });
    await group('explicit native template installation is idempotent and never grants rights or budget', async () => {
      const before = await db.documentTemplate.count(), audit = await db.auditEvent.count({where: {action: 'MARKETING_CAMPAIGN_TEMPLATE_INSTALLED'}});
      ok(await call(owner, root + '/lifecycle/templates/install', 'POST', {}));
      assert.equal(await db.documentTemplate.count(), before); assert.equal(await db.auditEvent.count({where: {action: 'MARKETING_CAMPAIGN_TEMPLATE_INSTALLED'}}), audit);
      assert.equal((await detail(main.id)).readiness.ready, false);
    });
    await group('native approved unsigned sources prepare explicit USD budget and tax without a new signature requirement', async () => {
      original = await makeSources(main);
      assert.equal(original.rights.document.status, 'APPROVED'); assert.equal(original.budget.document.status, 'APPROVED');
      assert.equal(original.rights.document.signedByAccountId, null);
      originalPrepare = await prepareInput(main, original); prepared = ok(await call(owner, path(main.id) + '/prepare', 'POST', originalPrepare));
      assert.equal(prepared.lifecycle.status, 'PREPARED'); assert.equal(prepared.readiness.ready, false); assert.equal(prepared.readiness.canApprove, true);
      assert.equal(prepared.lifecycle.budget.currency, 'USD'); assert.equal(prepared.lifecycle.budget.amountMinor, 12000); assert.equal(prepared.lifecycle.budget.taxMinor, 1200);
      assert.equal(prepared.lifecycle.budget.taxBasis, 'TAX_INCLUDED'); assert.equal(prepared.lifecycle.decision, null);
    });
    await group('actual authenticated owner decision binds current preparation; no publication or spend is executed', async () => {
      const entries = await db.financeEntry.count();
      approved = await decide(prepared); assert.equal(approved.lifecycle.status, 'APPROVED'); assert.equal(approved.readiness.ready, true);
      assert.equal(approved.lifecycle.decision.actorAccountId, owner.id); assert.equal(approved.lifecycle.decision.actorPersonId, owner.personId);
      assert.equal(approved.publication.channelConnection, 'NOT_CONNECTED'); assert.equal(approved.publication.externalAuthorization, 'REQUESTED_NOT_GRANTED');
      assert.equal(approved.publication.providerVerified, false); assert.equal(approved.publication.status, 'PENDING_CHANNEL'); assert.equal(approved.spend.executed, false);
      assert.equal(await db.financeEntry.count(), entries);
    });
    const primaryDraftFingerprint = f.sha(await db.marketingCampaignDraft.findUniqueOrThrow({where: {id: main.id}, include: {revisions: {orderBy: {revision: 'asc'}}}}));
    await group('same request replay is read-only; changed content with that request key conflicts', async () => {
      const before = await snapshot(); const replay = ok(await call(owner, path(main.id) + '/prepare', 'POST', originalPrepare));
      assert.equal(replay.replayed, true); assert.equal(replay.lifecycle.status, 'APPROVED'); assert.equal(await snapshot(), before);
      denied(await call(owner, path(main.id) + '/prepare', 'POST', {...originalPrepare, recommendation: 'Different synthetic content'}), 409);
      assert.equal(await snapshot(), before);
    });
    await group('stale revision, digest, readiness and implicit confirmation cannot change a campaign', async () => {
      const campaign = await makeCampaign('stale guards'), original = await makeSources(campaign), view = await prepare(campaign, original);
      const good = {...command(view), expectedReadinessHash: view.readiness.hash, decision: 'APPROVE', note: 'Synthetic bounded decision', confirmed: true};
      const before = await snapshot();
      for (const patch of [{expectedRevision: 0}, {expectedDigest: 'f'.repeat(64)}, {expectedReadinessHash: 'e'.repeat(64)}, {confirmed: false}, {expectedRevision: '1'}, {decision: ['APPROVE']}, {unexpected: true}]) {
        denied(await call(owner, path(campaign.id) + '/decision', 'POST', {...good, requestId: randomUUID(), ...patch}), [400, 409]);
      }
      assert.equal(await snapshot(), before);
    });
    await group('exact numeric limits, explicit zero budget and native source schemas reject ambiguity', async () => {
      const domain = f.load('marketing/campaign-lifecycle.domain.js'), good = original.budget.payload;
      assert.equal(domain.campaignBudget({...good, amountMinor: 2147483647, taxMinor: 1}).amountMinor, 2147483647);
      assert.equal(domain.campaignBudget({...good, amountMinor: 0, taxMinor: 0, taxBasis: 'NO_SPEND'}).amountMinor, 0);
      for (const patch of [{amountMinor: 2147483648}, {amountMinor: 1.5}, {amountMinor: -1}, {amountMinor: '1e3'}, {taxMinor: 12001}, {taxMinor: -1}, {taxMinor: 0}, {taxBasis: ['EXEMPT']}, {currency: ['USD']}, {currency: 'usd'}, {amountMinor: 0, taxMinor: 0, taxBasis: 'EXEMPT'}, {unknown: 'private'}]) assert.throws(() => domain.campaignBudget({...good, ...patch}));
      assert.throws(() => domain.campaignRights({...original.rights.payload, channelScope: [{channel: 'WEB'}, {channel: 'WEB'}]}));
      assert.throws(() => domain.campaignRights({...original.rights.payload, validUntil: '2026-02-31T00:00:00.000Z'}));
      assert.throws(() => domain.campaignRights({...original.rights.payload, contentPermissionReference: ''}));
      const zero = await makeReady('explicit zero budget', {budget: {amountMinor: 0, taxMinor: 0, taxBasis: 'NO_SPEND'}});
      assert.equal(zero.view.readiness.ready, true); assert.equal(zero.view.lifecycle.budget.amountMinor, 0); assert.equal(zero.view.spend.amountMinor, null);
    });
    await group('foreign organization accounts and mismatched source campaign scope cannot prepare a lifecycle', async () => {
      const campaign = await makeCampaign('scope'), bad = await makeSources(campaign, {budget: {financeAccountId: otherFinance.id}});
      const options = await sources(campaign.id); assert.equal(options.documents.budgets.find(x => x.id === bad.budget.document.id).eligible, false);
      const before = await snapshot();
      denied(await call(owner, path(campaign.id) + '/prepare', 'POST', {...originalPrepare, requestId: randomUUID(), expectedRevision: 0, expectedDigest: null, expectedDraftRevision: campaign.revision, expectedDraftDigest: campaign.recordDigest}), 409);
      denied(await call(owner, path(randomUUID())), 404);
      assert.equal(await snapshot(), before);
    });
    await group('native signed optional sources bind their actual signer and original PDF bytes', async () => {
      const signed = await makeReady('signed original', {rightsOptions: {signed: true, pdf: true}});
      assert.equal(signed.original.rights.document.status, 'SIGNED'); assert.equal(signed.view.readiness.ready, true);
      const attachment = await db.managedDocumentAttachment.findUniqueOrThrow({where: {id: signed.original.rights.attachment.id}});
      await db.managedDocumentAttachment.update({where: {id: attachment.id}, data: {content: Buffer.from('%PDF-CORRUPTED-SYNTHETIC')}});
      const before = await snapshot(), stale = await detail(signed.campaign.id); assert.equal(stale.readiness.ready, false); assert.equal(await snapshot(), before);
      await db.managedDocumentAttachment.update({where: {id: attachment.id}, data: {content: attachment.content}});
      assert.equal((await detail(signed.campaign.id)).readiness.ready, true);
    });
    await group('readiness expires at the source boundary without rewriting the prior owner approval', async () => {
      const expiring = await makeReady('expiry', {rights: {validUntil: new Date(Date.now() + 60000).toISOString()}});
      const before = await snapshot(), clock = Date.now;
      try {Date.now = () => clock() + 120000; const view = await detail(expiring.campaign.id); assert.equal(view.readiness.ready, false); assert.ok(view.readiness.reasonCodes.includes('SOURCE_EXPIRED'));}
      finally {Date.now = clock;}
      assert.equal(await snapshot(), before); assert.equal((await detail(expiring.campaign.id)).readiness.ready, true);
    });
    await group('explicit native review revocation removes current source readiness while preserving signed history', async () => {
      const target = await makeReady('native revocation');
      const key = `INTERNAL_DOCUMENT_REVIEW:v1:${org.id}:${target.original.rights.document.id}`;
      const grant = await db.operationalSetting.findUniqueOrThrow({where: {key}});
      ok(await call(owner, `/document-reviews/organizations/${org.id}/documents/${target.original.rights.document.id}/revoke`, 'POST', {expectedRevision: grant.value.revision, reason: 'Synthetic actual source delegation revoked', confirmed: true}));
      const before = await snapshot(), view = await detail(target.campaign.id);
      assert.equal(view.readiness.ready, false); assert.equal(view.lifecycle.status, 'APPROVED'); assert.equal(await snapshot(), before);
      assert.equal((await db.managedDocument.findUniqueOrThrow({where: {id: target.original.rights.document.id}})).status, 'APPROVED');
    });
    await group('reviewer role loss and ordinary reactivation do not revive the old source authority', async () => {
      const previous = await db.roleAssignment.findUniqueOrThrow({where: {accountId_role: {accountId: actors.reviewer.id, role: 'STAFF'}}});
      try {
        await db.roleAssignment.update({where: {id: previous.id}, data: {status: 'SUSPENDED'}});
        const before = await snapshot(); assert.equal((await detail(main.id)).readiness.ready, false); assert.equal(await snapshot(), before);
        await db.roleAssignment.update({where: {id: previous.id}, data: {status: 'ACTIVE'}});
        assert.equal((await detail(main.id)).readiness.ready, false);
      } finally {await db.roleAssignment.update({where: {id: previous.id}, data: {status: previous.status, updatedAt: previous.updatedAt}});}
      assert.equal((await detail(main.id)).readiness.ready, true);
    });
    await group('current owner replacement is rechecked with the existing session and invalidates old preparation', async () => {
      const previous = await db.organization.findUniqueOrThrow({where: {id: org.id}});
      try {
        await db.organization.update({where: {id: org.id}, data: {ownerId: actors.outsider.id}});
        denied(await call(owner, path(main.id)), 403);
        const before = await snapshot(), view = ok(await call(actors.outsider, path(main.id)));
        assert.equal(view.readiness.ready, false); assert.ok(view.readiness.reasonCodes.includes('OWNER_AUTHORITY_CHANGED')); assert.equal(await snapshot(), before);
      } finally {await db.organization.update({where: {id: org.id}, data: {ownerId: previous.ownerId, updatedAt: previous.updatedAt}});}
    });
    await group('native approved sources resist editing and detected payload drift cannot preserve readiness', async () => {
      const target = await makeReady('source revision'), doc = target.original.rights.document;
      denied(await call(owner, `/documents/${doc.id}/revise`, 'POST', {contentHash: 'sha256:' + f.sha('Synthetic revised rights'), payload: {...target.original.rights.payload, restrictions: 'Changed synthetic source restriction'}}), [400, 409]);
      const saved = await db.managedDocument.findUniqueOrThrow({where: {id: doc.id}});
      await db.managedDocument.update({where: {id: doc.id}, data: {payload: {...target.original.rights.payload, restrictions: 'SYNTHETIC CORRUPTION FAULT INJECTION'}}});
      const before = await snapshot(), view = await detail(target.campaign.id);
      assert.equal(view.readiness.ready, false); assert.equal(view.lifecycle.rights.version, 1); assert.equal(await snapshot(), before);
      await db.managedDocument.update({where: {id: doc.id}, data: {payload: saved.payload, updatedAt: saved.updatedAt}});
      assert.equal((await detail(target.campaign.id)).readiness.ready, true);
    });
    await group('editing the original draft invalidates preparation without touching old draft history digests', async () => {
      const target = await makeReady('draft revision'), oldHistory = await db.marketingCampaignDraftRevision.findMany({where: {campaignDraftId: target.campaign.id}, orderBy: {revision: 'asc'}});
      const edited = ok(await call(owner, root + '/' + target.campaign.id, 'PATCH', {expectedRevision: target.campaign.revision, title: 'Updated synthetic campaign', objective: target.campaign.objective, channels: target.campaign.channels, reason: 'Synthetic original planning revision'}));
      assert.equal(edited.record.revision, 2); const view = await detail(target.campaign.id);
      assert.equal(view.readiness.ready, false); assert.ok(view.readiness.reasonCodes.includes('DRAFT_CHANGED'));
      assert.deepEqual(await db.marketingCampaignDraftRevision.findMany({where: {campaignDraftId: target.campaign.id, revision: 1}, orderBy: {revision: 'asc'}}), oldHistory);
    });
    await group('concurrent identical preparation is idempotent and competing owner decisions have one winner', async () => {
      const campaign = await makeCampaign('concurrency'), original = await makeSources(campaign), input = await prepareInput(campaign, original);
      const responses = await Promise.all([call(owner, path(campaign.id) + '/prepare', 'POST', input), call(owner, path(campaign.id) + '/prepare', 'POST', input)]);
      const views = responses.map(ok); assert.equal(views.filter(v => v.replayed).length, 1);
      assert.equal(await db.marketingCampaignLifecycleEvent.count({where: {campaignDraftId: campaign.id}}), 1);
      const view = await detail(campaign.id), decision = {...command(view), expectedReadinessHash: view.readiness.hash, decision: 'APPROVE', note: 'Synthetic simultaneous owner decision', confirmed: true};
      const decided = await Promise.all([call(owner, path(campaign.id) + '/decision', 'POST', decision), call(owner, path(campaign.id) + '/decision', 'POST', {...decision, requestId: randomUUID()})]);
      assert.equal(decided.filter(r => r.status >= 200 && r.status < 300).length, 1); assert.equal(decided.filter(r => r.status === 409).length, 1);
      assert.equal(await db.marketingCampaignLifecycleEvent.count({where: {campaignDraftId: campaign.id, action: 'APPROVE'}}), 1);
    });
    await group('decline and explicit revocation preserve decisions without implying permission to publish', async () => {
      const campaign = await makeCampaign('decline'), original = await makeSources(campaign), rejected = await decide(await prepare(campaign, original), 'DECLINE');
      assert.equal(rejected.lifecycle.status, 'DECLINED'); assert.equal(rejected.readiness.ready, false);
      const target = await makeReady('revoke'), input = {...command(target.view), reason: 'Synthetic actual owner revocation', confirmed: true};
      const revoked = ok(await call(owner, path(target.campaign.id) + '/revoke', 'POST', input));
      assert.equal(revoked.lifecycle.status, 'REVOKED'); assert.equal(revoked.readiness.ready, false); assert.equal(revoked.lifecycle.decision.status, 'APPROVED');
      const before = await snapshot(); assert.equal(ok(await call(owner, path(target.campaign.id) + '/revoke', 'POST', input)).replayed, true); assert.equal(await snapshot(), before);
    });
    let publication, measurement, overlap, observed;
    await group('original owner-recorded publication remains distinct from an unconnected provider', async () => {
      // A valid generic document may use a prefixed hash, while the original
      // evidence contract requires bare SHA256. Reject before persisting an
      // unreadable evidence row; do not relax its existing validator/SQL guard.
      const incompatible = await f.makeDocument('C06-SYNTHETIC-FACT-PROOF', {note: 'Synthetic generic document with incompatible evidence hash'});
      assert.match(incompatible.document.contentHash, /^sha256:[a-f0-9]{64}$/);
      const evidenceState = async () => JSON.stringify(await Promise.all([
        db.operationalEvidence.findMany({orderBy: {id: 'asc'}}), db.operationalEvidenceRevision.findMany({orderBy: {id: 'asc'}}),
        db.auditEvent.findMany({where: {resource: 'OperationalEvidence'}, orderBy: {id: 'asc'}}),
      ]));
      const beforeEvidence = await evidenceState();
      denied(await call(owner, '/admin/operational-evidence', 'POST', {requestKey: randomUUID(), kind: 'CAMPAIGN_PUBLICATION', reference: 'SYN-C06-INCOMPATIBLE-' + randomUUID(), occurredAt: new Date().toISOString(), proofDocumentId: incompatible.document.id, details: {campaignDraftId: main.id, channel: 'WEB', publicationReference: 'Synthetic source boundary only'}}), 409);
      assert.equal(await evidenceState(), beforeEvidence);
      publication = await makeEvidence(main, 'CAMPAIGN_PUBLICATION', {channel: 'WEB', publicationReference: 'https://synthetic-c06.example.invalid/owner-observed'});
      const unpublished = await detail(main.id); assert.equal(unpublished.publication.status, 'PENDING_CHANNEL');
      const input = {...command(unpublished), evidenceIds: [publication.id], reason: 'Explicit synthetic original publication binding', confirmed: true};
      observed = ok(await call(owner, path(main.id) + '/evidence', 'POST', input));
      assert.equal(observed.readiness.ready, true); assert.equal(observed.publication.status, 'OWNER_RECORDED'); assert.equal(observed.publication.channelConnection, 'NOT_CONNECTED');
      assert.equal(observed.publication.providerVerified, false); assert.equal(observed.publication.ownerRecordedPublication[0].provenance, 'OWNER_RECORDED');
      assert.equal(observed.measurements.aggregate, null); assert.equal(observed.measurements.windows.length, 0);
    });
    await group('actual analytics windows preserve explicit zeros, flag overlap and never invent aggregate or ROI', async () => {
      const start = publication.view.record.occurredAt, end = new Date().toISOString();
      measurement = await makeEvidence(main, 'CAMPAIGN_ANALYTICS', {publicationEvidenceId: publication.id, windowStart: start, windowEnd: end, impressions: 0, clicks: 0, conversions: 0});
      overlap = await makeEvidence(main, 'CAMPAIGN_ANALYTICS', {publicationEvidenceId: publication.id, windowStart: start, windowEnd: new Date().toISOString(), impressions: 100, clicks: 7, conversions: 2});
      const current = await detail(main.id), input = {...command(current), evidenceIds: [publication.id, measurement.id, overlap.id], reason: 'Explicit synthetic original analytics bindings', confirmed: true};
      observed = ok(await call(owner, path(main.id) + '/evidence', 'POST', input));
      assert.equal(observed.measurements.windows.length, 2); assert.equal(observed.measurements.windows.find(w => w.evidenceId === measurement.id).impressions, 0);
      assert.equal(observed.measurements.overlaps.length, 1); assert.equal(observed.measurements.aggregate, null); assert.equal(observed.measurements.roi, null); assert.equal(observed.spend.amountMinor, null);
      assert.ok(observed.measurements.reasonCodes.includes('OVERLAPPING_WINDOWS_NOT_SUMMED'));
    });
    await group('evidence bindings require the original publication, unique IDs and the current campaign scope', async () => {
      const before = await snapshot(), current = await detail(main.id), input = {...command(current), reason: 'Synthetic invalid binding', confirmed: true};
      denied(await call(owner, path(main.id) + '/evidence', 'POST', {...input, evidenceIds: [measurement.id]}), 409);
      denied(await call(owner, path(main.id) + '/evidence', 'POST', {...input, requestId: randomUUID(), evidenceIds: [publication.id, publication.id]}), 400);
      const foreign = await makeCampaign('foreign evidence target');
      denied(await call(owner, path(foreign.id) + '/evidence', 'POST', {...input, requestId: randomUUID(), expectedRevision: 0, expectedDigest: null, evidenceIds: [publication.id]}), 409);
      assert.equal((await detail(main.id)).lifecycle.recordDigest, current.lifecycle.recordDigest);
      assert.equal(await db.marketingCampaignLifecycleEvent.count({where: {campaignDraftId: main.id}}), observed.history.length);
      assert.ok(before.length > 0);
    });
    await group('archived original publication invalidates dependent analytics on read without audit writes', async () => {
      const native = ok(await call(owner, '/admin/operational-evidence/' + publication.id));
      ok(await call(owner, '/admin/operational-evidence/' + publication.id + '/archive', 'POST', {expectedRevision: native.record.revision, confirmed: true, reason: 'Synthetic source observation withdrawn'}));
      const before = await snapshot(), view = await detail(main.id); assert.equal(view.readiness.ready, false); assert.equal(view.measurements.windows.length, 0); assert.equal(view.publication.status, 'PENDING_CHANNEL'); assert.equal(await snapshot(), before);
      assert.equal(view.capabilities.bindEvidence, true);
      const repaired = ok(await call(owner, path(main.id) + '/evidence', 'POST', {...command(view), evidenceIds: [], reason: 'Remove current invalid links; immutable prior evidence remains', confirmed: true}));
      assert.equal(repaired.readiness.ready, true); assert.equal(repaired.measurements.aggregate, null); assert.ok(repaired.history.length > observed.history.length);
    });
    await group('audit insertion failure rolls back owner decision, lifecycle row and new event atomically', async () => {
      const campaign = await makeCampaign('audit rollback'), original = await makeSources(campaign), view = await prepare(campaign, original);
      const suffix = randomUUID().replaceAll('-', ''), functionName = 'c06_test_audit_fail_' + suffix, triggerName = 'c06_test_audit_trigger_' + suffix;
      await db.$executeRawUnsafe(`CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."action"='MARKETING_CAMPAIGN_APPROVE' THEN RAISE EXCEPTION 'Synthetic C06 audit failure'; END IF; RETURN NEW; END $$`);
      try {
        await db.$executeRawUnsafe(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`);
        const before = await snapshot(); const failed = await call(owner, path(campaign.id) + '/decision', 'POST', {...command(view), expectedReadinessHash: view.readiness.hash, decision: 'APPROVE', note: 'Synthetic rollback proof', confirmed: true});
        denied(failed, 500); assert.equal(await snapshot(), before); assert.ok(!JSON.stringify(failed.data).includes(functionName));
      } finally {await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "AuditEvent"`); await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);}
      assert.equal((await decide(await detail(campaign.id))).readiness.ready, true);
    });
    await group('native event history rejects UPDATE DELETE and TRUNCATE without disabling original guards', async () => {
      const before = await snapshot();
      for (const query of ['UPDATE "MarketingCampaignLifecycleEvent" SET "reason"="reason"', 'DELETE FROM "MarketingCampaignLifecycleEvent"', 'TRUNCATE TABLE "MarketingCampaignLifecycleEvent"']) {
        await assert.rejects(db.$executeRawUnsafe(query), e => e?.code === 'P2010' && e?.meta?.code === '55000');
      }
      assert.equal(await snapshot(), before);
    });
    await group('final readonly checks preserve original draft digests, unavailable metrics and zero external effects', async () => {
      assert.equal(f.sha(await db.marketingCampaignDraft.findUniqueOrThrow({where: {id: main.id}, include: {revisions: {orderBy: {revision: 'asc'}}}})), primaryDraftFingerprint);
      const before = await snapshot(); await detail(main.id); await sources(main.id); assert.equal(await snapshot(), before);
      assert.equal(await db.financeEntry.count(), 0); assert.deepEqual(f.externalAttempts, []);
      const nativeVersion = await db.$queryRaw`SELECT version() AS version`;
      receipt.databaseVersion = nativeVersion[0].version; receipt.nodeVersion = process.version;
      receipt.persisted = {campaigns: await db.marketingCampaignDraft.count(), lifecycles: await db.marketingCampaignLifecycle.count(), lifecycleEvents: await db.marketingCampaignLifecycleEvent.count(), operationalEvidence: await db.operationalEvidence.count(), sourceDocuments: await db.managedDocument.count(), financeEntries: await db.financeEntry.count()};
    });
    receipt.status = 'PASS'; receipt.passed = results.length;
  } catch (error) {
    receipt.failed = 1; receipt.error = String(error?.stack || error); console.error(error); process.exitCode = 1;
  } finally {
    if (f) await f.close();
    receipt.finishedAt = new Date().toISOString(); receipt.passed = results.length;
    if (process.env.C06_EVIDENCE_FILE) {mkdirSync(dirname(process.env.C06_EVIDENCE_FILE), {recursive: true}); writeFileSync(process.env.C06_EVIDENCE_FILE, JSON.stringify(receipt, null, 2));}
    console.log(`C06 native campaign lifecycle ${receipt.status}: ${receipt.passed} passed, ${receipt.failed} failed, ${receipt.skipped} skipped. Synthetic records only.`);
  }
})();
