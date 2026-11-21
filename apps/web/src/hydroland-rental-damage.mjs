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
  const request=async(path,options={})=>{
    if(!current())throw new Error();
    const response=await auth.authorizedFetch(base+path,options);
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
export async function centerClaims(root){
  const p=panel(root);
  try{
    const rows=await (await p.request('center')).json();if(!p.current())return;
    if(!rows.length)p.message.textContent=label('لا توجد قطع ذات ضرر جديد موثّق','No items with documented new damage');
    for(const row of rows){
      const card=el('article');root.append(card);
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
