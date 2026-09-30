import assert from 'node:assert/strict';
import { membershipDeadline } from '../../web/src/hydroland-membership-time.js';
const stamp = Date.parse('2026-09-30T05:17:00.000Z');
const input = (ttl = 300000) => ({ observedAt: new Date(stamp).toISOString(), expiresAt: new Date(stamp + ttl).toISOString() });
let passed = 0;
const eq = (actual, expected) => { assert.equal(actual, expected); passed++; };
const rejects = (data, start, now, error) => { assert.throws(() => membershipDeadline(data, start, now), { message: error }); passed++; };
for (const offset of [0, 7 * 60000, -7 * 60000, 86400000, -86400000]) {
  const saved = Date.now; Date.now = () => stamp + offset;
  try { eq(membershipDeadline(input(), 1000, 1250), 301000); } finally { Date.now = saved; }
}
eq(membershipDeadline({ ...input(), verifiedAt: new Date(stamp + 290000).toISOString() }, 100, 300), 10100);
eq(membershipDeadline(input(600000), 100, 150), 300100);
eq(membershipDeadline(input(1000), 100, 1099), 1100);
rejects(input(1000), 100, 1100, 'PASS_EXPIRED');
rejects(input(1000), 100, 2000, 'PASS_EXPIRED');
rejects(input(0), 100, 100, 'PASS_EXPIRED');
rejects(input(-1), 100, 100, 'PASS_EXPIRED');
for (const data of [{}, { ...input(), observedAt: undefined }, { ...input(), observedAt: 'bad' }, { ...input(), verifiedAt: 'bad' }, { ...input(), expiresAt: [] }]) rejects(data, 100, 100, 'INVALID_PASS');
for (const [start, now] of [[NaN, 1], [-1, 1], [10, 9], [1, Infinity]]) rejects(input(), start, now, 'INVALID_PASS');
console.log(`Membership monotonic deadline: ${passed} assertions PASS`);
