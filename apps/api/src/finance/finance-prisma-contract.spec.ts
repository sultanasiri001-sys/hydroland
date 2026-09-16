import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const schema=readFileSync(resolve(process.cwd(),'prisma/schema.prisma'),'utf8');
const migration=readFileSync(resolve(process.cwd(),'prisma/migrations/20260917003500_finance_accountant_shifts/migration.sql'),'utf8');

const requiredSchemaTokens=[
  'enum FinanceShiftStatus',
  'enum FinanceEntryType',
  'enum FinanceHandoverStatus',
  'model FinanceAccountantShift',
  'model FinanceShiftEntry',
  'model FinanceShiftHandover',
];

for(const token of requiredSchemaTokens){
  if(!schema.includes(token))throw new Error(`FINANCE_PRISMA_SCHEMA_DRIFT:${token}`);
}

for(const table of ['FinanceAccountantShift','FinanceShiftEntry','FinanceShiftHandover']){
  if(!migration.includes(`CREATE TABLE \"${table}\"`))throw new Error(`FINANCE_MIGRATION_CONTRACT_MISSING:${table}`);
}

console.log('Finance Prisma contract OK');
