(() => {
  'use strict';
  if (!window.HydrolandI18n || window.HydrolandProcurementLab) return;
  const ui = window.HydrolandI18n.createScope('procurement-lab', {
    'تجربة المشتريات وإعداد الربط':'Procurement testing and integration',
    'اختبر دورة المشتريات قبل إنشاء جهة، وجهّز إعداد اتصال API لاحقًا.':'Test the procurement cycle before creating an organization, and prepare API connection settings for later.',
    'مساحة التجربة':'Test workspace', 'إعداد API':'API settings', 'إغلاق':'Close', 'تحديث':'Refresh', '{0} · {1}':'{0} · {1}',
    'بيانات مصطنعة · لا تنشئ هذه التجربة جهة أو مستندًا معتمدًا أو قيدًا ماليًا حقيقيًا.':'Synthetic data · This test does not create an organization, approved document, or real financial entry.',
    'جارٍ تحميل مساحة المشتريات…':'Loading the procurement workspace…', 'جارٍ حفظ الإجراء…':'Saving the action…',
    'تم حفظ الإجراء التجريبي.':'Test action saved.', 'تم حفظ إعداد الربط.':'Integration settings saved.',
    'يلزم حساب مالك المنصة الإداري الموثق لفتح هذه المساحة.':'This workspace requires the verified platform owner administrator account.',
    'تعذر التحقق من بيانات المختبر المسترجعة.':'Could not verify the returned lab data.',
    'تعذر إكمال الطلب. أعد المحاولة.':'Could not complete the request. Try again.',
    'تغيرت النسخة المحفوظة. حدّث المساحة قبل إعادة الإجراء.':'The saved version changed. Refresh the workspace before trying again.',
    'تعذر تأكيد النتيجة. حدّث المساحة أو أعد المحاولة بنفس البيانات.':'The outcome could not be confirmed. Refresh the workspace or retry with the same data.',
    'بدء تجربة جديدة':'Start a new test', 'السيناريو القياسي':'Standard scenario',
    'هذه البنود عينة قابلة للتعديل. الضرائب مبالغ صريحة وليست نسبًا مفترضة.':'These sample lines can be edited. Taxes are explicit amounts, not assumed rates.',
    'الوصف':'Description', 'الكمية':'Quantity', 'سعر الوحدة (ر.س)':'Unit price (SAR)', 'ضريبة البند (ر.س)':'Line tax (SAR)',
    'المعاملة الضريبية':'Tax treatment', 'سبب المعاملة الضريبية':'Tax treatment reason', 'خاضع للضريبة':'Taxable',
    'معفى':'Exempt', 'نسبة صفرية':'Zero rated', 'إضافة بند':'Add line', 'حذف البند':'Remove line',
    'إنشاء تجربة ببيانات مصطنعة':'Create a synthetic test', 'التجارب المحفوظة':'Saved tests',
    'لا توجد تجارب محفوظة. ابدأ تجربة من النموذج أعلاه.':'No tests saved. Start a test using the form above.',
    'اختر تجربة لعرض حالتها وإجراءاتها.':'Choose a test to see its state and actions.',
    'أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.':'Enter valid SAR amounts with at most two decimal places.',
    'أدخل كميات صحيحة ضمن الحدود المعروضة.':'Enter whole quantities within the displayed limits.',
    'البند':'Line', 'الإجمالي':'Total', 'المسوى تجريبيًا':'Simulated settlement', 'المسترد تجريبيًا':'Simulated recovery',
    'الصافي التجريبي':'Simulated net amount', 'المتبقي للتسوية':'Remaining settlement', 'المتبقي للاسترداد':'Remaining recovery',
    'مستلم':'Received', 'متبقٍ':'Remaining', 'معاد':'Returned', 'الضريبة':'Tax', 'سعر الوحدة':'Unit price',
    'الطلب محفوظ':'Order recorded', 'تمت توصية المشتريات':'Procurement recommendation recorded', 'معتمد تجريبيًا':'Approved in the test',
    'مرفوض':'Declined', 'ملغى':'Cancelled', 'تمت التسوية التجريبية':'Simulated settlement complete',
    'تم العكس التجريبي':'Simulated reversal complete', 'بانتظار الاسترداد التجريبي':'Awaiting simulated recovery', 'تم الاسترداد التجريبي':'Simulated recovery complete',
    'الدور التجريبي الحالي':'Current simulated role', 'منشئ الطلب':'Maker', 'ممثل المشتريات الموصي':'Procurement recommender',
    'صاحب قرار الإدارة':'Owner decision role', 'المحاسب المعد':'Accountant', 'المستلم':'Receiver', 'مؤكد التنفيذ المالي':'Treasury confirmer', 'القابل المستقل':'Independent acceptor',
    'الأدوار هنا جزء من المحاكاة. يسجل الخادم حسابك الفعلي مع كل إجراء.':'Roles here belong to the simulation. The server records your actual account with every action.',
    'الخطوة المتاحة: {0} · الدور: {1}':'Available step: {0} · Role: {1}', 'استخدام هذا الدور':'Use this role',
    'لا يوجد إجراء متاح لهذا الدور في الحالة الحالية.':'No action is available for this role in the current state.',
    'متطلبات الإجراءات':'Action requirements', 'أكمل متطلبات التجربة السابقة لهذا الإجراء.':'Complete the preceding simulation requirements before this action.',
    'بلغت التجربة الحد الأقصى للإجراءات. ابدأ تجربة جديدة.':'This simulation reached its event limit. Start a new session.',
    'بلغ حساب المالك الحد الأقصى للتجارب المحفوظة.':'This owner reached the retained simulation session limit.',
    'توصية المشتريات':'Procurement recommendation', 'قرار الإدارة العليا':'Senior management decision', 'تسجيل فاتورة تجريبية':'Record a test invoice',
    'استلام توريد تجريبي':'Record a test receipt', 'قبول الاستلام التجريبي':'Accept the test receipts',
    'تجهيز التسوية التجريبية':'Prepare simulated settlement', 'قرار التسوية التجريبية':'Simulated settlement decision',
    'تأكيد التسوية التجريبية':'Confirm simulated settlement', 'إلغاء التجربة الحالية':'Cancel the current test order',
    'تسجيل العكس التجريبي':'Record simulated reversal', 'تجهيز الاسترداد التجريبي':'Prepare simulated recovery',
    'قرار الاسترداد التجريبي':'Simulated recovery decision', 'تأكيد الاسترداد التجريبي':'Confirm simulated recovery',
    'القبول النهائي التجريبي':'Final test acceptance', 'القرار':'Decision', 'اختر القرار':'Choose a decision',
    'موافقة':'Approve', 'رفض':'Decline', 'الملاحظات والسبب':'Notes and reason', 'مرجع الإثبات التجريبي':'Test evidence reference',
    'سبب الإلغاء':'Cancellation reason', 'سبب العكس':'Reversal reason', 'تنفيذ الإجراء التجريبي':'Apply the test action',
    'المبلغ المرتبط بهذا الإجراء':'Amount bound to this action', 'الفاتورة تطابق بنود التجربة المحفوظة ومبالغها.':'The invoice matches the saved test lines and amounts.',
    'العكس يشمل كامل الكميات المستلمة والمبلغ المسوى تجريبيًا.':'Reversal covers all received quantities and the simulated settled amount.',
    'أدخل كمية موجبة لبند واحد على الأقل.':'Enter a positive quantity for at least one line.',
    'الإصدار':'Revision', 'وقت الإنشاء':'Created', 'سجل الإجراءات التجريبية':'Test action history', 'الإجراء':'Action', 'الدور':'Role', 'التاريخ':'Time',
    'إنشاء التجربة':'Create test', 'سجل الإثباتات التجريبية':'Test evidence records', 'الفاتورة':'Invoice', 'الاستلامات':'Receipts',
    'قبول الاستلام':'Receipt acceptance', 'التسوية':'Settlement', 'العكس':'Reversal', 'الاسترداد':'Recovery', 'القبول النهائي':'Final acceptance',
    'اكتمل القبول التجريبي لهذه الدورة. لا يسجل ذلك قبول ممثل جهة حقيقية.':'Test acceptance of this cycle is complete. This does not record acceptance by a real organization representative.',
    'إعداد الاتصال الخارجي':'External connection settings', 'اسم الإعداد':'Configuration name', 'عنوان API (اختياري الآن)':'API endpoint (optional for now)',
    'البروتوكول':'Protocol', 'طريقة المصادقة':'Authentication method', 'رمز وصول محفوظ في الخادم':'Server stored bearer credential',
    'مفتاح API محفوظ في الخادم':'Server stored API key', 'دون مصادقة':'No authentication', 'مرجع بيانات الاعتماد':'Credential reference',
    'دون مرجع':'No reference', 'متاح في الخادم':'Configured on the server', 'غير مهيأ في الخادم':'Not configured on the server',
    'المرجع المحفوظ غير متاح حاليًا':'The saved reference is currently unavailable',
    'تُختار مراجع الاعتماد المسجلة فقط. لا تدخل مفاتيح أو رموزًا سرية في هذه الصفحة.':'Choose registered credential references only. Do not enter secret keys or tokens on this page.',
    'حفظ الإعداد':'Save settings', 'فحص الإعداد المحفوظ':'Check saved settings',
    'الفحص يقرأ وصف قدرات API فقط. تبادل أوامر الشراء والأموال الخارجية غير مفعّل.':'The check reads API capability metadata only. External purchase-order and financial exchanges are disabled.',
    'غيّرت حقول الإعداد. احفظها قبل فحص الاتصال.':'Settings have changed. Save them before checking the connection.',
    'غير مهيأ':'Not configured', 'إعداد محفوظ، بانتظار التحقق':'Configuration saved, verification pending', 'تم التحقق من وصف قدرات API':'API capability metadata verified',
    'حالة الاتصال':'Connection state', 'بيانات ناقصة':'Missing configuration', 'لا توجد بيانات إعداد ناقصة.':'No configuration fields are missing.',
    'عنوان الاتصال':'Endpoint', 'بيانات الاعتماد':'Credentials', 'آخر فحص':'Last check', 'نجح الفحص':'Check succeeded', 'لم ينجح الفحص':'Check failed',
    'رمز النتيجة':'Result code', 'تمت محاولة اتصال خارجي':'External request attempted', 'نعم':'Yes', 'لا':'No', 'غير معلوم':'Unknown',
    'توقف الفحص قبل تسجيل النتيجة. أعد فحص الإعداد المحفوظ.':'The check stopped before its outcome was recorded. Check the saved settings again.',
    'لا يمنع إعداد الربط الناقص استخدام التجربة.':'Incomplete integration settings do not block the test workspace.',
    'عقد API وأمثلة الرسائل':'API contract and message examples', 'تنزيل عقد API':'Download API contract',
    'عرض عقد API':'View API contract', 'مثال الرسالة':'Message example', 'أمر شراء':'Purchase order', 'استلام':'Receipt',
    'تحميل المثال في المحرر':'Load example into editor', 'تنزيل المثال':'Download example', 'رسالة JSON قابلة للتحرير':'Editable JSON message',
    'التحقق من الرسالة':'Validate message', 'التحقق يفحص صيغة الرسالة فقط ولا ينشئ طلبًا أو أثرًا تجاريًا.':'Validation checks message structure only and creates no order or business effect.',
    'أدخل JSON صحيحًا قبل التحقق.':'Enter valid JSON before validating.', 'الرسالة صالحة وفق العقد.':'The message is valid against the contract.',
    'الرسالة تحتاج تصحيحًا.':'The message needs correction.', 'النتيجة الموحّدة':'Normalized result', 'بصمة الرسالة':'Message digest',
    'البيانات غير متاحة':'Data unavailable', 'تم استرجاع التجربة المحفوظة.':'Saved test loaded.', 'تم إنشاء تجربة جديدة.':'New test created.',
    'معدات اصطناعية للتجربة':'Synthetic test equipment', 'مستلزمات اصطناعية للتجربة':'Synthetic test supplies',
    'ضريبة صريحة للتجربة':'Explicit synthetic test tax', 'إعفاء تجريبي':'Synthetic test exemption',
    'شروط السيناريو المحفوظة':'Saved scenario terms', 'مرجع الطلب التجريبي':'Test purchase reference',
    'سياسة التسوية':'Settlement policy', 'بعد اكتمال الاستلام وقبوله':'After complete receipt and receipt acceptance',
    'سياسة الإلغاء':'Cancellation policy', 'قبل أي أثر في التجربة':'Before any effect in the test',
    'سياسة العكس':'Reversal policy', 'إعادة كامل المستلم واسترداد المدفوع تجريبيًا':'Return all received quantities and recover the simulated paid amount',
    'سجل الحركات التجريبية':'Simulated movement history', 'الحالة':'Status', 'مجهز':'Prepared', 'معتمد':'Approved', 'مؤكد تجريبيًا':'Confirmed in the test', 'معكوس':'Voided',
    'مرجع الإثبات':'Evidence reference', 'الملاحظات':'Notes', 'وقت التسجيل':'Recorded time',
    'عنوان API مطلوب':'API endpoint is required', 'مرجع اعتماد مسجل مطلوب':'A registered credential reference is required',
    'مرجع الاعتماد غير متاح':'Credential reference is unavailable', 'بيانات الاعتماد غير مهيأة في الخادم':'Server credentials are not configured',
    'طريقة المصادقة لا تطابق المرجع':'Authentication method does not match the reference', 'المرجع غير مخصص لهذا العنوان':'The reference is not registered for this endpoint',
    'تعذر حل عنوان المزود':'Could not resolve the provider address', 'عنوان المزود غير مسموح للفحص':'Provider destination is not allowed for checking',
    'انتهت مهلة الاتصال':'Connection timed out', 'رفض المزود المصادقة':'Provider rejected authentication',
    'رفض تحويل الاتصال إلى عنوان آخر':'Redirect to another endpoint refused', 'استجابة المزود لا تطابق العقد':'Provider response does not match the contract',
    'تعذر الاتصال بالمزود':'Could not connect to the provider', 'انتهت صلاحية الفحص السابق؛ أعد فحص الإعداد المحفوظ.':'The previous check has expired; check the saved settings again.'
  });
  const PROTOCOL = 'HYDROLAND_PROCUREMENT_EXCHANGE_V1';
  const BASE = '/procurement-lab';
  const auth = () => window.HydrolandAuth;
  const access = () => window.HydrolandPortalAccess;
  const eligible = () => Boolean(auth()?.isAuthenticated?.() && access()?.roleAllowed?.('admin'));
  const add = (tag, parent, label, values) => { const node = document.createElement(tag); if (label) ui.setText(node, label, values); parent?.append(node); return node; };
  const button = (parent, label, handler) => { const node = add('button', parent, label); node.type = 'button'; if (handler) node.addEventListener('click', handler); return node; };
  let controlId = 0;
  function control(parent, label, name, type = 'text', required = true) {
    const box = add('div', parent); box.className = 'hl-lab-field';
    const caption = add('label', box, label), input = add(['select','textarea'].includes(type) ? type : 'input', box);
    input.id = 'hl-procurement-lab-field-' + (++controlId); caption.htmlFor = input.id; input.name = name; input.required = required;
    if (input.tagName === 'INPUT') input.type = type;
    return input;
  }
  function select(parent, label, name, options, required = true) {
    const input = control(parent, label, name, 'select', required);
    for (const row of options) { const item = add('option', input); item.value = row.value; if (row.label) ui.setText(item, row.label); else ui.setMessage(item, row.text); }
    return input;
  }
  const field = (parent, label, value) => { const row = add('div', parent); add('dt', row, label); ui.setMessage(add('bdi', add('dd', row)),value == null ? '—' : value); return row; };
  const money = value => Number.isSafeInteger(value) && value >= 0 ? new Intl.NumberFormat(window.HydrolandI18n.getLocale() === 'en' ? 'en-SA' : 'ar-SA', {style:'currency',currency:'SAR'}).format(value / 100) : ui.t('البيانات غير متاحة');
  const stamp = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(window.HydrolandI18n.getLocale() === 'en' ? 'en-GB' : 'ar-SA', {timeZone:'Asia/Riyadh'}) : '—';
  const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const statuses = {REQUESTED:'الطلب محفوظ',RECOMMENDED:'تمت توصية المشتريات',APPROVED:'معتمد تجريبيًا',DECLINED:'مرفوض',CANCELLED:'ملغى',SETTLED:'تمت التسوية التجريبية',REVERSED:'تم العكس التجريبي',RECOVERY_REQUIRED:'بانتظار الاسترداد التجريبي',RECOVERED:'تم الاسترداد التجريبي'};
  const roles = {MAKER:'منشئ الطلب',RECOMMENDER:'ممثل المشتريات الموصي',OWNER:'صاحب قرار الإدارة',ACCOUNTANT:'المحاسب المعد',RECEIVER:'المستلم',TREASURER:'مؤكد التنفيذ المالي',ACCEPTOR:'القابل المستقل'};
  const actions = {RECOMMEND:'توصية المشتريات',APPROVE:'قرار الإدارة العليا',INVOICE:'تسجيل فاتورة تجريبية',RECEIVE:'استلام توريد تجريبي',RECEIPT_ACCEPTANCE:'قبول الاستلام التجريبي',PREPARE_SETTLEMENT:'تجهيز التسوية التجريبية',APPROVE_SETTLEMENT:'قرار التسوية التجريبية',CONFIRM_SETTLEMENT:'تأكيد التسوية التجريبية',CANCEL:'إلغاء التجربة الحالية',REVERSE:'تسجيل العكس التجريبي',PREPARE_RECOVERY:'تجهيز الاسترداد التجريبي',APPROVE_RECOVERY:'قرار الاسترداد التجريبي',CONFIRM_RECOVERY:'تأكيد الاسترداد التجريبي',ACCEPTANCE:'القبول النهائي التجريبي'};
  const connectionCodes = {CAPABILITIES_VERIFIED:'تم التحقق من وصف قدرات API',ENDPOINT_REQUIRED:'عنوان API مطلوب',CREDENTIAL_REFERENCE_REQUIRED:'مرجع اعتماد مسجل مطلوب',CREDENTIAL_REFERENCE_UNAVAILABLE:'مرجع الاعتماد غير متاح',CREDENTIAL_SECRET_REQUIRED:'بيانات الاعتماد غير مهيأة في الخادم',CREDENTIAL_AUTH_MODE_MISMATCH:'طريقة المصادقة لا تطابق المرجع',CREDENTIAL_DESTINATION_MISMATCH:'المرجع غير مخصص لهذا العنوان',DNS_UNAVAILABLE:'تعذر حل عنوان المزود',DESTINATION_NOT_PUBLIC:'عنوان المزود غير مسموح للفحص',CONNECTION_TIMEOUT:'انتهت مهلة الاتصال',AUTHENTICATION_REJECTED:'رفض المزود المصادقة',REDIRECT_REFUSED:'رفض تحويل الاتصال إلى عنوان آخر',CONNECTION_FAILED:'تعذر الاتصال بالمزود',CHECK_INTERRUPTED:'توقف الفحص قبل تسجيل النتيجة. أعد فحص الإعداد المحفوظ.'};
  const dialog = add('dialog', document.body); dialog.id = 'hl-procurement-lab'; dialog.className = 'hl-procurement-lab';
  const head = add('header', dialog), title = add('h2', head, 'تجربة المشتريات وإعداد الربط'); title.id = 'hl-procurement-lab-title'; dialog.setAttribute('aria-labelledby', title.id);
  button(head, 'إغلاق', () => close());
  const banner = add('p', dialog, 'بيانات مصطنعة · لا تنشئ هذه التجربة جهة أو مستندًا معتمدًا أو قيدًا ماليًا حقيقيًا.'); banner.className = 'hl-lab-boundary'; banner.dataset.labSynthetic = '';
  const toolbar = add('div', dialog); toolbar.className = 'hl-lab-toolbar';
  const tabs = add('div', toolbar); tabs.setAttribute('role','tablist'); ui.setAttribute(tabs,'aria-label','تجربة المشتريات وإعداد الربط');
  const testTab = button(tabs, 'مساحة التجربة', () => showTab('test')), apiTab = button(tabs, 'إعداد API', () => showTab('api'));
  for (const [tab,id,panel] of [[testTab,'test','hl-lab-test'],[apiTab,'api','hl-lab-api']]) { tab.setAttribute('role','tab'); tab.id = 'hl-lab-tab-' + id; tab.setAttribute('aria-controls',panel); }
  const refreshButton = button(toolbar, 'تحديث', () => void refresh());
  const status = add('p', dialog); status.dataset.labStatus = ''; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const testPanel = add('section',dialog), apiPanel = add('section',dialog);
  for (const [panel,id] of [[testPanel,'test'],[apiPanel,'api']]) { panel.id = 'hl-lab-' + id; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby','hl-lab-tab-' + id); }
  let state = {generation:0,sessionVersion:null,selectedId:null,tab:'test'}, workspace = null, session = null, selectedRole = 'MAKER', busy = false, detailTicket = 0;
  let detailHost = null, actionHost = null, returnFocus = null, connectionTimer = null;
  const reads = new Set(), urls = new Set(), commands = new Map(), stale = new Set();
  const context = () => ({...state});
  const current = c => dialog.open && eligible() && c.generation === state.generation && c.sessionVersion === state.sessionVersion && c.sessionVersion === auth()?.getSessionVersion?.();
  const currentSession = (c,id) => current(c) && state.selectedId === id && session?.id === id;
  function abortReads() { for (const controller of reads) controller.abort(); reads.clear(); }
  function clear() {
    clearTimeout(connectionTimer); connectionTimer = null;
    abortReads(); detailTicket++; state = {generation:state.generation + 1,sessionVersion:null,selectedId:null,tab:'test'};
    workspace = session = detailHost = actionHost = null; selectedRole = 'MAKER'; busy = false; commands.clear(); stale.clear();
    for (const url of urls) URL.revokeObjectURL(url); urls.clear(); testPanel.replaceChildren(); apiPanel.replaceChildren(); status.replaceChildren();
  }
  function close() { if (dialog.open) dialog.close(); clear(); if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true}); returnFocus = null; }
  dialog.addEventListener('close', () => { if (state.sessionVersion != null) clear(); });
  function showTab(tab) {
    if (busy) return;
    state.tab = tab; testPanel.hidden = tab !== 'test'; apiPanel.hidden = tab !== 'api';
    for (const [node,id] of [[testTab,'test'],[apiTab,'api']]) { node.setAttribute('aria-selected',String(id === tab)); node.tabIndex = id === tab ? 0 : -1; }
  }
  tabs.addEventListener('keydown',event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key) && !busy) { event.preventDefault(); showTab(event.key === 'Home' ? 'test' : event.key === 'End' ? 'api' : state.tab === 'test' ? 'api' : 'test'); (state.tab === 'test' ? testTab : apiTab).focus(); } });
  function lock(value) { busy = value; refreshButton.disabled = value; testTab.disabled = apiTab.disabled = value; for (const fieldset of dialog.querySelectorAll('fieldset[data-lab-write]')) fieldset.disabled = value || fieldset.dataset.blocked === 'true'; for (const node of dialog.querySelectorAll('[data-lab-session-open],[name=simulatedRole]')) node.disabled = value; }
  async function authorize(c) {
    const stillHere = () => dialog.open && c.generation === state.generation && c.sessionVersion === state.sessionVersion && c.sessionVersion === auth()?.getSessionVersion?.();
    const ok = await access()?.authorizeRole?.('admin',{sessionVersion:c.sessionVersion,isCurrent:stillHere});
    if (!ok && stillHere()) close(); return Boolean(ok && current(c));
  }
  async function request(c,path,body) {
    const controller = body === undefined ? new AbortController() : null; if (controller) reads.add(controller);
    try {
      const response = await auth().authorizedFetch(BASE + path,{method:body === undefined ? 'GET' : 'POST',cache:'no-store',...(controller?{signal:controller.signal}:{}),...(body === undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
      const value = await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(new Error(typeof value?.message === 'string' ? value.message : Array.isArray(value?.message) ? value.message.join(' · ') : ui.t('تعذر إكمال الطلب. أعد المحاولة.')),{status:response.status});
      return value;
    } finally { if (controller) reads.delete(controller); }
  }
  function fail(error,c,scope) {
    if (!current(c) || error?.name === 'AbortError') return;
    if (error?.status === 401 || error?.status === 403) { testPanel.replaceChildren(); apiPanel.replaceChildren(); workspace = session = null; ui.setText(status,'يلزم حساب مالك المنصة الإداري الموثق لفتح هذه المساحة.'); return; }
    if (error?.status === 409 && scope) stale.add(scope);
    status.replaceChildren(); add('span',status,error?.status === 409 ? 'تغيرت النسخة المحفوظة. حدّث المساحة قبل إعادة الإجراء.' : error?.status ? 'تعذر إكمال الطلب. أعد المحاولة.' : 'تعذر تأكيد النتيجة. حدّث المساحة أو أعد المحاولة بنفس البيانات.');
    if (error?.message) add('span',status).textContent = ' ' + error.message;
  }
  function command(key,payload) { const signature = JSON.stringify(payload), prior = commands.get(key); if (prior?.signature === signature) return prior.body; const body = {requestId:crypto.randomUUID(),...payload}; commands.set(key,{signature,body}); return body; }
  function invalid() { throw new Error(ui.t('تعذر التحقق من بيانات المختبر المسترجعة.')); }
  function validateIntegration(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || value.protocol !== PROTOCOL || !['NOT_CONFIGURED','CONFIGURED','CONNECTION_VERIFIED'].includes(value.state) || !['NONE','BEARER','API_KEY'].includes(value.authMode) || !Array.isArray(value.credentialOptions) || !Array.isArray(value.missing) || value.businessExchangeEnabled !== false || value.configHash !== null && !digest(value.configHash)) invalid();
    if (typeof value.displayName !== 'string' || value.endpoint !== null && typeof value.endpoint !== 'string' || value.credentialRef !== null && typeof value.credentialRef !== 'string') invalid();
    if (value.lastCheck && (!['SUCCEEDED','FAILED'].includes(value.lastCheck.status) || typeof value.lastCheck.code !== 'string' || !digest(value.lastCheck.configHash) || (value.lastCheck.status === 'SUCCEEDED' ? value.lastCheck.externalRequestAttempted !== true : ![true,false,null].includes(value.lastCheck.externalRequestAttempted)))) invalid();
    if (value.state === 'CONNECTION_VERIFIED' && (value.lastCheck?.status !== 'SUCCEEDED' || value.lastCheck.configHash !== value.configHash || value.lastCheck.code !== 'CAPABILITIES_VERIFIED')) invalid();
    if (value.credentialOptions.some(row => typeof row.ref !== 'string' || typeof row.label !== 'string' || typeof row.configured !== 'boolean')) invalid();
    return value;
  }
  function validateContract(value) { if (!value || value.protocol !== PROTOCOL || value.version !== 1 || !value.messageSchema || !value.examples || !['purchaseOrder','invoice','receipt','reversal'].every(key => value.examples[key] && typeof value.examples[key] === 'object') || value.boundary?.businessWrites !== false || value.boundary?.liveConnectionRequiredForLab !== false) invalid(); return value; }
  function validateSession(value,id) {
    if (!value || typeof id !== 'string' || !id || value.id !== id || value.synthetic !== true || value.scope !== 'PROCUREMENT_LAB' || value.scenario !== 'STANDARD_V1' || value.currency !== 'SAR' || !Number.isSafeInteger(value.revision) || value.revision < 1 || !digest(value.digest) || !Object.hasOwn(statuses,value.status) || !Array.isArray(value.lines) || !value.lines.length || !Array.isArray(value.events) || !Array.isArray(value.roles) || !value.roles.length || !value.totals || !Object.keys(actions).every(key => typeof value.actions?.[key]?.allowed === 'boolean' && Object.hasOwn(roles,value.actions[key].role))) invalid();
    if (!['amountMinor','settledMinor','recoveredMinor','netPaidMinor','remainingMinor','recoveryRequiredMinor'].every(key => Number.isSafeInteger(value.totals[key]) && value.totals[key] >= 0) || value.roles.some(row => !Object.hasOwn(roles,row.id))) invalid();
    if (!value.acceptance || typeof value.acceptance.valid !== 'boolean' || value.acceptance.scope !== 'SIMULATION_ONLY' || value.acceptance.globalClosureGranted !== false || value.acceptance.realRepresentativeAcceptance !== false || value.realRepresentativeAcceptance !== false || value.realFinancialEffects !== false || value.externalTraffic !== false || !Array.isArray(value.simulatedLedger) || !digest(value.receiptDigest) || !digest(value.completionDigest)) invalid();
    return value;
  }
  function download(value,name) {
    if (!current(context())) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2) + '\n'],{type:'application/json;charset=utf-8'})); urls.add(url);
    const link = add('a',document.body); link.href = url; link.download = name; link.click(); link.remove();
    setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); },1000);
  }
  function renderIntegration() {
    clearTimeout(connectionTimer); connectionTimer = null;
    apiPanel.replaceChildren(); const value = workspace.integration, section = add('section',apiPanel); section.className = 'hl-lab-card';
    add('h3',section,'إعداد الاتصال الخارجي'); add('p',section,'لا يمنع إعداد الربط الناقص استخدام التجربة.');
    const summary = add('dl',section); summary.className = 'hl-lab-summary';
    const age = value.lastCheck ? Date.now() - Date.parse(value.lastCheck.checkedAt) : Infinity;
    const validFor = Number.isFinite(value.checkValiditySeconds) ? value.checkValiditySeconds * 1000 : 900000;
    const expired = value.state === 'CONNECTION_VERIFIED' && (value.connectionCheckCurrent === false || !Number.isFinite(age) || age < 0 || age >= validFor);
    const connectionState = field(summary,'حالة الاتصال',ui.message({NOT_CONFIGURED:'غير مهيأ',CONFIGURED:'إعداد محفوظ، بانتظار التحقق',CONNECTION_VERIFIED:expired ? 'إعداد محفوظ، بانتظار التحقق' : 'تم التحقق من وصف قدرات API'}[value.state])).querySelector('bdi');
    const expirationNotice = add('p',section); if (expired) ui.setText(expirationNotice,'انتهت صلاحية الفحص السابق؛ أعد فحص الإعداد المحفوظ.');
    if (value.state === 'CONNECTION_VERIFIED' && !expired) { const c = context(); connectionTimer = setTimeout(() => { if (current(c) && connectionState.isConnected) { ui.setText(connectionState,'إعداد محفوظ، بانتظار التحقق'); ui.setText(expirationNotice,'انتهت صلاحية الفحص السابق؛ أعد فحص الإعداد المحفوظ.'); } },Math.max(1,validFor - age)); }
    field(summary,'الإصدار',value.revision); field(summary,'البروتوكول',value.protocol);
    if (value.lastCheck) { field(summary,'آخر فحص',ui.message('{0} · {1}',[ui.message(value.lastCheck.status === 'SUCCEEDED' ? 'نجح الفحص' : 'لم ينجح الفحص'),stamp(value.lastCheck.checkedAt)])); field(summary,'رمز النتيجة',ui.message('{0} · {1}',[ui.message(connectionCodes[value.lastCheck.code] || 'استجابة المزود لا تطابق العقد'),value.lastCheck.code])); field(summary,'تمت محاولة اتصال خارجي',ui.message(value.lastCheck.externalRequestAttempted === null ? 'غير معلوم' : value.lastCheck.externalRequestAttempted ? 'نعم' : 'لا')); }
    if (value.missing.length) { const missing = add('div',section); add('h4',missing,'بيانات ناقصة'); const list = add('ul',missing); for (const code of value.missing) { const item = add('li',list); if (connectionCodes[code]) ui.setText(item,connectionCodes[code]); else item.textContent = String(code); } }
    else add('p',section,'لا توجد بيانات إعداد ناقصة.');
    const form = add('form',section); form.dataset.labIntegration = ''; const fields = add('fieldset',form); fields.dataset.labWrite = ''; fields.dataset.blocked = String(stale.has('integration')); fields.disabled = stale.has('integration');
    const grid = add('div',fields); grid.className = 'hl-lab-form-grid';
    const name = control(grid,'اسم الإعداد','displayName'); name.maxLength = 120; name.value = value.displayName || '';
    const endpoint = control(grid,'عنوان API (اختياري الآن)','endpoint','url',false); endpoint.value = value.endpoint || ''; endpoint.maxLength = 1000; endpoint.dir = 'ltr';
    const mode = select(grid,'طريقة المصادقة','authMode',[{value:'BEARER',label:'رمز وصول محفوظ في الخادم'},{value:'API_KEY',label:'مفتاح API محفوظ في الخادم'},{value:'NONE',label:'دون مصادقة'}]); mode.value = value.authMode;
    const credentials = select(grid,'مرجع بيانات الاعتماد','credentialRef',[{value:'',label:'دون مرجع'},...value.credentialOptions.map(row => ({value:row.ref,text:ui.message('{0} · {1}',[row.label,ui.message(row.configured ? 'متاح في الخادم' : 'غير مهيأ في الخادم')])}))],false);
    if (value.credentialRef && !value.credentialOptions.some(row => row.ref === value.credentialRef)) { const option = add('option',credentials,'المرجع المحفوظ غير متاح حاليًا'); option.value = value.credentialRef; }
    credentials.value = value.credentialRef || ''; credentials.disabled = mode.value === 'NONE';
    mode.addEventListener('change',() => { credentials.disabled = mode.value === 'NONE'; if (credentials.disabled) credentials.value = ''; });
    add('p',fields,'تُختار مراجع الاعتماد المسجلة فقط. لا تدخل مفاتيح أو رموزًا سرية في هذه الصفحة.');
    const controls = add('div',fields); controls.className = 'hl-lab-toolbar'; const save = button(controls,'حفظ الإعداد'); save.type = 'submit';
    const check = button(controls,'فحص الإعداد المحفوظ',() => void checkIntegration()); check.dataset.labConnectionCheck = '';
    const hint = add('p',fields); const signature = () => JSON.stringify([name.value.trim(),endpoint.value.trim() || null,mode.value,credentials.value || null]); const original = signature();
    const changed = () => { const dirty = signature() !== original; check.disabled = dirty || !value.configHash || value.missing.length > 0 || stale.has('integration'); if (dirty) ui.setText(hint,'غيّرت حقول الإعداد. احفظها قبل فحص الاتصال.'); else hint.replaceChildren(); };
    form.addEventListener('input',changed); form.addEventListener('change',changed); changed();
    add('p',section,'الفحص يقرأ وصف قدرات API فقط. تبادل أوامر الشراء والأموال الخارجية غير مفعّل.');
    form.addEventListener('submit',async event => {
      event.preventDefault(); const c = context(); if (!current(c) || busy || stale.has('integration') || !form.reportValidity()) return;
      const body = command('integration',{expectedRevision:value.revision,displayName:name.value.trim(),protocol:PROTOCOL,endpoint:endpoint.value.trim() || null,credentialRef:credentials.value || null,authMode:mode.value});
      lock(true); ui.setText(status,'جارٍ حفظ الإجراء…');
      try { if (!await authorize(c)) return; const result = await request(c,'/integration',body); if (!current(c)) return; workspace.integration = validateIntegration(result); commands.delete('integration'); renderIntegration(); ui.setText(status,'تم حفظ إعداد الربط.'); }
      catch (error) { fail(error,c,'integration'); fields.dataset.blocked = String(stale.has('integration')); }
      finally { if (current(c)) lock(false); }
    });
    renderContract(apiPanel);
  }
  async function checkIntegration() {
    const c = context(), value = workspace?.integration; if (!current(c) || busy || stale.has('integration') || !value?.configHash || value.missing.length) return;
    const body = command('integration-check',{expectedRevision:value.revision,expectedConfigHash:value.configHash});
    lock(true); ui.setText(status,'جارٍ حفظ الإجراء…');
    try { if (!await authorize(c)) return; const result = validateIntegration(await request(c,'/integration/check',body)); if (!current(c)) return; if (result.configHash !== value.configHash) invalid(); workspace.integration = result; commands.delete('integration-check'); renderIntegration(); ui.setText(status,result.lastCheck?.status === 'SUCCEEDED' ? 'تم التحقق من وصف قدرات API' : 'لم ينجح الفحص'); }
    catch (error) { fail(error,c,'integration'); }
    finally { if (current(c)) { lock(false); if (stale.has('integration')) for (const fields of apiPanel.querySelectorAll('[data-lab-integration] fieldset')) { fields.dataset.blocked = 'true'; fields.disabled = true; } } }
  }
  function renderContract(parent) {
    const contract = workspace.contract, section = add('section',parent); section.className = 'hl-lab-card'; add('h3',section,'عقد API وأمثلة الرسائل');
    button(section,'تنزيل عقد API',() => download(contract,'hydroland-procurement-exchange-v1.json'));
    const preview = add('details',section); add('summary',preview,'عرض عقد API'); const code = add('pre',preview); code.dir = 'ltr'; code.textContent = JSON.stringify(contract,null,2);
    const form = add('form',section); form.dataset.labValidator = ''; const fields = add('fieldset',form); fields.dataset.labWrite = '';
    const example = select(fields,'مثال الرسالة','example',[{value:'purchaseOrder',label:'أمر شراء'},{value:'invoice',label:'الفاتورة'},{value:'receipt',label:'استلام'},{value:'reversal',label:'العكس'}]);
    const controls = add('div',fields); controls.className = 'hl-lab-toolbar';
    const editor = control(fields,'رسالة JSON قابلة للتحرير','message','textarea'); editor.dir = 'ltr'; editor.spellcheck = false; editor.rows = 14; editor.maxLength = 65536; editor.value = JSON.stringify(contract.examples.purchaseOrder,null,2);
    const result = add('div',section); result.dataset.labValidationResult = ''; result.setAttribute('aria-live','polite');
    button(controls,'تحميل المثال في المحرر',() => { editor.value = JSON.stringify(contract.examples[example.value],null,2); result.replaceChildren(); });
    button(controls,'تنزيل المثال',() => download(contract.examples[example.value],'hydroland-procurement-' + example.value + '-example.json'));
    const submit = button(fields,'التحقق من الرسالة'); submit.type = 'submit'; add('p',fields,'التحقق يفحص صيغة الرسالة فقط ولا ينشئ طلبًا أو أثرًا تجاريًا.');
    editor.addEventListener('input',() => result.replaceChildren());
    form.addEventListener('submit',async event => {
      event.preventDefault(); const c = context(); if (!current(c) || busy || !form.reportValidity()) return;
      let message; try { message = JSON.parse(editor.value); } catch { ui.setText(status,'أدخل JSON صحيحًا قبل التحقق.'); return; }
      lock(true); result.replaceChildren();
      try {
        if (!await authorize(c)) return; const value = await request(c,'/exchange/validate',{message}); if (!current(c) || !result.isConnected) return;
        if (!value || typeof value.valid !== 'boolean' || !Array.isArray(value.issues) || value.issues.some(row => typeof row.message !== 'string') || value.execution !== 'VALIDATION_ONLY' || value.businessEffects !== false) invalid();
        add('h4',result,value.valid ? 'الرسالة صالحة وفق العقد.' : 'الرسالة تحتاج تصحيحًا.');
        if (value.issues.length) { const list = add('ul',result); for (const issue of value.issues) add('li',list).textContent = issue.message; }
        if (value.valid) { if (!value.normalized || !digest(value.messageDigest)) invalid(); add('h4',result,'النتيجة الموحّدة'); const normalized = add('pre',result); normalized.dir = 'ltr'; normalized.textContent = JSON.stringify(value.normalized,null,2); field(add('dl',result),'بصمة الرسالة',value.messageDigest); }
        status.replaceChildren();
      } catch (error) { fail(error,c); }
      finally { if (current(c)) lock(false); }
    });
  }
  const parseMinor = value => { if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(ui.t('أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.')); const [whole,fraction=''] = value.split('.'), result = Number(whole)*100+Number(fraction.padEnd(2,'0')); if (!Number.isSafeInteger(result) || result > 2147483647) throw new Error(ui.t('أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.')); return result; };
  const amountInput = (parent,label,name,value) => { const input = control(parent,label,name); input.inputMode = 'decimal'; input.pattern = '[0-9]+([.][0-9]{1,2})?'; input.value = value; return input; };
  const lineSource = line => Object.fromEntries(['lineId','description','quantity','unitPriceMinor','taxMinor','taxTreatment','taxReason'].map(key => [key,line[key]]));
  const actionReason = reason => ({'Complete the preceding simulation requirements before this action.':'أكمل متطلبات التجربة السابقة لهذا الإجراء.','This simulation reached its event limit. Start a new session.':'بلغت التجربة الحد الأقصى للإجراءات. ابدأ تجربة جديدة.','This owner reached the retained simulation session limit.':'بلغ حساب المالك الحد الأقصى للتجارب المحفوظة.'}[reason]);
  function showReason(parent,reason) { const translated = actionReason(reason); if (translated) add('p',parent,translated); else if (reason) add('p',parent).textContent = reason; }
  function renderCreation(parent) {
    const details = add('details',parent); details.className = 'hl-lab-card'; details.open = !workspace.sessions.length; add('summary',details,'بدء تجربة جديدة');
    const form = add('form',details); form.dataset.labCreate = ''; const fields = add('fieldset',form); fields.dataset.labWrite = ''; fields.dataset.blocked = String(!workspace.capabilities.create.allowed); fields.disabled = !workspace.capabilities.create.allowed;
    if (!workspace.capabilities.create.allowed) showReason(details,workspace.capabilities.create.reason);
    add('p',fields,'هذه البنود عينة قابلة للتعديل. الضرائب مبالغ صريحة وليست نسبًا مفترضة.');
    const rows = add('div',fields); rows.className = 'hl-lab-line-editors'; let nextLine = 0;
    function addLine(seed = {}) {
      const row = add('section',rows); row.className = 'hl-lab-line-editor'; row.dataset.labLine = 'line-' + (++nextLine);
      const description = control(row,'الوصف','description'); description.value = seed.description || ''; description.maxLength = 500;
      const quantity = control(row,'الكمية','quantity','number'); quantity.min = '1'; quantity.max = '1000000'; quantity.step = '1'; quantity.value = String(seed.quantity || 1);
      amountInput(row,'سعر الوحدة (ر.س)','unitPrice',seed.unitPrice || '0.00'); amountInput(row,'ضريبة البند (ر.س)','tax',seed.tax || '0.00');
      const treatment = select(row,'المعاملة الضريبية','taxTreatment',[{value:'TAXABLE',label:'خاضع للضريبة'},{value:'EXEMPT',label:'معفى'},{value:'ZERO_RATED',label:'نسبة صفرية'}]); treatment.value = seed.taxTreatment || 'EXEMPT';
      const reason = control(row,'سبب المعاملة الضريبية','taxReason'); reason.value = seed.taxReason || ''; reason.maxLength = 1000;
      button(row,'حذف البند',() => { if (rows.children.length > 1) row.remove(); });
    }
    addLine({description:ui.t('معدات اصطناعية للتجربة'),quantity:3,unitPrice:'10.00',tax:'4.50',taxTreatment:'TAXABLE',taxReason:ui.t('ضريبة صريحة للتجربة')});
    addLine({description:ui.t('مستلزمات اصطناعية للتجربة'),quantity:2,unitPrice:'5.00',tax:'0.00',taxTreatment:'EXEMPT',taxReason:ui.t('إعفاء تجريبي')});
    button(fields,'إضافة بند',() => { if (rows.children.length < 20) addLine(); }); const submit = button(fields,'إنشاء تجربة ببيانات مصطنعة'); submit.type = 'submit';
    form.addEventListener('submit',async event => {
      event.preventDefault(); const c = context(); if (!current(c) || busy || !workspace.capabilities.create.allowed || !form.reportValidity()) return;
      let lines;
      try { lines = [...rows.children].map(row => { const value = name => row.querySelector('[name="' + name + '"]').value; const quantity = Number(value('quantity')); if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(ui.t('أدخل كميات صحيحة ضمن الحدود المعروضة.')); return {lineId:row.dataset.labLine,description:value('description').trim(),quantity,unitPriceMinor:parseMinor(value('unitPrice')),taxMinor:parseMinor(value('tax')),taxTreatment:value('taxTreatment'),taxReason:value('taxReason').trim()}; }); }
      catch (error) { fail(error,c); return; }
      const body = command('create-session',{scenario:'STANDARD_V1',lines}); lock(true); ui.setText(status,'جارٍ حفظ الإجراء…');
      try { if (!await authorize(c)) return; const value = await request(c,'/sessions',body); if (!current(c)) return; validateSession(value,value?.id); commands.delete('create-session'); installSession(value); renderTest(); ui.setText(status,'تم إنشاء تجربة جديدة.'); }
      catch (error) { fail(error,c,'create-session'); if (error?.status === 409) { fields.dataset.blocked = 'true'; fields.disabled = true; } }
      finally { if (current(c)) lock(false); }
    });
  }
  function installSession(value) {
    session = value; state.selectedId = value.id; stale.delete('session:' + value.id);
    const summary = {id:value.id,status:value.status,scenario:value.scenario,revision:value.revision,digest:value.digest,amountMinor:value.totals.amountMinor,currency:value.currency,createdAt:value.createdAt,updatedAt:value.updatedAt};
    workspace.sessions = [summary,...workspace.sessions.filter(row => row.id !== value.id)];
  }
  function renderTest() {
    testPanel.replaceChildren(); renderCreation(testPanel);
    const saved = add('section',testPanel); saved.className = 'hl-lab-card'; add('h3',saved,'التجارب المحفوظة');
    if (!workspace.sessions.length) add('p',saved,'لا توجد تجارب محفوظة. ابدأ تجربة من النموذج أعلاه.');
    else { const list = add('div',saved); list.className = 'hl-lab-sessions'; for (const row of workspace.sessions) { const item = button(list,null,() => void readSession(row.id)); item.dataset.labSessionOpen = row.id; item.setAttribute('aria-pressed',String(row.id === state.selectedId)); add('span',item,statuses[row.status] || 'البيانات غير متاحة'); add('bdi',item).textContent = money(row.amountMinor); add('small',item).textContent = stamp(row.createdAt); } }
    detailHost = add('section',testPanel); detailHost.dataset.labDetail = ''; detailHost.className = 'hl-lab-card';
    if (session) renderSession(); else add('p',detailHost,'اختر تجربة لعرض حالتها وإجراءاتها.');
  }
  function renderLines(parent,lines) {
    const wrap = add('div',parent); wrap.className = 'hl-lab-table-scroll'; const table = add('table',wrap), header = add('tr',add('thead',table));
    for (const label of ['الوصف','الكمية','سعر الوحدة','الضريبة','مستلم','متبقٍ','معاد']) { const cell = add('th',header,label); cell.scope = 'col'; }
    const body = add('tbody',table);
    for (const line of lines) { const row = add('tr',body); for (const value of [line.description,line.quantity,money(line.unitPriceMinor),money(line.taxMinor),line.receivedQuantity,line.remainingQuantity,line.returnedQuantity]) add('td',row).textContent = String(value); }
  }
  function renderSession() {
    detailHost.replaceChildren(); const value = session;
    add('h3',detailHost,statuses[value.status]); const summary = add('dl',detailHost); summary.className = 'hl-lab-summary';
    for (const [key,label] of [['amountMinor','الإجمالي'],['settledMinor','المسوى تجريبيًا'],['recoveredMinor','المسترد تجريبيًا'],['netPaidMinor','الصافي التجريبي'],['remainingMinor','المتبقي للتسوية'],['recoveryRequiredMinor','المتبقي للاسترداد']]) field(summary,label,money(value.totals[key]));
    field(summary,'الإصدار',value.revision); renderLines(detailHost,value.lines);
    const terms = add('details',detailHost); add('summary',terms,'شروط السيناريو المحفوظة'); const termFields = add('dl',terms);
    field(termFields,'مرجع الطلب التجريبي',value.terms?.purchaseReference); field(termFields,'سياسة التسوية',ui.message('بعد اكتمال الاستلام وقبوله')); field(termFields,'سياسة الإلغاء',ui.message('قبل أي أثر في التجربة')); field(termFields,'سياسة العكس',ui.message('إعادة كامل المستلم واسترداد المدفوع تجريبيًا'));
    for (const [proof,label] of [[value.recommendation,'توصية المشتريات'],[value.approval,'قرار الإدارة العليا']]) if (proof) renderProof(detailHost,label,proof);
    const role = select(detailHost,'الدور التجريبي الحالي','simulatedRole',value.roles.map(row => ({value:row.id,label:roles[row.id]}))); if (!value.roles.some(row => row.id === selectedRole)) selectedRole = value.roles[0].id; role.value = selectedRole;
    add('p',detailHost,'الأدوار هنا جزء من المحاكاة. يسجل الخادم حسابك الفعلي مع كل إجراء.');
    const next = Object.entries(value.actions).find(([key,item]) => Object.hasOwn(actions,key) && item.allowed);
    if (next) { const row = add('div',detailHost); row.className = 'hl-lab-next'; add('p',row,'الخطوة المتاحة: {0} · الدور: {1}',[ui.message(actions[next[0]]),ui.message(roles[next[1].role])]); button(row,'استخدام هذا الدور',() => { if (busy) return; selectedRole = next[1].role; role.value = selectedRole; renderActions(); role.focus({preventScroll:true}); }); }
    actionHost = add('div',detailHost); actionHost.dataset.labActions = ''; role.addEventListener('change',() => { selectedRole = role.value; renderActions(); }); renderActions();
    const evidence = add('details',detailHost); add('summary',evidence,'سجل الإثباتات التجريبية');
    for (const [proof,label] of [[value.invoice,'الفاتورة'],[value.receipts,'الاستلامات'],[value.receiptAcceptance,'قبول الاستلام'],[value.reversal,'العكس'],[value.acceptance.document,'القبول النهائي']]) { if (Array.isArray(proof)) for (const item of proof) renderProof(evidence,label,item); else if (proof) renderProof(evidence,label,proof); }
    if (value.simulatedLedger.length) { const ledger = add('details',evidence); add('summary',ledger,'سجل الحركات التجريبية'); for (const movement of value.simulatedLedger) renderProof(ledger,movement.kind === 'SETTLEMENT' ? 'التسوية' : 'الاسترداد',movement); }
    if (value.acceptance.valid) add('p',detailHost,'اكتمل القبول التجريبي لهذه الدورة. لا يسجل ذلك قبول ممثل جهة حقيقية.');
    const history = add('details',detailHost); add('summary',history,'سجل الإجراءات التجريبية'); const list = add('ol',history);
    for (const event of value.events) { const item = add('li',list); add('strong',item,actions[event.action] || 'إنشاء التجربة'); const data = add('dl',item); field(data,'الدور',ui.message(roles[event.role] || 'منشئ الطلب')); field(data,'الإصدار',event.revision); field(data,'التاريخ',stamp(event.occurredAt)); }
  }
  function renderProof(parent,label,proof) {
    const block = add('section',parent); block.className = 'hl-lab-proof'; add('h4',block,label); const values = add('dl',block); values.className = 'hl-lab-summary';
    if (proof.reference) field(values,'مرجع الإثبات',proof.reference);
    if (Number.isSafeInteger(proof.amountMinor)) field(values,'المبلغ المرتبط بهذا الإجراء',money(proof.amountMinor));
    if (proof.status) field(values,'الحالة',ui.message({PREPARED:'مجهز',APPROVED:'معتمد',REJECTED:'مرفوض',CONFIRMED:'مؤكد تجريبيًا',VOIDED:'معكوس'}[proof.status] || 'البيانات غير متاحة'));
    if (proof.decision) field(values,'القرار',ui.message(proof.decision === 'APPROVE' ? 'موافقة' : 'رفض'));
    if (proof.note || proof.reason) field(values,'الملاحظات',proof.note || proof.reason);
    field(values,'الدور',ui.message(roles[proof.role || proof.confirmedByRole || proof.preparedByRole] || 'منشئ الطلب'));
    field(values,'وقت التسجيل',stamp(proof.recordedAt || proof.confirmedAt || proof.preparedAt));
    if (proof.quantities?.length) { const list = add('ul',block); for (const line of proof.quantities) { const name = session.lines.find(item => item.lineId === line.lineId)?.description || line.lineId; add('li',list).textContent = name + ' · ' + line.quantity; } }
    if (proof.approval) renderProof(block,'القرار',proof.approval);
  }
  function renderActions() {
    if (!session || !actionHost) return; actionHost.replaceChildren(); const value = session, choices = Object.entries(value.actions).filter(([key,item]) => Object.hasOwn(actions,key) && item.allowed && item.role === selectedRole);
    if (!choices.length) add('p',actionHost,'لا يوجد إجراء متاح لهذا الدور في الحالة الحالية.');
    const blocked = Object.entries(value.actions).filter(([key,item]) => Object.hasOwn(actions,key) && !item.allowed && item.role === selectedRole);
    if (blocked.length) { const requirements = add('details',actionHost); add('summary',requirements,'متطلبات الإجراءات'); for (const [key,item] of blocked) { const row = add('div',requirements); add('h4',row,actions[key]); showReason(row,item.reason); } }
    for (const [action] of choices) {
      const form = add('form',actionHost); form.dataset.labAction = action; const fields = add('fieldset',form); fields.dataset.labWrite = ''; fields.dataset.blocked = String(stale.has('session:' + value.id)); fields.disabled = busy || stale.has('session:' + value.id); add('legend',fields,actions[action]);
      const inputs = {};
      if (['RECOMMEND','APPROVE','APPROVE_SETTLEMENT','APPROVE_RECOVERY'].includes(action)) { inputs.decision = select(fields,'القرار','decision',[{value:'',label:'اختر القرار'},{value:'APPROVE',label:'موافقة'},{value:'DECLINE',label:'رفض'}]); inputs.note = control(fields,'الملاحظات والسبب','note','textarea'); }
      if (['INVOICE','RECEIVE','CONFIRM_SETTLEMENT','CONFIRM_RECOVERY','REVERSE'].includes(action)) { inputs.reference = control(fields,'مرجع الإثبات التجريبي','reference'); inputs.reference.maxLength = 160; }
      if (action === 'INVOICE') { add('p',fields,'الفاتورة تطابق بنود التجربة المحفوظة ومبالغها.'); field(add('dl',fields),'المبلغ المرتبط بهذا الإجراء',money(value.totals.amountMinor)); }
      if (action === 'RECEIVE') { inputs.quantities = []; for (const line of value.lines.filter(line => line.remainingQuantity > 0)) { const box = add('section',fields); add('p',box).textContent = line.description; const quantity = control(box,'الكمية',line.lineId,'number'); quantity.min = '0'; quantity.max = String(line.remainingQuantity); quantity.step = '1'; quantity.value = '0'; inputs.quantities.push({line,quantity}); } }
      if (['RECEIPT_ACCEPTANCE','ACCEPTANCE'].includes(action)) inputs.note = control(fields,'الملاحظات والسبب','note','textarea');
      if (['CONFIRM_SETTLEMENT','CONFIRM_RECOVERY'].includes(action)) field(add('dl',fields),'المبلغ المرتبط بهذا الإجراء',money(action === 'CONFIRM_RECOVERY' ? value.totals.recoveryRequiredMinor : value.totals.amountMinor));
      if (action === 'CANCEL') inputs.reason = control(fields,'سبب الإلغاء','reason','textarea');
      if (action === 'REVERSE') { add('p',fields,'العكس يشمل كامل الكميات المستلمة والمبلغ المسوى تجريبيًا.'); field(add('dl',fields),'المبلغ المرتبط بهذا الإجراء',money(value.totals.settledMinor)); inputs.reason = control(fields,'سبب العكس','reason','textarea'); }
      for (const input of [inputs.note,inputs.reason].filter(Boolean)) input.maxLength = 1000;
      const submit = button(fields,'تنفيذ الإجراء التجريبي'); submit.type = 'submit';
      form.addEventListener('submit',event => {
        event.preventDefault(); if (!form.reportValidity() || busy || !session || value.id !== session.id || value.revision !== session.revision || stale.has('session:' + value.id)) return;
        let payload = {};
        try {
          if (inputs.decision) payload = {decision:inputs.decision.value,note:inputs.note.value.trim()};
          else if (action === 'INVOICE') payload = {reference:inputs.reference.value.trim(),lines:value.lines.map(lineSource),amountMinor:value.totals.amountMinor};
          else if (action === 'RECEIVE') { const quantities = inputs.quantities.map(({line,quantity}) => { const number = Number(quantity.value); if (!Number.isSafeInteger(number) || number < 0 || number > line.remainingQuantity) throw new Error(ui.t('أدخل كميات صحيحة ضمن الحدود المعروضة.')); return {lineId:line.lineId,quantity:number}; }).filter(row => row.quantity > 0); if (!quantities.length) throw new Error(ui.t('أدخل كمية موجبة لبند واحد على الأقل.')); payload = {reference:inputs.reference.value.trim(),quantities}; }
          else if (['RECEIPT_ACCEPTANCE','ACCEPTANCE'].includes(action)) payload = {evidenceDigest:action === 'ACCEPTANCE' ? value.completionDigest : value.receiptDigest,note:inputs.note.value.trim()};
          else if (['CONFIRM_SETTLEMENT','CONFIRM_RECOVERY'].includes(action)) payload = {reference:inputs.reference.value.trim(),amountMinor:action === 'CONFIRM_RECOVERY' ? value.totals.recoveryRequiredMinor : value.totals.amountMinor};
          else if (action === 'CANCEL') payload = {reason:inputs.reason.value.trim()};
          else if (action === 'REVERSE') payload = {reference:inputs.reference.value.trim(),quantities:value.lines.filter(line => line.receivedQuantity > 0).map(line => ({lineId:line.lineId,quantity:line.receivedQuantity})),amountMinor:value.totals.settledMinor,reason:inputs.reason.value.trim()};
        } catch (error) { fail(error,context()); return; }
        void applyAction(action,selectedRole,payload,value);
      });
    }
  }
  async function applyAction(action,role,payload,value) {
    const c = context(); if (!currentSession(c,value.id) || busy || stale.has('session:' + value.id)) return;
    const key = 'session:' + value.id + ':' + action, body = command(key,{expectedRevision:value.revision,expectedDigest:value.digest,action,role,payload});
    lock(true); ui.setText(status,'جارٍ حفظ الإجراء…');
    try { if (!await authorize(c) || !currentSession(c,value.id)) return; const result = await request(c,'/sessions/' + encodeURIComponent(value.id) + '/actions',body); if (!currentSession(c,value.id)) return; validateSession(result,value.id); commands.delete(key); installSession(result); renderTest(); ui.setText(status,'تم حفظ الإجراء التجريبي.'); }
    catch (error) { fail(error,c,'session:' + value.id); if (currentSession(c,value.id) && stale.has('session:' + value.id)) renderActions(); }
    finally { if (current(c)) lock(false); }
  }
  async function readSession(id) {
    const c = context(); if (!current(c) || busy || !workspace?.sessions.some(row => row.id === id)) return;
    abortReads(); const ticket = ++detailTicket; state.selectedId = id; session = null; renderTest(); ui.setText(status,'جارٍ تحميل مساحة المشتريات…');
    try { const value = await request(c,'/sessions/' + encodeURIComponent(id)); if (!current(c) || ticket !== detailTicket || state.selectedId !== id) return; validateSession(value,id); installSession(value); renderTest(); ui.setText(status,'تم استرجاع التجربة المحفوظة.'); }
    catch (error) { if (ticket === detailTicket) fail(error,c); }
  }
  async function refresh() {
    if (!dialog.open || !eligible() || busy) return;
    abortReads(); detailTicket++; state.generation++; const c = context(), selected = state.selectedId; workspace = session = null; testPanel.replaceChildren(); apiPanel.replaceChildren(); refreshButton.disabled = true; ui.setText(status,'جارٍ تحميل مساحة المشتريات…');
    try {
      if (!await authorize(c)) return; const value = await request(c,'/workspace'); if (!current(c)) return;
      if (!value || typeof value.capabilities?.create?.allowed !== 'boolean' || !Array.isArray(value.sessions) || value.sessions.some(row => typeof row.id !== 'string' || !Object.hasOwn(statuses,row.status) || row.currency !== 'SAR' || !Number.isSafeInteger(row.amountMinor))) invalid();
      validateIntegration(value.integration); validateContract(value.contract); workspace = value; stale.clear(); renderTest(); renderIntegration(); showTab(state.tab); status.replaceChildren();
      if (selected && value.sessions.some(row => row.id === selected)) await readSession(selected);
    } catch (error) { fail(error,c); }
    finally { if (current(c)) refreshButton.disabled = false; }
  }
  async function open() {
    if (!eligible()) return; returnFocus = document.activeElement; clear(); state.sessionVersion = auth().getSessionVersion();
    if (!dialog.open) dialog.showModal(); showTab('test'); await refresh();
  }
  function mountEntries() {
    for (const host of [document.querySelector('.hl-role-dashboard[data-role="admin"] .hl-command-grid'),document.querySelector('.hl-admin__header')].filter(Boolean)) {
      let entry = host.querySelector('[data-procurement-lab-open]');
      if (!entry) { entry = button(host,'تجربة المشتريات وإعداد الربط',() => void open()); entry.dataset.procurementLabOpen = ''; entry.className = 'hl-procurement-lab-entry'; }
      entry.hidden = !eligible();
    }
  }
  for (const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed']) document.addEventListener(event,() => { close(); queueMicrotask(mountEntries); });
  document.addEventListener('hydroland:auth-changed',() => { if (!eligible() || state.sessionVersion !== null && state.sessionVersion !== auth()?.getSessionVersion?.()) close(); queueMicrotask(mountEntries); });
  document.addEventListener('hydroland:profile-data-ready',() => { if (dialog.open && !eligible()) close(); queueMicrotask(mountEntries); });
  window.HydrolandProcurementLab = {open,close}; queueMicrotask(mountEntries);
})();
