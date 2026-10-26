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
          if (!allowed || !active()) return;
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
        const { active, dismiss, session } = context;
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
            if (!allowed || !active()) return;
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
                if (!authorized || !active()) return;
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
        node('p', policy.ruleKey + ' · ' + (policy.state === 'ENABLED' ? 'مفعّل تشغيليًا' : policy.state === 'REVIEW' ? 'قيد المراجعة' : 'غير مفعّل'), item);
        node('p', policy.referencesRecorded ? 'مراجع وأدلة واعتماد مسجلة؛ يلزم التحقق من صحتها وانطباقها.' : 'ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل في السجل المفحوص.', item);
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
        const templateCodes = result.departments.flatMap(d => d.operatingCycle.templates.map(t => t.code));
        if (!Number.isSafeInteger(result.canonicalSourceTemplateCount) || result.canonicalSourceTemplateCount !== templateCodes.length || new Set(templateCodes).size !== templateCodes.length) throw new Error('استجابة نماذج الإدارات غير مكتملة.');
        data = result; select.replaceChildren();
        for (const department of data.departments) { const option = node('option', department.nameAr, select); option.value = department.code; }
        if (data.departments.some(d => d.code === chosen)) select.value = chosen;
        render();
        status.textContent = `وقت القراءة: ${new Date(data.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })} · إدارات مسجلة: ${data.recordedDepartmentCount} من 14 · نماذج الكتالوج: ${data.canonicalSourceTemplateCount} · الضوابط: ${data.effectivePolicyCount} · ذات مراجع مسجلة: ${data.policiesWithRecordedReferences}. بعض الضوابط مشتركة بين الإدارات. حالة المصادر تعكس تاريخ لقطة السجل.`;
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
