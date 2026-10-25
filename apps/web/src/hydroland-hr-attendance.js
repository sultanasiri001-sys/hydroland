(() => {
  'use strict';
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
    if (!r || r.schemaVersion !== 1 || r.policy !== policy || r.organizationId !== org || r.kind !== kind || r.employeeReference !== employee || r.readOnly !== true || !Array.isArray(r.items) || r.items.length > 50 || typeof r.hasMore !== 'boolean' || (r.hasMore ? !uuid(r.nextCursor) : r.nextCursor !== null) || r.items.some(x => !x || !uuid(x.id) || !uuid(x.employmentId) || employee && x.employmentId !== employee || !text(x.name) || !text(x.status) || (kind === 'ATTENDANCE' ? !day(x.workDate) : !day(x.startsOn) || !day(x.endsOn))) || new Set(r.items.map(x => x.id)).size !== r.items.length || r.hasMore && r.nextCursor !== r.items.at(-1)?.id) throw new Error('تعذر التحقق من نطاق قائمة السجلات.');
  }
  function format(r, x) {
    if (!r || r.schemaVersion !== 1 || r.policy !== policy || r.organizationId !== x.organizationId || r.templateId !== x.templateId || r.templateVersion !== x.templateVersion || r.templateCode !== x.templateCode || r.kind !== x.kind || r.documentId !== x.documentId || r.documentVersion !== x.documentVersion || r.readOnly !== true || r.operationalClosureVerified !== false || r.returnToWorkEstablished !== false || !['MATCHED', 'INVALID_REFERENCES', 'SOURCE_UNAVAILABLE'].includes(r.match) || typeof r.observedAt !== 'string' || !Number.isFinite(Date.parse(r.observedAt))) throw new Error('تعذر التحقق من نطاق نتيجة فحص الحضور.');
    const lines = [`<strong>${x.kind === 'UNSAVED_REFERENCE_PREVIEW' ? 'فحص مراجع المدخلات غير المحفوظة' : 'فحص مراجع النسخة المحفوظة'}</strong>`, `<p>وقت القراءة: ${esc(new Date(r.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))}</p>`];
    if (r.match !== 'MATCHED') {
      if (r.source !== null) throw new Error('نتيجة السجلات غير متسقة.');
      lines.push(`<p>${r.match === 'INVALID_REFERENCES' ? 'أدخل معرفات السجلات المحفوظة وتاريخ العودة عند انطباقه.' : 'لا تتطابق السجلات المطلوبة مع الموظف داخل هذه الجهة.'}</p>`);
    } else {
      const s = r.source, a = s?.attendance, l = s?.leave, c = s?.returnChecks, returning = x.templateCode === 'HR-LEAVE-RETURN';
      if (!s || !uuid(s.employmentId) || s.employmentId !== x.input.employeeReference.toLowerCase() || !text(s.employmentStatus) || !a || !uuid(a.id) || a.id !== x.input.attendanceReference.toLowerCase() || !day(a.workDate) || !text(a.status) || ['clockInRecorded', 'clockOutRecorded', 'clockInMatchesWorkDate', 'clockTimesConsistent'].some(k => typeof a[k] !== 'boolean') || (returning ? !l || !uuid(l.id) || l.id !== x.input.leaveReference.toLowerCase() || !text(l.status) || !day(l.startsOn) || !day(l.endsOn) || typeof l.approverPresent !== 'boolean' || !c || c.requestedReturnDate !== x.input.returnDate || !day(c.requestedReturnDate) || ['dateMatchesAttendance', 'dateAfterLeaveEndDate', 'leaveDatesConsistent', 'approvedLeaveRecord'].some(k => typeof c[k] !== 'boolean') : l !== null || c !== null)) throw new Error('لم تتطابق نتيجة السجل مع مراجع النموذج.');
      const yes = v => v ? 'نعم' : 'لا';
      const facts = [['تطابق المراجع', 'سجل حضور مرتبط بالموظف المحدد'], ['مرجع الموظف', s.employmentId], ['حالة الموظف', label(s.employmentStatus)], ['مرجع الحضور', a.id], ['يوم الحضور', a.workDate], ['حالة الحضور المسجلة', label(a.status)], ['وقت دخول محفوظ', yes(a.clockInRecorded)], ['وقت خروج محفوظ', yes(a.clockOutRecorded)], ['يوم الدخول يطابق يوم الحضور بتوقيت الرياض', yes(a.clockInMatchesWorkDate)], ['ترتيب وقت الدخول والخروج متسق', yes(a.clockTimesConsistent)]];
      if (returning) facts.push(['مرجع الإجازة', l.id], ['حالة الإجازة', label(l.status)], ['بداية الإجازة', l.startsOn], ['نهاية الإجازة', l.endsOn], ['صاحب اعتماد الإجازة مسجل', yes(l.approverPresent)], ['تاريخ العودة يطابق يوم الحضور', yes(c.dateMatchesAttendance)], ['تاريخ العودة بعد يوم نهاية الإجازة', yes(c.dateAfterLeaveEndDate)], ['ترتيب تواريخ الإجازة متسق', yes(c.leaveDatesConsistent)], ['سجل إجازة معتمد مع صاحب قرار', yes(c.approvedLeaveRecord)]);
      lines.push(`<dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`);
      if (!a.clockInRecorded || !a.clockInMatchesWorkDate || !a.clockTimesConsistent || returning && Object.entries(c).some(([k, v]) => k !== 'requestedReturnDate' && !v)) lines.push('<p>توجد بيانات تحتاج مراجعة؛ تطابق المعرفات وحده لا يكفي لإثبات العودة.</p>');
    }
    lines.push('<p>الفحص يقرأ السجلات الحالية فقط. اعتماد الإجازة والعودة للعمل وتسوية الحضور تبقى في مساراتها المختصة.</p>');
    return lines.join('');
  }
  function mount({ host, form, request, organizationId, template, valid, onDenied = () => {} }) {
    const returning = template.code === 'HR-LEAVE-RETURN';
    let disposed = false, previewEpoch = 0;
    const alive = () => !disposed && valid() && host.isConnected;
    const field = k => form.elements.namedItem(k);
    const value = k => String(field(k)?.value || '').trim();
    const picker = (kind, title) => `<section data-hr-picker="${kind}"><button type="button" data-hr-load="${kind}">${title}</button><label>${kind === 'LEAVE' ? 'اختيار سجل الإجازة' : 'اختيار سجل الحضور'}<select data-hr-select="${kind}"><option value="">اختر سجلًا محفوظًا</option></select></label><button type="button" data-hr-more="${kind}" hidden>سجلات أقدم</button><p data-hr-picker-status="${kind}" role="status"></p></section>`;
    host.innerHTML = `${returning ? picker('LEAVE', 'تحميل الإجازات المحفوظة') : ''}${picker('ATTENDANCE', returning ? 'تحميل حضور الموظف المحدد' : 'تحميل سجلات الحضور المحفوظة')}<button type="button" data-hr-attendance-preview>فحص مراجع الحضور والإجازة</button><div data-hr-attendance-result role="status" aria-live="polite" hidden></div>`;
    const box = host.querySelector('[data-hr-attendance-result]'), sets = new Map((returning ? ['LEAVE', 'ATTENDANCE'] : ['ATTENDANCE']).map(k => [k, { epoch: 0, items: [], cursor: null }]));
    const clear = () => { previewEpoch++; box.replaceChildren(); box.hidden = true; host.querySelector('[data-hr-attendance-preview]').disabled = false; };
    function reset(kind) {
      const s = sets.get(kind); if (!s) return; s.epoch++; s.items = []; s.cursor = null;
      host.querySelector(`[data-hr-select="${kind}"]`).innerHTML = '<option value="">اختر سجلًا محفوظًا</option>';
      host.querySelector(`[data-hr-picker-status="${kind}"]`).textContent = '';
      host.querySelector(`[data-hr-more="${kind}"]`).hidden = true;
      host.querySelector(`[data-hr-load="${kind}"]`).disabled = false;
    }
    async function load(kind, append) {
      if (!alive()) return;
      const s = sets.get(kind), employee = returning && kind === 'ATTENDANCE' ? value('employeeReference').toLowerCase() : null;
      const status = host.querySelector(`[data-hr-picker-status="${kind}"]`);
      if (returning && kind === 'ATTENDANCE' && !uuid(employee)) { reset(kind); status.textContent = 'اختر إجازة محفوظة أو أدخل مرجع الموظف أولًا.'; return; }
      const ticket = ++s.epoch, current = () => alive() && ticket === s.epoch && (!employee || employee === value('employeeReference').toLowerCase());
      const b = host.querySelector(`[data-hr-${append ? 'more' : 'load'}="${kind}"]`); b.disabled = true; status.textContent = 'جارٍ قراءة السجلات…';
      try {
        const params = new URLSearchParams({ kind }); if (employee) params.set('employeeReference', employee); if (append && s.cursor) params.set('cursor', s.cursor);
        const r = await request(`/documents/organizations/${encodeURIComponent(organizationId)}/hr-attendance-candidates?${params}`, { cache: 'no-store' });
        if (!current()) return; candidates(r, organizationId, kind, employee);
        s.items = append ? [...s.items, ...r.items].filter((x, i, all) => all.findIndex(y => y.id === x.id) === i) : r.items; s.cursor = r.nextCursor;
        const select = host.querySelector(`[data-hr-select="${kind}"]`), chosen = select.value;
        select.innerHTML = '<option value="">اختر سجلًا محفوظًا</option>' + s.items.map(x => `<option value="${esc(x.id)}">${esc(x.name)} · ${esc(kind === 'ATTENDANCE' ? x.workDate : x.startsOn + ' — ' + x.endsOn)} · ${esc(label(x.status))}</option>`).join('');
        if (s.items.some(x => x.id === chosen)) select.value = chosen;
        host.querySelector(`[data-hr-more="${kind}"]`).hidden = !r.hasMore;
        status.textContent = s.items.length ? `${s.items.length} سجلًا معروضًا. الاختيار يملأ المراجع المرتبطة فقط.` : kind === 'LEAVE' ? 'لا توجد إجازات محفوظة في هذا النطاق.' : 'لا توجد سجلات حضور محفوظة في هذا النطاق.';
      } catch (e) {
        if (current()) { if ([401, 403].includes(e?.status)) onDenied(); for (const k of sets.keys()) reset(k); clear(); status.textContent = e instanceof Error ? e.message : 'تعذرت قراءة السجلات.'; }
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
      const b = host.querySelector('[data-hr-attendance-preview]'); b.disabled = true; box.hidden = false; box.textContent = 'جارٍ فحص مراجع السجلات…';
      try {
        const r = await request(`/documents/organizations/${encodeURIComponent(organizationId)}/hr-attendance-preview`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: template.id, expectedTemplateVersion: template.version, ...input }) });
        if (!current()) return; box.innerHTML = format(r, { organizationId, templateId: template.id, templateCode: template.code, templateVersion: template.version, kind: 'UNSAVED_REFERENCE_PREVIEW', documentId: null, documentVersion: null, input });
      } catch (e) {
        if (current()) { if ([401, 403].includes(e?.status)) { onDenied(); for (const k of sets.keys()) reset(k); } box.hidden = false; box.textContent = e instanceof Error ? e.message : 'تعذر فحص السجلات.'; }
      } finally { if (current()) b.disabled = false; }
    });
    return () => { disposed = true; previewEpoch++; for (const s of sets.values()) s.epoch++; form.removeEventListener('input', onInput); host.replaceChildren(); };
  }
  window.HydrolandHrAttendance = { supports, candidates, format, mount };
})();
