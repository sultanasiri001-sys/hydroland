/* A separately labelled administrative record, never a generic approval/signature. */
(() => {
  'use strict';
  if (window.HydrolandOwnerApproval) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth = () => window.HydrolandAuth;
  const session = () => auth()?.getSessionVersion?.();
  const dialog = document.createElement('dialog'); dialog.id = 'hl-owner-approval'; dialog.dir = 'rtl';
  dialog.setAttribute('aria-labelledby', 'hoa-title');
  dialog.innerHTML = `<header><h2 id="hoa-title">اعتماد المالك الإداري</h2><button type="button" data-hoa-close>إغلاق</button></header>
    <p class="hoa-warning">اعتماد إداري داخلي من مالك هيدرولاند. تبقى المراجعات القانونية والفنية وأدلتها والتوقيعات في مساراتها المختصة.</p>
    <p>هذا سجل منفصل مرتبط بإصدار محفوظ من المستند. تُحفظ المراجعة المستقلة والتوقيعات منفصلة. تعديل المصدر لاحقًا لا يغيّر الاعتماد السابق ولا ينقله للإصدار الجديد.</p>
    <p data-hoa-status role="status" aria-live="polite"></p><button type="button" data-hoa-reload>إعادة قراءة الحالة المحفوظة</button>
    <section data-hoa-source></section><section data-hoa-existing></section>
    <form data-hoa-form><fieldset data-hoa-controls disabled><legend>اعتماد النسخة إداريًا</legend>
      <label>ملاحظة المالك وتوجيه المتابعة<textarea data-hoa-note rows="4" minlength="5" maxlength="2000" required></textarea></label>
      <label class="hoa-check"><input type="checkbox" data-hoa-admin required> راجعت النسخة المحفوظة وأعتمدها إداريًا بصفتي مالك هيدرولاند؛ تنفيذ التعيين أو الصرف أو العقد أو التصريح يبقى في مساره المختص.</label>
      <label class="hoa-check"><input type="checkbox" data-hoa-limits required> أفهم أن هذا اعتماد المالك الإداري لهذه النسخة، وأن المراجعة المستقلة والتوقيعات والأدلة المتخصصة تُسجّل منفصلة، وأن أي تعديل لاحق يحتاج اعتماد النسخة الجديدة.</label>
      <button type="submit" data-hoa-record disabled>اعتماد هذه النسخة إداريًا</button>
    </fieldset></form>
    <section data-hoa-revision hidden><h3>تعديل بعد الاعتماد الإداري</h3><p>تُفتح نسخة جديدة قابلة للتعديل، ويُحفظ الاعتماد السابق مع نسخته. النسخة الجديدة تحتاج اعتمادًا جديدًا.</p>
      <label>سبب إنشاء النسخة الجديدة<textarea data-hoa-revision-note rows="3" maxlength="2000"></textarea></label>
      <label class="hoa-check"><input type="checkbox" data-hoa-revision-confirm> أؤكد إنشاء نسخة جديدة مع حفظ الاعتماد السابق.</label>
      <button type="button" data-hoa-reopen disabled>إنشاء نسخة جديدة للتعديل</button></section>
    <section><h3>سجل الاعتمادات الإدارية</h3><div data-hoa-history></div></section>
    <section data-hoa-pdf hidden><a data-hoa-pdf-link target="_blank" rel="noopener">فتح إثبات القرار PDF</a><iframe title="إثبات اعتماد المالك الإداري — ليس توقيعًا إلكترونيًا" data-hoa-pdf-frame></iframe></section>`;
  const style = document.createElement('style');
  style.textContent = '#hl-owner-approval{box-sizing:border-box;width:min(850px,94vw);max-height:92vh;overflow:auto;border:1px solid #2c799a;border-radius:14px;padding:24px;background:#f5f8fa;color:#153247;font:15px/1.8 Arial,sans-serif}#hl-owner-approval::backdrop{background:#071e30b3}#hl-owner-approval *{box-sizing:border-box;overflow-wrap:anywhere}#hl-owner-approval header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid #1297c0}#hl-owner-approval button{background:#153247;color:white;padding:10px 14px;border:0;border-radius:7px;cursor:pointer}#hl-owner-approval button:disabled{opacity:.45;cursor:not-allowed}#hl-owner-approval label{display:grid;gap:6px;margin:14px 0}#hl-owner-approval .hoa-check{display:flex;gap:10px;align-items:flex-start}#hl-owner-approval input{flex-shrink:0;margin-top:7px}#hl-owner-approval textarea{width:100%;border:1px solid #a8c3d2;padding:10px;font:inherit}#hl-owner-approval fieldset{border:1px solid #a8c3d2;min-width:0;margin:18px 0}#hl-owner-approval .hoa-warning{border-right:4px solid #be942d;padding:14px;background:#fff5db;font-weight:700}#hl-owner-approval dl{background:white;padding:14px;border:1px solid #d1e1e8}#hl-owner-approval dt{font-weight:bold}#hl-owner-approval dd{margin:4px 0 12px;white-space:pre-wrap}#hl-owner-approval [data-hoa-history]>p{display:flex;gap:14px;align-items:center;justify-content:space-between}#hl-owner-approval iframe{width:100%;height:65vh;border:1px solid #a8c3d2;margin-top:12px}@media(max-width:600px){#hl-owner-approval{padding:14px}#hl-owner-approval h2{font-size:20px}}';
  document.head.appendChild(style); document.body.appendChild(dialog);
  const $ = q => dialog.querySelector(q);
  const s = { generation: 0, org: '', id: '', session: null, plan: null, busy: false, uncertain: false, pdf: null };
  const context = () => ({ generation: s.generation, org: s.org, id: s.id, session: s.session });
  const current = c => dialog.open && c.generation === s.generation && c.org === s.org && c.id === s.id && c.session === session() && auth()?.isAuthenticated?.() && document.querySelector('#hl-documents [data-doc-org]')?.value === c.org && !document.querySelector('#hl-documents')?.hidden;
  const status = text => { $('[data-hoa-status]').textContent = text; };
  const consent = () => $('[data-hoa-admin]').checked && $('[data-hoa-limits]').checked && $('[data-hoa-note]').value.trim().length>=5;
  function controls() {
    $('[data-hoa-controls]').disabled = s.busy || s.uncertain || !s.plan?.eligible;
    $('[data-hoa-record]').disabled = s.busy || s.uncertain || !s.plan?.eligible || !consent();
    $('[data-hoa-reload]').disabled = s.busy;
    $('[data-hoa-reopen]').disabled = s.busy || s.uncertain || !s.plan?.existing || !['DRAFT','PENDING_APPROVAL'].includes(s.plan?.source?.status) || !$('[data-hoa-revision-confirm]').checked || $('[data-hoa-revision-note]').value.trim().length<5;
    for (const b of dialog.querySelectorAll('[data-hoa-version]')) b.disabled = s.busy;
  }
  function revokePdf() { if (s.pdf) URL.revokeObjectURL(s.pdf); s.pdf = null; $('[data-hoa-pdf-frame]').removeAttribute('src'); $('[data-hoa-pdf-link]').removeAttribute('href'); $('[data-hoa-pdf]').hidden = true; }
  function clear() { s.generation++; s.org = ''; s.id = ''; s.plan = null; s.busy = false; s.uncertain = false; revokePdf(); $('[data-hoa-form]').reset();$('[data-hoa-revision-note]').value='';$('[data-hoa-revision-confirm]').checked=false;$('[data-hoa-revision]').hidden=true; for (const q of ['source','existing','history']) $(`[data-hoa-${q}]`).replaceChildren(); status(''); controls(); if (dialog.open) dialog.close(); }
  function draft() { return Boolean($('[data-hoa-note]').value.trim() || $('[data-hoa-admin]').checked || $('[data-hoa-limits]').checked || $('[data-hoa-revision-note]').value.trim() || $('[data-hoa-revision-confirm]').checked); }
  function abandon() { return !draft() || window.confirm('توجد ملاحظات أو تأكيدات غير مسجلة؛ هل تريد تركها؟'); }
  const path = c => `/documents/organizations/${encodeURIComponent(c.org)}/documents/${encodeURIComponent(c.id)}/owner-approval`;
  async function request(c, options = {}, suffix = '') {
    const response = await auth().authorizedFetch(path(c)+suffix, { cache: 'no-store', ...options });
    const body = await response.json().catch(() => null);
    if (!current(c)) return null;
    if ([401,403].includes(response.status)) { clear(); return null; }
    if (!response.ok) throw new Error(response.status === 409 ? 'تغيّرت الحالة أو سُجل القرار بالفعل؛ أعد قراءة النتيجة قبل أي محاولة جديدة.' : 'تعذر إكمال الإجراء. أعد قراءة الحالة المحفوظة للتحقق.');
    return body;
  }
  function validReceipt(r, c, v) { return r && r.policy === 'OWNER_ADMINISTRATIVE_APPROVAL_V1' && r.organizationId === c.org && r.documentId === c.id && r.sourceVersion === v && r.status === 'ADMINISTRATIVELY_APPROVED' && r.independentReview === false && r.electronicSignature === false && r.originalWorkflowUnchanged === true && typeof r.referenceNumber === 'string' && typeof r.note === 'string'; }
  function validate(r, c) {
    if (!r || r.schemaVersion !== 1 || r.policy !== 'OWNER_ADMINISTRATIVE_APPROVAL_V1' || r.organizationId !== c.org || r.documentId !== c.id || !Number.isSafeInteger(r.sourceVersion) || r.sourceVersion < 1 || typeof r.eligible !== 'boolean' || r.originalWorkflowUnchanged !== true || !Array.isArray(r.receipts) || r.receipts.length > 100 || r.receipts.some(x => !Number.isSafeInteger(x.sourceVersion) || x.sourceVersion < 1 || typeof x.referenceNumber !== 'string')) throw new Error('لم يُتحقق من نطاق النتيجة؛ لم يُفعّل التسجيل.');
    if (r.eligible && (!/^[a-f0-9]{64}$/.test(r.reviewHash) || !r.source || r.source.documentId !== c.id || r.source.organizationId !== c.org || r.source.version !== r.sourceVersion || !Array.isArray(r.source.template?.fields) || !r.source.payload || r.existing || r.purpose !== 'INTERNAL_ADMINISTRATIVE_APPROVAL')) throw new Error('خطة الاعتماد غير متسقة؛ لم يُفعّل التسجيل.');
    if(r.eligible){const t=r.source.template, departments=['HR','TRAINING','MARINE_OPERATIONS','INVENTORY_LOGISTICS','FINANCE','SAFETY_COMPLIANCE_RISK','CUSTOMER_EXPERIENCE','MARKETING_GROWTH','TECHNOLOGY_CYBERSECURITY','FACILITIES_ASSETS_MAINTENANCE','ADMIN_AFFAIRS_RECORDS','EXECUTIVE_GOVERNANCE','RND_MARKET_INTELLIGENCE','LEGAL_CONTRACTS_INSURANCE'];if(typeof t.code!=='string'||t.code.startsWith('CLIB-')||t.code==='LEG-DIVE-COOPERATION-V1'||!departments.includes(r.source.department)||t.department!==r.source.department||!t.fields.length||t.fields.length>100||new Set(t.fields.map(f=>f?.key)).size!==t.fields.length||t.fields.some(f=>!f||typeof f.key!=='string'||typeof f.labelAr!=='string'||f.required&&r.source.payload[f.key]===undefined))throw new Error('تعريف المصدر خارج نطاق الاعتماد الإداري.');}
    if (r.existing && !validReceipt(r.existing,c,r.sourceVersion)) throw new Error('تعذر التحقق من إثبات القرار المحفوظ.');
  }
  function render() {
    const r = s.plan;
    $('[data-hoa-revision]').hidden=!r.existing||!['DRAFT','PENDING_APPROVAL'].includes(r.source?.status);
    $('[data-hoa-source]').innerHTML = r.source ? `<h3>النسخة المحفوظة محل الاعتماد</h3><p>${esc(r.source.referenceNumber)} · الإصدار ${r.sourceVersion} · ${esc(r.source.template.titleAr)}</p><dl>${r.source.template.fields.map(f=>`<dt>${esc(f.labelAr||f.key)}</dt><dd>${esc(typeof r.source.payload[f.key]==='object'?JSON.stringify(r.source.payload[f.key]):r.source.payload[f.key])}</dd>`).join('')}</dl>` : '<p>هذا المستند خارج النطاق أو في حالة نهائية. لا يمكن تسجيل قرار جديد له من هذا المسار.</p>';
    $('[data-hoa-existing]').textContent = r.existing ? `اعتماد المالك مسجل لهذا الإصدار: ${r.existing.referenceNumber}. ${r.existing.note} المراجعة المستقلة والتوقيع منفصلان.` : '';
    $('[data-hoa-history]').innerHTML = r.receipts.map(x=>`<p><span>${esc(x.referenceNumber)} · إصدار المصدر ${x.sourceVersion}</span><button type="button" data-hoa-version="${x.sourceVersion}">عرض الإثبات PDF</button></p>`).join('') || '<p>لا توجد اعتمادات إدارية محفوظة لهذا المستند.</p>';
    if (r.hasMoreReceipts) $('[data-hoa-history]').insertAdjacentHTML('beforeend','<p>المعروض أحدث 100 إثبات؛ هذه ليست قائمة كاملة.</p>');
    controls();
  }
  async function load() {
    s.generation++; const c = context(); s.plan = null; s.busy = true; s.uncertain = false; revokePdf();
    $('[data-hoa-admin]').checked = false; $('[data-hoa-limits]').checked = false;$('[data-hoa-revision-note]').value='';$('[data-hoa-revision-confirm]').checked=false;$('[data-hoa-revision]').hidden=true;
    for (const q of ['source','existing','history']) $(`[data-hoa-${q}]`).replaceChildren(); controls(); status('جارٍ قراءة النسخة المحفوظة ونطاق الاعتماد…');
    try { const r = await request(c); if (!current(c) || !r) return; validate(r,c); s.plan = r; render(); status(r.existing ? 'الاعتماد الإداري مسجل؛ لا حاجة إلى تكرار الإجراء.' : r.eligible ? 'راجع النسخة المحفوظة ثم أدخل ملاحظتك وأكّد النطاق. مدخلات المصدر غير المحفوظة مستبعدة.' : 'التسجيل غير متاح لهذا النوع أو الإصدار؛ المسار المستقل لم يتغير.'); }
    catch (e) { if (current(c)){s.plan=null;for(const q of ['source','existing','history'])$(`[data-hoa-${q}]`).replaceChildren();status(e.message);} }
    finally { if (current(c)) { s.busy=false; controls(); } }
  }
  $('[data-hoa-form]').addEventListener('input', e => { if (e.target.matches('[data-hoa-note]')) { $('[data-hoa-admin]').checked=false; $('[data-hoa-limits]').checked=false; } controls(); });
  $('[data-hoa-form]').addEventListener('submit', async e => {
    e.preventDefault(); const c=context(), p=s.plan;
    if (!current(c) || s.busy || s.uncertain || !p?.eligible || !consent()) return;
    const body={expectedVersion:p.sourceVersion,reviewHash:p.reviewHash,note:$('[data-hoa-note]').value.trim(),administrativeOnly:true,notIndependentApproval:true};
    s.busy=true; controls(); status('جارٍ حفظ اعتماد المالك الإداري لهذه النسخة…');
    try {
      const r=await request(c,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!current(c)||!r)return;
      if(r.schemaVersion!==1||r.organizationId!==c.org||r.documentId!==c.id||r.sourceVersion!==p.sourceVersion||!validReceipt(r.receipt,c,p.sourceVersion))throw new Error('لم يُتحقق من نتيجة الحفظ؛ أعد قراءة الحالة، ولا تكرر الطلب مباشرة.');
      s.plan.eligible=false;$('[data-hoa-form]').reset(); const reloadGeneration=s.generation+1; await load();
      if(current({...c,generation:reloadGeneration})){document.dispatchEvent(new CustomEvent('hydroland:owner-approval-recorded',{detail:{organizationId:c.org,documentId:c.id}}));status('سُجل اعتماد المالك الإداري لهذه النسخة. المراجعات المتخصصة والتوقيعات تبقى في مساراتها.');}
    } catch(e) { if(current(c)){s.uncertain=true;$('[data-hoa-admin]').checked=false;$('[data-hoa-limits]').checked=false;status(e.message+' لا يعاد إرسال الطلب تلقائيًا.');} }
    finally { if(current(c)){s.busy=false;controls();} }
  });
  $('[data-hoa-revision]').addEventListener('input',e=>{if(e.target.matches('[data-hoa-revision-note]'))$('[data-hoa-revision-confirm]').checked=false;controls();});
  $('[data-hoa-reopen]').addEventListener('click',async()=>{
    const c=context(),p=s.plan;if(!current(c)||s.busy||$('[data-hoa-reopen]').disabled)return;
    const body={expectedVersion:p.sourceVersion,receiptHash:p.existing.receiptHash,note:$('[data-hoa-revision-note]').value.trim(),confirmed:true};
    s.busy=true;controls();status('جارٍ إنشاء نسخة جديدة مع حفظ الاعتماد السابق…');
    try{const r=await request(c,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},'/reopen');if(!current(c)||!r)return;
      if(r.schemaVersion!==1||r.organizationId!==c.org||r.documentId!==c.id||r.sourceVersion!==p.sourceVersion+1||r.status!=='DRAFT'||r.previousApprovalRetained!==true)throw new Error('لم يُتحقق من النسخة الجديدة؛ أعد قراءة الحالة قبل تكرار الإجراء.');
      clear();document.dispatchEvent(new CustomEvent('hydroland:owner-approval-recorded',{detail:{organizationId:c.org,documentId:c.id,reopened:true}}));
    }catch(e){if(current(c)){s.uncertain=true;$('[data-hoa-revision-confirm]').checked=false;status(e.message+' لا يعاد إرسال الطلب تلقائيًا.');}}
    finally{if(current(c)){s.busy=false;controls();}}
  });
  $('[data-hoa-history]').addEventListener('click', async e => {
    const b=e.target.closest('[data-hoa-version]'),c=context();if(!b||s.busy||!current(c))return;
    const v=Number(b.dataset.hodVersion);if(!s.plan?.receipts.some(x=>x.sourceVersion===v))return;
    s.busy=true;controls();revokePdf();status('جارٍ فتح إثبات اعتماد المالك الإداري المحفوظ…');
    try {
      const r=await auth().authorizedFetch(path(c)+`/pdf?version=${v}`,{cache:'no-store'});if(!current(c))return;
      if([401,403].includes(r.status)){clear();return;}
      if(!r.ok||!r.headers.get('content-type')?.includes('application/pdf'))throw new Error('تعذر قراءة إثبات PDF.');
      const blob=await r.blob();if(!current(c))return;
      if(blob.size>20000000||await blob.slice(0,5).text()!=='%PDF-')throw new Error('ملف الإثبات غير صالح.');if(!current(c))return;
      s.pdf=URL.createObjectURL(blob);$('[data-hoa-pdf-frame]').src=s.pdf;$('[data-hoa-pdf-link]').href=s.pdf;$('[data-hoa-pdf]').hidden=false;status('إثبات اعتماد المالك الإداري المحفوظ — ليس توقيعًا إلكترونيًا أو اعتمادًا مستقلاً.');
    }catch(e){if(current(c))status(e.message);}finally{if(current(c)){s.busy=false;controls();}}
  });
  $('[data-hoa-reload]').addEventListener('click',()=>{if(!s.busy)void load();});
  $('[data-hoa-close]').addEventListener('click',()=>{if(abandon())clear();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(abandon())clear();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed','hydroland:auth-changed'])document.addEventListener(name,clear);
  document.addEventListener('change',e=>{if(e.target.matches?.('#hl-documents [data-doc-org]'))clear();});
  window.HydrolandOwnerApproval={open:({organizationId,documentId})=>{
    if(!auth()?.isAuthenticated?.()||!organizationId||!documentId)return;
    if(dialog.open&&(s.busy||!abandon()))return;clear();s.org=organizationId;s.id=documentId;s.session=session();dialog.showModal();void load();
  },clear};
})();
