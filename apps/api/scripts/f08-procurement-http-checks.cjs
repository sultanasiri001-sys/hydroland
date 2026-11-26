// Independent F08 acceptance against the compiled Nest API and real PostgreSQL.
// All actors, documents, invoices and money proofs are explicitly synthetic.
// Successful evidence remains in this disposable DB for native backup/restore.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {mkdirSync, writeFileSync} = require('node:fs');
const {dirname} = require('node:path');
const {openFixture} = require('./f08-procurement-fixture.cjs');

(async () => {
  const startedAt = new Date().toISOString(), checks = [];
  let f, success = false, retained;
  const test = async (name, run) => {
    const start = Date.now();
    try {await run(); checks.push({name, status: 'PASS', durationMs: Date.now() - start}); console.log('F08 PASS ' + name);}
    catch (error) {checks.push({name, status: 'FAIL', durationMs: Date.now() - start, message: error.message}); throw error;}
  };
  try {
    f = await openFixture();
    const {db, org, other, outsider, call, ok, denied, noEffects, prefix, workspace, install, makeDocument, makeSupplier, makeContract, makeEvidence, documentRef} = f;
    const read = async (order, actor = org.actors.owner, organization = org) => ok(await call(actor, `${prefix(organization)}/orders/${typeof order === 'string' ? order : order.id}`));
    const creation = contract => ({requestId: randomUUID(), contractDocumentId: contract.document.id, contractVersion: contract.document.version, contractHash: contract.ref.documentHash});
    const create = async (overrides = {}, organization = org) => {
      const contract = await makeContract(organization, overrides);
      const body = creation(contract);
      const order = ok(await call(organization.actors.maker, prefix(organization) + '/orders', 'POST', body));
      return {order, contract, body, organization};
    };
    const envelope = order => ({requestId: randomUUID(), expectedRevision: order.revision, expectedDigest: order.digest});
    const mutate = async (order, action, actor, fields = {}, organization = org, supplied) => {
      const live = supplied || await read(order, organization.actors.owner, organization);
      return call(actor, `${prefix(organization)}/orders/${live.id}/${action}`, 'POST', {...envelope(live), ...fields});
    };
    const act = async (order, action, actor, fields = {}, organization = org) => ok(await mutate(order, action, actor, fields, organization));
    const approved = async (item = null) => {
      item ||= await create();
      await act(item.order, 'recommend', item.organization.actors.recommender, {decision: 'APPROVE', note: 'Synthetic independent recommendation'}, item.organization);
      item.order = await act(item.order, 'approve', item.organization.actors.owner, {decision: 'APPROVE', note: 'Synthetic current owner approval'}, item.organization);
      return item;
    };
    const invoice = async (item, overrides = {}, options = {}) => {
      const proof = await makeEvidence(item.organization, item.order, 'INVOICE', {currency: 'SAR', amountMinor: item.contract.payload.totalMinor, lines: item.contract.payload.lines, ...overrides}, options);
      return {proof, response: await mutate(item.order, 'invoice', item.organization.actors.accountant, proof.ref, item.organization)};
    };
    const receipt = async (item, quantities, overrides = {}, options = {}) => {
      const proof = await makeEvidence(item.organization, item.order, 'RECEIPT', {quantities, ...overrides}, options);
      return {proof, response: await mutate(item.order, 'receipts', item.organization.actors.receiver, proof.ref, item.organization)};
    };
    const allQuantities = item => item.contract.payload.lines.map(line => ({lineId: line.lineId, quantity: line.quantity}));
    const prove = async (item, kind, action, actor, overrides = {}, options = {}) => {
      const live = await read(item.order, item.organization.actors.owner, item.organization);
      const proof = await makeEvidence(item.organization, live, kind, overrides, options);
      return {proof, response: await mutate(live, action, actor, proof.ref, item.organization)};
    };
    const changed = async (model, where, update, run) => {
      const previous = await db[model].findUniqueOrThrow({where});
      const restore = Object.fromEntries(Object.keys(update).map(key => [key, previous[key]]));
      if ('updatedAt' in previous) restore.updatedAt = previous.updatedAt;
      await db[model].update({where, data: update});
      try {return await run();} finally {await db[model].update({where, data: restore});}
    };
    const fullState = async () => JSON.stringify({domain: await f.snapshot(), sources: await Promise.all([
      db.managedDocument.findMany({orderBy: {id: 'asc'}}), db.documentRevision.findMany({orderBy: {id: 'asc'}}),
      db.documentLifecycleEvent.findMany({orderBy: {id: 'asc'}}), db.managedDocumentAttachment.findMany({orderBy: {id: 'asc'}}),
      db.documentTemplate.findMany({orderBy: {id: 'asc'}}),
    ])});

    await test('read-only initial workspace creates no templates, orders or financial effects', async () => {
      const before = await fullState();
      await workspace(); await workspace(); await workspace(other);
      assert.equal(await fullState(), before);
    });
    await test('explicit template install and native signed supplier sources are organization scoped', async () => {
      await install(org); await install(other);
      org.supplier = await makeSupplier(org); other.supplier = await makeSupplier(other);
      const counts = await db.documentTemplate.count();
      await install(org); assert.equal(await db.documentTemplate.count(), counts);
      assert.notEqual(org.supplier.ref.documentHash, other.supplier.ref.documentHash);
      denied(await call(other.actors.owner, `/documents/${org.supplier.document.id}`), 403);
    });
    await test('native document lifecycle rejects creator approval and approver signature', async () => {
      const template = org.templates.get('F08-PROCUREMENT-SUPPLIER-V1');
      const payload = {...org.supplier.payload, supplierRef: 'SYN-INDEPENDENCE-' + randomUUID()};
      let document = ok(await call(org.actors.documentApprover, '/documents', 'POST', {organizationId: org.id, templateId: template.id, department: template.department, contentHash: 'sha256:' + f.sha(payload), payload}));
      ok(await call(org.actors.documentApprover, `/documents/${document.id}/submit`, 'POST', {}));
      denied(await call(org.actors.documentApprover, `/documents/${document.id}/approve`, 'POST', {}), 400);
      ok(await call(org.actors.documentSigner, `/documents/${document.id}/approve`, 'POST', {}));
      denied(await call(org.actors.documentSigner, `/documents/${document.id}/sign`, 'POST', {}), 400);
      document = ok(await call(org.actors.owner, `/documents/${document.id}/sign`, 'POST', {}));
      assert.equal(document.status, 'SIGNED');
    });
    await test('authentication and second organization isolation reject foreign workspace, source and actor fields', async () => {
      await noEffects(() => call(null, prefix(org) + '/workspace'), 401);
      await noEffects(() => call(outsider, prefix(org) + '/workspace'), 403);
      await noEffects(() => call(other.actors.owner, prefix(org) + '/workspace'), 403);
      const foreign = await makeContract(other);
      await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(foreign)), 404);
      const own = await makeContract(org);
      for (const extra of [{organizationId: other.id}, {actorAccountId: org.actors.owner.id}]) {
        await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', {...creation(own), ...extra}), 400);
      }
    });
    await test('unsigned source, wrong version and changed hash cannot create an order', async () => {
      const draft = await makeContract(org, {}, {status: 'DRAFT'});
      await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', {requestId: randomUUID(), contractDocumentId: draft.document.id, contractVersion: 1, contractHash: '0'.repeat(64)}), 409);
      const contract = await makeContract(org);
      for (const replacement of [{contractVersion: contract.document.version + 1}, {contractHash: '0'.repeat(64)}]) {
        await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', {...creation(contract), ...replacement}), 409);
      }
    });
    await test('signed contract enforces exact integers, total, tax treatment and unique lines', async () => {
      const first = f.lines[0], second = f.lines[1];
      const cases = [
        {totalMinor: 4451}, {totalMinor: 0}, {totalMinor: 2147483648},
        {lines: [{...first, quantity: 1.5}, second]}, {lines: [{...first, quantity: 0}, second]},
        {lines: [{...first, unitPriceMinor: -1}, second]}, {lines: [{...first, unitPriceMinor: 2147483647, quantity: 2}, second]},
        {lines: [{...first, taxMinor: 0}, second]}, {lines: [first, {...second, taxMinor: 1}]},
        {lines: [first, {...second, lineId: first.lineId}]}, {lines: [{...first, taxReason: ''}, second]},
      ];
      for (const invalid of cases) {
        const contract = await makeContract(org, invalid);
        await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), 400);
      }
    });
    await test('account uniqueness and person-independent named roles are mandatory', async () => {
      await assert.rejects(() => db.account.create({data: {personId: org.actors.maker.personId, email: `duplicate-${randomUUID()}@example.invalid`, passwordHash: 'synthetic-unusable', status: 'ACTIVE'}}), error => error.code === 'P2002');
      for (const invalid of [
        {recommenderAccountId: org.actors.maker.id}, {makerAccountId: org.actors.owner.id},
        {receiverAccountId: org.actors.maker.id}, {treasurerAccountId: org.actors.accountant.id},
        {accountantAccountId: org.actors.owner.id}, {acceptorAccountId: org.actors.receiver.id},
      ]) {
        const contract = await makeContract(org, invalid);
        await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), 409);
      }
    });
    await test('expired, not-yet-valid and unqualified supplier contracts are blocked', async () => {
      for (const invalid of [{validFrom: f.day(-20), validUntil: f.day(-1)}, {validFrom: f.day(1), validUntil: f.day(20)}]) {
        const contract = await makeContract(org, invalid);
        await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), 409);
      }
      const contract = await makeContract(org);
      const expiredSupplier = await makeSupplier(org, {validUntil: f.day(-1)});
      const expiredSupplierContract = await makeContract(org, {}, {supplier: expiredSupplier});
      await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(expiredSupplierContract)), 409);
      const supplier = org.supplier.document;
      const stale = {...supplier.payload, validUntil: f.day(-1)};
      await changed('managedDocument', {id: supplier.id}, {payload: stale}, () => noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), 409));
    });
    await test('current account, member, signer and organization authority is checked at execution', async () => {
      const contract = await makeContract(org);
      const submit = () => noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), [401, 403, 404, 409]);
      await changed('organizationMember', {organizationId_accountId: {organizationId: org.id, accountId: org.actors.recommender.id}}, {status: 'SUSPENDED'}, submit);
      await changed('account', {id: org.actors.acceptor.id}, {emailVerifiedAt: null}, submit);
      await changed('account', {id: org.actors.receiver.id}, {status: 'SUSPENDED'}, submit);
      await changed('organizationMember', {organizationId_accountId: {organizationId: org.id, accountId: org.actors.documentSigner.id}}, {role: 'STAFF'}, submit);
      await changed('organization', {id: org.id}, {status: 'SUSPENDED'}, submit);
      await changed('managedDocument', {id: contract.document.id}, {status: 'DRAFT'}, submit);
    });
    await test('original payload, revision, signature, template and attachment drift are rejected', async () => {
      const contract = await makeContract(org, {}, {pdf: true});
      const submit = () => noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', creation(contract)), 409);
      await changed('managedDocument', {id: contract.document.id}, {payload: {...contract.payload, purchaseReference: 'TAMPERED'}}, submit);
      const revision = await db.documentRevision.findUniqueOrThrow({where: {documentId_version: {documentId: contract.document.id, version: contract.document.version}}});
      await changed('documentRevision', {id: revision.id}, {contentHash: 'sha256:tampered'}, submit);
      const signed = await db.documentLifecycleEvent.findFirstOrThrow({where: {documentId: contract.document.id, action: 'SIGNED'}});
      await changed('documentLifecycleEvent', {id: signed.id}, {actorAccountId: org.actors.maker.id}, submit);
      await changed('documentTemplate', {id: contract.document.templateId}, {titleEn: 'Changed pinned template'}, submit);
      const attachment = await db.managedDocumentAttachment.findUniqueOrThrow({where: {id: contract.document.attachment.id}});
      const corrupted = Buffer.from(attachment.content); corrupted[corrupted.length - 1] ^= 1;
      await changed('managedDocumentAttachment', {id: attachment.id}, {content: corrupted}, submit);
    });

    let primary;
    await test('concurrent same-key creation is idempotent and pins native original snapshots', async () => {
      const contract = await makeContract(org), body = creation(contract);
      const responses = await Promise.all([call(org.actors.maker, prefix(org) + '/orders', 'POST', body), call(org.actors.maker, prefix(org) + '/orders', 'POST', body)]);
      const orders = responses.map(ok); assert.equal(orders[0].id, orders[1].id);
      primary = {order: orders[0], contract, body, organization: org};
      assert.equal(await db.procurementOrder.count({where: {contractDocumentId: contract.document.id}}), 1);
      const row = await db.procurementOrder.findUniqueOrThrow({where: {id: orders[0].id}});
      assert.equal(row.amountMinor, 4450); assert.equal(row.currency, 'SAR');
      assert.equal(row.contractHash, contract.ref.documentHash); assert.equal(row.supplierHash, org.supplier.ref.documentHash);
      assert.equal(row.requestedByAccountId, org.actors.maker.id); assert.equal(row.ownerAccountId, org.actors.owner.id);
      assert.equal(await db.procurementOrderEvent.count({where: {organizationId: org.id, requestId: body.requestId}}), 1);
      const different = await makeContract(org);
      await noEffects(() => call(org.actors.maker, prefix(org) + '/orders', 'POST', {...creation(different), requestId: body.requestId}), 409);
    });
    await test('order identifiers do not bypass second organization isolation or read-only authority', async () => {
      await noEffects(() => call(other.actors.owner, `${prefix(org)}/orders/${primary.order.id}`), 403);
      await noEffects(() => call(other.actors.owner, `${prefix(other)}/orders/${primary.order.id}`), 404);
      await noEffects(() => mutate(primary.order, 'recommend', org.actors.viewer, {decision: 'APPROVE', note: 'forbidden'}), 403);
      await noEffects(() => mutate(primary.order, 'approve', org.actors.maker, {decision: 'APPROVE', note: 'forbidden'}), 403);
    });
    await test('owner final approval requires recommendation and execution requires approval', async () => {
      await noEffects(() => mutate(primary.order, 'approve', org.actors.owner, {decision: 'APPROVE', note: 'Too early'}), 403);
      const inv = await makeEvidence(org, primary.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines});
      await noEffects(() => mutate(primary.order, 'invoice', org.actors.accountant, inv.ref), 403);
      const rec = await makeEvidence(org, primary.order, 'RECEIPT', {quantities: allQuantities(primary)});
      await noEffects(() => mutate(primary.order, 'receipts', org.actors.receiver, rec.ref), 403);
    });
    await test('declined recommendation and declined owner approval block invoice and receipt', async () => {
      for (const decisionAt of ['recommend', 'approve']) {
        const item = await create();
        if (decisionAt === 'approve') await act(item.order, 'recommend', org.actors.recommender, {decision: 'APPROVE', note: 'Synthetic recommendation'});
        await act(item.order, decisionAt, org.actors[decisionAt === 'recommend' ? 'recommender' : 'owner'], {decision: 'DECLINE', note: 'Synthetic refusal'});
        const inv = await makeEvidence(org, item.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines});
        const rec = await makeEvidence(org, item.order, 'RECEIPT', {quantities: allQuantities(item)});
        await noEffects(() => mutate(item.order, 'invoice', org.actors.accountant, inv.ref), 403);
        await noEffects(() => mutate(item.order, 'receipts', org.actors.receiver, rec.ref), 403);
        assert.equal(await db.financeEntry.count({where: {referenceId: item.order.id}}), 0);
      }
    });
    await test('audit failure rolls the whole procurement mutation back', async () => {
      const name = 'f08_audit_failure_' + randomUUID().replaceAll('-', '');
      assert.match(primary.order.id, /^[a-f0-9-]+$/);
      await db.$executeRawUnsafe(`CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.resource='ProcurementOrder' AND NEW."resourceId"='${primary.order.id}' THEN RAISE EXCEPTION 'SYNTHETIC F08 audit failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${name}"()`);
      try {await noEffects(() => mutate(primary.order, 'recommend', org.actors.recommender, {decision: 'APPROVE', note: 'Must roll back'}), 500);}
      finally {await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON "AuditEvent"`); await db.$executeRawUnsafe(`DROP FUNCTION "${name}"()`);}
    });

    await test('serializable retry rechecks a revoked participant and leaves no first-attempt effects', async () => {
      const live = await read(primary.order), body = {...envelope(live), decision: 'APPROVE', note: 'Synthetic retry revocation'};
      const member = await db.organizationMember.findUniqueOrThrow({where: {organizationId_accountId: {organizationId: org.id, accountId: org.actors.recommender.id}}});
      const original = db.serializable, {Prisma} = require('@prisma/client');
      let injected = false, revoked = false;
      db.serializable = function(work, ...args) {return original.call(this, async tx => {
        if (injected && !revoked) {revoked = true; await db.organizationMember.update({where: {id: member.id}, data: {status: 'SUSPENDED'}});}
        const result = await work(tx);
        if (result?.command?.requestId === body.requestId && !injected) {
          injected = true;
          throw new Prisma.PrismaClientKnownRequestError('SYNTHETIC F08 serialization retry', {code: 'P2034', clientVersion: 'isolated-f08'});
        }
        return result;
      }, ...args);};
      try {await noEffects(() => call(org.actors.recommender, `${prefix(org)}/orders/${primary.order.id}/recommend`, 'POST', body), 403);}
      finally {db.serializable = original; await db.organizationMember.update({where: {id: member.id}, data: {status: member.status, updatedAt: member.updatedAt}});}
      assert.ok(injected && revoked, 'The real mutation must reach a retry after its rolled-back first write');
    });
    await test('current person, role and owner drift invalidates the pinned mandate', async () => {
      const newPerson = await db.person.create({data: {firstName: 'Synthetic', lastName: 'F08 identity drift'}});
      const attempt = () => noEffects(() => mutate(primary.order, 'recommend', org.actors.recommender, {decision: 'APPROVE', note: 'Changed mandate must block'}), 409);
      await changed('account', {id: org.actors.maker.id}, {personId: newPerson.id}, attempt);
      await changed('organizationMember', {organizationId_accountId: {organizationId: org.id, accountId: org.actors.receiver.id}}, {role: 'OPERATOR'}, attempt);
      await changed('organization', {id: org.id}, {ownerId: org.actors.documentSigner.id}, attempt);
    });
    await test('different-key recommendation race commits once; stale and changed replay conflict', async () => {
      const live = await read(primary.order), beforeEvents = await db.procurementOrderEvent.count({where: {orderId: live.id}});
      const bodies = [0, 1].map(index => ({...envelope(live), decision: 'APPROVE', note: 'Independent concurrent recommendation ' + index}));
      const responses = await Promise.all(bodies.map(body => call(org.actors.recommender, `${prefix(org)}/orders/${live.id}/recommend`, 'POST', body)));
      assert.equal(responses.filter(row => row.status >= 200 && row.status < 300).length, 1);
      assert.equal(responses.filter(row => row.status === 409).length, 1);
      const winner = responses.findIndex(row => row.status < 300), replay = ok(await call(org.actors.recommender, `${prefix(org)}/orders/${live.id}/recommend`, 'POST', bodies[winner]));
      assert.equal(replay.command.replayed, true);
      assert.equal(await db.procurementOrderEvent.count({where: {orderId: live.id}}), beforeEvents + 1);
      await noEffects(() => call(org.actors.recommender, `${prefix(org)}/orders/${live.id}/recommend`, 'POST', {...bodies[winner], note: 'Changed same-key content'}), 409);
      await noEffects(() => call(org.actors.owner, `${prefix(org)}/orders/${live.id}/approve`, 'POST', {...envelope(live), decision: 'APPROVE', note: 'Stale revision'}), 409);
      const current = await read(primary.order);
      await noEffects(() => call(org.actors.owner, `${prefix(org)}/orders/${live.id}/approve`, 'POST', {...envelope(current), expectedDigest: '0'.repeat(64), decision: 'APPROVE', note: 'Wrong current digest'}), 409);
      primary.order = await act(primary.order, 'approve', org.actors.owner, {decision: 'APPROVE', note: 'Synthetic owner final approval'});
      assert.equal(primary.order.status, 'APPROVED'); assert.equal(primary.order.integrity.valid, true);
      assert.deepEqual(primary.order.lines.map(line => line.totalMinor), [3450, 1000]);
    });
    await test('explicit cancellation closes only an effect-free permitted order', async () => {
      const item = await create();
      const cancelled = await act(item.order, 'cancel', org.actors.owner, {reason: 'Synthetic cancellation before execution'});
      assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.totals.netPaidMinor, 0);
      assert.equal(cancelled.acceptance.globalClosureGranted, false);
      await noEffects(() => mutate(cancelled, 'recommend', org.actors.recommender, {decision: 'APPROVE', note: 'Cannot reopen cancelled order'}), 403);
      const disallowed = await create({cancellationPolicy: 'NONE', cancellationTerms: 'No cancellation permitted by this synthetic contract.'});
      await noEffects(() => mutate(disallowed.order, 'cancel', org.actors.owner, {reason: 'Policy forbids this'}), 403);
    });
    await test('invoice requires original PDF, exact price, quantity, explicit tax, total and order binding', async () => {
      const invalids = [
        {amountMinor: 4451}, {amountMinor: 4450.5}, {lines: [{...f.lines[0], quantity: 2}, f.lines[1]]},
        {lines: [{...f.lines[0], unitPriceMinor: 1001}, f.lines[1]]},
        {lines: [{...f.lines[0], taxMinor: 449}, f.lines[1]]}, {lines: [{...f.lines[0], taxMinor: 0}, f.lines[1]]},
        {contractHash: '0'.repeat(64)}, {orderId: randomUUID()},
        {occurredAt: new Date(Date.now() + 86_400_000).toISOString()}, {occurredAt: new Date().toISOString().slice(0, 19)},
      ];
      for (const invalid of invalids) {
        const proof = await makeEvidence(org, primary.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines, ...invalid});
        await noEffects(() => mutate(primary.order, 'invoice', org.actors.accountant, proof.ref), [400, 409]);
      }
      const missingPdf = await makeEvidence(org, primary.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines}, {pdf: false});
      await noEffects(() => mutate(primary.order, 'invoice', org.actors.accountant, missingPdf.ref), 409);
      const foreign = await makeEvidence(other, primary.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines});
      await noEffects(() => mutate(primary.order, 'invoice', org.actors.accountant, foreign.ref), 404);
      const valid = await makeEvidence(org, primary.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines, reference: '  SYN-INV-SPACE-' + randomUUID() + '  '});
      await noEffects(() => mutate(primary.order, 'invoice', org.actors.owner, valid.ref), 403);
      await noEffects(() => mutate(primary.order, 'invoice', org.actors.accountant, {...valid.ref, documentVersion: 2}), 409);
      primary.order = await act(primary.order, 'invoice', org.actors.accountant, valid.ref);
      assert.equal(primary.order.invoice.id, valid.document.id);
      assert.equal(primary.order.invoiceSnapshot.documentSnapshot.attachments[0].sha256, valid.document.attachment.sha256);
      await noEffects(() => mutate(primary.order, 'cancel', org.actors.owner, {reason: 'Invoice effect must block cancellation'}), 403);
    });
    await test('supplier invoice identity cannot be consumed twice but remains scoped to its organization', async () => {
      const reference = primary.order.invoiceSnapshot.payload.reference;
      const duplicateItem = await approved();
      const duplicate = await makeEvidence(org, duplicateItem.order, 'INVOICE', {currency: 'SAR', amountMinor: 4450, lines: f.lines, reference: '  ' + reference.toLowerCase() + '  '});
      await noEffects(() => mutate(duplicateItem.order, 'invoice', org.actors.accountant, duplicate.ref), 409);
      assert.equal((await db.procurementOrder.findUniqueOrThrow({where: {id: duplicateItem.order.id}})).invoiceKey, null);
      assert.equal(await db.financeEntry.count({where: {referenceId: duplicateItem.order.id}}), 0);
      other.supplier = await makeSupplier(other, {supplierRef: org.supplier.payload.supplierRef});
      const otherItem = await approved(await create({}, other));
      const accepted = await invoice(otherItem, {reference}); ok(accepted.response);
      assert.notEqual((await db.procurementOrder.findUniqueOrThrow({where: {id: primary.order.id}})).invoiceKey,
        (await db.procurementOrder.findUniqueOrThrow({where: {id: otherItem.order.id}})).invoiceKey);
    });
    await test('receipt bounds reject unknown, duplicate, fractional, zero and excessive quantities', async () => {
      for (const quantities of [[], [{lineId: 'UNKNOWN', quantity: 1}], [{lineId: f.lines[0].lineId, quantity: 4}],
        [{lineId: f.lines[0].lineId, quantity: 0}], [{lineId: f.lines[0].lineId, quantity: 0.5}],
        [{lineId: f.lines[0].lineId, quantity: 1}, {lineId: f.lines[0].lineId, quantity: 1}]]) {
        const proof = await makeEvidence(org, primary.order, 'RECEIPT', {quantities});
        await noEffects(() => mutate(primary.order, 'receipts', org.actors.receiver, proof.ref), [400, 409]);
      }
      const early = await makeEvidence(org, primary.order, 'RECEIPT', {quantities: [{lineId: f.lines[0].lineId, quantity: 1}], occurredAt: new Date(Date.now() - 86_400_000).toISOString()});
      await noEffects(() => mutate(primary.order, 'receipts', org.actors.receiver, early.ref), 409);
      await noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: org.finance.id}), 403);
    });
    await test('partial receipt is idempotent and prevents settlement before full independent acceptance', async () => {
      const proof = await makeEvidence(org, primary.order, 'RECEIPT', {quantities: [{lineId: f.lines[0].lineId, quantity: 1}]});
      const live = await read(primary.order), body = {...envelope(live), ...proof.ref};
      await noEffects(() => call(org.actors.maker, `${prefix(org)}/orders/${live.id}/receipts`, 'POST', body), 403);
      const responses = await Promise.all([call(org.actors.receiver, `${prefix(org)}/orders/${live.id}/receipts`, 'POST', body), call(org.actors.receiver, `${prefix(org)}/orders/${live.id}/receipts`, 'POST', body)]);
      responses.forEach(ok);
      assert.equal(await db.procurementReceipt.count({where: {documentId: proof.document.id}}), 1);
      await noEffects(() => mutate(primary.order, 'receipts', org.actors.receiver, proof.ref), 409);
      await noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: org.finance.id}), 403);
      const partial = await read(primary.order);
      assert.deepEqual(partial.lines.map(line => line.receivedQuantity), [1, 0]);
      const acceptance = await makeEvidence(org, partial, 'RECEIPT_ACCEPTANCE', {evidenceDigest: partial.receiptDigest});
      await noEffects(() => mutate(primary.order, 'receipt-acceptance', org.actors.acceptor, acceptance.ref), 403);
      const finalReceipt = await makeEvidence(org, primary.order, 'RECEIPT', {quantities: [{lineId: f.lines[0].lineId, quantity: 2}, {lineId: f.lines[1].lineId, quantity: 2}]});
      const stale = await read(primary.order);
      const finalResponses = await Promise.all([0, 1].map(() => call(org.actors.receiver, `${prefix(org)}/orders/${stale.id}/receipts`, 'POST', {...envelope(stale), ...finalReceipt.ref})));
      assert.equal(finalResponses.filter(row => row.status >= 200 && row.status < 300).length, 1);
      assert.equal(finalResponses.filter(row => row.status === 409).length, 1);
      const complete = await read(primary.order);
      assert.deepEqual(complete.lines.map(line => line.receivedQuantity), [3, 2]);
      assert.deepEqual(complete.lines.map(line => line.remainingQuantity), [0, 0]);
      await noEffects(() => mutate(primary.order, 'receipt-acceptance', org.actors.acceptor, acceptance.ref), 409);
      const bound = await makeEvidence(org, complete, 'RECEIPT_ACCEPTANCE', {evidenceDigest: complete.receiptDigest});
      await noEffects(() => mutate(primary.order, 'receipt-acceptance', org.actors.receiver, bound.ref), 403);
      primary.order = await act(primary.order, 'receipt-acceptance', org.actors.acceptor, bound.ref);
      assert.equal(primary.order.receiptAcceptance.id, bound.document.id);
      assert.equal((await read(primary.order, org.actors.accountant)).actions.prepareSettlement.allowed, true);
    });
    const ready = async () => {
      const item = await approved(); ok((await invoice(item)).response); ok((await receipt(item, allQuantities(item))).response);
      const live = await read(item.order);
      ok((await prove(item, 'RECEIPT_ACCEPTANCE', 'receipt-acceptance', org.actors.acceptor, {evidenceDigest: live.receiptDigest})).response);
      return item;
    };
    const prepareApproved = async (item, kind = 'SETTLEMENT') => {
      const stem = kind === 'SETTLEMENT' ? 'settlement' : 'recovery';
      await act(item.order, stem + '/prepare', org.actors.accountant, {financeAccountId: org.finance.id});
      return act(item.order, stem + '/approve', org.actors.owner, {decision: 'APPROVE', note: 'Synthetic independent finance approval'});
    };
    const moneyEvidence = async (item, kind = 'SETTLEMENT', overrides = {}, options = {}) => {
      const live = await read(item.order), proof = live.moneyProofs.find(row => row.kind === kind && row.status === 'APPROVED');
      assert.ok(proof, 'An approved native proof is required before execution evidence');
      return makeEvidence(org, live, kind, {financeEntryId: proof.financeEntryId, currency: 'SAR', amountMinor: live.amountMinor,
        occurredAt: new Date().toISOString(), bankName: 'Synthetic Loopback Bank', bankReference: 'SYN-F08-MONEY-' + randomUUID(), ...overrides}, options);
    };
    const accept = async item => {
      const live = await read(item.order);
      const source = await makeEvidence(org, live, 'FINAL_ACCEPTANCE', {evidenceDigest: live.completionDigest});
      item.order = await act(item.order, 'acceptance', org.actors.acceptor, source.ref);
      assert.equal(item.order.acceptance.valid, true); assert.equal(item.order.acceptance.globalClosureGranted, false);
      return source;
    };
    await test('finance account scope, currency, activity and named preparer are enforced', async () => {
      await noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.treasurer, {financeAccountId: org.finance.id}), 403);
      await noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: other.finance.id}), 409);
      await changed('financeAccount', {id: org.finance.id}, {active: false}, () => noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: org.finance.id}), 409));
      await changed('financeAccount', {id: org.finance.id}, {currency: 'USD'}, () => noEffects(() => mutate(primary.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: org.finance.id}), 409));
      const live = await read(primary.order), body = {...envelope(live), financeAccountId: org.finance.id};
      const responses = await Promise.all([call(org.actors.accountant, `${prefix(org)}/orders/${live.id}/settlement/prepare`, 'POST', body), call(org.actors.accountant, `${prefix(org)}/orders/${live.id}/settlement/prepare`, 'POST', body)]);
      responses.forEach(ok);
      assert.equal(await db.procurementMoneyProof.count({where: {orderId: live.id, kind: 'SETTLEMENT'}}), 1);
      assert.equal((await read(primary.order)).totals.settledMinor, 0);
    });
    await test('generic finance paths cannot forge, approve or post procurement movements', async () => {
      const admin = await f.account('synthetic-platform-finance-admin');
      await db.roleAssignment.create({data: {accountId: admin.id, role: 'ADMIN', status: 'ACTIVE'}});
      const live = await read(primary.order), entry = live.moneyProofs.find(row => row.kind === 'SETTLEMENT');
      for (const referenceType of ['ORGANIZATION_PROCUREMENT_SETTLEMENT', 'ORGANIZATION_PROCUREMENT_REVERSAL']) {
        await noEffects(() => call(admin, '/finance/admin/entries', 'POST', {organizationId: org.id, financeAccountId: org.finance.id, type: 'EXPENSE', amountMinor: 4450, currency: 'SAR', referenceType, referenceId: live.id}), 400);
      }
      await noEffects(() => call(admin, `/finance/admin/entries/${entry.financeEntryId}/decision`, 'POST', {approved: true, note: 'Bypass attempt'}), 400);
      await noEffects(() => call(admin, `/finance/admin/entries/${entry.financeEntryId}/post`, 'POST', {}), 400);
    });
    await test('finance rejection remains recorded and a later preparation has a new original entry', async () => {
      const before = await read(primary.order), first = before.moneyProofs.find(row => row.kind === 'SETTLEMENT');
      await noEffects(() => mutate(primary.order, 'settlement/approve', org.actors.accountant, {decision: 'APPROVE', note: 'Self approval blocked'}), 403);
      await act(primary.order, 'settlement/approve', org.actors.owner, {decision: 'DECLINE', note: 'Synthetic rejected financial preparation'});
      const rejected = await db.financeEntry.findUniqueOrThrow({where: {id: first.financeEntryId}});
      assert.equal(rejected.status, 'REJECTED');
      await prepareApproved(primary);
      const after = await read(primary.order), current = after.moneyProofs.find(row => row.status === 'APPROVED');
      assert.notEqual(current.financeEntryId, first.financeEntryId); assert.equal(after.totals.settledMinor, 0);
      assert.equal(after.status, 'APPROVED');
    });
    await test('financial confirmation binds exact original entry, amount, chronology and PDF', async () => {
      const live = await read(primary.order), entry = await db.financeEntry.findUniqueOrThrow({where: {id: live.moneyProofs.find(row => row.status === 'APPROVED').financeEntryId}});
      for (const invalid of [{amountMinor: 4449}, {amountMinor: 4450.5}, {financeEntryId: randomUUID()},
        {occurredAt: new Date(entry.approvedAt.getTime() - 1).toISOString()}, {occurredAt: new Date(Date.now() + 3600_000).toISOString()},
        {occurredAt: new Date().toISOString().slice(0, 19)}, {bankReference: ''}]) {
        const source = await moneyEvidence(primary, 'SETTLEMENT', invalid);
        await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.treasurer, source.ref), [400, 409]);
      }
      const noPdf = await moneyEvidence(primary, 'SETTLEMENT', {}, {pdf: false});
      await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.treasurer, noPdf.ref), 409);
      const valid = await moneyEvidence(primary);
      await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.accountant, valid.ref), 403);
      await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.owner, valid.ref), 403);
      for (const field of ['creator', 'approver', 'signer']) {
        const selfEvidence = await moneyEvidence(primary, 'SETTLEMENT', {}, {[field]: org.actors.treasurer});
        await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.treasurer, selfEvidence.ref), 403);
      }
      const attachment = valid.document.attachment;
      await changed('managedDocumentAttachment', {id: attachment.id}, {sha256: '0'.repeat(64)}, () => noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.treasurer, valid.ref), 409));
    });
    await test('existing B08 and B12 bank references cannot be reused by F08', async () => {
      for (const model of ['centerServiceTransferReceipt', 'commerceSourceTransferReceipt']) {
        const bankName = 'Synthetic Collision Bank', bankReference = 'SYN-REF-' + randomUUID();
        const source = await moneyEvidence(primary, 'SETTLEMENT', {bankName, bankReference});
        const stored = await db.managedDocumentAttachment.findUniqueOrThrow({where: {id: source.document.attachment.id}});
        const bankReferenceKey = f.sha([bankName.normalize('NFKC').toUpperCase().replace(/\s+/g, ' '), bankReference.normalize('NFKC').toUpperCase().replace(/\s+/g, '')]);
        const id = randomUUID();
        await db[model].create({data: {id, financeEntryId: 'synthetic-occupied-' + randomUUID(), organizationId: other.id, centerOrgUnitId: 'synthetic-scope-' + randomUUID(),
          ...(model === 'centerServiceTransferReceipt' ? {bookingId: randomUUID(), paymentId: randomUUID()} : {sourceType: 'STORE_ORDER', sourceId: randomUUID()}),
          invoiceFinalizationId: randomUUID(), bankName, bankReference, bankReferenceKey, amountMinor: 4450, currency: 'SAR', transferredAt: new Date(),
          document: stored.content, documentSha256: stored.sha256, evidenceSnapshot: {synthetic: true, purpose: 'cross-workflow duplicate reference sentinel'}, status: 'PENDING', submittedBy: other.actors.owner.id}});
        try {await noEffects(() => mutate(primary.order, 'settlement/confirm', org.actors.treasurer, source.ref), 409);}
        finally {await db[model].delete({where: {id}});}
      }
    });
    let primaryMoney;
    await test('concurrent confirmation posts one independently approved native settlement', async () => {
      primaryMoney = await moneyEvidence(primary, 'SETTLEMENT', {bankName: '  Synthetic Loopback Bank  ', bankReference: '  SYN-F08-SPACED-' + randomUUID() + '  '});
      const live = await read(primary.order), body = {...envelope(live), ...primaryMoney.ref};
      const responses = await Promise.all([call(org.actors.treasurer, `${prefix(org)}/orders/${live.id}/settlement/confirm`, 'POST', body), call(org.actors.treasurer, `${prefix(org)}/orders/${live.id}/settlement/confirm`, 'POST', body)]);
      responses.forEach(ok); primary.order = await read(primary.order);
      assert.equal(primary.order.status, 'SETTLED'); assert.equal(primary.order.integrity.valid, true);
      assert.deepEqual(primary.order.totals, {amountMinor: 4450, settledMinor: 4450, recoveredMinor: 0, netPaidMinor: 4450, remainingMinor: 0, recoveryRequiredMinor: 0});
      const proof = await db.procurementMoneyProof.findFirstOrThrow({where: {orderId: live.id, kind: 'SETTLEMENT', status: 'CONFIRMED'}});
      const entry = await db.financeEntry.findUniqueOrThrow({where: {id: proof.financeEntryId}, include: {approvals: true}});
      assert.equal(entry.referenceType, 'ORGANIZATION_PROCUREMENT_SETTLEMENT'); assert.equal(entry.referenceId, live.id);
      assert.equal(entry.type, 'EXPENSE'); assert.equal(entry.amountMinor, 4450); assert.equal(entry.status, 'POSTED');
      assert.equal(entry.requestedByAccountId, org.actors.accountant.id); assert.equal(entry.approvedByAccountId, org.actors.owner.id); assert.equal(entry.postedByAccountId, org.actors.treasurer.id);
      assert.equal(entry.approvals.filter(row => row.status === 'APPROVED').length, 1);
      assert.equal(proof.documentHash, primaryMoney.ref.documentHash); assert.equal(proof.documentId, primaryMoney.document.id);
      assert.equal(proof.confirmedByAccountId, org.actors.treasurer.id); assert.equal(proof.amountMinor, 4450);
      assert.equal(proof.bankName, primaryMoney.payload.bankName.trim()); assert.equal(proof.bankReference, primaryMoney.payload.bankReference.trim());
      assert.equal(await db.procurementMoneyProof.count({where: {bankReferenceKey: proof.bankReferenceKey}}), 1);
      assert.equal(await db.procurementOrderEvent.count({where: {organizationId: org.id, requestId: body.requestId}}), 1);
    });
    await test('final acceptance is independent, chronological and bound to current completion evidence', async () => {
      const live = await read(primary.order);
      for (const invalid of [{evidenceDigest: '0'.repeat(64)}, {evidenceDigest: live.completionDigest, occurredAt: new Date(Date.now() - 86_400_000).toISOString()}]) {
        const source = await makeEvidence(org, live, 'FINAL_ACCEPTANCE', invalid);
        await noEffects(() => mutate(primary.order, 'acceptance', org.actors.acceptor, source.ref), 409);
      }
      const source = await makeEvidence(org, live, 'FINAL_ACCEPTANCE', {evidenceDigest: live.completionDigest});
      for (const role of ['owner', 'maker', 'recommender', 'receiver', 'accountant', 'treasurer']) await noEffects(() => mutate(primary.order, 'acceptance', org.actors[role], source.ref), 403);
      const body = {...envelope(await read(primary.order)), ...source.ref};
      primary.order = ok(await call(org.actors.acceptor, `${prefix(org)}/orders/${live.id}/acceptance`, 'POST', body));
      assert.equal(primary.order.acceptance.valid, true); assert.equal(primary.order.acceptance.actorAccountId, org.actors.acceptor.id);
      assert.equal(primary.order.acceptance.scope, 'ORDER_EVIDENCE'); assert.equal(primary.order.acceptance.globalClosureGranted, false);
      const replay = ok(await call(org.actors.acceptor, `${prefix(org)}/orders/${live.id}/acceptance`, 'POST', body));
      assert.equal(replay.command.replayed, true); assert.equal(replay.acceptance.document.id, source.document.id);
    });
    await test('accepted source drift produces a read-only review state without fabricated balances', async () => {
      const document = await db.managedDocument.findUniqueOrThrow({where: {id: primaryMoney.document.id}});
      await changed('managedDocument', {id: document.id}, {payload: {...document.payload, bankReference: 'TAMPERED'}}, async () => {
        const before = await fullState(), view = await read(primary.order);
        assert.equal(view.integrity.valid, false); assert.equal(view.acceptance.valid, false);
        assert.equal(view.totals.settledMinor, null); assert.equal(view.totals.netPaidMinor, null);
        assert.ok(Object.values(view.actions).every(action => action.allowed === false));
        await read(primary.order); await workspace(); assert.equal(await fullState(), before);
        await noEffects(() => mutate(primary.order, 'reverse', org.actors.owner, primaryMoney.ref), 409);
      });
      assert.equal((await read(primary.order)).acceptance.valid, true);
      const memberWhere = {organizationId_accountId: {organizationId: org.id, accountId: org.actors.acceptor.id}};
      await changed('organizationMember', memberWhere, {status: 'SUSPENDED'}, async () => {
        const view = await read(primary.order); assert.equal(view.acceptance.valid, false); assert.equal(view.integrity.valid, false);
      });
    });
    let recoveryItem;
    await test('an F08 bank reference cannot be consumed by a second order or altered replay', async () => {
      recoveryItem = await ready(); await prepareApproved(recoveryItem);
      const duplicate = await moneyEvidence(recoveryItem, 'SETTLEMENT', {bankName: primaryMoney.payload.bankName, bankReference: primaryMoney.payload.bankReference});
      await noEffects(() => mutate(recoveryItem.order, 'settlement/confirm', org.actors.treasurer, duplicate.ref), 409);
      const unique = await moneyEvidence(recoveryItem);
      recoveryItem.order = await act(recoveryItem.order, 'settlement/confirm', org.actors.treasurer, unique.ref);
      assert.equal(recoveryItem.order.status, 'SETTLED'); await accept(recoveryItem);
    });
    await test('whole reversal requires exact returned quantities, paid amount and original chronology', async () => {
      const live = await read(recoveryItem.order);
      for (const invalid of [{quantities: [{lineId: f.lines[0].lineId, quantity: 2}, {lineId: f.lines[1].lineId, quantity: 2}]},
        {amountMinor: 4449}, {amountMinor: 0}, {occurredAt: new Date(Date.now() - 86_400_000).toISOString()}]) {
        const source = await makeEvidence(org, live, 'REVERSAL', {currency: 'SAR', amountMinor: 4450, quantities: allQuantities(recoveryItem), ...invalid});
        await noEffects(() => mutate(recoveryItem.order, 'reverse', org.actors.owner, source.ref), 409);
      }
      const source = await makeEvidence(org, live, 'REVERSAL', {currency: 'SAR', amountMinor: 4450, quantities: allQuantities(recoveryItem)});
      await noEffects(() => mutate(recoveryItem.order, 'reverse', org.actors.accountant, source.ref), 403);
      recoveryItem.order = await act(recoveryItem.order, 'reverse', org.actors.owner, source.ref);
      assert.equal(recoveryItem.order.status, 'RECOVERY_REQUIRED'); assert.equal(recoveryItem.order.acceptance.valid, false);
      assert.equal(recoveryItem.order.acceptance.document, null);
      assert.equal(recoveryItem.order.totals.settledMinor, 4450); assert.equal(recoveryItem.order.totals.netPaidMinor, 4450);
      assert.equal(recoveryItem.order.totals.recoveryRequiredMinor, 4450); assert.equal(recoveryItem.order.totals.remainingMinor, 0);
      assert.deepEqual(recoveryItem.order.lines.map(row => row.returnedQuantity), [3, 2]);
      const premature = await makeEvidence(org, recoveryItem.order, 'FINAL_ACCEPTANCE', {evidenceDigest: recoveryItem.order.completionDigest});
      await noEffects(() => mutate(recoveryItem.order, 'acceptance', org.actors.acceptor, premature.ref), 403);
    });
    await test('recovery requires independent incoming proof and preserves original settlement history', async () => {
      await prepareApproved(recoveryItem, 'RECOVERY');
      const duplicate = await moneyEvidence(recoveryItem, 'RECOVERY', {bankName: primaryMoney.payload.bankName, bankReference: primaryMoney.payload.bankReference});
      await noEffects(() => mutate(recoveryItem.order, 'recovery/confirm', org.actors.treasurer, duplicate.ref), 409);
      const source = await moneyEvidence(recoveryItem, 'RECOVERY');
      const live = await read(recoveryItem.order), body = {...envelope(live), ...source.ref};
      const results = await Promise.all([call(org.actors.treasurer, `${prefix(org)}/orders/${live.id}/recovery/confirm`, 'POST', body), call(org.actors.treasurer, `${prefix(org)}/orders/${live.id}/recovery/confirm`, 'POST', body)]);
      results.forEach(ok); recoveryItem.order = await read(recoveryItem.order);
      assert.equal(recoveryItem.order.status, 'RECOVERED'); assert.equal(recoveryItem.order.integrity.valid, true);
      assert.deepEqual(recoveryItem.order.totals, {amountMinor: 4450, settledMinor: 4450, recoveredMinor: 4450, netPaidMinor: 0, remainingMinor: 0, recoveryRequiredMinor: 0});
      const proofs = await db.procurementMoneyProof.findMany({where: {orderId: live.id, status: 'CONFIRMED'}, orderBy: {kind: 'asc'}});
      assert.deepEqual(proofs.map(row => row.kind), ['RECOVERY', 'SETTLEMENT']);
      const entries = await db.financeEntry.findMany({where: {id: {in: proofs.map(row => row.financeEntryId)}}});
      assert.equal(entries.length, 2); assert.ok(entries.every(row => row.status === 'POSTED' && row.amountMinor === 4450 && row.referenceId === live.id));
      assert.equal(entries.find(row => row.type === 'REVENUE').referenceType, 'ORGANIZATION_PROCUREMENT_REVERSAL');
      assert.equal(entries.find(row => row.type === 'EXPENSE').referenceType, 'ORGANIZATION_PROCUREMENT_SETTLEMENT');
      assert.equal(new Set(proofs.map(row => row.bankReferenceKey)).size, 2);
      await accept(recoveryItem);
    });
    await test('reversal before payment voids pending original finance without inventing a recovery', async () => {
      const item = await ready();
      await act(item.order, 'settlement/prepare', org.actors.accountant, {financeAccountId: org.finance.id});
      const live = await read(item.order), financeId = live.moneyProofs[0].financeEntryId;
      const source = await makeEvidence(org, live, 'REVERSAL', {currency: 'SAR', amountMinor: 0, quantities: allQuantities(item)});
      item.order = await act(item.order, 'reverse', org.actors.owner, source.ref);
      assert.equal(item.order.status, 'REVERSED'); assert.equal(item.order.totals.netPaidMinor, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({where: {id: financeId}})).status, 'VOIDED');
      assert.equal(await db.procurementMoneyProof.count({where: {orderId: live.id, kind: 'RECOVERY'}}), 0);
      await noEffects(() => mutate(item.order, 'recovery/prepare', org.actors.accountant, {financeAccountId: org.finance.id}), 403);
      await accept(item);
    });
    await test('inclusive maximum supported contract amount remains exact', async () => {
      const item = await create({totalMinor: 2147483647, lines: [{lineId: 'MAX-EXACT', description: 'Synthetic integer boundary', quantity: 1, unitPriceMinor: 2147483647, taxMinor: 0, taxTreatment: 'ZERO_RATED', taxReason: 'Synthetic explicit zero-rated boundary'}]});
      assert.equal(item.order.amountMinor, 2147483647); assert.equal(item.order.lines[0].totalMinor, 2147483647);
      await act(item.order, 'cancel', org.actors.owner, {reason: 'Boundary fixture has no execution effects'});
    });
    await test('repeated settlement/recovery/acceptance reads preserve all source bytes and audit records', async () => {
      const before = await fullState();
      for (let index = 0; index < 3; index++) {await read(primary.order); await read(recoveryItem.order); await workspace();}
      assert.equal(await fullState(), before); assert.deepEqual(f.externalAttempts, []);
      const settled = await read(primary.order), recovered = await read(recoveryItem.order);
      assert.equal(settled.status, 'SETTLED'); assert.equal(settled.acceptance.valid, true);
      assert.equal(recovered.status, 'RECOVERED'); assert.equal(recovered.acceptance.valid, true);
      const counts = {orders: await db.procurementOrder.count(), events: await db.procurementOrderEvent.count(), receipts: await db.procurementReceipt.count(), moneyProofs: await db.procurementMoneyProof.count()};
      assert.ok(Object.values(counts).every(count => count > 0));
      retained = {database: new URL(process.env.DATABASE_URL).pathname.slice(1), organizationId: org.id, otherOrganizationId: other.id,
        settledOrderId: settled.id, recoveredOrderId: recovered.id, settledAcceptanceDocumentId: settled.acceptance.document.id,
        recoveredAcceptanceDocumentId: recovered.acceptance.document.id, settledTotals: settled.totals, recoveredTotals: recovered.totals, counts};
    });
    success = true;
  } finally {
    if (f) await f.close();
    const evidence = {schemaVersion: 1, suite: 'F08_ORGANIZATION_PROCUREMENT_HTTP', synthetic: true, realRepresentativeAcceptance: false,
      status: success ? 'PASS' : 'FAIL', startedAt, finishedAt: new Date().toISOString(), passed: checks.filter(row => row.status === 'PASS').length,
      failed: checks.filter(row => row.status === 'FAIL').length, skipped: 0, checks, retained};
    if (process.env.F08_EVIDENCE_FILE) {mkdirSync(dirname(process.env.F08_EVIDENCE_FILE), {recursive: true}); writeFileSync(process.env.F08_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');}
    console.log('F08_RESULT ' + JSON.stringify(evidence));
  }
})().catch(error => {console.error(error.stack || error); process.exitCode = 1;});
