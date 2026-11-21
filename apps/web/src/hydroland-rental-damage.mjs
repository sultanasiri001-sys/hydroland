const ar=()=>!(document.documentElement.lang||'ar').toLowerCase().startsWith('en');
const label=(arabic,english)=>ar()?arabic:english;
const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text??''});
const base='/trips/rental-damage/';
const states={
  AWAITING_RENTER:['بانتظار رد المستأجر','Awaiting renter response'],DISPUTED:['قيد المراجعة، التحصيل معلّق','Under review, collection on hold'],
  DISMISSED:['أُلغيت المطالبة','Claim dismissed'],PAYABLE:['مستحقة الدفع','Payable'],COLLECTED:['تم التحصيل','Collected']
};
function panel(root){
  const auth=window.HydrolandAuth,version=auth.getSessionVersion?.(),token=Symbol();
  root.damageView=token;
  const current=()=>root.isConnected&&root.damageView===token&&auth.isAuthenticated?.()&&version===auth.getSessionVersion?.();
  const message=el('p');message.setAttribute('role','status');root.replaceChildren(message);
  const request=async(path,options={},prefix=base)=>{
    if(!current())throw new Error();
    const response=await auth.authorizedFetch(prefix+path,options);
    if(!current())throw new Error();
    if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.message||label('تعذّر تنفيذ الطلب','Request failed'));}
    return response;
  };
  const action=(parent,title,fn)=>{
    const button=el('button',title);button.type='button';parent.append(button);
    button.addEventListener('click',async()=>{
      if(!current()||button.disabled)return;button.disabled=true;message.textContent='';
      try{await fn();}catch(e){if(current())message.textContent=e.message;}finally{if(current())button.disabled=false;}
    });return button;
  };
  return {current,request,action,message};
}
function drawClaim(p,root,claim,view,refresh){
  root.append(el('p',label('قيمة الإصلاح','Repair cost')+' · '+new Intl.NumberFormat(ar()?'ar-SA':'en',{style:'currency',currency:claim.currency}).format(claim.amountMinor/100)),
    el('p',label(...states[claim.status])),el('small',claim.id));
  if(claim.disputeReason)root.append(el('p',label('سبب الاعتراض','Dispute reason')+' · '+claim.disputeReason));
  if(claim.reviewReason)root.append(el('p',label('قرار المراجعة','Review decision')+' · '+claim.reviewReason));
  p.action(root,label('تنزيل مستند الإصلاح PDF','Download repair PDF'),async()=>{
    const blob=await (await p.request(encodeURIComponent(claim.id)+'/document')).blob();if(!p.current())return;
    const url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download='repair.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const renter=view==='renter';
  if(renter&&claim.status==='PAYABLE'){
    const payment=el('div');root.append(payment);
    const run=async op=>{
      const result=await (await p.request(encodeURIComponent(claim.id)+'/'+op,{method:'POST'},'/payments/rental-damage/')).json();
      if(!p.current())return;
      const messages={PENDING:['فاتورة الدفع جاهزة','Payment invoice ready'],CAPTURED:['أكد المزوّد الدفع، بانتظار مطابقة الدفتر','Payment confirmed by provider, awaiting ledger matching'],
        COLLECTED:['تم التحصيل','Collected'],CANCELLED:['انتهت فاتورة الدفع. يمكنك إنشاء فاتورة جديدة','Payment invoice expired. You can request a new one']};
      payment.replaceChildren(el('p',label(...(messages[result.status]||['جارٍ التحقق من المطابقة','Reconciliation required']))));
      if(result.status==='PENDING'&&result.url){
        const url=new URL(result.url);if(url.protocol!=='https:'||url.username||url.password||!(url.hostname==='moyasar.com'||url.hostname.endsWith('.moyasar.com')))throw new Error(label('رابط بوابة الدفع غير معتمد','Unrecognized payment provider link'));
        const link=el('a',label('فتح بوابة الدفع','Open payment provider'));link.href=url.href;link.rel='noreferrer';payment.append(link);
      }
    };
    p.action(root,label('تجهيز فاتورة دفع الضرر','Prepare damage payment invoice'),()=>run('checkout'));
    p.action(root,label('تحديث حالة دفعة الضرر','Refresh damage payment'),()=>run('refresh'));
  }
  if(claim.status!==(renter?'AWAITING_RENTER':'DISPUTED'))return;
  const reason=el('textarea');reason.maxLength=1000;const field=el('label',label('السبب عند الاعتراض أو المراجعة','Reason for dispute or review'));field.append(reason);root.append(field);
  const decide=async decision=>{
    if(decision!=='ACCEPT'&&!reason.value.trim())throw new Error(label('أدخل السبب أولًا','Enter a reason first'));
    await p.request(encodeURIComponent(claim.id)+(renter?'/respond':'/review'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,reason:reason.value.trim()})});
    if(p.current())await refresh();
  };
  p.action(root,renter?label('أوافق على المبلغ','Accept amount'):label('تأييد المطالبة','Uphold claim'),()=>decide(renter?'ACCEPT':'UPHOLD'));
  p.action(root,renter?label('أعترض على المطالبة','Dispute claim'):label('إلغاء المطالبة','Dismiss claim'),()=>decide(renter?'DISPUTE':'DISMISS'));
}
export async function renterClaim(root,item){
  const p=panel(root);
  try{
    const response=await p.request('items/'+encodeURIComponent(item.id)+'/mine'),claim=await response.text();if(!p.current())return;
    root.append(el('p',label('حالة التسليم','Handover condition')+' · '+(item.handoverCondition||'—')),el('p',label('حالة الإرجاع','Return condition')+' · '+(item.returnNotes||'—')));
    if(!claim||claim==='null'){p.message.textContent=label('لم تصدر مطالبة مالية لهذه القطعة','No claim issued for this item');return;}
    drawClaim(p,root,JSON.parse(claim),'renter',()=>renterClaim(root,item));
  }catch(e){if(p.current())p.message.textContent=e.message;}
}
const valuations={
  PENDING:['يُحدد بعد التحقق','Decide after verification'],QUOTE:['عرض سعر لقطعة مماثلة','Quote for an equivalent item'],
  SUPPLIER_INVOICE:['فاتورة استبدال من المورّد','Supplier replacement invoice'],AGREED_VALUE:['قيمة موثّقة اتفق عليها الطرفان','Documented agreed amount'],
  IN_KIND:['بديل عيني مماثل','Equivalent item in kind'],NO_COMPENSATION:['دون تعويض','No compensation']
};
const recoveries={
  INSPECT:['فحص القطعة ثم تحديد المعالجة','Inspect, then decide'],FULL_REFUND_REVIEW:['مراجعة رد كامل لمبلغ محصّل','Review full refund of collected funds'],
  PARTIAL_REFUND_REVIEW:['مراجعة رد جزئي بعد توثيق الضرر','Review partial refund after documenting damage'],
  IN_KIND_REVIEW:['مراجعة إعادة البديل العيني','Review return of the replacement item'],
  NO_PAYMENT_TO_RETURN:['إغلاق البلاغ عند الاستلام إذا لم يُحصّل مبلغ','Close on receipt if nothing was collected'],OTHER:['إجراء آخر موضّح في التفاصيل','Other action described in the report']
};
const selectOptions=choices=>{
  const menu=el('select');for(const [code,title] of Object.entries(choices))menu.add(new Option(label(...title),code));return menu;
};
export function lossTerms(root,report){
  if(!report)return;
  root.replaceChildren(el('p',label('أساس التعويض المقترح','Proposed compensation basis')+' · '+label(...(valuations[report.valuation]||valuations.PENDING))),
    el('p',label('الإجراء المقترح عند العثور عليها','Proposed action on recovery')+' · '+label(...(recoveries[report.recovery]||recoveries.INSPECT))));
}
function missingForm(p,root,rows,refresh){
  if(!rows.length)return;
  const details=el('details'),summary=el('summary',label('الإبلاغ عن قطعة مفقودة','Report a missing item'));details.append(summary);root.append(details);
  const items=el('select');for(const row of rows){const opt=new Option(row.invoiceNumber+' · '+row.equipment+' · '+row.assetCode+(row.reported?' · '+label('مبلّغ عنها','Already reported'):''),row.itemId);opt.disabled=row.reported;items.add(opt);}
  const why=el('select'),proposal=el('select'),valuation=selectOptions(valuations),recovery=selectOptions(recoveries),reason=el('textarea');reason.maxLength=1000;
  for(const [value,a,e] of [['NOT_RETURNED','لم تُعد عند موعد التسليم','Missing at return'],['REPORTED_BY_RENTER','أبلغ المستأجر بفقدها','Reported lost by renter'],['OTHER','سبب آخر','Other']])why.add(new Option(label(a,e),value));
  for(const [value,a,e] of [['TRACE','البحث وإمهال المستأجر لإعادة القطعة','Allow time to locate and return'],['EQUIVALENT','اقتراح بديل مماثل','Propose equivalent item'],['ESTIMATE','طلب تقدير قيمة الاستبدال','Request replacement valuation'],['WAIVER','طلب الإعفاء من التعويض','Request waiver'],['OTHER','مقترح آخر','Other proposal']])proposal.add(new Option(label(a,e),value));
  for(const [title,input] of [[label('القطعة المسلّمة','Issued item'),items],[label('ظرف الفقد','Circumstance'),why],[label('الإجراء المقترح للمراجعة','Proposed resolution for review'),proposal],[label('أساس التعويض المقترح','Proposed compensation basis'),valuation],[label('الإجراء المقترح عند العثور عليها','Proposed action on recovery'),recovery],[label('تفاصيل البلاغ','Report details'),reason]]){const field=el('label',title);field.append(input);details.append(field);}
  p.action(details,label('تسجيل بلاغ الفقد','Record loss report'),async()=>{
    if(!items.value||!reason.value.trim())throw new Error(label('اختر القطعة واكتب التفاصيل','Select the item and enter details'));
    await p.request('items/'+encodeURIComponent(items.value)+'/missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({circumstance:why.value,proposal:proposal.value,valuation:valuation.value,recovery:recovery.value,reason:reason.value.trim()})});
    if(p.current())await refresh();
  });
}

export async function centerClaims(root){
  const p=panel(root);
  try{
    const [rows,missing]=await Promise.all(['center','center/missing-items'].map(async path=>(await p.request(path)).json()));if(!p.current())return;
    missingForm(p,root,missing,()=>centerClaims(root));
    if(!rows.length)p.message.textContent=label('لا توجد قطع ذات ضرر جديد موثّق','No items with documented new damage');
    for(const row of rows){
      const card=el('article');root.append(card);
      if(row.cause==='MISUSE')card.append(el('p',label('ضرر بسبب سوء الاستخدام','Damage due to misuse')));
      card.append(el('h4',row.equipment+' · '+row.invoiceNumber),el('p',label('حالة التسليم','Handover condition')+' · '+row.baseline),el('p',label('الضرر عند الإرجاع','Return damage')+' · '+row.damage));
      if(row.claim){drawClaim(p,card,row.claim,'center',()=>centerClaims(root));continue;}
      const amount=el('input');amount.type='number';amount.min='0.01';amount.step='0.01';
      const kind=el('select');for(const [key,arName,en] of [['ESTIMATE','تقدير إصلاح','Repair estimate'],['REPAIR_INVOICE','فاتورة إصلاح','Repair invoice']])kind.add(new Option(label(arName,en),key));
      const file=el('input');file.type='file';file.accept='application/pdf';
      for(const [text,input] of [[label('تكلفة الإصلاح بالريال','Repair amount in SAR'),amount],[label('نوع المستند','Document type'),kind],[label('مستند الإصلاح PDF','Repair PDF'),file]]){const field=el('label',text);field.append(input);card.append(field);}
      p.action(card,label('إرسال للمستأجر','Send to renter'),async()=>{
        if(!/^\d+(?:\.\d{1,2})?$/.test(amount.value)||!amount.checkValidity()||!file.files[0]||file.files[0].size>10000000)throw new Error(label('تحقق من المبلغ وأرفق PDF حتى ١٠ ميغابايت','Check the amount and attach a PDF up to 10 MB'));
        const form=new FormData();form.set('amountMinor',String(Math.round(Number(amount.value)*100)));form.set('kind',kind.value);form.set('document',file.files[0]);
        await p.request('items/'+encodeURIComponent(row.itemId),{method:'POST',body:form});
        if(p.current())await centerClaims(root);
      });
    }
  }catch(e){if(p.current())p.message.textContent=e.message;}
}

export function accountant(root){
  const p=panel(root),claim=el('input'),invoice=el('input'),entry=el('input');
  for(const [caption,input] of [[label('معرّف مطالبة الضرر','Damage claim ID'),claim],[label('مرجع فاتورة المزوّد عند استعادة عملية','Original provider invoice for recovery'),invoice],[label('قيد إيراد الضرر المرحّل','Posted damage revenue entry'),entry]]){
    const field=el('label',caption);field.append(input);root.append(field);
  }
  p.action(root,label('مطابقة التحصيل','Reconcile collection'),async()=>{
    if(!claim.value.trim()||!(invoice.value.trim()||entry.value.trim()))throw new Error(label('أدخل مرجع المطالبة والمطابقة','Enter the claim and reconciliation references'));
    const body={};if(invoice.value.trim())body.invoiceId=invoice.value.trim();if(entry.value.trim())body.financeEntryId=entry.value.trim();
    const result=await (await p.request(encodeURIComponent(claim.value.trim())+'/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},'/payments/rental-damage/')).json();
    if(p.current())p.message.textContent=result.status==='COLLECTED'?label('تمت مطابقة الدفعة وقيد الإيراد','Payment and revenue entry reconciled'):label('تم التحقق من مرجع المزوّد','Provider reference verified');
  });
}
