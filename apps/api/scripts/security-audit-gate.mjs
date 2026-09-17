import { execFileSync } from 'node:child_process';

let report;
try {
  const output = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  report = JSON.parse(output);
} catch (error) {
  const output = error?.stdout?.toString?.() || '';
  if (!output.trim()) throw error;
  report = JSON.parse(output);
}

const vulnerabilities = report?.metadata?.vulnerabilities ?? {};
const critical = Number(vulnerabilities.critical ?? 0);
const high = Number(vulnerabilities.high ?? 0);
const moderate = Number(vulnerabilities.moderate ?? 0);
const low = Number(vulnerabilities.low ?? 0);

console.log(`[security] production dependency audit: critical=${critical}, high=${high}, moderate=${moderate}, low=${low}`);

if (critical > 0 || high > 0) {
  console.error('[security] gate failed: production dependencies contain high/critical vulnerabilities.');
  process.exit(1);
}

console.log('[security] gate passed: no high/critical production dependency vulnerabilities.');
