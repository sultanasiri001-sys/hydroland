(() => {
  const ui = window.HydrolandI18n.createScope('invoice-permissions', {
    'طلبات صلاحية الفوترة':'Invoice permission requests', 'مراجعة صلاحيات الفوترة':'Review invoice permissions',
    'إغلاق':'Close', 'تحديث':'Refresh', 'المركز':'Center', 'نوع الخدمة':'Service type',
    'التدريب':'Training', 'الرحلات البحرية':'Marine trips', 'المركز المُصدر للفاتورة':'Issuing center',
    'الفوترة مفتوحة':'Invoicing enabled', 'الفوترة موقوفة':'Invoicing disabled',
    'قيد المراجعة':'Pending review', 'معتمد':'Approved', 'مرفوض':'Rejected', 'فتح الفوترة':'Enable invoicing',
    'إيقاف الفوترة':'Disable invoicing', 'طلب فتح الفوترة':'Request to enable invoicing',
    'طلب إيقاف الفوترة':'Request to disable invoicing', 'سبب الطلب':'Reason for request',
    'سجل طلبات المركز':'Center request history', 'لا توجد طلبات.':'No requests.',
    'لا توجد طلبات قيد المراجعة.':'No requests pending review.', 'لا يوجد مركز متاح لهذا الحساب.':'No center is available to this account.',
    'هذه الخدمة غير متاحة للمركز.':'This service is unavailable for the center.',
    'ملاحظة القرار':'Decision note', 'اعتماد':'Approve', 'رفض':'Reject', 'أدخل سبب الرفض.':'Enter a reason for rejection.',
    'جارٍ التحميل…':'Loading…', 'تعذّر تحميل الطلبات.':'Could not load requests.',
    'تعذّر حفظ الطلب.':'Could not save the request.', 'وصل الطلب إلى الإدارة العليا.':'Request submitted for review.',
    'تم اعتماد الطلب.':'Request approved.', 'تم رفض الطلب.':'Request rejected.',
    'تظل الفواتير السابقة متاحة عند الإيقاف.':'Existing invoices remain accessible when invoicing is disabled.'
  });
  const types = {INSTRUCTOR:'التدريب', MARINE_OPERATOR:'الرحلات البحرية'};
  const states = {PENDING:'قيد المراجعة', APPROVED:'معتمد', REJECTED:'مرفوض'};
  const dialog = document.createElement('dialog');
  dialog.id = 'hl-invoice-permissions';
  document.body.append(dialog);
  function add(parent, tag, label) {
    const node = document.createElement(tag);
    parent.append(node);
    if (label) ui.setText(node, label);
    return node;
  }
  function button(parent, label, handler) {
    const node = add(parent, 'button', label);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  }
  function field(parent, label, tag) {
    const wrapper = add(parent, 'label');
    add(wrapper, 'span', label);
    return add(wrapper, tag);
  }
  function option(select, value, label, translate = false) {
    const item = add(select, 'option');
    item.value = value;
    if (translate) ui.setText(item, label);
    else item.textContent = label;
  }
  async function api(path, data) {
    const options = data ? {method:'POST', body:JSON.stringify(data)} : {};
    const response = await window.HydrolandAuth.authorizedFetch('/invoice-permissions' + path, options);
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : '');
    return body;
  }
  const header = add(dialog, 'header');
  const title = add(header, 'h2');
  title.id = 'hl-invoice-permissions-title';
  dialog.setAttribute('aria-labelledby', title.id);
  button(header, 'إغلاق', () => dialog.close());
  const message = add(dialog, 'p');
  message.setAttribute('role', 'status');
  const content = add(dialog, 'section');
  let mode, centerId, generation = 0;
  function clear() {
    generation++;
    content.replaceChildren();
    message.replaceChildren();
  }
  function allowed() {
    const access = window.HydrolandPortalAccess;
    return window.HydrolandAuth.isAuthenticated() && access.getCurrentRole() === mode && access.roleAllowed(mode);
  }
  function report(error, fallback) {
    if (error.message) message.textContent = error.message;
    else ui.setText(message, fallback);
  }
  async function save(path, data, form, current, success) {
    const controls = [...form.querySelectorAll('button,input,textarea,select')];
    if (!current() || form.dataset.saving) return;
    form.dataset.saving = 'true';
    controls.forEach(node => {node.disabled = true;});
    try {
      await api(path, data);
      if (current()) await load(success);
    } catch (error) {
      if (current()) {
        report(error, 'تعذّر حفظ الطلب.');
        controls.forEach(node => {node.disabled = false;});
        delete form.dataset.saving;
      }
    }
  }
  function showRow(parent, row, review, current) {
    const card = add(parent, 'article');
    add(card, 'h4').textContent = row.targetName;
    if (review) add(card, 'p').textContent = row.centerName;
    add(card, 'p', types[row.kind]);
    add(card, 'strong', row.enable ? 'فتح الفوترة' : 'إيقاف الفوترة');
    add(card, 'time').textContent = new Date(row.requestedAt).toLocaleString(document.documentElement.lang || 'ar');
    add(card, 'p').textContent = row.reason;
    if (!review) {
      add(card, 'p', states[row.status]);
      if (row.decisionNote) add(card, 'p').textContent = row.decisionNote;
      return;
    }
    const form = add(card, 'div');
    const note = field(form, 'ملاحظة القرار', 'textarea');
    note.maxLength = 1000;
    const decide = decision => {
      if (decision === 'REJECTED' && !note.value.trim()) {
        ui.setText(message, 'أدخل سبب الرفض.');
        note.focus();
        return;
      }
      void save('/review/' + encodeURIComponent(row.id), {decision, note:note.value.trim()}, form, current,
        decision === 'APPROVED' ? 'تم اعتماد الطلب.' : 'تم رفض الطلب.');
    };
    button(form, 'اعتماد', () => decide('APPROVED'));
    button(form, 'رفض', () => decide('REJECTED'));
  }
  function centerForm(parent, targets, current) {
    const kind = field(parent, 'نوع الخدمة', 'select');
    for (const [value, label] of Object.entries(types)) option(kind, value, label, true);
    const fields = add(parent, 'div');
    function selectKind() {
      fields.replaceChildren();
      const available = targets.filter(item => item.kind === kind.value);
      if (!available.length) {add(fields, 'p', 'هذه الخدمة غير متاحة للمركز.'); return;}
      const issuer = field(fields, 'المركز المُصدر للفاتورة', 'select');
      available.forEach(target => option(issuer, target.targetId, target.targetName));
      const details = add(fields, 'div');
      function selectTarget() {
        details.replaceChildren();
        const target = available.find(item => item.targetId === issuer.value);
        add(details, 'p', target.enabled ? 'الفوترة مفتوحة' : 'الفوترة موقوفة');
        if (target.pending) {add(details, 'p', 'قيد المراجعة'); return;}
        const form = add(details, 'form');
        const reason = field(form, 'سبب الطلب', 'textarea');
        reason.maxLength = 1000;
        reason.required = true;
        const submit = add(form, 'button', target.enabled ? 'طلب إيقاف الفوترة' : 'طلب فتح الفوترة');
        submit.type = 'submit';
        let previousReason, requestId;
        form.addEventListener('submit', event => {
          event.preventDefault();
          if (!reason.value.trim()) {reason.focus(); return;}
          if (previousReason !== reason.value.trim()) {
            previousReason = reason.value.trim();
            requestId = crypto.randomUUID();
          }
          void save('/centers/' + encodeURIComponent(centerId) + '/requests',
            {kind:target.kind, targetId:target.targetId, enable:!target.enabled, reason:previousReason, requestId},
            form, () => current() && form.isConnected, 'وصل الطلب إلى الإدارة العليا.');
        });
      }
      issuer.addEventListener('change', selectTarget);
      selectTarget();
    }
    kind.addEventListener('change', selectKind);
    selectKind();
  }
  async function load(notice) {
    clear();
    const revision = generation, session = window.HydrolandAuth.getSessionVersion();
    const current = () => dialog.open && revision === generation && window.HydrolandAuth.getSessionVersion() === session && allowed();
    ui.setText(message, 'جارٍ التحميل…');
    try {
      if (mode === 'admin') {
        const queue = await api('/review');
        if (!current()) return;
        if (!queue.length) add(content, 'p', 'لا توجد طلبات قيد المراجعة.');
        queue.forEach(row => showRow(content, row, true, current));
      } else {
        const centers = await api('/centers');
        if (!current()) return;
        if (!centers.length) add(content, 'p', 'لا يوجد مركز متاح لهذا الحساب.');
        else {
          if (!centers.some(center => center.id === centerId)) centerId = centers[0].id;
          const select = field(content, 'المركز', 'select');
          centers.forEach(center => option(select, center.id, center.displayName));
          select.value = centerId;
          select.addEventListener('change', () => {centerId = select.value; void load();});
          const view = await api('/centers/' + encodeURIComponent(centerId));
          if (!current()) return;
          centerForm(content, view.targets, current);
          add(content, 'p', 'تظل الفواتير السابقة متاحة عند الإيقاف.');
          add(content, 'h3', 'سجل طلبات المركز');
          if (!view.requests.length) add(content, 'p', 'لا توجد طلبات.');
          view.requests.forEach(row => showRow(content, row, false, current));
        }
      }
      if (notice) ui.setText(message, notice);
      else message.replaceChildren();
    } catch (error) {
      if (current()) report(error, 'تعذّر تحميل الطلبات.');
    }
    if (current()) button(content, 'تحديث', () => load());
  }
  dialog.addEventListener('close', clear);
  const dismiss = () => {if (dialog.open) dialog.close(); clear();};
  for (const name of ['session-cleared','portal-cleared','role-changed']) document.addEventListener('hydroland:' + name, dismiss);
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-invoice-permissions]');
    if (!trigger || dialog.open) return;
    mode = trigger.dataset.invoicePermissions;
    if (!['center','admin'].includes(mode) || !allowed()) return;
    centerId = null;
    ui.setText(title, mode === 'admin' ? 'مراجعة صلاحيات الفوترة' : 'طلبات صلاحية الفوترة');
    dialog.showModal();
    void load();
  });
})();
