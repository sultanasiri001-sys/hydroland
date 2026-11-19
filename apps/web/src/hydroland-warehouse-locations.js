(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("warehouse-locations", {
  "مؤرشف": "Archived",
  "اسم الموقع": "Location name",
  "سبب التعديل": "Reason for change",
  "مسجل": "Recorded",
  "إنشاء": "Create",
  "تعديل": "Edit",
  "أرشفة": "Archive",
  "استعادة": "Restore",
  "وصف الموقع": "Location description",
  "رمز الموقع (حروف لاتينية وأرقام)": "Location code (Latin letters and numbers)",
  "إنشاء رمز الموقع": "Create location code",
  "مواقع المستودعات": "Warehouse locations",
  "سجل مواقع داخل الجهة؛ تسجيل الموقع أو استعادته لا يثبت الرصيد الفعلي أو تنفيذ حركة مخزون أو تصريح تشغيل.": "An organization location register. Registering or restoring a location does not establish actual stock, an inventory movement or permission to operate.",
  "تحديث مواقع المستودعات": "Refresh warehouse locations",
  "موقع مستودع جديد": "New warehouse location",
  "تسجيل موقع مستودع": "Register warehouse location",
  "قائمة مواقع المستودعات": "Warehouse location list",
  "مواقع أقدم": "Older locations",
  "تعديل موقع المستودع": "Edit warehouse location",
  "رمز الموقع ثابت؛ الاسم والوصف قابلان للتعديل.": "The location code is fixed. The name and description can be edited.",
  "سبب تعديل الموقع": "Reason for location change",
  "حفظ إصدار الموقع": "Save location revision",
  "حالة الموقع": "Location status",
  "سبب الإجراء": "Reason for action",
  "سبب أرشفة أو استعادة الموقع": "Reason for archiving or restoring the location",
  "راجعت الموقع وأثر الأرشفة أو الاستعادة": "I reviewed the location and the effects of archiving or restoring it",
  "تاريخ إصدارات الموقع": "Location revision history",
  "سجل المواقع متاح لمالك هيدرولاند المتحقق فقط.": "The location register is available only to the verified HYDROLAND owner.",
  "صلاحية سجل المواقع غير متاحة.": "Location register permission is unavailable.",
  "تعذر حفظ أو قراءة الموقع.": "Could not save or read the location.",
  "تعذر تأكيد إصدار الموقع.": "Could not verify the location revision.",
  "{0} · {1} · {2} · الإصدار {3}": "{0} · {1} · {2} · Revision {3}",
  "أرشفة الموقع": "Archive location",
  "استعادة سجل الموقع": "Restore location record",
  "الإصدار {0} · {1} · {2}": "Revision {0} · {1} · {2}",
  "يُعرض أحدث 50 إصدارًا؛ الإصدارات الأقدم محفوظة.": "The latest 50 revisions are shown. Older revisions are retained.",
  "تعذر إكمال الإجراء.": "Could not complete the action.",
  "تعذر تأكيد قائمة المواقع.": "Could not verify the location list.",
  "تم تحميل مواقع المستودعات.": "Warehouse locations loaded.",
  "لا توجد مواقع مستودعات مسجلة في هذا النطاق.": "No warehouse locations recorded in this scope.",
  "تم تحميل الإصدار الحالي للموقع.": "Current location revision loaded.",
  "حُفظ سجل الموقع؛ الرصيد والحركات يحتاجان إلى سجل مستقل.": "Location record saved. Stock and movements require a separate record.",
  "حُفظ إصدار جديد للموقع.": "New location revision saved.",
  "حُفظت حالة الموقع وإصدارها الجديد.": "Location status and its new revision saved.",
  "{0} اسم الموقع": "{0} location name",
  "{0} وصف الموقع": "{0} location description"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

 const mount=()=>{
  const host=document.getElementById('hl-admin-employees');if(!host)return false;
  if(window.HydrolandWarehouseLocations)return true;
  const box=document.createElement('details');box.className='hl-ai-workforce';box.dataset.warehouseLocations='';
  const actions={WAREHOUSE_LOCATION_CREATED:'إنشاء',WAREHOUSE_LOCATION_EDITED:'تعديل',WAREHOUSE_LOCATION_ARCHIVED:'أرشفة',WAREHOUSE_LOCATION_RESTORED:'استعادة'};
  const fields=(prefix,create=false)=>uiLocale.html`${(create?uiLocale.html`<label>رمز الموقع (حروف لاتينية وأرقام)<input name="code" aria-label="إنشاء رمز الموقع" required minlength="2" maxlength="32" placeholder="WH-001"></label>`:'')}<label>اسم الموقع<input name="title" ${uiLocale.attribute('aria-label','{0} اسم الموقع',[prefix])} required maxlength="160"></label><label>وصف الموقع<textarea name="locationDescription" ${uiLocale.attribute('aria-label','{0} وصف الموقع',[prefix])} required maxlength="1000"></textarea></label>`;
  uiLocale.setHTML(box, uiLocale.html`<summary>مواقع المستودعات</summary><div class="hl-ai-body"><p>سجل مواقع داخل الجهة؛ تسجيل الموقع أو استعادته لا يثبت الرصيد الفعلي أو تنفيذ حركة مخزون أو تصريح تشغيل.</p><button type="button" data-warehouse-refresh>تحديث مواقع المستودعات</button><p role="status" data-warehouse-feedback></p><form data-warehouse-create hidden><fieldset><legend>موقع مستودع جديد</legend>${fields(uiLocale.message('إنشاء'),true)}<button type="submit">تسجيل موقع مستودع</button></fieldset></form><section aria-label="قائمة مواقع المستودعات" data-warehouse-list></section><button type="button" data-warehouse-older hidden>مواقع أقدم</button><form data-warehouse-edit hidden><fieldset><legend>تعديل موقع المستودع</legend><p>رمز الموقع ثابت؛ الاسم والوصف قابلان للتعديل.</p>${fields(uiLocale.message('تعديل'))}<label>سبب التعديل<input name="reason" aria-label="سبب تعديل الموقع" maxlength="500" required></label><button type="submit">حفظ إصدار الموقع</button></fieldset></form><form data-warehouse-state hidden><fieldset><legend>حالة الموقع</legend><label>سبب الإجراء<input name="reason" aria-label="سبب أرشفة أو استعادة الموقع" maxlength="500" required></label><label><input type="checkbox" name="confirmed" required>راجعت الموقع وأثر الأرشفة أو الاستعادة</label><button type="submit" data-warehouse-transition></button></fieldset></form><section aria-label="تاريخ إصدارات الموقع" data-warehouse-history></section></div>`);
  host.appendChild(box);
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const create=box.querySelector('[data-warehouse-create]'),edit=box.querySelector('[data-warehouse-edit]'),stateForm=box.querySelector('[data-warehouse-state]'),list=box.querySelector('[data-warehouse-list]'),history=box.querySelector('[data-warehouse-history]'),feedback=box.querySelector('[data-warehouse-feedback]'),older=box.querySelector('[data-warehouse-older]');
  let epoch=0,busy=false,current=null,nextCursor=null,ownerLoaded=false,requestKey=null,requestContent=null;
  const eligible=()=>Boolean(box.open&&!host.hidden&&auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin'));
  const same=(v,s)=>v===epoch&&s===auth()?.getSessionVersion?.()&&eligible();
  function lock(){box.querySelectorAll('fieldset,button').forEach(e=>e.disabled=busy);older.hidden=!nextCursor;}
  function clear(){epoch++;busy=false;current=null;nextCursor=null;ownerLoaded=false;requestKey=requestContent=null;list.replaceChildren();history.replaceChildren();feedback.textContent='';for(const f of [create,edit,stateForm]){f.reset();f.hidden=true;}older.hidden=true;box.open=false;lock();}
  async function authorize(v,s){const ok=await access()?.authorizeRole?.('admin',{sessionVersion:s,isCurrent:()=>v===epoch&&!host.hidden&&box.open});if(!ok||!same(v,s)){if(v===epoch)clear();return false;}return true;}
  async function call(path,options,v,s){const response=await auth().authorizedFetch('/admin/warehouse-locations'+path,options),data=await response.json().catch(()=>null);if(response.status===401||response.status===403){if(v===epoch){clear();uiLocale.setMessage(feedback, uiLocale.message('سجل المواقع متاح لمالك هيدرولاند المتحقق فقط.'));}throw localError('صلاحية سجل المواقع غير متاحة.');}if(!response.ok)throw (typeof data?.message==='string'?new Error(data.message):localError('تعذر حفظ أو قراءة الموقع.'));if(!same(v,s))return null;return data;}
  const valid=r=>r&&typeof r.id==='string'&&Number.isSafeInteger(r.revision)&&r.revision>0&&['RECORDED','ARCHIVED'].includes(r.status)&&typeof r.title==='string'&&r.title.length<=160&&typeof r.code==='string'&&/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(r.code);
  function selected(detail){
   const r=detail?.record;if(detail?.schemaVersion!==1||detail.policy!=='WAREHOUSE_LOCATION_REGISTER_V1'||!valid(r)||typeof r.locationDescription!=='string'||r.locationDescription.length>1000||typeof detail.historyTruncated!=='boolean'||!Array.isArray(detail.history)||detail.history.some(h=>!Number.isSafeInteger(h.revision)||typeof h.reason!=='string'||typeof h.action!=='string'||!Object.hasOwn(actions,h.action)||h.revision<1||h.revision>r.revision||h.reason.length>500))throw localError('تعذر تأكيد إصدار الموقع.');
   current=r;let item=[...list.querySelectorAll('[data-warehouse-location-id]')].find(b=>b.dataset.warehouseLocationId===r.id);if(!item){item=document.createElement('button');item.type='button';item.dataset.warehouseLocationId=r.id;list.prepend(item);}uiLocale.setText(item, "{0} · {1} · {2} · الإصدار {3}", [r.code, r.title, (r.status==='RECORDED'?uiLocale.message('مسجل'):uiLocale.message('مؤرشف')), r.revision]);edit.hidden=r.status!=='RECORDED';stateForm.hidden=false;
   edit.elements.title.value=r.title;edit.elements.locationDescription.value=r.locationDescription;edit.elements.reason.value='';stateForm.reset();
   uiLocale.setMessage(box.querySelector('[data-warehouse-transition]'), (r.status==='RECORDED'?uiLocale.message('أرشفة الموقع'):uiLocale.message('استعادة سجل الموقع')));history.replaceChildren();
   const title=document.createElement('h5');uiLocale.setMessage(title, uiLocale.message('تاريخ إصدارات الموقع'));history.appendChild(title);
   for(const h of detail.history){const p=document.createElement('p');uiLocale.setText(p, "الإصدار {0} · {1} · {2}", [h.revision, (value=>value?uiLocale.message(value):value)(actions[h.action]), h.reason]);history.appendChild(p);}
   if(detail.historyTruncated){const p=document.createElement('p');uiLocale.setMessage(p, uiLocale.message('يُعرض أحدث 50 إصدارًا؛ الإصدارات الأقدم محفوظة.'));history.appendChild(p);}
  }
  function content(form){return {...(form===create?{code:form.elements.code.value.trim().toUpperCase()}:{}),title:form.elements.title.value.trim(),locationDescription:form.elements.locationDescription.value.trim()};}
  async function operation(work){if(busy||!eligible())return;const v=++epoch,s=auth().getSessionVersion?.();busy=true;lock();try{if(await authorize(v,s))await work(v,s);}catch(e){if(same(v,s))setLocalErrorText(feedback, e, 'تعذر إكمال الإجراء.');}finally{if(v===epoch){busy=false;lock();}}}
  async function load(append=false){return operation(async(v,s)=>{
   const payload=await call(append?'?cursor='+encodeURIComponent(nextCursor):'',{},v,s);if(!payload)return;
   if(payload.schemaVersion!==1||payload.policy!=='WAREHOUSE_LOCATION_REGISTER_V1'||!Array.isArray(payload.items)||payload.items.length>50||payload.items.some(r=>!valid(r))||typeof payload.hasMore!=='boolean'||(payload.hasMore&&typeof payload.nextCursor!=='string'))throw localError('تعذر تأكيد قائمة المواقع.');
   if(!append){list.replaceChildren();history.replaceChildren();current=null;edit.hidden=stateForm.hidden=true;}ownerLoaded=true;create.hidden=false;nextCursor=payload.hasMore?payload.nextCursor:null;
   for(const r of payload.items){const button=document.createElement('button');button.type='button';button.dataset.warehouseLocationId=r.id;uiLocale.setText(button, "{0} · {1} · {2} · الإصدار {3}", [r.code, r.title, (r.status==='RECORDED'?uiLocale.message('مسجل'):uiLocale.message('مؤرشف')), r.revision]);list.appendChild(button);}
   uiLocale.setMessage(feedback, (payload.items.length?uiLocale.message('تم تحميل مواقع المستودعات.'):uiLocale.message('لا توجد مواقع مستودعات مسجلة في هذا النطاق.')));
  });}
  list.addEventListener('click',event=>{const button=event.target.closest('[data-warehouse-location-id]');if(!button)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(button.dataset.warehouseLocationId),{},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('تم تحميل الإصدار الحالي للموقع.'));}});});
  create.addEventListener('submit',event=>{event.preventDefault();if(!ownerLoaded)return;void operation(async(v,s)=>{const c=content(create),snapshot=JSON.stringify(c);if(snapshot!==requestContent){requestKey=crypto.randomUUID();requestContent=snapshot;}const d=await call('',{method:'POST',body:JSON.stringify({...c,requestKey}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);create.reset();requestKey=requestContent=null;uiLocale.setMessage(feedback, uiLocale.message('حُفظ سجل الموقع؛ الرصيد والحركات يحتاجان إلى سجل مستقل.'));}});});
  edit.addEventListener('submit',event=>{event.preventDefault();if(!current)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(current.id),{method:'PATCH',body:JSON.stringify({...content(edit),expectedRevision:current.revision,reason:edit.elements.reason.value.trim()}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('حُفظ إصدار جديد للموقع.'));}});});
  stateForm.addEventListener('submit',event=>{event.preventDefault();if(!current)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(current.id)+(current.status==='RECORDED'?'/archive':'/restore'),{method:'POST',body:JSON.stringify({expectedRevision:current.revision,reason:stateForm.elements.reason.value.trim(),confirmed:stateForm.elements.confirmed.checked}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('حُفظت حالة الموقع وإصدارها الجديد.'));}});});
  box.querySelector('[data-warehouse-refresh]').addEventListener('click',()=>void load());older.addEventListener('click',()=>{if(nextCursor)void load(true);});
  box.addEventListener('toggle',()=>{if(box.open)void load();else clear();});
  document.addEventListener('hydroland:workspace-selected',e=>{if(e.detail?.target!==host)clear();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.()||!access()?.roleAllowed?.('admin'))clear();});
  window.HydrolandWarehouseLocations={clear};return true;
 };
 if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
