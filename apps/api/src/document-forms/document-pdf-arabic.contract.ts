/**
 * Strict contract for Arabic PDF rendering.
 * Rendering stays fail-closed until a Unicode Arabic font is embedded.
 */
export const ARABIC_PDF_PROBES = [
  'منصة هايدرولاند',
  'الإجمالي 1,234.50 ر.س',
  'شركة HYDROLAND للأنشطة البحرية',
  'رقم المستند HYD-SAFETY-2026-000001',
  'الحالة (معتمد)',
] as const;

export function assertArabicPdfSourceText(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes('?') && /[\u0600-\u06FF]/u.test(text)) {
    throw new Error('Arabic PDF source text must not be ASCII-sanitized.');
  }
  return text;
}

export function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF]/u.test(value);
}

export type PdfTextDirection = 'ltr' | 'rtl';

export function pdfTextDirection(value: unknown): PdfTextDirection {
  return containsArabic(assertArabicPdfSourceText(value)) ? 'rtl' : 'ltr';
}

export function pdfTextX(value: unknown, width: number, leftMargin: number, rightMargin: number, measuredWidth: number): number {
  if (![width,leftMargin,rightMargin,measuredWidth].every(Number.isFinite)) throw new Error('PDF text geometry must be finite.');
  if (pdfTextDirection(value) === 'rtl') return Math.max(leftMargin, width - rightMargin - measuredWidth);
  return leftMargin;
}

export function preferredLocalizedText(ar: unknown, en: unknown, fallback = ''): string {
  const arabic = assertArabicPdfSourceText(ar).trim();
  if (arabic) return arabic;
  const english = String(en ?? '').trim();
  return english || fallback;
}
