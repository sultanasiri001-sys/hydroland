import { BadRequestException } from '@nestjs/common';

const textFields = ['family','size','color','barcode','category','brand'] as const;
type Details = Record<typeof textFields[number],string> & {
  salePriceMinor: number | null; startsAt: string | null; endsAt: string | null;
};
const invalid = () => new BadRequestException('تحقق من خيارات المنتج وسعر الخصم وفترته.');
export function catalogDetails(value: unknown, base: number): Details {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const input = value as Record<string,unknown>;
  const fields: string[] = [...textFields,'salePriceMinor','startsAt','endsAt'];
  if (Object.keys(input).some(key => !fields.includes(key))) throw invalid();
  const labels = {} as Record<typeof textFields[number],string>;
  for (const key of textFields) {
    const label = input[key] ?? '';
    if (typeof label !== 'string' || label.length > 100 || /[\u0000-\u001f]/.test(label)) throw invalid();
    labels[key] = label.trim();
  }
  const sale = input.salePriceMinor ?? null;
  if (sale !== null && (typeof sale !== 'number' || !Number.isSafeInteger(sale) || sale <= 0 || sale >= base)) throw invalid();
  const time = (v:unknown) => {
    if (v == null || v === '') return null;
    if (typeof v !== 'string' || !/T.*(Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) throw invalid();
    return new Date(v).toISOString();
  };
  const startsAt = time(input.startsAt), endsAt = time(input.endsAt);
  if ((startsAt || endsAt) && sale === null || (startsAt && endsAt && endsAt <= startsAt)) throw invalid();
  return {...labels,salePriceMinor:sale as number|null,startsAt,endsAt};
}

export function catalogPrice<T extends {priceMinor:number;catalogDetails?:unknown}>(product:T, at:Date) {
  const details = product.catalogDetails == null ? null : catalogDetails(product.catalogDetails,product.priceMinor);
  const now = at.toISOString();
  const sale = details?.salePriceMinor != null && (!details.startsAt || details.startsAt <= now)
    && (!details.endsAt || now < details.endsAt);
  return {...product, listPriceMinor:product.priceMinor, priceMinor:sale ? details!.salePriceMinor! : product.priceMinor,
    discountActive:Boolean(sale),catalogDetails:details};
}
