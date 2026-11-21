(() => {
  const slots = {
    NATIONAL_LICENSE: 'الرخصة الوطنية من الاتحاد السعودي للرياضات البحرية والغوص',
    PROFESSIONAL_LICENSE: 'رخصة المدرب المهنية من منظمة الغوص',
    MEDICAL_EXAM: 'الفحص الطبي',
    LIABILITY_WAIVER: 'إخلاء المسؤولية',
  };
  const statuses = {
    CENTER_PENDING: 'بانتظار مراجعة المركز',
    PLATFORM_PENDING: 'بانتظار اعتماد هيدرولاند',
    RETURNED: 'مطلوب تعديل',
    APPROVED: 'معتمد',
  };
  const locale = window.HydrolandI18n?.createScope('instructor-documents', {
    'مستندات المدرب': 'Instructor documents',
    'مراجعة مستندات المدربين': 'Review instructor documents',
    'الرخصة الوطنية من الاتحاد السعودي للرياضات البحرية والغوص':
      'National license issued by the Saudi Water Sports and Diving Federation',
    'رخصة المدرب المهنية من منظمة الغوص': 'Professional instructor license from the diving agency',
    'الفحص الطبي': 'Medical examination',
    'إخلاء المسؤولية': 'Liability waiver',
    'بانتظار مراجعة المركز': 'Awaiting center review',
    'بانتظار اعتماد هيدرولاند': 'Awaiting HYDROLAND approval',
    'مطلوب تعديل': 'Correction requested',
    معتمد: 'Approved',
    'لم يُرفع مستند': 'No document uploaded',
    'مركز المراجعة': 'Review center',
    'اختر المركز': 'Select a center',
    'يتطلب الإرسال ارتباط المدرب بمركز نشط.': 'An active center membership is needed to submit.',
    'إرفاق ملف PDF واحد، حتى ١٠ ميجابايت': 'Attach one PDF, up to 10 MB',
    'رفع وإرسال للمركز': 'Upload and send to center',
    'عرض المستند': 'View document',
    'فتح الملف': 'Open file',
    'سبب الإرجاع': 'Reason for return',
    'إرجاع للتعديل': 'Return for correction',
    'موافقة وإحالة لهيدرولاند': 'Approve and send to HYDROLAND',
    'اعتماد نهائي': 'Final approval',
    'أدخل سبب الإرجاع.': 'Enter a reason for the return.',
    'اختر ملف PDF واحدًا حتى ١٠ ميجابايت.': 'Choose one PDF up to 10 MB.',
    'لا توجد مستندات بانتظار مراجعتك.': 'There are no documents awaiting your review.',
    'جارٍ التحميل…': 'Loading…',
    'تعذر تنفيذ الطلب. أعد المحاولة.': 'The request could not be completed. Please try again.',
    'تغيّرت حالة المستند. أعد فتح الصفحة.': 'The document changed. Reopen this page.',
    'تعذّر الوصول إلى المستند.': 'The document could not be accessed.',
    'إعادة المحاولة': 'Retry',
  });
  const t = (key) => locale?.t(key) ?? key;
  const node = (tag, text) => {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    return item;
  };
  const button = (label) => {
    const item = node('button', t(label));
    item.type = 'button';
    return item;
  };
  const auth = () => window.HydrolandAuth,
    access = () => window.HydrolandPortalAccess;
  const path = '/instructor-documents/';
  let active = null;
  function clear() {
    active?.host.remove();
    active = null;
  }
  function current(view) {
    return (
      active === view &&
      view.host.isConnected &&
      auth()?.isAuthenticated?.() &&
      auth().getSessionVersion?.() === view.session &&
      access()?.getCurrentRole?.() === view.role &&
      access().roleAllowed?.(view.role)
    );
  }
  async function request(view, url, body) {
    if (
      !current(view) ||
      !(await access().authorizeRole(view.role, {
        sessionVersion: view.session,
        isCurrent: () => current(view),
      })) ||
      !current(view)
    )
      throw new Error(t('تعذّر الوصول إلى المستند.'));
    const options =
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          };
    const response = await auth().authorizedFetch(url, options);
    if (!response.ok)
      throw new Error(
        t(
          response.status === 409
            ? 'تغيّرت حالة المستند. أعد فتح الصفحة.'
            : 'تعذر تنفيذ الطلب. أعد المحاولة.',
        ),
      );
    const data = await response.json();
    if (!current(view)) throw new Error(t('تعذّر الوصول إلى المستند.'));
    return data;
  }
  function base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error(t('تعذر تنفيذ الطلب. أعد المحاولة.')));
      reader.readAsDataURL(file);
    });
  }
  function guarded(view, control, feedback, act) {
    return async (event) => {
      event.preventDefault();
      if (control.disabled || !current(view)) return;
      control.disabled = true;
      feedback.textContent = '';
      try {
        await act();
      } catch (error) {
        if (current(view)) feedback.textContent = error.message;
      } finally {
        if (control.isConnected) control.disabled = false;
      }
    };
  }
  function displayRecord(view, article, row, feedback) {
    article.append(node('p', row.originalName));
    if (row.reason) article.append(node('p', t('سبب الإرجاع') + ' — ' + row.reason));
    const show = button('عرض المستند');
    show.addEventListener(
      'click',
      guarded(view, show, feedback, async () => {
        const data = await request(
          view,
          path + view.mode + '/' + encodeURIComponent(row.id) + '/access',
        );
        const link = node('a', t('فتح الملف'));
        const url = new URL(data.url);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))
          throw new Error(t('تعذّر الوصول إلى المستند.'));
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        feedback.replaceChildren(link);
        link.focus();
      }),
    );
    article.append(show);
  }
  function slotCard(view, kind, row, center) {
    const article = node('article');
    article.className = 'hl-course';
    article.dataset.instructorSlot = kind;
    article.append(
      node('h3', t(slots[kind])),
      node('p', t(row ? statuses[row.status] : 'لم يُرفع مستند')),
    );
    const feedback = node('p');
    feedback.setAttribute('role', 'status');
    if (row) displayRecord(view, article, row, feedback);
    if (!row || row.status === 'RETURNED') {
      const form = node('form'),
        label = node('label', t('إرفاق ملف PDF واحد، حتى ١٠ ميجابايت'));
      const input = node('input');
      input.type = 'file';
      input.accept = 'application/pdf,.pdf';
      input.required = true;
      const submit = button('رفع وإرسال للمركز');
      submit.type = 'submit';
      const selection = () => {
        submit.disabled = !center.value;
      };
      center.addEventListener('change', selection);
      selection();
      form.addEventListener(
        'submit',
        guarded(view, submit, feedback, async () => {
          const file = input.files?.[0],
            centerId = center.value;
          if (!file || !/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 10_000_000)
            throw new Error(t('اختر ملف PDF واحدًا حتى ١٠ ميجابايت.'));
          const updated = await request(view, path + 'instructor/' + kind + '/upload', {
            centerId,
            originalName: file.name,
            base64: await base64(file),
            previousId: row?.id ?? null,
          });
          center.removeEventListener('change', selection);
          article.replaceWith(slotCard(view, kind, { ...updated, originalName: file.name }, center));
        }),
      );
      label.append(input);
      form.append(label, submit);
      article.append(form);
    }
    article.append(feedback);
    return article;
  }
  function reviewerCard(view, row) {
    const article = node('article');
    article.className = 'hl-course';
    article.dataset.instructorReview = row.id;
    const person = row.account?.person ?? {};
    article.append(
      node('h3', t(slots[row.kind])),
      node('p', [person.firstName, person.lastName, row.center?.displayName].filter(Boolean).join(' ')),
    );
    const feedback = node('p');
    feedback.setAttribute('role', 'status');
    displayRecord(view, article, row, feedback);
    const form = node('form'),
      label = node('label', t('سبب الإرجاع')),
      reason = node('textarea');
    reason.maxLength = 500;
    label.append(reason);
    const approve = button(view.mode === 'center' ? 'موافقة وإحالة لهيدرولاند' : 'اعتماد نهائي'),
      sendBack = button('إرجاع للتعديل');
    form.append(label, sendBack, approve);
    const decide = async (decision) => {
      if (decision === 'RETURN' && !reason.value.trim()) throw new Error(t('أدخل سبب الإرجاع.'));
      const other = decision === 'RETURN' ? approve : sendBack;
      other.disabled = true;
      try {
        await request(view, path + view.mode + '/' + encodeURIComponent(row.id) + '/decision', {
          decision,
          reason: reason.value.trim(),
        });
        const list = article.parentElement;
        article.remove();
        if (!list.children.length) list.append(node('p', t('لا توجد مستندات بانتظار مراجعتك.')));
      } finally {
        other.disabled = false;
      }
    };
    approve.addEventListener(
      'click',
      guarded(view, approve, feedback, () => decide('APPROVE')),
    );
    sendBack.addEventListener(
      'click',
      guarded(view, sendBack, feedback, () => decide('RETURN')),
    );
    article.append(form, feedback);
    return article;
  }
  async function open(role, previousCenter) {
    clear();
    if (
      !['instructor', 'center', 'admin'].includes(role) ||
      access()?.getCurrentRole?.() !== role ||
      !access()?.roleAllowed?.(role)
    )
      return;
    const host = node('section');
    host.id = 'hl-instructor-documents';
    host.className = 'hl-center-documents';
    const view = {
      host,
      role,
      mode: role === 'admin' ? 'platform' : role,
      session: auth().getSessionVersion?.(),
    };
    active = view;
    const list = node('div', t('جارٍ التحميل…'));
    list.setAttribute('aria-live', 'polite');
    host.append(
      node('h2', t(role === 'instructor' ? 'مستندات المدرب' : 'مراجعة مستندات المدربين')),
      list,
    );
    document.getElementById('main').append(host);
    window.HydrolandWorkspaceUI.show(host);
    try {
      const data = await request(view, path + view.mode);
      list.replaceChildren();
      if (role === 'instructor') {
        const label = node('label', t('مركز المراجعة')),
          center = node('select');
        label.append(center);
        if (data.centers.length !== 1) center.add(new Option(t('اختر المركز'), ''));
        data.centers.forEach((c) => center.add(new Option(c.displayName, c.id)));
        if (data.centers.some((c) => c.id === previousCenter)) center.value = previousCenter;
        list.append(label);
        if (!data.centers.length) list.append(node('p', t('يتطلب الإرسال ارتباط المدرب بمركز نشط.')));
        for (const kind of Object.keys(slots))
          list.append(
            slotCard(
              view,
              kind,
              data.records.find((row) => row.kind === kind),
              center,
            ),
          );
      } else {
        if (!data.records.length) list.append(node('p', t('لا توجد مستندات بانتظار مراجعتك.')));
        data.records.forEach((row) => list.append(reviewerCard(view, row)));
      }
    } catch (error) {
      if (current(view)) {
        const retry = button('إعادة المحاولة');
        retry.onclick = () => open(role, previousCenter);
        list.replaceChildren(node('p', error.message), retry);
      }
    }
  }
  for (const event of ['hydroland:session-cleared', 'hydroland:portal-cleared'])
    document.addEventListener(event, clear);
  for (const event of [
    'hydroland:auth-changed',
    'hydroland:role-changed',
    'hydroland:profile-data-ready',
  ])
    document.addEventListener(event, () => {
      if (active && !current(active)) clear();
    });
  document.addEventListener('hydroland:workspace-selected', (event) => {
    if (active && event.detail?.target !== active.host) clear();
  });
  window.HydrolandInstructorDocuments = Object.freeze({ open });
})();
