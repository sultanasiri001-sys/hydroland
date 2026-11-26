'use strict';
// Extends the existing disposable organization prepayment acceptance transaction.
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const { AccountInvoicesService } = require('../dist/payments/account-invoices.service');
const { OrganizationBookingInvoiceService } = require('../dist/payments/organization-booking-invoice.service');

module.exports = async function checkFinalInvoice(tx, db, context) {
  const {seller, org, paid, accountant, creator, delegate, entry} = context;
  const apiDb = {...db, $transaction: fn => fn(tx), $queryRaw: tx.$queryRaw.bind(tx)};
  const originals = new AccountInvoicesService(apiDb), invoices = new OrganizationBookingInvoiceService(apiDb);
  const key = {sourceType: 'TRIP_PAYMENT', sourceId: paid.id};
  const rejected = status => error => error.getStatus?.() === status;
  const beforePayment = await tx.payment.findUniqueOrThrow({where: {id: paid.id}});
  const beforeInvoice = await tx.invoice.findUniqueOrThrow({where: {paymentId: paid.id}});
  const missing = await invoices.preview(accountant.id, paid.id);
  assert.equal(missing.canFinalize, false);
  assert(missing.blockers.some(value => value.includes('أصل فاتورة')));
  assert(missing.blockers.some(value => value.includes('بيانات المركز المالية')));

  await tx.organization.update({where: {id: seller.id}, data: {legalName: 'Synthetic supplying center', address: 'Synthetic center address', registrationNumber: 'SYNTHETIC-' + seller.id}});
  await tx.organization.update({where: {id: org.id}, data: {legalName: 'Synthetic buying organization', address: 'Synthetic buyer address'}});
  await tx.operationalSetting.create({data: {key: 'organization-financial-profile:' + seller.id,
    value: {currency: 'SAR', taxStatus: 'EXEMPT', registrationStatus: 'REGISTERED', revision: 1}}});
  await tx.roleAssignment.createMany({data: [{accountId: creator.id, role: 'ORGANIZATION', status: 'ACTIVE'}], skipDuplicates: true});
  const document = await PDFDocument.create();
  document.addPage().drawText('SYNTHETIC B12 ORIGINAL - INV-B12-001 - SAR 100.00');
  const bytes = Buffer.from(await document.save());
  await assert.rejects(() => originals.attach(delegate.id, key, 'INV-B12-001', {buffer: bytes, mimetype: 'application/pdf'}), rejected(404));
  await originals.attach(accountant.id, key, 'INV-B12-001', {buffer: bytes, mimetype: 'application/pdf'});
  assert.deepEqual(await originals.download(creator.id, key), bytes);
  const preview = await invoices.preview(accountant.id, paid.id);
  assert.deepEqual(preview.blockers, []);
  assert.equal(preview.canFinalize, true);
  assert.equal(preview.seller.name, 'Synthetic supplying center');
  assert.equal(preview.buyer.name, 'Synthetic buying organization');
  assert.equal(preview.collectionFinanceEntryId, entry.id);
  assert.equal(preview.amountMinor, 10000);
  const input = {issuedAt: new Date(Date.now() - 1000).toISOString(), expectedEvidenceHash: preview.expectedEvidenceHash, originalInvoiceVerified: true};
  await assert.rejects(() => invoices.finalize(creator.id, paid.id, input), rejected(403));
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, originalInvoiceVerified: false}), rejected(400));
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, expectedEvidenceHash: '0'.repeat(64)}), rejected(409));
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, issuedAt: new Date(Date.now() + 3600000).toISOString()}), rejected(400));
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, issuedAt: '2024-02-31T12:00:00+03:00'}), rejected(400));
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, issuedAt: '2024-02-29T12:00:00'}), rejected(400));

  const finalized = await invoices.finalize(accountant.id, paid.id, input);
  assert.equal(finalized.status, 'FINALIZED');
  assert.equal(finalized.number, 'INV-B12-001');
  assert.equal(finalized.alreadyFinalized, false);
  assert.equal((await invoices.finalize(accountant.id, paid.id, input)).alreadyFinalized, true);
  await assert.rejects(() => invoices.finalize(accountant.id, paid.id, {...input, issuedAt: new Date(Date.now() - 86400000).toISOString()}), rejected(409));
  const afterInvoice = await tx.invoice.findUniqueOrThrow({where: {paymentId: paid.id}});
  assert.equal(afterInvoice.status, 'PAID');
  assert.equal(afterInvoice.issuedAt.toISOString(), input.issuedAt);
  assert.equal(afterInvoice.number, 'HL-ORG-' + afterInvoice.id);
  assert.deepEqual(afterInvoice.contractSnapshot, beforeInvoice.contractSnapshot);
  assert.deepEqual((await tx.payment.findUniqueOrThrow({where: {id: paid.id}})).contractSnapshot, beforePayment.contractSnapshot);
  assert.equal(await tx.organizationBookingInvoiceFinalization.count({where: {paymentId: paid.id}}), 1);
  assert.equal(await tx.auditEvent.count({where: {resourceId: afterInvoice.id, action: 'ORGANIZATION_INVOICE_FINALIZED'}}), 1);
  assert.deepEqual(await originals.download(creator.id, key), bytes);
  const listed = (await originals.list(creator.id, 'all', 0, key)).items[0];
  assert.equal(listed.finalizationStatus, 'FINALIZED');
  assert.equal(listed.number, 'INV-B12-001');
  assert.equal(listed.canFinalize, false);

  // Later name/profile edits do not rewrite the parties on an issued original.
  await tx.organization.update({where: {id: seller.id}, data: {legalName: 'Later center name'}});
  await tx.organization.update({where: {id: org.id}, data: {legalName: 'Later buyer name'}});
  const historical = await invoices.preview(creator.id, paid.id);
  assert.equal(historical.seller.name, preview.seller.name);
  assert.equal(historical.buyer.name, preview.buyer.name);
  assert.equal(historical.documentSha256, preview.documentSha256);
  const membership = {organizationId_accountId: {organizationId: org.id, accountId: creator.id}};
  await tx.organizationMember.update({where: membership, data: {status: 'SUSPENDED'}});
  await assert.rejects(() => invoices.preview(creator.id, paid.id), rejected(404));
  await assert.rejects(() => originals.download(creator.id, key), rejected(404));
  await tx.organizationMember.update({where: membership, data: {status: 'ACTIVE'}});
  return finalized;
};
