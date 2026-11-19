(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("trip-lifecycle", {
  "فتح الحجز": "Open bookings",
  "إعادة فتح الحجز": "Reopen bookings",
  "إغلاق الحجز": "Close bookings",
  "إلغاء الرحلة": "Cancel trip",
  "إنهاء الرحلة وحفظ الحضور": "Complete trip and save attendance",
  "منشأة": "Created",
  "قيد المعالجة": "Processing",
  "محجوزة": "Authorized",
  "محصّلة": "Captured",
  "فاشلة": "Failed",
  "ملغاة": "Cancelled",
  "مستردة": "Refunded",
  "سبب الإجراء": "Reason for action",
  "سيُلغى كل حجز قائم وتُحرّر موارد الرحلة، مع الاحتفاظ بسجلاتها وإبلاغ العملاء والطاقم داخل المنصة.": "All existing bookings will be cancelled and trip resources released. Records will be retained and customers and crew notified inside the platform.",
  "حدد من حضر الغوص فعليًا. تُحفظ سجلاتهم بانتظار مراجعة سجلات الغوص، وتُلغى الحجوزات غير المؤكدة. تبقى الحجوزات المؤكدة محفوظة للتاريخ.": "Select those who actually attended the dive. Their logs will be saved pending dive-log review, and unconfirmed bookings will be cancelled. Confirmed bookings remain in the history.",
  "الحاضرون من الحجوزات المؤكدة": "Attendees from confirmed bookings",
  "موقع الغوص": "Dive site",
  "المنطقة": "Region",
  "أقصى عمق بالمتر": "Maximum depth in meters",
  "مدة الغوص بالدقائق": "Dive duration in minutes",
  "اسم المدرب": "Instructor name",
  "ملاحظات الغوص": "Dive notes",
  "مؤهل": "Eligible",
  "تحتاج الأهلية إلى مراجعة": "Eligibility review needed",
  "لا يوجد مشاركون مؤكدون.": "No confirmed participants.",
  "يتوقف استقبال الحجوزات الجديدة وتبقى الحجوزات الحالية محفوظة. يتطلب الإجراء اعتماد تشغيل ساريًا.": "New bookings will stop and existing bookings will remain saved. Current operating approval is required.",
  "سيُفتح الحجز قبل موعد البداية مع استمرار اشتراطات السعر والسلامة والطقس.": "Booking will open before the start time, with price, safety and weather requirements still applying.",
  "أعلم أن الحفظ لا ينفّذ استردادًا ماليًا تلقائيًا، وأن أي مبالغ مدفوعة تحتاج متابعة عبر الإجراءات المالية.": "I understand that saving does not issue an automatic refund and that paid amounts require follow-up through financial procedures.",
  "جارٍ تحميل حالة الرحلة والحجوزات والمدفوعات…": "Loading trip, booking and payment status…",
  "تعذر تحميل إجراءات الرحلة.": "Could not load trip actions.",
  "بيانات إجراءات الرحلة غير مكتملة.": "Trip action details are incomplete.",
  "إجراءات الرحلة": "Trip actions",
  "تحديث التفاصيل": "Refresh details",
  "نهاية الرحلة:": "Trip end:",
  "— توقيت الرياض": "— Riyadh time",
  "الحجوزات المؤكدة:": "Confirmed bookings:",
  "· المقاعد المؤكدة:": "· Confirmed seats:",
  "· بانتظار التأكيد:": "· Awaiting confirmation:",
  "· الملغاة:": "· Cancelled:",
  "المدفوعات المسجّلة": "Recorded payments",
  "تبقى المدفوعات والفواتير محفوظة. إلغاء الرحلة أو إنهاؤها لا يعني استرداد المبلغ.": "Payments and invoices remain saved. Cancelling or completing a trip does not mean a refund has been issued.",
  "اعتماد التشغيل ساري.": "Current operating approval is in place.",
  "لا يوجد اعتماد تشغيل ساري؛ يحتاج إغلاق الحجز أو إنهاء الرحلة إلى مراجعة الإدارة.": "No current operating approval. Closing bookings or completing the trip requires administrative review.",
  "الحالة": "Status",
  "العدد": "Count",
  "المبلغ": "Amount",
  "لا توجد مدفوعات مسجّلة.": "No payments recorded.",
  "سبب آخر إجراء:": "Reason for the latest action:",
  "انتهت إجراءات هذه الرحلة ولا يمكن إعادة فتحها.": "This trip's actions are complete. It cannot be reopened.",
  "يظهر إجراء الإنهاء بعد موعد نهاية الرحلة.": "The completion action appears after the trip end time.",
  "حدد مشاركًا حضر الغوص فعليًا على الأقل. إذا لم تُنفذ الرحلة فاستخدم الإلغاء.": "Select at least one participant who actually attended the dive. If the trip did not take place, use cancellation.",
  "جارٍ حفظ الإجراء…": "Saving action…",
  "تعذر حفظ الإجراء.": "Could not save action.",
  " راجع المدخلات، ثم استخدم «تحديث التفاصيل» عند الحاجة.": " Review the inputs, then use Refresh details if needed.",
  "تم حفظ الإجراء.": "Action saved.",
  "تعذر الحفظ. يمكنك إعادة المحاولة بنفس البيانات.": "Could not save. You can retry with the same details.",
  "راجع المدخلات، ثم استخدم «تحديث التفاصيل» عند الحاجة.": "Review the inputs, then use Refresh details if needed."
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={PUBLISH:'فتح الحجز',REOPEN:'إعادة فتح الحجز',CLOSE:'إغلاق الحجز',CANCEL:'إلغاء الرحلة',COMPLETE:'إنهاء الرحلة وحفظ الحضور'};
 const paymentLabels={CREATED:'منشأة',PENDING:'قيد المعالجة',AUTHORIZED:'محجوزة',CAPTURED:'محصّلة',FAILED:'فاشلة',CANCELLED:'ملغاة',REFUNDED:'مستردة'};
 const fmt=value=>new Date(value).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'});
 function form(action,data){
  const final=['CANCEL','COMPLETE'].includes(action),complete=action==='COMPLETE';
  return uiLocale.html`<details class="hl-trip-action"><summary>${uiLocale.label(labels[action])}</summary><form data-trip-lifecycle-form data-action="${action}" data-request-id="${crypto.randomUUID()}">
   ${action==='CANCEL'?uiLocale.html`<p>سيُلغى كل حجز قائم وتُحرّر موارد الرحلة، مع الاحتفاظ بسجلاتها وإبلاغ العملاء والطاقم داخل المنصة.</p>`:''}
   ${complete?uiLocale.html`<p>حدد من حضر الغوص فعليًا. تُحفظ سجلاتهم بانتظار مراجعة سجلات الغوص، وتُلغى الحجوزات غير المؤكدة. تبقى الحجوزات المؤكدة محفوظة للتاريخ.</p><fieldset><legend>الحاضرون من الحجوزات المؤكدة</legend>${data.participants.length?data.participants.map(p=>uiLocale.html`<label class="hl-trip-check"><input type="checkbox" name="attendedParticipantIds" value="${esc(p.id)}">${esc(p.fullName)} · ${uiLocale.label(p.eligibilityStatus==='ELIGIBLE'?'مؤهل':'تحتاج الأهلية إلى مراجعة')}</label>`).join(''):uiLocale.html`<p>لا يوجد مشاركون مؤكدون.</p>`}</fieldset><label>موقع الغوص<input name="siteName" required maxlength="240"></label><label>المنطقة<input name="regionCode" maxlength="60" placeholder="ASIR"></label><label>أقصى عمق بالمتر<input name="maxDepthM" type="number" min="0.1" max="150" step="0.1" required></label><label>مدة الغوص بالدقائق<input name="durationMin" type="number" min="1" max="600" step="1" required></label><label>اسم المدرب<input name="instructorName" maxlength="240"></label><label>ملاحظات الغوص<textarea name="notes" maxlength="2000"></textarea></label>`:''}
   ${action==='CLOSE'?uiLocale.html`<p>يتوقف استقبال الحجوزات الجديدة وتبقى الحجوزات الحالية محفوظة. يتطلب الإجراء اعتماد تشغيل ساريًا.</p>`:''}
   ${['REOPEN','PUBLISH'].includes(action)?uiLocale.html`<p>سيُفتح الحجز قبل موعد البداية مع استمرار اشتراطات السعر والسلامة والطقس.</p>`:''}
   <label>سبب الإجراء<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label>
   ${final?uiLocale.html`<label class="hl-trip-check"><input type="checkbox" name="financialAcknowledged" required>أعلم أن الحفظ لا ينفّذ استردادًا ماليًا تلقائيًا، وأن أي مبالغ مدفوعة تحتاج متابعة عبر الإجراءات المالية.</label>`:''}
   <button type="submit">${uiLocale.label(labels[action])}</button><p data-trip-action-feedback role="status"></p>
  </form></details>`;
 }
 function mount(box,options){
  let generation=0,busy=false;
  const current=version=>box.isConnected&&generation===version&&options.isCurrent();
  async function load(){
   if(busy)return;const version=++generation;uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل حالة الرحلة والحجوزات والمدفوعات…</p>`);
   try{
    if(!(await options.authorize())||!current(version))return;
    const response=await options.load(),data=await response.json().catch(()=>null);if(!current(version))return;
    if(!response.ok)throw localError(data?.message||uiLocale.message('تعذر تحميل إجراءات الرحلة.'));
    if(!data?.trip||!Array.isArray(data.actions)||!Array.isArray(data.participants)||!Array.isArray(data.financial)||!data.stateToken)throw localError(uiLocale.message('بيانات إجراءات الرحلة غير مكتملة.'));
    uiLocale.setHTML(box, uiLocale.html`<header><h4>إجراءات الرحلة</h4><button type="button" data-trip-lifecycle-refresh>تحديث التفاصيل</button></header><p>نهاية الرحلة: ${esc(fmt(data.trip.endsAt))} — توقيت الرياض</p><p>الحجوزات المؤكدة: ${Number(data.bookings.confirmed)} · المقاعد المؤكدة: ${Number(data.bookings.confirmedSeats)} · بانتظار التأكيد: ${Number(data.bookings.pending)} · الملغاة: ${Number(data.bookings.cancelled)}</p><p>${uiLocale.label(data.clearance?.status==='ACTIVE'?'اعتماد التشغيل ساري.':'لا يوجد اعتماد تشغيل ساري؛ يحتاج إغلاق الحجز أو إنهاء الرحلة إلى مراجعة الإدارة.')}</p><h5>المدفوعات المسجّلة</h5>${data.financial.length?uiLocale.html`<div class="hl-trip-financial"><table><thead><tr><th>الحالة</th><th>العدد</th><th>المبلغ</th></tr></thead><tbody>${data.financial.map(p=>uiLocale.html`<tr><td>${uiLocale.label(paymentLabels[p.status]||p.status)}</td><td>${Number(p.count)}</td><td>${(Number(p.amountMinor)/100).toFixed(2)} ${esc(p.currency)}</td></tr>`).join('')}</tbody></table></div>`:uiLocale.html`<p>لا توجد مدفوعات مسجّلة.</p>`}<p>تبقى المدفوعات والفواتير محفوظة. إلغاء الرحلة أو إنهاؤها لا يعني استرداد المبلغ.</p>${data.lastAction?.reason?uiLocale.html`<p>سبب آخر إجراء: ${esc(data.lastAction.reason)}</p>`:''}${data.actions.filter(a=>uiLocale.t(labels[a])).map(a=>form(a,data)).join('')||uiLocale.html`<p>انتهت إجراءات هذه الرحلة ولا يمكن إعادة فتحها.</p>`}${['OPEN','CLOSED'].includes(data.trip.status)&&!data.actions.includes('COMPLETE')?uiLocale.html`<p>يظهر إجراء الإنهاء بعد موعد نهاية الرحلة.</p>`:''}`);
    box.querySelector('[data-trip-lifecycle-refresh]').onclick=()=>void load();
    box.querySelectorAll('[data-trip-lifecycle-form]').forEach(node=>node.onsubmit=event=>{event.preventDefault();void save(node,data,version)});
   }catch(error){if(current(version)){uiLocale.setHTML(box, uiLocale.html`<p role="alert">${uiLocale.messageHTML(localErrorMessage(error)||uiLocale.message('تعذر تحميل إجراءات الرحلة.'))}</p><button type="button" data-trip-lifecycle-refresh>تحديث التفاصيل</button>`);box.querySelector('button').onclick=()=>void load()}}
  }
  async function save(node,data,version){
   if(busy||!current(version))return;
   const values=new FormData(node),action=node.dataset.action,feedback=node.querySelector('[data-trip-action-feedback]');
   const input={action,requestId:node.dataset.requestId,expectedUpdatedAt:data.trip.updatedAt,expectedState:data.stateToken,reason:String(values.get('reason')||'')};
   if(['CANCEL','COMPLETE'].includes(action))input.financialAcknowledged=values.has('financialAcknowledged');
   if(action==='COMPLETE'){
    const ids=values.getAll('attendedParticipantIds');if(!ids.length){uiLocale.setText(feedback, ...['حدد مشاركًا حضر الغوص فعليًا على الأقل. إذا لم تُنفذ الرحلة فاستخدم الإلغاء.']);return}
    Object.assign(input,{attendedParticipantIds:ids,siteName:values.get('siteName'),regionCode:values.get('regionCode'),maxDepthM:Number(values.get('maxDepthM')),durationMin:Number(values.get('durationMin')),instructorName:values.get('instructorName'),notes:values.get('notes')});
   }
   busy=true;box.querySelectorAll('button').forEach(b=>b.disabled=true);uiLocale.setText(feedback, ...['جارٍ حفظ الإجراء…']);
   try{
    if(!(await options.authorize())||!current(version))return;
    const response=await options.send(input),result=await response.json().catch(()=>null);if(!current(version))return;
    if(!response.ok){feedback.textContent=(result?.message||uiLocale.t('تعذر حفظ الإجراء.'))+(response.status===409?uiLocale.t(' راجع المدخلات، ثم استخدم «تحديث التفاصيل» عند الحاجة.'):'');return}
    uiLocale.setText(feedback, ...['تم حفظ الإجراء.']);await options.onSaved(result);
   }catch(error){if(current(version))uiLocale.setMessage(feedback, localErrorMessage(error)||uiLocale.message('تعذر الحفظ. يمكنك إعادة المحاولة بنفس البيانات.'))}
   finally{busy=false;if(current(version))box.querySelectorAll('button').forEach(b=>b.disabled=false)}
  }
  void load();return Object.freeze({reload:load});
 }
 window.HydrolandTripLifecycle=Object.freeze({mount});
})();
