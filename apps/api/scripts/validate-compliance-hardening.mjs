import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const controllerPath = path.join(root, 'src/safety/safety.controller.ts');
const servicePath = path.join(root, 'src/safety/safety.service.ts');
const tripsPath = path.join(root, 'src/trips/trips.service.ts');

const controller = fs.readFileSync(controllerPath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');
const trips = fs.readFileSync(tripsPath, 'utf8');

const checks = [
  ['safety endpoint rejects complianceControls', controller.includes("'complianceControls' in body")],
  ['safety endpoint rejects complianceEvidence', controller.includes("'complianceEvidence' in body")],
  ['rejection is an explicit BadRequest', controller.includes('throw new BadRequestException')],
  ['controller forwards only checklist items and notes', /this\.safety\.assess\([\s\S]*?\{\s*items:[\s\S]*?notes[\s\S]*?\}\s*\)/m.test(controller)],
  ['service still supports server-side compliance evaluation', service.includes('evaluateComplianceControl')],
  ['service persists compliance assessments when trusted controls exist', service.includes('recordAssessment')],
  ['PASS maps to ALLOWED', service.includes("complianceDecision === 'PASS' ? 'ALLOWED'")],
  ['REVIEW maps to REVIEW_REQUIRED', service.includes("complianceDecision === 'REVIEW' ? 'REVIEW_REQUIRED'")],
  ['BLOCK and ESCALATE map to DEFERRED', service.includes("complianceDecision === 'BLOCK' || complianceDecision === 'ESCALATE'")],
  ['booking gate blocks DEFERRED when enforced', trips.includes("latestSafety.decision==='DEFERRED'") && trips.includes('Trip is deferred by safety or compliance controls.')],
  ['booking gate blocks REVIEW_REQUIRED when enforced', trips.includes("latestSafety.decision==='REVIEW_REQUIRED'") && trips.includes('Trip requires safety or compliance review before booking.')],
  ['booking success is audited after compliance gate', trips.includes("action:'BOOKING_COMPLIANCE_GATE_PASSED'")],
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

console.log('Compliance hardening and booking gate validation passed.');
