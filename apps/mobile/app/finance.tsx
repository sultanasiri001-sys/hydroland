import {useState} from 'react';
import {useLocalSearchParams} from 'expo-router';
import {productApi} from '../src/product-client';
import {useProduct} from '../src/product-context';
import {useProductAction, useProductResource} from '../src/product-hooks';
import {date, money, moneyInput, object, roles, rows, Row, text} from '../src/product-model';
import {sharePrivateBytes, withInvoiceFile} from '../src/product-native-files';
import {Facts, State} from '../src/product-record-ui';
import {Button, Card, Choices, Field, Notice, Paragraph, Resource, Screen, SignIn, Toggle} from '../src/product-ui';

export default function Finance() {
  const {profile, authKey, t} = useProduct(), {paymentId} = useLocalSearchParams<{paymentId?: string}>();
  return <Screen testID="finance-screen" title={t('المالية والفواتير', 'Finance and invoices')}>
    {profile ? <FinanceContent key={authKey} paymentId={typeof paymentId === 'string' ? paymentId : undefined}/> : <SignIn returnTo="/finance"/>}
  </Screen>;
}
function FinanceContent({paymentId}: {paymentId?: string}) {
  const {profile, t} = useProduct(), [tab, setTab] = useState('PAYMENTS');
  return <><Choices testID="finance-tab" label={t('سجلاتي المالية', 'My financial records')} value={tab} onChange={setTab} options={[{value: 'PAYMENTS', label: t('الدفعات', 'Payments')}, {value: 'INVOICES', label: t('الفواتير', 'Invoices')}, {value: 'WALLET', label: t('المحفظة', 'Wallet')}, ...(roles(profile).includes('INSTRUCTOR') ? [{value: 'EARNINGS', label: t('استحقاقات التدريب', 'Training earnings')}] : [])]}/>
    {tab === 'PAYMENTS' ? <Payments selectedId={paymentId}/> : tab === 'INVOICES' ? <Invoices/> : tab === 'WALLET' ? <Wallet/> : roles(profile).includes('INSTRUCTOR') ? <Earnings/> : null}
  </>;
}
function Payments({selectedId}: {selectedId?: string}) {
  const data = useProductResource(signal => productApi.payments(signal)), [all, setAll] = useState(!selectedId), {t} = useProduct();
  const visible = rows(data.data).filter(row => all || row.id === selectedId);
  return <>{!all ? <Button testID="payments-all" kind="quiet" label={t('كل الدفعات', 'All payments')} onPress={() => setAll(true)}/> : null}<Resource {...data} empty={!visible.length} retry={() => void data.refresh()}>{visible.map(row => <Payment key={text(row.id)} row={row} refresh={() => void data.refresh()}/>)}</Resource></>;
}
function Payment({row, refresh}: {row: Row; refresh: () => void}) {
  const {t, locale} = useProduct(), action = useProductAction(), [reason, setReason] = useState(''), [amount, setAmount] = useState(''), [confirmed, setConfirmed] = useState(false), [receipt, setReceipt] = useState<Row | null>(null);
  return <Card title={t('دفعة حجز', 'Booking payment')} testID={'payment-' + text(row.id)}><State value={row.status}/><Facts items={[[t('مرجع الدفعة', 'Payment reference'), row.id], [t('مرجع الحجز', 'Booking reference'), row.bookingId], [t('المبلغ', 'Amount'), money(row.amountMinor, row.currency, locale)], [t('المسترد', 'Refunded'), money(row.refundedAmountMinor ?? 0, row.currency, locale)], [t('التاريخ', 'Date'), date(row.createdAt, locale)], [t('الفاتورة', 'Invoice'), object(row.invoice).number]]}/>
    <Notice error={action.error} message={action.message}/><Button testID={'payment-refresh-' + text(row.id)} kind="quiet" busy={action.busy} label={t('التحقق من حالة المزود', 'Check provider status')} onPress={() => void action.run(() => productApi.refreshPayment(text(row.id)), '').then(result => {if (result) refresh();})}/>
    {row.status === 'CAPTURED' ? <><Paragraph>{t('إرسال طلب استرداد يوثق طلبك للمراجعة. لا ينفذ تحويلًا أو يضمن مبلغًا مستردًا.', 'A refund request records your request for review. It does not execute a transfer or guarantee a refund amount.')}</Paragraph>
      <Field testID={'refund-reason-' + text(row.id)} label={t('سبب الاسترداد', 'Refund reason')} value={reason} onChange={setReason} multiline maxLength={1000}/><Field testID={'refund-amount-' + text(row.id)} label={t('المبلغ المطلوب (اختياري، بعملة الدفعة)', 'Requested amount (optional, in payment currency)')} value={amount} onChange={setAmount} keyboard="decimal-pad" maxLength={13}/>
      <Toggle testID={'refund-confirm-' + text(row.id)} label={t('أطلب إرسال هذا الطلب للمراجعة', 'I request submission for review')} value={confirmed} onChange={setConfirmed}/>
      <Button testID={'refund-submit-' + text(row.id)} busy={action.busy} disabled={!confirmed || reason.trim().length < 10} label={t('إرسال طلب الاسترداد', 'Submit refund request')} onPress={() => void action.run(() => productApi.requestRefund(text(row.id), reason.trim(), amount ? moneyInput(amount, text(row.currency)) : undefined, text(row.currency)), t('استُلم طلب الاسترداد للمراجعة.', 'Refund request received for review.')).then(result => {if (result) {setReceipt(result); setConfirmed(false);}})}/>
    </> : null}
    {receipt ? <Card title={t('إيصال الطلب', 'Request receipt')}><State value={receipt.status}/><Facts items={[[t('مرجع التدقيق', 'Audit reference'), receipt.auditEventId], [t('المطلوب', 'Requested'), money(receipt.requestedAmountMinor, receipt.currency, locale)], [t('حالة التقييم', 'Evaluation status'), object(receipt.policyDecision).status], [t('سبب التقييم', 'Evaluation reason'), object(receipt.policyDecision).reasonCode]]}/><Paragraph>{t('لم يُنفذ استرداد من هذه الخطوة.', 'This step did not execute a refund.')}</Paragraph></Card> : null}
  </Card>;
}
function Invoices() {
  const {t} = useProduct(), [view, setView] = useState('all'), [offset, setOffset] = useState(0), data = useProductResource(signal => productApi.invoices(view, offset, signal), [view, offset]);
  return <><Choices testID="invoices-view" label={t('عرض الفواتير', 'Invoice view')} value={view} onChange={value => {setView(value); setOffset(0);}} options={[{value: 'all', label: t('الكل', 'All')}, {value: 'purchases', label: t('المشتريات', 'Purchases')}, {value: 'sales', label: t('المبيعات', 'Sales')}]}/>
    <Resource {...data} empty={!rows(data.data).length} retry={() => void data.refresh()}>{rows(data.data).map(row => <Invoice key={text(row.sourceType) + ':' + text(row.sourceId)} row={row} refresh={() => void data.refresh()}/>)}</Resource>
    {offset > 0 ? <Button testID="invoices-prev" kind="quiet" label={t('السابق', 'Previous')} onPress={() => setOffset(Math.max(0, offset - 30))}/> : null}{typeof data.data?.nextOffset === 'number' ? <Button testID="invoices-next" kind="quiet" label={t('التالي', 'Next')} onPress={() => setOffset(Number(data.data!.nextOffset))}/> : null}
  </>;
}
function Invoice({row, refresh}: {row: Row; refresh: () => void}) {
  const {t, locale, current, authKey, ensureCurrent} = useProduct(), action = useProductAction(), [number, setNumber] = useState(text(row.number, '')), [finalize, setFinalize] = useState(false), [reviewed, setReviewed] = useState(false);
  const sourceType = text(row.sourceType), sourceId = text(row.sourceId);
  async function download() {await action.run(async () => {const bytes = await productApi.invoiceBytes(sourceType, sourceId); await ensureCurrent(authKey); return sharePrivateBytes(new Uint8Array(bytes), 'pdf', () => current(authKey));}, t('جُهّز أصل الفاتورة للمشاركة.', 'The original invoice is ready to share.'));}
  async function upload() {const result = await action.run(() => withInvoiceFile(number, () => current(authKey), async body => {await ensureCurrent(authKey); return productApi.attachInvoice(sourceType, sourceId, body);}), t('أُرفق أصل الفاتورة.', 'Original invoice attached.')); if (result) refresh();}
  return <Card title={text(row.number, t('فاتورة دون أصل مرفق', 'Invoice without an attached original'))}><State value={row.finalizationStatus ?? row.nativeStatus}/><Facts items={[[t('المورد', 'Supplier'), row.sellerName], [t('المبلغ', 'Amount'), money(row.amountMinor, row.currency, locale)], [t('التاريخ', 'Date'), date(row.occurredAt, locale)], [t('مرجع العملية', 'Source reference'), sourceId]]}/>
    <Notice error={action.error} message={action.message}/>
    {row.hasDocument === true ? <Button testID={'invoice-download-' + sourceId} busy={action.busy} label={t('فتح أو مشاركة الفاتورة الأصلية PDF', 'Open or share original PDF invoice')} onPress={() => void download()}/> : <Paragraph muted>{t('لم يُرفق الأصل من المورد بعد.', 'The supplier has not attached the original yet.')}</Paragraph>}
    {row.canAttach === true && row.hasDocument !== true ? <><Field testID={'invoice-number-' + sourceId} label={t('رقم الفاتورة الأصلية', 'Original invoice number')} value={number} onChange={setNumber} maxLength={100}/><Toggle testID={'invoice-original-reviewed-' + sourceId} label={t('راجعت أصل الفاتورة ورقمها لهذه العملية', 'I reviewed the original invoice and number for this transaction')} value={reviewed} onChange={setReviewed}/><Button testID={'invoice-upload-' + sourceId} busy={action.busy} disabled={!reviewed || !number.trim()} label={t('اختيار أصل PDF حتى 5 ميغابايت وإرفاقه', 'Choose and attach original PDF up to 5 MB')} onPress={() => void upload()}/></> : null}
    {sourceType === 'TRIP_PAYMENT' && row.buyerOrganizationId && (row.canFinalize === true || row.finalizationStatus === 'FINALIZED') ? <><Button testID={'invoice-finalization-' + sourceId} kind="quiet" label={t('مراجعة اعتماد أصل الفاتورة', 'Review original invoice finalization')} onPress={() => setFinalize(!finalize)}/>{finalize ? <InvoiceFinalization sourceId={sourceId} refresh={refresh}/> : null}</> : null}
  </Card>;
}
function InvoiceFinalization({sourceId, refresh}: {sourceId: string; refresh: () => void}) {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.invoiceFinalization(sourceId, signal), [sourceId]), action = useProductAction(), [issuedAt, setIssuedAt] = useState(''), [reviewed, setReviewed] = useState(false);
  const row = data.data;
  return <Resource {...data} retry={() => void data.refresh()}>{row ? <Card><State value={row.status}/><Facts items={[[t('البائع', 'Seller'), object(row.seller).name], [t('المشتري', 'Buyer'), object(row.buyer).name], [t('رقم الأصل', 'Original number'), row.number], [t('المبلغ', 'Amount'), money(row.amountMinor, row.currency, locale)], [t('بصمة الوثيقة', 'Document SHA-256'), row.documentSha256]]}/>
    {Array.isArray(row.blockers) ? row.blockers.map(value => <Paragraph key={String(value)}>{String(value)}</Paragraph>) : null}
    {row.canFinalize === true ? <><Field testID="invoice-issued-at" label={t('وقت إصدار الأصل مع المنطقة الزمنية، مثل 2026-11-27T14:00:00+03:00', 'Original issue time with timezone, e.g. 2026-11-27T14:00:00+03:00')} value={issuedAt} onChange={setIssuedAt} maxLength={35}/><Toggle testID="invoice-finalization-confirm" label={t('تحققت من الأصل ومطابقته للبيانات المعروضة بصفتي المحاسب المخول', 'As authorized accountant, I verified the original and its match to the displayed evidence')} value={reviewed} onChange={setReviewed}/><Notice error={action.error}/><Button testID="invoice-finalize" busy={action.busy} disabled={!reviewed || !Number.isFinite(Date.parse(issuedAt))} label={t('اعتماد أصل الفاتورة', 'Finalize original invoice')} onPress={() => void action.run(() => productApi.finalizeInvoice(sourceId, {issuedAt, expectedEvidenceHash: row.expectedEvidenceHash, originalInvoiceVerified: true}), '').then(result => {if (result) refresh();})}/></> : null}
  </Card> : null}</Resource>;
}
function Wallet() {
  const {t, locale} = useProduct(), data = useProductResource(async signal => ({wallet: await productApi.wallet(signal), entries: await productApi.walletEntries(signal)}));
  return <Resource {...data} retry={() => void data.refresh()}><Card title={t('رصيد المحفظة', 'Wallet balance')}><Paragraph>{money(data.data?.wallet.balanceMinor, data.data?.wallet.currency, locale)}</Paragraph><Paragraph muted>{t('السجل يعرض أحدث 100 حركة. لا ينفذ هذا العرض تحويلًا ماليًا.', 'The record shows the latest 100 entries. Viewing it does not execute a transfer.')}</Paragraph></Card>
    {rows(data.data?.entries).map(row => <Card key={text(row.id)}><Facts items={[[t('نوع الحركة', 'Entry type'), row.type], [t('المبلغ', 'Amount'), money(row.amountMinor, data.data?.wallet.currency, locale)], [t('الرصيد بعدها', 'Balance after'), money(row.balanceAfterMinor, data.data?.wallet.currency, locale)], [t('التاريخ', 'Date'), date(row.createdAt, locale)], [t('المرجع', 'Reference'), row.referenceId]]}/></Card>)}
  </Resource>;
}
function Earnings() {
  const {t, locale} = useProduct(), data = useProductResource(signal => productApi.professional('earnings', signal));
  const earnings = object(data.data), totals = object(earnings.totals);
  return <Resource {...data} retry={() => void data.refresh()}><Card title={t('استحقاقاتي التدريبية', 'My training earnings')}><Paragraph muted>{t('المجاميع بالريال السعودي فقط؛ تظهر كل حركة بعملتها الأصلية. الاعتماد والتسوية حالتان منفصلتان.', 'Totals are SAR only; each entry retains its original currency. Approval and settlement are separate states.')}</Paragraph><Facts items={[[t('قيد الاعتماد', 'Pending'), money(totals.pendingMinor, 'SAR', locale)], [t('معتمد', 'Approved'), money(totals.approvedMinor, 'SAR', locale)], [t('تمت التسوية', 'Settled'), money(totals.settledMinor, 'SAR', locale)]]}/></Card>
    {rows(earnings.agreements).map((row, index) => <Card key={String(index)} title={text(row.centerName)}><Facts items={[[t('نوع الاتفاق', 'Agreement mode'), row.mode], [t('الثابت', 'Fixed amount'), money(row.fixedMinor, row.currency, locale)], [t('النسبة', 'Rate'), typeof row.rateBps === 'number' ? String(row.rateBps / 100) + '%' : null], [t('توقيت الاستحقاق', 'Earning timing'), row.earningTiming], [t('شروط العكس', 'Reversal terms'), row.reversalTerms]]}/></Card>)}
    {rows(earnings.entries).map(row => <Card key={text(row.id)} title={text(row.courseCode)}><State value={row.status}/><Facts items={[[t('المبلغ', 'Amount'), money(row.amountMinor, row.currency, locale)], [t('التاريخ', 'Date'), date(row.createdAt, locale)], [t('مرحلة القيد', 'Posting stage'), row.postingStage]]}/></Card>)}
  </Resource>;
}
