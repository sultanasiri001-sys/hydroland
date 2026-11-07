(() => {
  const mount = () => {
    const host = document.getElementById('hl-admin-employees');
    if (!host) return false;
    if (window.HydrolandDepartmentReferences) return true;
    const box = document.createElement('details');
    box.dataset.departmentReferences = '';
    box.className = 'hl-staff-controls hl-staff-references';
    box.innerHTML = `<summary>مراجع الإدارات واللوائح</summary><section>
      <header><h4>المراجع المرتبطة بالإدارات الأربع عشرة</h4><button type="button" data-reference-refresh>تحديث المراجع</button></header>
      <p>دورة العمل والمستندات، ومراجع التأسيس والآيزو، والضوابط المسجلة لكل إدارة. إدراج المصدر أو النموذج لا يثبت اكتمال المراجعة أو التنفيذ أو إقفال الإدارة.</p>
      <p role="status" data-reference-status></p>
      <label>إدارة المراجع<select data-reference-department aria-label="إدارة المراجع" disabled></select></label>
      <div data-reference-detail></div>
    </section>`;
    host.querySelector('[data-staff-readiness]').after(box);
    const auth = () => window.HydrolandAuth, access = () => window.HydrolandPortalAccess;
    const eligible = () => Boolean(auth()?.isAuthenticated?.() && access()?.getCurrentRole?.() === 'admin' && access()?.roleAllowed?.('admin') && !host.hidden && box.open);
    const status = box.querySelector('[data-reference-status]'), select = box.querySelector('[data-reference-department]'), detail = box.querySelector('[data-reference-detail]'), refresh = box.querySelector('[data-reference-refresh]');
    let generation = 0, assessmentGeneration = 0, data = null, busy = false;
    const assessmentPolicy = 'DEPARTMENT_CLOSURE_ASSESSMENT_V1';
    const gateIds = ['REFERENCE_APPLICABILITY', 'DOCUMENT_COVERAGE', 'SCOPED_AUTHORIZATION', 'PERSISTED_EXECUTION', 'VERIFICATION_AND_EXCEPTIONS', 'REVISION_PRINT_RETENTION', 'END_TO_END_ACCEPTANCE'];
    const assessmentLabels = { NOT_ASSESSED: 'لم تُقيّم', BLOCKED: 'موانع محفوظة؛ الإدارة غير مقفلة', STALE: 'التقييم المحفوظ قديم؛ يلزم إعادة التحقق' };
    const gateLabels = { NOT_ASSESSED: 'لم يُقيّم', BLOCKED: 'مانع مسجل' };
    const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const text = value => typeof value === 'string' && value.trim().length > 0;
    const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
    const revision = value => Number.isSafeInteger(value) && value > 0;
    const validGates = gates => Array.isArray(gates) && gates.length === gateIds.length && new Set(gates.map(g => g?.id)).size === gateIds.length && gates.every(g => gateIds.includes(g?.id) && Object.hasOwn(gateLabels, g.verificationStatus));
    const consistentGates = (state, gates) => state === 'BLOCKED' ? gates.some(g => g.verificationStatus === 'BLOCKED') : gates.every(g => g.verificationStatus === 'NOT_ASSESSED');
    function validSummary(cycle) {
      if (!cycle || cycle.departmentClosed !== false || cycle.closureDecisionReference !== null || !Object.hasOwn(assessmentLabels, cycle.closureAssessment) || !validGates(cycle.closureGates) || !consistentGates(cycle.closureAssessment, cycle.closureGates)) return false;
      const record = cycle.closureRecord;
      if (record === null) return cycle.closureAssessment === 'NOT_ASSESSED';
      return Boolean(record && uuid(record.id) && revision(record.revision) && time(record.recordedAt) && record.policyVersion === assessmentPolicy && text(record.specificationVersion) && text(record.assessmentReference) && typeof record.assessmentCurrent === 'boolean' && (cycle.closureAssessment === 'STALE') === !record.assessmentCurrent);
    }
    function validEvidence(evidence) {
      return Array.isArray(evidence) && evidence.length <= 3 && evidence.every(e => uuid(e?.documentId) && revision(e.version) && text(e.contentHash) && text(e.referenceNumber)) && new Set(evidence.map(e => e.documentId.toLowerCase())).size === evidence.length;
    }
    function validPrivateGates(gates) {
      return validGates(gates) && gates.every(g => typeof g.note === 'string' && g.note.length <= 1000 && (g.verificationStatus !== 'BLOCKED' || g.note.trim().length >= 5) && validEvidence(g.evidence));
    }
    function validAssessment(result, department) {
      if (!result || result.schemaVersion !== 1 || result.policy !== assessmentPolicy || result.department !== department || !uuid(result.organizationId) || !text(result.specificationVersion) || !Number.isSafeInteger(result.expectedRevision) || result.expectedRevision < 0 || result.canRecord !== true || result.departmentClosed !== false || result.closureDecisionReference !== null || !text(result.notice) || !Array.isArray(result.history)) return false;
      if (!result.history.every(h => uuid(h?.id) && revision(h.revision) && h.revision <= result.expectedRevision && time(h.recordedAt) && ['NOT_ASSESSED', 'BLOCKED'].includes(h.state) && text(h.assessmentReference)) || new Set(result.history.map(h => h.revision)).size !== result.history.length) return false;
      const record = result.current;
      if (record === null) return result.expectedRevision === 0 && result.history.length === 0;
      return Boolean(record && uuid(record.id) && record.revision === result.expectedRevision && revision(record.revision) && time(record.recordedAt) && ['NOT_ASSESSED', 'BLOCKED'].includes(record.state) && validPrivateGates(record.gates) && consistentGates(record.state, record.gates) && text(record.assessmentReference) && typeof record.assessmentCurrent === 'boolean');
    }
    const current = (g, session) => g === generation && session === auth()?.getSessionVersion?.() && eligible();
    const node = (tag, value, parent) => { const element = document.createElement(tag); if (value !== undefined) element.textContent = String(value); parent?.appendChild(element); return element; };
    function link(parent, title, value) {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return;
        const a = node('a', title, parent); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      } catch {}
    }
    function libraryLink(parent, id) {
      if (typeof id === 'string' && /^libfile_[a-z0-9]+$/.test(id)) link(parent, 'السجل المحفوظ', 'https://chatgpt.com/library?file_id=' + encodeURIComponent(id) + '&account_id=personal');
    }
    function clear() {
      generation++; assessmentGeneration++; data = null; busy = false; select.replaceChildren(); select.disabled = true; detail.replaceChildren(); status.textContent = ''; refresh.disabled = false; box.open = false;
    }
    function renderSource(source, parent) {
      const item = node('article', undefined, parent);
      node('h6', source.titleAr || source.nameAr, item);
      node('p', source.id + ' · لقطة السجل: ' + source.snapshotDate, item);
      if (source.recordedStatus) node('p', 'الحالة المسجلة وقت اللقطة: ' + source.recordedStatus, item);
      if (source.versionLabel) node('p', source.versionLabel, item);
      if (source.scope) node('p', source.scope, item);
      if (source.routingStatus) node('p', 'ربط المصدر بالإدارة مقترح للمراجعة؛ لم يُعتمد انطباق متطلباته تلقائيًا.', item);
      link(item, 'المصدر الرسمي المسجل', source.url);
      libraryLink(item, source.sourceLibraryFileId);
    }
    function renderAssessmentEditor(department) {
      const section = node('section', undefined, detail); section.dataset.closureEditor = ''; section.style.minWidth = '0'; section.style.overflowWrap = 'anywhere';
      node('h6', 'تقييم النواقص المحفوظ', section);
      node('p', 'التفاصيل وتسجيل التقييم متاحان للمالك المتحقق فقط. المراجع أدلة مسجلة لا تُثبت قبول البوابات، ولا ينفذ الحفظ أي قرار تشغيلي.', section);
      const openButton = node('button', 'فتح تقييم النواقص (للمالك)', section); openButton.type = 'button'; openButton.dataset.closureOpen = '';
      const feedback = node('p', '', section); feedback.setAttribute('role', 'status'); feedback.dataset.closureStatus = '';
      const privatePane = node('div', undefined, section); privatePane.dataset.closurePrivate = '';
      const endpoint = '/admin/department-references/' + encodeURIComponent(department.code) + '/assessment';
      let working = false;
      async function loadAssessment() {
        if (!eligible() || working) return;
        const g = generation, session = auth()?.getSessionVersion?.(), a = ++assessmentGeneration;
        const active = () => current(g, session) && assessmentGeneration === a && select.value === department.code && section.isConnected;
        working = true; openButton.disabled = true; privatePane.replaceChildren(); feedback.textContent = 'جارٍ قراءة تقييم المالك…';
        const dismiss = () => { assessmentGeneration++; working = false; privatePane.replaceChildren(); feedback.textContent = ''; openButton.disabled = false; };
        const close = node('button', 'إغلاق تقييم النواقص', privatePane); close.type = 'button'; close.addEventListener('click', dismiss);
        try {
          const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
          if (!allowed) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
          if (!active()) return;
          const response = await auth().authorizedFetch(endpoint);
          const result = await response.json().catch(() => null);
          if (!active()) return;
          if (response.status === 401) { clear(); return; }
          if (response.status === 403) throw new Error('تفاصيل التقييم متاحة للمالك المتحقق فقط.');
          if (!response.ok) throw new Error('تعذر قراءة التقييم؛ أعد القراءة قبل أي إجراء.');
          if (!validAssessment(result, department.code)) throw new Error('استجابة تقييم النواقص غير مكتملة.');
          drawAssessment(result, { active, dismiss, g, session, a });
          feedback.textContent = 'تمت قراءة التقييم. راجع النواقص ثم اطلب معاينة قبل الحفظ.';
        } catch (error) {
          if (active()) { privatePane.replaceChildren(); feedback.textContent = error.message || 'تعذر قراءة التقييم.'; }
        } finally {
          if (active()) { working = false; openButton.disabled = false; }
        }
      }
      function drawAssessment(result, context) {
        privatePane.replaceChildren();
        const { active, dismiss, session, g } = context;
        let plan = null, inFlight = false, editVersion = 0;
        const close = node('button', 'إغلاق تقييم النواقص', privatePane); close.type = 'button'; close.addEventListener('click', dismiss);
        node('p', result.notice, privatePane);
        if (result.current) {
          node('p', `التقييم المحفوظ: ${result.current.assessmentReference} · الإصدار ${result.current.revision} · ${assessmentLabels[result.current.state]}`, privatePane);
          if (!result.current.assessmentCurrent) node('p', 'هذا التقييم قديم. تحقّق من المصادر والإصدارات قبل إنشاء تقييم جديد.', privatePane);
        } else node('p', 'لا يوجد تقييم محفوظ لهذه الإدارة.', privatePane);
        if (result.history.length) {
          const history = node('details', undefined, privatePane); node('summary', 'سجل إصدارات التقييم', history);
          const list = node('ul', undefined, history);
          result.history.forEach(h => node('li', `${h.assessmentReference} · الإصدار ${h.revision} · ${assessmentLabels[h.state]}`, list));
          if (result.hasMoreHistory === true) node('p', 'يعرض هذا الملخص أحدث 50 إصدارًا؛ الإصدارات السابقة محفوظة ولم تُحذف.', history);
        }
        const form = node('form', undefined, privatePane); form.dataset.closureForm = ''; form.noValidate = true;
        const fields = node('fieldset', undefined, form); fields.style.minWidth = '0'; fields.style.marginInline = '0';
        node('legend', 'البوابات السبع — تسجيل مانع أو عدم التقييم فقط', fields);
        const rows = gateIds.map(id => {
          const saved = result.current?.gates.find(g => g.id === id), label = department.operatingCycle.closureGates.find(g => g.id === id)?.labelAr || id;
          const row = node('section', undefined, fields); row.dataset.closureGate = id; row.style.minWidth = '0';
          node('h6', label, row);
          const statusLabel = node('label', 'حالة البوابة', row), state = node('select', undefined, statusLabel); state.setAttribute('aria-label', 'حالة ' + id);
          for (const [value, title] of Object.entries(gateLabels)) { const option = node('option', title, state); option.value = value; }
          state.value = saved?.verificationStatus || 'NOT_ASSESSED';
          const noteLabel = node('label', 'الملاحظة أو سبب المانع (حتى 1000 حرف)', row), note = node('textarea', undefined, noteLabel); note.setAttribute('aria-label', 'ملاحظة ' + id); note.maxLength = 1000; note.rows = 3; note.value = saved?.note || '';
          const evidenceLabel = node('label', 'مراجع مستندات معروفة، اختياري: معرّف المستند ثم رقم الإصدار في كل سطر (حتى 3)', row), evidence = node('textarea', undefined, evidenceLabel); evidence.setAttribute('aria-label', 'أدلة ' + id); evidence.rows = 2; evidence.dir = 'ltr'; evidence.maxLength = 200; evidence.placeholder = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 1'; evidence.value = (saved?.evidence || []).map(e => e.documentId + ' ' + e.version).join('\n');
          for (const control of [state, note, evidence]) { control.style.maxWidth = '100%'; control.style.width = '100%'; control.style.boxSizing = 'border-box'; }
          return { id, state, note, evidence };
        });
        const previewButton = node('button', 'معاينة تقييم النواقص', form); previewButton.type = 'submit'; previewButton.dataset.closurePreview = '';
        const previewPane = node('div', undefined, privatePane); previewPane.dataset.closurePlan = '';
        const invalidate = () => { editVersion++; plan = null; previewPane.replaceChildren(); if (!inFlight) feedback.textContent = 'تغيّر التقييم؛ يلزم معاينة جديدة قبل التأكيد.'; };
        form.addEventListener('input', invalidate); form.addEventListener('change', invalidate);
        const setBusy = value => { inFlight = value; working = value; fields.disabled = value; previewButton.disabled = value; openButton.disabled = value; };
        function input() {
          return { expectedRevision: result.expectedRevision, specificationVersion: result.specificationVersion, gates: rows.map(row => {
            const note = row.note.value.trim(), verificationStatus = row.state.value;
            if (!Object.hasOwn(gateLabels, verificationStatus) || note.length > 1000 || verificationStatus === 'BLOCKED' && note.length < 5) throw new Error('أدخل سببًا واضحًا من 5 إلى 1000 حرف لكل مانع.');
            const lines = row.evidence.value.trim() ? row.evidence.value.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];
            if (lines.length > 3) throw new Error('استخدم ثلاثة مراجع مستندات كحد أقصى لكل بوابة.');
            const evidence = lines.map(line => {
              const parts = line.split(/\s+/), version = Number(parts[1]);
              if (parts.length !== 2 || !uuid(parts[0]) || !/^[1-9][0-9]*$/.test(parts[1]) || !revision(version)) throw new Error('مرجع الدليل: معرّف مستند صالح ثم رقم إصدار صحيح في كل سطر.');
              return { documentId: parts[0], version };
            });
            if (new Set(evidence.map(e => e.documentId.toLowerCase())).size !== evidence.length) throw new Error('لا تكرر مرجع المستند داخل البوابة.');
            return { id: row.id, verificationStatus, note, evidence };
          }) };
        }
        const sameDraft = (a, b) => a.every(g => {
          const other = b.find(v => v.id === g.id);
          return other && g.verificationStatus === other.verificationStatus && g.note === other.note && g.evidence.length === other.evidence.length && g.evidence.every(e => other.evidence.some(v => v.documentId.toLowerCase() === e.documentId.toLowerCase() && v.version === e.version));
        });
        function fail(message) {
          if (!active()) return;
          assessmentGeneration++; plan = null; privatePane.replaceChildren(); working = false; openButton.disabled = false; feedback.textContent = message;
        }
        form.addEventListener('submit', async event => {
          event.preventDefault(); if (!active() || inFlight) return;
          let draft; try { draft = input(); } catch (error) { plan = null; previewPane.replaceChildren(); feedback.textContent = error.message; return; }
          const version = editVersion; plan = null; previewPane.replaceChildren(); setBusy(true); feedback.textContent = 'جارٍ معاينة التقييم والتحقق من المراجع…';
          try {
            const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
            if (!allowed) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
          if (!active()) return;
            const response = await auth().authorizedFetch(endpoint + '/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
            const next = await response.json().catch(() => null);
            if (!active() || editVersion !== version) return;
            if (!response.ok) { fail(response.status === 403 ? 'تفاصيل التقييم متاحة للمالك المتحقق فقط.' : 'تعذرت المعاينة أو تغيّر المصدر. أعد قراءة التقييم قبل المحاولة.'); return; }
            if (!next || next.schemaVersion !== 1 || next.policy !== assessmentPolicy || next.organizationId !== result.organizationId || next.department !== department.code || next.specificationVersion !== draft.specificationVersion || next.expectedRevision !== draft.expectedRevision || !validPrivateGates(next.gates) || !sameDraft(draft.gates, next.gates) || typeof next.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(next.expectedPlanHash) || !text(next.notice)) { fail('استجابة معاينة التقييم غير مكتملة؛ أعد القراءة.'); return; }
            plan = { draft, hash: next.expectedPlanHash, version };
            node('h6', 'معاينة فقط — لم يُحفظ التقييم', previewPane); node('p', next.notice, previewPane);
            for (const gate of next.gates) {
              node('p', gate.id + ' · ' + gateLabels[gate.verificationStatus] + (gate.note ? ' · ' + gate.note : ''), previewPane);
              gate.evidence.forEach(e => node('p', e.referenceNumber + ' · الإصدار ' + e.version + ' · ' + e.contentHash, previewPane));
            }
            const confirmLabel = node('label', undefined, previewPane), confirmed = node('input', undefined, confirmLabel); confirmLabel.className = 'hl-staff-ack'; confirmed.type = 'checkbox'; confirmed.dataset.closureConfirmed = '';
            confirmLabel.appendChild(document.createTextNode(' راجعت النواقص والمراجع؛ هذا الحفظ ليس قبولًا أو اعتمادًا أو إقفالًا.'));
            const save = node('button', 'تأكيد حفظ تقييم النواقص', previewPane); save.type = 'button'; save.disabled = true; save.dataset.closureSave = '';
            confirmed.addEventListener('change', () => { save.disabled = !confirmed.checked || inFlight || !plan; });
            save.addEventListener('click', async () => {
              if (!active() || inFlight || !plan || !confirmed.checked || plan.version !== editVersion) return;
              const confirmedPlan = plan; plan = null; save.disabled = true; confirmed.disabled = true; setBusy(true); feedback.textContent = 'جارٍ حفظ التقييم…';
              try {
                const authorized = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
                if (!authorized) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
                if (!active()) return;
                const response = await auth().authorizedFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...confirmedPlan.draft, expectedPlanHash: confirmedPlan.hash, confirmed: true }) });
                const saved = await response.json().catch(() => null);
                if (!active()) return;
                if (!response.ok || !validAssessment(saved, department.code) || saved.organizationId !== result.organizationId || saved.expectedRevision !== result.expectedRevision + 1 || !sameDraft(confirmedPlan.draft.gates, saved.current?.gates || [])) {
                  fail(response.status === 409 ? 'تغيّر التقييم أو المصدر؛ أعد القراءة. لم تُعَد المحاولة تلقائيًا.' : 'لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة.'); return;
                }
                // The saved receipt is private. The public summary must be read
                // afresh rather than inferred from this owner-only write.
                feedback.textContent = 'حُفظ تقييم النواقص بالإصدار ' + saved.expectedRevision + '. ليس اعتمادًا أو إقفالًا. حدّث المراجع لقراءة الملخص الأحدث.';
                drawAssessment(saved, context);
              } catch { fail('لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة؛ لا إعادة تلقائية.'); }
              finally { if (active()) setBusy(false); }
            });
            feedback.textContent = 'راجع المعاينة ثم أكد الحفظ بصورة مستقلة.';
          } catch { fail('تعذرت معاينة التقييم. أعد القراءة قبل المحاولة.'); }
          finally { if (active()) setBusy(false); }
        });
      }
      openButton.addEventListener('click', () => void loadAssessment());
    }
    function renderCycle(department) {
      const cycle = department.operatingCycle;
      node('h5', 'دورة العمل والمستندات التشغيلية', detail);
      node('p', 'نطاق الإقفال محدد من مسارات الإدارات السابقة. حالة تحقق إقفال الإدارة: ' + assessmentLabels[cycle.closureAssessment] + '. حفظ تقييم النواقص ليس قبولًا أو اعتمادًا أو إقفالًا للإدارة.', detail);
      if (cycle.closureRecord) node('p', `مرجع التقييم: ${cycle.closureRecord.assessmentReference} · الإصدار ${cycle.closureRecord.revision} · ${new Date(cycle.closureRecord.recordedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`, detail);
      node('p', cycle.sharedEngineBoundaryAr, detail);
      for (const flow of cycle.cycles) {
        const item = node('article', undefined, detail);
        node('h6', flow.titleAr, item);
        const steps = node('ol', undefined, item);
        flow.stepsAr.forEach(step => node('li', step, steps));
      }
      node('h6', 'أدلة نتيجة الإجراء وإقفاله', detail);
      const evidence = node('ul', undefined, detail);
      cycle.closureEvidenceAr.forEach(value => node('li', value, evidence));
      node('h6', 'النماذج المصدرية وحالتها المحفوظة', detail);
      node('p', `نماذج الإدارة في الكتالوج الحالي: ${cycle.templates.length}. الحالة المحفوظة تُقرأ من الجهة المحددة.`, detail);
      for (const template of cycle.templates) {
        const item = node('article', undefined, detail);
        item.dataset.referenceTemplate = template.code;
        node('h6', template.titleAr + ' · ' + template.code, item);
        const availability = { ACTIVE_VERSION_RECORDED: 'نسخة نشطة مسجلة', MULTIPLE_ACTIVE_VERSIONS: 'تعارض: أكثر من نسخة نشطة', NO_ACTIVE_VERSION_RECORDED: 'لم تظهر نسخة نشطة في الجهة المفحوصة', ORGANIZATION_NOT_RECORDED: 'الجهة الداخلية غير مسجلة' };
        node('p', availability[template.availability] || 'تحتاج الحالة إلى مراجعة', item);
        template.recordedVersions.forEach(v => node('p', 'الإصدار ' + v.version + ' · ' + (v.status === 'ACTIVE' ? 'نشط' : 'محفوظ سابقًا'), item));
      }
      const count = cycle.documentCounts.reduce((sum, row) => sum + row.count, 0);
      node('p', 'مستندات محفوظة مرتبطة بهذه الرموز في الجهة المفحوصة: ' + count + '. العدد لا يقيس اكتمال الإجراء ولا يشمل السجلات المحفوظة في المجالات الأخرى.', detail);
      node('h6', 'شروط إقفال الإدارة', detail);
      const gates = node('ul', undefined, detail);
      cycle.closureGates.forEach(gate => node('li', gate.labelAr + ' — ' + gateLabels[gate.verificationStatus], gates));
      renderAssessmentEditor(department);
      node('h5', 'مراجع الآيزو المرتبطة بنطاق المراجعة', detail);
      node('p', 'يراجع النظام السعودي المنطبق أولًا، ثم الآيزو وWRSTC ثم إصدار برنامج الجهة التدريبية حيث تنطبق. بيانات الإصدار أدناه متحقق منها بتاريخها؛ قرار اعتماد كل معيار ومواده لكل إجراء يحتاج مرجعه المحفوظ. لا يُثبت هذا العرض شهادة آيزو أو توفر نسخة مرخصة.', detail);
      for (const source of data.isoReferences.filter(s => department.isoReferenceIds.includes(s.id))) {
        const item = node('article', undefined, detail);
        node('h6', source.designation + ' · ' + source.titleAr, item);
        node('p', 'تاريخ التحقق من بيانات الناشر: ' + source.snapshotDate, item);
        node('p', source.scopeAr, item);
        node('p', 'ربط الانطباق ومواد المعيار ومرجع قرار اعتماده: قيد المراجعة.', item);
        link(item, 'بيانات الإصدار لدى ISO', source.url);
      }
    }
    function renderSourceLinkEditor(department) {
      if (department.code !== 'SAFETY_COMPLIANCE_RISK') return;
      const section=node('section',undefined,detail);section.dataset.sourceLinks='';section.style.minWidth='0';section.style.overflowWrap='anywhere';
      node('h5','ربط مصفوفة المتطلبات بالضوابط',section);
      node('p','يحفظ المالك ارتباط نسخة المصفوفة بضوابطها للمراجعة. الربط لا يعتمد المصادر أو الأدلة ولا يفعّل الإلزام أو يغيّر إعدادات التشغيل.',section);
      const open=node('button','فتح ربط مصفوفة الضوابط (للمالك)',section);open.type='button';open.dataset.sourceLinksOpen='';
      const feedback=node('p','',section);feedback.setAttribute('role','status');feedback.dataset.sourceLinksStatus='';
      const pane=node('div',undefined,section);pane.dataset.sourceLinksPrivate='';
      const endpoint='/admin/operational-source-links',policy='OPERATIONAL_SOURCE_REVIEW_LINK_V1';
      const states=['UNLINKED','LINKED_FOR_REVIEW','STALE'],id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
      let busy=false,local=0;
      const validView=r=>r&&r.schemaVersion===1&&r.policy===policy&&r.canRecord===true&&r.canActivate===false&&id(r.organizationId)&&text(r.notice)&&Array.isArray(r.documents)&&r.documents.length<=50&&new Set(r.documents.map(d=>d.id)).size===r.documents.length&&r.documents.every(d=>id(d.id)&&revision(d.version)&&text(d.referenceNumber)&&['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED'].includes(d.status))&&Array.isArray(r.controls)&&r.controls.length<=29&&new Set(r.controls.map(c=>c.controlId)).size===r.controls.length&&r.controls.every(c=>text(c.controlId)&&states.includes(c.sourceReviewStatus));
      const dismiss=()=>{local++;busy=false;pane.replaceChildren();feedback.textContent='';open.disabled=false;};
      async function loadLinks(){
        if(!eligible()||busy)return;
        const g=generation,session=auth()?.getSessionVersion?.(),l=++local;
        const active=()=>current(g,session)&&local===l&&select.value===department.code&&section.isConnected;
        busy=true;open.disabled=true;pane.replaceChildren();feedback.textContent='جارٍ قراءة مصفوفات المالك وروابطها…';
        try{
          const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:active});if(!active())return;if(!allowed){clear();return;}
          const response=await auth().authorizedFetch(endpoint),result=await response.json().catch(()=>null);if(!active())return;
          if(response.status===401){clear();return;}if(response.status===403)throw new Error('تفاصيل الربط وحفظه متاحة لمالك الجهة الداخلية المتحقق فقط.');
          if(!response.ok||!validView(result))throw new Error('تعذر قراءة بيانات الربط كاملة؛ أعد القراءة.');
          drawLinks(result,{active,session});feedback.textContent='تمت قراءة النسخ. اختر المصفوفة وراجع معاينة الربط قبل حفظه.';
        }catch(error){if(active()){pane.replaceChildren();feedback.textContent=error.message||'تعذر قراءة الربط.';}}
        finally{if(active()){busy=false;open.disabled=false;}}
      }
      function drawLinks(view,{active,session}){
        pane.replaceChildren();const close=node('button','إغلاق ربط المصفوفة',pane);close.type='button';close.addEventListener('click',dismiss);
        node('p',view.notice,pane);
        node('p','الضوابط المرتبطة للمراجعة: '+view.controls.filter(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW').length+' · الروابط المتقادمة: '+view.controls.filter(c=>c.sourceReviewStatus==='STALE').length,pane);
        if(view.controls.every(c=>typeof c.policyRecordExists==='boolean'))node('p','مفاتيح الكتالوج دون سجل ضبط مستقل: '+view.controls.filter(c=>!c.policyRecordExists).length+'. يحفظ الربط للمراجعة دون إنشاء هذه السجلات أو تغيير التشغيل.',pane);
        const form=node('form',undefined,pane);form.dataset.sourceLinksForm='';
        const sourceLabel=node('label','نسخة مصفوفة التشغيل',form),source=node('select',undefined,sourceLabel);source.setAttribute('aria-label','نسخة مصفوفة التشغيل');source.style.maxWidth='100%';source.style.width='100%';source.style.boxSizing='border-box';
        const empty=node('option','اختر نسخة محفوظة',source);empty.value='';
        for(const doc of view.documents){const option=node('option',doc.referenceNumber+' · الإصدار '+doc.version+' · '+doc.status,source);option.value=doc.id;}
        if(view.hasMoreDocuments)node('p','تعرض أحدث 50 نسخة غير مؤرشفة.',form);
        const reasonLabel=node('label','سبب ربط المصفوفة',form),reason=node('input',undefined,reasonLabel);reason.type='text';reason.maxLength=2000;reason.setAttribute('aria-label','سبب ربط المصفوفة');reason.style.maxWidth='100%';
        const preview=node('button','معاينة ربط المصفوفة',form);preview.type='button';preview.dataset.sourceLinksPreview='';
        const planPane=node('div',undefined,form);planPane.dataset.sourceLinksPlan='';
        const confirmationLabel=node('label',undefined,form),confirmation=node('input',undefined,confirmationLabel);confirmation.type='checkbox';confirmation.setAttribute('aria-label','راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام');confirmationLabel.appendChild(document.createTextNode('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام'));
        const save=node('button','حفظ روابط المراجعة',form);save.type='button';save.dataset.sourceLinksSave='';save.disabled=true;
        let plan=null,inFlight=false,edit=0;
        const invalidate=()=>{edit++;plan=null;confirmation.checked=false;save.disabled=true;planPane.replaceChildren();};
        source.addEventListener('change',invalidate);reason.addEventListener('input',invalidate);
        confirmation.addEventListener('change',()=>{save.disabled=!plan||!confirmation.checked||inFlight;});
        form.addEventListener('submit',e=>e.preventDefault());
        const input=()=>{const d=view.documents.find(d=>d.id===source.value);if(!d||reason.value.trim().length<5)throw new Error('اختر نسخة وأدخل سببًا واضحًا من خمسة أحرف على الأقل.');return {documentId:d.id,expectedDocumentVersion:d.version,reason:reason.value.trim()};};
        const validPlan=(r,body)=>r&&r.schemaVersion===1&&r.policy===policy&&r.organizationId===view.organizationId&&r.canActivate===false&&text(r.notice)&&r.source?.documentId===body.documentId&&r.source.version===body.expectedDocumentVersion&&text(r.source.referenceNumber)&&Array.isArray(r.rows)&&r.rows.length>0&&r.rows.length<=29&&new Set(r.rows.map(row=>row.controlId)).size===r.rows.length&&r.rows.every(row=>view.controls.some(c=>c.controlId===row.controlId)&&['requirement','applicability','responsibility','inspection','acceptance'].every(k=>text(row[k])))&&typeof r.expectedPlanHash==='string'&&/^[a-f0-9]{64}$/.test(r.expectedPlanHash);
        async function request(path,body){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:active});if(!active())return null;if(!allowed){clear();return null;}const response=await auth().authorizedFetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!active())return null;if(response.status===401){clear();return null;}if(!response.ok)throw new Error(typeof data?.message==='string'?data.message:'تعذر حفظ الربط؛ أعد القراءة والمعاينة.');return data;}
        preview.addEventListener('click',async()=>{
          if(!active()||inFlight)return;let body;try{body=input();}catch(error){feedback.textContent=error.message;return;}
          invalidate();const e=edit;inFlight=true;preview.disabled=true;feedback.textContent='جارٍ معاينة نسخة المصفوفة والضوابط الحالية…';
          try{const result=await request(endpoint+'/preview',body);if(!active()||!result||edit!==e)return;if(!validPlan(result,body))throw new Error('معاينة الربط غير متسقة؛ أعد القراءة.');plan={body,...result};node('p','معاينة فقط · '+result.source.referenceNumber+' · الإصدار '+result.source.version+' · عدد الضوابط '+result.rows.length,planPane);const list=node('ul',undefined,planPane);for(const row of result.rows)node('li',row.controlId+' — '+row.requirement+' — '+row.applicability+' — '+row.acceptance,list);node('p',result.notice,planPane);feedback.textContent='راجع النسخة والضوابط ثم أكد حفظ روابط المراجعة.';
          }catch(error){if(active()){invalidate();feedback.textContent=error.message||'تعذرت المعاينة.';}}
          finally{if(active()){inFlight=false;preview.disabled=false;}}
        });
        save.addEventListener('click',async()=>{
          if(!active()||inFlight||!plan||!confirmation.checked)return;
          const selected=plan;inFlight=true;save.disabled=true;preview.disabled=true;source.disabled=true;reason.disabled=true;confirmation.disabled=true;feedback.textContent='جارٍ حفظ روابط المراجعة دون اعتماد البنود…';
          try{const result=await request(endpoint,{...selected.body,expectedPlanHash:selected.expectedPlanHash,confirmed:true});if(!active()||!result)return;if(result.schemaVersion!==1||result.policy!==policy||result.canActivate!==false||result.linkedControlCount!==selected.rows.length||result.source?.documentId!==selected.source.documentId||result.source.version!==selected.source.version||!text(result.reference)||!time(result.recordedAt))throw new Error('نتيجة الحفظ غير مكتملة؛ أعد القراءة قبل أي محاولة أخرى.');pane.replaceChildren();feedback.textContent='تم حفظ روابط مراجعة '+result.linkedControlCount+' ضابطًا · '+result.reference+' · '+result.source.referenceNumber+' · الإصدار '+result.source.version+'. الاعتماد والإلزام ما زالا في مسارهما المستقل.';
          }catch(error){if(active()){pane.replaceChildren();feedback.textContent=(error.message||'لم تتأكد نتيجة الحفظ.')+' أعد القراءة؛ لا تكرر تأكيد المعاينة القديمة.';}}
          finally{if(active()){plan=null;inFlight=false;open.disabled=false;}}
        });
      }
      open.addEventListener('click',()=>void loadLinks());
    }
    function render() {
      assessmentGeneration++;
      detail.replaceChildren();
      const department = data?.departments.find(d => d.code === select.value);
      if (!department) return;
      node('h5', department.nameAr, detail);
      const documentsButton = node('button', 'إدارة مستندات هذه الإدارة والنواقص', detail); documentsButton.type = 'button';
      documentsButton.addEventListener('click', async () => {
        if (!eligible()) return;
        const s = auth()?.getSessionVersion?.(), g = generation;
        const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: s, isCurrent: () => eligible() && generation === g });
        if (allowed && current(g, s)) window.HydrolandDocuments?.open?.({ department: department.code, internal: true });
      });
      node('p', department.unitRecorded ? (department.unitActive ? 'الإدارة موجودة ومفعّلة في الهيكل الداخلي.' : 'الإدارة موجودة وغير مفعّلة حاليًا.') : 'لم يظهر سجل للإدارة في الهيكل الداخلي.', detail);
      node('p', 'تُراجع الصلاحية بحسب الدور والإجراء والمورد والإدارة والمركز والشروط وفترة التفويض. تبقى المراجعة القانونية لدى القانونية، وملكية الإجراء لدى الإدارة المختصة.', detail);
      node('p', 'لاستكمال الربط: المصدر وإصداره، المادة أو المتطلب المعتمد، قابلية الانطباق، الإجراء والصلاحية، الدليل المتحقق منه، ومرجع الاعتماد.', detail);
      renderCycle(department);
      renderSourceLinkEditor(department);
      const authorities = data.authorities.filter(a => department.authorityIds.includes(a.id));
      node('h5', 'الجهات والخدمات المرجعية', detail);
      if (!authorities.length) node('p', 'مراجع هذه الإدارة واردة في السجل القانوني أدناه.', detail);
      authorities.forEach(a => renderSource(a, detail));
      const sources = [...data.legalReferences.filter(r => department.legalReferenceIds.includes(r.id)), ...data.marineArchives.filter(r => department.marineArchiveIds.includes(r.id)), ...data.hrSources.filter(r => department.hrSourceIds.includes(r.id))];
      node('h5', 'المراجع المحفوظة', detail);
      sources.forEach(s => renderSource(s, detail));
      if (!sources.length) node('p', 'استكمال نسخ المصادر وربط موادها ما زال مطلوبًا لهذه الإدارة.', detail);
      node('h5', 'الضوابط المسجلة المرتبطة', detail);
      if (!department.policies.length) node('p', 'لم تظهر ضوابط مسجلة ضمن التصنيفات المرتبطة بهذه الإدارة. هذا لا يثبت غياب إجراءاتها الأخرى.', detail);
      for (const policy of department.policies) {
        const item = node('article', undefined, detail);
        node('h6', policy.labelAr, item);
        node('p', policy.category + '.' + policy.ruleKey + ' · حالة الإعداد المسجلة: ' + (policy.state === 'ENABLED' ? 'مفعّل' : policy.state === 'REVIEW' ? 'قيد المراجعة' : 'غير مفعّل'), item);
        const bindingLabels = {
          MANDATORY: 'سجل إلزام صالح عند القراءة؛ تفرضه الحماية بصرف النظر عن إعداد التعطيل.',
          NOT_APPLICABLE: 'سجل عدم انطباق صالح عند القراءة؛ لا يثبت إعفاءً من المتطلبات الأخرى.',
          REVIEW_REQUIRED: 'سجل الربط يتطلب مراجعة؛ القرار التشغيلي محجوب حتى معالجة المصدر والانطباق والاعتماد.',
          NOT_RECORDED: 'لم يسجل ربط بصيغة الإلزام الحالية لهذا الضابط.',
        };
        node('p', bindingLabels[policy.bindingStatus] || 'لم ترد حالة ربط الإلزام في هذه القراءة؛ حدّث المراجع بعد اكتمال التحديث.', item);
        const reviewLabels={LINKED_FOR_REVIEW:'نسخة مصفوفة مرتبطة للمراجعة؛ الربط لا يعتمد المصدر أو يفعّل الإلزام.',STALE:'ربط المصفوفة متقادم أو غير متسق؛ يلزم إعادة التحقق.',UNLINKED:'لم تربط نسخة مصفوفة بهذا الضابط للمراجعة.'};
        node('p',reviewLabels[policy.sourceReviewStatus]||'لم ترد حالة ربط المصفوفة في هذه القراءة.',item);
        if (policy.legacyReferencesRecorded) node('p', 'مراجع بالصيغة السابقة مسجلة؛ لا تثبت وحدها إلزامًا نافذًا.', item);
        node('p', policy.referencesRecorded ? 'مراجع محفوظة؛ صلاحية سجل الربط لا تثبت صحة الوثائق أو جاهزية رحلة بعينها.' : 'ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل في السجل المفحوص.', item);
      }
      if (department.code === 'HR') {
        node('h5', 'مصفوفة ضوابط الموارد البشرية للمراجعة', detail);
        for (const control of data.hrControlCandidates) {
          const item = node('article', undefined, detail);
          node('h6', control.labelAr + ' · ' + control.ruleKey, item);
          node('p', 'مصادر الحزمة: ' + control.sourceIds.join('، '), item);
          node('p', 'مواد مرشحة للمراجعة: ' + control.clauseReferences.join('، '), item);
          const list = node('ul', undefined, item);
          control.evidenceSpecification.forEach(value => node('li', value, list));
          node('p', control.limitations, item);
          node('p', 'لم يُثبت متطلب معتمد أو دليل فعلي أو اعتماد قانوني في هذه الحزمة.', item);
        }
        const button = node('button', 'فتح مسار مراجعة ضوابط الموارد البشرية', detail); button.type = 'button';
        button.addEventListener('click', () => { if (!eligible()) return; const target = host.querySelector('[data-hr-control-review]'); if (target) { target.open = true; target.scrollIntoView({ block: 'start' }); } });
      }
    }
    async function load() {
      if (!eligible() || busy) return;
      const g = ++generation, session = auth()?.getSessionVersion?.(), chosen = select.value;
      assessmentGeneration++; busy = true; data = null; detail.replaceChildren(); select.disabled = true; refresh.disabled = true; status.textContent = 'جارٍ قراءة المراجع وحالة ربطها…';
      try {
        const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: () => g === generation && !host.hidden && box.open });
        if (!allowed || !current(g, session)) { if (g === generation) clear(); return; }
        const response = await auth().authorizedFetch('/admin/department-references');
        const result = await response.json().catch(() => null);
        if (!current(g, session)) return;
        if ([401, 403].includes(response.status)) { clear(); await access()?.authorizeRole?.('admin'); return; }
        if (!response.ok) throw new Error(typeof result?.message === 'string' ? result.message : 'تعذر تحميل مراجع الإدارات.');
        const arrays = ['departments', 'authorities', 'legalReferences', 'marineArchives', 'hrSources', 'hrControlCandidates', 'isoReferences'];
        if (result?.referenceOnly !== true || result.canActivate !== false || result.canonicalDepartmentCount !== 14 || !arrays.every(k => Array.isArray(result[k])) || result.departments.length !== 14 || new Set(result.departments.map(d => d.code)).size !== 14 || !Number.isFinite(Date.parse(result.observedAt))) throw new Error('استجابة مراجع الإدارات غير مكتملة.');
        if (result.completeDocumentInventoryVerified !== false || !result.departments.every(d => validSummary(d.operatingCycle) && ['cycles', 'templates', 'closureEvidenceAr', 'closureGates', 'documentCounts'].every(k => Array.isArray(d.operatingCycle[k])) && Array.isArray(d.isoReferenceIds))) throw new Error('استجابة دورة الإدارة غير مكتملة.');
        if (result.bindingSummary !== undefined) {
          const b = result.bindingSummary, keys = ['legacyReferences','currentBindings','mandatoryBindings','notApplicableBindings','reviewRequiredBindings','unrecordedBindings'];
          if (!b || b.schemaVersion !== 1 || !Number.isSafeInteger(result.effectivePolicyCount) || !keys.every(k => Number.isSafeInteger(b[k]) && b[k] >= 0 && b[k] <= result.effectivePolicyCount) || b.currentBindings !== b.mandatoryBindings + b.notApplicableBindings || b.currentBindings + b.reviewRequiredBindings + b.unrecordedBindings !== result.effectivePolicyCount || !result.departments.every(d => Array.isArray(d.policies) && d.policies.every(p => ['MANDATORY','NOT_APPLICABLE','REVIEW_REQUIRED','NOT_RECORDED'].includes(p.bindingStatus) && typeof p.legacyReferencesRecorded === 'boolean'))) throw new Error('استجابة حالات ربط المراجع غير مكتملة.');
        }
        if(result.sourceReviewSummary!==undefined){const s=result.sourceReviewSummary;if(!s||s.schemaVersion!==1||!['linkedForReview','staleLinks','unlinked'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.linkedForReview+s.staleLinks+s.unlinked!==result.effectivePolicyCount||!result.departments.every(d=>d.policies.every(p=>['UNLINKED','LINKED_FOR_REVIEW','STALE'].includes(p.sourceReviewStatus))))throw new Error('استجابة روابط المصفوفات غير مكتملة.');}
        if(result.sourceReviewCatalogSummary!==undefined){const s=result.sourceReviewCatalogSummary;if(!s||s.schemaVersion!==1||s.total!==29||!['linkedForReview','staleLinks','unlinked','withoutPolicyRecord'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=29)||s.linkedForReview+s.staleLinks+s.unlinked!==29)throw new Error('استجابة ربط كتالوج التشغيل غير مكتملة.');}
        const templateCodes = result.departments.flatMap(d => d.operatingCycle.templates.map(t => t.code));
        if (!Number.isSafeInteger(result.canonicalSourceTemplateCount) || result.canonicalSourceTemplateCount !== templateCodes.length || new Set(templateCodes).size !== templateCodes.length) throw new Error('استجابة نماذج الإدارات غير مكتملة.');
        data = result; select.replaceChildren();
        for (const department of data.departments) { const option = node('option', department.nameAr, select); option.value = department.code; }
        if (data.departments.some(d => d.code === chosen)) select.value = chosen;
        render();
        status.textContent = `وقت القراءة: ${new Date(data.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })} · إدارات مسجلة: ${data.recordedDepartmentCount} من 14 · نماذج الكتالوج: ${data.canonicalSourceTemplateCount} · الضوابط: ${data.effectivePolicyCount} · ذات مراجع مسجلة: ${data.policiesWithRecordedReferences}. بعض الضوابط مشتركة بين الإدارات. حالة المصادر تعكس تاريخ لقطة السجل.`;
        status.textContent += data.bindingSummary ? ` مراجع بالصيغة السابقة: ${data.bindingSummary.legacyReferences} · سجلات إلزام صالحة: ${data.bindingSummary.mandatoryBindings} · سجلات عدم انطباق صالحة: ${data.bindingSummary.notApplicableBindings} · روابط تحتاج مراجعة: ${data.bindingSummary.reviewRequiredBindings} · بلا ربط بصيغة الإلزام الحالية: ${data.bindingSummary.unrecordedBindings}. صلاحية الربط هي نتيجة فحص السجل عند القراءة، وليست تحققًا من الوثيقة الرسمية.` : ' لم تقس حالة ربط الإلزام في هذه القراءة؛ العداد السابق وحده لا يحددها.';
        if(data.sourceReviewSummary)status.textContent+=` سجلات ضبط مخزنة مرتبطة بالمراجعة: ${data.sourceReviewSummary.linkedForReview} · روابط متقادمة: ${data.sourceReviewSummary.staleLinks} · بلا ربط مصفوفة: ${data.sourceReviewSummary.unlinked}.`;
        if(data.sourceReviewCatalogSummary){const s=data.sourceReviewCatalogSummary;status.textContent+=` كتالوج التشغيل: ${s.linkedForReview} من ${s.total} مرتبط للمراجعة · متقادم: ${s.staleLinks} · بلا ربط: ${s.unlinked} · مفاتيح دون سجل ضبط مستقل: ${s.withoutPolicyRecord}. الربط لا ينشئ سجلات ضبط ولا يغيّر التشغيل.`;}
      } catch (error) {
        if (current(g, session)) { data = null; detail.replaceChildren(); select.replaceChildren(); status.textContent = error.message || 'تعذر تحميل المراجع.'; }
      } finally {
        if (current(g, session)) { busy = false; refresh.disabled = false; select.disabled = !data; }
      }
    }
    select.addEventListener('change', render);
    refresh.addEventListener('click', () => void load());
    box.addEventListener('toggle', () => { if (box.open) void load(); else clear(); });
    document.addEventListener('hydroland:workspace-selected', event => { if (event.detail?.target !== host) clear(); });
    for (const event of ['hydroland:session-cleared', 'hydroland:portal-cleared', 'hydroland:role-changed']) document.addEventListener(event, clear);
    // A newly authenticated session may belong to another owner even when the
    // portal remains on the same ADMIN role. Never retain private notes across it.
    document.addEventListener('hydroland:auth-changed', clear);
    window.addEventListener('popstate', clear);
    window.HydrolandDepartmentReferences = Object.freeze({ reload: load });
    return true;
  };
  if (!mount()) { const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); }
})();
