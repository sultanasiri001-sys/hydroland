import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const schema=readFileSync(resolve(process.cwd(),'prisma/schema.prisma'),'utf8');
const shiftMigration=readFileSync(resolve(process.cwd(),'prisma/migrations/20260917003500_finance_accountant_shifts/migration.sql'),'utf8');
const receivablesMigration=readFileSync(resolve(process.cwd(),'prisma/migrations/20260917013000_finance_receivables/migration.sql'),'utf8');
const deferredInvoiceMigration=readFileSync(resolve(process.cwd(),'prisma/migrations/20260917014500_finance_deferred_invoice/migration.sql'),'utf8');
const shiftService=readFileSync(resolve(process.cwd(),'src/finance/finance-shifts.service.ts'),'utf8');
const receivablesService=readFileSync(resolve(process.cwd(),'src/finance/finance-receivables.service.ts'),'utf8');

// Finance L2 deliberately uses the repository's established DatabaseService raw-SQL boundary
// for its new persistence tables. Prisma still owns the shared legacy schema/client; therefore
// finance migration tables must not be falsely required as generated Prisma models.
for(const token of ['model Account','model Payment','model Invoice','model OrgUnit']){
  if(!schema.includes(token))throw new Error(`FINANCE_SHARED_PRISMA_CONTRACT_MISSING:${token}`);
}

for(const table of ['FinanceAccountantShift','FinanceShiftEntry','FinanceShiftHandover']){
  if(!shiftMigration.includes(`CREATE TABLE \"${table}\"`))throw new Error(`FINANCE_SHIFT_MIGRATION_CONTRACT_MISSING:${table}`);
  if(!shiftService.includes(`\"${table}\"`))throw new Error(`FINANCE_SHIFT_SERVICE_CONTRACT_MISSING:${table}`);
}

for(const table of ['Receivable','ReceivableInstallment','ReceivablePayment']){
  if(!receivablesMigration.includes(`CREATE TABLE \"${table}\"`))throw new Error(`FINANCE_AR_MIGRATION_CONTRACT_MISSING:${table}`);
  if(!receivablesService.includes(`\"${table}\"`))throw new Error(`FINANCE_AR_SERVICE_CONTRACT_MISSING:${table}`);
}

if(!deferredInvoiceMigration.includes('ALTER COLUMN \"paymentId\" DROP NOT NULL')){
  throw new Error('FINANCE_DEFERRED_INVOICE_NULLABILITY_MISSING');
}

console.log('Finance L2 persistence boundary contract OK');
