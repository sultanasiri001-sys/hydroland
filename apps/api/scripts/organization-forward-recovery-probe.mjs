import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const organizationRevision = 'e6efbf0c2b8c2de52bfcee85b8a3ec2e03259c5b';
const sources = [
  ['20261005090000_customer_case_organization_relation', '2028fec2d985196211610d9f25a6df79f025d417c35541a230d4accebc6df3b6'],
  ['20261005130000_organization_booking_safety', 'fe561ded137754d9cdc24f9320fa5f20ab18ff57cfca9992074eb0c16f638804'],
];

// Called only inside the recovery script's explicitly disposable Docker boundary.
export async function probeOrganizationForwardUpgrade({ repoRoot, work, db, prisma, account, organization, trip, booking, payment, check }) {
  const checkout = join(repoRoot, 'portal-candidate');
  assert.equal(execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), organizationRevision, 'Unexpected organization candidate revision');
  const migrations = [];
  for (const [name, checksum] of sources) {
    const sql = await readFile(join(checkout, 'apps/api/prisma/migrations', name, 'migration.sql'), 'utf8');
    assert.equal(createHash('sha256').update(sql).digest('hex'), checksum, 'Organization migration SQL changed: ' + name);
    migrations.push({ name, sql, sha256: checksum, source: organizationRevision });
  }
  // Existing personal and organization cases are present before adding their FK.
  const personalCase = await db.customerCase.create({ data: { customerId: account.id, type: 'QUESTION', subject: 'LOCAL PERSONAL CASE', description: 'Synthetic migration preservation fixture' } });
  const organizationCase = await db.customerCase.create({ data: { customerId: account.id, organizationId: organization.id, type: 'QUESTION', subject: 'LOCAL ORGANIZATION CASE', description: 'Synthetic migration preservation fixture' } });
  const beforeBooking = await db.booking.findUnique({ where: { id: booking.id } });
  const beforePayment = await db.payment.findUnique({ where: { id: payment.id }, include: { invoice: true } });
  for (const migration of migrations) {
    await mkdir(join(work, 'migrations', migration.name));
    await writeFile(join(work, 'migrations', migration.name, 'migration.sql'), migration.sql);
  }
  prisma(['migrate', 'deploy', '--schema', join(work, 'schema.prisma')]);
  assert.deepEqual(await db.booking.findUnique({ where: { id: booking.id } }), beforeBooking);
  assert.deepEqual(await db.payment.findUnique({ where: { id: payment.id }, include: { invoice: true } }), beforePayment);
  assert.deepEqual(await db.customerCase.findUnique({ where: { id: personalCase.id } }), personalCase);
  assert.deepEqual(await db.customerCase.findUnique({ where: { id: organizationCase.id } }), organizationCase);
  check('organization_upgrade_preserves_existing_booking_payment_invoice_and_cases', true);
  const legacy = await db.$queryRaw`SELECT "organizationId","bookingRequestKey" FROM "Booking" WHERE "id"=${booking.id}`;
  assert.deepEqual(legacy, [{ organizationId: null, bookingRequestKey: null }]);
  await assert.rejects(() => db.customerCase.update({ where: { id: organizationCase.id }, data: { organizationId: randomUUID() } }), error => error.code === 'P2003');
  const organizationBooking = randomUUID();
  const insert = (id, org, key, status = 'PENDING') => db.$executeRaw`INSERT INTO "Booking" ("id","tripId","accountId","seats","status","organizationId","bookingRequestKey","createdAt","updatedAt") VALUES (${id},${trip.id},${account.id},1,${status}::"BookingStatus",${org},${key},NOW(),NOW())`;
  await insert(organizationBooking, organization.id, 'synthetic-organization-request');
  await assert.rejects(() => insert(randomUUID(), organization.id, 'synthetic-duplicate-active'), error => error.meta?.code === '23505');
  await assert.rejects(() => insert(randomUUID(), null, null), error => error.meta?.code === '23505');
  await assert.rejects(() => insert(randomUUID(), randomUUID(), 'synthetic-foreign-org'), error => error.meta?.code === '23503');
  await db.$executeRaw`UPDATE "Booking" SET "status"='CANCELLED' WHERE "id"=${organizationBooking}`;
  await insert(randomUUID(), organization.id, 'synthetic-replacement-request');
  await assert.rejects(() => insert(randomUUID(), organization.id, 'synthetic-organization-request', 'CANCELLED'), error => error.meta?.code === '23505');
  await assert.rejects(() => db.$executeRaw`UPDATE "SafetyIncident" SET "bookingId"=${randomUUID()}`, error => error.meta?.code === '23503');
  await db.$executeRaw`UPDATE "SafetyIncident" SET "bookingId"=${organizationBooking}`;
  await assert.rejects(() => db.booking.delete({ where: { id: organizationBooking } }), error => error.code === 'P2003');
  check('organization_upgrade_enforces_scope_relations_active_uniqueness_request_keys_and_cancelled_history', true);
  return migrations.map(({ sql: _sql, ...entry }) => entry);
}
