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

for(const expected of ["error.code==='P2002'||error.code==='P2034'","attempt<2)continue","Wallet mutation could not be serialized."]) assert.ok(wallet.includes(expected),'Missing wallet concurrency guard: '+expected);
for(const expected of ["error.code==='P2002'||error.code==='P2034'","attempt<2)continue","Reward mutation could not be serialized."]) assert.ok(rewards.includes(expected),'Missing rewards concurrency guard: '+expected);
console.log('Wallet/rewards concurrency guard validation passed.');

for(const expected of [
  "input.type==='EARN'&&(!rewardsPolicy.earningEnabled||rewardsPolicy.earnPointsPerMinor===null)",
  "input.type==='REDEEM'&&(!rewardsPolicy.redemptionEnabled||rewardsPolicy.redemptionValueMinorPerPoint===null)",
  "input.type==='EXPIRE'",
  "if(input.expiresAt)",
  "input.type==='ADJUSTMENT'"
]) assert.ok(rewards.includes(expected),'Missing rewards activation gate: '+expected);
console.log('Rewards activation gate validation passed.');

const walletPolicy=fs.readFileSync(new URL('../src/wallet/wallet.policy.ts',import.meta.url),'utf8');
for(const expected of ['creditEnabled: false','debitEnabled: false','refundEnabled: false','adjustmentEnabled: false']) assert.ok(walletPolicy.includes(expected),'Missing wallet fail-closed default: '+expected);
for(const expected of [
  "input.type==='CREDIT'&&!walletMutationPolicy.creditEnabled",
  "input.type==='DEBIT'&&!walletMutationPolicy.debitEnabled",
  "input.type==='REFUND'&&!walletMutationPolicy.refundEnabled",
  "input.type==='ADJUSTMENT'&&!walletMutationPolicy.adjustmentEnabled"
]) assert.ok(wallet.includes(expected),'Missing wallet activation gate: '+expected);
console.log('Wallet fail-closed mutation policy validation passed.');

const storeService=fs.readFileSync(new URL('../src/store/store.service.ts',import.meta.url),'utf8');
assert.ok(storeService.includes("status==='FULFILLED'"),'Missing store fulfillment payment boundary');
assert.ok(storeService.includes("payment.status!=='CAPTURED'"),'FULFILLED must require CAPTURED payment');
assert.ok(storeService.includes("provider:'NOT_SELECTED'"),'Payment provider must remain explicitly unselected until configured');
assert.ok(storeService.includes("financialActionExecuted:false"),'Payment preparation must remain non-financial until provider integration');
console.log('Store payment boundary validation passed.');

assert.ok(storeService.includes("payment?.status==='CAPTURED'"),'Captured payments must block cancellation until refund flow exists');
assert.ok(storeService.includes("Captured payment requires an approved refund flow before cancellation."),'Missing captured-payment cancellation guard');
assert.ok(storeService.includes("throw new ConflictException('Idempotency key cannot be reused')"),'Payment idempotency reuse must be a conflict');
console.log('Store cancellation/refund boundary validation passed.');
