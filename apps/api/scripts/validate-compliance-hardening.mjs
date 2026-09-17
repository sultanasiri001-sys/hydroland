import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const controllerPath = path.join(root, 'src/safety/safety.controller.ts');
const servicePath = path.join(root, 'src/safety/safety.service.ts');

const controller = fs.readFileSync(controllerPath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');

const checks = [
  ['safety endpoint rejects complianceControls', controller.includes("'complianceControls' in body")],
  ['safety endpoint rejects complianceEvidence', controller.includes("'complianceEvidence' in body")],
  ['rejection is an explicit BadRequest', controller.includes('throw new BadRequestException')],
  ['controller forwards only checklist items and notes', /this\.safety\.assess\([\s\S]*?\{\s*items:[\s\S]*?notes[\s\S]*?\}\s*\)/m.test(controller)],
  ['service still supports server-side compliance evaluation', service.includes('evaluateComplianceControl')],
  ['service persists compliance assessments when trusted controls exist', service.includes('recordAssessment')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('Compliance hardening validation failed.');
  process.exit(1);
}

console.log('Compliance hardening validation passed.');
