import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { membershipQr } from '../../web/src/hydroland-membership-qr.js';
// Expected module hashes independently generated with Python qrcode, byte mode,
// version 12/M, mask 0, no border. No network QR service or user data is used.
const vectors = [
  ['a', 'a7abf8af23ae5a5ec4400aa34a3808f368d0df6068814a938d675dbfdf902178'],
  ['https://hydroland-web.onrender.com/#membership-pass=hlm1.sample', 'e67940e0b581a15e47c301898b5e9ea50c3c6f14faecb5b09ada0e95d557528e'],
  ['A'.repeat(287), 'f80669838deb7bf54aa55d493b0fc5d3dd9bae6e50d6799bd573df738dd81e1f'],
  ['اختبار', '7080fc1cdbc1e0bcccae330f657c618276bbc1c5399f33f7280c7bfe724458d2'],
];
for (const [input, expected] of vectors) {
  const matrix = membershipQr(input);
  assert.equal(matrix.length, 65);
  assert.ok(matrix.every(row => row.length === 65 && row.every(v => typeof v === 'boolean')));
  assert.equal(createHash('sha256').update(matrix.flat().map(v => v ? '1' : '0').join('')).digest('hex'), expected);
}
for (const input of ['', 'A'.repeat(288), 'غ'.repeat(144), null, {}]) assert.throws(() => membershipQr(input));
console.log('QR reference vectors: 4/4 PASS; length/type rejection: 5/5 PASS');
