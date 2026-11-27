import {useRef, useState} from 'react';
import {router, useLocalSearchParams} from 'expo-router';
import {randomUUID} from 'expo-crypto';
import {productApi} from '../src/product-client';
import {Checkout, OriginalContract} from '../src/product-checkout';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, money, object, roles, rows, Row, text} from '../src/product-model';
import {EventHistory, Facts, State} from '../src/product-record-ui';
import {ProfessionalTraining} from '../src/product-training-professional';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

export default function Training() {
  const {profile, authKey, t} = useProduct(), {enrollmentId} = useLocalSearchParams<{enrollmentId?: string}>();
  const [tab, setTab] = useState(enrollmentId ? 'MINE' : 'CATALOG');
  const instructor = roles(profile).includes('INSTRUCTOR');
  return <Screen testID="training-screen" title={t('التدريب والدورات', 'Training and courses')}>
    <Choices testID="training-tab" label={t('مسارات التدريب', 'Training sections')} value={tab} onChange={setTab} options={[{value: 'CATALOG', label: t('الدورات المتاحة', 'Available courses')}, {value: 'MINE', label: t('دوراتي', 'My courses')}, {value: 'CERTIFICATES', label: t('نتائجي وشهاداتي', 'Results and certificates')}, ...(instructor ? [{value: 'PROFESSIONAL', label: t('مساحة المدرب', 'Instructor workspace')}] : [])]}/>
    {tab === 'CATALOG' ? <Courses key={authKey} onEnrolled={() => setTab('MINE')}/> : !profile ? <SignIn returnTo="/training"/> : tab === 'MINE' ? <MyTraining key={authKey} initial={typeof enrollmentId === 'string' ? enrollmentId : ''}/> : tab === 'CERTIFICATES' ? <Certificates key={authKey}/> : instructor ? <ProfessionalTraining key={authKey}/> : null}
  </Screen>;
}
function Courses({onEnrolled}: {onEnrolled: () => void}) {
  const {t, locale, profile} = useProduct(), data = useProductResource(signal => productApi.courses(signal), [], {public: true}), action = useProductAction();
  const [confirmed, setConfirmed] = useState('');
  return <><Notice error={action.error} message={action.message}/><Resource {...data} empty={!rows(data.data).length} retry={() => void data.refresh()}>{rows(data.data).map(row => <Card key={text(row.id)} title={text(row.title)}><Facts items={[[t('المركز', 'Center'), object(row.organization).displayName], [t('البرنامج', 'Program'), row.courseCode], [t('البداية', 'Start'), date(row.startsAt, locale)], [t('النهاية', 'End'), date(row.endsAt, locale)], [t('السعر', 'Price'), money(row.priceMinor, row.currency, locale)], [t('المقاعد المتبقية', 'Remaining seats'), row.remainingSeats]]}/>
    <Toggle testID={'course-confirm-' + text(row.id)} label={t('أرغب في التسجيل ومراجعة شروط هذه الدورة', 'I want to enroll and review this course’s terms')} value={confirmed === row.id} onChange={value => setConfirmed(value ? text(row.id) : '')}/>
    <Button testID={'course-enroll-' + text(row.id)} busy={action.busy} disabled={confirmed !== row.id || row.remainingSeats === 0} label={profile ? t('تسجيل في الدورة', 'Enroll in course') : t('تسجيل الدخول', 'Sign in')} onPress={() => {if (!profile) {router.push({pathname: '/login', params: {returnTo: '/training'}}); return;} void action.run(() => productApi.enrollCourse(text(row.id)), t('تم التسجيل. راجع الشروط والدفع وحالة القبول في دوراتي.', 'Enrolled. Review terms, payment and acceptance status in My courses.')).then(result => {if (result) onEnrolled();});}}/>
  </Card>)}</Resource></>;
}
function MyTraining({initial}: {initial: string}) {
  const {t} = useProduct(), [selected, setSelected] = useState(initial), data = useProductResource(signal => productApi.enrollments(signal));
  const records = rows(data.data), chosen = records.find(row => row.id === selected);
  return <>{selected ? <Button testID="training-all" kind="quiet" label={t('كل دوراتي', 'All my courses')} onPress={() => setSelected('')}/> : null}
    <Resource {...data} empty={!records.length || Boolean(selected && !chosen)} retry={() => void data.refresh()}>{chosen ? <Enrollment key={text(chosen.id)} enrollmentId={text(chosen.id)}/> : records.map(row => <Card key={text(row.id)} title={text(row.courseCode)}><State value={row.status}/><Facts items={[[t('التقدم', 'Progress'), text(object(row.record).progressPercent, '0') + '%']]}/><Button testID={'training-open-' + text(row.id)} label={t('الخطة والجلسات والدفع', 'Plan, sessions and payment')} onPress={() => setSelected(text(row.id))}/></Card>)}</Resource>
  </>;
}
function Enrollment({enrollmentId}: {enrollmentId: string}) {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.enrollment(enrollmentId, signal), [enrollmentId]), action = useProductAction();
  const [checkout, setCheckout] = useState(false), [cancel, setCancel] = useState(false), [cancellation, setCancellation] = useState<Row | null>(null);
  const row = data.data, record = object(row?.record), contract = object(object(row?.metadata).contractSnapshot);
  return <Resource {...data} retry={() => void data.refresh()}>{row ? <><Card title={text(row.courseCode)}><State value={row.status}/><Facts items={[[t('التقدم', 'Progress'), text(record.progressPercent, '0') + '%'], [t('التسجيل', 'Enrolled'), date(row.enrolledAt, locale)], [t('الإتمام', 'Completed'), row.completedAt ? date(row.completedAt, locale) : null]]}/><Paragraph muted>{t('التقدم محسوب من أدلة التدريب. الدفع أو نسبة التقدم لا يصدران شهادة خارجية أو موافقة تشغيلية.', 'Progress is based on training evidence. Payment or a progress percentage does not issue an external certificate or operational approval.')}</Paragraph></Card>
    {Object.keys(contract).length ? <OriginalContract snapshot={contract}/> : null}
    {rows(record.stages).map(stage => <Card key={text(stage.id)} title={text(stage.stageType)}><Paragraph>{text(stage.deliveryMode)}</Paragraph>{rows(stage.skills).map(skill => <Card key={text(skill.id)} title={text(skill.name)}><State value={skill.status}/>{skill.signedOffAt ? <Paragraph>{t('توقيع موثق: ', 'Recorded sign-off: ') + date(skill.signedOffAt, locale)}</Paragraph> : null}</Card>)}</Card>)}
    {rows(record.sessions).map(session => <Card key={text(session.id)} title={t('جلسة تدريب', 'Training session')}><State value={session.status}/><Facts items={[[t('البداية', 'Start'), date(session.startsAt, locale)], [t('النهاية', 'End'), date(session.endsAt, locale)]]}/>{session.tripId ? <Button testID={'training-trip-' + text(session.id)} kind="quiet" label={t('فتح يوم الرحلة المرتبطة', 'Open linked trip day')} onPress={() => router.push({pathname: '/trip-day', params: {tripId: text(session.tripId)}})}/> : null}</Card>)}
    {row.storeCourseOfferId && row.status === 'PENDING' ? <><Button testID="training-checkout" label={checkout ? t('إغلاق الدفع', 'Close checkout') : t('مراجعة الشروط والدفع', 'Review terms and pay')} onPress={() => setCheckout(!checkout)}/>{checkout ? <Checkout kind="COURSE" sourceId={enrollmentId} onChanged={() => void data.refresh()}/> : null}</> : null}
    {row.storeCourseOfferId && ['PENDING', 'ACTIVE'].includes(text(row.status)) ? <Card title={t('طلب إلغاء الدورة المدفوعة', 'Cancel a paid course')}><Paragraph>{t('يُقيّم الخادم الإلغاء وفق الشروط الأصلية والتحصيل. استلام الطلب لا يعني تنفيذ الاسترداد.', 'The server evaluates original terms and collection evidence. Receiving a cancellation request does not execute a refund.')}</Paragraph><Toggle testID="course-cancel-confirm" label={t('راجعت الشروط وأطلب الإلغاء', 'I reviewed the terms and request cancellation')} value={cancel} onChange={setCancel}/><Button testID="course-cancel" kind="danger" busy={action.busy} disabled={!cancel} label={t('إرسال طلب الإلغاء', 'Submit cancellation request')} onPress={() => void action.run(() => productApi.cancelCourse(enrollmentId), t('تمت قراءة قرار الإلغاء. لم يُنفذ إجراء مالي من هذه الخطوة.', 'Cancellation decision received. This step did not execute a financial action.')).then(result => {if (result) {setCancellation(result); setCancel(false); setCheckout(false); void data.refresh();}})}/><Notice error={action.error} message={action.message}/></Card> : null}
    {cancellation ? <Card title={t('إيصال قرار الإلغاء', 'Cancellation decision receipt')}><State value={object(cancellation.decision).status}/><Facts items={[[t('مرجع الطلب', 'Request reference'), cancellation.requestId], [t('السبب', 'Reason'), object(cancellation.decision).reasonCode], [t('مبلغ الاسترداد المقيم', 'Evaluated refund amount'), money(object(cancellation.decision).refundAmountMinor, 'SAR', locale)]]}/><Paragraph>{t('لم تنفذ هذه الخطوة استردادًا ماليًا.', 'This step did not execute a financial refund.')}</Paragraph></Card> : null}
    <Button testID="training-invoices" kind="quiet" label={t('الفواتير', 'Invoices')} onPress={() => router.push('/finance' as never)}/>
  </> : null}</Resource>;
}
function Certificates() {
  const {t} = useProduct(), data = useProductResource(signal => productApi.certificates(signal));
  const [selected, setSelected] = useState('');
  return <>{selected ? <><Button testID="certificates-back" kind="quiet" label={t('كل النتائج', 'All results')} onPress={() => setSelected('')}/><Certificate key={selected} certificateId={selected}/></> : <Resource {...data} empty={!rows(data.data).length} retry={() => void data.refresh()}>{rows(data.data).map(row => <Card key={text(row.id)} title={text(row.courseCode)}><State value={row.status}/><Button testID={'certificate-open-' + text(row.id)} label={t('النتيجة والتاريخ', 'Result and history')} onPress={() => setSelected(text(row.id))}/></Card>)}</Resource>}</>;
}
export function Certificate({certificateId}: {certificateId: string}) {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.certificate(certificateId, signal), [certificateId]), action = useProductAction();
  const [reason, setReason] = useState(''), command = useRef<{fingerprint: string; requestId: string} | null>(null);
  const row = data.data, internal = object(row?.internalResult), external = object(row?.externalCertification);
  return <Resource {...data} retry={() => void data.refresh()}>{row ? <><Card title={text(row.courseCode)}><State value={internal.status ?? row.status}/><Facts items={[[t('رقم الشهادة الداخلية', 'Internal certificate number'), internal.certificateNumber], [t('الإصدار', 'Issued'), internal.issuedAt ? date(internal.issuedAt, locale) : null], [t('سبب المراجعة', 'Review reason'), row.reviewReason]]}/><Paragraph>{t('النتيجة الداخلية لا تمنح شهادة من جهة خارجية أو صلاحية تشغيل.', 'An internal result does not grant an external agency certificate or operational authority.')}</Paragraph><State value={external.status}/></Card>
    <EventHistory items={rows(row.history)}/>{row.historyTruncated ? <Paragraph muted>{t('هذا عرض لأحدث الأحداث؛ يبقى التاريخ الأصلي محفوظًا.', 'This shows the latest events; the original history is retained.')}</Paragraph> : null}
    {row.canRequestReconsideration === true ? <Card title={t('طلب إعادة النظر', 'Request reconsideration')}><Field testID="certificate-reason" label={t('سبب إعادة النظر', 'Reason for reconsideration')} value={reason} onChange={setReason} multiline maxLength={1000}/><Notice error={action.error} message={action.message}/><Button testID="certificate-reconsider" busy={action.busy} disabled={reason.trim().length < 5} label={t('إرسال الطلب', 'Submit request')} onPress={() => {const body = {expectedUpdatedAt: row.updatedAt, reason: reason.trim()}, fingerprint = JSON.stringify(body); if (command.current?.fingerprint !== fingerprint) command.current = {fingerprint, requestId: randomUUID()}; void action.run(() => productApi.reconsiderCertificate(certificateId, {...body, requestId: command.current!.requestId}), t('تم إرسال طلب إعادة النظر.', 'Reconsideration requested.')).then(result => {if (result) {setReason(''); void data.refresh();}});}}/></Card> : null}
  </> : null}</Resource>;
}
