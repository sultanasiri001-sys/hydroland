const assert = require('node:assert/strict');
const { ARABIC_PDF_PROBES, assertArabicPdfSourceText, containsArabic } = require('../.tmp-document-pdf-arabic/document-pdf-arabic.contract.js');

assert.equal(ARABIC_PDF_PROBES.length, 5);
for (const probe of ARABIC_PDF_PROBES) {
  assert.equal(assertArabicPdfSourceText(probe), probe, 'Arabic source text must remain lossless');
  assert.equal(containsArabic(probe), true, 'Probe must contain Arabic code points');
  assert.equal(probe.includes('?'), false, 'Arabic probe must never degrade to question marks');
}
assert.equal(containsArabic('HYD-SAFETY-2026-000001'), false);
assert.equal(assertArabicPdfSourceText('English 123'), 'English 123');
assert.throws(() => assertArabicPdfSourceText('عربي?'), /must not be ASCII-sanitized/);
console.log('Document Arabic PDF RTL validation passed.');
