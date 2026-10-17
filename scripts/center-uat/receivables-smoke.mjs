import assert from 'node:assert/strict';

export async function prepareReceivableChecks({db,call,ok,center,account}) {
  const invoices=await call('accountant1',`/finance/centers/${center.id}/receivable-invoices`);
  assert.deepEqual(invoices.items.map(x=>x.number).sort(),['UAT-A-001','UAT-A-002']);
  ok(invoices.total===2,'invoice candidates exclude center B');
  const primary=invoices.items.find(x=>x.number==='UAT-A-001');
  const second=invoices.items.find(x=>x.number==='UAT-A-002');
  const foreign=await db.invoice.findUniqueOrThrow({where:{number:'UAT-B-001'},include:{payment:true}});
  const payment=key=>db.payment.findUniqueOrThrow({where:{idempotencyKey:'center-uat-v1:'+key}});
  const firstPayment=await payment('A-001:collection-1');
  const lastPayment=await payment('A-001:collection-2');
  const otherBooking=await payment('A-002:collection-1');
  const otherCenter=await payment('B-001:collection-1');
  const dueAt='2030-02-01T00:00:00Z';
  const input={invoiceId:primary.id,customerAccountId:primary.customerAccountId,centerOrgUnitId:center.id,totalMinor:100000,dueAt,installments:[{sequence:1,amountMinor:40000,dueAt},{sequence:2,amountMinor:60000,dueAt}]};
  const denied=async(actor,path,body,code,status=400)=>{
    const data=await call(actor,path,body,[status]);ok(data.code===code,'denial reason: '+code);
  };
  await denied('accountant1','/finance/receivables',{...input,invoiceId:foreign.id,customerAccountId:foreign.payment.accountId,totalMinor:90000},'FINANCE_INVOICE_SCOPE_UNVERIFIED');
  await denied('accountant1','/finance/receivables',{...input,customerAccountId:account.manager},'FINANCE_INVOICE_CUSTOMER_MISMATCH');
  const created=await call('accountant1','/finance/receivables',input);
  ok(created.outstandingMinor===100000,'invoice starts unpaid');
  const id=created.receivableId;
  const detailPath=`/finance/centers/${center.id}/receivables/${id}`;
  const collectionPath=`/finance/receivables/${id}/collections`;
  await denied('accountant1','/finance/receivables',input,'FINANCE_RECEIVABLE_ALREADY_EXISTS',409);
  await call('outsider',detailPath,undefined,[403]);
  await call('admin',detailPath,undefined,[403]);
  const initial=await call('accountant1',detailPath);
  ok(!initial.collectable && initial.payments.total===0,'collection requires an open shift');
  const installment1=initial.installments.find(x=>x.sequence===1).id;
  const installment2=initial.installments.find(x=>x.sequence===2).id;
  const first={paymentId:firstPayment.id,amountMinor:40000,receiptNumber:'UAT-CI-RECEIPT-1',installmentId:installment1};
  await denied('accountant1',collectionPath,first,'FINANCE_OPEN_SHIFT_REQUIRED',409);
  return {
    async collectFirst(shiftId) {
      const available=await call('accountant1',detailPath);
      assert.deepEqual(available.payments.items.map(x=>x.id).sort(),[firstPayment.id,lastPayment.id].sort());
      ok(available.collectable,'only same-booking captured payments offered');
      await denied('accountant1',collectionPath,{...first,paymentId:otherBooking.id},'FINANCE_PAYMENT_NOT_SETTLED');
      await denied('accountant1',collectionPath,{...first,paymentId:otherCenter.id},'FINANCE_PAYMENT_NOT_SETTLED');
      await denied('accountant1',collectionPath,{...first,amountMinor:39999},'FINANCE_PAYMENT_AMOUNT_MISMATCH');
      await denied('accountant1',collectionPath,{...first,installmentId:undefined},'FINANCE_INSTALLMENT_REQUIRED');
      const result=await call('accountant1',collectionPath,first);
      ok(result.outstandingMinor===60000&&result.paidMinor===40000&&result.shiftId===shiftId&&result.status==='PARTIALLY_PAID','partial collection attaches to collector shift');
      await denied('accountant1',collectionPath,first,'FINANCE_COLLECTION_ALREADY_RECORDED');
      await denied('accountant1',`/finance/shifts/${shiftId}/entries`,{type:'REVENUE',amountMinor:40000,paymentId:firstPayment.id},'FINANCE_PAYMENT_ALREADY_LEDGERED',409);
      const after=await call('accountant1',detailPath);
      ok(after.installments.find(x=>x.sequence===1).status==='PAID'&&after.payments.total===1,'paid installment and used payment excluded');
      const otherInput={...input,invoiceId:second.id,totalMinor:70000,installments:[]};
      const other=await call('accountant1','/finance/receivables',otherInput);
      const deniedRead=await call('accountant1',`/finance/centers/${center.id}/receivables/${other.receivableId}`);
      ok(!deniedRead.payments.items.some(x=>x.id===firstPayment.id),'payment not offered for a different invoice booking');
    },
    async collectSecond(shiftId) {
      const result=await call('accountant2',collectionPath,{paymentId:lastPayment.id,amountMinor:60000,receiptNumber:'UAT-CI-RECEIPT-2',installmentId:installment2});
      ok(result.status==='PAID'&&result.outstandingMinor===0&&result.paidMinor===100000&&result.shiftId===shiftId,'second accountant completes collection on own shift');
      const after=await call('accountant2',detailPath);
      ok(after.installments.every(x=>x.status==='PAID')&&!after.collectable&&after.payments.total===0,'fully paid receivable no longer collectable');
      ok(after.collections.length===2&&new Set(after.collections.map(x=>x.collectedByAccountId)).size===2,'collector identities preserved');
      const ledger=await db.financeShiftEntry.findMany({where:{paymentId:{in:[firstPayment.id,lastPayment.id]}}});
      ok(ledger.length===2&&ledger.every(x=>x.referenceType==='RECEIVABLE_COLLECTION'),'exactly one linked ledger entry per collection');
    },
    async verifyRestart() {
      const r=await db.receivable.findUniqueOrThrow({where:{id}});
      ok(r.status==='PAID'&&r.paidMinor===100000,'restart keeps completed collections');
      ok(await db.invoice.count()===3&&await db.payment.count()===7&&await db.booking.count()===3,'restart does not duplicate synthetic fixtures');
      ok(await db.auditEvent.count({where:{action:'CENTER_UAT_FINANCE_FIXTURES_V1'}})===1,'fixture version recorded exactly once');
    }
  };
}
