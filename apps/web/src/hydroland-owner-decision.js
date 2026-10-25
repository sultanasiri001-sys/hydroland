/* A separately labelled administrative record, never a generic approval/signature. */
(() => {
  'use strict';
  if (window.HydrolandOwnerDecision) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth = () => window.HydrolandAuth;
  const session = () => auth()?.getSessionVersion?.();
  const dialog = document.createElement('dialog'); dialog.id = 'hl-owner-decision'; dialog.dir = 'rtl';
  dialog.setAttribute('aria-labelledby', 'hod-title');
  dialog.innerHTML = `<header><h2 id="hod-title">قرار إداري من المالك</h2><button type="button" data-hod-close>إغلاق</button></header>
    <p class="hod-warning">لإثبات محضر أو متابعة روتينية فقط. ليس مراجعة مستقلة أو اعتمادًا ماليًا أو قانونيًا أو تعاقديًا أو قرارًا وظيفيًا أو تصريح سلامة أو توقيعًا إلكترونيًا.</p>
    <p>هذا سجل منفصل مرتبط بإصدار محفوظ من المستند. لا يغيّر مسار اعتماد المصدر. تعديل المصدر لاحقًا لا يغيّر القرار السابق ولا ينقله للإصدار الجديد.</p>
    <p data-hod-status role="status" aria-live="polite"></p><button type="button" data-hod-reload>إعادة قراءة الحالة المحفوظة</button>
    <section data-hod-source></section><section data-hod-existing></section>
    <form data-hod-form><fieldset data-hod-controls disabled><legend>تسجيل القرار الروتيني</legend>
      <label>ملاحظة المالك وتوجيه المتابعة<textarea data-hod-note rows="4" maxlength="2000" required></textarea></label>
      <label class="hod-check"><input type="checkbox" data-hod-routine required> راجعت النسخة المحفوظة وأؤكد أن هذا إثبات محضر أو متابعة روتينية فقط؛ لا ينشئ التزامًا ماليًا أو تعاقديًا أو قرار موظف أو اعتمادًا قانونيًا أو تصريح سلامة.</label>
      <label class="hod-check"><input type="checkbox" data-hod-limits required> أفهم أنه قرار صادر مني بصفتي المالك، وليس اعتمادًا مستقلًا أو توقيعًا إلكترونيًا، وأن المدخلات غير المحفوظة في شاشة المصدر ليست جزءًا منه.</label>
      <button type="submit" data-hod-record disabled>تسجيل قرار المالك لهذا الإصدار</button>
    </fieldset></form><section><h3>إثباتات القرارات المحفوظة</h3><div data-hod-history></div></section>
    <section data-hod-pdf hidden><a data-hod-pdf-link target="_blank" rel="noopener">فتح إثبات القرار PDF</a><iframe title="إثبات قرار المالك — ليس توقيعًا إلكترونيًا" data-hod-pdf-frame></iframe></section>`;
  const style = document.createElement('style');
  style.textContent = '#hl-owner-decision{box-sizing:border-box;width:min(850px,94vw);max-height:92vh;overflow:auto;border:1px solid #2c799a;border-radius:14px;padding:24px;background:#f5f8fa;color:#153247;font:15px/1.8 Arial,sans-serif}#hl-owner-decision::backdrop{background:#071e30b3}#hl-owner-decision *{box-sizing:border-box;overflow-wrap:anywhere}#hl-owner-decision header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid #1297c0}#hl-owner-decision button{background:#153247;color:white;padding:10px 14px;border:0;border-radius:7px;cursor:pointer}#hl-owner-decision button:disabled{opacity:.45;cursor:not-allowed}#hl-owner-decision label{display:grid;gap:6px;margin:14px 0}#hl-owner-decision .hod-check{display:flex;gap:10px;align-items:flex-start}#hl-owner-decision input{flex-shrink:0;margin-top:7px}#hl-owner-decision textarea{width:100%;border:1px solid #a8c3d2;padding:10px;font:inherit}#hl-owner-decision fieldset{border:1px solid #a8c3d2;min-width:0;margin:18px 0}#hl-owner-decision .hod-warning{border-right:4px solid #be942d;padding:14px;background:#fff5db;font-weight:700}#hl-owner-decision dl{background:white;padding:14px;border:1px solid #d1e1e8}#hl-owner-decision dt{font-weight:bold}#hl-owner-decision dd{margin:4px 0 12px;white-space:pre-wrap}#hl-owner-decision [data-hod-history]>p{display:flex;gap:14px;align-items:center;justify-content:space-between}#hl-owner-decision iframe{width:100%;height:65vh;border:1px solid #a8c3d2;margin-top:12px}@media(max-width:600px){#hl-owner-decision{padding:14px}#hl-owner-decision h2{font-size:20px}}';
  document.head.appendChild(style); document.body.appendChild(dialog);
  const $ = q => dialog.querySelector(q);
  const s = { generation: 0, org: '', id: '', session: null, plan: null, busy: false, uncertain: false, pdf: null };
  const context = () => ({ generation: s.generation, org: s.org, id: s.id, session: s.session });
  const current = c => dialog.open && c.generation === s.generation && c.org === s.org && c.id === s.id && c.session === session() && auth()?.isAuthenticated?.() && document.querySelector('#hl-documents [data-doc-org]')?.value === c.org && !document.querySelector('#hl-documents')?.hidden;
  const status = text => { $('[data-hod-status]').textContent = text; };
  const consent = () => $('[data-hod-routine]').checked && $('[data-hod-limits]').checked && Boolean($('[data-hod-note]').value.trim());
  function controls() {
    $('[data-hod-controls]').disabled = s.busy || s.uncertain || !s.plan?.eligible;
    $('[data-hod-record]').disabled = s.busy || s.uncertain || !s.plan?.eligible || !consent();
    $('[data-hod-reload]').disabled = s.busy;
    for (const b of dialog.querySelectorAll('[data-hod-version]')) b.disabled = s.busy;
  }
  function revokePdf() { if (s.pdf) URL.revokeObjectURL(s.pdf); s.pdf = null; $('[data-hod-pdf-frame]').removeAttribute('src'); $('[data-hod-pdf-link]').removeAttribute('href'); $('[data-hod-pdf]').hidden = true; }
  function clear() { s.generation++; s.org = ''; s.id = ''; s.plan = null; s.busy = false; s.uncertain = false; revokePdf(); $('[data-hod-form]').reset(); for (const q of ['source','existing','history']) $(`[data-hod-${q}]`).replaceChildren(); status(''); controls(); if (dialog.open) dialog.close(); }
  function draft() { return Boolean($('[data-hod-note]').value.trim() || $('[data-hod-routine]').checked || $('[data-hod-limits]').checked); }
  function abandon() { return !draft() || window.confirm('توجد ملاحظات أو تأكيدات غير مسجلة؛ هل تريد تركها؟'); }
  const path = c => `/documents/organizations/${encodeURIComponent(c.org)}/documents/${encodeURIComponent(c.id)}/owner-decision`;
  async function request(c, options = {}) {
    const response = await auth().authorizedFetch(path(c), { cache: 'no-store', ...options });
    const body = await response.json().catch(() => null);
    if (!current(c)) return null;
    if ([401,403].includes(response.status)) { clear(); return null; }
    if (!response.ok) throw new Error(response.status === 409 ? 'تغيّرت الحالة أو سُجل القرار بالفعل؛ أعد قراءة النتيجة قبل أي محاولة جديدة.' : 'تعذر إكمال الإجراء. أعد قراءة الحالة المحفوظة للتحقق.');
    return body;
  }
  function validReceipt(r, c, v) { return r && r.policy === 'ROUTINE_OWNER_RECORD_V1' && r.organizationId === c.org && r.documentId === c.id && r.sourceVersion === v && r.status === 'OWNER_DECISION_RECORDED' && r.independentReview === false && r.electronicSignature === false && r.originalWorkflowUnchanged === true && typeof r.referenceNumber === 'string' && typeof r.note === 'string'; }
  function validate(r, c) {
    if (!r || r.schemaVersion !== 1 || r.policy !== 'ROUTINE_OWNER_RECORD_V1' || r.organizationId !== c.org || r.documentId !== c.id || !Number.isSafeInteger(r.sourceVersion) || r.sourceVersion < 1 || typeof r.eligible !== 'boolean' || r.originalWorkflowUnchanged !== true || !Array.isArray(r.receipts) || r.receipts.length > 100 || r.receipts.some(x => !Number.isSafeInteger(x.sourceVersion) || x.sourceVersion < 1 || typeof x.referenceNumber !== 'string')) throw new Error('لم يُتحقق من نطاق النتيجة؛ لم يُفعّل التسجيل.');
    if (r.eligible && (!/^[a-f0-9]{64}$/.test(r.reviewHash) || !r.source || r.source.documentId !== c.id || r.source.organizationId !== c.org || r.source.version !== r.sourceVersion || !Array.isArray(r.source.template?.fields) || !r.source.payload || r.existing || !['RECORD_ROUTINE_MINUTES','NOTE_ROUTINE_PROGRESS'].includes(r.purpose))) throw new Error('خطة القرار غير متسقة؛ لم يُفعّل التسجيل.');
    if(r.eligible){const definition={'ADM-MEETING-MINUTES':['ADMIN_AFFAIRS_RECORDS','RECORD_ROUTINE_MINUTES',['meetingNo','subject','decisions']],'EXE-FOLLOWUP':['EXECUTIVE_GOVERNANCE','NOTE_ROUTINE_PROGRESS',['decisionNo','owner','evidence']]};const t=r.source.template,d=Object.hasOwn(definition,t.code)?definition[t.code]:null;if(!d||r.source.department!==d[0]||r.purpose!==d[1]||t.fields.length!==3||new Set(t.fields.map(f=>f?.key)).size!==3||t.fields.some(f=>!f||!d[2].includes(f.key)||typeof r.source.payload[f.key]!=='string'))throw new Error('تعريف المصدر خارج نطاق القرار الروتيني.');}
    if (r.existing && !validReceipt(r.existing,c,r.sourceVersion)) throw new Error('تعذر التحقق من إثبات القرار المحفوظ.');
  }
  function render() {
    const r = s.plan;
    $('[data-hod-source]').innerHTML = r.source ? `<h3>النسخة المحفوظة محل القرار</h3><p>${esc(r.source.referenceNumber)} · الإصدار ${r.sourceVersion} · ${esc(r.source.template.titleAr)}</p><dl>${r.source.template.fields.map(f=>`<dt>${esc(f.labelAr||f.key)}</dt><dd>${esc(r.source.payload[f.key])}</dd>`).join('')}</dl>` : '<p>هذا المستند خارج النطاق أو في حالة نهائية. لا يمكن تسجيل قرار جديد له من هذا المسار.</p>';
    $('[data-hod-existing]').textContent = r.existing ? `قرار المالك مسجل لهذا الإصدار: ${r.existing.referenceNumber}. ${r.existing.note} لم تتغير حالة اعتماد المصدر.` : '';
    $('[data-hod-history]').innerHTML = r.receipts.map(x=>`<p><span>${esc(x.referenceNumber)} · إصدار المصدر ${x.sourceVersion}</span><button type="button" data-hod-version="${x.sourceVersion}">عرض الإثبات PDF</button></p>`).join('') || '<p>لا توجد إثباتات قرار محفوظة لهذا المستند.</p>';
    if (r.hasMoreReceipts) $('[data-hod-history]').insertAdjacentHTML('beforeend','<p>المعروض أحدث 100 إثبات؛ هذه ليست قائمة كاملة.</p>');
    controls();
  }
  async function load() {
    s.generation++; const c = context(); s.plan = null; s.busy = true; s.uncertain = false; revokePdf();
    $('[data-hod-routine]').checked = false; $('[data-hod-limits]').checked = false;
    for (const q of ['source','existing','history']) $(`[data-hod-${q}]`).replaceChildren(); controls(); status('جارٍ قراءة النسخة المحفوظة ونطاق القرار…');
    try { const r = await request(c); if (!current(c) || !r) return; validate(r,c); s.plan = r; render(); status(r.existing ? 'القرار مسجل؛ لا حاجة إلى تكرار الإجراء.' : r.eligible ? 'راجع النسخة المحفوظة ثم أدخل ملاحظتك وأكّد النطاق. مدخلات المصدر غير المحفوظة مستبعدة.' : 'التسجيل غير متاح لهذا النوع أو الإصدار؛ المسار المستقل لم يتغير.'); }
    catch (e) { if (current(c)){s.plan=null;for(const q of ['source','existing','history'])$(`[data-hod-${q}]`).replaceChildren();status(e.message);} }
    finally { if (current(c)) { s.busy=false; controls(); } }
  }
  $('[data-hod-form]').addEventListener('input', e => { if (e.target.matches('[data-hod-note]')) { $('[data-hod-routine]').checked=false; $('[data-hod-limits]').checked=false; } controls(); });
  $('[data-hod-form]').addEventListener('submit', async e => {
    e.preventDefault(); const c=context(), p=s.plan;
    if (!current(c) || s.busy || s.uncertain || !p?.eligible || !consent()) return;
    const body={expectedVersion:p.sourceVersion,reviewHash:p.reviewHash,note:$('[data-hod-note]').value.trim(),routineOnly:true,notIndependentApproval:true};
    s.busy=true; controls(); status('جارٍ تسجيل قرار المالك دون تغيير اعتماد المصدر…');
    try {
      const r=await request(c,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!current(c)||!r)return;
      if(r.schemaVersion!==1||r.organizationId!==c.org||r.documentId!==c.id||r.sourceVersion!==p.sourceVersion||!validReceipt(r.receipt,c,p.sourceVersion))throw new Error('لم يُتحقق من نتيجة الحفظ؛ أعد قراءة الحالة، ولا تكرر الطلب مباشرة.');
      s.plan.eligible=false;$('[data-hod-form]').reset(); const reloadGeneration=s.generation+1; await load();
      if(current({...c,generation:reloadGeneration}))status('سُجل قرار المالك لهذا الإصدار. لا يمثل اعتمادًا مستقلًا أو توقيعًا، ولم تتغير حالة المستند المصدر.');
    } catch(e) { if(current(c)){s.uncertain=true;$('[data-hod-routine]').checked=false;$('[data-hod-limits]').checked=false;status(e.message+' لا يعاد إرسال الطلب تلقائيًا.');} }
    finally { if(current(c)){s.busy=false;controls();} }
  });
  $('[data-hod-history]').addEventListener('click', async e => {
    const b=e.target.closest('[data-hod-version]'),c=context();if(!b||s.busy||!current(c))return;
    const v=Number(b.dataset.hodVersion);if(!s.plan?.receipts.some(x=>x.sourceVersion===v))return;
    s.busy=true;controls();revokePdf();status('جارٍ فتح إثبات قرار المالك المحفوظ…');
    try {
      const r=await auth().authorizedFetch(path(c)+`/pdf?version=${v}`,{cache:'no-store'});if(!current(c))return;
      if([401,403].includes(r.status)){clear();return;}
      if(!r.ok||!r.headers.get('content-type')?.includes('application/pdf'))throw new Error('تعذر قراءة إثبات PDF.');
      const blob=await r.blob();if(!current(c))return;
      if(blob.size>20000000||await blob.slice(0,5).text()!=='%PDF-')throw new Error('ملف الإثبات غير صالح.');if(!current(c))return;
      s.pdf=URL.createObjectURL(blob);$('[data-hod-pdf-frame]').src=s.pdf;$('[data-hod-pdf-link]').href=s.pdf;$('[data-hod-pdf]').hidden=false;status('إثبات قرار المالك المحفوظ — ليس توقيعًا إلكترونيًا أو اعتمادًا مستقلاً.');
    }catch(e){if(current(c))status(e.message);}finally{if(current(c)){s.busy=false;controls();}}
  });
  $('[data-hod-reload]').addEventListener('click',()=>{if(!s.busy)void load();});
  $('[data-hod-close]').addEventListener('click',()=>{if(abandon())clear();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(abandon())clear();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed','hydroland:auth-changed'])document.addEventListener(name,clear);
  document.addEventListener('change',e=>{if(e.target.matches?.('#hl-documents [data-doc-org]'))clear();});
  window.HydrolandOwnerDecision={open:({organizationId,documentId})=>{
    if(!auth()?.isAuthenticated?.()||!organizationId||!documentId)return;
    if(dialog.open&&(s.busy||!abandon()))return;clear();s.org=organizationId;s.id=documentId;s.session=session();dialog.showModal();void load();
  },clear};
})();
