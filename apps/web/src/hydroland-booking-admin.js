(()=>{
 const root=document.getElementById('role-console');if(!root)return;
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const panel=document.createElement('section');panel.className='hl-booking-admin';panel.hidden=true;
 panel.innerHTML='<header><h3>إدارة حجوزات الرحلات</h3><button type="button" data-booking-admin-refresh>تحديث الحجوزات</button></header><p data-booking-admin-state role="status"></p><div data-booking-admin-list></div>';
 root.insertAdjacentElement('afterend',panel);
 const style=document.createElement('style');style.textContent='.hl-booking-admin{padding:1rem;min-width:0}.hl-booking-admin header,.hl-booking-admin .hl-booking-row{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}.hl-booking-admin article,.hl-booking-admin details{border:1px solid #7894a755;border-radius:12px;padding:1rem;margin-block:.7rem;overflow-wrap:anywhere}.hl-booking-admin small{display:block}.hl-booking-admin fieldset,.hl-booking-admin label{display:grid;gap:.6rem;min-width:0}.hl-booking-admin input,.hl-booking-admin select,.hl-booking-admin textarea{max-width:100%;box-sizing:border-box;font:inherit}.hl-booking-admin label:has([type=checkbox]){display:flex;align-items:start}.hl-booking-admin button{font:inherit;padding:.5rem;margin:.25rem}.hl-booking-admin textarea{width:100%;min-height:5rem}';document.head.append(style);
 const host=panel.querySelector('[data-booking-admin-list]'),state=t=>panel.querySelector('[data-booking-admin-state]').textContent=t;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=s=>({CONFIRMED:'مؤكد',CANCELLED:'ملغي',PENDING:'بانتظار التأكيد',ELIGIBLE:'مؤهل',REJECTED:'مرفوض'}[s]||s);
 let version=0;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 function clear(){version++;panel.hidden=true;host.textContent='';state('')}
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true}
 async function api(path,options){const response=await auth().authorizedFetch(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||'تعذر تنفيذ الإجراء.');return body}
 function participants(trip,booking){return (booking.participants||[]).map(p=>`<details data-admin-participant="${esc(p.id)}"><summary>${esc(p.fullName)} · ${esc(p.eligibilityStatus==='PENDING'?'بانتظار المراجعة':label(p.eligibilityStatus))}</summary><p>الشهادة المقدمة: ${esc(p.certificationTitle||'غير مسجلة')} · الجهة: ${esc(p.certificationIssuer||'غير مسجلة')} · الرقم: ${esc(p.certificationNumber||'غير مسجل')}</p><p>هذه بيانات مقدمة من المشارك؛ راجع أدلة الأهلية قبل القرار.</p>${booking.status==='PENDING'&&!['COMPLETED','CANCELLED'].includes(trip.status)&&new Date(trip.startsAt)>new Date()?`<form data-participant-review data-trip="${esc(trip.id)}" data-booking="${esc(booking.id)}" data-participant="${esc(p.id)}" data-revision="${esc(p.updatedAt)}"><fieldset><label>قرار أهلية المشارك<select name="status" aria-label="قرار أهلية المشارك" required><option value="">اختر القرار</option><option value="ELIGIBLE">مؤهل</option><option value="REJECTED">مرفوض</option></select></label><label>ملاحظات مراجعة الأهلية<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت بيانات وأدلة أهلية المشارك</label><button type="submit">حفظ مراجعة الأهلية</button></fieldset><p data-review-feedback role="status"></p></form>`:'<p>مراجعة الأهلية للعرض فقط بعد تأكيد الحجز أو إغلاق الرحلة.</p>'}</details>`).join('')||'<p>لا توجد بيانات مشاركين.</p>'}
 function render(groups){host.innerHTML=groups.length?groups.map(({trip,rows})=>{
  const confirmed=rows.filter(x=>x.status==='CONFIRMED').reduce((n,x)=>n+Number(x.seats||0),0),pending=rows.filter(x=>x.status==='PENDING').reduce((n,x)=>n+Number(x.seats||0),0);
  return `<article class="hl-booking-group"><strong>${esc(trip.title)}</strong><small>${esc(trip.type)} · مؤكد ${confirmed} · انتظار ${pending} · متبقي ${Math.max(0,Number(trip.capacity||0)-confirmed)} · السعة ${esc(trip.capacity)}</small>${rows.map(x=>`<article data-admin-booking="${esc(x.id)}"><div class="hl-booking-row"><div><b>${esc(`${x.account?.person?.firstName||''} ${x.account?.person?.lastName||''}`.trim()||'مستخدم')}</b><small>${esc(x.seats)} مقعد · ${esc(label(x.status))}</small></div><div>${x.status==='PENDING'?`<button type="button" data-confirm-booking="${esc(x.id)}" data-trip="${esc(trip.id)}">تأكيد</button>`:''}${x.status!=='CANCELLED'?`<button type="button" data-cancel-booking="${esc(x.id)}" data-trip="${esc(trip.id)}">إلغاء</button>`:''}</div></div>${participants(trip,x)}</article>`).join('')||'<p>لا توجد حجوزات.</p>'}</article>`;
 }).join(''):'<p>لا توجد رحلات.</p>'}
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;host.textContent='';state('جارٍ تحميل الحجوزات');
  try{if(!await authorize(v,session))return;const trips=await api('/trips/admin');if(!current(v,session))return;if(!Array.isArray(trips))throw new Error('تعذر تحميل الرحلات.');const groups=await Promise.all(trips.map(async trip=>({trip,rows:await api('/trips/admin/'+encodeURIComponent(trip.id)+'/bookings')})));if(!current(v,session))return;render(groups);state('تم تحديث الحجوزات')}
  catch(error){if(current(v,session))state(error.message||'تعذر تحميل الحجوزات')}
 }
 panel.addEventListener('click',async event=>{
  if(event.target.closest('[data-booking-admin-refresh]')){void load();return}
  const button=event.target.closest('[data-confirm-booking],[data-cancel-booking]');if(!button||button.disabled)return;
  const v=version,session=auth()?.getSessionVersion?.(),confirm=Boolean(button.dataset.confirmBooking),bookingId=button.dataset.confirmBooking||button.dataset.cancelBooking;button.disabled=true;
  try{if(!await authorize(v,session)||!button.isConnected)return;const body=await api(`/trips/admin/${encodeURIComponent(button.dataset.trip)}/bookings/${encodeURIComponent(bookingId)}/${confirm?'confirm':'cancel'}`,{method:'PATCH'});if(!current(v,session)||!button.isConnected)return;await load();window.HydrolandBookings?.reload?.();window.dispatchEvent(new CustomEvent(confirm?'hydroland:booking-confirmed':'hydroland:booking-cancelled',{detail:body}));if(eligible())state(confirm?'تم تأكيد الحجز':'تم إلغاء الحجز وتحرير المقاعد')}
  catch(error){if(current(v,session)&&button.isConnected)state(error.message||'تعذر تنفيذ الإجراء')}
  finally{button.disabled=false}
 });
 panel.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-participant-review]');if(!form)return;event.preventDefault();if(form.dataset.busy)return;
  const v=version,session=auth()?.getSessionVersion?.(),fields=new FormData(form),feedback=form.querySelector('[data-review-feedback]');
  const body={status:fields.get('status'),reason:String(fields.get('reason')||'').trim(),reviewed:fields.get('reviewed')==='on',expectedUpdatedAt:form.dataset.revision};
  if(!body.reviewed||!['ELIGIBLE','REJECTED'].includes(body.status)||body.reason.length<5){feedback.textContent='اختر القرار وأضف ملاحظات وأكد مراجعة الأهلية.';return}
  form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
  try{if(!await authorize(v,session)||!form.isConnected)return;await api(`/trips/admin/${encodeURIComponent(form.dataset.trip)}/bookings/${encodeURIComponent(form.dataset.booking)}/participants/${encodeURIComponent(form.dataset.participant)}/eligibility`,{method:'PATCH',body:JSON.stringify(body)});if(!current(v,session)||!form.isConnected)return;await load();if(eligible())state('تم حفظ مراجعة الأهلية؛ تأكيد الحجز إجراء مستقل')}
  catch(error){if(current(v,session)&&form.isConnected)feedback.textContent=error.message||'تعذر حفظ مراجعة الأهلية'}
  finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 });
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear()});
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear()});
 document.addEventListener('hydroland:trip-status-changed',()=>{if(eligible())void load()});
 window.addEventListener('hydroland:booking-created',()=>{if(eligible())void load()});
 window.HydrolandBookingAdmin=Object.freeze({reload:load});if(eligible())void load();
})();
