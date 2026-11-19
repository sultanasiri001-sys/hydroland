/* Explicit recognized-catalog version completion inside the existing form library.
 * No startup writes, external-center provisioning or completed records.
 */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("form-completion", {
  "استكمال محتوى النماذج الإدارية": "Complete administrative form content",
  "توسعة النماذج الحالية واستحداث النواقص وفق مهام الإدارات الأربع عشرة والأقسام الثلاثة والثمانين، بالهيكلة والهوية البصرية المعتمدة نفسها. تُحفظ التغييرات بإصدارات جديدة؛ المستندات السابقة تبقى مرتبطة بإصداراتها. التعارضات والتعديلات المخصصة تتطلب مراجعة منفصلة. إكمال الكتالوج لا يعتمد إجراءً أو يغلق إدارة.": "Expand existing forms and add missing ones for the fourteen departments and eighty-three sections, retaining the approved structure and visual identity. Changes are saved as new versions; existing documents retain their versions. Conflicts and custom changes require separate review. Completing the catalog does not approve an action or close a department.",
  "نطاق الاستكمال": "Completion scope",
  "معاينة المحتوى والإصدارات المقترحة": "Preview proposed content and versions",
  "راجعت الحقول والنطاق وأوافق على إنشاء القوالب الجديدة وترقية التعريفات الأصلية المعروفة بإصدارات جديدة، مع حفظ المستندات السابقة.": "I have reviewed the fields and scope and agree to create new templates and upgrade recognized original definitions as new versions, retaining existing documents.",
  "حفظ إصدارات المحتوى في المكتبة": "Save content versions in the library",
  "كل الإدارات": "All departments",
  "قالب جديد": "New template",
  "إصدار جديد": "New version",
  "محتواه مطابق — دون تعديل": "Matching content — unchanged",
  "غير نشط — لن يُفعّل": "Inactive — will not be activated",
  "تعارض — يحتاج مراجعة": "Conflict — review required",
  "تعديل مخصص — يحتاج مراجعة": "Custom change — review required",
  "تغير سياق المكتبة؛ أعد فتحها.": "Library context changed. Reopen it.",
  "تغير سياق المكتبة.": "Library context changed.",
  "تعذر استكمال النماذج.": "Could not complete templates.",
  "تعذر التحقق من خطة الاستكمال؛ لم يُحفظ شيء.": "Could not verify the completion plan. Nothing was saved.",
  "قائمة الاستكمال غير متسقة.": "Completion list is inconsistent.",
  "حقول المحتوى غير متسقة.": "Content fields are inconsistent.",
  "أعداد الاستكمال غير متسقة.": "Completion counts are inconsistent.",
  "النطاق:": "Scope:",
  "نوعًا في الكتالوج ·": "types in the catalog ·",
  "مطابقًا ·": "matching ·",
  "جديدًا ·": "new ·",
  "ترقية إصدار ·": "version upgrades ·",
  "غير نشط ·": "inactive ·",
  "يحتاج مراجعة. الإصدار:": "requiring review. Version:",
  "؛ مصدر معدّ للمراجعة.": "; source prepared for review.",
  "مراجعة الحقول (": "Review fields (",
  "القسم المسؤول:": "Responsible section:",
  "إلزامي": "Required",
  "اختياري": "Optional",
  "— الأعمدة:": "— Columns:",
  "أعد المعاينة لاعتماد النطاق الجديد.": "Preview again to confirm the new scope.",
  "جارٍ مقارنة المحتوى والإصدارات دون أي تغيير…": "Comparing content and versions without changes…",
  "توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.": "Conflicts exist. The batch cannot be saved until they are resolved.",
  "راجع القائمة ثم أكّد الحفظ.": "Review the list, then confirm saving.",
  "المحتوى مطابق في هذا النطاق. غير النشطة تبقى دون تفعيل.": "Content matches in this scope. Inactive templates remain inactive.",
  "تعذر قراءة خطة الاستكمال.": "Could not read the completion plan.",
  "جارٍ حفظ إصدارات المحتوى…": "Saving content versions…",
  "لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.": "The response did not confirm the expected result. Recheck the inventory before retrying.",
  "أُنشئ": "Created",
  "قالبًا ورُقّي": "templates and upgraded",
  "قالبًا بإصدارات جديدة؛ المستندات السابقة والعقود محفوظة.": "templates to new versions. Existing documents and contracts are retained.",
  "لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.": "Saving does not approve form content or establish completed procedures.",
  "مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.": "Your unsaved entries remain. Refresh the document inventory after completing them.",
  "تم تحديث المكتبة وحصر المستندات.": "Library and document inventory refreshed.",
  "تم الحفظ لكن تحديث العرض لم يكتمل:": "Saved, but the view did not finish updating:",
  "تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة:": "Could not confirm completion. Recheck the inventory before retrying:",
  "خطأ غير متوقع.": "Unexpected error.",
  "النطاق: {0} · {1} نوعًا في الكتالوج · {2} مطابقًا · {3} جديدًا · {4} ترقية إصدار · {5} غير نشط · {6} يحتاج مراجعة. الإصدار: {7}؛ مصدر معدّ للمراجعة.": "Scope: {0} · {1} types in the catalog · {2} matching · {3} new · {4} version upgrades · {5} inactive · {6} requiring review. Version: {7}; source prepared for review.",
  " — الأعمدة: {0}": " — Columns: {0}",
  "أُنشئ {0} قالبًا ورُقّي {1} قالبًا بإصدارات جديدة؛ المستندات السابقة والعقود محفوظة. {2} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.": "Created {0} templates and upgraded {1} templates to new versions. Existing documents and contracts are retained. {2} Saving does not approve form content or establish completed procedures.",
  "{0}{1}": "{0}{1}",
  "تم الحفظ لكن تحديث العرض لم يكتمل: ": "Saved, but the view did not finish updating: ",
  "تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: ": "Could not confirm completion. Recheck the inventory before retrying: "
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if (window.HydrolandFormCompletion) return;
  const dialog = document.getElementById('hl-form-library');
  if (!dialog) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host = document.createElement('section');
  host.className = 'hfl-history'; host.dataset.hflCompletion = ''; host.hidden = true;
  uiLocale.setAttribute(host, "aria-label", 'استكمال محتوى النماذج الإدارية');
  const choices = dialog.querySelector('[data-hfl-department]');
  uiLocale.setHTML(host, uiLocale.html`<h3>استكمال محتوى النماذج الإدارية</h3>
    <p>توسعة النماذج الحالية واستحداث النواقص وفق مهام الإدارات الأربع عشرة والأقسام الثلاثة والثمانين، بالهيكلة والهوية البصرية المعتمدة نفسها. تُحفظ التغييرات بإصدارات جديدة؛ المستندات السابقة تبقى مرتبطة بإصداراتها. التعارضات والتعديلات المخصصة تتطلب مراجعة منفصلة. إكمال الكتالوج لا يعتمد إجراءً أو يغلق إدارة.</p>
    <label>نطاق الاستكمال<select data-completion-scope>${choices?.innerHTML || uiLocale.html`<option value="">كل الإدارات</option>`}</select></label>
    <button type="button" data-completion-preview>معاينة المحتوى والإصدارات المقترحة</button>
    <p data-completion-status role="status" aria-live="polite"></p>
    <div data-completion-plan hidden><p data-completion-summary></p><div style="max-height:280px;overflow:auto"><ul data-completion-items></ul></div>
      <label class="hfl-check"><input type="checkbox" data-completion-confirm> راجعت الحقول والنطاق وأوافق على إنشاء القوالب الجديدة وترقية التعريفات الأصلية المعروفة بإصدارات جديدة، مع حفظ المستندات السابقة.</label>
      <button type="button" data-completion-apply disabled>حفظ إصدارات المحتوى في المكتبة</button>
    </div>`);
  dialog.querySelector('.hfl-toolbar')?.after(host);
  const $ = selector => host.querySelector(selector);
  const allowedDepartments = new Set([...$('[data-completion-scope]').options].map(o => o.value).filter(Boolean));
  const statusLabels = {CREATE:'قالب جديد',UPGRADE:'إصدار جديد',READY:'محتواه مطابق — دون تعديل',INACTIVE:'غير نشط — لن يُفعّل',CONFLICT:'تعارض — يحتاج مراجعة',EDITED:'تعديل مخصص — يحتاج مراجعة'};
  const state = {generation:0, owner:false, busy:false, plan:null, controller:null};
  const auth = () => window.HydrolandAuth;
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const context = () => ({generation:state.generation, session:auth()?.getSessionVersion?.(), organizationId:selectedOrg(), department:$('[data-completion-scope]').value || 'ALL'});
  const current = c => dialog.open && auth()?.isAuthenticated?.() && c.generation === state.generation && c.session === auth()?.getSessionVersion?.() && c.organizationId === selectedOrg() && c.department === ($('[data-completion-scope]').value || 'ALL');
  const note = text => { uiLocale.setMessage($('[data-completion-status]'), text); };
  function controls() {
    $('[data-completion-scope]').disabled = state.busy;
    $('[data-completion-preview]').disabled = state.busy || !state.owner;
    $('[data-completion-confirm]').disabled = state.busy || !state.plan || !(state.plan.summary.create+state.plan.summary.upgrade) || Boolean(state.plan.summary.conflict||state.plan.summary.edited);
    $('[data-completion-apply]').disabled = state.busy || !state.owner || !state.plan || !(state.plan.summary.create+state.plan.summary.upgrade) || Boolean(state.plan.summary.conflict||state.plan.summary.edited) || !$('[data-completion-confirm]').checked;
  }
  function invalidatePlan() {
    state.plan = null; $('[data-completion-confirm]').checked = false;
    $('[data-completion-plan]').hidden = true; $('[data-completion-items]').replaceChildren(); uiLocale.setMessage($('[data-completion-summary]'), ''); controls();
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
        throw localError((Array.isArray(body?.message) ? body.message.join('، ') : (body?.message || uiLocale.message('تعذر استكمال النماذج.'))));
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
    if(!body||body.organizationId!==c.organizationId||body.department!==c.department||typeof body.revision!=='string'||body.sourceStatus!=='PREPARED_FOR_REVIEW'||body.sourcePack!=='HYDROLAND_14_Department_Handbooks_v1'||!/^[a-f0-9]{64}$/.test(body.planHash)||body.existingDocumentsPreserved!==true||body.specializedContractsIncluded!==false||body.completeDocumentInventoryVerified!==false||!Array.isArray(body.items)||body.items.length>300)throw localError(uiLocale.message('تعذر التحقق من خطة الاستكمال؛ لم يُحفظ شيء.'));
    const counts={source:body.items.length,create:0,upgrade:0,ready:0,inactive:0,conflict:0,edited:0},codes=new Set();
    for(const item of body.items){
      if(!item||typeof item.code!=='string'||!item.code||codes.has(item.code)||item.code.startsWith('CLIB-')||typeof item.titleAr!=='string'||!allowedDepartments.has(item.department)||(c.department!=='ALL'&&item.department!==c.department)||!Object.hasOwn(statusLabels,item.status))throw localError(uiLocale.message('قائمة الاستكمال غير متسقة.'));
      if(!Array.isArray(item.fields)||item.fields.length<1||item.fields.length>100||item.fields.some(f=>!f||typeof f.key!=='string'||typeof f.labelAr!=='string'||typeof f.labelEn!=='string'||typeof f.required!=='boolean'||typeof f.type!=='string'))throw localError(uiLocale.message('حقول المحتوى غير متسقة.'));
      codes.add(item.code);counts[{CREATE:'create',UPGRADE:'upgrade',READY:'ready',INACTIVE:'inactive',CONFLICT:'conflict',EDITED:'edited'}[item.status]]++;
    }
    if(Object.entries(counts).some(([key,value])=>body.summary?.[key]!==value))throw localError(uiLocale.message('أعداد الاستكمال غير متسقة.'));
  }
  function renderPlan() {
    const p=state.plan,s=p.summary;
    uiLocale.setMessage($('[data-completion-summary]'), uiLocale.message("النطاق: {0} · {1} نوعًا في الكتالوج · {2} مطابقًا · {3} جديدًا · {4} ترقية إصدار · {5} غير نشط · {6} يحتاج مراجعة. الإصدار: {7}؛ مصدر معدّ للمراجعة.", [$('[data-completion-scope]').selectedOptions[0].textContent, s.source, s.ready, s.create, s.upgrade, s.inactive, s.conflict+s.edited, p.revision]));
    uiLocale.setHTML($('[data-completion-items]'), p.items.map(t=>uiLocale.html`<li><b>${esc(t.titleAr)}</b> — ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(statusLabels[t.status]))} <small dir="ltr">${esc(t.code)}</small><details><summary>مراجعة الحقول (${t.fields.length})</summary><p>${esc(t.guidance?.family||t.guidance?.preparationAr||'')}</p>${t.guidance?.ownerSectionTitleAr?uiLocale.html`<p>القسم المسؤول: ${esc(t.guidance.ownerSectionTitleAr)} · ${esc(t.guidance.ownerSectionCode)}</p>`:''}<ul>${t.fields.map(f=>uiLocale.html`<li>${esc(f.labelAr)} — ${esc(f.type)} ${uiLocale.messageHTML((f.required ? uiLocale.message('إلزامي') : uiLocale.message('اختياري')))}${uiLocale.messageHTML((f.type==='TABLE'&&f.options?.length ? uiLocale.message(" — الأعمدة: {0}", [f.options.join('، ')]) : ''))} <small dir="ltr">${esc(f.key)}</small></li>`).join('')}</ul><p>${esc(t.guidance?.executionBoundaryAr||'')}</p></details></li>`).join(''));
    $('[data-completion-plan]').hidden=false;controls();
  }
  $('[data-completion-scope]').addEventListener('change',()=>{state.generation++;state.controller?.abort();state.controller=null;state.busy=false;invalidatePlan();note(uiLocale.message('أعد المعاينة لاعتماد النطاق الجديد.'));});
  $('[data-completion-confirm]').addEventListener('change',controls);
  $('[data-completion-preview]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!dialog.open)return;
    invalidatePlan();state.busy=true;controls();const c=context();note(uiLocale.message('جارٍ مقارنة المحتوى والإصدارات دون أي تغيير…'));
    try{
      const p=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-completion?department=${encodeURIComponent(c.department)}`);
      if(!current(c))return;validatePlan(p,c);state.plan=p;renderPlan();
      note((p.summary.conflict||p.summary.edited ? uiLocale.message('توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.') : (p.summary.create+p.summary.upgrade ? uiLocale.message('راجع القائمة ثم أكّد الحفظ.') : uiLocale.message('المحتوى مطابق في هذا النطاق. غير النشطة تبقى دون تفعيل.'))));
    }catch(error){if(current(c)){invalidatePlan();note((localErrorMessage(error) || uiLocale.message('تعذر قراءة خطة الاستكمال.')));}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  function hasDocumentInput(){const f=document.querySelector('#hl-documents [data-doc-form]');return Boolean(f&&([...f.querySelectorAll('[data-doc-fields] input,[data-doc-fields] select,[data-doc-fields] textarea')].some(e=>e.type==='checkbox'?e.checked:Boolean(e.value))||f.querySelector('[data-doc-template]')?.disabled));}
  $('[data-completion-apply]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!state.plan||!$('[data-completion-confirm]').checked||!(state.plan.summary.create+state.plan.summary.upgrade)||(state.plan.summary.conflict||state.plan.summary.edited))return;
    const c=context(),plan=state.plan;state.busy=true;controls();note(uiLocale.message('جارٍ حفظ إصدارات المحتوى…'));let saved=false;
    try{
      const result=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-completion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({department:c.department,expectedPlanHash:plan.planHash,confirmed:true})});
      if(!current(c))return;
      const wanted=plan.items.filter(t=>t.status==='CREATE').map(t=>t.code).sort(), upgraded=plan.items.filter(t=>t.status==='UPGRADE').map(t=>t.code).sort();
      if(!result||result.organizationId!==c.organizationId||result.department!==c.department||result.revision!==plan.revision||result.created!==wanted.length||result.upgraded!==upgraded.length||!Array.isArray(result.upgradedCodes)||JSON.stringify([...result.upgradedCodes].sort())!==JSON.stringify(upgraded)||result.existingDocumentsPreserved!==true||result.specializedContractsIncluded!==false||!Array.isArray(result.createdCodes)||JSON.stringify([...result.createdCodes].sort())!==JSON.stringify(wanted))throw localError(uiLocale.message('لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.'));
      saved=true;invalidatePlan();document.dispatchEvent(new CustomEvent('hydroland:form-template-published'));
      await window.HydrolandFormLibrary?.checkForUpdates?.();if(!current(c))return;
      const retainedInput=hasDocumentInput();
      if(!retainedInput)await window.HydrolandDocuments?.refresh?.();if(!current(c))return;
      note(uiLocale.message("أُنشئ {0} قالبًا ورُقّي {1} قالبًا بإصدارات جديدة؛ المستندات السابقة والعقود محفوظة. {2} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.", [result.created, result.upgraded, (retainedInput ? uiLocale.message('مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.') : uiLocale.message('تم تحديث المكتبة وحصر المستندات.'))]));
    }catch(error){if(current(c)){invalidatePlan();note(uiLocale.message("{0}{1}", [(saved ? uiLocale.message('تم الحفظ لكن تحديث العرض لم يكتمل: ') : uiLocale.message('تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: ')), (localErrorMessage(error) || uiLocale.message('خطأ غير متوقع.'))]));}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  new MutationObserver(()=>{reset();if(dialog.open)void authorize();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('change',event=>{if(event.target.matches?.('#hl-documents [data-doc-org]')){reset();if(dialog.open)void authorize();}});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,reset);
  window.HydrolandFormCompletion={clear:reset};
  if(dialog.open)void authorize();
})();
