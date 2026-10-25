/* Explicit recognized-catalog version completion inside the existing form library.
 * No startup writes, external-center provisioning or completed records.
 */
(() => {
  'use strict';
  if (window.HydrolandFormCompletion) return;
  const dialog = document.getElementById('hl-form-library');
  if (!dialog) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host = document.createElement('section');
  host.className = 'hfl-history'; host.dataset.hflCompletion = ''; host.hidden = true;
  host.setAttribute('aria-label', 'استكمال محتوى النماذج الإدارية');
  const choices = dialog.querySelector('[data-hfl-department]');
  host.innerHTML = `<h3>استكمال محتوى النماذج الإدارية</h3>
    <p>حقول إضافية للقوالب العامة وعائلات مستندات مستخلصة من أدلة الإدارات v1 المعدّة للمراجعة. تُحفظ التغييرات بإصدارات جديدة؛ المستندات السابقة تبقى مرتبطة بإصداراتها. التعارضات والتعديلات المخصصة تتطلب مراجعة منفصلة. إكمال الكتالوج لا يعتمد إجراءً أو يغلق إدارة.</p>
    <label>نطاق الاستكمال<select data-completion-scope>${choices?.innerHTML || '<option value="">كل الإدارات</option>'}</select></label>
    <button type="button" data-completion-preview>معاينة المحتوى والإصدارات المقترحة</button>
    <p data-completion-status role="status" aria-live="polite"></p>
    <div data-completion-plan hidden><p data-completion-summary></p><div style="max-height:280px;overflow:auto"><ul data-completion-items></ul></div>
      <label class="hfl-check"><input type="checkbox" data-completion-confirm> راجعت الحقول والنطاق وأوافق على إنشاء القوالب الجديدة وترقية التعريفات الأصلية المعروفة بإصدارات جديدة، مع حفظ المستندات السابقة.</label>
      <button type="button" data-completion-apply disabled>حفظ إصدارات المحتوى في المكتبة</button>
    </div>`;
  dialog.querySelector('.hfl-toolbar')?.after(host);
  const $ = selector => host.querySelector(selector);
  const allowedDepartments = new Set([...$('[data-completion-scope]').options].map(o => o.value).filter(Boolean));
  const statusLabels = {CREATE:'قالب جديد',UPGRADE:'إصدار جديد',READY:'محتواه مطابق — دون تعديل',INACTIVE:'غير نشط — لن يُفعّل',CONFLICT:'تعارض — يحتاج مراجعة',EDITED:'تعديل مخصص — يحتاج مراجعة'};
  const state = {generation:0, owner:false, busy:false, plan:null, controller:null};
  const auth = () => window.HydrolandAuth;
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const context = () => ({generation:state.generation, session:auth()?.getSessionVersion?.(), organizationId:selectedOrg(), department:$('[data-completion-scope]').value || 'ALL'});
  const current = c => dialog.open && auth()?.isAuthenticated?.() && c.generation === state.generation && c.session === auth()?.getSessionVersion?.() && c.organizationId === selectedOrg() && c.department === ($('[data-completion-scope]').value || 'ALL');
  const note = text => { $('[data-completion-status]').textContent = text; };
  function controls() {
    $('[data-completion-scope]').disabled = state.busy;
    $('[data-completion-preview]').disabled = state.busy || !state.owner;
    $('[data-completion-confirm]').disabled = state.busy || !state.plan || !(state.plan.summary.create+state.plan.summary.upgrade) || Boolean(state.plan.summary.conflict||state.plan.summary.edited);
    $('[data-completion-apply]').disabled = state.busy || !state.owner || !state.plan || !(state.plan.summary.create+state.plan.summary.upgrade) || Boolean(state.plan.summary.conflict||state.plan.summary.edited) || !$('[data-completion-confirm]').checked;
  }
  function invalidatePlan() {
    state.plan = null; $('[data-completion-confirm]').checked = false;
    $('[data-completion-plan]').hidden = true; $('[data-completion-items]').replaceChildren(); $('[data-completion-summary]').textContent = ''; controls();
  }
  function reset() {
    state.generation++; state.controller?.abort(); state.controller=null;
    state.owner=false;state.busy=false;host.hidden=true;invalidatePlan();note('');
  }
  async function request(c, url, init={}) {
    if(!current(c))throw new Error('تغير سياق المكتبة؛ أعد فتحها.');
    const controller=new AbortController(); state.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),30000);
    try {
      const response=await auth().authorizedFetch(url,{cache:'no-store',...init,signal:controller.signal});
      const body=await response.json().catch(()=>null);
      if(!current(c))throw new Error('تغير سياق المكتبة.');
      if(!response.ok){
        if([401,403].includes(response.status)){reset();window.HydrolandFormLibrary?.clear?.();}
        throw new Error(Array.isArray(body?.message)?body.message.join('، '):body?.message||'تعذر استكمال النماذج.');
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
    if(!body||body.organizationId!==c.organizationId||body.department!==c.department||typeof body.revision!=='string'||body.sourceStatus!=='PREPARED_FOR_REVIEW'||body.sourcePack!=='HYDROLAND_14_Department_Handbooks_v1'||!/^[a-f0-9]{64}$/.test(body.planHash)||body.existingDocumentsPreserved!==true||body.specializedContractsIncluded!==false||body.completeDocumentInventoryVerified!==false||!Array.isArray(body.items)||body.items.length>300)throw new Error('تعذر التحقق من خطة الاستكمال؛ لم يُحفظ شيء.');
    const counts={source:body.items.length,create:0,upgrade:0,ready:0,inactive:0,conflict:0,edited:0},codes=new Set();
    for(const item of body.items){
      if(!item||typeof item.code!=='string'||!item.code||codes.has(item.code)||item.code.startsWith('CLIB-')||typeof item.titleAr!=='string'||!allowedDepartments.has(item.department)||(c.department!=='ALL'&&item.department!==c.department)||!Object.hasOwn(statusLabels,item.status))throw new Error('قائمة الاستكمال غير متسقة.');
      if(!Array.isArray(item.fields)||item.fields.length<1||item.fields.length>100||item.fields.some(f=>!f||typeof f.key!=='string'||typeof f.labelAr!=='string'||typeof f.labelEn!=='string'||typeof f.required!=='boolean'||typeof f.type!=='string'))throw new Error('حقول المحتوى غير متسقة.');
      codes.add(item.code);counts[{CREATE:'create',UPGRADE:'upgrade',READY:'ready',INACTIVE:'inactive',CONFLICT:'conflict',EDITED:'edited'}[item.status]]++;
    }
    if(Object.entries(counts).some(([key,value])=>body.summary?.[key]!==value))throw new Error('أعداد الاستكمال غير متسقة.');
  }
  function renderPlan() {
    const p=state.plan,s=p.summary;
    $('[data-completion-summary]').textContent=`النطاق: ${$('[data-completion-scope]').selectedOptions[0].textContent} · ${s.source} نوعًا في الكتالوج · ${s.ready} مطابقًا · ${s.create} جديدًا · ${s.upgrade} ترقية إصدار · ${s.inactive} غير نشط · ${s.conflict+s.edited} يحتاج مراجعة. الإصدار: ${p.revision}؛ مصدر معدّ للمراجعة.`;
    $('[data-completion-items]').innerHTML=p.items.map(t=>`<li><b>${esc(t.titleAr)}</b> — ${esc(statusLabels[t.status])} <small dir="ltr">${esc(t.code)}</small><details><summary>مراجعة الحقول (${t.fields.length})</summary><p>${esc(t.guidance?.family||t.guidance?.preparationAr||'')}</p><ul>${t.fields.map(f=>`<li>${esc(f.labelAr)} — ${esc(f.type)} ${f.required?'إلزامي':'اختياري'} <small dir="ltr">${esc(f.key)}</small></li>`).join('')}</ul><p>${esc(t.guidance?.executionBoundaryAr||'')}</p></details></li>`).join('');
    $('[data-completion-plan]').hidden=false;controls();
  }
  $('[data-completion-scope]').addEventListener('change',()=>{state.generation++;state.controller?.abort();state.controller=null;state.busy=false;invalidatePlan();note('أعد المعاينة لاعتماد النطاق الجديد.');});
  $('[data-completion-confirm]').addEventListener('change',controls);
  $('[data-completion-preview]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!dialog.open)return;
    invalidatePlan();state.busy=true;controls();const c=context();note('جارٍ مقارنة المحتوى والإصدارات دون أي تغيير…');
    try{
      const p=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-completion?department=${encodeURIComponent(c.department)}`);
      if(!current(c))return;validatePlan(p,c);state.plan=p;renderPlan();
      note((p.summary.conflict||p.summary.edited)?'توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.':(p.summary.create+p.summary.upgrade)?'راجع القائمة ثم أكّد الحفظ.':'المحتوى مطابق في هذا النطاق. غير النشطة تبقى دون تفعيل.');
    }catch(error){if(current(c)){invalidatePlan();note(error.message||'تعذر قراءة خطة الاستكمال.');}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  function hasDocumentInput(){const f=document.querySelector('#hl-documents [data-doc-form]');return Boolean(f&&([...f.querySelectorAll('[data-doc-fields] input,[data-doc-fields] select,[data-doc-fields] textarea')].some(e=>e.type==='checkbox'?e.checked:Boolean(e.value))||f.querySelector('[data-doc-template]')?.disabled));}
  $('[data-completion-apply]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!state.plan||!$('[data-completion-confirm]').checked||!(state.plan.summary.create+state.plan.summary.upgrade)||(state.plan.summary.conflict||state.plan.summary.edited))return;
    const c=context(),plan=state.plan;state.busy=true;controls();note('جارٍ حفظ إصدارات المحتوى…');let saved=false;
    try{
      const result=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-completion`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({department:c.department,expectedPlanHash:plan.planHash,confirmed:true})});
      if(!current(c))return;
      const wanted=plan.items.filter(t=>t.status==='CREATE').map(t=>t.code).sort(), upgraded=plan.items.filter(t=>t.status==='UPGRADE').map(t=>t.code).sort();
      if(!result||result.organizationId!==c.organizationId||result.department!==c.department||result.revision!==plan.revision||result.created!==wanted.length||result.upgraded!==upgraded.length||!Array.isArray(result.upgradedCodes)||JSON.stringify([...result.upgradedCodes].sort())!==JSON.stringify(upgraded)||result.existingDocumentsPreserved!==true||result.specializedContractsIncluded!==false||!Array.isArray(result.createdCodes)||JSON.stringify([...result.createdCodes].sort())!==JSON.stringify(wanted))throw new Error('لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.');
      saved=true;invalidatePlan();document.dispatchEvent(new CustomEvent('hydroland:form-template-published'));
      await window.HydrolandFormLibrary?.checkForUpdates?.();if(!current(c))return;
      const retainedInput=hasDocumentInput();
      if(!retainedInput)await window.HydrolandDocuments?.refresh?.();if(!current(c))return;
      note(`أُنشئ ${result.created} قالبًا ورُقّي ${result.upgraded} قالبًا بإصدارات جديدة؛ المستندات السابقة والعقود محفوظة. ${retainedInput?'مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.':'تم تحديث المكتبة وحصر المستندات.'} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.`);
    }catch(error){if(current(c)){invalidatePlan();note(`${saved?'تم الحفظ لكن تحديث العرض لم يكتمل: ':'تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: '}${error.message||'خطأ غير متوقع.'}`);}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  new MutationObserver(()=>{reset();if(dialog.open)void authorize();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('change',event=>{if(event.target.matches?.('#hl-documents [data-doc-org]')){reset();if(dialog.open)void authorize();}});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,reset);
  window.HydrolandFormCompletion={clear:reset};
  if(dialog.open)void authorize();
})();
