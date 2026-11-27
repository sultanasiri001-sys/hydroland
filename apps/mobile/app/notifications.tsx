import {useEffect, useRef, useState} from 'react';
import {router} from 'expo-router';
import {productApi} from '../src/product-client';
import {getCurrentSessionId, subscribeSessionRotation} from '../src/session';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, object, rows, Row, text} from '../src/product-model';
import {unregisterCurrentDevice} from '../src/product-push';
import {registerDevicePush} from '../src/register-push';
import {Facts, State} from '../src/product-record-ui';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

export default function Notifications() {
  const {profile, authKey, t} = useProduct();
  return <Screen testID="notifications-screen" title={t('الإشعارات والتواصل', 'Notifications and delivery')}>
    {profile ? <NotificationsContent key={authKey}/> : <SignIn returnTo="/notifications"/>}
  </Screen>;
}
function NotificationsContent() {
  const {t} = useProduct(), [tab, setTab] = useState('INBOX');
  return <><Choices testID="notifications-tab" label={t('أقسام الإشعارات', 'Notification sections')} value={tab} onChange={setTab} options={[{value: 'INBOX', label: t('الوارد', 'Inbox')}, {value: 'PREFERENCES', label: t('خيارات التواصل', 'Delivery choices')}, {value: 'DELIVERIES', label: t('حالة الإرسال', 'Delivery status')}]}/>
    {tab === 'INBOX' ? <Inbox/> : tab === 'PREFERENCES' ? <Preferences/> : <Deliveries/>}
  </>;
}
function Inbox() {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.notifications(signal)), action = useProductAction();
  return <><Notice error={action.error}/><Resource {...data} empty={!rows(data.data).length} retry={() => void data.refresh()}>{rows(data.data).map(row => {const payload = object(row.payload); return <Card key={text(row.id)} title={text(payload.title, text(row.type))}>
    <Paragraph>{text(payload.message ?? payload.body, '')}</Paragraph><Facts items={[[t('التاريخ', 'Date'), date(row.createdAt, locale)]]}/><State value={row.status}/>
    {row.status !== 'READ' ? <Button testID={'notification-read-' + text(row.id)} kind="quiet" busy={action.busy} label={t('تعليم كمقروء', 'Mark as read')} onPress={() => void action.run(() => productApi.readNotification(text(row.id)), '').then(result => {if (result) void data.refresh();})}/> : null}
    {typeof payload.bookingId === 'string' ? <Button testID={'notification-booking-' + text(row.id)} kind="quiet" label={t('فتح الحجز في حسابي', 'Open booking in my account')} onPress={() => router.push({pathname: '/bookings' as never, params: {bookingId: payload.bookingId as string}})}/> : null}
    {typeof payload.enrollmentId === 'string' ? <Button testID={'notification-course-' + text(row.id)} kind="quiet" label={t('فتح دورتي', 'Open my course')} onPress={() => router.push({pathname: '/training' as never, params: {enrollmentId: payload.enrollmentId as string}})}/> : null}
  </Card>;})}</Resource></>;
}
const minute = (value: unknown) => typeof value === 'number' ? String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0') : '';
export function quietMinute(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Use HH:MM.');
  const [hour, minutes] = value.split(':').map(Number); return hour! * 60 + minutes!;
}
function Preferences() {
  const data = useProductResource(signal => productApi.notificationPreferences(signal));
  return <Resource {...data} retry={() => void data.refresh()}>{data.data ? <PreferenceForm key={String(data.data.revision)} initial={data.data} refresh={() => void data.refresh()}/> : null}</Resource>;
}
function PreferenceForm({initial, refresh}: {initial: Row; refresh: () => void}) {
  const {t, locale, authKey, current} = useProduct(), action = useProductAction(), available = object(initial.available);
  const [draft, setDraft] = useState(() => ({email: initial.email === true, sms: initial.sms === true, whatsapp: initial.whatsapp === true, push: initial.push === true, bookings: initial.bookings === true, invoices: initial.invoices === true}));
  const [start, setStart] = useState(minute(initial.quietStart)), [end, setEnd] = useState(minute(initial.quietEnd)), [zone, setZone] = useState(text(initial.timeZone, 'Asia/Riyadh'));
  const [confirmed, setConfirmed] = useState(false), [phone, setPhone] = useState(''), [phoneConfirmed, setPhoneConfirmed] = useState(false), [removePhoneConfirmed, setRemovePhoneConfirmed] = useState(false), [challenge, setChallenge] = useState<Row | null>(null), [code, setCode] = useState(''), [pushState, setPushState] = useState('');
  const challengeRef = useRef<Row | null>(null), [phoneInvalidated, setPhoneInvalidated] = useState(false);
  function updateChallenge(value: Row | null) {challengeRef.current = value; setChallenge(value); setCode('');}
  useEffect(() => subscribeSessionRotation(sessionId => {
    if (challengeRef.current && challengeRef.current.sessionId !== sessionId) {updateChallenge(null); setPhoneConfirmed(false); setPhoneInvalidated(true);}
  }), []);
  useEffect(() => {
    if (!challenge) return;
    const remaining = Date.parse(String(challenge.expiresAt)) - Date.now();
    const expire = () => {updateChallenge(null); setPhoneConfirmed(false); setPhoneInvalidated(true);};
    if (!Number.isFinite(remaining) || remaining <= 0 || challenge.sessionId !== getCurrentSessionId()) {expire(); return;}
    const timer = setTimeout(expire, Math.min(remaining, 10 * 60 * 1000)); return () => clearTimeout(timer);
  }, [challenge]);
  async function sendPhoneCode() {
    setPhoneInvalidated(false);
    const result = await action.run(() => productApi.phoneChallenge(phone), t('قَبِل المزود طلب الرمز؛ أدخل الرمز إذا وصلك.', 'The provider accepted the code request. Enter the code if received.'));
    if (result) {
      if (result.sessionId === getCurrentSessionId() && Date.parse(String(result.expiresAt)) > Date.now()) updateChallenge(result);
      else {updateChallenge(null); setPhoneConfirmed(false); setPhoneInvalidated(true);}
    }
  }
  const invalidQuiet = (() => {try {const a = quietMinute(start), b = quietMinute(end); return (a === null) !== (b === null) || (a !== null && a === b);} catch {return true;}})();
  async function save() {
    const result = await action.run(() => productApi.updateNotificationPreferences({...draft, expectedRevision: initial.revision, quietStart: quietMinute(start), quietEnd: quietMinute(end), timeZone: zone, confirmed: true}), t('حُفظت خيارات التواصل. تسري على الإرسال وفق حالة المصدر والمزود.', 'Delivery choices saved. Sending still depends on the source and provider status.'));
    if (result) {updateChallenge(null); refresh();}
  }
  return <><Card title={t('قنوات وأحداث التواصل', 'Delivery channels and events')}><Paragraph muted>{t('الموافقة مستقلة لكل قناة. توافر المزود لا يثبت وصول رسالة أو عرض إشعار على الجهاز.', 'Consent is separate for each channel. Provider availability does not prove message delivery or display on a device.')}</Paragraph>
    {(['email', 'sms', 'whatsapp', 'push', 'bookings', 'invoices'] as const).map(key => <Toggle key={key} testID={'notice-' + key} value={draft[key]} onChange={value => setDraft(previous => ({...previous, [key]: value}))} label={({email: t('البريد الإلكتروني', 'Email'), sms: t('الرسائل النصية', 'SMS'), whatsapp: 'WhatsApp', push: t('إشعارات الجهاز', 'Device push'), bookings: t('أحداث الحجوزات', 'Booking events'), invoices: t('الفواتير', 'Invoices')})[key]} disabled={!draft[key] && ((key === 'sms' || key === 'whatsapp') && (initial.phoneVerified !== true || available[key.toUpperCase()] !== true) || key === 'push' && available.PUSH !== true)}/>)}
    <Facts items={[[t('الهاتف المتحقق', 'Verified phone'), initial.maskedPhone], [t('SMS متاح', 'SMS available'), available.SMS === true ? t('نعم', 'Yes') : t('لا', 'No')], [t('WhatsApp متاح', 'WhatsApp available'), available.WHATSAPP === true ? t('نعم', 'Yes') : t('لا', 'No')], [t('Push متاح', 'Push available'), available.PUSH === true ? t('نعم', 'Yes') : t('لا', 'No')]]}/>
    <Field testID="notice-quiet-start" label={t('بداية الهدوء HH:MM (اختياري)', 'Quiet hours start HH:MM (optional)')} value={start} onChange={setStart} maxLength={5}/><Field testID="notice-quiet-end" label={t('نهاية الهدوء HH:MM (اختياري)', 'Quiet hours end HH:MM (optional)')} value={end} onChange={setEnd} maxLength={5}/><Field testID="notice-time-zone" label={t('المنطقة الزمنية', 'Time zone')} value={zone} onChange={setZone} maxLength={80}/>
    {invalidQuiet ? <Notice error={t('أدخل بداية ونهاية مختلفتين بصيغة HH:MM أو اتركهما فارغتين.', 'Enter different HH:MM start and end times, or leave both empty.')}/> : null}
    <Toggle testID="notice-confirm" label={t('راجعت الخيارات وأوافق على حفظها', 'I reviewed these choices and consent to saving them')} value={confirmed} onChange={setConfirmed}/><Button testID="notice-save" busy={action.busy} disabled={!confirmed || invalidQuiet || !zone.trim()} label={t('حفظ الخيارات', 'Save choices')} onPress={() => void save()}/>
  </Card><Notice error={action.error} message={action.message}/>
  <Card title={t('التحقق من الهاتف', 'Verify phone')}>
    {phoneInvalidated ? <Paragraph>{t('انتهى التحدي أو تغيرت جلسته. اطلب رمزًا جديدًا بعد تأكيد الرقم.', 'The challenge expired or its session changed. Confirm the phone and request a new code.')}</Paragraph> : null}
    {initial.phoneVerificationAvailable === true ? <><Field testID="notice-phone" label={t('رقم الهاتف بصيغة دولية', 'Phone in international format')} value={phone} onChange={value => {setPhone(value); updateChallenge(null); setPhoneConfirmed(false); setPhoneInvalidated(false);}} keyboard="phone-pad" maxLength={20} editable={!action.busy}/><Toggle testID="notice-phone-confirm" label={t('أطلب إرسال رمز تحقق إلى هذا الهاتف', 'I request a verification code to this phone')} value={phoneConfirmed} onChange={setPhoneConfirmed}/><Button testID="notice-phone-send" busy={action.busy} disabled={!phoneConfirmed || !phone.trim()} label={t('إرسال رمز التحقق', 'Send verification code')} onPress={() => void sendPhoneCode()}/>
      {challenge ? <><Facts items={[[t('انتهاء التحدي', 'Challenge expiry'), date(challenge.expiresAt, locale)]]}/><Field testID="notice-phone-code" label={t('رمز التحقق المكون من 6 أرقام', 'Six-digit verification code')} value={code} onChange={setCode} secure maxLength={6}/><Button testID="notice-phone-verify" busy={action.busy} disabled={!/^\d{6}$/.test(code)} label={t('تأكيد الهاتف', 'Verify phone')} onPress={() => void action.run(() => productApi.verifyPhone(text(challenge.challengeId), code), t('تم التحقق من الهاتف.', 'Phone verified.')).then(result => {if (result) {updateChallenge(null); setPhone(''); refresh();}})}/></> : null}
    </> : <Paragraph>{t('التحقق عبر المزود غير متاح حاليًا. تبقى SMS وWhatsApp متوقفتين دون هاتف متحقق وموافقة صريحة.', 'Provider verification is unavailable. SMS and WhatsApp remain disabled without a verified phone and explicit consent.')}</Paragraph>}
    {initial.phoneVerified === true ? <><Toggle testID="notice-phone-remove-confirm" label={t('أطلب إزالة الهاتف وإيقاف موافقات SMS وWhatsApp', 'I request phone removal and withdrawal of SMS and WhatsApp consent')} value={removePhoneConfirmed} onChange={setRemovePhoneConfirmed}/><Button testID="notice-phone-remove" busy={action.busy} disabled={!removePhoneConfirmed} kind="danger" label={t('إزالة الهاتف المتحقق', 'Remove verified phone')} onPress={() => void action.run(() => productApi.removePhone(Number(initial.revision)), t('أُزيل الهاتف.', 'Phone removed.')).then(result => {if (result) refresh();})}/></> : null}
  </Card>
  <Card title={t('تسجيل هذا الجهاز', 'Register this device')}><Paragraph muted>{t('تسجيل الجهاز منفصل عن موافقة Push أعلاه، ويرتبط بجلسة حسابك الحالية.', 'Device registration is separate from push consent above and belongs to your current account session.')}</Paragraph><Paragraph>{pushState}</Paragraph>
    <Button testID="notice-register-push" busy={action.busy} label={t('طلب إذن الإشعارات وتسجيل الجهاز', 'Request notification permission and register device')} onPress={() => void action.run(registerDevicePush, '').then(result => {if (result) setPushState(({enabled: t('تم تسجيل الجهاز.', 'Device registered.'), denied: t('الإذن مرفوض. غيّره من إعدادات الجهاز.', 'Permission denied. Change it in device settings.'), guest: t('يلزم تسجيل الدخول.', 'Sign-in required.'), unavailable: t('تسجيل Push غير متاح في هذه النسخة.', 'Push registration is unavailable in this build.')})[result]);})}/>
    <Button testID="notice-unregister-push" busy={action.busy} kind="quiet" label={t('إلغاء تسجيل هذا الجهاز', 'Unregister this device')} onPress={() => void action.run(() => unregisterCurrentDevice(() => current(authKey)), t('أُلغي تسجيل الجهاز لهذه الجلسة.', 'Device unregistered for this session.')).then(result => {if (result) setPushState(t('الجهاز غير مسجل لهذه الجلسة.', 'Device is unregistered for this session.'));})}/>
  </Card>
  {initial.canReview === true ? <ReviewQueue/> : null}
  </>;
}
function Deliveries() {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.notificationDeliveries(signal));
  return <><Paragraph muted>{t('قبول المزود أو خدمة الهاتف لا يثبت عرض الإشعار أو قراءته.', 'Provider or device-service acceptance does not prove notification display or reading.')}</Paragraph><Resource {...data} empty={!rows(data.data).length} retry={() => void data.refresh()}>{rows(data.data).map(row => <Card key={text(row.id)}><State value={row.state}/><Facts items={[[t('القناة', 'Channel'), row.channel], [t('الحدث', 'Event'), row.event], [t('السبب', 'Reason'), row.reason], [t('التاريخ', 'Date'), date(row.createdAt, locale)]]}/></Card>)}</Resource></>;
}
function ReviewQueue() {
  const {t} = useProduct(), data = useProductResource(signal => productApi.notificationReviews(signal));
  return <Resource {...data} retry={() => void data.refresh()}><Paragraph>{t('المراجعة الإدارية توثق القرار دون إعادة إرسال أو تأكيد تسليم.', 'Administrative review records a decision without resending or asserting delivery.')}</Paragraph>{rows(data.data).map(row => <Review key={text(row.id)} row={row} refresh={() => void data.refresh()}/>)}</Resource>;
}
function Review({row, refresh}: {row: Row; refresh: () => void}) {
  const {t} = useProduct(), action = useProductAction(), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false);
  return <Card><Facts items={[[t('القناة', 'Channel'), row.channel], [t('الحدث', 'Event'), row.event], [t('السبب', 'Reason'), row.reason]]}/><State value={row.state}/><Field testID={'notice-review-reason-' + text(row.id)} label={t('سبب إغلاق المراجعة', 'Reason for closing review')} value={reason} onChange={setReason} multiline maxLength={1000}/><Toggle testID={'notice-review-confirm-' + text(row.id)} label={t('أوثق الإغلاق دون إعادة إرسال أو إثبات تسليم', 'I record closure without resending or asserting delivery')} value={confirmed} onChange={setConfirmed}/><Notice error={action.error}/><Button testID={'notice-review-close-' + text(row.id)} busy={action.busy} disabled={!confirmed || reason.trim().length < 10} label={t('إغلاق المراجعة', 'Close review')} onPress={() => void action.run(() => productApi.closeNotificationReview(text(row.id), reason), '').then(result => {if (result) refresh();})}/></Card>;
}
