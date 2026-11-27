import {useState} from 'react';
import {useProduct} from './product-context';
import {useProductAction} from './product-hooks';
import {Row, date, object, text} from './product-model';
import {Button, Card, Field, Notice, Paragraph} from './product-ui';

const labels: Record<string, [string, string]> = {
  ACTIVE: ['نشط', 'Active'], PENDING: ['قيد الانتظار', 'Pending'], CONFIRMED: ['مؤكد', 'Confirmed'], CANCELLED: ['ملغي', 'Cancelled'], COMPLETED: ['مكتمل', 'Completed'], REJECTED: ['مرفوض', 'Rejected'], SUSPENDED: ['موقوف', 'Suspended'],
  UNVERIFIED: ['لم يُتحقق منه', 'Unverified'], VERIFIED: ['تم التحقق', 'Verified'], DOCUMENT_VERIFIED: ['تم التحقق من الوثيقة', 'Document verified'],
  PAID: ['مدفوع', 'Paid'], CAPTURED: ['محصّل', 'Captured'], SUCCEEDED: ['ناجح', 'Succeeded'], CREATED: ['أُنشئ', 'Created'], FAILED: ['تعذر', 'Failed'], REFUND_REQUESTED: ['طُلب الاسترداد', 'Refund requested'], REFUNDED: ['مسترد', 'Refunded'],
  OPEN: ['مفتوح', 'Open'], CLOSED: ['مغلق', 'Closed'], DRAFT: ['مسودة', 'Draft'], FINALIZED: ['نهائي', 'Finalized'], BLOCKED: ['محجوب', 'Blocked'], NOT_STARTED: ['لم يبدأ', 'Not started'], IN_PROGRESS: ['جارٍ', 'In progress'], COMPETENT: ['متقن', 'Competent'], NEEDS_REVIEW: ['يحتاج مراجعة', 'Needs review'],
  SCHEDULED: ['مجدول', 'Scheduled'], CHECK_IN_OPEN: ['الحضور مفتوح', 'Check-in open'], ELIGIBLE: ['مؤهل', 'Eligible'], APPROVED: ['معتمد', 'Approved'], SETTLED: ['تمت التسوية', 'Settled'], DELIVERED: ['تم التسليم', 'Delivered'], PROVIDER_ACCEPTED: ['قبله المزود', 'Provider accepted'], PENDING_REVIEW: ['بانتظار المراجعة', 'Awaiting review'], NOT_CONNECTED: ['غير مربوط', 'Not connected'], UNKNOWN: ['غير متحقق', 'Unknown'],
  READ: ['مقروء', 'Read'], INACTIVE: ['غير نشط', 'Inactive'], ISSUED: ['صادرة', 'Issued'], REVIEW_REQUIRED: ['تحتاج مراجعة', 'Review required'],
};
export function State({value}: {value: unknown}) {
  const {t} = useProduct(); const key = text(value), known = labels[key];
  return <Paragraph>{known ? t(known[0], known[1]) : key}</Paragraph>;
}
export function Facts({items}: {items: Array<[string, unknown]>}) {
  return <>{items.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <Paragraph key={label}>{label}: {text(value)}</Paragraph>)}</>;
}
export type FormField = {key: string; ar: string; en: string; maxLength?: number; multiline?: boolean; keyboard?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad'; required?: boolean};
/** Forms submit only an explicit list of editable contract fields. */
export function RecordForm({title, initial = {}, fields, save, onSaved, testID}: {title: string; initial?: Row; fields: FormField[]; save: (body: Row) => Promise<unknown>; onSaved: () => void; testID: string}) {
  const {t} = useProduct(), action = useProductAction();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.key, typeof initial[field.key] === 'string' ? String(initial[field.key]) : ''])));
  return <Card title={title}>{fields.map(field => <Field key={field.key} testID={testID + '-' + field.key} label={t(field.ar, field.en)} value={draft[field.key] ?? ''} onChange={value => setDraft(current => ({...current, [field.key]: value}))} maxLength={field.maxLength} multiline={field.multiline} keyboard={field.keyboard} editable={!action.busy}/>)}
    <Notice error={action.error} message={action.message}/>
    <Button testID={testID + '-save'} busy={action.busy} disabled={fields.some(field => field.required && !draft[field.key]?.trim())} label={t('حفظ', 'Save')} onPress={() => void action.run(async () => {await save(Object.fromEntries(fields.map(field => [field.key, draft[field.key]?.trim() || '']))); return true;}, t('تم الحفظ.', 'Saved.')).then(saved => {if (saved) onSaved();})}/>
  </Card>;
}
export function PolicyNotice({value}: {value: unknown}) {
  const {t} = useProduct(), policy = object(value);
  if (!Object.keys(policy).length) return null;
  return <Card title={t('حالة السياسة', 'Policy status')}><Facts items={[[t('الحالة', 'State'), policy.state ?? policy.status], [t('ملاحظة', 'Note'), policy.reason ?? policy.note ?? policy.message]]}/>
    {policy.state === 'REVIEW_REQUIRED' || policy.requiresReview === true ? <Paragraph>{t('تحتاج العملية مراجعة حسب قرار الخادم. لم تُمنح موافقة تشغيلية.', 'This operation needs review under the server policy. Operational approval has not been granted.')}</Paragraph> : null}</Card>;
}
export function EventHistory({items}: {items: Row[]}) {
  const {locale, t} = useProduct();
  return <>{items.map((item, index) => <Card key={text(item.id, String(index))}><Facts items={[[t('الحدث', 'Event'), item.action ?? item.kind ?? item.type], [t('التاريخ', 'Date'), date(item.createdAt ?? item.occurredAt, locale)], [t('السبب', 'Reason'), item.reason ?? item.note]]}/><State value={item.status ?? item.outcome}/></Card>)}</>;
}
