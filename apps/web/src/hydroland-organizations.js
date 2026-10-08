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
      <section class="hl-org-card"><h4>جهاتي</h4><div data-org-list><p>سجّل الدخول لعرض الجهات المرتبطة بحسابك.</p></div><section data-org-members hidden aria-live="polite"></section></section>
      <form class="hl-org-form" data-org-form>
        <h4 data-org-form-title>تسجيل جهة جديدة</h4>
        <label>اسم الجهة الظاهر<input name="displayName" required maxlength="120" placeholder="مثال: مركز هيدرولاند للغوص"></label>
        <label>نوع الجهة<input name="kind" required maxlength="60" placeholder="مركز غوص، شركة، جهة حكومية..."></label>
        <label>الاسم النظامي (اختياري)<input name="legalName" maxlength="160"></label>
        <label>رقم السجل / الترخيص (اختياري)<input name="registrationNumber" maxlength="80"></label>
        <label>المنطقة (اختياري)<input name="regionCode" maxlength="32" placeholder="ASIR"></label>
        <div class="hl-org-form-actions"><button type="submit" data-org-submit>إرسال للمراجعة</button><button type="button" data-org-cancel hidden>إلغاء التعديل</button></div>
      </form>
    </div>
    <section class="hl-org-requests" data-org-requests hidden aria-live="polite">
      <header><div><small>ORGANIZATION CUSTOMER SERVICE</small><h4 data-org-requests-title>طلبات الجهة</h4></div><button type="button" data-org-requests-close>إغلاق</button></header>
      <div data-org-request-list><p>جارٍ تحميل الطلبات…</p></div><button type="button" data-org-request-more hidden>تحميل طلبات أقدم</button>
      <form data-org-request-form>
        <h4>إنشاء طلب خدمة</h4>
        <label>نوع الطلب<select name="type" required><option value="QUESTION">استفسار</option><option value="SUPPORT">دعم</option><option value="COMPLAINT">شكوى</option><option value="BOOKING_ISSUE">مشكلة حجز</option><option value="PAYMENT_ISSUE">مشكلة دفع</option><option value="SAFETY_CONCERN">ملاحظة سلامة</option></select></label>
        <label>الموضوع<input name="subject" required maxlength="180"></label>
        <label>التفاصيل<textarea name="description" required maxlength="10000" rows="4"></textarea></label>
        <button type="submit" data-org-request-submit>إرسال الطلب</button>
      </form>
      <p class="hl-org-note" data-org-requests-note></p>
    </section>
    <section class="hl-org-requests" data-org-bookings hidden aria-live="polite">
      <header><div><small>ORGANIZATION BOOKINGS</small><h4 data-org-bookings-title>حجوزات الجهة</h4></div><button type="button" data-org-bookings-close>إغلاق</button></header>
      <div data-org-booking-list><p>جارٍ تحميل الحجوزات…</p></div>
      <form data-org-booking-form>
        <h4>طلب حجز رحلة</h4>
        <label>الرحلة<select name="tripId" data-org-trip required><option value="">جارٍ تحميل الرحلات…</option></select></label>
        <label>عدد المقاعد<input name="seats" type="number" min="1" max="30" value="1" required></label>
        <label>أسماء المشاركين، اسم في كل سطر (اختياري)<textarea name="participantNames" maxlength="5000" rows="4" placeholder="اتركه فارغًا لإكمال الأسماء لاحقًا"></textarea></label>
        <small>أسماء المشاركين مطلوبة قبل اعتماد الحجز. الأسعار وشروط الرحلة تظهر بعد اختيارها.</small>
        <button type="submit" data-org-booking-submit>إرسال طلب الحجز</button><p data-org-booking-note role="status"></p>
      </form>
    </section>
    <section class="hl-org-requests" data-org-safety hidden aria-live="polite">
      <header><div><small>ORGANIZATION SAFETY</small><h4 data-org-safety-title>سلامة الجهة</h4></div><button type="button" data-org-safety-close>إغلاق</button></header>
      <div data-org-incident-list><p>جارٍ تحميل البلاغات…</p></div>
      <form data-org-incident-form>
        <h4>الإبلاغ عن حادثة أو ملاحظة سلامة</h4>
        <label>الحجز المرتبط<select name="bookingId" data-org-incident-booking required><option value="">اختر حجزًا</option></select></label>
        <label>الخطورة<select name="severity" required><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">عالية</option><option value="CRITICAL">حرجة</option></select></label>
        <label>الموضوع<input name="title" required maxlength="160"></label>
        <label>التفاصيل<textarea name="description" required maxlength="5000" rows="4"></textarea></label>
        <label>الموقع (اختياري)<input name="locationName" maxlength="160"></label>
        <button type="submit">إرسال البلاغ</button><p data-org-safety-note role="status"></p>
      </form>
    </section>
    <p class="hl-org-note" data-org-note>لا تُنشأ أي جهة أو حالة اعتماد تجريبية.</p>
  `;
  host.insertAdjacentElement('afterend', panel);

  const note = (message) => { const el = panel.querySelector('[data-org-note]'); if (el) el.textContent = message; };
  const request = async (path, options = {}) => {
    const client = window.HydrolandAuth?.authorizedFetch;
    if (!client) throw new Error('خدمة المصادقة غير جاهزة.');
    const response = await client(path, options);
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || 'تعذر إكمال الطلب.');
    return body;
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const statusLabel = (status) => ({ PENDING_REVIEW: 'بانتظار مراجعة الإدارة', ACTIVE: 'معتمدة ونشطة', REJECTED: 'مرفوضة', SUSPENDED: 'موقوفة', ARCHIVED: 'مؤرشفة', DRAFT: 'مسودة' }[status] || status);
  const roleLabel = (role) => ({ OWNER: 'مالك الجهة', ADMIN: 'مدير الجهة', OPERATOR: 'مسؤول تشغيل', INSTRUCTOR: 'مدرب غوص', STAFF: 'عضو فريق', VIEWER: 'مشاهد' }[role] || role);
  const membershipStatusLabel = (status) => ({ ACTIVE: 'نشط', PENDING: 'دعوة معلّقة', SUSPENDED: 'موقوف', REMOVED: 'منتهية' }[status] || status);
  let stateMemberships = [];
  let editingOrganization = null;
  let memberLoadVersion = 0;
  let selectedMembersOrganization = null;
  let selectedRequestsOrganization = null;
  let requestLoadVersion = 0;
  let requestPage = 1;
  let selectedBookingsOrganization = null;
  let bookingLoadVersion = 0;
  let pendingBookingRequest = null;
  let selectedSafetyOrganization = null;
  let safetyLoadVersion = 0;
  let directoryLoadVersion = 0;
  const clearPrivateViews = () => {
    pendingBookingRequest = null;
    for (const selector of ['[data-org-members]', '[data-org-request-list]', '[data-org-booking-list]', '[data-org-incident-list]']) panel.querySelector(selector).innerHTML = '';
    for (const selector of ['[data-org-requests-note]', '[data-org-booking-note]', '[data-org-safety-note]']) panel.querySelector(selector).textContent = '';
    for (const selector of ['[data-org-request-form]', '[data-org-booking-form]', '[data-org-incident-form]']) panel.querySelector(selector).reset();
  };

  const resetForm = () => {
    editingOrganization = null;
    panel.querySelector('[data-org-form]').reset();
    panel.querySelector('[data-org-form-title]').textContent = 'تسجيل جهة جديدة';
    panel.querySelector('[data-org-submit]').textContent = 'إرسال للمراجعة';
    panel.querySelector('[data-org-cancel]').hidden = true;
  };

  function render(items) {
    const list = panel.querySelector('[data-org-list]');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p>لا توجد جهات مرتبطة بحسابك حتى الآن.</p>'; return; }
    list.innerHTML = items.map(({ organization, role, status }) => {
      const manager = status === 'ACTIVE' && ['OWNER', 'ADMIN'].includes(role);
      const canViewRequests = status === 'ACTIVE' && organization.status === 'ACTIVE';
      const canOperate = status === 'ACTIVE' && organization.status === 'ACTIVE' && ['OWNER', 'ADMIN', 'OPERATOR'].includes(role);
      const canReportSafety = status === 'ACTIVE' && organization.status === 'ACTIVE' && ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(role);
      return '<article class="hl-org-item" data-org-id="' + esc(organization.id) + '"><div><strong>' + esc(organization.displayName) + '</strong><small>' + esc(organization.kind) + ' · دورك: ' + esc(roleLabel(role)) + '</small></div><span class="hl-org-status ' + esc(organization.status.toLowerCase()) + '">' + esc(statusLabel(organization.status)) + '</span><small>العضوية: ' + esc(status) + '</small>' + ((manager || canViewRequests || canOperate || canReportSafety) ? '<div class="hl-org-item-actions">' + (manager ? '<button type="button" data-org-edit>تعديل بيانات الجهة</button><button type="button" data-org-view-members>عرض العضويات</button>' : '') + (canViewRequests ? '<button type="button" data-org-requests-open>طلبات الخدمات</button>' : '') + (canOperate ? '<button type="button" data-org-bookings-open>الحجوزات</button>' : '') + (canReportSafety ? '<button type="button" data-org-safety-open>السلامة والبلاغات</button>' : '') + '</div>' : '') + '</article>';
    }).join('');
  }

  async function loadOrganizationMembers(organizationId, membership) {
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.();
    const version = ++memberLoadVersion; selectedMembersOrganization = organizationId;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === memberLoadVersion && selectedMembersOrganization === organizationId);
    const members = await request('/organizations/' + encodeURIComponent(organizationId) + '/members');
    if (!current()) return;
    const box = panel.querySelector('[data-org-members]');
    const people = Array.isArray(members) ? members : [];
    const invite = membership.organization.status === 'ACTIVE' || membership.organization.status === 'PENDING_REVIEW';
    const roleOptions = (membership.role === 'OWNER' ? '<option value="ADMIN">مدير الجهة</option>' : '') + '<option value="OPERATOR">مسؤول تشغيل</option><option value="INSTRUCTOR">مدرب غوص</option><option value="STAFF">عضو فريق</option><option value="VIEWER">مشاهد</option>';
    box.innerHTML = '<h4>عضويات ' + esc(membership.organization.displayName) + '</h4>' + (people.length ? '<div class="hl-org-members">' + people.map(member => {
      const person = member.account?.person || {};
      const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || member.account?.email || 'عضو';
      return '<article><strong>' + esc(name) + '</strong><span>' + esc(roleLabel(member.role)) + '</span><small>' + esc(membershipStatusLabel(member.status)) + (member.account?.email ? ' · ' + esc(member.account.email) : '') + '</small></article>';
    }).join('') + '</div>' : '<p>لا توجد عضويات مسجلة لهذه الجهة.</p>') + (invite ? '<form class="hl-org-invite" data-org-invite data-org-id="' + esc(organizationId) + '"><h5>دعوة عضو</h5><label>البريد المسجل في HYDROLAND<input type="email" name="email" required maxlength="254" autocomplete="off" placeholder="name@example.com"></label><label>الدور داخل الجهة<select name="role" required>' + roleOptions + '</select></label><small>تصل الدعوة إلى إشعارات المستخدم، ولا تتفعل العضوية إلا بعد قبولها.</small><button type="submit">إرسال الدعوة</button><p data-org-invite-feedback role="status"></p></form>' : '');
    box.hidden = false;
  }

  async function refresh(successMessage) {
    const auth = window.HydrolandAuth;
    const session = auth?.getSessionVersion?.();
    const version = ++directoryLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === directoryLoadVersion && !panel.hidden);
    clearPrivateViews();
    stateMemberships = [];
    memberLoadVersion++;
    selectedMembersOrganization = null;
    requestLoadVersion++;
    selectedRequestsOrganization = null;
    panel.querySelector('[data-org-requests]').hidden = true;
    panel.querySelector('[data-org-bookings]').hidden = true; selectedBookingsOrganization = null; bookingLoadVersion++;
    panel.querySelector('[data-org-safety]').hidden = true; selectedSafetyOrganization = null; safetyLoadVersion++;
    render([]);
    panel.querySelector('[data-org-members]').hidden = true;
    if (editingOrganization) resetForm();
    if (!current()) { stateMemberships = []; render([]); panel.querySelector('[data-org-members]').hidden = true; note('سجّل الدخول بحسابك أولاً لعرض الجهات أو إنشاء جهة جديدة.'); return; }
    try {
      const memberships = await request('/organizations/mine');
      if (!current()) return;
      stateMemberships = Array.isArray(memberships) ? memberships : [];
      render(stateMemberships);
      note(typeof successMessage === 'string' ? successMessage : 'تم تحميل بيانات الجهات المرتبطة بحسابك من خادم HYDROLAND.');
    } catch (error) { if (!current()) return; stateMemberships = []; render([]); panel.querySelector('[data-org-members]').hidden = true; note(error instanceof Error ? error.message : 'تعذر الاتصال بخدمة الجهات.'); }
  }

  const bookingStatus = (status) => ({ PENDING: 'بانتظار الاعتماد', CONFIRMED: 'مؤكد', CANCELLED: 'ملغى', COMPLETED: 'مكتمل' }[status] || status);
  const severityLabel = (severity) => ({ LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية', CRITICAL: 'حرجة' }[severity] || severity);
  async function loadOrganizationBookings(organizationId, membership) {
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = ++bookingLoadVersion;
    selectedBookingsOrganization = organizationId;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === bookingLoadVersion && selectedBookingsOrganization === organizationId);
    const box = panel.querySelector('[data-org-booking-list]'); box.innerHTML = '<p>جارٍ تحميل الحجوزات…</p>';
    try {
      const [result, trips] = await Promise.all([request('/organizations/' + encodeURIComponent(organizationId) + '/bookings?page=1&pageSize=50'), request('/trips')]);
      if (!current()) return;
      const rows = Array.isArray(result?.items) ? result.items : [];
      const mayEdit = ['OWNER', 'ADMIN', 'OPERATOR'].includes(membership.role);
      const mayCancel = ['OWNER', 'ADMIN'].includes(membership.role);
      box.innerHTML = rows.length ? rows.map(booking => {
        const canEdit = mayEdit && booking.status === 'PENDING' && new Date(booking.trip?.startsAt) > new Date();
        return '<article class="hl-org-request" data-org-booking-id="' + esc(booking.id) + '" data-org-booking-version="' + esc(booking.updatedAt) + '"><div><strong>' + esc(booking.trip?.title || 'رحلة') + '</strong><span>' + esc(bookingStatus(booking.status)) + '</span></div><small>' + esc(new Date(booking.trip?.startsAt).toLocaleString('ar-SA')) + ' · ' + esc(booking.seats) + ' مقعدًا</small><div class="hl-org-participants">' + (booking.participants || []).map(person => '<form data-org-participant data-participant-id="' + esc(person.id) + '"><label>اسم المشارك<input name="fullName" value="' + esc(person.fullName) + '" maxlength="160" required ' + (canEdit ? '' : 'disabled') + '></label><label>المؤهل<input name="certificationTitle" value="' + esc(person.certificationTitle || '') + '" maxlength="160" ' + (canEdit ? '' : 'disabled') + '></label>' + (canEdit ? '<button type="submit">حفظ بيانات المشارك</button>' : '<small>' + esc(person.eligibilityStatus) + '</small>') + '</form>').join('') + '</div>' + (mayCancel && booking.status === 'PENDING' ? '<button type="button" data-org-booking-cancel>إلغاء الحجز (لا ينفذ استردادًا)</button>' : '') + '</article>';
      }).join('') : '<p>لا توجد حجوزات مسجلة لهذه الجهة.</p>';
      const tripsSelect = panel.querySelector('[data-org-trip]');
      const availableTrips = (Array.isArray(trips) ? trips : []).filter(trip => trip.status === 'OPEN' && new Date(trip.startsAt) > new Date());
      tripsSelect.innerHTML = '<option value="">اختر رحلة متاحة</option>' + availableTrips.map(trip => '<option value="' + esc(trip.id) + '">' + esc(trip.title) + ' · ' + esc(new Date(trip.startsAt).toLocaleString('ar-SA')) + ' · المتبقي ' + esc(trip.remainingSeats) + '</option>').join('');
      tripsSelect.disabled = !mayEdit || availableTrips.length === 0;
      panel.querySelector('[data-org-booking-form]').hidden = !mayEdit || availableTrips.length === 0;
    } catch (error) { if (current()) box.innerHTML = '<p class="hl-org-error">' + esc(error instanceof Error ? error.message : 'تعذر تحميل الحجوزات.') + '</p>'; }
  }
  async function loadOrganizationIncidents(organizationId, membership) {
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = ++safetyLoadVersion;
    selectedSafetyOrganization = organizationId;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === safetyLoadVersion && selectedSafetyOrganization === organizationId);
    const box = panel.querySelector('[data-org-incident-list]'); box.innerHTML = '<p>جارٍ تحميل البلاغات…</p>';
    try {
      const [incidents, bookings] = await Promise.all([request('/organizations/' + encodeURIComponent(organizationId) + '/safety/incidents'), request('/organizations/' + encodeURIComponent(organizationId) + '/bookings?page=1&pageSize=50')]);
      if (!current()) return;
      const rows = Array.isArray(incidents) ? incidents : [];
      box.innerHTML = rows.length ? rows.map(item => '<article class="hl-org-request"><div><strong>' + esc(item.title) + '</strong><span>' + esc(severityLabel(item.severity)) + ' · ' + esc(item.status) + '</span></div><small>' + esc(item.trip?.title || 'رحلة') + ' · ' + esc(new Date(item.createdAt).toLocaleString('ar-SA')) + (item.locationName ? ' · ' + esc(item.locationName) : '') + '</small><p>' + esc(item.description) + '</p></article>').join('') : '<p>لا توجد بلاغات سلامة مرتبطة بحجوزات الجهة.</p>';
      const select = panel.querySelector('[data-org-incident-booking]');
      const booked = Array.isArray(bookings?.items) ? bookings.items : [];
      select.innerHTML = '<option value="">اختر حجزًا</option>' + booked.map(item => '<option value="' + esc(item.id) + '">' + esc(item.trip?.title || item.id) + ' · ' + esc(bookingStatus(item.status)) + '</option>').join('');
      const canReport = ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership.role);
      panel.querySelector('[data-org-incident-form]').hidden = !canReport || booked.length === 0;
    } catch (error) { if (current()) box.innerHTML = '<p class="hl-org-error">' + esc(error instanceof Error ? error.message : 'تعذر تحميل البلاغات.') + '</p>'; }
  }

  panel.querySelector('[data-org-booking-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const organizationId = selectedBookingsOrganization;
    const membership = stateMemberships.find(row => row.organization?.id === organizationId);
    if (!organizationId || !membership || !['OWNER', 'ADMIN', 'OPERATOR'].includes(membership.role)) return;
    const form = event.currentTarget, values = Object.fromEntries(new FormData(form).entries());
    const seats = Number(values.seats), participantNames = String(values.participantNames || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (participantNames.length && participantNames.length !== seats) { panel.querySelector('[data-org-booking-note]').textContent = 'اكتب اسمًا لكل مقعد أو اترك الأسماء فارغة لإكمالها لاحقًا.'; return; }
    const button = panel.querySelector('[data-org-booking-submit]'); button.disabled = true;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = bookingLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedBookingsOrganization === organizationId && version === bookingLoadVersion);
    const fingerprint = JSON.stringify([session, organizationId, values.tripId, seats, participantNames]);
    if (pendingBookingRequest?.fingerprint !== fingerprint) pendingBookingRequest = { fingerprint, requestKey: crypto.randomUUID() };
    const bookingRequest = pendingBookingRequest;
    try {
      const result = await request('/organizations/' + encodeURIComponent(organizationId) + '/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId: values.tripId, seats, requestKey: bookingRequest.requestKey, participantNames }) });
      if (!current()) return;
      if (pendingBookingRequest === bookingRequest) pendingBookingRequest = null;
      form.reset(); form.elements.seats.value = '1';
      panel.querySelector('[data-org-booking-note]').textContent = 'تم تسجيل طلب الحجز بحالة انتظار. ' + (result?.price?.configured ? 'السعر ' + (result.price.pricePerSeatMinor / 100).toFixed(2) + ' ر.س للمقعد.' : 'لم يُضبط سعر الرحلة بعد.');
      await loadOrganizationBookings(organizationId, membership);
    } catch (error) { if (current()) panel.querySelector('[data-org-booking-note]').textContent = error instanceof Error ? error.message : 'تعذر إرسال طلب الحجز.'; }
    finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-booking-list]')?.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-org-participant]'); if (!form) return;
    event.preventDefault(); const organizationId = selectedBookingsOrganization, bookingId = form.closest('[data-org-booking-id]')?.dataset.orgBookingId, participantId = form.dataset.participantId;
    if (!organizationId || !bookingId || !participantId) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.();
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedBookingsOrganization === organizationId);
    const body = Object.fromEntries(new FormData(form).entries());
    body.certificationTitle ||= null;
    body.expectedUpdatedAt = form.closest('[data-org-booking-id]')?.dataset.orgBookingVersion;
    if (!body.expectedUpdatedAt) { note('حدّث قائمة الحجوزات قبل تعديل المشاركين.'); return; }
    const button = form.querySelector('button'); if (button) button.disabled = true;
    try {
      await request('/organizations/' + encodeURIComponent(organizationId) + '/bookings/' + encodeURIComponent(bookingId) + '/participants/' + encodeURIComponent(participantId), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (current()) await loadOrganizationBookings(organizationId, stateMemberships.find(row => row.organization?.id === organizationId));
    } catch (error) { if (current()) note(error instanceof Error ? error.message : 'تعذر حفظ بيانات المشارك.'); }
    finally { if (button) button.disabled = false; }
  });
  panel.querySelector('[data-org-booking-list]')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-org-booking-cancel]'); if (!button) return;
    const organizationId = selectedBookingsOrganization, bookingId = button.closest('[data-org-booking-id]')?.dataset.orgBookingId;
    if (!organizationId || !bookingId) return;
    const reason = window.prompt('اكتب سبب الإلغاء (10 أحرف على الأقل). لن يُنفّذ النظام استردادًا ماليًا.'); if (!reason) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = bookingLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedBookingsOrganization === organizationId && version === bookingLoadVersion);
    button.disabled = true;
    try { await request('/organizations/' + encodeURIComponent(organizationId) + '/bookings/' + encodeURIComponent(bookingId) + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), reason }) }); if (current()) await loadOrganizationBookings(organizationId, stateMemberships.find(row => row.organization?.id === organizationId)); }
    catch (error) { if (current()) note(error instanceof Error ? error.message : 'تعذر إلغاء الحجز.'); } finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-incident-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const organizationId = selectedSafetyOrganization; if (!organizationId) return;
    const form = event.currentTarget, body = Object.fromEntries(new FormData(form).entries()), button = form.querySelector('button[type="submit"]'); button.disabled = true;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = safetyLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedSafetyOrganization === organizationId && version === safetyLoadVersion);
    try { await request('/organizations/' + encodeURIComponent(organizationId) + '/safety/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!current()) return; form.reset(); panel.querySelector('[data-org-safety-note]').textContent = 'تم تسجيل البلاغ وربطه بحجز الجهة.'; await loadOrganizationIncidents(organizationId, stateMemberships.find(row => row.organization?.id === organizationId)); }
    catch (error) { if (current()) panel.querySelector('[data-org-safety-note]').textContent = error instanceof Error ? error.message : 'تعذر إرسال البلاغ.'; } finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-bookings-close]')?.addEventListener('click', () => { bookingLoadVersion++; selectedBookingsOrganization = null; panel.querySelector('[data-org-bookings]').hidden = true; });
  panel.querySelector('[data-org-safety-close]')?.addEventListener('click', () => { safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-safety]').hidden = true; });

  panel.querySelector('[data-org-refresh]')?.addEventListener('click', refresh);
  panel.querySelector('[data-org-cancel]')?.addEventListener('click', () => { resetForm(); note('أُلغي تعديل بيانات الجهة.'); });
  panel.querySelector('[data-org-list]')?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-org-edit],button[data-org-view-members],button[data-org-requests-open],button[data-org-bookings-open],button[data-org-safety-open]');
    if (!button) return;
    const card = button.closest('[data-org-id]');
    const organizationId = card?.dataset.orgId;
    const membership = stateMemberships.find(row => row.organization?.id === organizationId);
    if (!membership || membership.status !== 'ACTIVE') return;
    if (button.matches('[data-org-bookings-open]')) {
      if (membership.organization.status !== 'ACTIVE' || !['OWNER', 'ADMIN', 'OPERATOR'].includes(membership.role)) return;
      selectedBookingsOrganization = organizationId; panel.querySelector('[data-org-bookings-title]').textContent = 'حجوزات ' + membership.organization.displayName; panel.querySelector('[data-org-bookings]').hidden = false;
      panel.querySelector('[data-org-safety]').hidden = true; selectedSafetyOrganization = null; safetyLoadVersion++;
      await loadOrganizationBookings(organizationId, membership); return;
    }
    if (button.matches('[data-org-safety-open]')) {
      if (membership.organization.status !== 'ACTIVE' || !['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership.role)) return;
      selectedSafetyOrganization = organizationId; panel.querySelector('[data-org-safety-title]').textContent = 'سلامة ' + membership.organization.displayName; panel.querySelector('[data-org-safety]').hidden = false;
      panel.querySelector('[data-org-bookings]').hidden = true; selectedBookingsOrganization = null; bookingLoadVersion++;
      await loadOrganizationIncidents(organizationId, membership); return;
    }
    const canManage = ['OWNER', 'ADMIN'].includes(membership.role);
    if (button.matches('[data-org-requests-open]')) {
      if (membership.organization.status !== 'ACTIVE') return;
      selectedRequestsOrganization = organizationId;
      panel.querySelector('[data-org-requests-title]').textContent = 'طلبات ' + membership.organization.displayName;
      panel.querySelector('[data-org-requests]').hidden = false;
      panel.querySelector('[data-org-request-form]').hidden = !['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership.role);
      await loadOrganizationRequests(organizationId);
      return;
    }
    if (!canManage) return;
    button.disabled = true;
    try {
      if (button.matches('[data-org-edit]')) {
        editingOrganization = organizationId;
        const form = panel.querySelector('[data-org-form]');
        form.reset();
        for (const [key, value] of Object.entries(membership.organization)) {
          const input = form.elements.namedItem(key);
          if (input && typeof value === 'string') input.value = value;
        }
        panel.querySelector('[data-org-form-title]').textContent = 'تعديل بيانات الجهة';
        panel.querySelector('[data-org-submit]').textContent = 'حفظ التعديلات';
        panel.querySelector('[data-org-cancel]').hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        note('عدّل البيانات المطلوبة ثم احفظها. سيحتفظ النظام بحالة الاعتماد وفق سياسة الجهة.');
      } else {
        await loadOrganizationMembers(organizationId, membership);
      }
    } catch (error) { note(error instanceof Error ? error.message : 'تعذر تحميل بيانات العضويات.'); }
    finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-members]')?.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-org-invite]'); if (!form) return;
    event.preventDefault();
    const organizationId = form.dataset.orgId;
    const membership = stateMemberships.find(row => row.organization?.id === organizationId);
    if (!membership || membership.status !== 'ACTIVE' || !['OWNER', 'ADMIN'].includes(membership.role)) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.());
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await request('/organizations/' + encodeURIComponent(organizationId) + '/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!current()) return;
      if (result?.status !== 'PENDING') throw new Error('لم تُسجّل الدعوة في حالة انتظار.');
      note('أُرسلت الدعوة. تنتظر قبول صاحب الحساب من إشعاراته.');
      await loadOrganizationMembers(organizationId, membership);
    } catch (error) { if (current()) { const feedback = form.querySelector('[data-org-invite-feedback]'); if (feedback) feedback.textContent = error instanceof Error ? error.message : 'تعذر إرسال الدعوة.'; } }
    finally { submit.disabled = false; }
  });

  const caseStatusLabel = (status) => ({ OPEN: 'مفتوح', ASSIGNED: 'قيد المعالجة', WAITING_CUSTOMER: 'بانتظار رد الجهة', RESOLVED: 'تم الحل', CLOSED: 'مغلق' }[status] || status);
  async function loadOrganizationRequests(organizationId, page = 1, append = false) {
    const auth = window.HydrolandAuth;
    const session = auth?.getSessionVersion?.();
    const version = ++requestLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === requestLoadVersion && selectedRequestsOrganization === organizationId);
    const list = panel.querySelector('[data-org-request-list]');
    if (!append) list.innerHTML = '<p>جارٍ تحميل الطلبات…</p>';
    const more = panel.querySelector('[data-org-request-more]'); more.hidden = true;
    try {
      const result = await request('/organizations/' + encodeURIComponent(organizationId) + '/requests?page=' + page + '&pageSize=20');
      if (!current()) return;
      const rows = Array.isArray(result?.items) ? result.items : [];
      if (!rows.length && !append) { list.innerHTML = '<p>لا توجد طلبات خدمة لهذه الجهة.</p>'; requestPage = 1; return; }
      const membership = stateMemberships.find(row => row.organization?.id === organizationId);
      const canWrite = ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership?.role) && membership?.status === 'ACTIVE';
      const markup = rows.map(item => '<article class="hl-org-request" data-org-case-id="' + esc(item.id) + '"><div><strong>' + esc(item.subject) + '</strong><span>' + esc(caseStatusLabel(item.status)) + '</span></div><small>' + esc(item.type) + ' · ' + esc(new Date(item.createdAt).toLocaleDateString('ar-SA')) + '</small><p>' + esc(item.description) + '</p><div class="hl-org-request-thread">' + (item.interactions || []).map(reply => '<p><b>' + esc(reply.actorType === 'CUSTOMER' ? 'الجهة' : reply.actorType) + ':</b> ' + esc(reply.message) + '</p>').join('') + '</div>' + (canWrite ? '<form data-org-case-reply><label>إضافة رد<input name="message" required maxlength="10000" placeholder="اكتب ردًا على الطلب"></label><button type="submit">إرسال الرد</button></form>' : '') + '</article>').join('');
      if (append) list.insertAdjacentHTML('beforeend', markup); else list.innerHTML = markup;
      requestPage = page; more.hidden = !(page < Number(result?.totalPages || 1));
    } catch (error) { if (current()) list.innerHTML = '<p class="hl-org-error">' + esc(error instanceof Error ? error.message : 'تعذر تحميل الطلبات.') + '</p>'; }
  }
  panel.querySelector('[data-org-request-more]')?.addEventListener('click', async event => { const button = event.currentTarget, organizationId = selectedRequestsOrganization; if (!organizationId) return; button.disabled = true; try { await loadOrganizationRequests(organizationId, requestPage + 1, true); } finally { button.disabled = false; } });
  panel.querySelector('[data-org-requests-close]')?.addEventListener('click', () => { requestLoadVersion++; selectedRequestsOrganization = null; panel.querySelector('[data-org-requests]').hidden = true; });
  panel.querySelector('[data-org-request-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const organizationId = selectedRequestsOrganization;
    if (!organizationId) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedRequestsOrganization === organizationId);
    const button = panel.querySelector('[data-org-request-submit]'); button.disabled = true;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await request('/organizations/' + encodeURIComponent(organizationId) + '/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!current()) return;
      form.reset(); panel.querySelector('[data-org-requests-note]').textContent = 'تم إرسال الطلب وحفظه في سجل خدمة العملاء.';
      await loadOrganizationRequests(organizationId);
    } catch (error) { if (current()) panel.querySelector('[data-org-requests-note]').textContent = error instanceof Error ? error.message : 'تعذر إرسال الطلب.'; }
    finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-request-list]')?.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-org-case-reply]'); if (!form) return;
    event.preventDefault();
    const organizationId = selectedRequestsOrganization, caseId = form.closest('[data-org-case-id]')?.dataset.orgCaseId;
    if (!organizationId || !caseId) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedRequestsOrganization === organizationId);
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const message = new FormData(form).get('message');
      await request('/organizations/' + encodeURIComponent(organizationId) + '/requests/' + encodeURIComponent(caseId) + '/replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      if (current()) await loadOrganizationRequests(organizationId);
    } catch (error) { if (current()) panel.querySelector('[data-org-requests-note]').textContent = error instanceof Error ? error.message : 'تعذر إرسال الرد.'; }
    finally { submit.disabled = false; }
  });
  panel.querySelector('[data-org-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const auth = window.HydrolandAuth;
    const session = auth?.getSessionVersion?.();
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.());
    if (!current()) { note('سجّل الدخول أولاً قبل إرسال طلب الجهة.'); return; }
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    let successMessage;
    try {
      if (editingOrganization) {
        await request('/organizations/' + encodeURIComponent(editingOrganization), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!current()) return;
        resetForm();
        successMessage = 'حُفظت تعديلات الجهة.';
      } else {
        await request('/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!current()) return;
        form.reset();
        successMessage = 'تم إرسال الجهة للمراجعة. ستظهر الحالة الفعلية بعد قرار الإدارة.';
      }
      if (!current()) return;
      await refresh(successMessage);
    } catch (error) { if (!current()) return; note(error instanceof Error ? error.message : 'تعذر إرسال طلب الجهة. تحقق من البيانات المدخلة.'); }
  });

  const show = () => { panel.hidden = false; window.HydrolandWorkspaceUI?.show?.(panel); void refresh(); };
  const hide = () => { directoryLoadVersion++; clearPrivateViews(); panel.hidden = true; memberLoadVersion++; selectedMembersOrganization = null; requestLoadVersion++; selectedRequestsOrganization = null; bookingLoadVersion++; selectedBookingsOrganization = null; safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-requests]').hidden = true; panel.querySelector('[data-org-bookings]').hidden = true; panel.querySelector('[data-org-safety]').hidden = true; };
  document.querySelectorAll('#role-dialog [data-role]').forEach((button) => button.addEventListener('click', () => setTimeout(() => {
    if (button.dataset.role === 'organization') { panel.hidden = false; void refresh(); } else hide();
  }, 0)));
  document.addEventListener('hydroland:auth-changed', () => { directoryLoadVersion++; clearPrivateViews(); memberLoadVersion++; selectedMembersOrganization = null; requestLoadVersion++; selectedRequestsOrganization = null; bookingLoadVersion++; selectedBookingsOrganization = null; safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-requests]').hidden = true; panel.querySelector('[data-org-bookings]').hidden = true; panel.querySelector('[data-org-safety]').hidden = true; if (!window.HydrolandAuth?.isAuthenticated?.()) { stateMemberships = []; resetForm(); panel.querySelector('[data-org-members]').hidden = true; } if (!panel.hidden) refresh(); });
  window.HydrolandOrganizations = { open: show, refresh };
})();
