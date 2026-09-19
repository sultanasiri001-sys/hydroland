import assert from 'node:assert/strict';
import { rewardsPolicy } from '../src/rewards/rewards.policy.js';

assert.equal(rewardsPolicy.earningEnabled,false);
assert.equal(rewardsPolicy.redemptionEnabled,false);
assert.equal(rewardsPolicy.expirationEnabled,false);
assert.equal(rewardsPolicy.earnPointsPerMinor,null);
assert.equal(rewardsPolicy.redemptionValueMinorPerPoint,null);
assert.equal(rewardsPolicy.expirationDays,null);

console.log('Wallet/rewards policy safety validation passed.');
