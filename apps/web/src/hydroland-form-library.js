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
  }
  function hasDocumentInput() {
    const form=document.querySelector('#hl-documents [data-doc-form]');
    return Boolean(form&&([...form.querySelectorAll('[data-doc-fields] input,[data-doc-fields] textarea,[data-doc-fields] select')].some(input=>input.type==='checkbox'?input.checked:Boolean(input.value))||form.querySelector('[data-doc-template]')?.disabled));
  }
  async function request(path, options={}) {
    if (!auth()?.isAuthenticated?.()) throw new Error('سجّل الدخول للمتابعة.');
    const response = await auth().authorizedFetch(path, {cache:'no-store', ...options});
    const body = await response.json().catch(()=>null);
    if (!response.ok) {
      if ([401,403].includes(response.status)) clear();
      throw new Error(Array.isArray(body?.message)?body.message.join('، '):body?.message||'تعذر إكمال إجراء مكتبة النماذج.');
    }
    return body;
  }
  function clear() {
    state.generation++; state.orgId=''; state.member=null; state.brand=null; state.templates=[];
    state.active=null; state.fields=[]; state.dirty=false; busy(false);
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
    const t=state.templates.find(x=>x.id===$('[data-hfl-template]').value)||null;
    state.active=t; state.fields=t?clone(t.fields):[]; state.dirty=false;
    const form=$('[data-hfl-editor]');form.reset();form.elements.titleAr.value=t?.titleAr||'';form.elements.titleEn.value=t?.titleEn||'';form.elements.printable.checked=t?.printable!==false;
    $('[data-hfl-controls]').disabled=!t||!canEdit()||state.busy;
    $('[data-hfl-meta]').textContent=t?`${t.code} · الإصدار النشط ${t.version} · ${state.fields.length} حقل`:'';
    fields(); preview();
  }
  function renderChoices(preferredId) {
    const dept=$('[data-hfl-department]').value,rows=state.templates.filter(t=>!dept||t.department===dept);
    $('[data-hfl-template]').innerHTML=rows.map(t=>`<option value="${esc(t.id)}">${esc(t.titleAr)} · v${esc(t.version)}</option>`).join('');
    if(rows.some(t=>t.id===preferredId))$('[data-hfl-template]').value=preferredId;
    selectTemplate();
  }
  async function load(preferredId) {
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
