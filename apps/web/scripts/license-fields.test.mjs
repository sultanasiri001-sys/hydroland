import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractFields,uncertainOcrLines} from '../src/hydroland-license-fields.mjs';
test('Arabic digits and labelled Gregorian dates are extracted',()=>{
 assert.deepEqual(extractFields('رقم الرخصة: ABC-١٢٣\nتاريخ الإصدار: ٢٠٢٥/٠١/٠٢\nتاريخ الانتهاء: ٢٠٣٠/٠٢/٠٣'),{referenceNumber:'ABC-123',issuedAt:'2025-01-02',expiresAt:'2030-02-03'});
});
test('ambiguous, invalid, conflicting and Hijri dates stay empty',()=>{
 for(const value of ['01/02/2025','2025-02-30','1447-01-01','2025-01-01 هجري'])assert.equal(extractFields('Issue date: '+value).issuedAt,undefined);
 assert.equal(extractFields('Expiry date: 2026-01-01\nExpiry date: 2027-01-01').expiresAt,undefined);
 assert.deepEqual(extractFields('2025-01-01 2030-01-01'),{});
});

test('multiple distinct dates in one labelled value stay manual in Arabic and English',()=>{
 for(const value of [
  'Issue date: 2025-01-01 or 2026-02-02',
  'Issue date: 2025-01-01 / 18-03-2025',
  'تاريخ الإصدار: ٢٠٢٥/٠١/٠١ أو ٢٠٢٦/٠٢/٠٢',
  'تاريخ الاصدار: ۲۰۲۵/۰۱/۰۱ أو ۲۰۲۶/۰۲/۰۲',
 ])assert.equal(extractFields(value).issuedAt,undefined,value);
 assert.equal(extractFields('تاريخ الانتهاء: ٢٠٢٨-٠٧-٢٤ أو ٢٠٢٩-٠٧-٢٤').expiresAt,undefined);
});

test('an unreadable date alternative cannot be discarded in favour of a valid date',()=>{
 for(const value of ['2025-01-01 or 01/02/2025','2025-01-01 or 2025-02-30','2025-01-01 or 1447-01-01']){
  assert.equal(extractFields('Issue date: '+value).issuedAt,undefined,value);
 }
 assert.equal(extractFields('Issue date: 2025-01-01\nIssue date: 01/02/2025').issuedAt,undefined);
 assert.equal(extractFields('تاريخ الانتهاء: ٢٠٣٠-٠١-٠١\nتاريخ الانتهاء: غير مقروء').expiresAt,undefined);
});

test('repeated equivalent dates remain usable while uncertain references stay manual',()=>{
 assert.equal(extractFields('Issue date: 2025-03-18 / 18.03.2025').issuedAt,'2025-03-18');
 assert.equal(extractFields('تاريخ الإصدار: ٢٠٢٥/٣/١٨\nتاريخ الإصدار: ۲۰۲۵-۰۳-۱۸').issuedAt,'2025-03-18');
 assert.deepEqual(extractFields('License number: ABC-123\nLicense number: unreadable ?\nExpiry date: 2030-03-04'),{expiresAt:'2030-03-04'});
});

test('a low-confidence scan cannot supply a reference even when a second page repeats it',()=>{
 const lines=[
  {text:'رقم التصريح: 6211701',words:[{confidence:96},{confidence:91},{confidence:65}]},
  {text:'Issue date: 2025-03-18',words:[{confidence:96},{confidence:98},{confidence:95}]},
 ];
 const text=lines.map(line=>line.text).join('\n');
 const uncertain=uncertainOcrLines({text,blocks:[{paragraphs:[{lines}]}]});
 assert.deepEqual(uncertain,[lines[0].text]);
 assert.deepEqual(extractFields(text+'\nLicense number: 6211701',uncertain),{issuedAt:'2025-03-18'});
 assert.deepEqual(extractFields(text,uncertainOcrLines({text})),{});
 assert.equal(extractFields('License number: 6211701').referenceNumber,'6211701');
});
