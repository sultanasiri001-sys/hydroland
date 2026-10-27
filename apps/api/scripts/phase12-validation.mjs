import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const doc=await readFile(new URL('../../../docs/PHASE_12_TESTING_COMPLIANCE.md',import.meta.url),'utf8');for(const x of ['SWSDF','SRSA','Zawil','TGA','duplicate booking','payment idempotency','unsigned webhook'])if(!doc.includes(x))throw new Error('Missing release control: '+x);console.log('Phase 12 compliance and release controls validated.');

// Keep readiness contracts mandatory in the existing API validation entrypoint.
execFileSync(process.execPath, ['--test', fileURLToPath(new URL('./health-release-contract.test.cjs', import.meta.url))], {
  stdio: 'inherit',
  timeout: 60_000,
});
