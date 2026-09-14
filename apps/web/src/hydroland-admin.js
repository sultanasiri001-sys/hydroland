(() => {
  if (!document.querySelector('script[src="./hydroland-booking-admin.js"]')) {
    const module = document.createElement('script');
    module.src = './hydroland-booking-admin.js';
    module.defer = true;
    document.body.appendChild(module);
  }

  const host = document.getElementById('role-console') || document.querySelector('main');
  if (!host) return;

  const box = document.createElement('section');
  box.className = 'hl-admin';
  box.hidden = true;
  box.innerHTML = `
    <div class="hl-admin__header">
      <div>
        <span class="eyebrow">HYDROLAND / الإدارة</span>
        <h2>مركز التحكم التشغيلي</h2>
        <p>مراجعة الطلبات وإدارة الحسابات من بيانات المنصة الفعلية.</p>
      </div>
      <button class="btn btn-primary" type="button" data-admin-refresh>تحديث البيانات</button>
    </div>
    <div class="hl-admin__metrics">
      <article><span>طلبات بانتظار المراجعة</span><strong data-admin-metric="pendingReviews">—</strong></article>
      <article><span>حجوزات نشطة</span><strong data-admin-metric="activeBookings">—</strong></article>
      <article><span>الحسابات المسجلة</span><strong data-admin-metric="accounts">—</strong></article>
      <article><span>رحلات مفتوحة</span><strong data-admin-metric="openTrips">—</strong></article>
    </div>
    <div class="hl-admin__grid">
      <article class="hl-admin__panel">
        <div class="hl-admin__panel-title"><h3>طابور المراجعة</h3><span data-admin-state>بانتظار الاتصال</span></div>
        <div class="hl-admin__queue" data-admin-queue><p>سجّل الدخول بحساب إداري ثم حدّث البيانات لعرض الطلبات الفعلية.</p></div>
      </article>
      <article class="hl-admin__panel">
        <div class="hl-admin__panel-title"><h3>ضوابط الإدارة</h3><span>مفعل</span></div>
        <ul><li>لا تُعرض أرقام تجريبية أو مؤشرات وهمية.</li><li>الصلاحيات تحددها جلسة الحساب الإداري.</li><li>الطلبات تظهر فقط عند اتصال الخادم وقاعدة البيانات.</li></ul>
      </article>
    </div>
    <p class="hl-admin__notice" data-admin-copy>بيانات الإدارة تظهر عند اتصال المنصة بخادم HYDROLAND.</p>
  `;
  host.insertAdjacentElement('afterend', box);

  const getBase = () => (window.HydrolandAuth?.apiBase || window.HYDROLAND_API_BASE || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const setNotice = (message) => {
    const notice = box.querySelector('[data-admin-copy]');
    if (notice) notice.textContent = message;
  };
  const renderQueue = (items) => {
    const queue = box.querySelector('[data-admin-queue]');
    if (!queue) return;
    if (!items.length) { queue.innerHTML = '<p>لا توجد طلبات معلقة حالياً.</p>'; return; }
    queue.innerHTML = items.map((item) => {
      const name = item.account?.person ? [item.account.person.firstName, item.account.person.lastName].filter(Boolean).join(' ') : item.account?.email || 'حساب جديد';
      const type = item.type === 'ORGANIZATION' ? 'طلب جهة / منظمة' : 'طلب تفعيل حساب';
      return '<article class="hl-admin__queue-item"><strong>' + name + '</strong><span>' + type + '</span></article>';
    }).join('');
  };

  async function refreshAdminOverview() {
    const token = window.HydrolandAuth?.getAccessToken?.();
    const state = box.querySelector('[data-admin-state]');
    if (!token) {
      if (state) state.textContent = 'يتطلب دخول إداري';
      setNotice('سجّل الدخول بحساب إداري لعرض البيانات الفعلية.');
      return;
    }
    if (state) state.textContent = 'جارٍ التحديث';
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const overviewResponse = await fetch(getBase() + '/admin/overview', { headers });
      if (!overviewResponse.ok) throw new Error('overview unavailable');
      const overview = await overviewResponse.json();
      Object.keys(overview).forEach((key) => {
        const metric = box.querySelector('[data-admin-metric="' + key + '"]');
        if (metric) metric.textContent = String(overview[key]);
      });
      const queueResponse = await fetch(getBase() + '/admin/review-queue', { headers });
      if (queueResponse.ok) renderQueue(await queueResponse.json());
      if (state) state.textContent = 'متصل بالخادم';
      setNotice('تم تحديث بيانات الإدارة من خادم HYDROLAND.');
    } catch (_) {
      if (state) state.textContent = 'تعذر الاتصال';
      setNotice('تعذر الوصول لخادم الإدارة. تأكد من تشغيل واجهة API وتسجيل الدخول بحساب إداري.');
    }
  }

  const show = () => { box.hidden = false; refreshAdminOverview(); };
  const hide = () => { box.hidden = true; };
  document.addEventListener('hydroland:role-changed', (event) => { if (event.detail?.role === 'admin') show(); else hide(); });
  document.addEventListener('hydroland:auth-changed', () => { if (!box.hidden) refreshAdminOverview(); });
  box.querySelector('[data-admin-refresh]')?.addEventListener('click', refreshAdminOverview);
})();
