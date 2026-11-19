(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("marketing-drafts", {
  "إنشاء": "Create",
  "تعديل": "Edit",
  "أرشفة": "Archive",
  "استعادة": "Restore",
  "التطبيق": "App",
  "الموقع": "Website",
  "البريد الإلكتروني": "Email",
  "الرسائل النصية": "Text messages",
  "واتساب": "WhatsApp",
  "التواصل الاجتماعي": "Social media",
  "الإعلانات المدفوعة": "Paid advertising",
  "اسم المسودة": "Draft name",
  "هدف المسودة": "Draft objective",
  "قنوات التخطيط": "Planning channels",
  "قائمة مسودات الحملات": "Campaign draft list",
  "سبب تعديل المسودة": "Reason for editing draft",
  "سبب أرشفة أو استعادة المسودة": "Reason for archiving or restoring draft",
  "تاريخ إصدارات المسودة": "Draft version history",
  "مسودات حملات التسويق": "Marketing campaign drafts",
  "سجل تخطيط داخلي؛ حفظ المسودة وأرشفتها لا يعنيان اعتماد حملة أو نشرها أو قياس أدائها.": "Internal planning register. Saving or archiving a draft does not approve or publish a campaign, or measure its performance.",
  "تحديث مسودات الحملات": "Refresh campaign drafts",
  "مسودة حملة جديدة": "New campaign draft",
  "إنشاء مسودة حملة": "Create campaign draft",
  "مسودات أقدم": "Older drafts",
  "تعديل مسودة الحملة": "Edit campaign draft",
  "سبب التعديل": "Reason for edit",
  "حفظ إصدار المسودة": "Save draft version",
  "حالة المسودة": "Draft status",
  "سبب الإجراء": "Reason for the action",
  "راجعت المسودة وأثر الأرشفة أو الاستعادة": "I have reviewed the draft and the effect of archiving or restoration",
  "سجل المسودات متاح لمالك هيدرولاند المتحقق فقط.": "The draft register is available only to the verified Hydroland owner.",
  "صلاحية سجل المسودات غير متاحة.": "Draft-register authority unavailable.",
  "تعذر حفظ أو قراءة المسودة.": "Could not save or read the draft.",
  "تعذر تأكيد إصدار المسودة.": "Could not confirm the draft version.",
  "· الإصدار": "· Version",
  "مسودة": "Draft",
  "مؤرشفة": "Archived",
  "أرشفة المسودة": "Archive draft",
  "استعادة المسودة للتحرير": "Restore draft for editing",
  "الإصدار": "Version",
  "يُعرض أحدث 50 إصدارًا؛ الإصدارات الأقدم محفوظة.": "Showing the latest 50 versions. Earlier versions are retained.",
  "تعذر إكمال الإجراء.": "Could not complete the action.",
  "تعذر تأكيد قائمة المسودات.": "Could not confirm the draft list.",
  "تم تحميل مسودات الحملات.": "Campaign drafts loaded.",
  "لا توجد مسودات حملات مسجلة في هذا النطاق.": "No campaign drafts are registered in this scope.",
  "تم تحميل الإصدار الحالي للمسودة.": "Current draft version loaded.",
  "حُفظت مسودة التخطيط؛ لم يُنشر أو يُرسل محتوى.": "Planning draft saved. No content was published or sent.",
  "حُفظ إصدار جديد للمسودة.": "New draft version saved.",
  "حُفظت حالة المسودة وإصدارها الجديد.": "Draft status and new version saved.",
  "{0} اسم المسودة": "{0} draft name",
  "{0} هدف المسودة": "{0} draft objective",
  "{0} قنوات التخطيط": "{0} planning channels",
  "{0} · {1} · الإصدار {2}": "{0} · {1} · Version {2}",
  "الإصدار {0} · {1} · {2}": "Version {0} · {1} · {2}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


 const mount=()=>{
  const host=document.getElementById('hl-admin-employees');if(!host)return false;
  if(window.HydrolandMarketingDrafts)return true;
  const box=document.createElement('details');box.className='hl-ai-workforce';box.dataset.marketingDrafts='';
  const actions={MARKETING_CAMPAIGN_DRAFT_CREATED:'إنشاء',MARKETING_CAMPAIGN_DRAFT_EDITED:'تعديل',MARKETING_CAMPAIGN_DRAFT_ARCHIVED:'أرشفة',MARKETING_CAMPAIGN_DRAFT_RESTORED:'استعادة'};
  const channels={APP:'التطبيق',WEB:'الموقع',EMAIL:'البريد الإلكتروني',SMS:'الرسائل النصية',WHATSAPP:'واتساب',SOCIAL:'التواصل الاجتماعي',PAID_ADS:'الإعلانات المدفوعة'};
  const fields=prefix=>uiLocale.html`<label>اسم المسودة<input name="title" ${uiLocale.attribute("aria-label", "{0} اسم المسودة", [prefix])} required maxlength="160"></label><label>هدف المسودة<textarea name="objective" ${uiLocale.attribute("aria-label", "{0} هدف المسودة", [prefix])} required maxlength="2000"></textarea></label><label>قنوات التخطيط<select name="channels" ${uiLocale.attribute("aria-label", "{0} قنوات التخطيط", [prefix])} multiple required size="4">${Object.entries(channels).map(([k,v])=>uiLocale.html`<option value="${k}">${uiLocale.messageHTML(uiLocale.message(v))}</option>`).join('')}</select></label>`;
  uiLocale.setHTML(box, uiLocale.html`<summary>مسودات حملات التسويق</summary><div class="hl-ai-body"><p>سجل تخطيط داخلي؛ حفظ المسودة وأرشفتها لا يعنيان اعتماد حملة أو نشرها أو قياس أدائها.</p><button type="button" data-marketing-refresh>تحديث مسودات الحملات</button><p role="status" data-marketing-feedback></p><form data-marketing-create hidden><fieldset><legend>مسودة حملة جديدة</legend>${fields(uiLocale.message('إنشاء'))}<button type="submit">إنشاء مسودة حملة</button></fieldset></form><section aria-label="قائمة مسودات الحملات" data-marketing-list></section><button type="button" data-marketing-older hidden>مسودات أقدم</button><form data-marketing-edit hidden><fieldset><legend>تعديل مسودة الحملة</legend>${fields(uiLocale.message('تعديل'))}<label>سبب التعديل<input name="reason" aria-label="سبب تعديل المسودة" maxlength="500" required></label><button type="submit">حفظ إصدار المسودة</button></fieldset></form><form data-marketing-state hidden><fieldset><legend>حالة المسودة</legend><label>سبب الإجراء<input name="reason" aria-label="سبب أرشفة أو استعادة المسودة" maxlength="500" required></label><label><input type="checkbox" name="confirmed" required>راجعت المسودة وأثر الأرشفة أو الاستعادة</label><button type="submit" data-marketing-transition></button></fieldset></form><section aria-label="تاريخ إصدارات المسودة" data-marketing-history></section></div>`);
  host.appendChild(box);
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const create=box.querySelector('[data-marketing-create]'),edit=box.querySelector('[data-marketing-edit]'),stateForm=box.querySelector('[data-marketing-state]'),list=box.querySelector('[data-marketing-list]'),history=box.querySelector('[data-marketing-history]'),feedback=box.querySelector('[data-marketing-feedback]'),older=box.querySelector('[data-marketing-older]');
  let epoch=0,busy=false,current=null,nextCursor=null,ownerLoaded=false,requestKey=null,requestContent=null;
  const eligible=()=>Boolean(box.open&&!host.hidden&&auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin'));
  const same=(v,s)=>v===epoch&&s===auth()?.getSessionVersion?.()&&eligible();
  function lock(){box.querySelectorAll('fieldset,button').forEach(e=>e.disabled=busy);older.hidden=!nextCursor;}
  function clear(){epoch++;busy=false;current=null;nextCursor=null;ownerLoaded=false;requestKey=requestContent=null;list.replaceChildren();history.replaceChildren();uiLocale.setMessage(feedback, '');for(const f of [create,edit,stateForm]){f.reset();f.hidden=true;}older.hidden=true;box.open=false;lock();}
  async function authorize(v,s){const ok=await access()?.authorizeRole?.('admin',{sessionVersion:s,isCurrent:()=>v===epoch&&!host.hidden&&box.open});if(!ok||!same(v,s)){if(v===epoch)clear();return false;}return true;}
  async function call(path,options,v,s){const response=await auth().authorizedFetch('/admin/marketing-campaign-drafts'+path,options),data=await response.json().catch(()=>null);if(response.status===401||response.status===403){if(v===epoch){clear();uiLocale.setMessage(feedback, uiLocale.message('سجل المسودات متاح لمالك هيدرولاند المتحقق فقط.'));}throw localError(uiLocale.message('صلاحية سجل المسودات غير متاحة.'));}if(!response.ok)throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر حفظ أو قراءة المسودة.')));if(!same(v,s))return null;return data;}
  const valid=r=>r&&typeof r.id==='string'&&Number.isSafeInteger(r.revision)&&r.revision>0&&['DRAFT','ARCHIVED'].includes(r.status)&&typeof r.title==='string'&&r.title.length<=160&&Array.isArray(r.channels)&&r.channels.length>0&&r.channels.every(c=>Object.hasOwn(channels,c));
  function selected(detail){
   const r=detail?.record;if(detail?.schemaVersion!==1||detail.policy!=='MARKETING_CAMPAIGN_DRAFT_V1'||!valid(r)||typeof r.objective!=='string'||r.objective.length>2000||typeof detail.historyTruncated!=='boolean'||!Array.isArray(detail.history)||detail.history.some(h=>!Number.isSafeInteger(h.revision)||typeof h.reason!=='string'||typeof h.action!=='string'||!Object.hasOwn(actions,h.action)||h.revision<1||h.revision>r.revision||h.reason.length>500))throw localError(uiLocale.message('تعذر تأكيد إصدار المسودة.'));
   current=r;let item=[...list.querySelectorAll('[data-marketing-draft-id]')].find(b=>b.dataset.marketingDraftId===r.id);if(!item){item=document.createElement('button');item.type='button';item.dataset.marketingDraftId=r.id;list.prepend(item);}uiLocale.setMessage(item, uiLocale.message("{0} · {1} · الإصدار {2}", [r.title, (r.status==='DRAFT' ? uiLocale.message('مسودة') : uiLocale.message('مؤرشفة')), r.revision]));edit.hidden=r.status!=='DRAFT';stateForm.hidden=false;
   edit.elements.title.value=r.title;edit.elements.objective.value=r.objective;for(const o of edit.elements.channels.options)o.selected=r.channels.includes(o.value);edit.elements.reason.value='';stateForm.reset();
   uiLocale.setMessage(box.querySelector('[data-marketing-transition]'), (r.status==='DRAFT' ? uiLocale.message('أرشفة المسودة') : uiLocale.message('استعادة المسودة للتحرير')));history.replaceChildren();
   const title=document.createElement('h5');uiLocale.setMessage(title, uiLocale.message('تاريخ إصدارات المسودة'));history.appendChild(title);
   for(const h of detail.history){const p=document.createElement('p');uiLocale.setMessage(p, uiLocale.message("الإصدار {0} · {1} · {2}", [h.revision, (value=>value===undefined?value:uiLocale.message(value))(actions[h.action]), h.reason]));history.appendChild(p);}
   if(detail.historyTruncated){const p=document.createElement('p');uiLocale.setMessage(p, uiLocale.message('يُعرض أحدث 50 إصدارًا؛ الإصدارات الأقدم محفوظة.'));history.appendChild(p);}
  }
  function content(form){return {title:form.elements.title.value.trim(),objective:form.elements.objective.value.trim(),channels:[...form.elements.channels.selectedOptions].map(o=>o.value).sort()};}
  async function operation(work){if(busy||!eligible())return;const v=++epoch,s=auth().getSessionVersion?.();busy=true;lock();try{if(await authorize(v,s))await work(v,s);}catch(e){if(same(v,s))uiLocale.setMessage(feedback, (localErrorMessage(e) || uiLocale.message('تعذر إكمال الإجراء.')));}finally{if(v===epoch){busy=false;lock();}}}
  async function load(append=false){return operation(async(v,s)=>{
   const payload=await call(append?'?cursor='+encodeURIComponent(nextCursor):'',{},v,s);if(!payload)return;
   if(payload.schemaVersion!==1||payload.policy!=='MARKETING_CAMPAIGN_DRAFT_V1'||!Array.isArray(payload.items)||payload.items.length>50||payload.items.some(r=>!valid(r))||typeof payload.hasMore!=='boolean'||(payload.hasMore&&typeof payload.nextCursor!=='string'))throw localError(uiLocale.message('تعذر تأكيد قائمة المسودات.'));
   if(!append){list.replaceChildren();history.replaceChildren();current=null;edit.hidden=stateForm.hidden=true;}ownerLoaded=true;create.hidden=false;nextCursor=payload.hasMore?payload.nextCursor:null;
   for(const r of payload.items){const button=document.createElement('button');button.type='button';button.dataset.marketingDraftId=r.id;uiLocale.setMessage(button, uiLocale.message("{0} · {1} · الإصدار {2}", [r.title, (r.status==='DRAFT' ? uiLocale.message('مسودة') : uiLocale.message('مؤرشفة')), r.revision]));list.appendChild(button);}
   uiLocale.setMessage(feedback, (payload.items.length ? uiLocale.message('تم تحميل مسودات الحملات.') : uiLocale.message('لا توجد مسودات حملات مسجلة في هذا النطاق.')));
  });}
  list.addEventListener('click',event=>{const button=event.target.closest('[data-marketing-draft-id]');if(!button)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(button.dataset.marketingDraftId),{},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('تم تحميل الإصدار الحالي للمسودة.'));}});});
  create.addEventListener('submit',event=>{event.preventDefault();if(!ownerLoaded)return;void operation(async(v,s)=>{const c=content(create),snapshot=JSON.stringify(c);if(snapshot!==requestContent){requestKey=crypto.randomUUID();requestContent=snapshot;}const d=await call('',{method:'POST',body:JSON.stringify({...c,requestKey}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);create.reset();requestKey=requestContent=null;uiLocale.setMessage(feedback, uiLocale.message('حُفظت مسودة التخطيط؛ لم يُنشر أو يُرسل محتوى.'));}});});
  edit.addEventListener('submit',event=>{event.preventDefault();if(!current)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(current.id),{method:'PATCH',body:JSON.stringify({...content(edit),expectedRevision:current.revision,reason:edit.elements.reason.value.trim()}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('حُفظ إصدار جديد للمسودة.'));}});});
  stateForm.addEventListener('submit',event=>{event.preventDefault();if(!current)return;void operation(async(v,s)=>{const d=await call('/'+encodeURIComponent(current.id)+(current.status==='DRAFT'?'/archive':'/restore'),{method:'POST',body:JSON.stringify({expectedRevision:current.revision,reason:stateForm.elements.reason.value.trim(),confirmed:stateForm.elements.confirmed.checked}),headers:{'content-type':'application/json'}},v,s);if(d){selected(d);uiLocale.setMessage(feedback, uiLocale.message('حُفظت حالة المسودة وإصدارها الجديد.'));}});});
  box.querySelector('[data-marketing-refresh]').addEventListener('click',()=>void load());older.addEventListener('click',()=>{if(nextCursor)void load(true);});
  box.addEventListener('toggle',()=>{if(box.open)void load();else clear();});
  document.addEventListener('hydroland:workspace-selected',e=>{if(e.detail?.target!==host)clear();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.()||!access()?.roleAllowed?.('admin'))clear();});
  window.HydrolandMarketingDrafts={clear};return true;
 };
 if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
