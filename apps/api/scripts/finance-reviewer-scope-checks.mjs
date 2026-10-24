import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Called only from the loopback-only, disposable TEXT/UUID schema matrix.
// Each reviewer has exactly one employment and no independent executive role.
export async function checkFinanceReviewerScopes(db, {coreType, orgA, orgB, unitA, unitB}, operations) {
  const id = () => coreType === 'text' ? 'reviewer_' + randomUUID() : randomUUID();
  const literal = value => "'" + value.replaceAll("'", "''") + "'";
  const run = sql => db.$executeRawUnsafe(sql);
  const hq = id(), otherUnit = id(), foreignHq = id();
  const roles = operations.kind === 'period'
    ? ['CENTRAL_FINANCE', 'FINANCE_MANAGER', 'EXECUTIVE']
    : ['CENTER_MANAGER', 'CENTRAL_FINANCE', 'FINANCE_MANAGER', 'EXECUTIVE'];
  let scenarios = 0;
  const reads = operations.reads ?? [operations.read];
  // The complete decision, submission and audit rows must remain unchanged.
  const snapshot = async () => {
    const result = {};
    for (const table of ['FinanceAccountantShift', 'FinanceShiftCloseSubmission', 'FinancePeriodCloseSubmission', 'FinancePeriodCloseApproval', 'FinanceSettlementImport', 'FinanceSettlementReview', 'AuditEvent']) {
      result[table] = await db.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY id`);
    }
    return result;
  };
  try {
    for (const [unit, org] of [[hq, orgA], [otherUnit, orgA], [foreignHq, orgB]]) {
      await run(`INSERT INTO "OrgUnit" (id,"organizationId",type,active) VALUES (${literal(unit)},${literal(org)},'HQ',TRUE)`);
    }
    for (const role of roles) {
      const account = id(), position = id(), employment = id();
      const unit = role === 'CENTER_MANAGER' ? unitA : hq;
      try {
        await run(`INSERT INTO "Person" VALUES (${literal(account)},'Scope','Reviewer')`);
        await run(`INSERT INTO "Account" (id,status,"personId") VALUES (${literal(account)},'ACTIVE',${literal(account)})`);
        await run(`INSERT INTO "Position" VALUES (${literal(position)},${literal(unit)},${literal(role)},TRUE)`);
        await run(`INSERT INTO "Employment" VALUES (${literal(employment)},${literal(account)},${literal(orgA)},${literal(unit)},${literal(position)},'ACTIVE')`);
        const allowed = async () => {
          if (operations.discover) assert.ok((await operations.discover(account)).some(center => center.id === unitA));
          for (const read of reads) await read(account);
          scenarios++;
        };
        const denied = async label => {
          const before = await snapshot();
          if (operations.discover) assert.ok(!(await operations.discover(account)).some(center => center.id === unitA), label + ': discovery');
          const expected = error => String(error.message).includes(operations.denial);
          for (const read of reads) await assert.rejects(read(account), expected, label + ': read');
          await assert.rejects(operations.decide(account), error => String(error.message).includes(operations.decisionDenial ?? operations.denial), label + ': decision');
          assert.deepEqual(await snapshot(), before, label + ': no decision or audit write');
          scenarios++;
        };
        await allowed();
        await run(`UPDATE "Position" SET "orgUnitId"=${literal(unitB)} WHERE id=${literal(position)}`);
        await denied(role + ': position belongs to another organization');
        await run(`UPDATE "Position" SET "orgUnitId"=${literal(otherUnit)} WHERE id=${literal(position)}`);
        await denied(role + ': position belongs to another unit in the same organization');
        await run(`UPDATE "Position" SET "orgUnitId"=${literal(unit)} WHERE id=${literal(position)}`);
        await run(`UPDATE "OrgUnit" SET active=FALSE WHERE id=${literal(unit)}`);
        await denied(role + ': inactive unit');
        await run(`UPDATE "OrgUnit" SET active=TRUE WHERE id=${literal(unit)}`);
        if (role !== 'CENTER_MANAGER') {
          await run(`UPDATE "Employment" SET "orgUnitId"=${literal(foreignHq)} WHERE id=${literal(employment)}`);
          await run(`UPDATE "Position" SET "orgUnitId"=${literal(foreignHq)} WHERE id=${literal(position)}`);
          await denied(role + ': employment organization differs from HQ organization');
          await run(`UPDATE "Employment" SET "orgUnitId"=${literal(hq)} WHERE id=${literal(employment)}`);
          await run(`UPDATE "Position" SET "orgUnitId"=${literal(hq)} WHERE id=${literal(position)}`);
        }
        await allowed();
      } finally {
        await run(`UPDATE "OrgUnit" SET active=TRUE WHERE id=${literal(unit)}`);
        await run(`DELETE FROM "Employment" WHERE id=${literal(employment)}`);
        await run(`DELETE FROM "Position" WHERE id=${literal(position)}`);
        await run(`DELETE FROM "Account" WHERE id=${literal(account)}`);
        await run(`DELETE FROM "Person" WHERE id=${literal(account)}`);
      }
    }
  } finally {
    await run(`DELETE FROM "OrgUnit" WHERE id IN (${[hq, otherUnit, foreignHq].map(literal).join(',')})`);
  }
  return scenarios;
}
