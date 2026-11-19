/* Add-only internal catalog setup inside the existing form library.
 * No startup writes, external-center provisioning or completed records.
 */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("form-setup", {
  "تهيئة النماذج الإدارية الناقصة": "Set up missing administrative templates",
  "حفظ قوالب فارغة من الكتالوج الحالي فقط. تبقى النماذج الموجودة وغير النشطة والعقود والمستندات السابقة دون تعديل. لا تُنشأ موافقات أو سجلات عمل مكتملة، ولا يعني ذلك اكتمال إجراءات الإدارات.": "Save empty templates from the current catalog only. Existing/inactive templates, contracts and prior documents remain unchanged. No approvals or completed business records are created; this does not establish completed department procedures.",
  "نطاق التهيئة": "Setup scope",
  "معاينة النماذج الناقصة": "Preview missing templates",
  "راجعت النطاق والقائمة وأوافق على إنشاء القوالب الناقصة فقط دون تغيير الموجود.": "I have reviewed the scope and list and agree to create missing templates only, leaving existing ones unchanged.",
  "حفظ النماذج الناقصة في المكتبة": "Save missing templates to library",
  "كل الإدارات": "All departments",
  "سيُنشأ": "Will be created",
  "محفوظ — دون تعديل": "Saved — unchanged",
  "غير نشط — لن يُفعّل": "Inactive — will not be activated",
  "تعارض — يحتاج مراجعة": "Conflict — review required",
  "تغير سياق المكتبة؛ أعد فتحها.": "Library context changed. Reopen it.",
  "تغير سياق المكتبة.": "Library context changed.",
  "تعذر إكمال تهيئة النماذج.": "Could not complete template setup.",
  "تعذر التحقق من خطة التهيئة؛ لم يُحفظ شيء.": "Could not verify the setup plan. Nothing was saved.",
  "قائمة التهيئة غير متسقة.": "Setup list is inconsistent.",
  "أعداد التهيئة غير متسقة.": "Setup counts are inconsistent.",
  "النطاق:": "Scope:",
  "نوعًا في الكتالوج ·": "types in the catalog ·",
  "محفوظًا ·": "saved ·",
  "ناقصًا ·": "missing ·",
  "غير نشط ·": "inactive ·",
  "تعارضات.": "conflicts.",
  "أعد المعاينة لاعتماد النطاق الجديد.": "Preview again to confirm the new scope.",
  "جارٍ حصر النماذج الناقصة دون أي تغيير…": "Identifying missing templates without changes…",
  "توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.": "Conflicts exist. The batch cannot be saved until they are resolved.",
  "راجع القائمة ثم أكّد الحفظ.": "Review the list, then confirm saving.",
  "لا توجد قوالب ناقصة في هذا النطاق. غير النشطة تبقى دون تفعيل.": "No templates are missing in this scope. Inactive templates remain inactive.",
  "تعذر قراءة خطة التهيئة.": "Could not read setup plan.",
  "جارٍ حفظ النماذج الناقصة…": "Saving missing templates…",
  "لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.": "The response did not confirm the expected result. Recheck the inventory before retrying.",
  "حُفظ": "Saved",
  "قالبًا فارغًا؛ لم يُعدّل أي نموذج سابق أو عقد أو مستند.": "empty templates. No existing template, contract or document was changed.",
  "لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.": "Saving does not approve form content or establish completed procedures.",
  "مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.": "Your unsaved entries remain. Refresh the document inventory after completing them.",
  "تم تحديث المكتبة وحصر المستندات.": "Library and document inventory refreshed.",
  "تم الحفظ لكن تحديث العرض لم يكتمل:": "Saved, but the view did not finish updating:",
  "تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة:": "Could not confirm completion. Recheck the inventory before retrying:",
  "خطأ غير متوقع.": "Unexpected error.",
  "النطاق: {0} · {1} نوعًا في الكتالوج · {2} محفوظًا · {3} ناقصًا · {4} غير نشط · {5} تعارضات.": "Scope: {0} · {1} types in the catalog · {2} saved · {3} missing · {4} inactive · {5} conflicts.",
  "حُفظ {0} قالبًا فارغًا؛ لم يُعدّل أي نموذج سابق أو عقد أو مستند. {1} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.": "Saved {0} empty templates. No existing template, contract or document was changed. {1} Saving does not approve form content or establish completed procedures.",
  "{0}{1}": "{0}{1}",
  "تم الحفظ لكن تحديث العرض لم يكتمل: ": "Saved, but the view did not finish updating: ",
  "تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: ": "Could not confirm completion. Recheck the inventory before retrying: "
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if (window.HydrolandFormSetup) return;
  const dialog = document.getElementById('hl-form-library');
  if (!dialog) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host = document.createElement('section');
  host.className = 'hfl-history'; host.dataset.hflSetup = ''; host.hidden = true;
  uiLocale.setAttribute(host, "aria-label", 'تهيئة النماذج الإدارية الناقصة');
  const choices = dialog.querySelector('[data-hfl-department]');
  uiLocale.setHTML(host, uiLocale.html`<h3>تهيئة النماذج الإدارية الناقصة</h3>
    <p>حفظ قوالب فارغة من الكتالوج الحالي فقط. تبقى النماذج الموجودة وغير النشطة والعقود والمستندات السابقة دون تعديل. لا تُنشأ موافقات أو سجلات عمل مكتملة، ولا يعني ذلك اكتمال إجراءات الإدارات.</p>
    <label>نطاق التهيئة<select data-setup-scope>${choices?.innerHTML || uiLocale.html`<option value="">كل الإدارات</option>`}</select></label>
    <button type="button" data-setup-preview>معاينة النماذج الناقصة</button>
    <p data-setup-status role="status" aria-live="polite"></p>
    <div data-setup-plan hidden><p data-setup-summary></p><div style="max-height:280px;overflow:auto"><ul data-setup-items></ul></div>
      <label class="hfl-check"><input type="checkbox" data-setup-confirm> راجعت النطاق والقائمة وأوافق على إنشاء القوالب الناقصة فقط دون تغيير الموجود.</label>
      <button type="button" data-setup-apply disabled>حفظ النماذج الناقصة في المكتبة</button>
    </div>`);
  dialog.querySelector('.hfl-toolbar')?.after(host);
  const $ = selector => host.querySelector(selector);
  const allowedDepartments = new Set([...$('[data-setup-scope]').options].map(o => o.value).filter(Boolean));
  const statusLabels = {MISSING:'سيُنشأ',READY:'محفوظ — دون تعديل',INACTIVE:'غير نشط — لن يُفعّل',CONFLICT:'تعارض — يحتاج مراجعة'};
  const state = {generation:0, owner:false, busy:false, plan:null, controller:null};
  const auth = () => window.HydrolandAuth;
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const context = () => ({generation:state.generation, session:auth()?.getSessionVersion?.(), organizationId:selectedOrg(), department:$('[data-setup-scope]').value || 'ALL'});
  const current = c => dialog.open && auth()?.isAuthenticated?.() && c.generation === state.generation && c.session === auth()?.getSessionVersion?.() && c.organizationId === selectedOrg() && c.department === ($('[data-setup-scope]').value || 'ALL');
  const note = text => { uiLocale.setMessage($('[data-setup-status]'), text); };
  function controls() {
    $('[data-setup-scope]').disabled = state.busy;
    $('[data-setup-preview]').disabled = state.busy || !state.owner;
    $('[data-setup-confirm]').disabled = state.busy || !state.plan || !state.plan.summary.missing || Boolean(state.plan.summary.conflicts);
    $('[data-setup-apply]').disabled = state.busy || !state.owner || !state.plan || !state.plan.summary.missing || Boolean(state.plan.summary.conflicts) || !$('[data-setup-confirm]').checked;
  }
  function invalidatePlan() {
    state.plan = null; $('[data-setup-confirm]').checked = false;
    $('[data-setup-plan]').hidden = true; $('[data-setup-items]').replaceChildren(); uiLocale.setMessage($('[data-setup-summary]'), ''); controls();
  }
  function reset() {
    state.generation++; state.controller?.abort(); state.controller=null;
    state.owner=false;state.busy=false;host.hidden=true;invalidatePlan();note('');
  }
  async function request(c, url, init={}) {
    if(!current(c))throw localError(uiLocale.message('تغير سياق المكتبة؛ أعد فتحها.'));
    const controller=new AbortController(); state.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),30000);
    try {
      const response=await auth().authorizedFetch(url,{cache:'no-store',...init,signal:controller.signal});
      const body=await response.json().catch(()=>null);
      if(!current(c))throw localError(uiLocale.message('تغير سياق المكتبة.'));
      if(!response.ok){
        if([401,403].includes(response.status)){reset();window.HydrolandFormLibrary?.clear?.();}
        throw localError((Array.isArray(body?.message) ? body.message.join('، ') : (body?.message || uiLocale.message('تعذر إكمال تهيئة النماذج.'))));
      }
      return body;
    } finally {clearTimeout(timeout);if(state.controller===controller)state.controller=null;}
  }
  async function authorize() {
    if(!dialog.open||!auth()?.isAuthenticated?.()||!selectedOrg())return;
    const c=context();state.busy=true;controls();
    try{
      const memberships=await request(c,'/documents/workspace');if(!current(c))return;
      state.owner=Array.isArray(memberships)&&memberships.some(m=>m.status==='ACTIVE'&&m.role==='OWNER'&&m.organization?.id===c.organizationId&&m.organization.kind==='HYDROLAND_INTERNAL_PLATFORM');
      host.hidden=!state.owner;
    }catch(error){if(current(c)){host.hidden=true;state.owner=false;}}
    finally{if(current(c)){state.busy=false;controls();}}
  }
  function validatePlan(body,c) {
    if(!body||body.organizationId!==c.organizationId||body.department!==c.department||!/^[a-f0-9]{64}$/.test(body.planHash)||body.emptyTemplatesOnly!==true||body.specializedContractsIncluded!==false||body.completeDocumentInventoryVerified!==false||!Array.isArray(body.items)||body.items.length>100)throw localError(uiLocale.message('تعذر التحقق من خطة التهيئة؛ لم يُحفظ شيء.'));
    const counts={source:body.items.length,missing:0,ready:0,inactive:0,conflicts:0},codes=new Set();
    for(const item of body.items){
      if(!item||typeof item.code!=='string'||!item.code||codes.has(item.code)||item.code.startsWith('CLIB-')||typeof item.titleAr!=='string'||!allowedDepartments.has(item.department)||(c.department!=='ALL'&&item.department!==c.department)||!Object.hasOwn(statusLabels,item.status))throw localError(uiLocale.message('قائمة التهيئة غير متسقة.'));
      codes.add(item.code);counts[{MISSING:'missing',READY:'ready',INACTIVE:'inactive',CONFLICT:'conflicts'}[item.status]]++;
    }
    if(Object.entries(counts).some(([key,value])=>body.summary?.[key]!==value))throw localError(uiLocale.message('أعداد التهيئة غير متسقة.'));
  }
  function renderPlan() {
    const p=state.plan,s=p.summary;
    uiLocale.setMessage($('[data-setup-summary]'), uiLocale.message("النطاق: {0} · {1} نوعًا في الكتالوج · {2} محفوظًا · {3} ناقصًا · {4} غير نشط · {5} تعارضات.", [$('[data-setup-scope]').selectedOptions[0].textContent, s.source, s.ready, s.missing, s.inactive, s.conflicts]));
    uiLocale.setHTML($('[data-setup-items]'), p.items.map(t=>uiLocale.html`<li><b>${esc(t.titleAr)}</b> — ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(statusLabels[t.status]))} <small dir="ltr">${esc(t.code)}</small></li>`).join(''));
    $('[data-setup-plan]').hidden=false;controls();
  }
  $('[data-setup-scope]').addEventListener('change',()=>{state.generation++;state.controller?.abort();state.controller=null;state.busy=false;invalidatePlan();note(uiLocale.message('أعد المعاينة لاعتماد النطاق الجديد.'));});
  $('[data-setup-confirm]').addEventListener('change',controls);
  $('[data-setup-preview]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!dialog.open)return;
    invalidatePlan();state.busy=true;controls();const c=context();note(uiLocale.message('جارٍ حصر النماذج الناقصة دون أي تغيير…'));
    try{
      const p=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-setup?department=${encodeURIComponent(c.department)}`);
      if(!current(c))return;validatePlan(p,c);state.plan=p;renderPlan();
      note((p.summary.conflicts ? uiLocale.message('توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.') : (p.summary.missing ? uiLocale.message('راجع القائمة ثم أكّد الحفظ.') : uiLocale.message('لا توجد قوالب ناقصة في هذا النطاق. غير النشطة تبقى دون تفعيل.'))));
    }catch(error){if(current(c)){invalidatePlan();note((localErrorMessage(error) || uiLocale.message('تعذر قراءة خطة التهيئة.')));}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  function hasDocumentInput(){const f=document.querySelector('#hl-documents [data-doc-form]');return Boolean(f&&([...f.querySelectorAll('[data-doc-fields] input,[data-doc-fields] select,[data-doc-fields] textarea')].some(e=>e.type==='checkbox'?e.checked:Boolean(e.value))||f.querySelector('[data-doc-template]')?.disabled));}
  $('[data-setup-apply]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!state.plan||!$('[data-setup-confirm]').checked||!state.plan.summary.missing||state.plan.summary.conflicts)return;
    const c=context(),plan=state.plan;state.busy=true;controls();note(uiLocale.message('جارٍ حفظ النماذج الناقصة…'));let saved=false;
    try{
      const result=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-setup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({department:c.department,expectedPlanHash:plan.planHash,confirmed:true})});
      if(!current(c))return;
      const wanted=plan.items.filter(t=>t.status==='MISSING').map(t=>t.code).sort();
      if(!result||result.organizationId!==c.organizationId||result.department!==c.department||result.created!==wanted.length||result.emptyTemplatesOnly!==true||result.specializedContractsIncluded!==false||!Array.isArray(result.createdCodes)||JSON.stringify([...result.createdCodes].sort())!==JSON.stringify(wanted))throw localError(uiLocale.message('لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.'));
      saved=true;invalidatePlan();document.dispatchEvent(new CustomEvent('hydroland:form-template-published'));
      await window.HydrolandFormLibrary?.checkForUpdates?.();if(!current(c))return;
      const retainedInput=hasDocumentInput();
      if(!retainedInput)await window.HydrolandDocuments?.refresh?.();if(!current(c))return;
      note(uiLocale.message("حُفظ {0} قالبًا فارغًا؛ لم يُعدّل أي نموذج سابق أو عقد أو مستند. {1} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.", [result.created, (retainedInput ? uiLocale.message('مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.') : uiLocale.message('تم تحديث المكتبة وحصر المستندات.'))]));
    }catch(error){if(current(c)){invalidatePlan();note(uiLocale.message("{0}{1}", [(saved ? uiLocale.message('تم الحفظ لكن تحديث العرض لم يكتمل: ') : uiLocale.message('تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: ')), (localErrorMessage(error) || uiLocale.message('خطأ غير متوقع.'))]));}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  new MutationObserver(()=>{reset();if(dialog.open)void authorize();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('change',event=>{if(event.target.matches?.('#hl-documents [data-doc-org]')){reset();if(dialog.open)void authorize();}});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,reset);
  window.HydrolandFormSetup={clear:reset};
  if(dialog.open)void authorize();
})();
