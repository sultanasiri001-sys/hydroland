(() => {
  if (!document.querySelector('script[data-hl-documents]')) {
    const documents = document.createElement('script');
    documents.src = './hydroland-documents.js';
    documents.dataset.hlDocuments = '1';
    document.body.appendChild(documents);
  }

  const host = document.getElementById('role-console');
  if (!host) return;

  const panel = document.createElement('section');
  panel.className = 'hl-organizations';
  panel.hidden = true;
  panel.innerHTML = `
    <header class="hl-org-head">
      <div><small>HYDROLAND ORGANIZATIONS</small><h3>بيانات الجهة وحالة الاعتماد</h3><p>أنشئ جهة فعلية وارفعها لمسار المراجعة الإداري.</p></div>
      <button type="button" data-org-refresh>تحديث الحالة</button>
    </header>
    <div class="hl-org-layout">
      <section class="hl-org-card"><h4>جهاتي</h4><div data-org-list><p>سجّل الدخول لعرض الجهات المرتبطة بحسابك.</p></div></section>
      <form class="hl-org-form" data-org-form>
        <h4>تسجيل جهة جديدة</h4>
        <label>اسم الجهة الظاهر<input name="displayName" required maxlength="120" placeholder="مثال: مركز هيدرولاند للغوص"></label>
        <label>نوع الجهة<input name="kind" required maxlength="60" placeholder="مركز غوص، شركة، جهة حكومية..."></label>
        <label>الاسم النظامي (اختياري)<input name="legalName" maxlength="160"></label>
        <label>رقم السجل / الترخيص (اختياري)<input name="registrationNumber" maxlength="80"></label>
        <label>المنطقة (اختياري)<input name="regionCode" maxlength="32" placeholder="ASIR"></label>
        <button type="submit">إرسال للمراجعة</button>
      </form>
    </div>
    <p class="hl-org-note" data-org-note>لا تُنشأ أي جهة أو حالة اعتماد تجريبية.</p>
  `;
  host.insertAdjacentElement('afterend', panel);

  const apiBase = () => (window.HydrolandAuth?.apiBase || window.HYDROLAND_API_BASE || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const note = (message) => { const el = panel.querySelector('[data-org-note]'); if (el) el.textContent = message; };
  const token = () => window.HydrolandAuth?.getAccessToken?.();
  const statusLabel = (status) => ({ PENDING_REVIEW: 'بانتظار مراجعة الإدارة', ACTIVE: 'معتمدة ونشطة', REJECTED: 'مرفوضة', SUSPENDED: 'موقوفة', ARCHIVED: 'مؤرشفة', DRAFT: 'مسودة' }[status] || status);

  function render(items) {
    const list = panel.querySelector('[data-org-list]');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p>لا توجد جهات مرتبطة بحسابك حتى الآن.</p>'; return; }
    list.innerHTML = items.map(({ organization, role, status }) => '<article class="hl-org-item"><div><strong>' + organization.displayName + '</strong><small>' + organization.kind + ' · دورك: ' + role + '</small></div><span class="hl-org-status ' + organization.status.toLowerCase() + '">' + statusLabel(organization.status) + '</span><small>عضوية: ' + status + '</small></article>').join('');
  }

  async function refresh() {
    if (!token()) { render([]); note('سجّل الدخول بحسابك أولاً لعرض الجهات أو إنشاء جهة جديدة.'); return; }
    try {
      const response = await fetch(apiBase() + '/organizations/mine', { headers: { Authorization: 'Bearer ' + token() } });
      if (!response.ok) throw new Error('unavailable');
      render(await response.json());
      note('تم تحميل بيانات الجهات المرتبطة بحسابك من خادم HYDROLAND.');
    } catch (_) { note('تعذر الاتصال بخدمة الجهات. تأكد من تشغيل API وتسجيل الدخول.'); }
  }

  panel.querySelector('[data-org-refresh]')?.addEventListener('click', refresh);
  panel.querySelector('[data-org-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!token()) { note('سجّل الدخول أولاً قبل إرسال طلب الجهة.'); return; }
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(apiBase() + '/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('not created');
      form.reset();
      note('تم إرسال الجهة للمراجعة. ستظهر الحالة الفعلية بعد قرار الإدارة.');
      refresh();
    } catch (_) { note('تعذر إرسال طلب الجهة. تحقق من الاتصال والبيانات المدخلة.'); }
  });

  const show = () => { panel.hidden = false; refresh(); };
  const hide = () => { panel.hidden = true; };
  document.querySelectorAll('#role-dialog [data-role]').forEach((button) => button.addEventListener('click', () => setTimeout(() => {
    if (button.dataset.role === 'organization') show(); else hide();
  }, 0)));
  document.addEventListener('hydroland:auth-changed', () => { if (!panel.hidden) refresh(); });
})();
