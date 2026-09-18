import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260919230000_training_persistence/migration.sql');
const repository = read('src/governance/training-repository.service.ts');
const controller = read('src/governance/training.controller.ts');
const authorization = read('src/governance/training-authorization.service.ts');
const moduleFile = read('src/governance/governance.module.ts');

const checks = [
  ['TrainingEnrollment model', /model TrainingEnrollment\s*\{/.test(schema)],
  ['TrainingRecord model', /model TrainingRecord\s*\{/.test(schema)],
  ['TrainingStage model', /model TrainingStage\s*\{/.test(schema)],
  ['TrainingSkill model', /model TrainingSkill\s*\{/.test(schema)],
  ['TrainingSession model', /model TrainingSession\s*\{/.test(schema)],
  ['Migration enrollment table', /CREATE TABLE "TrainingEnrollment"/.test(migration)],
  ['Migration record table', /CREATE TABLE "TrainingRecord"/.test(migration)],
  ['Repository create enrollment', /createEnrollment\(/.test(repository)],
  ['Repository full enrollment graph', /skills: true/.test(repository) && /sessions: true/.test(repository)],
  ['Repository progress update', /setRecordProgress\(/.test(repository)],
  ['Repository session lifecycle', /createSession\(/.test(repository) && /setSessionStatus\(/.test(repository)],
  ['Authenticated training controller', /@UseGuards\(AccessTokenGuard\)/.test(controller)],
  ['Self enrollment route', /@Post\('enrollments'\)/.test(controller)],
  ['Student enrollment list route', /@Get\('mine\/enrollments'\)/.test(controller)],
  ['Enrollment read authorization', /assertEnrollmentAccess\(request\.auth\.accountId, id, true\)/.test(controller)],
  ['Instructor assignment admin scope', /assertAdministrativeEnrollmentAccess\(request\.auth\.accountId, id\)/.test(controller)],
  ['Record authorization', /assertRecordAccess\(request\.auth\.accountId, id\)/.test(controller)],
  ['Stage authorization', /assertStageAccess\(request\.auth\.accountId, id\)/.test(controller)],
  ['Session authorization', /assertSessionAccess\(request\.auth\.accountId, id\)/.test(controller)],
  ['Active global admin bypass', /status: 'ACTIVE', role: 'ADMIN'/.test(authorization)],
  ['Assigned instructor requires active role', /enrollment\.instructorAccountId !== accountId/.test(authorization) && /status: 'ACTIVE', role: 'INSTRUCTOR'/.test(authorization)],
  ['Center scope requires active membership', /organizationId: centerOrganizationId/.test(authorization) && /status: 'ACTIVE'/.test(authorization)],
  ['Center-wide roles exclude instructor', /role: \{ in: \['OWNER', 'ADMIN', 'OPERATOR'\] \}/.test(authorization)],
  ['Student access is explicit read-only option', /allowStudent && enrollment\.studentAccountId === accountId/.test(authorization)],
  ['Authorization service registered', /TrainingAuthorizationService/.test(moduleFile)],
  ['Legacy AdminGuard removed from training controller', !/AdminGuard/.test(controller)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (failed.length) {
  console.error(`Training integration validation failed: ${failed.length} check(s)`);
  process.exit(1);
}
console.log(`Training integration validation passed: ${checks.length}/${checks.length}`);
