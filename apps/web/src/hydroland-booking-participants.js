(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("booking-participants", {
  "سجّل الدخول أولًا": "Sign in first",
  "تعذر تنفيذ الطلب ({0})": "The request could not be completed ({0})",
  "بيانات المشاركين": "Participant details",
  "إغلاق": "Close",
  "مؤهل": "Eligible",
  "مرفوض": "Rejected",
  "بانتظار المراجعة": "Awaiting review",
  "لا توجد بيانات مشاركين.": "No participant details.",
  "المشارك": "Participant",
  "الاسم الكامل": "Full name",
  "الشهادة": "Certificate",
  "مثال: Open Water Diver": "Example: Open Water Diver",
  "رقم الشهادة": "Certificate number",
  "الجهة المصدرة": "Issuing organization",
  "· أي تعديل يعيد الأهلية للمراجعة.": "· Any change sends eligibility back for review.",
  "حفظ بيانات المشارك": "Save participant details",
  "مشارك مرتبط بالحساب": "Participant linked to an account",
  "مشارك مرافق": "Accompanying participant",
  "اكتب الاسم الكامل للمشارك": "Enter the participant's full name",
  "تم حفظ بيانات المشارك وإعادتها للمراجعة": "Participant details saved and returned for review",
  "تعذر حفظ بيانات المشارك": "Could not save participant details",
  "جارٍ تحميل المشاركين...": "Loading participants...",
  "تعذر تحميل المشاركين": "Could not load participants"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const auth=()=>window.HydrolandAuth;
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');clearTimeout(window.__hlParticipantToast);window.__hlParticipantToast=setTimeout(()=>t.classList.remove('visible'),2400)};
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw localError(uiLocale.message('سجّل الدخول أولًا'));const response=await client(path,options);const body=await response.json().catch(()=>null);if(!response.ok)throw localError(body?.message||uiLocale.message("تعذر تنفيذ الطلب ({0})", [response.status]));return body};
  let dialog=document.getElementById('hl-booking-participants-dialog');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='hl-booking-participants-dialog';dialog.className='hl-account-dialog hl-participants-dialog';
    uiLocale.setHTML(dialog, uiLocale.html`<div class="hl-account-head"><div><p class="eyebrow">BOOKING PARTICIPANTS</p><h2>بيانات المشاركين</h2></div><button type="button" aria-label="إغلاق">×</button></div><div class="hl-account-body" data-participants-body></div>`);
    dialog.querySelector('.hl-account-head button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});document.body.appendChild(dialog);
    const style=document.createElement('style');style.textContent='.hl-participant-card{display:grid;gap:.65rem;padding:1rem;border:1px solid rgba(120,191,224,.14);border-radius:18px;background:rgba(255,255,255,.035)}.hl-participant-card header{display:flex;align-items:center;justify-content:space-between;gap:.7rem}.hl-participant-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.hl-participant-grid label{display:grid;gap:.3rem;color:#b9d1dc;font-size:.78rem}.hl-participant-grid input{width:100%;border:1px solid rgba(120,191,224,.18);border-radius:10px;padding:.58rem .65rem;background:rgba(255,255,255,.045);color:#edf7fb;font:inherit}.hl-participant-card footer{display:flex;justify-content:flex-end}.hl-participant-card footer button{border:0;border-radius:10px;padding:.58rem .9rem;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131;font-weight:900}.hl-participant-card footer button:disabled{opacity:.55}@media(max-width:640px){.hl-participant-grid{grid-template-columns:1fr}}';document.head.appendChild(style);
  }
  const statusLabel=status=>status==='ELIGIBLE'?'مؤهل':status==='REJECTED'?'مرفوض':'بانتظار المراجعة';
  let activeBookingId=null;
  const render=rows=>{const body=dialog.querySelector('[data-participants-body]');const list=Array.isArray(rows)?rows:[];if(!list.length){uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">لا توجد بيانات مشاركين.</div>`);return}uiLocale.setHTML(body, list.map((row,index)=>uiLocale.html`<article class="hl-participant-card" data-participant-id="${esc(row.id)}"><header><strong>المشارك ${index+1}</strong><span class="hl-status ${row.eligibilityStatus==='ELIGIBLE'?'confirmed':row.eligibilityStatus==='REJECTED'?'rejected':'pending'}">${uiLocale.label(statusLabel(row.eligibilityStatus))}</span></header><div class="hl-participant-grid"><label>الاسم الكامل<input name="fullName" value="${esc(row.fullName||'')}"></label><label>الشهادة<input name="certificationTitle" value="${esc(row.certificationTitle||'')}" placeholder="مثال: Open Water Diver"></label><label>رقم الشهادة<input name="certificationNumber" value="${esc(row.certificationNumber||'')}"></label><label>الجهة المصدرة<input name="certificationIssuer" value="${esc(row.certificationIssuer||'')}"></label></div><small>${uiLocale.label(row.accountId?'مشارك مرتبط بالحساب':'مشارك مرافق')} · أي تعديل يعيد الأهلية للمراجعة.</small><footer><button type="button" data-save-participant>حفظ بيانات المشارك</button></footer></article>`).join(''));body.querySelectorAll('[data-save-participant]').forEach(button=>button.addEventListener('click',async()=>{const card=button.closest('[data-participant-id]'),participantId=card?.dataset.participantId;if(!activeBookingId||!participantId)return;const value=name=>card.querySelector(`[name="${name}"]`)?.value.trim()||'';const fullName=value('fullName');if(fullName.length<3){toast(uiLocale.message('اكتب الاسم الكامل للمشارك'));card.querySelector('[name="fullName"]')?.focus();return}button.disabled=true;try{const updated=await request(`/trips/bookings/${encodeURIComponent(activeBookingId)}/participants/${encodeURIComponent(participantId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName,certificationTitle:value('certificationTitle')||null,certificationNumber:value('certificationNumber')||null,certificationIssuer:value('certificationIssuer')||null})});render(updated);toast(uiLocale.message('تم حفظ بيانات المشارك وإعادتها للمراجعة'))}catch(error){toast(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر حفظ بيانات المشارك'))}finally{button.disabled=false}}))};
  const open=async bookingId=>{if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا'));return}activeBookingId=bookingId;const body=dialog.querySelector('[data-participants-body]');uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">جارٍ تحميل المشاركين...</div>`);dialog.showModal();try{render(await request(`/trips/bookings/${encodeURIComponent(bookingId)}/participants`,{method:'GET'}))}catch(error){uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-error">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل المشاركين'))}</div>`)}};
  document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target.closest('[data-booking-participants]'):null;if(!target)return;const bookingId=target.closest('[data-booking-id]')?.dataset.bookingId;if(!bookingId)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void open(bookingId)},true);
  window.HydrolandBookingParticipants={open};
})();
