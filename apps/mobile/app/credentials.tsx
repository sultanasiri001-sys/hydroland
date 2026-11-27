import {useState} from 'react';
import {Linking} from 'react-native';
import {productApi} from '../src/product-client';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, httpsUrl, roles, Row, rows, text} from '../src/product-model';
import {pickCredentialFile} from '../src/product-native-files';
import {Facts, FormField, PolicyNotice, RecordForm, State} from '../src/product-record-ui';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

const fields: FormField[] = [{key: 'issuer', ar: 'الجهة المصدرة', en: 'Issuing organization', required: true}, {key: 'title', ar: 'اسم المؤهل', en: 'Credential title', required: true}, {key: 'credentialNumber', ar: 'رقم المؤهل', en: 'Credential number'}, {key: 'issuedAt', ar: 'تاريخ الإصدار YYYY-MM-DD', en: 'Issue date YYYY-MM-DD', maxLength: 10}, {key: 'expiresAt', ar: 'تاريخ الانتهاء YYYY-MM-DD (إن وجد)', en: 'Expiry date YYYY-MM-DD (if applicable)', maxLength: 10}];
export default function Credentials() {
  const {profile, authKey, t} = useProduct();
  return <Screen testID="credentials-screen" title={t('المؤهلات والوثائق', 'Credentials and documents')}>
    {profile ? <CredentialsContent key={authKey}/> : <SignIn returnTo="/credentials"/>}
  </Screen>;
}
function CredentialsContent() {
  const {profile, t} = useProduct(); const [review, setReview] = useState(false), [create, setCreate] = useState(false);
  const reviewer = roles(profile).some(role => role === 'ADMIN' || role === 'REVIEWER');
  const data = useProductResource(async signal => ({credentials: review && reviewer ? await productApi.pendingCredentials(signal) : await productApi.credentials(signal), organizations: await productApi.verificationOrganizations(signal)}), [review, reviewer]);
  return <>{reviewer ? <Choices testID="credentials-view" label={t('العرض', 'View')} value={review ? 'REVIEW' : 'MINE'} onChange={value => {setReview(value === 'REVIEW'); setCreate(false);}} options={[{value: 'MINE', label: t('مؤهلاتي', 'My credentials')}, {value: 'REVIEW', label: t('المراجعة المخولة لي', 'Assigned review access')}]}/> : null}
    {!review ? <Button testID="credential-new" label={create ? t('إغلاق النموذج', 'Close form') : t('إضافة مؤهل', 'Add credential')} kind="quiet" onPress={() => setCreate(!create)}/> : null}
    {create ? <RecordForm title={t('مؤهل جديد', 'New credential')} testID="credential-create" fields={fields} save={productApi.createCredential} onSaved={() => {setCreate(false); void data.refresh();}}/> : null}
    <Resource {...data} empty={!rows(data.data?.credentials).length} retry={() => void data.refresh()}>{rows(data.data?.credentials).map(item => <Credential key={text(item.id) + ':' + text(item.verificationStatus)} row={item} review={review} organizations={rows(data.data?.organizations)} refresh={() => void data.refresh()}/>)}</Resource>
  </>;
}
function Credential({row, review, organizations, refresh}: {row: Row; review: boolean; organizations: Row[]; refresh: () => void}) {
  const {t, locale, authKey, current, ensureCurrent} = useProduct(), action = useProductAction();
  const [confirmed, setConfirmed] = useState(false), [outcome, setOutcome] = useState('REJECTED'), [reason, setReason] = useState(''), [source, setSource] = useState(''), [method, setMethod] = useState(''), [reference, setReference] = useState(''), [verificationUrl, setVerificationUrl] = useState('');
  const organization = organizations.find(item => item.source === source);
  async function upload() {
    const result = await action.run(async () => {const file = await pickCredentialFile(() => current(authKey)); if (!file) return false; await ensureCurrent(authKey); await productApi.attachCredential(text(row.id), file); return true;}, t('رُفعت الوثيقة إلى ملف المؤهل.', 'Document uploaded to the credential.'));
    if (result) refresh();
  }
  async function open(document: Row) {
    await action.run(async () => {const result = await (review ? productApi.reviewerCredentialAccess(text(row.id), text(document.id)) : productApi.credentialAccess(text(row.id), text(document.id))); await ensureCurrent(authKey); await Linking.openURL(httpsUrl(result.url)); return true;}, '');
  }
  return <Card title={text(row.title)} testID={'credential-' + text(row.id)}><Facts items={[[t('الجهة', 'Issuer'), row.issuer], [t('الرقم', 'Number'), row.credentialNumber], [t('الإصدار', 'Issued'), date(row.issuedAt, locale)], [t('الانتهاء', 'Expires'), row.expiresAt ? date(row.expiresAt, locale) : null], [t('سبب القرار', 'Decision reason'), row.reviewReason]]}/><State value={row.verificationStatus}/>
    <PolicyNotice value={row.policyReview}/>
    {rows(row.documents).map(document => <Card key={text(document.id)}><Facts items={[[t('الوثيقة', 'Document'), document.originalName], [t('النوع', 'Type'), document.mimeType], [t('الحجم بالبايت', 'Bytes'), document.byteSize]]}/><Button testID={'credential-document-' + text(document.id)} busy={action.busy} kind="quiet" label={t('فتح الوثيقة الأصلية', 'Open original document')} onPress={() => void open(document)}/></Card>)}
    <Notice error={action.error} message={action.message}/>
    {!review && row.verificationStatus === 'UNVERIFIED' ? <><Paragraph muted>{t('اختر PDF أو JPEG أو PNG حتى 10 ميغابايت. تُرسل البايتات إلى التخزين الخاص للمؤهلات.', 'Choose a PDF, JPEG or PNG up to 10 MB. File bytes are sent to private credential storage.')}</Paragraph><Button testID={'credential-upload-' + text(row.id)} busy={action.busy} label={t('اختيار وثيقة ورفعها', 'Choose and upload document')} onPress={() => void upload()}/>
      <Toggle testID={'credential-confirm-' + text(row.id)} label={t('راجعت بيانات المؤهل ووثائقه', 'I reviewed the credential and its documents')} value={confirmed} onChange={setConfirmed}/>
      <Button testID={'credential-submit-' + text(row.id)} busy={action.busy} disabled={!confirmed} label={t('إرسال المؤهل للتحقق', 'Submit credential for verification')} onPress={() => void action.run(() => productApi.submitCredential(text(row.id)), t('أُرسلت العملية. تُعرض حالة التحقق المعادة من الخادم.', 'Submitted. The displayed verification status comes from the server.')).then(result => {if (result) refresh();})}/></> : null}
    {review ? <><Choices testID={'credential-source-' + text(row.id)} label={t('مصدر التحقق الخارجي', 'External verification source')} value={source} onChange={value => {setSource(value); setMethod('');}} options={organizations.map(item => ({value: text(item.source), label: text(item.name)}))}/>
      {organization ? <Choices testID="credential-method" label={t('طريقة التحقق', 'Verification method')} value={method} onChange={setMethod} options={(Array.isArray(organization.methods) ? organization.methods : []).map(value => ({value: String(value), label: String(value)}))}/> : null}
      <Field testID="credential-verification-reference" label={t('مرجع الدليل الذي راجعته', 'Reference of the evidence you reviewed')} value={reference} onChange={setReference}/>
      <Field testID="credential-verification-url" label={t('رابط التحقق الرسمي (اختياري)', 'Official verification URL (optional)')} value={verificationUrl} onChange={setVerificationUrl} maxLength={2048}/>
      <Button testID="credential-record-verification" busy={action.busy} disabled={!source || !method || !reference.trim()} label={t('تسجيل دليل التحقق', 'Record verification evidence')} onPress={() => void action.run(() => productApi.recordCredentialVerification(text(row.id), {source, method, reference, ...(verificationUrl ? {verificationUrl} : {})}), t('تم تسجيل دليل التحقق.', 'Verification evidence recorded.')).then(result => {if (result) refresh();})}/>
      <Choices testID="credential-outcome" label={t('قرار المراجعة', 'Review decision')} value={outcome} onChange={setOutcome} options={[{value: 'REJECTED', label: t('رفض', 'Reject')}, {value: 'VERIFIED', label: t('تحقق', 'Verify')}]}/>
      <Field testID="credential-review-reason" label={t('سبب القرار', 'Decision reason')} value={reason} onChange={setReason} multiline maxLength={1000}/>
      <Toggle testID="credential-review-confirm" label={t('راجعت الوثائق الأصلية ودليل التحقق بصفتي المراجع المخول', 'I reviewed the originals and verification evidence as an authorized reviewer')} value={confirmed} onChange={setConfirmed}/>
      <Button testID="credential-review-submit" busy={action.busy} disabled={!confirmed || !reason.trim()} label={t('حفظ قرار المراجعة', 'Save review decision')} onPress={() => void action.run(() => productApi.reviewCredential(text(row.id), {outcome, reason}), t('حُفظ قرار المراجعة.', 'Review decision saved.')).then(result => {if (result) refresh();})}/></> : null}
  </Card>;
}
