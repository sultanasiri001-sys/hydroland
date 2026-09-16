import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const schema = await readFile(new URL('apps/api/prisma/schema.prisma', root), 'utf8');
const fragment = await readFile(new URL('apps/api/prisma/hr.prisma.fragment', root), 'utf8');
const migration = await readFile(new URL('apps/api/prisma/migrations/20260916223000_hr_lifecycle/migration.sql', root), 'utf8');

const models = ['OrgUnit','Position','Employment','EmploymentContract','EmploymentMovement','LeaveRequest','AttendanceEntry','PerformanceCycle','EmployeeRelationsCase','OffboardingCase'];
const enums = ['OrgUnitType','EmploymentStatus','WorkerClass','EmploymentMovementType','HrRequestStatus'];

for (const name of [...models, ...enums]) {
  if (!fragment.includes(`${models.includes(name) ? 'model' : 'enum'} ${name}`)) throw new Error(`HR_FRAGMENT_MISSING:${name}`);
}
for (const table of models) {
  if (!migration.includes(`CREATE TABLE \"${table}\"`)) throw new Error(`HR_MIGRATION_MISSING:${table}`);
}
for (const target of ['Organization','Account','Document']) {
  if (!schema.includes(`model ${target} {`)) throw new Error(`CANONICAL_TARGET_MISSING:${target}`);
}

// Deliberately fail until the canonical fragment has been merged into schema.prisma.
for (const model of models) {
  if (!schema.includes(`model ${model} {`)) throw new Error(`HR_SCHEMA_MERGE_PENDING:${model}`);
}

console.log('HR Prisma schema, relations and migration are reconciled.');
