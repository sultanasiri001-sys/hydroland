import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const schema = await readFile(new URL('apps/api/prisma/schema.prisma', root), 'utf8');
const migration = await readFile(new URL('apps/api/prisma/migrations/20260916223000_hr_lifecycle/migration.sql', root), 'utf8');

const models = ['OrgUnit','Position','Employment','EmploymentContract','EmploymentMovement','LeaveRequest','AttendanceEntry','ShiftAssignment','CompensationTerm','PerformanceCycle','EmployeeRelationsCase','OffboardingCase'];
const enums = ['OrgUnitType','EmploymentStatus','WorkerClass','EmploymentMovementType','HrRequestStatus'];

for (const name of models) {
  if (!schema.includes(`model ${name} {`)) throw new Error(`HR_SCHEMA_MISSING:${name}`);
  if (!migration.includes(`CREATE TABLE \"${name}\"`)) throw new Error(`HR_MIGRATION_MISSING:${name}`);
}
for (const name of enums) {
  if (!schema.includes(`enum ${name} {`)) throw new Error(`HR_ENUM_MISSING:${name}`);
}
for (const target of ['Organization','Account','Document']) {
  if (!schema.includes(`model ${target} {`)) throw new Error(`CANONICAL_TARGET_MISSING:${target}`);
}
for (const relation of ['EmploymentMovementRequestedBy','EmploymentMovementReviewedBy','EmploymentMovementApprovedBy','LeaveRequestedBy','LeaveApprovedBy','EmployeeRelationsOpenedBy','EmployeeRelationsReviewedBy','EmployeeRelationsApprovedBy','CompensationTermApprovedBy']) {
  if (!schema.includes(`@relation(\"${relation}\"`)) throw new Error(`HR_RELATION_MISSING:${relation}`);
}

console.log('HR canonical Prisma schema and migration are reconciled.');
