(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,centerId='',snapshot=null,busy=false;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const businessDateToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh'}).format(new Date());
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
 const errors={FINANCE_CURRENCY_UNSUPPORTED:'عملة الوردية غير مدعومة للتسليم.',FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED:'لا توجد صلاحية محاسب نشطة لهذا المركز.',FINANCE_CENTER_MAPPING_AMBIGUOUS:'تعذر تحديد مركز واحد لهذه الجهة. يلزم تصحيح ربط المركز قبل تشغيل الورديات.',FINANCE_ACTIVE_SHIFT_EXISTS:'لديك وردية نشطة بالفعل. حدّث البيانات لعرضها.',FINANCE_HANDOVER_RECEIVER_ALREADY_PENDING:'لدى المحاسب المستلم تسليم بانتظار القبول. حدّث البيانات.',FINANCE_HANDOVER_RECEIVER_SHIFT_REQUIRED:'يجب على المحاسب المستلم فتح وردية برصيد صفري أولًا.',FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY:'وردية المستلم تحتوي رصيدًا أو قيودًا. حدّث قائمة المستلمين.',FINANCE_VARIANCE_REASON_REQUIRED:'اكتب سبب فرق الجرد في عشرة أحرف على الأقل.',FINANCE_HANDOVER_NOT_PENDING:'سبق التعامل مع طلب التسليم. حدّث البيانات.',FINANCE_SHIFT_NOT_OPEN:'حالة الوردية تغيّرت. حدّث البيانات.',FINANCE_SHIFT_CLOSE_ALREADY_SUBMITTED:'تم إرسال إقفال الوردية وتجميدها بانتظار المراجعة.',FINANCE_SHIFT_CLOSE_VARIANCE_REASON_REQUIRED:'اكتب سبب فرق الجرد في عشرة أحرف على الأقل.',FINANCE_SHIFT_CLOSE_RECONCILIATION_BLOCKED:'تعذر الإقفال لوجود تحصيلات أو قيود غير متطابقة.',FINANCE_SHIFT_CLOSE_REVIEW_DENIED:'لا تملك صلاحية مراجعة إقفال هذا المركز.',FINANCE_SHIFT_CLOSE_REVIEW_SOD_VIOLATION:'لا يمكن لمقدم الإقفال مراجعته بنفسه.',FINANCE_SHIFT_CLOSE_REJECTION_REASON_REQUIRED:'اكتب سبب الرفض في عشرة أحرف على الأقل.',FINANCE_AMOUNT_INVALID:'أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.',FINANCE_INPUT_INVALID:'تحقق من المبلغ وبيانات التسليم.'};
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
  host.addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('[data-finance-operation]')&&!busy)void submit(event.target,event.submitter)});
  host.addEventListener('input',event=>{if(event.target.name==='actualCash')updateVariance(event.target.form)});
  section=host;document.getElementById('main')?.append(host);return host;
 }
 function setBusy(host,value){busy=value;host.querySelectorAll('[data-finance-controls] button,[data-finance-controls] select').forEach(el=>el.disabled=value);host.querySelector('[data-finance-result]').setAttribute('aria-busy',String(value))}
 function render(host,data){
  const result=host.querySelector('[data-finance-result]'),shift=data.shift;
  const label={OPEN:'مفتوحة',HANDOVER_PENDING:'بانتظار استلام العهدة'},entryLabel={REVENUE:'إيراد',EXPENSE:'مصروف',REFUND:'استرداد',ADJUSTMENT:'تسوية'};
  const incoming=(data.handovers||[]).some(h=>h.direction==='INCOMING');
  let html=!data.isOperator?'<article><h3>مراجعة الإقفالات المالية</h3><p>تُعرض الإقفالات التي تنتظر مراجعتك فقط.</p></article>':shift?`<article><h3>ورديتي الحالية — ${esc(label[shift.status]||shift.status)}</h3><dl>${[['الرصيد الافتتاحي',shift.openingBalanceMinor],['الإيرادات المسجلة',data.totals.revenueMinor],['المصروفات',data.totals.expenseMinor],['الاستردادات',data.totals.refundMinor],['التسويات',data.totals.adjustmentMinor],['الرصيد المتوقع من القيود',data.totals.expectedCashMinor]].map(([title,value])=>`<div><dt>${title}</dt><dd>${esc(money(value))}</dd></div>`).join('')}</dl><p>الرصيد المتوقع محسوب من قيود الوردية؛ أدخل الجرد الفعلي عند التسليم.</p></article>`:'<article><h3>لا توجد وردية نشطة</h3><form data-finance-operation="open"><label>الرصيد الافتتاحي (ريال)<input name="openingBalance" inputmode="decimal" value="0" required></label><p>لاستلام عهدة من محاسب آخر، افتح وردية برصيد صفري واتركها بلا قيود حتى قبول التسليم.</p><button type="submit">فتح الوردية</button></form></article>';
  if(shift?.currency!=='SAR'&&shift){result.innerHTML='<p role="alert">عملة هذه الوردية غير مدعومة في هذه الواجهة.</p>';return}
  if(data.isOperator&&shift?.status==='OPEN'&&!incoming&&data.closeSubmission?.status!=='SUBMITTED'){
   html+=`<article><h3>تسليم العهدة</h3>${data.receivers.length?`<form data-finance-operation="handover"><label>المحاسب المستلم<select name="receiver" required><option value="">اختر المحاسب</option>${data.receivers.map(x=>`<option value="${esc(x.accountId)}">${esc(x.name||'محاسب المركز')}</option>`).join('')}</select></label><label>الجرد الفعلي (ريال)<input name="actualCash" inputmode="decimal" required></label><p data-finance-variance>أدخل الجرد الفعلي لحساب الفرق.</p><label>سبب فرق الجرد<textarea name="varianceReason" maxlength="1000"></textarea></label><button type="submit">إرسال طلب التسليم</button></form>`:'<p>لا يوجد محاسب مستلم لديه وردية مفتوحة برصيد صفري وبلا قيود أو تسليم معلّق.</p>'}</article>`;
  }
  if(data.isOperator)html+='<article><h3>طلبات التسليم المعلّقة</h3>'+(data.handovers.length?data.handovers.map(h=>`<div class="hl-finance-handover"><h4>${h.direction==='INCOMING'?'استلام من':'تسليم إلى'} ${esc(h.counterpartyName||'محاسب المركز')}</h4><p>المتوقع: ${esc(money(h.expectedCashMinor))} · الفعلي: ${esc(money(h.actualCashMinor))} · الفرق: ${esc(money(h.varianceMinor))}</p>${h.varianceReason?`<p>سبب الفرق: ${esc(h.varianceReason)}</p>`:''}${h.direction==='INCOMING'?`<form data-finance-operation="accept" data-handover-id="${esc(h.id)}"><label><input type="checkbox" required> تحققت من المبلغ الفعلي وأؤكد استلام العهدة</label><button type="submit" ${!Number.isSafeInteger(h.actualCashMinor)||h.actualCashMinor<0?'disabled':''}>قبول استلام العهدة</button></form>`:'<p>بانتظار قبول المحاسب المستلم.</p>'}</div>`).join(''):'<p>لا توجد طلبات تسليم معلّقة.</p>')+'</article>';
  if(data.closeSubmission){const c=data.closeSubmission;html+=`<article><h3>إقفال الوردية — ${esc(c.status==='SUBMITTED'?'بانتظار المراجعة':c.status==='APPROVED'?'معتمد':'مرفوض')}</h3><p>المتوقع ${esc(money(c.expectedCashMinor))} · الفعلي ${esc(money(c.actualCashMinor))} · الفرق ${esc(money(c.varianceMinor))}</p>${c.varianceReason?`<p>سبب الفرق: ${esc(c.varianceReason)}</p>`:''}${c.reviewNote?`<p>ملاحظة المراجع: ${esc(c.reviewNote)}</p>`:''}${c.status==='SUBMITTED'?'<p>تم تجميد الوردية حتى إتمام المراجعة.</p>':''}</article>`}
  if(data.isOperator&&shift?.status==='OPEN'&&data.closeSubmission?.status!=='SUBMITTED')html+=`<article><h3>إرسال إقفال الوردية للمراجعة</h3><form data-finance-operation="close"><label>الجرد الفعلي (ريال)<input name="actualCash" inputmode="decimal" required></label><p data-finance-variance>أدخل الجرد الفعلي لمقارنته بالرصيد المتوقع.</p><label>سبب فرق الجرد<textarea name="varianceReason" maxlength="1000"></textarea></label><button type="submit">إرسال الإقفال</button></form></article>`;
  if(data.canReview)html+='<article><h3>إقفالات بانتظار المراجعة</h3>'+(data.reviewItems.length?data.reviewItems.map(c=>`<div class="hl-finance-handover"><h4>وردية ${esc(c.shiftId)}</h4><p>المتوقع: ${esc(money(c.expectedCashMinor))} · الفعلي: ${esc(money(c.actualCashMinor))} · الفرق: ${esc(money(c.varianceMinor))}</p><p>المحاسب: ${esc(c.submittedByName||'—')} · القيود غير المطابقة: ${esc(c.unresolvedPaymentCount)}</p>${c.varianceReason?`<p>سبب الفرق: ${esc(c.varianceReason)}</p>`:''}<form data-finance-operation="review" data-submission-id="${esc(c.id)}"><label>ملاحظة المراجع<textarea name="reviewNote" maxlength="1000"></textarea></label><button name="decision" value="APPROVED" type="submit">اعتماد الإقفال</button><button name="decision" value="REJECTED" type="submit">رفض مع توضيح السبب</button></form></div>`).join(''):'<p>لا توجد إقفالات بانتظار المراجعة.</p>')+'</article>';
  if(data.isOperator&&shift)html+='<article><h3>أحدث 50 قيدًا للوردية</h3><p>الإجماليات أعلاه تشمل جميع قيود الوردية.</p>'+(data.entries.length?`<div class="hl-finance-table"><table><thead><tr><th scope="col">النوع</th><th scope="col">المبلغ</th><th scope="col">الوصف</th></tr></thead><tbody>${data.entries.map(row=>`<tr><td>${esc(entryLabel[row.type]||row.type)}</td><td>${esc(money(row.amountMinor))}</td><td>${esc(row.description||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<p>لا توجد قيود في الوردية.</p>')+'</article>';
  if(data.canReview){const report=data.dailyReport,labels={NO_APPROVED_SHIFT_CLOSES:'لا توجد إقفالات معتمدة في هذا اليوم',READY_FOR_REVIEW:'مطابق',VARIANCE_REVIEW_REQUIRED:'معتمد مع فروقات جرد',BLOCKED:'يحتاج إلى معالجة'};html+='<article><h3>تقرير الإقفال اليومي</h3><form data-finance-operation="daily-report"><label>تاريخ العمل<input name="businessDate" type="date" value="'+esc(report?.businessDate||businessDateToday())+'" required></label><button type="submit">عرض التقرير</button></form>';if(report){html+='<p>'+esc(labels[report.decision]||report.decision)+' · '+esc(report.shiftCount)+' ورديات معتمدة · '+esc(report.unresolvedPaymentCount)+' قيود غير مطابقة</p><dl>'+[['الرصيد المتوقع',report.expectedCashMinor],['الجرد الفعلي',report.actualCashMinor],['إجمالي الفرق',report.varianceMinor]].map(([title,value])=>'<div><dt>'+title+'</dt><dd>'+esc(money(value))+'</dd></div>').join('')+'</dl>';if(report.shifts.length)html+='<ul>'+report.shifts.map(x=>'<li>وردية '+esc(x.shiftId)+' · '+esc(x.submittedByName||'—')+' · المراجع '+esc(x.reviewedByName||'—')+' · الفرق '+esc(money(x.varianceMinor))+'</li>').join('')+'</ul>'}html+='</article>'}
  result.innerHTML=html;
 }
 function updateVariance(form){
  const amount=minor(form.elements.actualCash.value),expected=snapshot?.totals?.expectedCashMinor,reason=form.elements.varianceReason;
  const valid=amount!==null&&Number.isSafeInteger(expected);reason.required=valid&&amount!==expected;reason.minLength=reason.required?10:0;
  form.querySelector('[data-finance-variance]').textContent=valid?'فرق الجرد: '+money(amount-expected)+(amount!==expected?' — يلزم توضيح السبب.':' — مطابق للرصيد المتوقع.'):'أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.';
 }
 async function load(message=''){
  if(!eligible()){clear();return}const host=ensure(),v=++version,session=auth().getSessionVersion?.(),result=host.querySelector('[data-finance-result]'),selector=host.querySelector('[name=center]');
  snapshot=null;setBusy(host,true);result.innerHTML='<p>جارٍ تحميل بيانات الوردية…</p>';host.querySelector('[data-finance-status]').textContent=message;
  try{
   if(!(await authorize(host,v,session)))return;
   const centers=await request('/finance/mine/centers');if(!current(host,v,session))return;
   if(!Array.isArray(centers))throw new Error('استجابة المراكز غير مكتملة.');
   const reviewerCenters=await request('/finance/mine/shift-close-centers');if(!current(host,v,session))return;if(!Array.isArray(reviewerCenters))throw new Error('استجابة مراكز المراجعة غير مكتملة.');
   const choices=new Map();for(const x of centers)choices.set(x.id,{...x,isOperator:true,canReview:false});for(const x of reviewerCenters){const item=choices.get(x.id)||{...x,isOperator:false,canReview:false};item.canReview=true;choices.set(x.id,item)}
   const all=[...choices.values()];if(!all.some(x=>x.id===centerId))centerId=all[0]?.id||'';
   selector.innerHTML=all.map(x=>`<option value="${esc(x.id)}">${esc(x.organizationName)} — ${esc(x.name)}${x.canReview?' · مراجعة':''}</option>`).join('');selector.value=centerId;
   if(!centerId){result.innerHTML='<p>لا يوجد لديك تعيين محاسب نشط أو صلاحية مراجعة مالية صريحة لهذا المركز.</p>';return}
   const selected=choices.get(centerId),empty={centerOrgUnitId:centerId,shift:null,totals:null,entries:[],receivers:[],handovers:[],closeSubmission:null};
   let data=selected.isOperator?await request('/finance/centers/'+encodeURIComponent(centerId)+'/workspace'):empty;if(!current(host,v,session))return;
   if(selected.canReview)data.reviewItems=await request('/finance/centers/'+encodeURIComponent(centerId)+'/shift-close-reviews');else data.reviewItems=[];if(!current(host,v,session))return;
   data.isOperator=selected.isOperator;data.canReview=selected.canReview;
   if(data?.centerOrgUnitId!==centerId||!Array.isArray(data.entries)||!Array.isArray(data.receivers)||!Array.isArray(data.handovers)||(data.shift&&!data.totals))throw new Error('استجابة الوردية غير مكتملة.');
   snapshot=data;render(host,data);
  }catch(error){if(current(host,v,session)){snapshot=null;result.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل البيانات. استخدم تحديث البيانات للمحاولة مجددًا.')}</p>`}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function submit(form,submitter){
  if(!snapshot||!eligible())return;
  const operation=form.dataset.financeOperation;let path,body;
  if(operation==='open'){
   const amount=minor(form.elements.openingBalance.value);if(amount===null){form.elements.openingBalance.setCustomValidity('أدخل مبلغًا صحيحًا بمنزلتين عشريتين كحد أقصى.');form.elements.openingBalance.reportValidity();form.elements.openingBalance.oninput=()=>form.elements.openingBalance.setCustomValidity('');return}
   path='/finance/shifts/open';body={centerOrgUnitId:centerId,openingBalanceMinor:amount};
  }else if(operation==='handover'){
   updateVariance(form);if(!form.reportValidity())return;const amount=minor(form.elements.actualCash.value);if(amount===null)return;
   if(!snapshot.receivers.some(x=>x.accountId===form.elements.receiver.value)||snapshot.shift?.status!=='OPEN')return;
   path='/finance/shifts/'+encodeURIComponent(snapshot.shift.id)+'/handover';body={toAccountantId:form.elements.receiver.value,actualCashMinor:amount,varianceReason:form.elements.varianceReason.value.trim()||undefined};
  }else if(operation==='close'){
   updateVariance(form);if(!form.reportValidity())return;const amount=minor(form.elements.actualCash.value);if(amount===null||!snapshot.isOperator||snapshot.shift?.status!=='OPEN')return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/shifts/'+encodeURIComponent(snapshot.shift.id)+'/close';body={actualCashMinor:amount,varianceReason:form.elements.varianceReason.value.trim()||undefined};
  }else if(operation==='review'){
   const decision=submitter?.value;const note=form.elements.reviewNote.value.trim();if(decision==='REJECTED'&&note.length<10){form.elements.reviewNote.setCustomValidity('اكتب سبب رفض من عشرة أحرف على الأقل.');form.elements.reviewNote.reportValidity();form.elements.reviewNote.oninput=()=>form.elements.reviewNote.setCustomValidity('');return}
   if(!snapshot.canReview||!snapshot.reviewItems.some(x=>x.id===form.dataset.submissionId))return;path='/finance/shift-close-reviews/'+encodeURIComponent(form.dataset.submissionId)+'/decision';body={decision,note:note||undefined};
  }else if(operation==='daily-report'){
   const date=form.elements.businessDate.value;if(!snapshot.canReview||!form.reportValidity()||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
   path='/finance/centers/'+encodeURIComponent(centerId)+'/daily-close-report?businessDate='+encodeURIComponent(date);body=null;
  }else if(operation==='accept'){
   if(!form.reportValidity()||!snapshot.handovers.some(x=>x.id===form.dataset.handoverId&&x.direction==='INCOMING'))return;
   path='/finance/shifts/handovers/'+encodeURIComponent(form.dataset.handoverId)+'/accept';body={};
  }else return;
  const host=section,v=++version,session=auth().getSessionVersion?.();setBusy(host,true);form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
  try{
   if(!(await authorize(host,v,session)))return;
   const response=operation==='daily-report'?await request(path):await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(current(host,v,session)){if(operation==='daily-report'){snapshot.dailyReport=response;render(host,snapshot);host.querySelector('[data-finance-status]').textContent='تم تحميل تقرير الإقفال اليومي.'}else await load(operation==='open'?'تم فتح الوردية.':operation==='handover'?'تم إرسال طلب التسليم.':operation==='close'?'تم إرسال الإقفال للمراجع وتجميد الوردية.':operation==='review'?'تم تسجيل قرار المراجعة.':'تم قبول العهدة وتحديث رصيد الوردية.')}
  }catch(error){if(current(host,v,session)){snapshot=null;host.querySelector('[data-finance-result]').innerHTML=`<p role="alert">${esc(error.message||'تعذر تأكيد العملية. حدّث البيانات قبل تكرارها.')}</p>`}}
  finally{if(current(host,v,session))setBusy(host,false)}
 }
 async function open(){if(!eligible()){clear();return}const host=ensure();window.HydrolandWorkspaceUI?.show?.(host);await load()}
 for(const event of ['hydroland:session-cleared','hydroland:portal-access-cleared'])document.addEventListener(event,clear);
 for(const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(!eligible())clear()});
 window.HydrolandCenterFinance={open,clear};
})();
