import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/rewards/rewards.policy.ts',import.meta.url),'utf8');
for(const expected of ['earningEnabled: false','redemptionEnabled: false','expirationEnabled: false','earnPointsPerMinor: null','redemptionValueMinorPerPoint: null','expirationDays: null']) assert.ok(source.includes(expected),'Missing safe default: '+expected);
console.log('Wallet/rewards policy safety validation passed.');

const wallet=fs.readFileSync(new URL('../src/wallet/wallet.service.ts',import.meta.url),'utf8');
const rewards=fs.readFileSync(new URL('../src/rewards/rewards.service.ts',import.meta.url),'utf8');
for(const expected of ["TransactionIsolationLevel.Serializable","balanceMinor:{gte:input.amountMinor}","Insufficient wallet balance.","idempotencyKey:key"]) assert.ok(wallet.includes(expected),'Missing wallet invariant: '+expected);
for(const expected of ["TransactionIsolationLevel.Serializable","points:{gte:input.points}","Insufficient reward points.","idempotencyKey:key"]) assert.ok(rewards.includes(expected),'Missing rewards invariant: '+expected);
console.log('Wallet/rewards ledger invariant validation passed.');
