import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/rewards/rewards.policy.ts',import.meta.url),'utf8');
for(const expected of ['earningEnabled: false','redemptionEnabled: false','expirationEnabled: false','earnPointsPerMinor: null','redemptionValueMinorPerPoint: null','expirationDays: null']) assert.ok(source.includes(expected),'Missing safe default: '+expected);
console.log('Wallet/rewards policy safety validation passed.');
