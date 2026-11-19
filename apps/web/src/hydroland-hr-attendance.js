(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("hr-attendance", {
  "مسودة": "Draft",
  "مقدم": "Submitted",
  "مراجعة الموارد البشرية": "HR review",
  "بانتظار الاعتماد": "Awaiting approval",
  "معتمد": "Approved",
  "مرفوض": "Rejected",
  "ملغى": "Cancelled",
  "نافذ": "Effective",
  "مقفل": "Closed",
  "نشط": "Active",
  "في إجازة": "On leave",
  "موقوف": "Stopped",
  "منتهٍ": "Ended",
  "مغلق وظيفيًا": "Employment closed",
  "حاضر": "Present",
  "غائب": "Absent",
  "قيد المراجعة": "Under review",
  "تعذر التحقق من نطاق قائمة السجلات.": "Could not verify record-list scope.",
  "تعذر التحقق من نطاق نتيجة فحص الحضور.": "Could not verify attendance-check result scope.",
  "فحص مراجع المدخلات غير المحفوظة": "Check references from unsaved entries",
  "فحص مراجع النسخة المحفوظة": "Check saved-version references",
  "وقت القراءة:": "Read time:",
  "نتيجة السجلات غير متسقة.": "Record result is inconsistent.",
  "أدخل معرفات السجلات المحفوظة وتاريخ العودة عند انطباقه.": "Enter saved record IDs and the return date where applicable.",
  "لا تتطابق السجلات المطلوبة مع الموظف داخل هذه الجهة.": "Requested records do not match the employee in this organization.",
  "لم تتطابق نتيجة السجل مع مراجع النموذج.": "Record result does not match form references.",
  "نعم": "Yes",
  "لا": "No",
  "تطابق المراجع": "Reference match",
  "سجل حضور مرتبط بالموظف المحدد": "Attendance record linked to the selected employee",
  "مرجع الموظف": "Employee reference",
  "حالة الموظف": "Employee status",
  "مرجع الحضور": "Attendance reference",
  "يوم الحضور": "Attendance day",
  "حالة الحضور المسجلة": "Recorded attendance status",
  "وقت دخول محفوظ": "Saved check-in time",
  "وقت خروج محفوظ": "Saved check-out time",
  "يوم الدخول يطابق يوم الحضور بتوقيت الرياض": "Check-in day matches attendance day in Riyadh time",
  "ترتيب وقت الدخول والخروج متسق": "Check-in and check-out times are in a consistent order",
  "مرجع الإجازة": "Leave reference",
  "حالة الإجازة": "Leave status",
  "بداية الإجازة": "Leave starts",
  "نهاية الإجازة": "Leave ends",
  "صاحب اعتماد الإجازة مسجل": "Leave approver is recorded",
  "تاريخ العودة يطابق يوم الحضور": "Return date matches attendance day",
  "تاريخ العودة بعد يوم نهاية الإجازة": "Return date is after the last leave day",
  "ترتيب تواريخ الإجازة متسق": "Leave dates are in a consistent order",
  "سجل إجازة معتمد مع صاحب قرار": "Approved leave record with an identified decision-maker",
  "توجد بيانات تحتاج مراجعة؛ تطابق المعرفات وحده لا يكفي لإثبات العودة.": "Some data requires review. Matching IDs alone does not establish return to work.",
  "الفحص يقرأ السجلات الحالية فقط. اعتماد الإجازة والعودة للعمل وتسوية الحضور تبقى في مساراتها المختصة.": "This check reads current records only. Leave approval, return to work and attendance reconciliation remain in their respective workflows.",
  "اختر سجلًا محفوظًا": "Select a saved record",
  "سجلات أقدم": "Older records",
  "اختيار سجل الإجازة": "Select leave record",
  "اختيار سجل الحضور": "Select attendance record",
  "فحص مراجع الحضور والإجازة": "Check attendance and leave references",
  "تحميل الإجازات المحفوظة": "Load saved leave records",
  "تحميل حضور الموظف المحدد": "Load selected employee's attendance",
  "تحميل سجلات الحضور المحفوظة": "Load saved attendance records",
  "اختر إجازة محفوظة أو أدخل مرجع الموظف أولًا.": "Select saved leave or enter the employee reference first.",
  "جارٍ قراءة السجلات…": "Reading records…",
  "سجلًا معروضًا. الاختيار يملأ المراجع المرتبطة فقط.": "records shown. Selection fills linked references only.",
  "لا توجد إجازات محفوظة في هذا النطاق.": "No saved leave records in this scope.",
  "لا توجد سجلات حضور محفوظة في هذا النطاق.": "No saved attendance records in this scope.",
  "تعذرت قراءة السجلات.": "Could not read records.",
  "جارٍ فحص مراجع السجلات…": "Checking record references…",
  "تعذر فحص السجلات.": "Could not check records.",
  "{0} سجلًا معروضًا. الاختيار يملأ المراجع المرتبطة فقط.": "{0} records shown. Selection fills linked references only."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const authoredLabel = (v) => (Object.hasOwn(states, v) ? (value=>value===undefined?value:uiLocale.message(value))(states[v]) : v);
  const authoredYes = (v) => (v ? uiLocale.message('نعم') : uiLocale.message('لا'));

  if (window.HydrolandHrAttendance) return;
  const policy = 'HR_ATTENDANCE_REFERENCE_CHECK_V1';
  const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
  const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  const text = v => typeof v === 'string' && v.length <= 500;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const states = { DRAFT: 'مسودة', SUBMITTED: 'مقدم', HR_REVIEW: 'مراجعة الموارد البشرية', APPROVAL_REQUIRED: 'بانتظار الاعتماد', APPROVED: 'معتمد', REJECTED: 'مرفوض', CANCELLED: 'ملغى', EFFECTIVE: 'نافذ', CLOSED: 'مقفل', PENDING_APPROVAL: 'بانتظار الاعتماد', ACTIVE: 'نشط', ON_LEAVE: 'في إجازة', SUSPENDED: 'موقوف', TERMINATED: 'منتهٍ', OFFBOARDED: 'مغلق وظيفيًا', PRESENT: 'حاضر', ABSENT: 'غائب', PENDING: 'قيد المراجعة' };
  const label = v => Object.hasOwn(states, v) ? states[v] : v;
  const supports = t => t?.department === 'HR' && ['HR-ATTENDANCE-SUMMARY', 'HR-LEAVE-RETURN'].includes(t.code);
  function candidates(r, org, kind, employee) {
    if (!r || r.schemaVersion !== 1 || r.policy !== policy || r.organizationId !== org || r.kind !== kind || r.employeeReference !== employee || r.readOnly !== true || !Array.isArray(r.items) || r.items.length > 50 || typeof r.hasMore !== 'boolean' || (r.hasMore ? !uuid(r.nextCursor) : r.nextCursor !== null) || r.items.some(x => !x || !uuid(x.id) || !uuid(x.employmentId) || employee && x.employmentId !== employee || !text(x.name) || !text(x.status) || (kind === 'ATTENDANCE' ? !day(x.workDate) : !day(x.startsOn) || !day(x.endsOn))) || new Set(r.items.map(x => x.id)).size !== r.items.length || r.hasMore && r.nextCursor !== r.items.at(-1)?.id) throw localError(uiLocale.message('تعذر التحقق من نطاق قائمة السجلات.'));
  }
  function format(r, x) {
    if (!r || r.schemaVersion !== 1 || r.policy !== policy || r.organizationId !== x.organizationId || r.templateId !== x.templateId || r.templateVersion !== x.templateVersion || r.templateCode !== x.templateCode || r.kind !== x.kind || r.documentId !== x.documentId || r.documentVersion !== x.documentVersion || r.readOnly !== true || r.operationalClosureVerified !== false || r.returnToWorkEstablished !== false || !['MATCHED', 'INVALID_REFERENCES', 'SOURCE_UNAVAILABLE'].includes(r.match) || typeof r.observedAt !== 'string' || !Number.isFinite(Date.parse(r.observedAt))) throw localError(uiLocale.message('تعذر التحقق من نطاق نتيجة فحص الحضور.'));
    const lines = [uiLocale.html`<strong>${uiLocale.messageHTML((x.kind === 'UNSAVED_REFERENCE_PREVIEW' ? uiLocale.message('فحص مراجع المدخلات غير المحفوظة') : uiLocale.message('فحص مراجع النسخة المحفوظة')))}</strong>`, uiLocale.html`<p>وقت القراءة: ${esc(new Date(r.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))}</p>`];
    if (r.match !== 'MATCHED') {
      if (r.source !== null) throw localError(uiLocale.message('نتيجة السجلات غير متسقة.'));
      lines.push(uiLocale.html`<p>${uiLocale.messageHTML((r.match === 'INVALID_REFERENCES' ? uiLocale.message('أدخل معرفات السجلات المحفوظة وتاريخ العودة عند انطباقه.') : uiLocale.message('لا تتطابق السجلات المطلوبة مع الموظف داخل هذه الجهة.')))}</p>`);
    } else {
      const s = r.source, a = s?.attendance, l = s?.leave, c = s?.returnChecks, returning = x.templateCode === 'HR-LEAVE-RETURN';
      if (!s || !uuid(s.employmentId) || s.employmentId !== x.input.employeeReference.toLowerCase() || !text(s.employmentStatus) || !a || !uuid(a.id) || a.id !== x.input.attendanceReference.toLowerCase() || !day(a.workDate) || !text(a.status) || ['clockInRecorded', 'clockOutRecorded', 'clockInMatchesWorkDate', 'clockTimesConsistent'].some(k => typeof a[k] !== 'boolean') || (returning ? !l || !uuid(l.id) || l.id !== x.input.leaveReference.toLowerCase() || !text(l.status) || !day(l.startsOn) || !day(l.endsOn) || typeof l.approverPresent !== 'boolean' || !c || c.requestedReturnDate !== x.input.returnDate || !day(c.requestedReturnDate) || ['dateMatchesAttendance', 'dateAfterLeaveEndDate', 'leaveDatesConsistent', 'approvedLeaveRecord'].some(k => typeof c[k] !== 'boolean') : l !== null || c !== null)) throw localError(uiLocale.message('لم تتطابق نتيجة السجل مع مراجع النموذج.'));
      const yes = v => v ? uiLocale.t('نعم') : uiLocale.t('لا');
      const facts = [[uiLocale.message('تطابق المراجع'), uiLocale.message('سجل حضور مرتبط بالموظف المحدد')], [uiLocale.message('مرجع الموظف'), s.employmentId], [uiLocale.message('حالة الموظف'), authoredLabel(s.employmentStatus)], [uiLocale.message('مرجع الحضور'), a.id], [uiLocale.message('يوم الحضور'), a.workDate], [uiLocale.message('حالة الحضور المسجلة'), authoredLabel(a.status)], [uiLocale.message('وقت دخول محفوظ'), authoredYes(a.clockInRecorded)], [uiLocale.message('وقت خروج محفوظ'), authoredYes(a.clockOutRecorded)], [uiLocale.message('يوم الدخول يطابق يوم الحضور بتوقيت الرياض'), authoredYes(a.clockInMatchesWorkDate)], [uiLocale.message('ترتيب وقت الدخول والخروج متسق'), authoredYes(a.clockTimesConsistent)]];
      if (returning) facts.push([uiLocale.message('مرجع الإجازة'), l.id], [uiLocale.message('حالة الإجازة'), authoredLabel(l.status)], [uiLocale.message('بداية الإجازة'), l.startsOn], [uiLocale.message('نهاية الإجازة'), l.endsOn], [uiLocale.message('صاحب اعتماد الإجازة مسجل'), authoredYes(l.approverPresent)], [uiLocale.message('تاريخ العودة يطابق يوم الحضور'), authoredYes(c.dateMatchesAttendance)], [uiLocale.message('تاريخ العودة بعد يوم نهاية الإجازة'), authoredYes(c.dateAfterLeaveEndDate)], [uiLocale.message('ترتيب تواريخ الإجازة متسق'), authoredYes(c.leaveDatesConsistent)], [uiLocale.message('سجل إجازة معتمد مع صاحب قرار'), authoredYes(c.approvedLeaveRecord)]);
      lines.push(uiLocale.html`<dl>${facts.map(([k, v]) => uiLocale.html`<dt>${uiLocale.messageHTML(k)}</dt><dd>${uiLocale.messageHTML(v)}</dd>`).join('')}</dl>`);
      if (!a.clockInRecorded || !a.clockInMatchesWorkDate || !a.clockTimesConsistent || returning && Object.entries(c).some(([k, v]) => k !== 'requestedReturnDate' && !v)) lines.push(uiLocale.html`<p>توجد بيانات تحتاج مراجعة؛ تطابق المعرفات وحده لا يكفي لإثبات العودة.</p>`);
    }
    lines.push(uiLocale.html`<p>الفحص يقرأ السجلات الحالية فقط. اعتماد الإجازة والعودة للعمل وتسوية الحضور تبقى في مساراتها المختصة.</p>`);
    return lines.join('');
  }
  function mount({ host, form, request, organizationId, template, valid, onDenied = () => {} }) {
    const returning = template.code === 'HR-LEAVE-RETURN';
    let disposed = false, previewEpoch = 0;
    const alive = () => !disposed && valid() && host.isConnected;
    const field = k => form.elements.namedItem(k);
    const value = k => String(field(k)?.value || '').trim();
    const picker = (kind, title) => uiLocale.html`<section data-hr-picker="${kind}"><button type="button" data-hr-load="${kind}">${uiLocale.messageHTML(title)}</button><label>${uiLocale.messageHTML((kind === 'LEAVE' ? uiLocale.message('اختيار سجل الإجازة') : uiLocale.message('اختيار سجل الحضور')))}<select data-hr-select="${kind}"><option value="">اختر سجلًا محفوظًا</option></select></label><button type="button" data-hr-more="${kind}" hidden>سجلات أقدم</button><p data-hr-picker-status="${kind}" role="status"></p></section>`;
    uiLocale.setHTML(host, uiLocale.html`${returning ? picker('LEAVE', uiLocale.message('تحميل الإجازات المحفوظة')) : ''}${picker('ATTENDANCE', (returning ? uiLocale.message('تحميل حضور الموظف المحدد') : uiLocale.message('تحميل سجلات الحضور المحفوظة')))}<button type="button" data-hr-attendance-preview>فحص مراجع الحضور والإجازة</button><div data-hr-attendance-result role="status" aria-live="polite" hidden></div>`);
    const box = host.querySelector('[data-hr-attendance-result]'), sets = new Map((returning ? ['LEAVE', 'ATTENDANCE'] : ['ATTENDANCE']).map(k => [k, { epoch: 0, items: [], cursor: null }]));
    const clear = () => { previewEpoch++; box.replaceChildren(); box.hidden = true; host.querySelector('[data-hr-attendance-preview]').disabled = false; };
    function reset(kind) {
      const s = sets.get(kind); if (!s) return; s.epoch++; s.items = []; s.cursor = null;
      uiLocale.setHTML(host.querySelector(`[data-hr-select="${kind}"]`), uiLocale.html`<option value="">اختر سجلًا محفوظًا</option>`);
      uiLocale.setMessage(host.querySelector(`[data-hr-picker-status="${kind}"]`), '');
      host.querySelector(`[data-hr-more="${kind}"]`).hidden = true;
      host.querySelector(`[data-hr-load="${kind}"]`).disabled = false;
    }
    async function load(kind, append) {
      if (!alive()) return;
      const s = sets.get(kind), employee = returning && kind === 'ATTENDANCE' ? value('employeeReference').toLowerCase() : null;
      const status = host.querySelector(`[data-hr-picker-status="${kind}"]`);
      if (returning && kind === 'ATTENDANCE' && !uuid(employee)) { reset(kind); uiLocale.setMessage(status, uiLocale.message('اختر إجازة محفوظة أو أدخل مرجع الموظف أولًا.')); return; }
      const ticket = ++s.epoch, current = () => alive() && ticket === s.epoch && (!employee || employee === value('employeeReference').toLowerCase());
      const b = host.querySelector(`[data-hr-${append ? 'more' : 'load'}="${kind}"]`); b.disabled = true; uiLocale.setMessage(status, uiLocale.message('جارٍ قراءة السجلات…'));
      try {
        const params = new URLSearchParams({ kind }); if (employee) params.set('employeeReference', employee); if (append && s.cursor) params.set('cursor', s.cursor);
        const r = await request(`/documents/organizations/${encodeURIComponent(organizationId)}/hr-attendance-candidates?${params}`, { cache: 'no-store' });
        if (!current()) return; candidates(r, organizationId, kind, employee);
        s.items = append ? [...s.items, ...r.items].filter((x, i, all) => all.findIndex(y => y.id === x.id) === i) : r.items; s.cursor = r.nextCursor;
        const select = host.querySelector(`[data-hr-select="${kind}"]`), chosen = select.value;
        uiLocale.setHTML(select, uiLocale.html`<option value="">اختر سجلًا محفوظًا</option>${s.items.map(x => uiLocale.html`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(kind === 'ATTENDANCE' ? x.workDate : x.startsOn + ' — ' + x.endsOn)} · ${uiLocale.messageHTML(authoredLabel(x.status))}</option>`).join('')}`);
        if (s.items.some(x => x.id === chosen)) select.value = chosen;
        host.querySelector(`[data-hr-more="${kind}"]`).hidden = !r.hasMore;
        uiLocale.setMessage(status, (s.items.length ? uiLocale.message("{0} سجلًا معروضًا. الاختيار يملأ المراجع المرتبطة فقط.", [s.items.length]) : (kind === 'LEAVE' ? uiLocale.message('لا توجد إجازات محفوظة في هذا النطاق.') : uiLocale.message('لا توجد سجلات حضور محفوظة في هذا النطاق.'))));
      } catch (e) {
        if (current()) { if ([401, 403].includes(e?.status)) onDenied(); for (const k of sets.keys()) reset(k); clear(); uiLocale.setMessage(status, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذرت قراءة السجلات.'))); }
      } finally { if (current()) b.disabled = false; }
    }
    for (const [kind, s] of sets) {
      host.querySelector(`[data-hr-load="${kind}"]`).addEventListener('click', () => load(kind, false));
      host.querySelector(`[data-hr-more="${kind}"]`).addEventListener('click', () => load(kind, true));
      host.querySelector(`[data-hr-select="${kind}"]`).addEventListener('change', e => {
        if (!alive()) return; const item = s.items.find(x => x.id === e.target.value); if (!item) return;
        field('employeeReference').value = item.employmentId; clear();
        if (kind === 'LEAVE') { field('leaveReference').value = item.id; field('attendanceReference').value = ''; field('returnDate').value = ''; reset('ATTENDANCE'); }
        else { field('attendanceReference').value = item.id; if (returning) field('returnDate').value = item.workDate; }
      });
    }
    const onInput = e => { if (!alive()) return; clear(); if (e.target.name === 'employeeReference') for (const k of sets.keys()) reset(k); else if (e.target.name === 'attendanceReference') host.querySelector('[data-hr-select="ATTENDANCE"]').value = ''; else if (e.target.name === 'leaveReference' && returning) host.querySelector('[data-hr-select="LEAVE"]').value = ''; };
    form.addEventListener('input', onInput);
    host.querySelector('[data-hr-attendance-preview]').addEventListener('click', async () => {
      if (!alive()) return; const ticket = ++previewEpoch, current = () => alive() && ticket === previewEpoch;
      const input = Object.fromEntries((returning ? ['employeeReference', 'attendanceReference', 'leaveReference', 'returnDate'] : ['employeeReference', 'attendanceReference']).map(k => [k, value(k)]));
      const b = host.querySelector('[data-hr-attendance-preview]'); b.disabled = true; box.hidden = false; uiLocale.setMessage(box, uiLocale.message('جارٍ فحص مراجع السجلات…'));
      try {
        const r = await request(`/documents/organizations/${encodeURIComponent(organizationId)}/hr-attendance-preview`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: template.id, expectedTemplateVersion: template.version, ...input }) });
        if (!current()) return; uiLocale.setHTML(box, format(r, { organizationId, templateId: template.id, templateCode: template.code, templateVersion: template.version, kind: 'UNSAVED_REFERENCE_PREVIEW', documentId: null, documentVersion: null, input }));
      } catch (e) {
        if (current()) { if ([401, 403].includes(e?.status)) { onDenied(); for (const k of sets.keys()) reset(k); } box.hidden = false; uiLocale.setMessage(box, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذر فحص السجلات.'))); }
      } finally { if (current()) b.disabled = false; }
    });
    return () => { disposed = true; previewEpoch++; for (const s of sets.values()) s.epoch++; form.removeEventListener('input', onInput); host.replaceChildren(); };
  }
  window.HydrolandHrAttendance = { authoredErrorMessage:error=>authoredErrors.get(error), supports, candidates, format, mount };
})();
