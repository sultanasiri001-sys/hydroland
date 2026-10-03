(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const host=document.querySelector('.hl-admin__grid');if(!host)return;
 const panel=document.createElement('article');panel.className='hl-admin__panel hl-admin__credential-panel';panel.dataset.centerLicenseAdmin='';
 panel.innerHTML='<h3>اعتماد رخص مراكز الغوص</h3><p>مراجعة إدارة المنصة مستقلة عن صلاحية التواريخ والتحقق من الجهة المصدرة.</p><button type="button" data-license-admin-refresh>تحديث الطلبات</button><p data-license-admin-state role="status"></p><div data-license-admin-list></div>';host.append(panel);
 const list=panel.querySelector('[data-license-admin-list]'),status=panel.querySelector('[data-license-admin-state]');
 let version=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 const clear=()=>{version++;list.textContent='';status.textContent='';panel.hidden=true};
 async function authorize(v,session){const valid=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!valid||!current(v,session)){if(v===version)clear();return false}return true}
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;list.textContent='';status.textContent='جارٍ تحميل رخص المراكز…';
  try{
   if(!(await authorize(v,session)))return;
   const response=await auth().authorizedFetch('/admin/center-licenses'),rows=await response.json().catch(()=>null);if(!current(v,session))return;
   if(!response.ok||!Array.isArray(rows))throw new Error('تعذر تحميل طلبات المراجعة.');
   status.textContent=rows.length?`${rows.length} طلب بانتظار المراجعة`:'لا توجد رخص بانتظار المراجعة.';
   list.innerHTML=rows.map(row=>`<section class="hl-admin__credential-card" data-platform-license="${esc(row.id)}" data-version="${esc(row.updatedAt)}"><header><div><strong>${esc(row.organization?.displayName)}</strong><small>${esc(row.subject)} · ${esc(row.referenceNumber)}</small></div><span>بانتظار القرار</span></header><p>الإصدار: ${esc(row.licenseIssuedAt?.slice(0,10))} · الانتهاء: ${esc(row.licenseExpiresAt?.slice(0,10))}</p><button type="button" data-license-admin-download>تنزيل ملف الرخصة للمراجعة</button><form data-license-admin-decision><label>القرار <select name="outcome" required><option value="">اختر القرار</option><option value="APPROVED">اعتماد لدى المنصة</option><option value="REJECTED">رفض</option></select></label><label>ملاحظات القرار — سبب الرفض مطلوب <input name="reason" maxlength="1000"></label><label><input type="checkbox" name="confirmed" required> راجعت ملف الرخصة وبياناته</label><button type="submit">حفظ قرار الإدارة</button><p data-license-admin-feedback role="status"></p></form></section>`).join('');
  }catch(error){if(current(v,session))status.textContent=error.message||'تعذر تحميل الطلبات.'}
 }
 async function download(button){
  if(button.disabled)return;const v=version,session=auth()?.getSessionVersion?.(),card=button.closest('[data-platform-license]'),feedback=card.querySelector('[data-license-admin-feedback]');button.disabled=true;
  try{if(!(await authorize(v,session)))return;const response=await auth().authorizedFetch('/admin/center-licenses/'+encodeURIComponent(card.dataset.platformLicense)+'/attachment');if(!current(v,session))return;if(!response.ok)throw new Error('تعذر تنزيل ملف الرخصة.');const blob=await response.blob();if(!current(v,session))return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='center-license.'+(blob.type==='application/pdf'?'pdf':blob.type==='image/png'?'png':'jpg');link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){if(current(v,session))feedback.textContent=error.message}finally{button.disabled=false}
 }
 async function decide(form){
  if(form.dataset.busy)return;const v=version,session=auth()?.getSessionVersion?.(),card=form.closest('[data-platform-license]'),feedback=form.querySelector('[data-license-admin-feedback]'),button=form.querySelector('[type=submit]');
  const body={outcome:form.elements.outcome.value,reason:form.elements.reason.value.trim(),expectedUpdatedAt:card.dataset.version};
  if(!form.elements.confirmed.checked)return;if(body.outcome==='REJECTED'&&body.reason.length<5){feedback.textContent='اكتب سبب رفض من 5 أحرف على الأقل.';return}
  form.dataset.busy='true';button.disabled=true;
  try{if(!(await authorize(v,session)))return;const response=await auth().authorizedFetch('/admin/center-licenses/'+encodeURIComponent(card.dataset.platformLicense)+'/decision',{method:'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!current(v,session))return;if(!response.ok)throw new Error(data?.message||'تعذر حفظ القرار.');await load()}catch(error){if(current(v,session))feedback.textContent=error.message}finally{delete form.dataset.busy;button.disabled=false}
 }
 panel.addEventListener('click',event=>{if(event.target.closest('[data-license-admin-refresh]'))void load();const button=event.target.closest('[data-license-admin-download]');if(button)void download(button)});
 panel.addEventListener('submit',event=>{const form=event.target.closest('[data-license-admin-decision]');if(form){event.preventDefault();void decide(form)}});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear()});
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear()});
 window.HydrolandCenterLicenseAdmin=Object.freeze({reload:load});if(eligible())void load();else clear();
})();
