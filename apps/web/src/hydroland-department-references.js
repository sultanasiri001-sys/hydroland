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
      <p>مراجع التأسيس المحفوظة، والجهات المقترحة لكل إدارة، والضوابط المسجلة حاليًا. إدراج المصدر أو تفعيل ضابط لا يثبت وحده اكتمال المراجعة القانونية أو إقفال الإدارة.</p>
      <p role="status" data-reference-status></p>
      <label>إدارة المراجع<select data-reference-department aria-label="إدارة المراجع" disabled></select></label>
      <div data-reference-detail></div>
    </section>`;
    host.querySelector('[data-staff-readiness]').after(box);
    const auth = () => window.HydrolandAuth, access = () => window.HydrolandPortalAccess;
    const eligible = () => Boolean(auth()?.isAuthenticated?.() && access()?.getCurrentRole?.() === 'admin' && access()?.roleAllowed?.('admin') && !host.hidden && box.open);
    const status = box.querySelector('[data-reference-status]'), select = box.querySelector('[data-reference-department]'), detail = box.querySelector('[data-reference-detail]'), refresh = box.querySelector('[data-reference-refresh]');
    let generation = 0, data = null, busy = false;
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
      generation++; data = null; busy = false; select.replaceChildren(); select.disabled = true; detail.replaceChildren(); status.textContent = ''; refresh.disabled = false; box.open = false;
    }
    function renderSource(source, parent) {
      const item = node('article', undefined, parent);
      node('h6', source.titleAr || source.nameAr, item);
      node('p', source.id + ' · لقطة السجل: ' + source.snapshotDate, item);
      if (source.recordedStatus) node('p', 'الحالة المسجلة وقت اللقطة: ' + source.recordedStatus, item);
      if (source.versionLabel) node('p', source.versionLabel, item);
      if (source.scope) node('p', source.scope, item);
      if (source.routingStatus) node('p', 'ربط الجهة بالإدارة مقترح للمراجعة؛ لم يُعتمد انطباق متطلباتها تلقائيًا.', item);
      link(item, 'المصدر الرسمي المسجل', source.url);
      libraryLink(item, source.sourceLibraryFileId);
    }
    function render() {
      detail.replaceChildren();
      const department = data?.departments.find(d => d.code === select.value);
      if (!department) return;
      node('h5', department.nameAr, detail);
      node('p', department.unitRecorded ? (department.unitActive ? 'الإدارة موجودة ومفعّلة في الهيكل الداخلي.' : 'الإدارة موجودة وغير مفعّلة حاليًا.') : 'لم يظهر سجل للإدارة في الهيكل الداخلي.', detail);
      node('p', 'تُراجع الصلاحية بحسب الدور والإجراء والمورد والإدارة والمركز والشروط وفترة التفويض. تبقى المراجعة القانونية لدى القانونية، وملكية الإجراء لدى الإدارة المختصة.', detail);
      node('p', 'لاستكمال الربط: المصدر وإصداره، المادة أو المتطلب المعتمد، قابلية الانطباق، الإجراء والصلاحية، الدليل المتحقق منه، ومرجع الاعتماد.', detail);
      const authorities = data.authorities.filter(a => department.authorityIds.includes(a.id));
      node('h5', 'الجهات والخدمات المرجعية', detail);
      if (!authorities.length) node('p', 'مراجع هذه الإدارة واردة في السجل القانوني أدناه.', detail);
      authorities.forEach(a => renderSource(a, detail));
      const sources = [...data.legalReferences.filter(r => department.legalReferenceIds.includes(r.id)), ...data.hrSources.filter(r => department.hrSourceIds.includes(r.id))];
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
      busy = true; data = null; detail.replaceChildren(); select.disabled = true; refresh.disabled = true; status.textContent = 'جارٍ قراءة المراجع وحالة ربطها…';
      try {
        const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: () => g === generation && !host.hidden && box.open });
        if (!allowed || !current(g, session)) { if (g === generation) clear(); return; }
        const response = await auth().authorizedFetch('/admin/department-references');
        const result = await response.json().catch(() => null);
        if (!current(g, session)) return;
        if ([401, 403].includes(response.status)) { clear(); await access()?.authorizeRole?.('admin'); return; }
        if (!response.ok) throw new Error(typeof result?.message === 'string' ? result.message : 'تعذر تحميل مراجع الإدارات.');
        const arrays = ['departments', 'authorities', 'legalReferences', 'hrSources', 'hrControlCandidates'];
        if (result?.referenceOnly !== true || result.canActivate !== false || result.canonicalDepartmentCount !== 14 || !arrays.every(k => Array.isArray(result[k])) || result.departments.length !== 14 || new Set(result.departments.map(d => d.code)).size !== 14 || !Number.isFinite(Date.parse(result.observedAt))) throw new Error('استجابة مراجع الإدارات غير مكتملة.');
        data = result; select.replaceChildren();
        for (const department of data.departments) { const option = node('option', department.nameAr, select); option.value = department.code; }
        if (data.departments.some(d => d.code === chosen)) select.value = chosen;
        render();
        status.textContent = `وقت القراءة: ${new Date(data.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })} · إدارات مسجلة: ${data.recordedDepartmentCount} من 14 · الضوابط: ${data.effectivePolicyCount} · ذات مراجع مسجلة: ${data.policiesWithRecordedReferences}. بعض الضوابط مشتركة بين الإدارات. حالة المصادر تعكس تاريخ لقطة السجل.`;
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
    document.addEventListener('hydroland:auth-changed', () => { if (!eligible()) clear(); });
    window.HydrolandDepartmentReferences = Object.freeze({ reload: load });
    return true;
  };
  if (!mount()) { const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); }
})();
