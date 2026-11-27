import {useEffect, useRef, useState} from 'react';
import {AppState, Linking} from 'react-native';
import {productApi} from './product-client';
import {useProduct} from './product-context';
import {useProductAction, useProductResource} from './product-hooks';
import {date, httpsUrl, money, object, Row, text} from './product-model';
import {Facts, PolicyNotice, State} from './product-record-ui';
import {Button, Card, Notice, Paragraph, Resource, Toggle} from './product-ui';

export function acceptedQuote(value: unknown, kind: 'TRIP' | 'COURSE', sourceId: string, accountId: string) {
  const quote = object(value), snapshot = object(quote.snapshot), source = object(snapshot.source);
  const supported = kind === 'TRIP' ? quote.policyVersion === '2026-11-21.1' : ['2026-11-21.1', '2026-11-21.2'].includes(String(quote.policyVersion));
  if (!supported || typeof quote.quoteHash !== 'string' || !/^[a-f0-9]{64}$/.test(quote.quoteHash) || typeof quote.policyVersion !== 'string' || snapshot.kind !== kind || source.id !== sourceId || source.kind !== (kind === 'TRIP' ? 'TRIP_BOOKING' : 'TRAINING_ENROLLMENT') || snapshot.customerAccountId !== accountId || !Number.isSafeInteger(snapshot.amountMinor) || Number(snapshot.amountMinor) < 0 || snapshot.currency !== 'SAR') throw new Error('Original quote is unavailable.');
  return {quoteHash: quote.quoteHash, policyVersion: quote.policyVersion};
}
export function OriginalContract({snapshot, policyVersion}: {snapshot: Row; policyVersion?: string}) {
  const {t, locale} = useProduct(), issuer = object(snapshot.issuer), schedule = object(snapshot.originalSchedule);
  const version = policyVersion || text(object(object(snapshot.refundPolicy).snapshot).version, '');
  const course = snapshot.kind === 'COURSE';
  const terms = course ? version === '2026-11-21.2'
    ? t('إذا ألغيت الدورة المؤكدة وبقي على بدايتها أكثر من ٤٨ ساعة، يُخصم ٢٥٪ ويُردّ ٧٥٪. عند بقاء ٤٨ ساعة بالضبط أو أقل لا يُرد المبلغ في الإلغاء الاختياري. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إذا ألغى المركز قبل البداية يُرد المبلغ كاملًا.', 'For a confirmed course cancelled more than 48 hours before its start, 25% is retained and 75% refunded. At exactly 48 hours or less, voluntary cancellation has no ordinary refund. No ordinary refund applies for no-show or withdrawal after starting. Center cancellation before the start receives a full refund.')
    : version === '2026-11-21.1' ? t('لا توجد مهلة إلغاء مجانية بعد تأكيد الدورة. إلغاء العميل قبل البداية يحتاج مراجعة لأن رسمه لم يُحدد. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إلغاء المركز قبل البدء يستوجب ردًا كاملًا.', 'There is no free cancellation period after course confirmation. Customer cancellation before the start needs review because its fee was not specified. No ordinary refund applies to no-show or withdrawal after starting. Center cancellation before the start requires a full refund.') : ''
    : version === '2026-11-21.1' ? t('إلغاء الرحلة قبل موعد الانطلاق بـ٤٨ ساعة أو أكثر: استرداد كامل. قبل الانطلاق بأقل من ٤٨ ساعة: استرداد ٥٠٪. لا استرداد عادي بعد إغلاق الرحلة أو عند توثيق عدم الحضور. حالات إلغاء المزود أو الطقس تحتاج مراجعة مستقلة.', 'Trip cancellation at least 48 hours before departure: full refund. Less than 48 hours before departure: 50% refund. There is no ordinary refund after trip closure or a verified no-show. Provider or weather cancellation requires separate review.') : '';
  return <Card title={t('الشروط الأصلية للعملية', 'Original transaction terms')}>
    <Facts items={[[t('الخدمة', 'Service'), snapshot.title], [t('المورد', 'Supplier'), issuer.legalName ?? issuer.displayName], [t('السجل التجاري', 'Registration number'), issuer.registrationNumber], [t('العدد', 'Quantity'), snapshot.quantity], [t('الإجمالي', 'Total'), money(snapshot.amountMinor, snapshot.currency, locale)], [t('البداية الأصلية', 'Original start'), date(schedule.startsAt, locale)], [t('النهاية الأصلية', 'Original end'), date(schedule.endsAt, locale)], [t('إصدار الشروط', 'Terms version'), version]]}/>
    <Paragraph>{terms || t('يلزم عرض معتمد لهذا الإصدار قبل قبول الشروط والدفع.', 'An approved presentation of this version is required before accepting terms and paying.')}</Paragraph>
    <Paragraph muted>{t('تُراجع الحقوق النظامية والأدلة بصورة مستقلة. هذه بيانات العملية وليست فاتورة ضريبية نهائية. تأكيد الدفع لا يمنح أهلية المشاركة أو يثبت إتمام التدريب.', 'Statutory rights and evidence are reviewed independently. These transaction details are not a final tax invoice. Payment does not grant participation eligibility or prove training completion.')}</Paragraph>
  </Card>;
}
export function Checkout({kind, sourceId, existing, onChanged}: {kind: 'TRIP' | 'COURSE'; sourceId: string; existing?: Row; onChanged: () => void}) {
  const {profile, t, authKey, current, ensureCurrent} = useProduct();
  const data = useProductResource(signal => kind === 'TRIP' ? productApi.tripQuote(sourceId, signal) : productApi.courseQuote(sourceId, signal), [kind, sourceId]);
  const [acceptedHash, setAcceptedHash] = useState(''), [payment, setPayment] = useState<Row | null>(existing ?? null), [returned, setReturned] = useState(false);
  const action = useProductAction(), opened = useRef(false);
  const latest = useRef<() => void>(() => {});
  async function refresh() {
    const paymentId = text(payment?.id ?? existing?.id, '');
    const result = await action.run(() => kind === 'COURSE' ? productApi.refreshCoursePayment(sourceId) : paymentId ? productApi.refreshPayment(paymentId) : productApi.payments().then(items => {const found = items.find(item => item.bookingId === sourceId); if (!found) throw new Error('Payment not found.'); return found;}), t('تمت قراءة حالة الدفع من الخادم.', 'Payment status was read from the server.'));
    if (result) {setPayment(result); setReturned(false); onChanged();}
  }
  latest.current = () => void refresh();
  useEffect(() => {const subscription = AppState.addEventListener('change', state => {if (state === 'active' && opened.current && current(authKey)) {opened.current = false; setReturned(true); latest.current();}}); return () => subscription.remove();}, [authKey, current]);
  async function checkout() {
    const quote = data.data;
    if (!quote || acceptedHash !== quote.quoteHash || !profile) return;
    const result = await action.run(async () => {
      const acceptance = acceptedQuote(quote, kind, sourceId, profile.id);
      const state = kind === 'TRIP' ? await productApi.tripCheckout(sourceId, 'booking:' + sourceId, acceptance) : await productApi.courseCheckout(sourceId, 'course:' + sourceId, acceptance);
      if (state.checkoutUrl) {await ensureCurrent(authKey); const url = httpsUrl(state.checkoutUrl); opened.current = true; await Linking.openURL(url);}
      return state;
    }, t('أُنشئت محاولة الدفع. تحقق من الحالة بعد الرجوع من المزود.', 'Checkout was requested. Check its status after returning from the provider.'));
    if (result) setPayment(result);
    else setAcceptedHash('');
  }
  return <><Resource {...data} retry={() => {setAcceptedHash(''); void data.refresh();}}>
    {data.data ? <><OriginalContract snapshot={object(data.data.snapshot)} policyVersion={text(data.data.policyVersion)}/>
      <Toggle testID="checkout-accept" label={t('قرأت الشروط الأصلية وأوافق عليها', 'I read and accept the original terms')} value={acceptedHash === data.data.quoteHash} onChange={checked => setAcceptedHash(checked ? text(data.data!.quoteHash, '') : '')}/>
      <Button testID="checkout-submit" busy={action.busy} disabled={!acceptedHash || acceptedHash !== data.data.quoteHash} label={t('المتابعة إلى الدفع', 'Continue to payment')} onPress={() => void checkout()}/>
    </> : null}
  </Resource>
    <Notice error={action.error} message={action.message}/>
    {payment ? <Card title={t('الحالة المعادة من الخادم', 'Status returned by the server')}><State value={payment.status}/><Facts items={[[t('مرجع العملية', 'Transaction reference'), payment.id ?? payment.checkoutId], [t('المزود', 'Provider'), payment.provider], [t('حالة المزود', 'Provider status'), payment.providerStatus]]}/><PolicyNotice value={payment.policyReview}/></Card> : null}
    {returned ? <Paragraph>{t('عدت من الدفع. يلزم نجاح التحقق من الخادم قبل اعتبار العملية مدفوعة.', 'You returned from checkout. A successful server check is required before treating the transaction as paid.')}</Paragraph> : null}
    <Button testID="checkout-refresh" kind="quiet" busy={action.busy} label={t('تحديث حالة الدفع', 'Refresh payment status')} onPress={() => void refresh()}/>
    <Button testID="checkout-reload-terms" kind="quiet" disabled={action.busy} label={t('إعادة تحميل الشروط الأصلية', 'Reload original terms')} onPress={() => {setAcceptedHash(''); void data.refresh();}}/>
  </>;
}
