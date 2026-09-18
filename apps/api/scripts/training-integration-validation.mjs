import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260919230000_training_persistence/migration.sql');
const repository = read('src/governance/training-repository.service.ts');
const controller = read('src/governance/training.controller.ts');
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
  ['Record route', /@Post\('enrollments\/:id\/record'\)/.test(controller)],
  ['Stage route', /@Post\('records\/:id\/stages'\)/.test(controller)],
  ['Skill route', /@Post\('stages\/:id\/skills'\)/.test(controller)],
  ['Session route', /@Post\('records\/:id\/sessions'\)/.test(controller)],
  ['Progress route', /@Patch\('records\/:id\/progress'\)/.test(controller)],
  ['Controller registered', /controllers:\s*\[TrainingController\]/.test(moduleFile)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (failed.length) {
  console.error(`Training integration validation failed: ${failed.length} check(s)`);
  process.exit(1);
}
console.log(`Training integration validation passed: ${checks.length}/${checks.length}`);
