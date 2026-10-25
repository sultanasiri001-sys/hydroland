/* Central form editor. Uses the existing versioned DocumentTemplate endpoints.
 * Contracts, signed documents, and organization branding are never mutated here.
 */
(() => {
  'use strict';
  if (window.HydrolandFormLibrary) return;
  const departments = {
    HR: 'الموارد البشرية', MARINE_OPERATIONS: 'شؤون العمليات البحرية', TRAINING: 'التدريب',
    INVENTORY_LOGISTICS: 'المخزون والمشتريات', FINANCE: 'المالية',
    SAFETY_COMPLIANCE_RISK: 'السلامة والامتثال والمخاطر', CUSTOMER_EXPERIENCE: 'خدمة العملاء',
    MARKETING_GROWTH: 'التسويق والنمو', TECHNOLOGY_CYBERSECURITY: 'التقنية والأمن السيبراني',
    FACILITIES_ASSETS_MAINTENANCE: 'المرافق والأصول والصيانة', ADMIN_AFFAIRS_RECORDS: 'الشؤون الإدارية والوثائق',
    EXECUTIVE_GOVERNANCE: 'الإدارة التنفيذية والحوكمة', RND_MARKET_INTELLIGENCE: 'البحث والتطوير',
    LEGAL_CONTRACTS_INSURANCE: 'الشؤون القانونية والعقود والتأمين'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const auth = () => window.HydrolandAuth;
  const session = () => auth()?.getSessionVersion?.();
  const selectedOrg = () => document.querySelector('#hl-documents [data-doc-org]')?.value || '';
  const dialog = document.createElement('dialog');
  dialog.id = 'hl-form-library'; dialog.dir = 'rtl';
  dialog.setAttribute('aria-labelledby', 'hl-form-library-title');
  dialog.innerHTML = `<header class="hfl-heading"><div><h2 id="hl-form-library-title">مكتبة النماذج الإدارية</h2><p>مصدر واحد للقالب، وإصدار محفوظ لكل تعديل منشور.</p></div><button type="button" data-hfl-close aria-label="إغلاق مكتبة النماذج">إغلاق</button></header>
    <p data-hfl-note role="status" aria-live="polite"></p>
    <div class="hfl-toolbar"><label>الإدارة<select data-hfl-department><option value="">كل الإدارات</option>${Object.entries(departments).map(([code,name])=>`<option value="${code}">${name}</option>`).join('')}</select></label><label>النموذج<select data-hfl-template></select></label><button type="button" data-hfl-reload>إعادة التحميل</button></div>
    <section class="hfl-history" aria-label="سجل إصدارات القالب">
      <h3>سجل الإصدارات والاستعادة</h3><p>معاينة النسخ السابقة أو تحميل نسخة متوافقة للمراجعة والنشر كإصدار جديد؛ لا تتغير المستندات السابقة.</p>
      <button type="button" data-hfl-history-load disabled>عرض سجل الإصدارات</button><p data-hfl-history-status role="status" aria-live="polite"></p>
      <ol data-hfl-history-list></ol><button type="button" data-hfl-history-more hidden>إصدارات أقدم</button><article data-hfl-history-detail hidden></article>
    </section>
    <div class="hfl-layout"><form data-hfl-editor><fieldset data-hfl-controls disabled><legend>تحرير القالب المركزي</legend>
      <p data-hfl-meta></p><label>عنوان النموذج بالعربية<input name="titleAr" required maxlength="200"></label><label>عنوان النموذج بالإنجليزية<input name="titleEn" required maxlength="200" dir="ltr"></label>
      <label class="hfl-check"><input name="printable" type="checkbox"> إتاحة الطباعة وفق صلاحيات المستند</label>
      <h3>الحقول وترتيبها</h3><p>مفاتيح الحقول وأنواعها ثابتة هنا لحماية الربط التشغيلي. يمكن تعديل العناوين والإلزامية والترتيب؛ إضافة حقل أو تغيير نوعه يحتاج مراجعة الربط.</p><div data-hfl-fields></div>
      <label class="hfl-check"><input data-hfl-confirm type="checkbox" required> أوافق على نشر إصدار جديد للنماذج الجديدة فقط، وتحديث شاشة المستندات. المستندات السابقة تبقى على إصدارها.</label>
      <button type="submit" data-hfl-publish>حفظ ونشر إصدار جديد</button>
    </fieldset></form><section aria-label="معاينة الهوية الرسمية"><p class="hfl-preview-note">معاينة بصرية للقالب فقط — ليست مستندًا معتمدًا أو موقّعًا، وليست محاكاة نهائية لملف PDF.</p><article data-hfl-preview class="hfl-paper"></article></section></div>`;
  document.body.appendChild(dialog);
  const style = document.createElement('style');
  style.textContent = `#hl-form-library{width:min(1200px,94vw);max-height:92vh;box-sizing:border-box;border:1px solid #28647f;border-radius:14px;padding:22px;background:#f3f6f8;color:#152c3d;font:15px/1.7 Arial,sans-serif}#hl-form-library::backdrop{background:#071e30bb}#hl-form-library *{box-sizing:border-box}#hl-form-library button{padding:9px 15px;border:1px solid #b8cbd5;border-radius:6px;background:white;color:#132c42;cursor:pointer}#hl-form-library button:disabled{opacity:.5;cursor:not-allowed}#hl-form-library [data-hfl-publish]{background:#12354d;color:white;width:100%;margin-top:12px}#hl-form-library label{display:grid;gap:5px;margin:10px 0}#hl-form-library input:not([type=checkbox]),#hl-form-library select{width:100%;min-width:0;padding:9px;background:white;color:#132c42;border:1px solid #b8cbd5;border-radius:5px}#hl-form-library .hfl-check{display:flex;align-items:flex-start;gap:9px}#hl-form-library [type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:5px}#hl-form-library fieldset{border:1px solid #b8cbd5;padding:14px;min-width:0}#hl-form-library .hfl-heading{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:2px solid #2298bd}#hl-form-library h2,#hl-form-library h3{margin:6px 0}#hl-form-library .hfl-toolbar{display:grid;grid-template-columns:1fr 1.5fr auto;gap:12px;align-items:end;margin-bottom:18px}#hl-form-library .hfl-toolbar button{margin-bottom:10px}#hl-form-library .hfl-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px}#hl-form-library [data-hfl-note]{min-height:1.7em;color:#154c67}#hl-form-library .hfl-field{border:1px solid #d7e2e8;border-radius:7px;background:white;padding:12px;margin-bottom:12px}#hl-form-library .hfl-field small{direction:ltr;display:block;color:#536779;overflow-wrap:anywhere}#hl-form-library .hfl-field-actions{display:flex;gap:8px}#hl-form-library .hfl-paper{background:white;min-height:700px;box-shadow:0 5px 20px #152c3d15;padding:28px;border:1px solid #2298bd;overflow-wrap:anywhere;color:#152c3d}#hl-form-library .hfl-letterhead{display:flex;align-items:center;gap:14px;background:#092033;color:white;padding:16px;border-bottom:3px solid #00a7e8}#hl-form-library .hfl-letterhead img{width:55px;height:55px;object-fit:contain}#hl-form-library .hfl-letterhead b{letter-spacing:1px}#hl-form-library .hfl-letterhead span{display:block}#hl-form-library .hfl-paper h3{text-align:center;font-size:21px;margin:24px 0 5px}#hl-form-library .hfl-paper h4{text-align:center;margin:0 0 20px;color:#536779;font-size:13px}#hl-form-library .hfl-identity{background:#edf6fa;border-right:3px solid #2298bd;padding:10px;margin:15px 0;font-size:13px}#hl-form-library .hfl-paper dl{margin:0}#hl-form-library .hfl-paper dt{background:#f4f7f9;padding:8px;font-weight:700}#hl-form-library .hfl-paper dd{border:1px solid #e1e8ed;padding:9px;margin:0 0 12px;min-height:39px;color:#778693}#hl-form-library .hfl-paper footer{border-top:1px solid #b8cbd5;margin-top:26px;padding-top:12px;font-size:11px;color:#536779;text-align:center}#hl-form-library .hfl-preview-note{font-size:12px;color:#536779}#hl-form-library .hfl-paper [dir=ltr]{unicode-bidi:isolate}@media(max-width:850px){#hl-form-library .hfl-layout{grid-template-columns:1fr}#hl-form-library .hfl-toolbar{grid-template-columns:1fr}#hl-form-library{padding:14px}#hl-form-library .hfl-paper{padding:16px;min-height:500px}}`;
  style.textContent += `#hl-form-library .hfl-history{border:1px solid #b8cbd5;border-radius:8px;padding:16px;margin-bottom:20px;overflow-wrap:anywhere}#hl-form-library [data-hfl-history-list]{list-style:none;padding:0;margin:12px 0;max-height:310px;overflow:auto}#hl-form-library [data-hfl-history-list] li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #d7e2e8}#hl-form-library [data-hfl-history-list] li span{min-width:0}#hl-form-library [data-hfl-history-list] button{flex-shrink:0}#hl-form-library [data-hfl-history-detail]{background:white;border:1px solid #d7e2e8;padding:16px;margin-top:14px}#hl-form-library [data-hfl-history-detail] dd{margin:0 0 10px;padding:6px}#hl-form-library [data-hfl-history-detail] dt{font-weight:bold}`;
  document.head.appendChild(style);
  const $ = selector => dialog.querySelector(selector);
  const state = { generation:0, orgId:'', member:null, brand:null, templates:[], active:null, fields:[], busy:false, dirty:false };
  const note = text => { $('[data-hfl-note]').textContent = text; };
  const context = () => ({ generation:state.generation, orgId:state.orgId, session:session() });
  const current = c => dialog.open && c.generation===state.generation && c.orgId===state.orgId && c.orgId===selectedOrg() && c.session===session() && Boolean(auth()?.isAuthenticated?.());
  const canEdit = () => ['OWNER','ADMIN'].includes(state.member?.role);
  function busy(value) {
    state.busy=value;
    for(const key of ['template','department','reload']) $(`[data-hfl-${key}]`).disabled=value;
    $('[data-hfl-controls]').disabled=value||!state.active||!canEdit();
    historyControls();
  }
  function hasDocumentInput() {
    const form=document.querySelector('#hl-documents [data-doc-form]');
    return Boolean(form&&([...form.querySelectorAll('[data-doc-fields] input,[data-doc-fields] textarea,[data-doc-fields] select')].some(input=>input.type==='checkbox'?input.checked:Boolean(input.value))||form.querySelector('[data-doc-template]')?.disabled));
  }
  async function request(path, options={}, valid=()=>true) {
    if (!auth()?.isAuthenticated?.()) throw new Error('سجّل الدخول للمتابعة.');
    const call = context();
    const response = await auth().authorizedFetch(path, {cache:'no-store', ...options});
    const body = await response.json().catch(()=>null);
    if (!response.ok) {
      // A late denial from an older session must not erase the newer editor.
      if ([401,403].includes(response.status) && current(call) && valid()) clear();
      throw new Error(Array.isArray(body?.message)?body.message.join('، '):body?.message||'تعذر إكمال إجراء مكتبة النماذج.');
    }
    return body;
  }
  function clear() {
    state.generation++; state.orgId=''; state.member=null; state.brand=null; state.templates=[];
    state.active=null; state.fields=[]; state.dirty=false; resetHistory();busy(false);
    $('[data-hfl-editor]').reset(); $('[data-hfl-controls]').disabled=true;
    for (const key of ['template','fields','preview']) $(`[data-hfl-${key}]`).replaceChildren();
    $('[data-hfl-meta]').textContent=''; note(''); if(dialog.open)dialog.close();
  }
  function preview() {
    const t=state.active;
    if(!t){$('[data-hfl-preview]').innerHTML='<p class="hfl-empty">اختر نموذجًا لعرض المعاينة.</p>';return;}
    const form=$('[data-hfl-editor]'),titleAr=form.elements.titleAr.value,titleEn=form.elements.titleEn.value;
    const org=state.member?.organization||{},brand=state.brand||{};
    // Logo URLs from editable data are deliberately not fetched here.
    $('[data-hfl-preview]').innerHTML=`<header class="hfl-letterhead"><img src="./assets/hydroland-mark-reference.webp" alt="شعار هيدرولاند"><div><b dir="ltr">HYDROLAND</b><span>هيدرولاند · النماذج الإدارية</span></div></header>
      <div class="hfl-identity">الجهة: ${esc(brand.brandNameAr||org.displayName||'—')}<br>الإدارة: ${esc(departments[t.department]||t.department)}</div>
      <h3>${esc(titleAr)}</h3><h4 dir="ltr">${esc(titleEn)}</h4>
      <p dir="ltr">${esc(t.code)} · v${esc(t.version)} · PREVIEW</p>
      <dl>${state.fields.map(f=>`<dt>${esc(f.labelAr)}${f.required?' *':''}</dt><dd>${Array.isArray(f.options)&&f.options.length?f.options.map(esc).join(' / '):'................................................'}</dd>`).join('')}</dl>
      <footer>${esc(brand.footerAr||'HYDROLAND · هيدرولاند')}<br>معاينة قالب — بيانات الاعتماد والتوقيع تُنشأ فقط في مسار المستند الفعلي.<br>الحقول ذات العلامة * إلزامية.</footer>`;
  }
  function fields() {
    $('[data-hfl-fields]').innerHTML=state.fields.map((f,i)=>`<section class="hfl-field" data-hfl-row="${i}"><small>${esc(f.key)} · ${esc(f.type)}</small><label>عنوان الحقل بالعربية<input data-hfl-label="labelAr" value="${esc(f.labelAr)}" maxlength="200" required></label><label>عنوان الحقل بالإنجليزية<input data-hfl-label="labelEn" value="${esc(f.labelEn)}" maxlength="200" required dir="ltr"></label><label class="hfl-check"><input data-hfl-required type="checkbox"${f.required?' checked':''}> حقل إلزامي</label><div class="hfl-field-actions"><button type="button" data-hfl-move="-1"${i===0?' disabled':''} aria-label="نقل الحقل ${i+1} لأعلى">أعلى</button><button type="button" data-hfl-move="1"${i===state.fields.length-1?' disabled':''} aria-label="نقل الحقل ${i+1} لأسفل">أسفل</button></div></section>`).join('');
  }
  function selectTemplate() {
    resetHistory();
    const t=state.templates.find(x=>x.id===$('[data-hfl-template]').value)||null;
    state.active=t; state.fields=t?clone(t.fields):[]; state.dirty=false;
    const form=$('[data-hfl-editor]');form.reset();form.elements.titleAr.value=t?.titleAr||'';form.elements.titleEn.value=t?.titleEn||'';form.elements.printable.checked=t?.printable!==false;
    $('[data-hfl-controls]').disabled=!t||!canEdit()||state.busy;
    $('[data-hfl-meta]').textContent=t?`${t.code} · الإصدار النشط ${t.version} · ${state.fields.length} حقل`:'';
    fields(); preview();historyControls();
  }
  function renderChoices(preferredId) {
    const dept=$('[data-hfl-department]').value,rows=state.templates.filter(t=>!dept||t.department===dept);
    $('[data-hfl-template]').innerHTML=rows.map(t=>`<option value="${esc(t.id)}">${esc(t.titleAr)} · v${esc(t.version)}</option>`).join('');
    if(rows.some(t=>t.id===preferredId))$('[data-hfl-template]').value=preferredId;
    selectTemplate();
  }
  async function load(preferredId) {
    resetHistory();
    state.generation++;state.orgId=selectedOrg();busy(true);state.dirty=false;
    state.active=null;state.templates=[];state.fields=[];state.member=null;state.brand=null;
    $('[data-hfl-controls]').disabled=true;$('[data-hfl-template]').replaceChildren();$('[data-hfl-fields]').replaceChildren();preview();
    const c=context();note('جارٍ قراءة القوالب المحفوظة والصلاحيات...');
    try {
      if(!c.orgId)throw new Error('اختر الجهة في شاشة المستندات أولًا.');
      const memberships=await request('/documents/workspace');if(!current(c))return;
      const member=(Array.isArray(memberships)?memberships:[]).find(m=>m.status==='ACTIVE'&&m.organization?.id===c.orgId);
      if(!member)throw new Error('لا توجد صلاحية نشطة لهذه الجهة.');
      const base=`/documents/organizations/${encodeURIComponent(c.orgId)}`;
      const [templates,brand]=await Promise.all([request(base+'/templates'),request(base+'/branding')]);if(!current(c))return;
      if(!Array.isArray(templates)||brand?.organizationId!==c.orgId)throw new Error('تعذر التحقق من نطاق مكتبة النماذج.');
      state.member=member;state.brand=brand;
      state.templates=templates.filter(t=>t.organizationId===c.orgId&&t.status==='ACTIVE'&&!String(t.code).startsWith('CLIB-')&&Array.isArray(t.fields));
      busy(false);renderChoices(preferredId);
      note(`${state.templates.length} قالب نشط محفوظ. ${canEdit()?'التعديل ينشر إصدارًا جديدًا ولا يعيد كتابة المستندات السابقة.':'صلاحيتك للعرض فقط.'}`);
    } catch(error) { if(current(c))note(error.message||'تعذر قراءة المكتبة.'); }
    finally { if(current(c))busy(false); }
  }
  function open() {
    if(!auth()?.isAuthenticated?.()||!selectedOrg())return;
    if(dialog.open&&(state.busy||!discardAllowed()))return;
    if(!dialog.open)dialog.showModal();
    $('[data-hfl-department]').value=document.querySelector('#hl-documents [data-doc-department]')?.value||'';
    lastDepartment=$('[data-hfl-department]').value;
    void load();
  }
  function discardAllowed(){return !state.dirty||window.confirm('توجد تعديلات غير منشورة. هل تريد تركها؟');}
  function changed(){state.dirty=true;$('[data-hfl-confirm]').checked=false;preview();}
  $('[data-hfl-editor]').addEventListener('input',event=>{
    const row=event.target.closest('[data-hfl-row]'),i=Number(row?.dataset.hflRow);
    if(row&&state.fields[i]){
      if(event.target.dataset.hflLabel)state.fields[i][event.target.dataset.hflLabel]=event.target.value;
      if(event.target.matches('[data-hfl-required]'))state.fields[i].required=event.target.checked;
    }
    if(!event.target.matches('[data-hfl-confirm]'))changed();
  });
  $('[data-hfl-fields]').addEventListener('click',event=>{
    const button=event.target.closest('[data-hfl-move]');if(!button||state.busy||!canEdit())return;
    const i=Number(button.closest('[data-hfl-row]').dataset.hflRow),j=i+Number(button.dataset.hflMove);
    if(j<0||j>=state.fields.length)return;
    [state.fields[i],state.fields[j]]=[state.fields[j],state.fields[i]];fields();changed();
  });
  $('[data-hfl-template]').addEventListener('change',()=>{if(discardAllowed())selectTemplate();else $('[data-hfl-template]').value=state.active?.id||'';});
  let lastDepartment='';
  $('[data-hfl-department]').addEventListener('change',()=>{if(discardAllowed()){lastDepartment=$('[data-hfl-department]').value;renderChoices();}else $('[data-hfl-department]').value=lastDepartment;});
  $('[data-hfl-reload]').addEventListener('click',()=>{if(!state.busy&&discardAllowed())void load(state.active?.id);});
  $('[data-hfl-close]').addEventListener('click',()=>{if(discardAllowed())clear();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(discardAllowed())clear();});
  $('[data-hfl-editor]').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy||!state.active||!canEdit()||!$('[data-hfl-confirm]').checked)return;
    const c=context(),t=state.active,form=event.currentTarget;
    const payload={titleAr:form.elements.titleAr.value.trim(),titleEn:form.elements.titleEn.value.trim(),printable:form.elements.printable.checked,fields:clone(state.fields)};
    if(!payload.titleAr||!payload.titleEn||payload.fields.some(f=>!f.labelAr?.trim()||!f.labelEn?.trim())){note('أكمل عناوين النموذج والحقول باللغتين.');return;}
    busy(true);note('جارٍ التحقق من الإصدار ثم حفظ التعديل...');
    let published=false;
    try {
      const latest=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/templates`);if(!current(c))return;
      if(!Array.isArray(latest)||!latest.some(x=>x.id===t.id&&x.version===t.version&&x.organizationId===c.orgId&&x.status==='ACTIVE'))throw new Error('نُشر إصدار أحدث. تعديلاتك باقية هنا؛ راجعها ثم أعد تحميل القالب قبل النشر.');
      const saved=await request(`/documents/templates/${encodeURIComponent(t.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!current(c))return;
      if(!saved?.id||saved.organizationId!==c.orgId||saved.code!==t.code||saved.version!==t.version+1)throw new Error('استجاب الخادم للحفظ دون تأكيد الإصدار المتوقع. أعد قراءة المكتبة قبل المحاولة مجددًا.');
      published=true;state.dirty=false;
      // The existing workspace reload resolves the new active template by code.
      // No revise/approve/sign request is issued for any existing document.
      const keptInput=hasDocumentInput();
      if(!keptInput)await window.HydrolandDocuments?.refresh?.();
      if(!current(c))return;
      document.dispatchEvent(new CustomEvent('hydroland:form-template-published',{detail:{organizationId:c.orgId,code:t.code,version:saved.version}}));
      await load(saved.id);
      if(c.session===session()&&c.orgId===selectedOrg()&&dialog.open)note(`حُفظ ونُشر الإصدار ${saved.version}. ${keptInput?'حُفظت مدخلات شاشة المستندات دون مسحها؛ حدّث الشاشة بعد إكمالها لتحميل القالب الجديد.':'تم تحديث شاشة المستندات.'} المستندات السابقة لم تتغير.`);
    } catch(error) { if(current(c))note((published?'تم الحفظ، لكن تحديث العرض لم يكتمل: ':'')+(error.message||'تعذر حفظ التعديل.')); }
    finally { if(current(c))busy(false); }
  });
  // History is kept in memory only and fenced independently of editor requests.
  const history = { generation:0, rows:[], cursor:null, selected:null, busy:false };
  const historyNote = text => { $('[data-hfl-history-status]').textContent=text; };
  const historyContext = () => ({...context(), historyGeneration:history.generation, templateId:state.active?.id});
  const historyCurrent = c => current(c)&&c.historyGeneration===history.generation&&c.templateId===state.active?.id;
  function historyControls() {
    const blocked=state.busy||history.busy||!state.active;
    $('[data-hfl-history-load]').disabled=blocked;
    $('[data-hfl-history-more]').disabled=blocked;
    $('[data-hfl-history-more]').hidden=history.cursor===null;
    for(const button of dialog.querySelectorAll('[data-hfl-history-view]'))button.disabled=blocked;
    const restore=$('[data-hfl-history-restore]');
    if(restore)restore.disabled=blocked||!canRestore(history.selected);
  }
  function resetHistory() {
    history.generation++;history.rows=[];history.cursor=null;history.selected=null;history.busy=false;
    $('[data-hfl-history-list]').replaceChildren();$('[data-hfl-history-detail]').replaceChildren();
    $('[data-hfl-history-detail]').hidden=true;historyNote('');historyControls();
  }
  function compatible(row) {
    const active=state.active;
    if(!active||!row||row.fields.length!==active.fields.length)return false;
    const map=new Map(active.fields.map(f=>[f.key,f]));
    return map.size===active.fields.length&&new Set(row.fields.map(f=>f.key)).size===row.fields.length&&row.fields.every(f=>{
      const live=map.get(f.key);
      return live&&live.type===f.type&&JSON.stringify(live.options||[])===JSON.stringify(f.options||[]);
    });
  }
  function canRestore(row) {
    return Boolean(canEdit()&&row&&state.active&&row.version<state.active.version&&compatible(row)&&!history.rows.some(r=>r.version>state.active.version));
  }
  function validateHistoryPage(body,before) {
    const t=state.active;
    if(!body||body.organizationId!==state.orgId||body.code!==t.code||body.department!==t.department||!Array.isArray(body.items)||body.items.length>25)throw new Error('تعذر التحقق من نطاق سجل الإصدارات.');
    let upper=before??Infinity;
    const ids=new Set(before===null?[]:history.rows.map(r=>r.id));
    for(const row of body.items){
      if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||row.organizationId!==state.orgId||row.code!==t.code||row.department!==t.department||!Number.isSafeInteger(row.version)||row.version<1||row.version>=upper||typeof row.titleAr!=='string'||typeof row.titleEn!=='string'||typeof row.status!=='string'||typeof row.printable!=='boolean'||!Array.isArray(row.fields)||row.fields.length>100)throw new Error('استجابة سجل الإصدارات غير متسقة؛ لم تُحمّل أي نسخة.');
      for(const f of row.fields)if(!f||typeof f.key!=='string'||!f.key||typeof f.type!=='string'||typeof f.labelAr!=='string'||typeof f.labelEn!=='string'||typeof f.required!=='boolean'||(f.options!==undefined&&(!Array.isArray(f.options)||f.options.some(x=>typeof x!=='string'))))throw new Error('تعريف حقول الإصدار غير صالح.');
      ids.add(row.id);upper=row.version;
    }
    const next=body.nextBeforeVersion;
    if(next!==null&&(!Number.isSafeInteger(next)||next<1||!body.items.length||next!==body.items.at(-1).version||(before!==null&&next>=before)))throw new Error('مؤشر صفحة الإصدارات غير صالح.');
  }
  function renderHistoryDetail(row) {
    history.selected=row;
    const target=$('[data-hfl-history-detail]');target.hidden=false;
    const allowed=canRestore(row);
    const reason=!canEdit()?'صلاحيتك للعرض فقط.':history.rows.some(r=>r.version>state.active.version)?'يوجد إصدار أحدث؛ أعد تحميل القالب قبل الاستعادة.':row.version>=state.active.version?'هذا ليس إصدارًا أقدم من القالب النشط.':!compatible(row)?'تختلف مفاتيح الحقول أو أنواعها أو خياراتها؛ يلزم فحص الربط قبل الاستعادة.':'الاستعادة تحمل المحتوى للمراجعة فقط. النشر يتطلب تأكيدًا مستقلًا وينشئ إصدارًا جديدًا.';
    target.innerHTML=`<h3 tabindex="-1" data-hfl-history-heading>معاينة الإصدار ${esc(row.version)}</h3><p>${esc(row.titleAr)}<br><span dir="ltr">${esc(row.titleEn)}</span></p><p>الطباعة: ${row.printable?'متاحة وفق الصلاحيات':'غير متاحة'}</p><dl>${row.fields.map(f=>`<dt>${esc(f.labelAr)}${f.required?' *':''}</dt><dd><span dir="ltr">${esc(f.key)} · ${esc(f.type)} · ${esc(f.labelEn)}</span>${f.options?.length?`<br>${f.options.map(esc).join(' / ')}`:''}</dd>`).join('')}</dl><p data-hfl-history-reason>${reason}</p><button type="button" data-hfl-history-restore${allowed?'':' disabled'}>تحميل هذا الإصدار للمراجعة</button><p>عرض تعريف القالب فقط؛ لا يتضمن مستندًا أو توقيعًا أو اعتمادًا.</p>`;
    historyControls();
  }
  function renderHistory() {
    $('[data-hfl-history-list]').innerHTML=history.rows.map(row=>`<li><span>الإصدار ${esc(row.version)} · ${esc(row.status==='ACTIVE'?'نشط':row.status==='INACTIVE'?'سابق':row.status)} — ${esc(row.titleAr)}</span><button type="button" data-hfl-history-view="${esc(row.id)}" aria-label="معاينة الإصدار ${esc(row.version)}">معاينة</button></li>`).join('');
    historyControls();
  }
  async function loadHistory(more=false) {
    if(state.busy||history.busy||!state.active||(more&&history.cursor===null))return;
    if(!more)resetHistory();
    const c=historyContext(),t=state.active,before=more?history.cursor:null;
    history.busy=true;historyControls();historyNote('جارٍ قراءة سجل الإصدارات…');
    try {
      const path=`/documents/organizations/${encodeURIComponent(c.orgId)}/templates/${encodeURIComponent(t.code)}/history`+(before===null?'':`?beforeVersion=${before}`);
      const body=await request(path,{},()=>historyCurrent(c));if(!historyCurrent(c))return;
      validateHistoryPage(body,before);
      history.rows=more?history.rows.concat(body.items):body.items;history.cursor=body.nextBeforeVersion;
      renderHistory();
      if(history.selected)renderHistoryDetail(history.selected);
      historyNote(history.rows.some(r=>r.version>t.version)?'يوجد إصدار أحدث؛ أعد تحميل القالب قبل النشر أو الاستعادة.':`${history.rows.length} إصدار معروض. ${history.cursor===null?'نهاية السجل.':'توجد إصدارات أقدم.'}`);
    }catch(error){if(historyCurrent(c))historyNote(error.message||'تعذر قراءة سجل الإصدارات.');}
    finally{if(historyCurrent(c)){history.busy=false;historyControls();}}
  }
  $('[data-hfl-history-load]').addEventListener('click',()=>void loadHistory());
  $('[data-hfl-history-more]').addEventListener('click',()=>void loadHistory(true));
  $('[data-hfl-history-list]').addEventListener('click',event=>{
    const button=event.target.closest('[data-hfl-history-view]');
    if(!button||state.busy||history.busy||!historyCurrent(historyContext()))return;
    const row=history.rows.find(r=>r.id===button.dataset.hflHistoryView);
    if(row){renderHistoryDetail(row);$('[data-hfl-history-heading]').focus();}
  });
  $('[data-hfl-history-detail]').addEventListener('click',event=>{
    if(!event.target.closest('[data-hfl-history-restore]')||state.busy||history.busy||!historyCurrent(historyContext()))return;
    const row=history.selected;
    if(!canRestore(row)||!discardAllowed())return;
    const form=$('[data-hfl-editor]'),map=new Map(state.active.fields.map(f=>[f.key,f]));
    // Keep the current template ID/version. Only the permitted editable values
    // are copied; the existing authorized PUT creates the next immutable version.
    state.fields=row.fields.map(f=>({...clone(map.get(f.key)),labelAr:f.labelAr,labelEn:f.labelEn,required:f.required}));
    form.elements.titleAr.value=row.titleAr;form.elements.titleEn.value=row.titleEn;form.elements.printable.checked=row.printable;
    fields();changed();
    $('[data-hfl-meta]').textContent=`${state.active.code} · الإصدار النشط ${state.active.version} · محتوى الإصدار ${row.version} للمراجعة`;
    note(`حُمّل محتوى الإصدار ${row.version} للمراجعة فقط. لم يُحفظ أو يُنشر بعد؛ راجعه ثم أكّد نشر إصدار جديد.`);
    form.elements.titleAr.focus();
  });
  function connect() {
    const host=document.getElementById('hl-documents'),head=host?.querySelector('.hl-doc-head');
    if(!head||head.querySelector('[data-hfl-open]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.hflOpen='';button.textContent='مكتبة النماذج';button.addEventListener('click',open);head.appendChild(button);
    host.querySelector('[data-doc-org]')?.addEventListener('change',clear);
  }
  const observer=new MutationObserver(connect);observer.observe(document.body,{childList:true,subtree:true});connect();
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,clear);
  window.HydrolandFormLibrary={open,clear};
})();
