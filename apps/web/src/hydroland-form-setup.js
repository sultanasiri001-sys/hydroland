/* Add-only internal catalog setup inside the existing form library.
 * No startup writes, external-center provisioning or completed records.
 */
(() => {
  'use strict';
  if (window.HydrolandFormSetup) return;
  const dialog = document.getElementById('hl-form-library');
  if (!dialog) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host = document.createElement('section');
  host.className = 'hfl-history'; host.dataset.hflSetup = ''; host.hidden = true;
  host.setAttribute('aria-label', 'تهيئة النماذج الإدارية الناقصة');
  const choices = dialog.querySelector('[data-hfl-department]');
  host.innerHTML = `<h3>تهيئة النماذج الإدارية الناقصة</h3>
    <p>حفظ قوالب فارغة من الكتالوج الحالي فقط. تبقى النماذج الموجودة وغير النشطة والعقود والمستندات السابقة دون تعديل. لا تُنشأ موافقات أو سجلات عمل مكتملة، ولا يعني ذلك اكتمال إجراءات الإدارات.</p>
    <label>نطاق التهيئة<select data-setup-scope>${choices?.innerHTML || '<option value="">كل الإدارات</option>'}</select></label>
    <button type="button" data-setup-preview>معاينة النماذج الناقصة</button>
    <p data-setup-status role="status" aria-live="polite"></p>
    <div data-setup-plan hidden><p data-setup-summary></p><div style="max-height:280px;overflow:auto"><ul data-setup-items></ul></div>
      <label class="hfl-check"><input type="checkbox" data-setup-confirm> راجعت النطاق والقائمة وأوافق على إنشاء القوالب الناقصة فقط دون تغيير الموجود.</label>
      <button type="button" data-setup-apply disabled>حفظ النماذج الناقصة في المكتبة</button>
    </div>`;
  dialog.querySelector('.hfl-toolbar')?.after(host);
  const $ = selector => host.querySelector(selector);
  const allowedDepartments = new Set([...$('[data-setup-scope]').options].map(o => o.value).filter(Boolean));
  const statusLabels = {MISSING:'سيُنشأ',READY:'محفوظ — دون تعديل',INACTIVE:'غير نشط — لن يُفعّل',CONFLICT:'تعارض — يحتاج مراجعة'};
  const state = {generation:0, owner:false, busy:false, plan:null, controller:null};
  const auth = () => window.HydrolandAuth;
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const context = () => ({generation:state.generation, session:auth()?.getSessionVersion?.(), organizationId:selectedOrg(), department:$('[data-setup-scope]').value || 'ALL'});
  const current = c => dialog.open && auth()?.isAuthenticated?.() && c.generation === state.generation && c.session === auth()?.getSessionVersion?.() && c.organizationId === selectedOrg() && c.department === ($('[data-setup-scope]').value || 'ALL');
  const note = text => { $('[data-setup-status]').textContent = text; };
  function controls() {
    $('[data-setup-scope]').disabled = state.busy;
    $('[data-setup-preview]').disabled = state.busy || !state.owner;
    $('[data-setup-confirm]').disabled = state.busy || !state.plan || !state.plan.summary.missing || Boolean(state.plan.summary.conflicts);
    $('[data-setup-apply]').disabled = state.busy || !state.owner || !state.plan || !state.plan.summary.missing || Boolean(state.plan.summary.conflicts) || !$('[data-setup-confirm]').checked;
  }
  function invalidatePlan() {
    state.plan = null; $('[data-setup-confirm]').checked = false;
    $('[data-setup-plan]').hidden = true; $('[data-setup-items]').replaceChildren(); $('[data-setup-summary]').textContent = ''; controls();
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
        throw new Error(Array.isArray(body?.message)?body.message.join('، '):body?.message||'تعذر إكمال تهيئة النماذج.');
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
    if(!body||body.organizationId!==c.organizationId||body.department!==c.department||!/^[a-f0-9]{64}$/.test(body.planHash)||body.emptyTemplatesOnly!==true||body.specializedContractsIncluded!==false||body.completeDocumentInventoryVerified!==false||!Array.isArray(body.items)||body.items.length>100)throw new Error('تعذر التحقق من خطة التهيئة؛ لم يُحفظ شيء.');
    const counts={source:body.items.length,missing:0,ready:0,inactive:0,conflicts:0},codes=new Set();
    for(const item of body.items){
      if(!item||typeof item.code!=='string'||!item.code||codes.has(item.code)||item.code.startsWith('CLIB-')||typeof item.titleAr!=='string'||!allowedDepartments.has(item.department)||(c.department!=='ALL'&&item.department!==c.department)||!Object.hasOwn(statusLabels,item.status))throw new Error('قائمة التهيئة غير متسقة.');
      codes.add(item.code);counts[{MISSING:'missing',READY:'ready',INACTIVE:'inactive',CONFLICT:'conflicts'}[item.status]]++;
    }
    if(Object.entries(counts).some(([key,value])=>body.summary?.[key]!==value))throw new Error('أعداد التهيئة غير متسقة.');
  }
  function renderPlan() {
    const p=state.plan,s=p.summary;
    $('[data-setup-summary]').textContent=`النطاق: ${$('[data-setup-scope]').selectedOptions[0].textContent} · ${s.source} نوعًا في الكتالوج · ${s.ready} محفوظًا · ${s.missing} ناقصًا · ${s.inactive} غير نشط · ${s.conflicts} تعارضات.`;
    $('[data-setup-items]').innerHTML=p.items.map(t=>`<li><b>${esc(t.titleAr)}</b> — ${esc(statusLabels[t.status])} <small dir="ltr">${esc(t.code)}</small></li>`).join('');
    $('[data-setup-plan]').hidden=false;controls();
  }
  $('[data-setup-scope]').addEventListener('change',()=>{state.generation++;state.controller?.abort();state.controller=null;state.busy=false;invalidatePlan();note('أعد المعاينة لاعتماد النطاق الجديد.');});
  $('[data-setup-confirm]').addEventListener('change',controls);
  $('[data-setup-preview]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!dialog.open)return;
    invalidatePlan();state.busy=true;controls();const c=context();note('جارٍ حصر النماذج الناقصة دون أي تغيير…');
    try{
      const p=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-setup?department=${encodeURIComponent(c.department)}`);
      if(!current(c))return;validatePlan(p,c);state.plan=p;renderPlan();
      note(p.summary.conflicts?'توجد تعارضات؛ لا يمكن حفظ الدفعة قبل معالجتها.':p.summary.missing?'راجع القائمة ثم أكّد الحفظ.':'لا توجد قوالب ناقصة في هذا النطاق. غير النشطة تبقى دون تفعيل.');
    }catch(error){if(current(c)){invalidatePlan();note(error.message||'تعذر قراءة خطة التهيئة.');}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  function hasDocumentInput(){const f=document.querySelector('#hl-documents [data-doc-form]');return Boolean(f&&([...f.querySelectorAll('[data-doc-fields] input,[data-doc-fields] select,[data-doc-fields] textarea')].some(e=>e.type==='checkbox'?e.checked:Boolean(e.value))||f.querySelector('[data-doc-template]')?.disabled));}
  $('[data-setup-apply]').addEventListener('click',async()=>{
    if(state.busy||!state.owner||!state.plan||!$('[data-setup-confirm]').checked||!state.plan.summary.missing||state.plan.summary.conflicts)return;
    const c=context(),plan=state.plan;state.busy=true;controls();note('جارٍ حفظ النماذج الناقصة…');let saved=false;
    try{
      const result=await request(c,`/documents/organizations/${encodeURIComponent(c.organizationId)}/template-setup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({department:c.department,expectedPlanHash:plan.planHash,confirmed:true})});
      if(!current(c))return;
      const wanted=plan.items.filter(t=>t.status==='MISSING').map(t=>t.code).sort();
      if(!result||result.organizationId!==c.organizationId||result.department!==c.department||result.created!==wanted.length||result.emptyTemplatesOnly!==true||result.specializedContractsIncluded!==false||!Array.isArray(result.createdCodes)||JSON.stringify([...result.createdCodes].sort())!==JSON.stringify(wanted))throw new Error('لم تؤكد الاستجابة النتيجة المتوقعة؛ أعد الحصر قبل أي محاولة أخرى.');
      saved=true;invalidatePlan();document.dispatchEvent(new CustomEvent('hydroland:form-template-published'));
      await window.HydrolandFormLibrary?.checkForUpdates?.();if(!current(c))return;
      const retainedInput=hasDocumentInput();
      if(!retainedInput)await window.HydrolandDocuments?.refresh?.();if(!current(c))return;
      note(`حُفظ ${result.created} قالبًا فارغًا؛ لم يُعدّل أي نموذج سابق أو عقد أو مستند. ${retainedInput?'مدخلاتك غير المحفوظة باقية؛ حدّث حصر المستندات بعد إكمالها.':'تم تحديث المكتبة وحصر المستندات.'} لا يعني الحفظ اعتماد محتوى النماذج أو اكتمال الإجراءات.`);
    }catch(error){if(current(c)){invalidatePlan();note(`${saved?'تم الحفظ لكن تحديث العرض لم يكتمل: ':'تعذر تأكيد اكتمال العملية؛ أعد الحصر قبل المحاولة: '}${error.message||'خطأ غير متوقع.'}`);}}
    finally{if(current(c)){state.busy=false;controls();}}
  });
  new MutationObserver(()=>{reset();if(dialog.open)void authorize();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('change',event=>{if(event.target.matches?.('#hl-documents [data-doc-org]')){reset();if(dialog.open)void authorize();}});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,reset);
  window.HydrolandFormSetup={clear:reset};
  if(dialog.open)void authorize();
})();
