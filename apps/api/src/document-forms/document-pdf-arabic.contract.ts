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


type BidiApi = {
  getEmbeddingLevels(text: string, explicitDirection?: 'ltr' | 'rtl'): unknown;
  getReorderedString(text: string, embeddingLevels: unknown): string;
};

let bidiApi: BidiApi | null = null;

type ArabicForms = readonly [isolated: string, final: string, initial?: string, medial?: string];

// pdf-lib embeds OpenType glyphs but does not perform Arabic GSUB shaping.  The
// presentation forms below make the joining explicit before the BiDi pass.
const ARABIC_FORMS: Record<string, ArabicForms> = {
  'آ':['ﺁ','ﺂ'],'أ':['ﺃ','ﺄ'],'ؤ':['ﺅ','ﺆ'],'إ':['ﺇ','ﺈ'],'ئ':['ﺉ','ﺊ','ﺋ','ﺌ'],'ا':['ﺍ','ﺎ'],
  'ب':['ﺏ','ﺐ','ﺑ','ﺒ'],'ة':['ﺓ','ﺔ'],'ت':['ﺕ','ﺖ','ﺗ','ﺘ'],'ث':['ﺙ','ﺚ','ﺛ','ﺜ'],
  'ج':['ﺝ','ﺞ','ﺟ','ﺠ'],'ح':['ﺡ','ﺢ','ﺣ','ﺤ'],'خ':['ﺥ','ﺦ','ﺧ','ﺨ'],'د':['ﺩ','ﺪ'],
  'ذ':['ﺫ','ﺬ'],'ر':['ﺭ','ﺮ'],'ز':['ﺯ','ﺰ'],'س':['ﺱ','ﺲ','ﺳ','ﺴ'],'ش':['ﺵ','ﺶ','ﺷ','ﺸ'],
  'ص':['ﺹ','ﺺ','ﺻ','ﺼ'],'ض':['ﺽ','ﺾ','ﺿ','ﻀ'],'ط':['ﻁ','ﻂ','ﻃ','ﻄ'],'ظ':['ﻅ','ﻆ','ﻇ','ﻈ'],
  'ع':['ﻉ','ﻊ','ﻋ','ﻌ'],'غ':['ﻍ','ﻎ','ﻏ','ﻐ'],'ف':['ﻑ','ﻒ','ﻓ','ﻔ'],'ق':['ﻕ','ﻖ','ﻗ','ﻘ'],
  'ك':['ﻙ','ﻚ','ﻛ','ﻜ'],'ل':['ﻝ','ﻞ','ﻟ','ﻠ'],'م':['ﻡ','ﻢ','ﻣ','ﻤ'],'ن':['ﻥ','ﻦ','ﻧ','ﻨ'],
  'ه':['ﻩ','ﻪ','ﻫ','ﻬ'],'و':['ﻭ','ﻮ'],'ى':['ﻯ','ﻰ'],'ي':['ﻱ','ﻲ','ﻳ','ﻴ'],
  'ٱ':['ﭐ','ﭑ'],'پ':['ﭖ','ﭗ','ﭘ','ﭙ'],'چ':['ﭺ','ﭻ','ﭼ','ﭽ'],'ژ':['ﮊ','ﮋ'],'گ':['ﮒ','ﮓ','ﮔ','ﮕ'],
};

const LAM_ALEF: Record<string, readonly [isolated: string, final: string]> = {
  'آ':['ﻵ','ﻶ'],'أ':['ﻷ','ﻸ'],'إ':['ﻹ','ﻺ'],'ا':['ﻻ','ﻼ'],
};

const isArabicMark = (value: string) => /[\u064B-\u065F\u0670]/u.test(value);
const formsFor = (value: string) => ARABIC_FORMS[value];
const joinsPrevious = (value: string) => (formsFor(value)?.length ?? 0) >= 2;
const joinsNext = (value: string) => (formsFor(value)?.length ?? 0) === 4;

export function shapeArabicForPdf(value: string): string {
  const input = Array.from(value);
  const output: string[] = [];
  for (let index=0; index<input.length; index++) {
    const current = input[index];
    if (isArabicMark(current) || !formsFor(current)) { output.push(current); continue; }

    let nextIndex=index+1;
    while (nextIndex<input.length && isArabicMark(input[nextIndex])) nextIndex++;
    const next=input[nextIndex];
    const ligature=LAM_ALEF[next];
    let previousIndex=index-1;
    while (previousIndex>=0 && isArabicMark(input[previousIndex])) previousIndex--;
    const previous=input[previousIndex];
    const connectsPrevious=joinsPrevious(current) && joinsNext(previous);

    if (current==='ل' && ligature) {
      output.push(ligature[connectsPrevious?1:0]);
      for(let mark=index+1; mark<nextIndex; mark++) output.push(input[mark]);
      index=nextIndex;
      continue;
    }

    const forms=formsFor(current)!;
    const connectsNext=joinsNext(current) && joinsPrevious(next);
    output.push(connectsPrevious && connectsNext ? forms[3]! : connectsPrevious ? forms[1] : connectsNext ? forms[2]! : forms[0]);
  }
  return output.join('');
}

function bidi(): BidiApi {
  if (bidiApi) return bidiApi;
  // bidi-js is CommonJS-compatible at runtime; keeping the require local avoids ESM/CJS interop drift.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const factory = require('bidi-js') as () => BidiApi;
  bidiApi = factory();
  return bidiApi;
}

export function pdfVisualText(value: unknown): string {
  const source = assertArabicPdfSourceText(value);
  if (!containsArabic(source)) return source;
  const engine = bidi();
  const shaped = shapeArabicForPdf(source);
  const levels = engine.getEmbeddingLevels(shaped, 'rtl');
  const visual = engine.getReorderedString(shaped, levels);
  if (!visual || visual.includes('\uFFFD')) throw new Error('Arabic PDF BiDi transformation produced invalid text.');
  return visual;
}
