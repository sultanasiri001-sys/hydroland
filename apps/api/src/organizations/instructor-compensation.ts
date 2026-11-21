import { BadRequestException } from '@nestjs/common';

export type InstructorCompensationMode = 'PERCENTAGE' | 'FIXED' | 'FIXED_PLUS_PERCENTAGE' | 'SALARY_ONLY';

export function compensationTerms(input: Record<string, unknown>) {
  const invalid = () => new BadRequestException('تحقق من نوع الاتفاق والنسبة والمبلغ الثابت.');
  if (!input || Array.isArray(input) || Object.keys(input).some(key => !['mode','rateBps','fixedMinor','expectedRevision'].includes(key))) throw invalid();
  const {mode, rateBps, fixedMinor, expectedRevision} = input;
  if (typeof rateBps !== 'number' || !Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000
    || typeof fixedMinor !== 'number' || !Number.isInteger(fixedMinor) || fixedMinor < 0 || fixedMinor > 2147483647
    || typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw invalid();
  if (!['PERCENTAGE','FIXED','FIXED_PLUS_PERCENTAGE','SALARY_ONLY'].includes(String(mode))) throw invalid();
  if ((rateBps > 0) !== (mode === 'PERCENTAGE' || mode === 'FIXED_PLUS_PERCENTAGE')
    || (fixedMinor > 0) !== (mode === 'FIXED' || mode === 'FIXED_PLUS_PERCENTAGE')) throw invalid();
  return {mode: mode as InstructorCompensationMode, rateBps, fixedMinor, expectedRevision};
}

/** Money uses integer halalas, with half a halala rounded up once on the percentage component. */
export function compensationAmount(terms: {rateBps:number;fixedMinor:number}, basisMinor: number) {
  if (!Number.isSafeInteger(basisMinor) || basisMinor < 0 || basisMinor > 2147483647) throw new BadRequestException('أساس النسبة خارج النطاق.');
  return terms.fixedMinor + Math.floor((basisMinor * terms.rateBps + 5000) / 10000);
}
