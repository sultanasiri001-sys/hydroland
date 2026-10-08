(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,centerId='',snapshot=null,busy=false;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{version++;section?.remove();section=null;centerId='';snapshot=null;busy=false};
 const current=(host,v,session)=>host===section&&host.isConnected&&v===version&&eligible()&&session===auth()?.getSessionVersion?.();
 const money=value=>Number.isSafeInteger(value)?(value/100).toFixed(2)+' ر.س.':'غير متاح';
 function minor(value){
  const text=String(value).trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace('٫','.');
  if(!/^\d+(\.\d{1,2})?$/.test(text))return null;
  const [whole,fraction='']=text.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(n)&&n<=2147483647?n:null;
 }
 const errors={FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED:'لا توجد صلاحية محاسب نشطة لهذا المركز.',FINANCE_CENTER_MAPPING_AMBIGUOUS:'تعذر تحديد مركز واحد لهذه الجهة. يلزم تصحيح ربط المركز قبل تشغيل الورديات.',FINANCE_ACTIVE_SHIFT_EXISTS:'لديك وردية نشطة بالفعل. حدّث البيانات لعرضها.',FINANCE_HANDOVER_RECEIVER_ALREADY_PENDING:'لدى المحاسب المستلم تسليم بانتظار القبول. حدّث البيانات.',FINANCE_HANDOVER_RECEIVER_SHIFT_REQUIRED:'يجب على المحاسب المستلم فتح وردية برصيد صفري أولًا.',FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY:'وردية المستلم تحتوي رصيدًا أو قيودًا. حدّث قائمة المستلمين.',FINANCE_VARIANCE_REASON_REQUIRED:'اكتب سبب فرق الجرد في عشرة أحرف على الأقل.',FINANCE_HANDOVER_NOT_PENDING:'سبق التعامل مع طلب التسليم. حدّث البيانات.',FINANCE_SHIFT_NOT_OPEN:'حالة الوردية تغيّرت. حدّث البيانات.',FINANCE_AMOUNT_INVALID:'أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.',FINANCE_INPUT_INVALID:'تحقق من المبلغ وبيانات التسليم.'};
 async function authorize(host,v,session){
  const valid=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&v===version});
  if(!valid||!current(host,v,session)){if(host===section)clear();return false}return true;
 }
 async function request(path,options){
  const response=await auth().authorizedFetch(path,options),data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(errors[data?.code||data?.message]||(response.status===403?'صلاحية المحاسب غير متاحة.':'تعذر إتمام الطلب. حدّث البيانات قبل تكرار أي عملية مالية.'));
  return data;
 }
 function ensure(){
  if(section?.isConnected)return section;
  const host=document.createElement('section');host.id='hl-center-finance';host.className='hl-center-finance';
  host.innerHTML='<header><small>DIVE CENTER · مركز الغوص</small><h2>ورديات المحاسب</h2><p>فتح الوردية ومراجعة الرصيد وتسليم العهدة بين محاسبي المركز.</p></header><div data-finance-controls><label>المركز<select name="center" aria-label="المركز"></select></label><button type="button" data-finance-refresh>تحديث البيانات</button></div><p role="status" data-finance-status></p><div data-finance-result aria-live="polite"></div>';
  host.addEventListener('change',event=>{if(event.target.name==='center'&&!busy){centerId=event.target.value;void load()}});
  host.addEventListener('click',event=>{if(event.target.closest('[data-finance-refresh]')&&!busy)void load()});
  host.addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('[data-finance-operation]')&&!busy)void submit(event.target)});
  host.addEventListener('input',event=>{if(event.target.name==='actualCash')updateVariance(event.target.form)});
  section=host;document.getElementById('main')?.append(host);return host;
 }
 function setBusy(host,value){busy=value;host.querySelectorAll('[data-finance-controls] button,[data-finance-controls] select').forEach(el=>el.disabled=value);host.querySelector('[data-finance-result]').setAttribute('aria-busy',String(value))}
 function render(host,data){
  const result=host.querySelector('[data-finance-result]'),shift=data.shift;
  const label={OPEN:'مفتوحة',HANDOVER_PENDING:'بانتظار استلام العهدة'},entryLabel={REVENUE:'إيراد',EXPENSE:'مصروف',REFUND:'استرداد',ADJUSTMENT:'تسوية'};
  const incoming=data.handovers.some(h=>h.direction==='INCOMING');
  let html=shift?`<article><h3>وردّيتي الحالية — ${esc(label[shift.status]||shift.status)}</h3><dl>${[['الرصيد الافتتاحي',shift.openingBalanceMinor],['الإيرادات المسجلة',data.totals.revenueMinor],['المصروفات',data.totals.expenseMinor],['الاستردادات',data.totals.refundMinor],['التسويات',data.totals.adjustmentMinor],['الرصيد المتوقع من القيود',data.totals.expectedCashMinor]].map(([title,value])=>`<div><dt>${title}</dt><dd>${esc(money(value))}</dd></div>`).join('')}</dl><p>الرصيد المتوقع محسوب من قيود الوردية؛ أدخل الجرد الفعلي عند التسليم.</p></article>`:'<article><h3>لا توجد وردية نشطة</h3><form data-finance-operation="open"><label>الرصيد الافتتاحي (ريال)<input name="openingBalance" inputmode="decimal" value="0" required></label><p>لاستلام عهدة من محاسب آخر، افتح وردية برصيد صفري واتركها بلا قيود حتى قبول التسليم.</p><button type="submit">فتح الوردية</button></form></article>';
  if(shift?.currency!=='SAR'&&shift){result.innerHTML='<p role="alert">عملة هذه الوردية غير مدعومة في هذه الواجهة.</p>';return}
  if(shift?.status==='OPEN'&&!incoming){
   html+=`<article><h3>تسليم العهدة</h3>${data.receivers.length?`<form data-finance-operation="handover"><label>المحاسب المستلم<select name="receiver" required><option value="">اختر المحاسب</option>${data.receivers.map(x=>`<option value="${esc(x.accountId)}">${esc(x.name||'محاسب المركز')}</option>`).join('')}</select></label><label>الجرد الفعلي (ريال)<input name="actualCash" inputmode="decimal" required></label><p data-finance-variance>أدخل الجرد الفعلي لحساب الفرق.</p><label>سبب فرق الجرد<textarea name="varianceReason" maxlength="1000"></textarea></label><button type="submit">إرسال طلب التسليم</button></form>`:'<p>لا يوجد محاسب مستلم لديه وردية مفتوحة برصيد صفري وبلا قيود أو تسليم معلّق.</p>'}</article>`;
  }
  html+='<article><h3>طلبات التسليم المعلّقة</h3>'+(data.handovers.length?data.handovers.map(h=>`<div class="hl-finance-handover"><h4>${h.direction==='INCOMING'?'استلام من':'تسليم إلى'} ${esc(h.counterpartyName||'محاسب المركز')}</h4><p>المتوقع: ${esc(money(h.expectedCashMinor))} · الفعلي: ${esc(money(h.actualCashMinor))} · الفرق: ${esc(money(h.varianceMinor))}</p>${h.varianceReason?`<p>سبب الفرق: ${esc(h.varianceReason)}</p>`:''}${h.direction==='INCOMING'?`<form data-finance-operation="accept" data-handover-id="${esc(h.id)}"><label><input type="checkbox" required> تحققت من المبلغ الفعلي وأؤكد استلام العهدة</label><button type="submit" ${!Number.isSafeInteger(h.actualCashMinor)||h.actualCashMinor<0?'disabled':''}>قبول استلام العهدة</button></form>`:'<p>بانتظار قبول المحاسب المستلم.</p>'}</div>`).join(''):'<p>لا توجد طلبات تسليم معلّقة.</p>')+'</article>';
  if(shift)html+='<article><h3>أحدث 50 قيدًا للوردية</h3><p>الإجماليات أعلاه تشمل جميع قيود الوردية.</p>'+(data.entries.length?`<div class="hl-finance-table"><table><thead><tr><th scope="col">النوع</th><th scope="col">المبلغ</th><th scope="col">الوصف</th></tr></thead><tbody>${data.entries.map(row=>`<tr><td>${esc(entryLabel[row.type]||row.type)}</td><td>${esc(money(row.amountMinor))}</td><td>${esc(row.description||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<p>لا توجد قيود في الوردية.</p>')+'</article>';
  result.innerHTML=html;
 }
 function updateVariance(form){
  const amount=minor(form.elements.actualCash.value),expected=snapshot?.totals?.expectedCashMinor,reason=form.elements.varianceReason;
  const valid=amount!==null&&Number.isSafeInteger(expected);reason.required=valid&&amount!==expected;reason.minLength=reason.required?10:0;
  form.querySelector('[data-finance-variance]').textContent=valid?'فرق الجرد: '+money(amount-expected)+(amount!==expected?' — يلزم توضيح السبب.':' — مطابق للرصد المتوقع.'):'أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.';
 }
 async function load(message=''){
  if(!eligible()){clear();return}const host=ensure(),v=++version,session=auth().getSessionVersion?.(),result=host.querySelector('[data-finance-result]'),selector=host.querySelector('[name=center]');
  snapshot=null;setBusy(host,true);result.innerHTML='<p>جارٍ تحميل بيانات الوردية…</p>';host.querySelector('[data-finance-status]').textContent=message;
  try{
   if(!(await authorize(host,v,session)))return;
   const centers=await request('/finance/mine/centers');if(!current(host,v,session))return;
   if(!Array.isArray(centers))throw new Error('استجابة المراكز غير مكتملة.');
   if(!centers.some(x=>x.id===centerId))centerId=centers[0]?.id||'';
   selector.innerHTML=centers.map(x=>`<option value="${esc(x.id)}">${esc(x.organizationName)} — ${esc(x.name)}</option>`).join('');selector.value=centerId;
   if(!centerId){result.innerHTML='<p>لا يوجد تعيين محاسب نشط لك في مراكز الغوص. إدارة المركز وحدها لا تمنح صلاحية تشغيل الورديات.</p>';return}
   const data=await request('/finance/centers/'+encodeURIComponent(centerId)+'/workspace');if(!current(host,v,session))return;
   if(data?.centerOrgUnitId!==centerId||!Array.isArray(data.entries)||!Array.isArray(data.receivers)||!Array.isArray(data.handovers)||(data.shift&&!data.totals))throw new Error('استجابة الوردية غير مكتملة.');
   snapshot=data;render(host,data);
  }catch(error){if(current(host,v,session)){snapshot=null;result.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل البيانات. استخدم تحديث البيانات للمحاولة مجددًا.')}</p>`}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function submit(form){
  if(!snapshot||!eligible())return;
  const operation=form.dataset.financeOperation;let path,body;
  if(operation==='open'){
   const amount=minor(form.elements.openingBalance.value);if(amount===null){form.elements.openingBalance.setCustomValidity('أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.');form.elements.openingBalance.reportValidity();form.elements.openingBalance.oninput=()=>form.elements.openingBalance.setCustomValidity('');return}
   path='/finance/shifts/open';body={centerOrgUnitId:centerId,openingBalanceMinor:amount};
  }else if(operation==='handover'){
   updateVariance(form);if(!form.reportValidity())return;const amount=minor(form.elements.actualCash.value);if(amount===null)return;
   if(!snapshot.receivers.some(x=>x.accountId===form.elements.receiver.value)||snapshot.shift?.status!=='OPEN')return;
   path='/finance/shifts/'+encodeURIComponent(snapshot.shift.id)+'/handover';body={toAccountantId:form.elements.receiver.value,actualCashMinor:amount,varianceReason:form.elements.varianceReason.value.trim()||undefined};
  }else if(operation==='accept'){
   if(!form.reportValidity()||!snapshot.handovers.some(x=>x.id===form.dataset.handoverId&&x.direction==='INCOMING'))return;
   path='/finance/shifts/handovers/'+encodeURIComponent(form.dataset.handoverId)+'/accept';body={};
  }else return;
  const host=section,v=++version,session=auth().getSessionVersion?.();setBusy(host,true);form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
  try{
   if(!(await authorize(host,v,session)))return;
   await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(current(host,v,session))await load(operation==='open'?'تم فتح الوردية.':operation==='handover'?'تم إرسال طلب التسليم.':'تم قبول العهدة وتحديث رصيد الوردية.');
  }catch(error){if(current(host,v,session)){snapshot=null;host.querySelector('[data-finance-result]').innerHTML=`<p role="alert">${esc(error.message||'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.')}</p>`}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function open(){if(!eligible()){clear();return}const host=ensure();window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const event of ['hydroland:session-cleared','hydroland:portal-access-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterFinance={open,clear};
})();
