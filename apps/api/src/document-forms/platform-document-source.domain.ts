import { createHash } from 'node:crypto';

// Server-owned, versioned evidence. It is not a template field or a client value.
export const PLATFORM_SOURCE_KEY = '_platformSources';
export const SOURCE_KINDS = ['ACCOUNT','EMPLOYMENT','LEAVE_REQUEST','TRAINING_ENROLLMENT','DIVE_LOG','BOOKING_PARTICIPANT','CUSTOMER_CASE','MARINE_ASSET','TRIP','BOOKING','FINANCE_ENTRY','ADMINISTRATIVE_RECORD'] as const;
export type SourceKind = typeof SOURCE_KINDS[number];
export type SourceValue = string | number | boolean | null;
export type SourceReference = { kind: SourceKind; id: string };
export type SourceField = { key: string; labelAr: string; value: SourceValue };
export type SourceRecord = { kind: string; id: string; updatedAt: string | null; fields: SourceField[] };
export type SourceSnapshot = { schemaVersion: 1; organizationId: string; capturedAt: string; capturedByAccountId: string; fingerprint: string; records: SourceRecord[]; bindings: Record<string, SourceValue> };
export type SourceBinding = { references: SourceReference[]; expectedFingerprint: string };
export class SourceInputError extends Error {}
const plain = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v)));
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v);
const value = (v: unknown): v is SourceValue => v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v) || typeof v === 'string' && v.length <= 8000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(k => keys.includes(k));
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (plain(v)) return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
export const sourceDigest = (v: unknown): string => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export function sourceReferences(input: unknown): SourceReference[] {
  if (!Array.isArray(input) || input.length > 4) throw new SourceInputError('اختر حتى أربعة سجلات مصدرية.');
  const seen = new Set<string>();
  return input.map(v => {
    if (!plain(v) || !exact(v,['kind','id']) || !SOURCE_KINDS.includes(v.kind as SourceKind) || !uuid(v.id)) throw new SourceInputError('مرجع المصدر غير صالح.');
    const r = {kind: v.kind as SourceKind, id: v.id.toLowerCase()};
    if (seen.has(r.kind+':'+r.id)) throw new SourceInputError('مرجع المصدر مكرر.');
    seen.add(r.kind+':'+r.id); return r;
  });
}
export function sourceBinding(input: unknown): SourceBinding {
  if (!plain(input) || !exact(input,['references','expectedFingerprint'])) throw new SourceInputError('بيانات ربط المصدر غير صالحة.');
  const references = sourceReferences(input.references);
  if (typeof input.expectedFingerprint !== 'string' || (references.length ? !/^[a-f\d]{64}$/.test(input.expectedFingerprint) : input.expectedFingerprint !== '')) throw new SourceInputError('افحص بيانات المصدر قبل الحفظ.');
  return {references, expectedFingerprint:input.expectedFingerprint};
}
export function validateSourceSnapshot(input: unknown): asserts input is SourceSnapshot {
  if (!plain(input) || !exact(input,['schemaVersion','organizationId','capturedAt','capturedByAccountId','fingerprint','records','bindings']) || input.schemaVersion !== 1 || !uuid(input.organizationId) || !uuid(input.capturedByAccountId)
      || typeof input.capturedAt !== 'string' || !Number.isFinite(Date.parse(input.capturedAt)) || typeof input.fingerprint !== 'string' || !/^[a-f\d]{64}$/.test(input.fingerprint)
      || !Array.isArray(input.records) || !input.records.length || input.records.length > 5 || !plain(input.bindings)) throw new SourceInputError('أدلة مصدر المستند غير صالحة.');
  const seen = new Set<string>(); let count=0;
  for (const record of input.records) {
    if (!plain(record) || !exact(record,['kind','id','updatedAt','fields']) || !['AUTHOR',...SOURCE_KINDS].includes(record.kind as never) || !uuid(record.id)
        || !(record.updatedAt === null || typeof record.updatedAt === 'string' && Number.isFinite(Date.parse(record.updatedAt))) || !Array.isArray(record.fields) || record.fields.length > 80) throw new SourceInputError('سجل المصدر غير صالح.');
    const key=record.kind+':'+record.id;if(seen.has(key))throw new SourceInputError('سجل مصدر مكرر.');seen.add(key);
    const fields=new Set<string>();
    for (const f of record.fields) {
      if (!plain(f) || !exact(f,['key','labelAr','value']) || typeof f.key !== 'string' || !/^[A-Za-z][A-Za-z\d_.]{0,159}$/.test(f.key) || fields.has(f.key)
          || typeof f.labelAr !== 'string' || !f.labelAr.trim() || f.labelAr.length>160 || !value(f.value)) throw new SourceInputError('حقل المصدر غير صالح.');
      fields.add(f.key);count++;
    }
  }
  const authors=input.records.filter((r:any)=>r.kind==='AUTHOR');
  if(authors.length!==1||authors[0].id!==input.capturedByAccountId)throw new SourceInputError('هوية معدّ المستند لا تطابق مصدرها.');
  if (count>260 || Object.keys(input.bindings).length>100 || Object.entries(input.bindings).some(([k,v])=> !/^[A-Za-z][A-Za-z\d_]{0,99}$/.test(k) || ['constructor','prototype','__proto__'].includes(k) || !value(v))) throw new SourceInputError('بيانات المصدر تتجاوز الحدود.');
  if (sourceDigest({organizationId:input.organizationId,records:input.records,bindings:input.bindings})!==input.fingerprint || Buffer.byteLength(JSON.stringify(input))>64000) throw new SourceInputError('بصمة مصدر المستند غير مطابقة.');
}
export function sourceSnapshot(payload: Record<string, unknown>, organizationId?: string): SourceSnapshot | null {
  if (!Object.hasOwn(payload,PLATFORM_SOURCE_KEY)) return null;
  const snapshot=payload[PLATFORM_SOURCE_KEY];validateSourceSnapshot(snapshot);
  if (organizationId && snapshot.organizationId!==organizationId) throw new SourceInputError('مصدر المستند لا يطابق الجهة.');
  return snapshot;
}
export function sourcePrintFields(snapshot: SourceSnapshot) {
  validateSourceSnapshot(snapshot);
  const roles: Record<string,string> = {AUTHOR:'معدّ النموذج',ACCOUNT:'الحساب المختار',EMPLOYMENT:'الموظف',LEAVE_REQUEST:'الإجازة',TRAINING_ENROLLMENT:'التدريب',DIVE_LOG:'الغوص',BOOKING_PARTICIPANT:'المشارك',CUSTOMER_CASE:'العميل',MARINE_ASSET:'الوسيلة البحرية',TRIP:'الرحلة',BOOKING:'الحجز',FINANCE_ENTRY:'المعاملة المالية',ADMINISTRATIVE_RECORD:'المعاملة الإدارية'};
  return snapshot.records.flatMap((r,i)=>r.fields.map(f=>({key:`platform-source-${i}-${f.key}`,labelAr:`${roles[r.kind]} — ${f.labelAr}`,labelEn:f.key,type:'TEXT',required:false,value:f.value===null?'غير مسجل في المصدر':f.value})));
}
