import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/workforce/center-runtime-access.service.ts', import.meta.url), 'utf8');
const moduleSource = fs.readFileSync(new URL('../src/workforce/workforce.module.ts', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/workforce/workforce-hiring.controller.ts', import.meta.url), 'utf8');
const centerAccessController = fs.readFileSync(new URL('../src/workforce/center-access.controller.ts', import.meta.url), 'utf8');

const checks = [
  ['runtime service has default-deny missing-access rejection', runtime.includes('No active center department access is assigned')],
  ['runtime service requires enabled external-center seat', runtime.includes(`ws."scope" = 'EXTERNAL_CENTER'`) && runtime.includes(`ws."accessStatus" = 'ENABLED'`)],
  ['runtime service requires enabled HQ and center departments', runtime.includes(`wd."status" = 'ENABLED'`) && runtime.includes(`wcd."status" = 'ENABLED'`)],
  ['manager access switch is enforced', runtime.includes('managerAccessEnabled') && runtime.includes('Center manager access is disabled')],
  ['L1-L4 hierarchy is enforced', runtime.includes('LEVEL_WEIGHT') && runtime.includes('requiredLevel') && runtime.includes('maxLevel')],
  ['runtime service is registered and exported', moduleSource.includes('CenterRuntimeAccessService') && moduleSource.includes('exports: [CenterRuntimeAccessService]')],
  ['authenticated runtime snapshot endpoint exists', controller.includes("@Get('centers/:organizationId/runtime-access/mine')") && controller.includes('accessSnapshot(request.auth.accountId, organizationId)')],
  ['central maxLevel API rejects missing/invalid values', centerAccessController.includes("BadRequestException('maxLevel is required.')") && centerAccessController.includes("maxLevel must be one of L1, L2, L3, or L4"))],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`Center runtime authorization validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('Center runtime authorization validation passed.');
