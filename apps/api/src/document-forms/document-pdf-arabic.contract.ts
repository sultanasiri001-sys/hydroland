/**
 * Strict contract for Arabic PDF rendering.
 * Arabic PDF output is not supported until CI proves these mixed-direction probes.
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
