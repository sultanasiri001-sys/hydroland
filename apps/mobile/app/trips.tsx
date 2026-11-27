import {useState} from 'react';
import {router, useLocalSearchParams} from 'expo-router';
import {productApi} from '../src/product-client';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, integer, money, object, roles, rows, Row, text} from '../src/product-model';
import {Facts, State} from '../src/product-record-ui';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, Toggle} from '../src/product-ui';

export default function Trips() {
  const {profile, authKey, t} = useProduct(), {tripId} = useLocalSearchParams<{tripId?: string}>();
  const [tab, setTab] = useState('CATALOG');
  const permitted = roles(profile), historyRoles = [...(permitted.includes('INSTRUCTOR') ? ['instructor'] : []), ...(permitted.includes('BOAT_OWNER') ? ['boat'] : [])];
  return <Screen testID="trips-screen" title={t('الرحلات', 'Trips')} subtitle={t('الأوقات المعروضة بتوقيت السعودية. قرار الأهلية والسلامة يعتمد على مراجعة الخادم.', 'Times are shown in Saudi time. Eligibility and safety depend on the server review.')}>
    {historyRoles.length ? <Choices testID="trips-view" label={t('الرحلات المتاحة والسجل المهني', 'Available trips and professional history')} value={tab} onChange={setTab} options={[{value: 'CATALOG', label: t('الرحلات المتاحة', 'Available trips')}, ...historyRoles.map(value => ({value, label: value === 'instructor' ? t('سجل المدرب', 'Instructor history') : t('سجل الوسيط البحري', 'Marine operator history')}))]}/> : null}
    {tab === 'CATALOG' || !historyRoles.includes(tab) ? <Catalog key={authKey} selectedId={typeof tripId === 'string' ? tripId : undefined}/> : <Completed key={authKey + tab} role={tab as 'instructor' | 'boat'}/>}
  </Screen>;
}
function Catalog({selectedId}: {selectedId?: string}) {
  const data = useProductResource(signal => productApi.trips(signal), [], {public: true});
  const {t} = useProduct();
  const [selected, setSelected] = useState(selectedId ?? '');
  const all = rows(data.data), visible = selected ? all.filter(row => row.id === selected) : all;
  return <><Button testID="trips-refresh" kind="quiet" label={t('تحديث الرحلات', 'Refresh trips')} onPress={() => void data.refresh()}/>
    {selected ? <Button testID="trips-all" kind="quiet" label={t('كل الرحلات', 'All trips')} onPress={() => setSelected('')}/> : null}
    <Resource {...data} empty={!visible.length} retry={() => void data.refresh()}>{visible.map(row => <Trip key={text(row.id)} row={row}/>)}</Resource>
  </>;
}
function Trip({row}: {row: Row}) {
  const {profile, t, locale} = useProduct(), action = useProductAction();
  const [seats, setSeats] = useState('1'), [confirmed, setConfirmed] = useState(false);
  const price = object(row.price), safety = object(row.safety), weather = object(row.weather), evaluation = object(weather.evaluation), location = object(row.location), policy = object(row.bookingPolicy);
  async function book() {
    if (!profile) {router.push({pathname: '/login', params: {returnTo: '/trips?tripId=' + encodeURIComponent(text(row.id))}}); return;}
    const result = await action.run(() => productApi.bookTrip(text(row.id), integer(seats, 1, Math.max(1, Number(row.remainingSeats) || 1))), t('أُنشئ الحجز. راجع المشاركين والشروط قبل الدفع.', 'Booking created. Review participants and original terms before payment.'));
    if (result && typeof result.id === 'string') router.push({pathname: '/bookings' as never, params: {bookingId: result.id}});
  }
  return <Card title={text(row.title)} testID={'trip-' + text(row.id)}><Facts items={[[t('المركز', 'Center'), row.centerName], [t('النوع', 'Type'), row.type], [t('الموقع', 'Location'), location.locationName ?? location.name ?? row.locationName], [t('الانطلاق', 'Departure'), date(row.startsAt, locale)], [t('العودة', 'Return'), date(row.endsAt, locale)], [t('المقاعد المتبقية', 'Remaining seats'), row.remainingSeats], [t('سعر المقعد', 'Price per seat'), price.configured ? money(price.pricePerSeatMinor, price.currency, locale) : t('يحتاج تحديد السعر', 'Price needs configuration')]]}/><State value={row.status}/>
    <Facts items={[[t('قرار السلامة', 'Safety decision'), safety.decision ?? t('غير متحقق', 'Unverified')], [t('مراجعة الطقس', 'Weather review'), weather.reviewStatus ?? t('غير متحقق', 'Unverified')], [t('سياسة السلامة', 'Safety policy'), policy.safetyApproval], [t('سياسة الطقس', 'Weather policy'), policy.weatherGate]]}/>
    {evaluation.blocking === true || safety.decision === 'DEFERRED' ? <Notice error={t('تحتاج هذه الرحلة معالجة حالة السلامة أو الطقس قبل الحجز.', 'This trip needs its safety or weather status resolved before booking.')}/> : null}
    <Field testID={'trip-seats-' + text(row.id)} label={t('عدد المقاعد', 'Number of seats')} value={seats} onChange={setSeats} keyboard="numeric" maxLength={3}/>
    <Toggle testID={'trip-confirm-' + text(row.id)} label={t('راجعت الموعد والمقاعد؛ الحجز لا يثبت أهلية المشاركين', 'I reviewed the schedule and seats; booking does not verify participant eligibility')} value={confirmed} onChange={setConfirmed}/>
    <Notice error={action.error} message={action.message}/>
    <Button testID={'trip-book-' + text(row.id)} busy={action.busy} disabled={!confirmed || row.remainingSeats === 0 || price.configured !== true || evaluation.blocking === true || safety.decision === 'DEFERRED'} label={profile ? t('إنشاء الحجز', 'Create booking') : t('تسجيل الدخول للحجز', 'Sign in to book')} onPress={() => void book()}/>
  </Card>;
}
function Completed({role}: {role: 'instructor' | 'boat'}) {
  const [page, setPage] = useState(1), {t, locale} = useProduct();
  const data = useProductResource(signal => productApi.completedTrips(role, page, signal), [role, page]);
  return <Resource {...data} retry={() => void data.refresh()}><Facts items={[[t('عدد الرحلات', 'Trip count'), data.data?.tripCount], [t('عدد المشاركين', 'People count'), data.data?.peopleCount]]}/>
    {rows(data.data).map(row => <Card key={text(row.id)} title={text(row.title)}><Facts items={[[t('التاريخ', 'Date'), date(row.startsAt, locale)], [t('المشاركون', 'People'), row.peopleCount]]}/><Button testID={'history-trip-' + text(row.id)} label={t('فتح يوم الرحلة', 'Open trip day')} onPress={() => router.push({pathname: '/trip-day', params: {tripId: text(row.id)}})}/></Card>)}
    {page > 1 ? <Button testID="trips-history-prev" label={t('السابق', 'Previous')} onPress={() => setPage(page - 1)}/> : null}{page * 20 < Number(data.data?.tripCount) ? <Button testID="trips-history-next" label={t('التالي', 'Next')} onPress={() => setPage(page + 1)}/> : null}
  </Resource>;
}
