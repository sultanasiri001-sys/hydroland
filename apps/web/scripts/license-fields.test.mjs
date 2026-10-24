import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractFields} from '../src/hydroland-license-fields.mjs';
test('Arabic digits and labelled Gregorian dates are extracted',()=>{
 assert.deepEqual(extractFields('رقم الرخصة: ABC-١٢٣\nتاريخ الإصدار: ٢٠٢٥/٠١/٠٢\nتاريخ الانتهاء: ٢٠٣٠/٠٢/٠٣'),{referenceNumber:'ABC-123',issuedAt:'2025-01-02',expiresAt:'2030-02-03'});
});
test('ambiguous, invalid, conflicting and Hijri dates stay empty',()=>{
 for(const value of ['01/02/2025','2025-02-30','1447-01-01','2025-01-01 هجري'])assert.equal(extractFields('Issue date: '+value).issuedAt,undefined);
 assert.equal(extractFields('Expiry date: 2026-01-01\nExpiry date: 2027-01-01').expiresAt,undefined);
 assert.deepEqual(extractFields('2025-01-01 2030-01-01'),{});
});
