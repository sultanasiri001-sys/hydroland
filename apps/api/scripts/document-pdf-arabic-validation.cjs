const assert = require('node:assert/strict');
const { ARABIC_PDF_PROBES, assertArabicPdfSourceText, containsArabic, pdfTextDirection, pdfTextX, preferredLocalizedText } = require('../.tmp-document-pdf-arabic/document-pdf-arabic.contract.js');

assert.equal(ARABIC_PDF_PROBES.length, 5);
for (const probe of ARABIC_PDF_PROBES) {
  assert.equal(assertArabicPdfSourceText(probe), probe, 'Arabic source text must remain lossless');
  assert.equal(containsArabic(probe), true, 'Probe must contain Arabic code points');
  assert.equal(probe.includes('?'), false, 'Arabic probe must never degrade to question marks');
}
assert.equal(containsArabic('HYD-SAFETY-2026-000001'), false);
assert.equal(assertArabicPdfSourceText('English 123'), 'English 123');
assert.throws(() => assertArabicPdfSourceText('عربي?'), /must not be ASCII-sanitized/);
assert.equal(pdfTextDirection('منصة هايدرولاند'), 'rtl');
assert.equal(pdfTextDirection('HYDROLAND 2026'), 'ltr');
assert.equal(pdfTextDirection('رقم HYD-2026-000001'), 'rtl');
assert.equal(pdfTextX('منصة هايدرولاند', 595.28, 48, 48, 120), 427.28);
assert.equal(pdfTextX('HYDROLAND', 595.28, 48, 48, 120), 48);
assert.equal(preferredLocalizedText(' مركز الغوص ', 'Dive Center'), 'مركز الغوص');
assert.equal(preferredLocalizedText('', 'Dive Center'), 'Dive Center');
assert.throws(() => pdfTextX('عربي', Number.NaN, 48, 48, 100), /geometry must be finite/);
console.log('Document Arabic PDF RTL validation passed.');
