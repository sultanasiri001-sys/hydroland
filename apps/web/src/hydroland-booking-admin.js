(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("booking-admin", {
  "إدارة حجوزات الرحلات": "Manage trip bookings",
  "تحديث الحجوزات": "Refresh bookings",
  "مؤكد": "Confirmed",
  "ملغي": "Cancelled",
  "بانتظار التأكيد": "Awaiting confirmation",
  "مؤهل": "Eligible",
  "مرفوض": "Rejected",
  "تعذر تنفيذ الإجراء.": "Could not complete the action.",
  "الشهادة المقدمة:": "Submitted certification:",
  "· الجهة:": "· Agency:",
  "· الرقم:": "· Number:",
  "هذه بيانات مقدمة من المشارك؛ راجع أدلة الأهلية قبل القرار.": "These details were submitted by the participant. Review the eligibility evidence before deciding.",
  "بانتظار المراجعة": "Awaiting review",
  "غير مسجلة": "Not recorded",
  "غير مسجل": "Not recorded",
  "قرار أهلية المشارك": "Participant eligibility decision",
  "اختر القرار": "Choose a decision",
  "ملاحظات مراجعة الأهلية": "Eligibility review notes",
  "راجعت بيانات وأدلة أهلية المشارك": "I reviewed the participant's eligibility details and evidence",
  "حفظ مراجعة الأهلية": "Save eligibility review",
  "مراجعة الأهلية للعرض فقط بعد تأكيد الحجز أو إغلاق الرحلة.": "Eligibility review is read-only after booking confirmation or trip closure.",
  "لا توجد بيانات مشاركين.": "No participant details have been recorded.",
  "· مؤكد": "· Confirmed",
  "· انتظار": "· Pending",
  "· متبقي": "· Remaining",
  "· السعة": "· Capacity",
  "مقعد ·": "seats ·",
  "مستخدم": "User",
  "تأكيد": "Confirm",
  "إلغاء": "Cancel",
  "لا توجد حجوزات.": "No bookings.",
  "لا توجد رحلات.": "No trips.",
  "جارٍ تحميل الحجوزات": "Loading bookings",
  "تعذر تحميل الرحلات.": "Could not load trips.",
  "تم تحديث الحجوزات": "Bookings refreshed",
  "تعذر تحميل الحجوزات": "Could not load bookings",
  "تم تأكيد الحجز": "Booking confirmed",
  "تم إلغاء الحجز وتحرير المقاعد": "Booking cancelled and seats released",
  "تعذر تنفيذ الإجراء": "Could not complete the action",
  "اختر القرار وأضف ملاحظات وأكد مراجعة الأهلية.": "Choose a decision, add notes and confirm the eligibility review.",
  "تم حفظ مراجعة الأهلية؛ تأكيد الحجز إجراء مستقل": "Eligibility review saved. Booking confirmation is a separate action",
  "تعذر حفظ مراجعة الأهلية": "Could not save the eligibility review"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredLabel=(s)=>((value=>value?uiLocale.message(value):value)({CONFIRMED:'مؤكد',CANCELLED:'ملغي',PENDING:'بانتظار التأكيد',ELIGIBLE:'مؤهل',REJECTED:'مرفوض'}[s]) || s);

 const root=document.getElementById('role-console');if(!root)return;
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const panel=document.createElement('section');panel.className='hl-booking-admin';panel.hidden=true;
 uiLocale.setHTML(panel, uiLocale.html`<header><h3>إدارة حجوزات الرحلات</h3><button type="button" data-booking-admin-refresh>تحديث الحجوزات</button></header><p data-booking-admin-state role="status"></p><div data-booking-admin-list></div>`);
 root.insertAdjacentElement('afterend',panel);
 const style=document.createElement('style');style.textContent='.hl-booking-admin{padding:1rem;min-width:0}.hl-booking-admin header,.hl-booking-admin .hl-booking-row{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}.hl-booking-admin article,.hl-booking-admin details{border:1px solid #7894a755;border-radius:12px;padding:1rem;margin-block:.7rem;overflow-wrap:anywhere}.hl-booking-admin small{display:block}.hl-booking-admin fieldset,.hl-booking-admin label{display:grid;gap:.6rem;min-width:0}.hl-booking-admin input,.hl-booking-admin select,.hl-booking-admin textarea{max-width:100%;box-sizing:border-box;font:inherit}.hl-booking-admin label:has([type=checkbox]){display:flex;align-items:start}.hl-booking-admin button{font:inherit;padding:.5rem;margin:.25rem}.hl-booking-admin textarea{width:100%;min-height:5rem}';document.head.append(style);
 const host=panel.querySelector('[data-booking-admin-list]'),state=t=>uiLocale.setMessage(panel.querySelector('[data-booking-admin-state]'), t);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=s=>({CONFIRMED:'مؤكد',CANCELLED:'ملغي',PENDING:'بانتظار التأكيد',ELIGIBLE:'مؤهل',REJECTED:'مرفوض'}[s]||s);
 let version=0;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 function clear(){version++;panel.hidden=true;host.textContent='';state('')}
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true}
 async function api(path,options){const response=await auth().authorizedFetch(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw (value=>value?new Error(value):localError('تعذر تنفيذ الإجراء.'))(body?.message);return body}
 function participants(trip,booking){return (booking.participants||[]).map(p=>uiLocale.html`<details data-admin-participant="${esc(p.id)}"><summary>${esc(p.fullName)} · ${uiLocale.messageHTML((p.eligibilityStatus==='PENDING'?uiLocale.message('بانتظار المراجعة'):authoredLabel(p.eligibilityStatus)))}</summary><p>الشهادة المقدمة: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير مسجلة')))(p.certificationTitle)} · الجهة: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير مسجلة')))(p.certificationIssuer)} · الرقم: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير مسجل')))(p.certificationNumber)}</p><p>هذه بيانات مقدمة من المشارك؛ راجع أدلة الأهلية قبل القرار.</p>${(booking.status==='PENDING'&&!['COMPLETED','CANCELLED'].includes(trip.status)&&new Date(trip.startsAt)>new Date()?uiLocale.html`<form data-participant-review data-trip="${esc(trip.id)}" data-booking="${esc(booking.id)}" data-participant="${esc(p.id)}" data-revision="${esc(p.updatedAt)}"><fieldset><label>قرار أهلية المشارك<select name="status" aria-label="قرار أهلية المشارك" required><option value="">اختر القرار</option><option value="ELIGIBLE">مؤهل</option><option value="REJECTED">مرفوض</option></select></label><label>ملاحظات مراجعة الأهلية<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت بيانات وأدلة أهلية المشارك</label><button type="submit">حفظ مراجعة الأهلية</button></fieldset><p data-review-feedback role="status"></p></form>`:uiLocale.html`<p>مراجعة الأهلية للعرض فقط بعد تأكيد الحجز أو إغلاق الرحلة.</p>`)}</details>`).join('')||uiLocale.html`<p>لا توجد بيانات مشاركين.</p>`}
 function render(groups){uiLocale.setHTML(host, groups.length?groups.map(({trip,rows})=>{
  const confirmed=rows.filter(x=>x.status==='CONFIRMED').reduce((n,x)=>n+Number(x.seats||0),0),pending=rows.filter(x=>x.status==='PENDING').reduce((n,x)=>n+Number(x.seats||0),0);
  return uiLocale.html`<article class="hl-booking-group"><strong>${esc(trip.title)}</strong><small>${esc(trip.type)} · مؤكد ${confirmed} · انتظار ${pending} · متبقي ${Math.max(0,Number(trip.capacity||0)-confirmed)} · السعة ${esc(trip.capacity)}</small>${rows.map(x=>uiLocale.html`<article data-admin-booking="${esc(x.id)}"><div class="hl-booking-row"><div><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('مستخدم')))(`${x.account?.person?.firstName||''} ${x.account?.person?.lastName||''}`.trim())}</b><small>${esc(x.seats)} مقعد · ${uiLocale.messageHTML(authoredLabel(x.status))}</small></div><div>${(x.status==='PENDING'?uiLocale.html`<button type="button" data-confirm-booking="${esc(x.id)}" data-trip="${esc(trip.id)}">تأكيد</button>`:'')}${(x.status!=='CANCELLED'?uiLocale.html`<button type="button" data-cancel-booking="${esc(x.id)}" data-trip="${esc(trip.id)}">إلغاء</button>`:'')}</div></div>${participants(trip,x)}</article>`).join('')||uiLocale.html`<p>لا توجد حجوزات.</p>`}</article>`;
 }).join(''):uiLocale.html`<p>لا توجد رحلات.</p>`)}
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;host.textContent='';state(uiLocale.message('جارٍ تحميل الحجوزات'));
  try{if(!await authorize(v,session))return;const trips=await api('/trips/admin');if(!current(v,session))return;if(!Array.isArray(trips))throw localError('تعذر تحميل الرحلات.');const groups=await Promise.all(trips.map(async trip=>({trip,rows:await api('/trips/admin/'+encodeURIComponent(trip.id)+'/bookings')})));if(!current(v,session))return;render(groups);state(uiLocale.message('تم تحديث الحجوزات'))}
  catch(error){if(current(v,session))state(localErrorMessage(error, 'تعذر تحميل الحجوزات'))}
 }
 panel.addEventListener('click',async event=>{
  if(event.target.closest('[data-booking-admin-refresh]')){void load();return}
  const button=event.target.closest('[data-confirm-booking],[data-cancel-booking]');if(!button||button.disabled)return;
  const v=version,session=auth()?.getSessionVersion?.(),confirm=Boolean(button.dataset.confirmBooking),bookingId=button.dataset.confirmBooking||button.dataset.cancelBooking;button.disabled=true;
  try{if(!await authorize(v,session)||!button.isConnected)return;const body=await api(`/trips/admin/${encodeURIComponent(button.dataset.trip)}/bookings/${encodeURIComponent(bookingId)}/${confirm?'confirm':'cancel'}`,{method:'PATCH'});if(!current(v,session)||!button.isConnected)return;await load();window.HydrolandBookings?.reload?.();window.dispatchEvent(new CustomEvent(confirm?'hydroland:booking-confirmed':'hydroland:booking-cancelled',{detail:body}));if(eligible())state((confirm?uiLocale.message('تم تأكيد الحجز'):uiLocale.message('تم إلغاء الحجز وتحرير المقاعد')))}
  catch(error){if(current(v,session)&&button.isConnected)state(localErrorMessage(error, 'تعذر تنفيذ الإجراء'))}
  finally{button.disabled=false}
 });
 panel.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-participant-review]');if(!form)return;event.preventDefault();if(form.dataset.busy)return;
  const v=version,session=auth()?.getSessionVersion?.(),fields=new FormData(form),feedback=form.querySelector('[data-review-feedback]');
  const body={status:fields.get('status'),reason:String(fields.get('reason')||'').trim(),reviewed:fields.get('reviewed')==='on',expectedUpdatedAt:form.dataset.revision};
  if(!body.reviewed||!['ELIGIBLE','REJECTED'].includes(body.status)||body.reason.length<5){uiLocale.setMessage(feedback, uiLocale.message('اختر القرار وأضف ملاحظات وأكد مراجعة الأهلية.'));return}
  form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
  try{if(!await authorize(v,session)||!form.isConnected)return;await api(`/trips/admin/${encodeURIComponent(form.dataset.trip)}/bookings/${encodeURIComponent(form.dataset.booking)}/participants/${encodeURIComponent(form.dataset.participant)}/eligibility`,{method:'PATCH',body:JSON.stringify(body)});if(!current(v,session)||!form.isConnected)return;await load();if(eligible())state(uiLocale.message('تم حفظ مراجعة الأهلية؛ تأكيد الحجز إجراء مستقل'))}
  catch(error){if(current(v,session)&&form.isConnected)setLocalErrorText(feedback, error, 'تعذر حفظ مراجعة الأهلية')}
  finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 });
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear()});
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear()});
 document.addEventListener('hydroland:trip-status-changed',()=>{if(eligible())void load()});
 window.addEventListener('hydroland:booking-created',()=>{if(eligible())void load()});
 window.HydrolandBookingAdmin=Object.freeze({reload:load});if(eligible())void load();
})();
