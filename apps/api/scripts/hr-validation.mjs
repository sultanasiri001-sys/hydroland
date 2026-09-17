import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const schema = await readFile(new URL('apps/api/prisma/schema.prisma', root), 'utf8');
const migration = await readFile(new URL('apps/api/prisma/migrations/20260916223000_hr_lifecycle/migration.sql', root), 'utf8');
const l3 = await readFile(new URL('docs/HR_LEVEL_3_EMPLOYEE_LIFECYCLE.md', root), 'utf8');
const l4 = await readFile(new URL('docs/HR_LEVEL_4_GOVERNANCE.md', root), 'utf8');
const gate = await readFile(new URL('docs/HR_COMPLETION_GATE.md', root), 'utf8');

const requiredEntities = ['OrgUnit','Position','Employment','EmploymentContract','EmploymentMovement','LeaveRequest','AttendanceEntry','ShiftAssignment','CompensationTerm','PerformanceCycle','EmployeeRelationsCase','OffboardingCase'];
for (const entity of requiredEntities) {
  if (!migration.includes(`CREATE TABLE \"${entity}\"`)) throw new Error(`Missing HR migration entity: ${entity}`);
  if (!schema.includes(`model ${entity} {`)) throw new Error(`Missing canonical HR Prisma model: ${entity}`);
}
for (const token of ['HQ','REGION','CENTER','DEPARTMENT','UNIT','TEAM']) {
  if (!migration.includes(`'${token}'`)) throw new Error(`Missing organization hierarchy level: ${token}`);
}
for (const token of ['Maker','Reviewer','Approver','IAM','Audit','external centers']) {
  if (!l4.toLowerCase().includes(token.toLowerCase()) && !l3.toLowerCase().includes(token.toLowerCase())) throw new Error(`Missing HR governance control: ${token}`);
}
if (!gate.includes('HR is NOT COMPLETE')) throw new Error('HR completion fail-closed rule missing');
console.log('HR L1-L4 architecture, canonical schema, migration and governance validated.');
