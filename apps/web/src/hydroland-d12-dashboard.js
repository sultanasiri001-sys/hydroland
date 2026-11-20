(() => {
  const host = document.querySelector('.hl-admin');
  if (!host || host.querySelector('[data-d12-panel]')) return;
  const panel = document.createElement('section');
  panel.dataset.d12Panel = '';
  panel.hidden = true;
  host.append(panel);
  const auth = window.HydrolandAuth;
  const access = window.HydrolandPortalAccess;
  const text = (ar, en) => document.documentElement.lang.startsWith('en') ? en : ar;
  const eligible = () => auth?.isAuthenticated?.() && access?.getCurrentRole?.() === 'admin' && access.roleAllowed('admin');
  let generation = 0;
  const reset = () => { generation++; panel.hidden = true; panel.replaceChildren(); };
  function node(tag, content) {
    const el = document.createElement(tag);
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function field(caption, control) {
    const label = node('label', caption + ' ');
    label.append(control);
    return label;
  }
  function money(rows) {
    if (!rows.length) return text('لا توجد قيود مطابقة', 'No matching entries');
    return rows.map(({currency, minor}) => {
      const value = BigInt(minor);
      const magnitude = value < 0n ? -value : value;
      if (!/^[A-Z]{3}$/.test(currency)) return minor + ' ' + currency + text(' (وحدة صغرى)', ' (minor units)');
      const digits = new Intl.NumberFormat('en', {style:'currency',currency}).resolvedOptions().maximumFractionDigits;
      const divisor = 10n ** BigInt(digits);
      const fraction = digits ? '.' + String(magnitude % divisor).padStart(digits,'0') : '';
      return (value < 0n ? '−' : '') + (magnitude / divisor).toLocaleString() + fraction + ' ' + currency;
    }).join(' · ');
  }
  const names = {
    booking:['طلبات الحجز','Booking requests'], eligibility:['مراجعات أهلية المشاركين','Participant eligibility updates'],
    trip:['نشر الرحلات','Trip publications'], crewReplacement:['استبدالات الطاقم','Crew replacements'],
    assignment:['التكليفات','Assignments'], case:['قضايا خدمة العملاء','Customer cases'],
    incident:['بلاغات الحوادث','Incident reports'], approval:['الاعتمادات','Approvals'],
  };
  function display(report, output) {
    const result = node('dl');
    function row(label, value) { result.append(node('dt', label), node('dd', value)); }
    for (const {category, events, subjects} of report.audit) {
      const label = names[category];
      if (label) row(text(...label), text(events+' حدث، '+subjects+' سجل', events+' events, '+subjects+' records'));
    }
    row(text('عروض الدورات المنشأة','Course offers created'), report.offers);
    row(text('سجلات دفع حجوزات رحلات الجهة المنشأة','New payment records for the organization’s trips'), report.payments);
    row(text('قيود الإيراد المرحّلة خلال الفترة','Revenue posted during the period'), money(report.revenue));
    row(text('رصيد الذمم المفتوحة وقت القراءة','Open receivables at time of reading'), money(report.receivables));
    row(text('البحث العام وتحويلات الصرف المؤكدة','Public searches and confirmed payouts'), text('غير مقاس','Unmeasured'));
    const sources = node('details'), list = node('ul');
    sources.append(node('summary',text('مصادر المؤشرات','Metric sources')),list);
    for (const entry of report.audit) {
      if (names[entry.category]) list.append(node('li',text(...names[entry.category])+' · '+entry.sources.join(', ')));
    }
    list.append(node('li',text('عروض الدورات','Course offers')+' · StoreCourseOffer.createdAt'),
      node('li',text('مدفوعات الرحلات','Trip payments')+' · Payment → Booking → Trip.organizationId'),
      node('li',text('الإيراد المرحّل','Posted revenue')+' · FinanceEntry (REVENUE, POSTED)'),
      node('li',text('رصيد الذمم','Open receivables')+' · Receivable.outstandingMinor'));
    output.replaceChildren(node('h4', report.organization.displayName),
      node('p', report.from+' – '+report.to+' · '+report.timeZone),
      node('p', text('وقت قراءة الأرصدة ', 'Balances read at ')+new Date(report.readAt).toLocaleString()), result, sources);
  }

  async function open() {
    reset();
    if (!eligible()) return;
    const active = generation, session = auth.getSessionVersion?.();
    const current = () => active === generation && eligible() && auth.getSessionVersion?.() === session;
    const request = async path => {
      const response = await auth.authorizedFetch('/admin/d12/organizations'+path, {cache:'no-store'});
      if (!current()) return;
      if ([401,403].includes(response.status)) { reset(); return; }
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    };
    let initial;
    try { initial = await request(''); } catch { return; }
    if (!current() || !initial) return;
    const form = node('form'), search = node('input'), select = node('select');
    const from = node('input'), to = node('input'), submit = node('button'), find = node('button');
    from.type = to.type = 'date'; search.type = 'search'; search.maxLength = 120;
    submit.type = 'submit'; submit.textContent = text('عرض التقرير','Show report');
    find.type = 'button'; find.textContent = text('بحث عن جهة','Find organization');
    const output = node('div');
    output.setAttribute('aria-live','polite');
    let revision = 0;
    const options = rows => {
      select.replaceChildren(...rows.map(row => new Option(row.displayName, row.id)));
      submit.disabled = !rows.length;
      if (!rows.length) output.textContent = text('لا توجد جهة مطابقة','No matching organization');
    };
    form.append(field(text('اسم الجهة','Organization name'),search),find,field(text('الجهة','Organization'),select),
      field(text('من','From'),from),field(text('إلى','To'),to),submit);
    options(initial);
    const clear = () => { revision++; output.replaceChildren(); };
    form.addEventListener('input', clear);
    find.onclick = async () => {
      clear(); const seq = revision; select.replaceChildren(); submit.disabled = true;
      try {
        const rows = await request('?q='+encodeURIComponent(search.value));
        if (rows && current() && seq === revision) options(rows);
      } catch { if (current() && seq === revision) output.textContent = text('تعذر جلب الجهات','Unable to load organizations'); }
    };
    form.onsubmit = async event => {
      event.preventDefault(); clear(); const seq = revision;
      if (!select.value) return;
      const params = new URLSearchParams();
      if (from.value) params.set('from', from.value);
      if (to.value) params.set('to', to.value);
      try {
        const report = await request('/'+encodeURIComponent(select.value)+'/summary?'+params);
        if (report && current() && seq === revision) { from.value = report.from; to.value = report.to; display(report, output); }
      } catch { if (current() && seq === revision) output.textContent = text('تعذر عرض التقرير. راجع الفترة وأعد المحاولة.','Unable to display report. Check the dates and retry.'); }
    };
    panel.replaceChildren(node('h3', text('اللوحة التنفيذية','Executive dashboard')), form, output);
    panel.hidden = false;
  }
  for (const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:locale-changed']) document.addEventListener(event, open);
  document.addEventListener('hydroland:portal-cleared', reset);
  document.addEventListener('visibilitychange', () => document.hidden ? reset() : open());
  window.addEventListener('pagehide', reset);
  void open();
})();
