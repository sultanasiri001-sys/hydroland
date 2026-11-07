import { BadRequestException, ConflictException } from '@nestjs/common';
import { OPERATIONAL_CONTROLS } from '../trips/operational-controls.catalog';
import { decisionDigest, scopeId } from '../document-forms/owner-administrative-decision.domain';
import { templateObject } from '../document-forms/document-template-input';

export const SOURCE_LINK_POLICY = 'OPERATIONAL_SOURCE_REVIEW_LINK_V1';
export const SOURCE_LINK_FIELD = 'operationalSourceReview';
export const SOURCE_LINK_TEMPLATE = 'SAF-OPERATING-CONTROL-MATRIX';
export const SOURCE_LINK_DEPARTMENT = 'SAFETY_COMPLIANCE_RISK';
export const SOURCE_LINK_NOTICE = 'ربط نسخة المصفوفة بالضوابط للمراجعة والتتبع فقط. لا يعتمد مصدرًا أو انطباقًا أو دليلًا، ولا يفعّل إلزامًا أو يغيّر الأعلام أو الرخص. نطاق المراجعة هو نطاق المستند ولا يمتد تلقائيًا إلى بقية المراكز والعمليات.';
export const sourceLinkKey = (org: string, id: string) => `OPERATIONAL_SOURCE_REVIEW:v1:${org}:${id}`;
export const plain = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const identifier = (v:unknown):v is string => typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
export function sourceLinkInput(body: unknown, confirmed = false) {
  const x = templateObject(body, ['documentId','expectedDocumentVersion','reason', ...(confirmed ? ['expectedPlanHash','confirmed'] : [])]);
  scopeId(x.documentId);
  if (!Number.isSafeInteger(x.expectedDocumentVersion) || Number(x.expectedDocumentVersion) < 1 || typeof x.reason !== 'string' || x.reason.trim().length < 5 || x.reason.length > 2000 || /[\u0000-\u001f\u007f]/u.test(x.reason)) throw new BadRequestException('اختر نسخة المستند وأدخل سبب الربط من 5 إلى 2000 حرف.');
  if (confirmed && (x.confirmed !== true || !hash(x.expectedPlanHash))) throw new BadRequestException('راجع المعاينة وأكد ربط النسخة دون اعتماد محتواها.');
  return { documentId:x.documentId as string, version:Number(x.expectedDocumentVersion), reason:x.reason.trim(), expectedPlanHash:confirmed ? x.expectedPlanHash as string : undefined };
}
export function sourceLinkRows(payload: unknown) {
  const rows = plain(payload).operatingControlMatrix;
  const columns = ['المتطلب وإصداره','الانطباق','الضابط','المسؤول','بند الفحص','دليل القبول'] as const;
  if (!Array.isArray(rows) || !rows.length || rows.length > OPERATIONAL_CONTROLS.length) throw new ConflictException('المصفوفة تحتاج صفًا لكل ضابط مطلوب ضمن كتالوج التشغيل.');
  const parsed = rows.map(value => {
    const row = plain(value);
    if (Object.keys(row).some(k => !columns.includes(k as never)) || columns.some(k => !text(row[k]))) throw new ConflictException('أكمل خلايا المصفوفة الست دون حقول غير معروفة.');
    const controlId = String(row['الضابط']).trim();
    if (!OPERATIONAL_CONTROLS.some(c => c.id === controlId)) throw new ConflictException('معرف ضابط المصفوفة غير موجود في كتالوج التشغيل.');
    return { controlId, requirement:String(row[columns[0]]), applicability:String(row[columns[1]]), responsibility:String(row[columns[3]]), inspection:String(row[columns[4]]), acceptance:String(row[columns[5]]) };
  });
  if (new Set(parsed.map(r => r.controlId)).size !== parsed.length) throw new ConflictException('لا تكرر معرف الضابط في المصفوفة.');
  return parsed;
}
export type SourceLinkBatch = {
  policy: typeof SOURCE_LINK_POLICY; id:string; organizationId:string; documentId:string; documentVersion:number; referenceNumber:string;
  sourceDigest:string; authorityDigest:string; controls:Array<{id:string;controlId:string}>; createdByAccountId:string; recordedAt:string; reason:string; digest:string;
};
export function readSourceLinkBatch(value: unknown, org: string, id: string): SourceLinkBatch {
  const x=plain(value), {digest,...body}=x;
  const keys=['policy','id','organizationId','documentId','documentVersion','referenceNumber','sourceDigest','authorityDigest','controls','createdByAccountId','recordedAt','reason','digest'];
  if (Object.keys(x).length!==keys.length || Object.keys(x).some(k=>!keys.includes(k)) || x.policy!==SOURCE_LINK_POLICY || x.id!==id || x.organizationId!==org || !uuid(x.id) || !identifier(x.documentId) || !identifier(x.createdByAccountId)
    || !Number.isSafeInteger(x.documentVersion) || Number(x.documentVersion)<1 || !text(x.referenceNumber) || !hash(x.sourceDigest) || !hash(x.authorityDigest) || !text(x.recordedAt) || !Number.isFinite(Date.parse(x.recordedAt)) || !text(x.reason) || x.reason.length>2000
    || !Array.isArray(x.controls) || !x.controls.length || x.controls.length>OPERATIONAL_CONTROLS.length || x.controls.some(v=>{const c=plain(v);return Object.keys(c).length!==2||!text(c.id)||!OPERATIONAL_CONTROLS.some(v=>v.id===c.controlId);})
    || new Set(x.controls.map(v=>plain(v).controlId)).size!==x.controls.length || new Set(x.controls.map(v=>plain(v).id)).size!==x.controls.length || !hash(digest) || decisionDigest(body)!==digest) throw new ConflictException('سجل ربط المصفوفة غير متسق؛ يلزم إعادة مراجعته.');
  return x as SourceLinkBatch;
}
export function sourceLinkPointer(metadata: unknown) {
  const m=plain(metadata);
  if (!Object.hasOwn(m,SOURCE_LINK_FIELD)) return null;
  const p=plain(m[SOURCE_LINK_FIELD]);
  if (Object.keys(p).length!==3 || p.policy!==SOURCE_LINK_POLICY || !uuid(p.id) || !hash(p.digest)) throw new ConflictException('مؤشر ربط المصفوفة غير متسق.');
  return {policy:SOURCE_LINK_POLICY,id:p.id,digest:p.digest};
}
