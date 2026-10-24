(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={PUBLISH:'فتح الحجز',REOPEN:'إعادة فتح الحجز',CLOSE:'إغلاق الحجز',CANCEL:'إلغاء الرحلة',COMPLETE:'إنهاء الرحلة وحفظ الحضور'};
 const paymentLabels={CREATED:'منشأة',PENDING:'قيد المعالجة',AUTHORIZED:'محجوزة',CAPTURED:'محصّلة',FAILED:'فاشلة',CANCELLED:'ملغاة',REFUNDED:'مستردة'};
 const fmt=value=>new Date(value).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'});
 function form(action,data){
  const final=['CANCEL','COMPLETE'].includes(action),complete=action==='COMPLETE';
  return `<details class="hl-trip-action"><summary>${labels[action]}</summary><form data-trip-lifecycle-form data-action="${action}" data-request-id="${crypto.randomUUID()}">
   ${action==='CANCEL'?'<p>سيُلغى كل حجز قائم وتُحرّر موارد الرحلة، مع الاحتفاظ بسجلاتها وإبلاغ العملاء والطاقم داخل المنصة.</p>':''}
   ${complete?`<p>حدد من حضر الغوص فعليًا. تُحفظ سجلاتهم بانتظار مراجعة سجلات الغوص، وتُلغى الحجوزات غير المؤكدة. تبقى الحجوزات المؤكدة محفوظة للتاريخ.</p><fieldset><legend>الحاضرون من الحجوزات المؤكدة</legend>${data.participants.length?data.participants.map(p=>`<label class="hl-trip-check"><input type="checkbox" name="attendedParticipantIds" value="${esc(p.id)}">${esc(p.fullName)} · ${p.eligibilityStatus==='ELIGIBLE'?'مؤهل':'تحتاج الأهلية إلى مراجعة'}</label>`).join(''):'<p>لا يوجد مشاركون مؤكدون.</p>'}</fieldset><label>موقع الغوص<input name="siteName" required maxlength="240"></label><label>المنطقة<input name="regionCode" maxlength="60" placeholder="ASIR"></label><label>أقصى عمق بالمتر<input name="maxDepthM" type="number" min="0.1" max="150" step="0.1" required></label><label>مدة الغوص بالدقائق<input name="durationMin" type="number" min="1" max="600" step="1" required></label><label>اسم المدرب<input name="instructorName" maxlength="240"></label><label>ملاحظات الغوص<textarea name="notes" maxlength="2000"></textarea></label>`:''}
   ${action==='CLOSE'?'<p>يتوقف استقبال الحجوزات الجديدة وتبقى الحجوزات الحالية محفوظة. يتطلب الإجراء اعتماد تشغيل ساريًا.</p>':''}
   ${['REOPEN','PUBLISH'].includes(action)?'<p>سيُفتح الحجز قبل موعد البداية مع استمرار اشتراطات السعر والسلامة والطقس.</p>':''}
   <label>سبب الإجراء<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label>
   ${final?'<label class="hl-trip-check"><input type="checkbox" name="financialAcknowledged" required>أعلم أن الحفظ لا ينفّذ استردادًا ماليًا تلقائيًا، وأن أي مبالغ مدفوعة تحتاج متابعة عبر الإجراءات المالية.</label>':''}
   <button type="submit">${labels[action]}</button><p data-trip-action-feedback role="status"></p>
  </form></details>`;
 }
 function mount(box,options){
  let generation=0,busy=false;
  const current=version=>box.isConnected&&generation===version&&options.isCurrent();
  async function load(){
   if(busy)return;const version=++generation;box.innerHTML='<p>جارٍ تحميل حالة الرحلة والحجوزات والمدفوعات…</p>';
   try{
    if(!(await options.authorize())||!current(version))return;
    const response=await options.load(),data=await response.json().catch(()=>null);if(!current(version))return;
    if(!response.ok)throw new Error(data?.message||'تعذر تحميل إجراءات الرحلة.');
    if(!data?.trip||!Array.isArray(data.actions)||!Array.isArray(data.participants)||!Array.isArray(data.financial)||!data.stateToken)throw new Error('بيانات إجراءات الرحلة غير مكتملة.');
    box.innerHTML=`<header><h4>إجراءات الرحلة</h4><button type="button" data-trip-lifecycle-refresh>تحديث التفاصيل</button></header><p>نهاية الرحلة: ${esc(fmt(data.trip.endsAt))} — توقيت الرياض</p><p>الحجوزات المؤكدة: ${Number(data.bookings.confirmed)} · المقاعد المؤكدة: ${Number(data.bookings.confirmedSeats)} · بانتظار التأكيد: ${Number(data.bookings.pending)} · الملغاة: ${Number(data.bookings.cancelled)}</p><p>${data.clearance?.status==='ACTIVE'?'اعتماد التشغيل ساري.':'لا يوجد اعتماد تشغيل ساري؛ يحتاج إغلاق الحجز أو إنهاء الرحلة إلى مراجعة الإدارة.'}</p><h5>المدفوعات المسجّلة</h5>${data.financial.length?`<div class="hl-trip-financial"><table><thead><tr><th>الحالة</th><th>العدد</th><th>المبلغ</th></tr></thead><tbody>${data.financial.map(p=>`<tr><td>${esc(paymentLabels[p.status]||p.status)}</td><td>${Number(p.count)}</td><td>${(Number(p.amountMinor)/100).toFixed(2)} ${esc(p.currency)}</td></tr>`).join('')}</tbody></table></div>`:'<p>لا توجد مدفوعات مسجّلة.</p>'}<p>تبقى المدفوعات والفواتير محفوظة. إلغاء الرحلة أو إنهاؤها لا يعني استرداد المبلغ.</p>${data.lastAction?.reason?`<p>سبب آخر إجراء: ${esc(data.lastAction.reason)}</p>`:''}${data.actions.filter(a=>labels[a]).map(a=>form(a,data)).join('')||'<p>انتهت إجراءات هذه الرحلة ولا يمكن إعادة فتحها.</p>'}${['OPEN','CLOSED'].includes(data.trip.status)&&!data.actions.includes('COMPLETE')?'<p>يظهر إجراء الإنهاء بعد موعد نهاية الرحلة.</p>':''}`;
    box.querySelector('[data-trip-lifecycle-refresh]').onclick=()=>void load();
    box.querySelectorAll('[data-trip-lifecycle-form]').forEach(node=>node.onsubmit=event=>{event.preventDefault();void save(node,data,version)});
   }catch(error){if(current(version)){box.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل إجراءات الرحلة.')}</p><button type="button" data-trip-lifecycle-refresh>تحديث التفاصيل</button>`;box.querySelector('button').onclick=()=>void load()}}
  }
  async function save(node,data,version){
   if(busy||!current(version))return;
   const values=new FormData(node),action=node.dataset.action,feedback=node.querySelector('[data-trip-action-feedback]');
   const input={action,requestId:node.dataset.requestId,expectedUpdatedAt:data.trip.updatedAt,expectedState:data.stateToken,reason:String(values.get('reason')||'')};
   if(['CANCEL','COMPLETE'].includes(action))input.financialAcknowledged=values.has('financialAcknowledged');
   if(action==='COMPLETE'){
    const ids=values.getAll('attendedParticipantIds');if(!ids.length){feedback.textContent='حدد مشاركًا حضر الغوص فعليًا على الأقل. إذا لم تُنفذ الرحلة فاستخدم الإلغاء.';return}
    Object.assign(input,{attendedParticipantIds:ids,siteName:values.get('siteName'),regionCode:values.get('regionCode'),maxDepthM:Number(values.get('maxDepthM')),durationMin:Number(values.get('durationMin')),instructorName:values.get('instructorName'),notes:values.get('notes')});
   }
   busy=true;box.querySelectorAll('button').forEach(b=>b.disabled=true);feedback.textContent='جارٍ حفظ الإجراء…';
   try{
    if(!(await options.authorize())||!current(version))return;
    const response=await options.send(input),result=await response.json().catch(()=>null);if(!current(version))return;
    if(!response.ok){feedback.textContent=(result?.message||'تعذر حفظ الإجراء.')+(response.status===409?' راجع المدخلات، ثم استخدم «تحديث التفاصيل» عند الحاجة.':'');return}
    feedback.textContent='تم حفظ الإجراء.';await options.onSaved(result);
   }catch(error){if(current(version))feedback.textContent=error.message||'تعذر الحفظ. يمكنك إعادة المحاولة بنفس البيانات.'}
   finally{busy=false;if(current(version))box.querySelectorAll('button').forEach(b=>b.disabled=false)}
  }
  void load();return Object.freeze({reload:load});
 }
 window.HydrolandTripLifecycle=Object.freeze({mount});
})();
