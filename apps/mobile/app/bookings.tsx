import {useState} from 'react';
import {router, useLocalSearchParams} from 'expo-router';
import {productApi} from '../src/product-client';
import {Checkout, OriginalContract} from '../src/product-checkout';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, object, rows, Row, text} from '../src/product-model';
import {Facts, PolicyNotice, RecordForm, State} from '../src/product-record-ui';
import {Button, Card, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

export default function Bookings() {
  const {profile, authKey, t} = useProduct(), {bookingId} = useLocalSearchParams<{bookingId?: string}>();
  return <Screen testID="bookings-screen" title={t('حجوزاتي', 'My bookings')}>
    {profile ? <BookingsContent key={authKey} initial={typeof bookingId === 'string' ? bookingId : ''}/> : <SignIn returnTo={typeof bookingId === 'string' ? '/bookings?bookingId=' + encodeURIComponent(bookingId) : '/bookings'}/>}
  </Screen>;
}
function BookingsContent({initial}: {initial: string}) {
  const {t, locale} = useProduct(), [selected, setSelected] = useState(initial);
  const data = useProductResource(async signal => ({bookings: await productApi.bookings(signal), payments: await productApi.payments(signal)}));
  const bookings = rows(data.data?.bookings), chosen = bookings.find(row => row.id === selected);
  return <><Button testID="bookings-refresh" kind="quiet" label={t('تحديث حجوزاتي', 'Refresh bookings')} onPress={() => void data.refresh()}/>
    {selected ? <Button testID="bookings-all" kind="quiet" label={t('كل حجوزاتي', 'All bookings')} onPress={() => setSelected('')}/> : null}
    <Resource {...data} empty={!bookings.length || Boolean(selected && !chosen)} retry={() => void data.refresh()}>
      {chosen ? <Booking key={text(chosen.id)} row={chosen} payments={rows(data.data?.payments).filter(payment => payment.bookingId === chosen.id)} refresh={() => void data.refresh()}/> : bookings.map(row => <Card key={text(row.id)} title={text(object(row.trip).title)}><State value={row.status}/><Facts items={[[t('الانطلاق', 'Departure'), date(object(row.trip).startsAt, locale)], [t('المقاعد', 'Seats'), row.seats]]}/><Button testID={'booking-open-' + text(row.id)} label={t('التفاصيل والمشاركون والدفع', 'Details, participants and payment')} onPress={() => setSelected(text(row.id))}/></Card>)}
    </Resource>
    {!bookings.length && !data.loading ? <Button testID="bookings-explore" label={t('استكشاف الرحلات', 'Explore trips')} onPress={() => router.push('/trips' as never)}/> : null}
  </>;
}
function Booking({row, payments, refresh}: {row: Row; payments: Row[]; refresh: () => void}) {
  const {t, locale} = useProduct(), action = useProductAction(), trip = object(row.trip);
  const [cancelConfirmed, setCancelConfirmed] = useState(false), [showCheckout, setShowCheckout] = useState(false), [result, setResult] = useState<Row | null>(null);
  return <><Card title={text(trip.title)}><State value={row.status}/><Facts items={[[t('مرجع الحجز', 'Booking reference'), row.id], [t('المقاعد', 'Seats'), row.seats], [t('الانطلاق', 'Departure'), date(trip.startsAt, locale)], [t('العودة', 'Return'), date(trip.endsAt, locale)]]}/>
    <Button testID="booking-trip-day" kind="quiet" label={t('تجهيز يوم الرحلة', 'Prepare trip day')} onPress={() => router.push({pathname: '/trip-day', params: {tripId: text(row.tripId)}})}/>
    <Button testID="booking-finance" kind="quiet" label={t('الدفعات والفواتير', 'Payments and invoices')} onPress={() => router.push('/finance' as never)}/></Card>
    {Object.keys(object(row.contractSnapshot)).length ? <OriginalContract snapshot={object(row.contractSnapshot)}/> : <Notice error={t('الشروط الأصلية لهذا الحجز تحتاج مراجعة؛ لا تُستبدل بأسعار الرحلات الحالية.', 'This booking needs its original terms reviewed. Current catalog prices do not replace them.')}/>}
    <Participants bookingId={text(row.id)} editable={row.status !== 'CANCELLED'}/>
    {payments.map(payment => <Card key={text(payment.id)} title={t('دفعة الحجز', 'Booking payment')}><State value={payment.status}/><Facts items={[[t('المرجع', 'Reference'), payment.id], [t('الفاتورة', 'Invoice'), object(payment.invoice).number]]}/></Card>)}
    {row.status === 'PENDING' ? <><Button testID="booking-payment" label={showCheckout ? t('إغلاق الدفع', 'Close checkout') : t('مراجعة الشروط والدفع', 'Review terms and pay')} onPress={() => setShowCheckout(!showCheckout)}/>{showCheckout ? <Checkout kind="TRIP" sourceId={text(row.id)} existing={payments[0]} onChanged={refresh}/> : null}</> : null}
    {row.status !== 'CANCELLED' && trip.status !== 'COMPLETED' ? <Card title={t('إلغاء الحجز', 'Cancel booking')}><Paragraph>{t('قد يحتاج الإلغاء مراجعة مالية حسب الشروط الأصلية. إلغاء الحجز لا يعني رد المبلغ تلقائيًا.', 'Cancellation may require financial review under the original terms. Cancelling a booking does not automatically refund payment.')}</Paragraph>
      <Toggle testID="booking-cancel-confirm" label={t('أطلب إلغاء هذا الحجز بعد مراجعة شروطه', 'I request cancellation after reviewing this booking’s terms')} value={cancelConfirmed} onChange={setCancelConfirmed}/>
      <Button testID="booking-cancel" busy={action.busy} disabled={!cancelConfirmed} kind="danger" label={t('تأكيد طلب الإلغاء', 'Confirm cancellation request')} onPress={() => void action.run(() => productApi.cancelBooking(text(row.id)), t('استُلم طلب الإلغاء. راجع الحالة والقرار المالي المعادين.', 'Cancellation was submitted. Review the returned booking and financial status.')).then(value => {if (value) {setResult(value); setCancelConfirmed(false); refresh();}})}/><Notice error={action.error} message={action.message}/>
      {result ? <><State value={result.status}/><PolicyNotice value={result.financialReview ?? result.policyDecision}/></> : null}
    </Card> : null}
  </>;
}
function Participants({bookingId, editable}: {bookingId: string; editable: boolean}) {
  const {t} = useProduct(), data = useProductResource(signal => productApi.participants(bookingId, signal), [bookingId]);
  const [editing, setEditing] = useState('');
  return <Resource {...data} retry={() => void data.refresh()}><Card title={t('المشاركون وأهليتهم', 'Participants and eligibility')}><Paragraph muted>{t('تعديل بيانات المشارك يعيد الأهلية إلى انتظار المراجعة. تعبئة رقم مؤهل لا تعني اعتماده.', 'Editing participant details resets eligibility to pending review. Entering a credential number does not verify it.')}</Paragraph>
    {rows(data.data).map(row => <Card key={text(row.id)} title={text(row.fullName)}><State value={row.eligibilityStatus}/><Facts items={[[t('المؤهل', 'Credential'), row.certificationTitle], [t('الرقم', 'Number'), row.certificationNumber], [t('الجهة', 'Issuer'), row.certificationIssuer]]}/>
      {editable ? <Button testID={'participant-edit-' + text(row.id)} kind="quiet" label={t('تعديل البيانات', 'Edit details')} onPress={() => setEditing(editing === row.id ? '' : text(row.id))}/> : null}
      {editable && editing === row.id ? <RecordForm title={t('بيانات المشارك', 'Participant details')} testID="participant" initial={row} fields={[{key: 'fullName', ar: 'الاسم الكامل', en: 'Full name', required: true, maxLength: 160}, {key: 'certificationTitle', ar: 'المؤهل', en: 'Credential'}, {key: 'certificationNumber', ar: 'رقم المؤهل', en: 'Credential number'}, {key: 'certificationIssuer', ar: 'الجهة المصدرة', en: 'Issuer'}]} save={body => productApi.updateParticipant(bookingId, text(row.id), body)} onSaved={() => {setEditing(''); void data.refresh();}}/> : null}
    </Card>)}</Card></Resource>;
}
