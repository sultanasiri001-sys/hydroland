import {useRef, useState} from 'react';
import {router} from 'expo-router';
import {randomUUID} from 'expo-crypto';
import {logout} from '../src/session';
import {productApi} from '../src/product-client';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, object, rows, Row, text} from '../src/product-model';
import {sharePrivateJson} from '../src/product-native-files';
import {Facts, FormField, RecordForm, State} from '../src/product-record-ui';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

const profileFields: FormField[] = [
  {key: 'firstName', ar: 'الاسم الأول', en: 'First name', maxLength: 80, required: true}, {key: 'lastName', ar: 'اسم العائلة', en: 'Last name', maxLength: 80}, {key: 'phone', ar: 'الهاتف', en: 'Phone', maxLength: 40, keyboard: 'phone-pad'},
  {key: 'headline', ar: 'عنوان الملف المهني', en: 'Professional headline', maxLength: 120}, {key: 'bio', ar: 'النبذة', en: 'Biography', maxLength: 5000, multiline: true}, {key: 'regionCode', ar: 'المنطقة', en: 'Region', maxLength: 80},
];
const diverFields: FormField[] = [
  {key: 'dateOfBirth', ar: 'تاريخ الميلاد YYYY-MM-DD', en: 'Date of birth YYYY-MM-DD', maxLength: 10}, {key: 'nationality', ar: 'الجنسية', en: 'Nationality'}, {key: 'identityType', ar: 'نوع الهوية', en: 'Identity type'}, {key: 'identityLast4', ar: 'آخر أربعة أرقام من الهوية', en: 'Last four identity digits', keyboard: 'numeric', maxLength: 4},
  {key: 'primaryPhone', ar: 'الهاتف الأساسي', en: 'Primary phone', keyboard: 'phone-pad'}, {key: 'secondaryPhone', ar: 'الهاتف البديل', en: 'Alternate phone', keyboard: 'phone-pad'}, {key: 'preferredContact', ar: 'وسيلة التواصل المفضلة', en: 'Preferred contact'},
  {key: 'emergencyName', ar: 'جهة الاتصال للطوارئ', en: 'Emergency contact name'}, {key: 'emergencyRelation', ar: 'صلة القرابة', en: 'Relationship'}, {key: 'emergencyPhone', ar: 'هاتف الطوارئ', en: 'Emergency phone', keyboard: 'phone-pad'}, {key: 'emergencyAltPhone', ar: 'هاتف الطوارئ البديل', en: 'Alternate emergency phone', keyboard: 'phone-pad'},
  {key: 'bloodType', ar: 'فصيلة الدم', en: 'Blood group'}, {key: 'medicalClearanceExpiresAt', ar: 'انتهاء التصريح الطبي YYYY-MM-DD', en: 'Medical clearance expiry YYYY-MM-DD', maxLength: 10}, {key: 'notes', ar: 'ملاحظات الملف', en: 'Profile notes', multiline: true, maxLength: 2000},
];
const equipmentFields: FormField[] = [{key: 'category', ar: 'فئة المعدة', en: 'Equipment category', required: true}, {key: 'ownership', ar: 'الملكية', en: 'Ownership', required: true}, {key: 'brand', ar: 'العلامة', en: 'Brand'}, {key: 'model', ar: 'الطراز', en: 'Model'}, {key: 'serialNumber', ar: 'الرقم التسلسلي', en: 'Serial number'}, {key: 'size', ar: 'المقاس', en: 'Size'}, {key: 'serviceDueAt', ar: 'موعد الصيانة YYYY-MM-DD', en: 'Service due YYYY-MM-DD', maxLength: 10}];
export default function Account() {
  const {profile, authKey, t} = useProduct();
  return <Screen testID="account-screen" title={t('حسابي', 'My account')}>
    {profile ? <AccountContent key={authKey}/> : <SignIn returnTo="/account"/>}
  </Screen>;
}
function AccountContent() {
  const {profile, t, refreshProfile} = useProduct();
  const [tab, setTab] = useState('PROFILE');
  return <><Choices testID="account-tab" label={t('أقسام الحساب', 'Account sections')} value={tab} onChange={setTab} options={[{value: 'PROFILE', label: t('الملف', 'Profile')}, {value: 'DIVER', label: t('الغواص والمعدات', 'Diver and equipment')}, {value: 'SECURITY', label: t('أمان الدخول', 'Security')}, {value: 'PRIVACY', label: t('بياناتي وخصوصيتي', 'Data and privacy')}]}/>
    {tab === 'PROFILE' && profile ? <><Paragraph>{profile.email}</Paragraph><RecordForm title={t('الملف الشخصي والمهني', 'Personal and professional profile')} testID="profile" initial={{...profile.person, ...object(profile.person.professional)}} fields={profileFields} save={productApi.updateProfile} onSaved={() => void refreshProfile()}/><Membership/></> : null}
    {tab === 'DIVER' ? <Diver/> : null}{tab === 'SECURITY' ? <Security/> : null}{tab === 'PRIVACY' ? <Privacy/> : null}
    <Button testID="account-logout" kind="danger" label={t('تسجيل الخروج من هذا الجهاز', 'Sign out of this device')} onPress={() => void logout().finally(() => router.replace('/'))}/>
  </>;
}
function Membership() {
  const {t, locale} = useProduct(), action = useProductAction();
  const [pass, setPass] = useState<Row | null>(null);
  return <Card title={t('بطاقة العضوية', 'Membership pass')}><Paragraph muted>{t('البطاقة مرجع مؤقت للعضوية، ولا تمنح أهلية غوص أو موافقة تشغيلية.', 'This temporary membership reference does not grant diving eligibility or operational clearance.')}</Paragraph>
    <Notice error={action.error}/><Button testID="membership-generate" busy={action.busy} label={t('إظهار بطاقة العضوية', 'Show membership pass')} onPress={() => void action.run(productApi.membershipPass, '').then(result => {if (result) setPass(result);})}/>
    {pass ? <Facts items={[[t('الاسم', 'Name'), pass.displayName ?? pass.name], [t('المرجع', 'Reference'), pass.reference], [t('ينتهي', 'Expires'), date(pass.expiresAt, locale)]]}/> : null}
  </Card>;
}
function Diver() {
  const {t} = useProduct(), data = useProductResource(signal => productApi.diverProfile(signal));
  const action = useProductAction();
  const [editing, setEditing] = useState<string | null>(null);
  return <Resource {...data} retry={() => void data.refresh()}><RecordForm key={text(object(data.data?.profile).updatedAt, 'new')} title={t('ملف الغواص والطوارئ', 'Diver and emergency profile')} testID="diver-profile" initial={object(data.data?.profile)} fields={diverFields} save={productApi.updateDiverProfile} onSaved={() => void data.refresh()}/>
    <Paragraph muted>{t('هذه البيانات لا تستبدل مراجعة الأهلية أو التصريح الطبي المطلوب للرحلة.', 'These details do not replace the trip eligibility review or required medical clearance.')}</Paragraph>
    {rows(data.data?.equipment).map(item => <Card key={text(item.id)} title={text(item.category)}><Facts items={[[t('العلامة والطراز', 'Brand and model'), [item.brand, item.model].filter(Boolean).join(' ')], [t('الملكية', 'Ownership'), item.ownership], [t('الصيانة', 'Service due'), item.serviceDueAt]]}/><State value={item.status}/>
      <Button testID={'equipment-edit-' + text(item.id)} kind="quiet" label={t('تعديل المعدة', 'Edit equipment')} onPress={() => setEditing(editing === item.id ? null : text(item.id))}/>
      {editing === item.id ? <RecordForm title={t('تعديل المعدة', 'Edit equipment')} testID="equipment-edit" initial={item} fields={equipmentFields.filter(field => field.key !== 'category')} save={body => productApi.updateEquipment(text(item.id), body)} onSaved={() => {setEditing(null); void data.refresh();}}/> : null}
      <Button testID={'equipment-status-' + text(item.id)} kind="quiet" busy={action.busy} label={item.status === 'ACTIVE' ? t('إيقاف استخدام المعدة', 'Deactivate equipment') : t('طلب تنشيط المعدة', 'Activate equipment')} onPress={() => void action.run(() => productApi.updateEquipment(text(item.id), {status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}), '').then(result => {if (result) void data.refresh();})}/>
    </Card>)}<Notice error={action.error}/>
    <RecordForm title={t('إضافة معدة', 'Add equipment')} testID="equipment-new" fields={equipmentFields} save={productApi.addEquipment} onSaved={() => void data.refresh()}/>
  </Resource>;
}
function Security() {
  const {t} = useProduct(), data = useProductResource(signal => productApi.mfaStatus(signal)), action = useProductAction();
  const [setup, setSetup] = useState<Row | null>(null), [code, setCode] = useState(''), [recovery, setRecovery] = useState<string[]>([]);
  return <Resource {...data} retry={() => void data.refresh()}><Card title={t('المصادقة الثنائية', 'Two-factor authentication')}>
    <Paragraph>{data.data?.enabled ? t('المصادقة الثنائية مفعّلة.', 'Two-factor authentication is enabled.') : t('أضف تطبيق مصادقة لحماية الدخول.', 'Add an authenticator app to protect sign-in.')}</Paragraph>
    <Notice error={action.error} message={action.message}/>
    {!data.data?.enabled && !setup ? <Button testID="mfa-setup" busy={action.busy} label={t('إعداد تطبيق المصادقة', 'Set up authenticator')} onPress={() => void action.run(productApi.setupMfa, '').then(result => {if (result) setSetup(result);})}/> : null}
    {setup ? <><Paragraph>{t('أدخل هذا المفتاح في تطبيق المصادقة. لا يُحفظ المفتاح على الجهاز.', 'Enter this key in your authenticator app. The key is not stored on this device.')}</Paragraph><Paragraph testID="mfa-secret">{text(setup.secret)}</Paragraph></> : null}
    {setup || data.data?.enabled ? <><Field testID="mfa-code" label={t('رمز المصادقة', 'Authenticator code')} value={code} onChange={setCode} secure maxLength={32}/>
      <Button testID={setup ? 'mfa-confirm' : 'mfa-disable'} kind={setup ? 'primary' : 'danger'} busy={action.busy} label={setup ? t('تأكيد التفعيل', 'Confirm setup') : t('إيقاف المصادقة الثنائية', 'Disable two-factor authentication')} onPress={() => void action.run(() => setup ? productApi.confirmMfa(code) : productApi.disableMfa(code), t('تم تحديث أمان الحساب.', 'Account security updated.')).then(result => {if (result) {setSetup(null); setCode(''); setRecovery(Array.isArray(result.recoveryCodes) ? result.recoveryCodes.map(String) : []); void data.refresh();}})}/></> : null}
    {recovery.length ? <><Paragraph>{t('رموز استرداد تظهر مرة واحدة. احتفظ بها في مكان آمن قبل مغادرة الصفحة.', 'Recovery codes are shown once. Keep them somewhere safe before leaving this page.')}</Paragraph>{recovery.map(value => <Paragraph key={value}>{value}</Paragraph>)}<Button testID="mfa-recovery-dismiss" kind="quiet" label={t('حفظتها في مكان آمن', 'I stored them securely')} onPress={() => setRecovery([])}/></> : null}
  </Card></Resource>;
}
function Privacy() {
  const {t, authKey, current, locale} = useProduct(), action = useProductAction();
  const [page, setPage] = useState(1), [domain, setDomain] = useState('ACCOUNT'), [kind, setKind] = useState('CORRECTION'), [center, setCenter] = useState(''), [record, setRecord] = useState(''), [details, setDetails] = useState(''), [confirmed, setConfirmed] = useState(false);
  const command = useRef<{fingerprint: string; requestKey: string} | null>(null);
  const data = useProductResource(async signal => ({requests: await productApi.privacyRequests(page, signal), centers: await productApi.privacyCenters(signal)}), [page]);
  const [exportScope, setExportScope] = useState('PROFILE'), [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  async function exportData(next = false) {
    const result = await action.run(async () => {const receipt = exportScope === 'PROFILE' ? await productApi.exportProfile() : exportScope === 'SENT_MESSAGES' ? await productApi.exportMessages(next ? nextCursor : undefined) : await productApi.exportRecords(exportScope as 'BOOKINGS' | 'PAYMENTS', next ? nextCursor : undefined); await sharePrivateJson(receipt, () => current(authKey)); return receipt;}, t('تم تجهيز ملف البيانات للمشاركة.', 'The data file is ready to share.'));
    if (result) setNextCursor(typeof result.nextCursor === 'string' ? result.nextCursor : undefined);
  }
  async function submit() {
    const body = {kind, domain, recordRef: domain === 'ACCOUNT' || !record.trim() ? null : record.trim(), details: details.trim(), centerId: center || null};
    const fingerprint = JSON.stringify(body);
    if (command.current?.fingerprint !== fingerprint) command.current = {fingerprint, requestKey: randomUUID()};
    const result = await action.run(() => productApi.requestPrivacy({...body, requestKey: command.current!.requestKey}), t('استُلم الطلب للمراجعة؛ الإرسال لا يعني تنفيذ الحذف أو التصحيح.', 'Request received for review. Submission does not mean correction or erasure was executed.'));
    if (result) {setConfirmed(false); void data.refresh();}
  }
  return <><Card title={t('نسخة من بيانات حسابي', 'Copy of my account data')}><Paragraph muted>{t('كل ملف يبيّن نطاقه وحدوده وإيصال التدقيق. السجلات المتعددة تُصدّر على صفحات منفصلة.', 'Each file includes its scope, limits and audit receipt. Larger record sets are exported in separate pages.')}</Paragraph>
    <Choices testID="export-scope" label={t('النطاق', 'Scope')} value={exportScope} onChange={value => {setExportScope(value); setNextCursor(undefined);}} options={[{value: 'PROFILE', label: t('الملف', 'Profile')}, {value: 'BOOKINGS', label: t('الحجوزات', 'Bookings')}, {value: 'PAYMENTS', label: t('الدفعات', 'Payments')}, {value: 'SENT_MESSAGES', label: t('رسائلي المرسلة', 'Sent messages')}]}/>
    <Button testID="export-data" busy={action.busy} label={t('تجهيز ومشاركة الملف', 'Prepare and share file')} onPress={() => void exportData()}/>{nextCursor ? <Button testID="export-next" busy={action.busy} label={t('تصدير الصفحة التالية', 'Export next page')} onPress={() => void exportData(true)}/> : null}
  </Card><Notice error={action.error} message={action.message}/>
    <Resource {...data} retry={() => void data.refresh()}><Card title={t('طلب تصحيح أو حذف', 'Correction or erasure request')}>
      <Choices testID="privacy-kind" label={t('نوع الطلب', 'Request type')} value={kind} onChange={setKind} options={[{value: 'CORRECTION', label: t('تصحيح', 'Correction')}, {value: 'ERASURE', label: t('حذف', 'Erasure')}]}/>
      <Choices testID="privacy-domain" label={t('النطاق', 'Scope')} value={domain} onChange={value => {setDomain(value); setRecord('');}} options={['ACCOUNT', 'BOOKINGS', 'PAYMENTS', 'SENT_MESSAGES'].map(value => ({value, label: ({ACCOUNT: t('الحساب', 'Account'), BOOKINGS: t('الحجوزات', 'Bookings'), PAYMENTS: t('الدفعات', 'Payments'), SENT_MESSAGES: t('الرسائل المرسلة', 'Sent messages')} as Record<string, string>)[value]!}))}/>
      {domain !== 'ACCOUNT' ? <Field testID="privacy-record" label={t('مرجع سجل محدد (اختياري)', 'Specific record reference (optional)')} value={record} onChange={setRecord} maxLength={200}/> : null}
      {rows(data.data?.centers).length ? <Choices testID="privacy-center" label={t('المركز المسؤول', 'Responsible center')} value={center} onChange={setCenter} options={[{value: '', label: t('يحدده الخادم', 'Resolve automatically')}, ...rows(data.data?.centers).map(item => ({value: text(item.id), label: text(item.displayName ?? item.name)}))]}/> : null}
      <Field testID="privacy-details" label={t('تفاصيل الطلب', 'Request details')} value={details} onChange={setDetails} multiline maxLength={1000}/>
      <Toggle testID="privacy-confirm" label={t('راجعت النطاق وأطلب إرسال الطلب للمراجعة', 'I reviewed the scope and request submission for review')} value={confirmed} onChange={setConfirmed}/>
      <Button testID="privacy-submit" busy={action.busy} disabled={!confirmed || (kind === 'CORRECTION' && !details.trim())} label={t('إرسال الطلب', 'Submit request')} onPress={() => void submit()}/>
    </Card>
    {rows(data.data?.requests).map(item => <Card key={text(item.id)}><Facts items={[[t('المرجع', 'Reference'), item.id], [t('النوع', 'Type'), item.kind], [t('النطاق', 'Scope'), item.domain], [t('التاريخ', 'Date'), date(item.createdAt, locale)], [t('التفاصيل', 'Details'), item.details], [t('القرار', 'Decision'), item.decisionDisposition]]}/><State value={item.status}/></Card>)}
    {page > 1 ? <Button testID="privacy-prev" kind="quiet" label={t('السابق', 'Previous')} onPress={() => setPage(page - 1)}/> : null}{data.data?.requests.more ? <Button testID="privacy-next" kind="quiet" label={t('التالي', 'Next')} onPress={() => setPage(page + 1)}/> : null}
    </Resource>
  </>;
}
