(() => {
  if (window.HydrolandOrganizationProcurement) return;
  const ui = window.HydrolandI18n.createScope('organization-procurement', {
    'مشتريات الجهة':'Organization procurement', 'إغلاق':'Close', 'تحديث':'Refresh',
    'مستندات الجهة':'Organization documents', 'الجهة':'Organization',
    'جارٍ تحميل المشتريات…':'Loading procurement…',
    'تعذرت قراءة مشتريات الجهة. حدّث الصفحة أو راجع صلاحيتك.':'Could not read organization procurement. Refresh or check your access.',
    'تغيّرت بيانات الطلب. حدّث التفاصيل وراجعها قبل اتخاذ القرار.':'The order changed. Refresh and review its details before deciding.',
    'تعذر تأكيد الحفظ. يمكنك إعادة المحاولة بالبيانات نفسها.':'Could not confirm the save. You can retry with the same details.',
    'تعذر التحقق من بيانات الجهة المسترجعة.':'The returned organization details could not be verified.',
    'جارٍ حفظ الإجراء…':'Saving the action…', 'تم حفظ الإجراء.':'The action was saved.',
    'لا توجد طلبات شراء محفوظة لهذه الجهة.':'This organization has no saved purchase orders.',
    'طلبات الشراء':'Purchase orders', 'اختر طلبًا لعرض مستنداته وإجراءاته.':'Choose an order to view its documents and actions.',
    'المرجع':'Reference', 'الحالة':'Status', 'الإجمالي':'Total', 'الإصدار':'Version',
    'عرض المستند PDF':'View document PDF', 'تعذر تحميل المستند.':'Could not load the document.',
    'البيانات غير متاحة':'Details unavailable', 'تحديث التفاصيل':'Refresh details',
    'تجهيز المستندات':'Prepare documents', 'حفظ نماذج المشتريات':'Save procurement templates',
    'تُنشأ المسودات ثم تُراجع وتُعتمد وتُوقّع من مسار المستندات.':'Create drafts, then review, approve and sign them in the documents workspace.',
    'تأهيل مورد':'Supplier qualification', 'عقد مشتريات':'Procurement contract',
    'إنشاء مسودة تأهيل مورد':'Create supplier qualification draft', 'إنشاء مسودة عقد':'Create contract draft',
    'مسودة مستند':'Document draft', 'حفظ المسودة':'Save draft', 'إلغاء المسودة':'Cancel draft',
    'اسم المورد':'Supplier name', 'مرجع المورد':'Supplier reference', 'مرجع قبول المورد':'Supplier acceptance reference',
    'صالح حتى':'Valid until', 'نطاق التأهيل':'Qualification scope',
    'مستند تأهيل المورد الموقّع':'Signed supplier qualification', 'اختر مستندًا':'Choose a document',
    'لا توجد نسخة موقعة صالحة لهذا الغرض.':'No valid signed version is available for this purpose.',
    'مرجع أمر الشراء':'Purchase order reference', 'طريقة المشتريات المتفق عليها':'Agreed procurement method',
    'نظام أو وسيلة التبادل المتفق عليها':'Agreed procurement system or exchange method',
    'حدود الربط':'Integration boundary', 'مستندات وإثباتات يدوية':'Manual documents and evidence',
    'مرجع عملية خارجية':'External process reference', 'مرجع العملية الخارجية':'External process reference',
    'لا تنشئ هذه الخيارات اتصالًا تلقائيًا بنظام خارجي.':'These choices do not create an automatic connection to an external system.',
    'سريان التفويض من':'Mandate valid from', 'سريان التفويض حتى':'Mandate valid until',
    'منشئ الطلب':'Order maker', 'ممثل المشتريات الموصي':'Procurement recommender', 'المستلم':'Receiver',
    'المحاسب المعد':'Preparing accountant', 'مؤكد التنفيذ المالي':'Financial execution confirmer', 'القابل المستقل':'Independent acceptor',
    'اختر عضوًا من الجهة':'Choose an organization member', 'الحساب غير متاح حاليًا':'Account currently unavailable',
    'البنود':'Order lines', 'الوصف':'Description', 'الكمية':'Quantity', 'سعر الوحدة (ر.س)':'Unit price (SAR)',
    'ضريبة البند (ر.س)':'Line tax (SAR)', 'المعاملة الضريبية':'Tax treatment', 'أساس المعاملة الضريبية':'Tax treatment basis',
    'خاضع للضريبة':'Taxable', 'معفى':'Exempt', 'ضريبة بنسبة صفر':'Zero-rated',
    'إضافة بند':'Add line', 'إزالة البند':'Remove line', 'البند {0}':'Line {0}',
    'أدخل الضريبة كما في الاتفاق، دون احتساب نسبة مفترضة.':'Enter the tax stated in the agreement without assuming a rate.',
    'سياسة التسوية':'Settlement policy', 'كامل الطلب بعد قبول الاستلام':'Full order after receipt acceptance',
    'سياسة الإلغاء':'Cancellation policy', 'غير مسموح':'Not permitted', 'قبل أي أثر تنفيذي':'Before any execution effect',
    'الشروط الفعلية للإلغاء':'Actual cancellation terms', 'سياسة العكس والاسترداد':'Reversal and recovery policy',
    'إعادة كامل الطلب واسترداد المبلغ':'Return the full order and recover the amount',
    'الشروط الفعلية للعكس والاسترداد':'Actual reversal and recovery terms', 'طريقة القبول المستقل':'Independent acceptance method',
    'إرفاق الأصل PDF':'Attach original PDF', 'ملف PDF، حتى 10 ميغابايت.':'PDF file, up to 10 MB.',
    'اختر ملف PDF لا يتجاوز 10 ميغابايت.':'Choose a PDF file no larger than 10 MB.',
    'أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.':'Enter valid riyal amounts with at most two decimal places.',
    'راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.':'Review line quantities, tax treatment and validity dates.',
    'أُلغي تجهيز المسودة.':'Draft preparation cancelled.',
    'تم حفظ المسودة. تابع اعتمادها وتوقيعها في المستندات.':'Draft saved. Continue its approval and signature in documents.',
    'افتح المسودة المحفوظة':'Open saved draft',
    'لم تُحسم نتيجة الحفظ. افحص مستندات الجهة قبل إنشاء نسخة جديدة.':'The save result is unresolved. Check the organization documents before creating a new version.',
    'حُفظ المستند وتعذر إرفاق الملف. افتح المستند لإكمال المرفق.':'The document was saved but its attachment failed. Open the document to complete the attachment.',
    'العقد الموقّع':'Signed contract', 'إنشاء طلب من العقد الموقّع':'Create order from signed contract',
    'إنشاء أمر الشراء':'Create purchase order', 'راجعت العقد والمورد والبنود والأشخاص والشروط المحفوظة.':'I reviewed the contract, supplier, lines, people and saved terms.',
    'توصية المشتريات':'Procurement recommendation', 'قرار الإدارة العليا':'Executive decision',
    'اختر القرار':'Choose a decision', 'موافقة':'Approve', 'رفض':'Decline', 'مسوغات القرار':'Decision grounds',
    'تسجيل التوصية':'Record recommendation', 'تسجيل القرار':'Record decision', 'الفاتورة':'Invoice',
    'تسجيل الفاتورة':'Record invoice', 'استلام توريد':'Receive delivery', 'قبول الاستلام':'Accept receipt',
    'تجهيز التسوية':'Prepare settlement', 'قرار التسوية':'Settlement decision', 'تأكيد التسوية الخارجية':'Confirm external settlement',
    'إلغاء الطلب':'Cancel order', 'سبب الإلغاء':'Cancellation reason', 'تسجيل العكس':'Record reversal',
    'تجهيز الاسترداد':'Prepare recovery', 'قرار الاسترداد':'Recovery decision', 'تأكيد الاسترداد الخارجي':'Confirm external recovery',
    'القبول المستقل النهائي':'Final independent acceptance', 'المستند الموقّع':'Signed document',
    'راجعت المستند والإصدار الحالي وملاءمته لهذا الإجراء.':'I reviewed the document, its current version and its relevance to this action.',
    'إنشاء مسودة الإثبات':'Create evidence draft', 'الحساب المالي':'Finance account', 'اختر الحساب المالي':'Choose a finance account',
    'تسجيل الدليل':'Record evidence', 'إجراءات الطلب':'Order actions', 'متطلبات المتابعة':'Requirements to continue',
    'تجهيز القيد وتسجيل الإثبات لا يرسلان أموالًا من النظام.':'Preparing an entry and recording evidence do not send funds from the system.',
    'مرجع المستند الأصلي':'Original document reference', 'وقت الواقعة (بتوقيت السعودية)':'Occurrence time (Saudi time)',
    'نتيجة التحقق والسبب':'Verification findings and reason', 'اسم البنك':'Bank name', 'مرجع التنفيذ البنكي':'Bank execution reference',
    'تحقق من وقت الواقعة؛ يجب أن يكون سابقًا أو مساويًا للوقت الحالي.':'Check the occurrence time; it must not be in the future.',
    'الكمية المستلمة':'Received quantity', 'المتبقي للاستلام':'Outstanding quantity', 'الكمية في هذا المحضر':'Quantity in this receipt',
    'سعر الوحدة':'Unit price', 'الضريبة':'Tax', 'الإجمالي شامل الضريبة':'Total including tax',
    'المبلغ المسوّى':'Settled amount', 'المبلغ المسترد':'Recovered amount', 'الأثر المالي الصافي':'Net financial effect',
    'المستندات المرتبطة':'Linked documents', 'سجل الإجراءات':'Action history', 'سجلات الاستلام':'Receipt records',
    'إثباتات التنفيذ المالي':'Financial execution evidence', 'التاريخ':'Date', 'المسؤول':'Actor', 'النوع':'Type',
    'الطلب محفوظ':'Order requested', 'تمت توصية المشتريات':'Procurement recommendation recorded', 'معتمد':'Approved',
    'مرفوض':'Declined', 'ملغى':'Cancelled', 'تمت التسوية':'Settled', 'تم العكس':'Reversed',
    'بانتظار استرداد المبلغ':'Recovery required', 'تم استرداد المبلغ':'Recovered', 'بانتظار المراجعة':'Awaiting review',
    'حالة غير متاحة':'Status unavailable', 'لم يسجّل بعد':'Not yet recorded', 'القبول النهائي مسجّل':'Final acceptance recorded',
    'تفاصيل الإثبات':'Evidence details', 'رجوع إلى الطلب':'Back to order', 'المورد':'Supplier',
    'لم تُحسم أهلية هذا الإجراء؛ حدّث تفاصيل الطلب.':'Eligibility for this action is unresolved; refresh the order details.',
    'النماذج جاهزة':'Templates ready', 'وثائق تحتاج مراجعة':'Documents requiring review',
    'المستندات الأصلية المرفقة':'Attached original documents', 'نسخة المستند الموقّع PDF':'Signed document PDF',
    'لا توجد ملفات مرفقة متاحة.':'No attachment files are available.', 'تحميل الأصل PDF':'Download original PDF',
    'تجهيز إثبات مرتبط بالطلب':'Prepare evidence linked to this order', 'نوع الإثبات':'Evidence kind',
    'اختر نوع الإثبات':'Choose an evidence kind', 'تجهيز المسودة':'Prepare draft',
    'يجهز شخص آخر دليل التنفيذ المالي ويوقّعه مستقلًا عن مؤكد التنفيذ.':'Another person prepares the financial execution evidence and signs it independently from the execution confirmer.',
    'تعرض أنواع الإثبات الملائمة للحالة الحالية. حفظ المسودة لا ينفذ الإجراء.':'Evidence kinds match the current state. Saving a draft does not execute the action.',
    'الكمية المعادة':'Returned quantity', 'المتبقي للتسوية':'Remaining settlement', 'المتبقي للاسترداد':'Remaining recovery',
    'الحالة الحالية أو تكليف حسابك لا يسمحان بهذا الإجراء.':'The current state or your assigned authority does not allow this action.',
    'المصادر تحتاج مراجعة؛ لم تُثبت المبالغ المالية.':'The sources need review; financial amounts are not verified.',
    'قيد بانتظار الاعتماد':'Entry awaiting approval', 'قيد معتمد':'Entry approved', 'تنفيذ خارجي مؤكد':'External execution confirmed',
    'قيد مرفوض':'Entry rejected', 'قيد معكوس':'Entry voided', 'مرجع القيد':'Entry reference',
    'قبول أدلة هذا الطلب':'Acceptance of this order’s evidence', 'تاريخ القبول':'Acceptance date',
    'هذا قبول لأدلة الطلب المسجلة.':'This accepts the recorded order evidence.',
    'إنشاء الطلب':'Create order', 'الطلب يحتاج مراجعة قبل المتابعة.':'The order needs review before continuing.'
  });
  const auth = () => window.HydrolandAuth;
  const add = (tag, parent, label, values) => {
    const el = document.createElement(tag);
    if (label) ui.setText(el, label, values);
    if (parent) parent.append(el);
    return el;
  };
  const button = (parent, label, handler) => {
    const el = add('button', parent, label); el.type = 'button';
    if (handler) el.addEventListener('click', handler);
    return el;
  };
  const field = (parent, label, value) => {
    const row = add('div', parent); add('dt', row, label);
    add('bdi', add('dd', row)).textContent = value == null ? '—' : String(value);
    return row;
  };
  const money = value => Number.isSafeInteger(value) && value >= 0
    ? new Intl.NumberFormat(window.HydrolandI18n.getLocale() === 'en' ? 'en-SA' : 'ar-SA', {style:'currency', currency:'SAR'}).format(value / 100)
    : ui.t('البيانات غير متاحة');
  const roles = {maker:'منشئ الطلب', recommender:'ممثل المشتريات الموصي', receiver:'المستلم', accountant:'المحاسب المعد', treasurer:'مؤكد التنفيذ المالي', acceptor:'القابل المستقل'};
  const statuses = {REQUESTED:'الطلب محفوظ', RECOMMENDED:'تمت توصية المشتريات', APPROVED:'معتمد', DECLINED:'مرفوض', CANCELLED:'ملغى', SETTLED:'تمت التسوية', REVERSED:'تم العكس', RECOVERY_REQUIRED:'بانتظار استرداد المبلغ', RECOVERED:'تم استرداد المبلغ'};
  const kinds = {INVOICE:'الفاتورة', RECEIPT:'استلام توريد', RECEIPT_ACCEPTANCE:'قبول الاستلام', SETTLEMENT:'تأكيد التسوية الخارجية', REVERSAL:'تسجيل العكس', RECOVERY:'تأكيد الاسترداد الخارجي', FINAL_ACCEPTANCE:'القبول المستقل النهائي'};
  const purposes = {supplier:'F08_PROCUREMENT_SUPPLIER_V1', contract:'F08_PROCUREMENT_CONTRACT_V1', evidence:'F08_PROCUREMENT_EVIDENCE_V1'};
  const templateCodes = {supplier:'F08-PROCUREMENT-SUPPLIER-V1', contract:'F08-PROCUREMENT-CONTRACT-V1', evidence:'F08-PROCUREMENT-EVIDENCE-V1'};
  const actionDefinitions = [
    ['recommend','recommend','توصية المشتريات','decision'], ['approve','approve','قرار الإدارة العليا','decision'],
    ['invoice','invoice','تسجيل الفاتورة','INVOICE'], ['receive','receipts','استلام توريد','RECEIPT'],
    ['receiptAcceptance','receipt-acceptance','قبول الاستلام','RECEIPT_ACCEPTANCE'],
    ['prepareSettlement','settlement/prepare','تجهيز التسوية','account'], ['approveSettlement','settlement/approve','قرار التسوية','decision'],
    ['confirmSettlement','settlement/confirm','تأكيد التسوية الخارجية','SETTLEMENT'], ['cancel','cancel','إلغاء الطلب','cancel'],
    ['reverse','reverse','تسجيل العكس','REVERSAL'], ['prepareRecovery','recovery/prepare','تجهيز الاسترداد','account'],
    ['approveRecovery','recovery/approve','قرار الاسترداد','decision'], ['confirmRecovery','recovery/confirm','تأكيد الاسترداد الخارجي','RECOVERY'],
    ['acceptance','acceptance','القبول المستقل النهائي','FINAL_ACCEPTANCE']
  ];
  let controlSequence = 0;
  function control(parent, label, name, type = 'text', required = true) {
    const wrapper = add('div', parent); wrapper.className = 'hl-org-procurement-field';
    const caption = add('label', wrapper, label);
    const input = add(type === 'select' ? 'select' : type === 'textarea' ? 'textarea' : 'input', wrapper);
    input.id = 'hl-org-procurement-field-' + (++controlSequence); caption.htmlFor = input.id;
    input.name = name; input.required = required;
    if (input.tagName === 'INPUT') input.type = type;
    return input;
  }
  function choices(parent, label, name, rows, placeholder = 'اختر مستندًا') {
    const select = control(parent, label, name, 'select');
    add('option', select, placeholder).value = '';
    for (const row of rows) { const option = add('option', select); option.value = row.value; if (row.label) ui.setText(option, row.label); else option.textContent = row.text; }
    return select;
  }
  const integer = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647 ? Number(value) : NaN;
  const minor = value => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(ui.t('أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.'));
    const [whole, fraction = ''] = value.split('.'), result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(result) || result > 2147483647) throw new Error(ui.t('أدخل مبالغ صحيحة بالريال، بحد أقصى منزلتين عشريتين.'));
    return result;
  };
  const amountControl = (parent, label, name) => { const input = control(parent, label, name); input.inputMode = 'decimal'; input.pattern = '[0-9]+([.][0-9]{1,2})?'; input.maxLength = 12; return input; };
  const documentText = doc => [doc.referenceNumber, doc.title, ui.format('الإصدار') + ' ' + doc.version].filter(Boolean).join(' · ');
  const validDocument = doc => doc && typeof doc.id === 'string' && typeof doc.hash === 'string' && /^[a-f0-9]{64}$/.test(doc.hash) && Number.isSafeInteger(doc.version) && doc.version > 0 && doc.valid === true;
  const documentBody = doc => ({documentId:doc.id, documentVersion:doc.version, documentHash:doc.hash});
  function capability(row) { return Boolean(row && typeof row.allowed === 'boolean' && row.allowed); }
  function actorName(accountId) { return workspace?.participants?.find(row => row.accountId === accountId)?.name || ui.t('الحساب غير متاح حاليًا'); }
  const dateTime = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(window.HydrolandI18n.getLocale() === 'en' ? 'en-GB' : 'ar-SA', {timeZone:'Asia/Riyadh'}) : '—';
  const dialog = add('dialog', document.body); dialog.className = 'hl-org-procurement';
  const header = add('header', dialog); header.className = 'hl-org-procurement-head';
  const heading = add('h2', header, 'مشتريات الجهة'); heading.id = 'hl-org-procurement-title';
  dialog.setAttribute('aria-labelledby', heading.id);
  button(header, 'إغلاق', () => close());
  const organizationLabel = add('p', dialog); organizationLabel.className = 'hl-org-procurement-organization';
  const toolbar = add('nav', dialog); toolbar.className = 'hl-org-procurement-toolbar';
  const refreshButton = button(toolbar, 'تحديث', () => void refresh());
  const documentsButton = button(toolbar, 'مستندات الجهة', () => {
    if (!isCurrent(context()) || !workspace) return;
    const organizationId = state.organizationId;
    close(); window.HydrolandDocuments?.open({organizationId});
  });
  const status = add('p', dialog); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.dataset.procurementStatus = '';
  const content = add('div', dialog); content.className = 'hl-org-procurement-content';
  let state = {organizationId:null, session:null, generation:0};
  let workspace = null, selectedOrder = null, busy = false;
  const requests = new Set(), objectUrls = new Set(), commands = new Map(), unresolvedDrafts = new Set();
  let orderContent = null, draftContent = null, detailGeneration = 0;
  const context = () => ({...state});
  const isCurrent = c => dialog.open && auth()?.isAuthenticated?.() && c.organizationId === state.organizationId
    && c.session === auth()?.getSessionVersion?.() && c.session === state.session && c.generation === state.generation;
  const base = c => '/organizations/' + encodeURIComponent(c.organizationId) + '/procurement';
  function cancelReads() { for (const controller of requests) controller.abort(); requests.clear(); }
  function clear() {
    cancelReads(); detailGeneration++; state = {organizationId:null, session:null, generation:state.generation + 1};
    workspace = null; selectedOrder = null; busy = false; commands.clear(); unresolvedDrafts.clear(); orderContent = null; draftContent = null;
    for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls.clear();
    content.replaceChildren(); status.replaceChildren(); organizationLabel.replaceChildren();
    content.inert = false; refreshButton.disabled = false; documentsButton.disabled = true;
  }
  function close() { if (dialog.open) dialog.close(); clear(); }
  dialog.addEventListener('close', () => { if (!dialog.open) clear(); });
  async function request(c, path, body) {
    const controller = new AbortController(); requests.add(controller);
    try {
      const response = await auth().authorizedFetch(base(c) + path, {
        cache:'no-store', signal:controller.signal,
        ...(body === undefined ? {} : {method:'POST', body:JSON.stringify(body)})
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(typeof result?.message === 'string' ? result.message : ''); error.status = response.status; throw error;
      }
      return result;
    } finally { requests.delete(controller); }
  }
  function showError(error, c, writing = false) {
    if (!isCurrent(c)) return;
    if ([401, 403, 404].includes(error?.status)) { workspace = null; selectedOrder = null; content.replaceChildren(); documentsButton.disabled = true; commands.clear(); }
    if (error?.status === 409) { ui.setText(status, 'تغيّرت بيانات الطلب. حدّث التفاصيل وراجعها قبل اتخاذ القرار.'); if (error?.message) add('span', status).textContent = ' ' + error.message; }
    else if (error?.message && error.name !== 'TypeError' && error.name !== 'AbortError') status.textContent = error.message;
    else ui.setText(status, writing ? 'تعذر تأكيد الحفظ. يمكنك إعادة المحاولة بالبيانات نفسها.' : 'تعذرت قراءة مشتريات الجهة. حدّث الصفحة أو راجع صلاحيتك.');
  }
  async function downloadDocument(documentId, referenceNumber) {
    const c = context(); if (!isCurrent(c) || typeof documentId !== 'string') return;
    try {
      const response = await auth().authorizedFetch('/documents/' + encodeURIComponent(documentId) + '/pdf', {cache:'no-store'});
      if (!response.ok) throw new Error('');
      const blob = await response.blob(); if (!isCurrent(c)) return;
      const url = URL.createObjectURL(blob); objectUrls.add(url);
      const link = document.createElement('a'); link.href = url; link.download = (referenceNumber || 'document') + '.pdf';
      link.click(); setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 30000);
    } catch { if (isCurrent(c)) ui.setText(status, 'تعذر تحميل المستند.'); }
  }
  async function documentRequest(c, path, body) {
    const controller = new AbortController(); requests.add(controller);
    try {
      const response = await auth().authorizedFetch(path, {cache:'no-store', signal:controller.signal, ...(body === undefined ? {} : {method:'POST', body:JSON.stringify(body)})});
      const result = await response.json().catch(() => null);
      if (!response.ok) { const error = new Error(typeof result?.message === 'string' ? result.message : ''); error.status = response.status; throw error; }
      return result;
    } finally { requests.delete(controller); }
  }
  function lock(value) { busy = value; content.inert = value; refreshButton.disabled = value; documentsButton.disabled = value || !workspace; }
  function openDocument(documentId, templateId) {
    if (!isCurrent(context())) return;
    const organizationId = state.organizationId; close();
    window.HydrolandDocuments?.open({organizationId, documentId, templateId, department:'INVENTORY_LOGISTICS'});
  }
  function attachmentInput(form, required) {
    const input = control(form, 'إرفاق الأصل PDF', 'originalPdf', 'file', required); input.accept = 'application/pdf,.pdf';
    add('small', form, 'ملف PDF، حتى 10 ميغابايت.');
    return input;
  }
  async function filePayload(input) {
    const file = input.files?.[0]; if (!file) return null;
    if (!/\.pdf$/i.test(file.name) || file.size < 5 || file.size > 10 * 1024 * 1024) throw new Error(ui.t('اختر ملف PDF لا يتجاوز 10 ميغابايت.'));
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error(ui.t('اختر ملف PDF لا يتجاوز 10 ميغابايت.'));
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return {filename:file.name, mimeType:'application/pdf', base64:btoa(binary)};
  }
  async function payloadHash(payload) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    return 'sha256:' + Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function draftForm(type, title) {
    const c = context(), template = workspace.templates.find(row => row.code === templateCodes[type]);
    if (!isCurrent(c) || !capability(workspace.capabilities.createDocuments) || !template?.id || !draftContent) return null;
    draftContent.replaceChildren(); draftContent.hidden = false; if (orderContent) orderContent.hidden = true;
    const form = add('form', draftContent); form.dataset.procurementDraft = type;
    add('h3', form, title); add('p', form, 'تُنشأ المسودات ثم تُراجع وتُعتمد وتُوقّع من مسار المستندات.');
    return {c, template, form};
  }
  function finishDraft(draft, payload, fileRequired = false) {
    const {c, template, form} = draft, file = attachmentInput(form, fileRequired);
    const submit = button(form, 'حفظ المسودة'); submit.type = 'submit';
    button(form, 'إلغاء المسودة', () => { if (!busy) { draftContent.replaceChildren(); draftContent.hidden = true; if (orderContent) orderContent.hidden = false; ui.setText(status, 'أُلغي تجهيز المسودة.'); } });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!isCurrent(c) || busy || !form.isConnected || !form.reportValidity()) return;
      let data, attachment, contentHash, saved = null, attachmentFailed = false, submitted = false;
      try {
        data = payload(); attachment = await filePayload(file); contentHash = await payloadHash(data);
        if (!isCurrent(c) || !form.isConnected) return;
        const fingerprint = c.organizationId + ':' + template.id + ':' + contentHash;
        if (unresolvedDrafts.has(fingerprint)) { ui.setText(status, 'لم تُحسم نتيجة الحفظ. افحص مستندات الجهة قبل إنشاء نسخة جديدة.'); return; }
        lock(true); ui.setText(status, 'جارٍ حفظ الإجراء…');
        try {
          submitted = true; saved = await documentRequest(c, '/documents', {organizationId:c.organizationId, templateId:template.id, department:template.department, contentHash, payload:data});
        } catch (error) {
          if (!isCurrent(c)) return;
          if (error?.status && error.status < 500) throw error;
          // Creating a document has no idempotency key. Recover a saved match, never repeat the write blindly.
          unresolvedDrafts.add(fingerprint);
          const rows = await documentRequest(c, '/documents/organizations/' + encodeURIComponent(c.organizationId) + '/list').catch(() => null);
          if (!isCurrent(c)) return;
          const matches = Array.isArray(rows) ? rows.filter(row => row.organizationId === c.organizationId && row.templateId === template.id && row.contentHash === contentHash && row.createdByAccountId === workspace.actor.accountId && row.status === 'DRAFT') : [];
          if (matches.length === 1) { saved = matches[0]; unresolvedDrafts.delete(fingerprint); }
          else { ui.setText(status, 'لم تُحسم نتيجة الحفظ. افحص مستندات الجهة قبل إنشاء نسخة جديدة.'); return; }
        }
        if (!isCurrent(c)) return;
        if (!saved?.id || saved.organizationId !== c.organizationId || saved.templateId !== template.id) { unresolvedDrafts.add(fingerprint); ui.setText(status, 'لم تُحسم نتيجة الحفظ. افحص مستندات الجهة قبل إنشاء نسخة جديدة.'); return; }
        if (attachment) {
          try { await documentRequest(c, '/documents/' + encodeURIComponent(saved.id) + '/attachments', attachment); }
          catch { attachmentFailed = true; }
        }
        if (!isCurrent(c)) return;
        draftContent.replaceChildren(); add('p', draftContent, attachmentFailed ? 'حُفظ المستند وتعذر إرفاق الملف. افتح المستند لإكمال المرفق.' : 'تم حفظ المسودة. تابع اعتمادها وتوقيعها في المستندات.');
        button(draftContent, 'افتح المسودة المحفوظة', () => openDocument(saved.id, template.id));
        ui.setText(status, attachmentFailed ? 'حُفظ المستند وتعذر إرفاق الملف. افتح المستند لإكمال المرفق.' : 'تم حفظ المسودة. تابع اعتمادها وتوقيعها في المستندات.');
      } catch (error) { if (isCurrent(c)) showError(error, c, submitted); }
      finally { if (isCurrent(c)) lock(false); }
    });
    form.scrollIntoView({block:'nearest', behavior:'instant'});
  }
  function supplierDraft() {
    const draft = draftForm('supplier', 'إنشاء مسودة تأهيل مورد'); if (!draft) return;
    const inputs = {};
    for (const [name, label, type] of [['supplierName','اسم المورد'], ['supplierRef','مرجع المورد'], ['supplierAcceptanceRef','مرجع قبول المورد'], ['validUntil','صالح حتى','date'], ['scope','نطاق التأهيل','textarea']]) inputs[name] = control(draft.form, label, name, type);
    finishDraft(draft, () => ({purpose:purposes.supplier, ...Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, input.value.trim()]))}));
  }
  function lineEditor(parent) {
    const section = add('section', parent); add('h4', section, 'البنود'); add('p', section, 'أدخل الضريبة كما في الاتفاق، دون احتساب نسبة مفترضة.');
    const rows = add('div', section), total = add('p', section); total.dataset.procurementDraftTotal = '';
    const entries = []; let sequence = 0;
    function read() {
      if (!entries.length || entries.length > 50) throw new Error(ui.t('راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.'));
      return entries.map(row => {
        const quantity = integer(row.quantity.value), unitPriceMinor = minor(row.unitPrice.value), taxMinor = minor(row.tax.value), taxTreatment = row.treatment.value;
        if (quantity < 1 || !Number.isFinite(quantity) || unitPriceMinor < 1 || !['TAXABLE','EXEMPT','ZERO_RATED'].includes(taxTreatment) || (taxTreatment === 'TAXABLE' ? taxMinor <= 0 : taxMinor !== 0)) throw new Error(ui.t('راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.'));
        const amount = quantity * unitPriceMinor + taxMinor;
        if (!Number.isSafeInteger(amount) || amount > 2147483647) throw new Error(ui.t('راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.'));
        return {lineId:row.id, description:row.description.value.trim(), quantity, unitPriceMinor, taxMinor, taxTreatment, taxReason:row.reason.value.trim()};
      });
    }
    function update() { let value = null; try { value = read().reduce((sum, row) => sum + row.quantity * row.unitPriceMinor + row.taxMinor, 0); } catch {} total.textContent = ui.t('الإجمالي شامل الضريبة') + ': ' + money(value); }
    function append() {
      if (entries.length >= 50) return;
      const box = add('article', rows); box.dataset.procurementLineEditor = ''; add('h4', box, 'البند {0}', [++sequence]);
      const description = control(box, 'الوصف', 'description'); description.maxLength = 1000;
      const quantity = control(box, 'الكمية', 'quantity', 'number'); quantity.min = '1'; quantity.max = '2147483647'; quantity.step = '1';
      const unitPrice = amountControl(box, 'سعر الوحدة (ر.س)', 'unitPrice'), tax = amountControl(box, 'ضريبة البند (ر.س)', 'tax');
      const treatment = choices(box, 'المعاملة الضريبية', 'taxTreatment', [{value:'TAXABLE',label:'خاضع للضريبة'},{value:'EXEMPT',label:'معفى'},{value:'ZERO_RATED',label:'ضريبة بنسبة صفر'}], 'اختر القرار');
      const reason = control(box, 'أساس المعاملة الضريبية', 'taxReason', 'textarea'); reason.maxLength = 1000;
      const row = {id:'line-' + sequence, box, description, quantity, unitPrice, tax, treatment, reason}; entries.push(row);
      button(box, 'إزالة البند', () => { entries.splice(entries.indexOf(row), 1); box.remove(); update(); });
      box.addEventListener('input', update); update();
    }
    button(section, 'إضافة بند', append); append();
    return read;
  }
  function contractDraft() {
    const draft = draftForm('contract', 'إنشاء مسودة عقد'); if (!draft) return;
    const {form} = draft, suppliers = workspace.documents.suppliers.filter(validDocument);
    const supplier = choices(form, 'مستند تأهيل المورد الموقّع', 'supplier', suppliers.map(doc => ({value:doc.id, text:documentText(doc)})));
    if (!suppliers.length) add('p', form, 'لا توجد نسخة موقعة صالحة لهذا الغرض.');
    const reference = control(form, 'مرجع أمر الشراء', 'purchaseReference'); reference.maxLength = 200;
    const method = control(form, 'طريقة المشتريات المتفق عليها', 'procurementMethod'); method.maxLength = 200;
    const system = control(form, 'نظام أو وسيلة التبادل المتفق عليها', 'procurementSystem'); system.maxLength = 200;
    const integration = choices(form, 'حدود الربط', 'integrationMode', [{value:'MANUAL_EVIDENCE',label:'مستندات وإثباتات يدوية'}, {value:'EXTERNAL_REFERENCE_ONLY',label:'مرجع عملية خارجية'}], 'اختر القرار');
    add('p', form, 'لا تنشئ هذه الخيارات اتصالًا تلقائيًا بنظام خارجي.');
    const integrationReference = control(form, 'مرجع العملية الخارجية', 'integrationReference', 'text', false); integrationReference.maxLength = 1000;
    integration.addEventListener('change', () => { integrationReference.required = integration.value === 'EXTERNAL_REFERENCE_ONLY'; });
    const validFrom = control(form, 'سريان التفويض من', 'validFrom', 'date'), validUntil = control(form, 'سريان التفويض حتى', 'validUntil', 'date');
    const participants = {};
    for (const [role, label] of Object.entries(roles)) participants[role] = choices(form, label, role, workspace.participants.filter(person => person.procurementEligible === true).map(person => ({value:person.accountId, text:person.name})), 'اختر عضوًا من الجهة');
    const readLines = lineEditor(form);
    const settlement = add('dl', form); field(settlement, 'سياسة التسوية', ui.t('كامل الطلب بعد قبول الاستلام'));
    const cancellation = choices(form, 'سياسة الإلغاء', 'cancellationPolicy', [{value:'NONE',label:'غير مسموح'},{value:'BEFORE_ANY_EFFECT',label:'قبل أي أثر تنفيذي'}], 'اختر القرار');
    const cancellationTerms = control(form, 'الشروط الفعلية للإلغاء', 'cancellationTerms', 'textarea'); cancellationTerms.maxLength = 8000;
    const reversal = choices(form, 'سياسة العكس والاسترداد', 'reversalPolicy', [{value:'NONE',label:'غير مسموح'},{value:'FULL_ORDER_RETURN_AND_RECOVERY',label:'إعادة كامل الطلب واسترداد المبلغ'}], 'اختر القرار');
    const reversalTerms = control(form, 'الشروط الفعلية للعكس والاسترداد', 'reversalTerms', 'textarea'); reversalTerms.maxLength = 8000;
    const acceptanceMethod = control(form, 'طريقة القبول المستقل', 'acceptanceMethod', 'textarea'); acceptanceMethod.maxLength = 1000;
    finishDraft(draft, () => {
      const selected = suppliers.find(doc => doc.id === supplier.value), lines = readLines(), totalMinor = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor + line.taxMinor, 0);
      if (!selected || validFrom.value > validUntil.value || !Number.isSafeInteger(totalMinor) || totalMinor > 2147483647) throw new Error(ui.t('راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.'));
      return {purpose:purposes.contract, purchaseReference:reference.value.trim(), supplierDocumentId:selected.id, supplierDocumentHash:selected.hash,
        currency:'SAR', totalMinor, procurementMethod:method.value.trim(), procurementSystem:system.value.trim(), integrationMode:integration.value,
        ...(integrationReference.value.trim() ? {integrationReference:integrationReference.value.trim()} : {}), validFrom:validFrom.value, validUntil:validUntil.value,
        ...Object.fromEntries(Object.entries(participants).map(([role, select]) => [role + 'AccountId', select.value])), lines,
        settlementPolicy:'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE', cancellationPolicy:cancellation.value, cancellationTerms:cancellationTerms.value.trim(),
        reversalPolicy:reversal.value, reversalTerms:reversalTerms.value.trim(), acceptanceMethod:acceptanceMethod.value.trim()};
    });
  }
  function renderLines(parent, lines, receiptQuantities = false) {
    const wrapper = add('div', parent); wrapper.className = 'hl-org-procurement-table';
    const table = add('table', wrapper), thead = add('tr', add('thead', table)); add('caption', table, 'البنود');
    for (const label of ['الوصف','الكمية','سعر الوحدة','الضريبة','الإجمالي شامل الضريبة', ...(receiptQuantities ? ['الكمية المستلمة','المتبقي للاستلام'] : [])]) add('th', thead, label).scope = 'col';
    const tbody = add('tbody', table);
    for (const line of lines) {
      const row = add('tr', tbody);
      for (const value of [line.description, line.quantity, money(line.unitPriceMinor), money(line.taxMinor), money(line.quantity * line.unitPriceMinor + line.taxMinor), ...(receiptQuantities ? [line.receivedQuantity, line.remainingQuantity] : [])]) add('td', row).textContent = value == null ? '—' : String(value);
    }
  }
  function renderTerms(parent, terms, supplierName) {
    const section = add('section', parent); add('h4', section, 'العقد الموقّع');
    const values = add('dl', section);
    field(values, 'مرجع أمر الشراء', terms.purchaseReference); if (supplierName) field(values, 'المورد', supplierName);
    field(values, 'الإجمالي شامل الضريبة', money(terms.totalMinor));
    field(values, 'طريقة المشتريات المتفق عليها', terms.procurementMethod); field(values, 'نظام أو وسيلة التبادل المتفق عليها', terms.procurementSystem);
    field(values, 'سريان التفويض من', terms.validFrom); field(values, 'سريان التفويض حتى', terms.validUntil);
    field(values, 'حدود الربط', ui.t(terms.integrationMode === 'EXTERNAL_REFERENCE_ONLY' ? 'مرجع عملية خارجية' : 'مستندات وإثباتات يدوية'));
    if (terms.integrationReference) field(values, 'مرجع العملية الخارجية', terms.integrationReference);
    for (const [role, label] of Object.entries(roles)) field(values, label, actorName(terms.participants?.[role] || terms[role + 'AccountId']));
    if (Array.isArray(terms.lines)) renderLines(section, terms.lines);
    const policy = add('details', section); add('summary', policy, 'سياسة التسوية');
    const policies = add('dl', policy);
    field(policies, 'سياسة التسوية', ui.t('كامل الطلب بعد قبول الاستلام'));
    field(policies, 'سياسة الإلغاء', ui.t(terms.cancellationPolicy === 'BEFORE_ANY_EFFECT' ? 'قبل أي أثر تنفيذي' : 'غير مسموح'));
    field(policies, 'الشروط الفعلية للإلغاء', terms.cancellationTerms);
    field(policies, 'سياسة العكس والاسترداد', ui.t(terms.reversalPolicy === 'FULL_ORDER_RETURN_AND_RECOVERY' ? 'إعادة كامل الطلب واسترداد المبلغ' : 'غير مسموح'));
    field(policies, 'الشروط الفعلية للعكس والاسترداد', terms.reversalTerms); field(policies, 'طريقة القبول المستقل', terms.acceptanceMethod);
  }
  const moneyProofStatus = {PREPARED:'قيد بانتظار الاعتماد', APPROVED:'قيد معتمد', CONFIRMED:'تنفيذ خارجي مؤكد', REJECTED:'قيد مرفوض', VOIDED:'قيد معكوس'};
  const eventLabels = {CREATE:'إنشاء الطلب', RECOMMEND:'توصية المشتريات', APPROVE:'قرار الإدارة العليا', INVOICE:'تسجيل الفاتورة', RECEIVE:'استلام توريد', RECEIPT_ACCEPTANCE:'قبول الاستلام',
    PREPARE_SETTLEMENT:'تجهيز التسوية', APPROVE_SETTLEMENT:'قرار التسوية', CONFIRM_SETTLEMENT:'تأكيد التسوية الخارجية', CANCEL:'إلغاء الطلب', REVERSE:'تسجيل العكس',
    PREPARE_RECOVERY:'تجهيز الاسترداد', APPROVE_RECOVERY:'قرار الاسترداد', CONFIRM_RECOVERY:'تأكيد الاسترداد الخارجي', ACCEPTANCE:'القبول المستقل النهائي'};
  function displayReason(node, reason) {
    if (reason === 'The current source state and named authority do not permit this action.') ui.setText(node, 'الحالة الحالية أو تكليف حسابك لا يسمحان بهذا الإجراء.');
    else if (typeof reason === 'string' && reason) node.textContent = reason;
    else ui.setText(node, 'لم تُحسم أهلية هذا الإجراء؛ حدّث تفاصيل الطلب.');
  }
  function evidenceFor(order, kind) {
    return workspace.documents.evidence.filter(doc => validDocument(doc) && doc.purpose === purposes.evidence && doc.kind === kind
      && doc.payload?.orderId === order.id && doc.payload?.contractHash === order.contract.hash);
  }
  function activeApprovedProof(order, kind) {
    const rows = order.moneyProofs.filter(row => row.kind === kind && row.status === 'APPROVED'); return rows.length === 1 ? rows[0] : null;
  }
  function draftKinds(order) {
    if (!order.integrity.valid || !capability(workspace.capabilities.createDocuments)) return [];
    const available = [], paid = order.moneyProofs.some(row => row.kind === 'SETTLEMENT' && row.status === 'CONFIRMED');
    if (order.status === 'APPROVED' && !paid) {
      if (!order.invoice) available.push('INVOICE');
      if (order.lines.some(line => line.remainingQuantity > 0)) available.push('RECEIPT');
      if (order.lines.length && order.lines.every(line => line.remainingQuantity === 0) && !order.receiptAcceptance) available.push('RECEIPT_ACCEPTANCE');
    }
    const sameTreasurer = workspace.actor.personId === order.participants?.treasurer?.personId;
    if (!sameTreasurer && activeApprovedProof(order, 'SETTLEMENT')) available.push('SETTLEMENT');
    if (!sameTreasurer && order.status === 'RECOVERY_REQUIRED' && activeApprovedProof(order, 'RECOVERY')) available.push('RECOVERY');
    if (['APPROVED','SETTLED'].includes(order.status) && order.terms.reversalPolicy === 'FULL_ORDER_RETURN_AND_RECOVERY' && !order.reversal && (order.invoice || order.receipts.length || order.moneyProofs.length)) available.push('REVERSAL');
    if (['SETTLED','REVERSED','RECOVERED'].includes(order.status) && !order.acceptance.document) available.push('FINAL_ACCEPTANCE');
    return available;
  }
  function evidenceDraft(order, kind) {
    if (selectedOrder?.id !== order.id || !draftKinds(order).includes(kind)) return;
    const draft = draftForm('evidence', 'إنشاء مسودة الإثبات'); if (!draft) return;
    const {form} = draft; const identity = add('dl', form);
    field(identity, 'مرجع أمر الشراء', order.purchaseReference); field(identity, 'نوع الإثبات', ui.t(kinds[kind]));
    const reference = control(form, 'مرجع المستند الأصلي', 'reference'); reference.maxLength = 500;
    const happened = control(form, 'وقت الواقعة (بتوقيت السعودية)', 'occurredAt', 'datetime-local'); happened.step = '1';
    const findings = control(form, 'نتيجة التحقق والسبب', 'findings', 'textarea'); findings.maxLength = 8000;
    const financial = ['INVOICE','SETTLEMENT','RECOVERY','REVERSAL'].includes(kind);
    if (financial) field(identity, 'الإجمالي', money(kind === 'REVERSAL' ? order.totals.settledMinor : order.amountMinor));
    if (kind === 'INVOICE') renderLines(form, order.terms.lines);
    const quantities = [];
    if (kind === 'RECEIPT') {
      for (const line of order.lines.filter(row => row.remainingQuantity > 0)) {
        const box = add('article', form); add('h4', box).textContent = line.description;
        const summary = add('dl', box); field(summary, 'الكمية المستلمة', line.receivedQuantity); field(summary, 'المتبقي للاستلام', line.remainingQuantity);
        const input = control(box, 'الكمية في هذا المحضر', 'quantity-' + line.lineId, 'number'); input.min = '0'; input.max = String(line.remainingQuantity); input.step = '1'; input.value = '0';
        quantities.push({line, input});
      }
    }
    if (kind === 'REVERSAL') {
      const returns = add('dl', form);
      for (const line of order.lines.filter(row => row.receivedQuantity > 0)) field(returns, 'الكمية المعادة', line.description + ' · ' + line.receivedQuantity);
    }
    let bank = null, bankReference = null;
    if (kind === 'SETTLEMENT' || kind === 'RECOVERY') {
      bank = control(form, 'اسم البنك', 'bankName'); bank.maxLength = 200;
      bankReference = control(form, 'مرجع التنفيذ البنكي', 'bankReference'); bankReference.maxLength = 200;
      add('p', form, 'يجهز شخص آخر دليل التنفيذ المالي ويوقّعه مستقلًا عن مؤكد التنفيذ.');
    }
    finishDraft(draft, () => {
      if (selectedOrder?.id !== order.id || !draftKinds(order).includes(kind)) throw new Error(ui.t('تغيّرت بيانات الطلب. حدّث التفاصيل وراجعها قبل اتخاذ القرار.'));
      const occurred = new Date(happened.value + '+03:00');
      if (!Number.isFinite(occurred.getTime()) || occurred.getTime() > Date.now()) throw new Error(ui.t('تحقق من وقت الواقعة؛ يجب أن يكون سابقًا أو مساويًا للوقت الحالي.'));
      const payload = {purpose:purposes.evidence, kind, orderId:order.id, contractHash:order.contract.hash, reference:reference.value.trim(), occurredAt:occurred.toISOString(), findings:findings.value.trim()};
      if (financial) { payload.currency = 'SAR'; payload.amountMinor = kind === 'REVERSAL' ? order.totals.settledMinor : order.amountMinor; }
      if (kind === 'INVOICE') payload.lines = order.terms.lines.map(line => ({...line}));
      if (kind === 'RECEIPT') {
        const rows = quantities.map(({line, input}) => ({lineId:line.lineId, quantity:integer(input.value), remaining:line.remainingQuantity}));
        if (rows.some(row => !Number.isFinite(row.quantity) || row.quantity > row.remaining) || !rows.some(row => row.quantity > 0)) throw new Error(ui.t('راجع كميات البنود ومعاملتها الضريبية وتواريخ الصلاحية.'));
        payload.quantities = rows.filter(row => row.quantity > 0).map(({lineId, quantity}) => ({lineId, quantity}));
      }
      if (kind === 'REVERSAL') payload.quantities = order.lines.filter(row => row.receivedQuantity > 0).map(row => ({lineId:row.lineId, quantity:row.receivedQuantity}));
      if (kind === 'RECEIPT_ACCEPTANCE') payload.evidenceDigest = order.receiptDigest;
      if (kind === 'FINAL_ACCEPTANCE') payload.evidenceDigest = order.completionDigest;
      if (kind === 'SETTLEMENT' || kind === 'RECOVERY') {
        const proof = activeApprovedProof(order, kind); if (!proof) throw new Error(ui.t('الطلب يحتاج مراجعة قبل المتابعة.'));
        payload.financeEntryId = proof.financeEntryId; payload.bankName = bank.value.trim(); payload.bankReference = bankReference.value.trim();
      }
      return payload;
    }, financial);
  }
  function renderEvidenceDrafts(parent, order) {
    if (!capability(workspace.capabilities.createDocuments) || !workspace.templates.some(row => row.code === templateCodes.evidence)) return;
    const section = add('details', parent); add('summary', section, 'تجهيز إثبات مرتبط بالطلب');
    add('p', section, 'تعرض أنواع الإثبات الملائمة للحالة الحالية. حفظ المسودة لا ينفذ الإجراء.');
    const available = draftKinds(order);
    if (workspace.actor.personId === order.participants?.treasurer?.personId && (activeApprovedProof(order, 'SETTLEMENT') || activeApprovedProof(order, 'RECOVERY'))) add('p', section, 'يجهز شخص آخر دليل التنفيذ المالي ويوقّعه مستقلًا عن مؤكد التنفيذ.');
    if (!available.length) { add('p', section, 'الحالة الحالية أو تكليف حسابك لا يسمحان بهذا الإجراء.'); return; }
    const select = choices(section, 'نوع الإثبات', 'evidenceKind', available.map(kind => ({value:kind,label:kinds[kind]})), 'اختر نوع الإثبات');
    const open = button(section, 'تجهيز المسودة', () => { if (available.includes(select.value)) evidenceDraft(order, select.value); });
    open.disabled = true; select.addEventListener('change', () => { open.disabled = !available.includes(select.value); });
  }
  async function renderAttachments(parent, documentId) {
    const c = context(); parent.replaceChildren();
    try {
      const result = await documentRequest(c, '/documents/' + encodeURIComponent(documentId) + '/attachments');
      if (!isCurrent(c) || !parent.isConnected) return;
      if (!Array.isArray(result)) throw new Error('');
      if (!result.length) add('p', parent, 'لا توجد ملفات مرفقة متاحة.');
      for (const file of result) {
        if (typeof file.id !== 'string' || typeof file.filename !== 'string') throw new Error('');
        const download = button(parent, 'تحميل الأصل PDF', async () => {
          if (!isCurrent(c) || !parent.isConnected) return;
          download.disabled = true;
          try {
            const response = await auth().authorizedFetch('/documents/' + encodeURIComponent(documentId) + '/attachments/' + encodeURIComponent(file.id), {cache:'no-store'});
            if (!response.ok) throw new Error(''); const blob = await response.blob(); if (!isCurrent(c) || !parent.isConnected) return;
            const url = URL.createObjectURL(blob); objectUrls.add(url); const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click();
            setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 30000);
          } catch { if (isCurrent(c)) ui.setText(status, 'تعذر تحميل المستند.'); }
          finally { if (isCurrent(c) && parent.isConnected) download.disabled = false; }
        });
        add('bdi', parent).textContent = file.filename;
      }
    } catch { if (isCurrent(c) && parent.isConnected) ui.setText(parent, 'تعذر تحميل المستند.'); }
  }
  function documentCard(parent, label, source) {
    if (!source?.id) return;
    const card = add('article', parent); add('h4', card, label); const summary = add('dl', card);
    field(summary, 'المرجع', source.referenceNumber); field(summary, 'الإصدار', source.version);
    button(card, 'نسخة المستند الموقّع PDF', () => void downloadDocument(source.id, source.referenceNumber));
    const attachments = add('details', card); add('summary', attachments, 'المستندات الأصلية المرفقة'); const list = add('div', attachments);
    attachments.addEventListener('toggle', () => { if (attachments.open) void renderAttachments(list, source.id); else list.replaceChildren(); });
  }
  async function mutateOrder(form, order, definition, payload) {
    const c = context(), [key, path] = definition;
    if (!isCurrent(c) || busy || selectedOrder !== order || !capability(order.actions[key]) || !form.isConnected || !form.reportValidity()) return;
    const body = command(order.id + ':' + key, {expectedRevision:order.revision, expectedDigest:order.digest, ...payload});
    lock(true); ui.setText(status, 'جارٍ حفظ الإجراء…');
    try {
      const result = await request(c, '/orders/' + encodeURIComponent(order.id) + '/' + path, body); if (!isCurrent(c)) return;
      if (result?.id !== order.id || result.organizationId !== c.organizationId || !result.command || result.command.requestId !== body.requestId) throw new Error('');
      commands.delete(order.id + ':' + key); lock(false); await refresh(order.id);
      if (dialog.open && state.organizationId === c.organizationId && state.session === c.session && selectedOrder?.id === order.id) ui.setText(status, 'تم حفظ الإجراء.');
    } catch (error) { if (error?.status === 409 && isCurrent(c)) { form.inert = true; orderContent.querySelectorAll('form').forEach(item => { item.inert = true; }); } showError(error, c, true); }
    finally { if (isCurrent(c)) lock(false); }
  }
  function renderActions(parent, order) {
    const section = add('section', parent); add('h3', section, 'إجراءات الطلب'); add('p', section, 'تجهيز القيد وتسجيل الإثبات لا يرسلان أموالًا من النظام.');
    const actions = add('div', section); actions.className = 'hl-org-procurement-actions';
    const blocked = add('details', section); add('summary', blocked, 'متطلبات المتابعة'); const reasons = add('dl', blocked);
    for (const definition of actionDefinitions) {
      const [key, , title, type] = definition, permission = order.actions[key];
      if (!order.integrity.valid || !capability(permission)) { const row = add('div', reasons); add('dt', row, title); displayReason(add('dd', row), permission?.reason); continue; }
      const group = add('section', actions); add('h4', group, title); const form = add('form', group); form.dataset.procurementAction = key;
      let payload;
      if (type === 'decision') {
        const decision = choices(form, title, 'decision', [{value:'APPROVE',label:'موافقة'},{value:'DECLINE',label:'رفض'}], 'اختر القرار');
        const note = control(form, 'مسوغات القرار', 'note', 'textarea'); note.maxLength = 2000;
        payload = () => ({decision:decision.value, note:note.value.trim()});
      } else if (type === 'account') {
        const accounts = workspace.financeAccounts.filter(account => account.currency === 'SAR');
        const select = choices(form, 'الحساب المالي', 'financeAccountId', accounts.map(account => ({value:account.id,text:account.name})), 'اختر الحساب المالي');
        payload = () => ({financeAccountId:select.value});
      } else if (type === 'cancel') {
        const reason = control(form, 'سبب الإلغاء', 'reason', 'textarea'); reason.maxLength = 2000; payload = () => ({reason:reason.value.trim()});
      } else {
        const docs = evidenceFor(order, type);
        const select = choices(form, 'المستند الموقّع', 'documentId', docs.map(doc => ({value:doc.id,text:documentText(doc)})));
        const preview = add('div', form);
        const reviewed = control(form, 'راجعت المستند والإصدار الحالي وملاءمته لهذا الإجراء.', 'reviewed', 'checkbox');
        select.addEventListener('change', () => { reviewed.checked = false; preview.replaceChildren(); const doc = docs.find(row => row.id === select.value); if (doc) documentCard(preview, 'تفاصيل الإثبات', doc); });
        if (!docs.length) add('p', form, 'لا توجد نسخة موقعة صالحة لهذا الغرض.');
        payload = () => { const doc = docs.find(row => row.id === select.value); if (!doc || !reviewed.checked) return null; return documentBody(doc); };
      }
      const submit = button(form, title); submit.type = 'submit';
      form.addEventListener('submit', event => { event.preventDefault(); const data = payload(); if (data) void mutateOrder(form, order, definition, data); });
    }
  }
  function renderOrder(order) {
    orderContent.replaceChildren(); orderContent.hidden = false;
    if (draftContent) { draftContent.replaceChildren(); draftContent.hidden = true; }
    const header = add('div', orderContent); header.className = 'hl-org-procurement-head'; add('h3', header).textContent = order.purchaseReference;
    button(header, 'تحديث التفاصيل', () => void refresh(order.id));
    add('p', orderContent, statuses[order.status] || 'حالة غير متاحة').className = 'hl-org-procurement-badge';
    if (!order.integrity.valid) { add('p', orderContent, 'المصادر تحتاج مراجعة؛ لم تُثبت المبالغ المالية.'); const list = add('ul', orderContent); for (const reason of order.integrity.reviewReasons) add('li', list).textContent = reason; }
    const totals = add('dl', orderContent); totals.dataset.procurementTotals = '';
    for (const [key,label] of [['amountMinor','الإجمالي'],['settledMinor','المبلغ المسوّى'],['recoveredMinor','المبلغ المسترد'],['netPaidMinor','الأثر المالي الصافي'],['remainingMinor','المتبقي للتسوية'],['recoveryRequiredMinor','المتبقي للاسترداد']]) field(totals, label, money(order.totals[key]));
    const terms = add('details', orderContent); add('summary', terms, 'العقد الموقّع'); renderTerms(terms, order.terms, order.supplier.name);
    const decisions = add('section', orderContent);
    for (const [key, label] of [['recommendation','توصية المشتريات'],['approval','قرار الإدارة العليا']]) {
      add('h4', decisions, label); const decision = order[key];
      if (!decision) add('p', decisions, 'لم يسجّل بعد');
      else { const values = add('dl', decisions); field(values, 'الحالة', ui.t(decision.decision === 'APPROVE' ? 'موافقة' : 'رفض')); field(values, 'المسؤول', actorName(decision.actorAccountId)); field(values, 'التاريخ', dateTime(decision.occurredAt)); field(values, 'مسوغات القرار', decision.note); }
    }
    renderLines(orderContent, order.lines, true);
    const documents = add('details', orderContent); add('summary', documents, 'المستندات المرتبطة');
    for (const [label, source] of [['العقد الموقّع',order.contract],['تأهيل مورد',order.supplier],['الفاتورة',order.invoice],['قبول الاستلام',order.receiptAcceptance],['تسجيل العكس',order.reversal],['القبول المستقل النهائي',order.acceptance.document]]) documentCard(documents, label, source);
    const receipts = add('details', orderContent); add('summary', receipts, 'سجلات الاستلام');
    for (const receipt of order.receipts) {
      const card = add('article', receipts), values = add('dl', card); field(values, 'المرجع', receipt.document.referenceNumber); field(values, 'المستلم', actorName(receipt.receivedByAccountId)); field(values, 'التاريخ', dateTime(receipt.createdAt));
      for (const row of receipt.lines) field(values, 'الكمية المستلمة', (order.lines.find(line => line.lineId === row.lineId)?.description || '—') + ' · ' + row.quantity);
      button(card, 'نسخة المستند الموقّع PDF', () => void downloadDocument(receipt.document.id, receipt.document.referenceNumber));
    }
    const moneyProofs = add('details', orderContent); add('summary', moneyProofs, 'إثباتات التنفيذ المالي');
    for (const proof of order.moneyProofs) {
      const card = add('article', moneyProofs); add('h4', card, kinds[proof.kind] || 'البيانات غير متاحة'); const values = add('dl', card);
      field(values, 'الحالة', ui.t(order.integrity.valid ? moneyProofStatus[proof.status] || 'حالة غير متاحة' : 'الطلب يحتاج مراجعة قبل المتابعة.')); field(values, 'الإجمالي', money(order.integrity.valid ? proof.amountMinor : null)); field(values, 'مرجع القيد', proof.financeEntryId);
      field(values, 'المحاسب المعد', actorName(proof.preparedByAccountId)); if (proof.approvedByAccountId) field(values, 'قرار الإدارة العليا', actorName(proof.approvedByAccountId));
      if (proof.confirmedByAccountId) { field(values, 'مؤكد التنفيذ المالي', actorName(proof.confirmedByAccountId)); field(values, 'التاريخ', dateTime(proof.confirmedAt)); }
      if (proof.document) documentCard(card, 'تفاصيل الإثبات', proof.document);
    }
    if (order.acceptance.document) {
      const acceptance = add('section', orderContent); add('h4', acceptance, 'قبول أدلة هذا الطلب');
      add('p', acceptance, order.acceptance.valid ? 'القبول النهائي مسجّل' : 'الطلب يحتاج مراجعة قبل المتابعة.');
      if (order.acceptance.reason) add('p', acceptance).textContent = order.acceptance.reason;
      const values = add('dl', acceptance); field(values, 'القابل المستقل', order.acceptance.actorName); field(values, 'تاريخ القبول', dateTime(order.acceptance.acceptedAt));
      add('p', acceptance, 'هذا قبول لأدلة الطلب المسجلة.');
    }
    renderEvidenceDrafts(orderContent, order); renderActions(orderContent, order);
    const history = add('details', orderContent); add('summary', history, 'سجل الإجراءات'); const list = add('ol', history);
    for (const event of order.events) { const item = add('li', list); add('strong', item, eventLabels[event.action] || 'البيانات غير متاحة'); const values = add('dl', item); field(values, 'المسؤول', actorName(event.actorAccountId)); field(values, 'التاريخ', dateTime(event.createdAt)); field(values, 'الإصدار', event.afterRevision); }
  }
  async function readOrder(orderId) {
    if (!dialog.open || !workspace || busy || !workspace.orders.some(row => row.id === orderId)) return;
    cancelReads(); const ticket = ++detailGeneration, c = context(); selectedOrder = null; orderContent.replaceChildren();
    if (draftContent) { draftContent.replaceChildren(); draftContent.hidden = true; } orderContent.hidden = false;
    refreshButton.disabled = true; ui.setText(status, 'جارٍ تحميل المشتريات…');
    try {
      const order = await request(c, '/orders/' + encodeURIComponent(orderId)); if (!isCurrent(c) || ticket !== detailGeneration) return;
      if (!order || order.id !== orderId || order.organizationId !== c.organizationId || !Number.isSafeInteger(order.revision) || !/^[a-f0-9]{64}$/.test(order.digest || '') || order.currency !== 'SAR'
        || !order.terms || !order.contract || !order.supplier || !order.totals || !order.acceptance || !Array.isArray(order.lines) || !Array.isArray(order.receipts) || !Array.isArray(order.moneyProofs) || !Array.isArray(order.events)
        || typeof order.integrity?.valid !== 'boolean' || !Array.isArray(order.integrity?.reviewReasons) || !actionDefinitions.every(([key]) => typeof order.actions?.[key]?.allowed === 'boolean')) throw new Error(ui.t('تعذر التحقق من بيانات الجهة المسترجعة.'));
      selectedOrder = order; renderOrder(order); status.replaceChildren();
    } catch (error) { if (ticket === detailGeneration) showError(error, c); }
    finally { if (isCurrent(c) && ticket === detailGeneration) refreshButton.disabled = false; }
  }
  async function installTemplates() {
    const c = context(); if (!isCurrent(c) || busy || !capability(workspace.capabilities.installTemplates)) return;
    lock(true); ui.setText(status, 'جارٍ حفظ الإجراء…');
    try { const result = await request(c, '/templates/install', {}); if (!isCurrent(c)) return; if (!Array.isArray(result?.templates)) throw new Error(''); lock(false); await refresh(); if (dialog.open && state.organizationId === c.organizationId && state.session === c.session) ui.setText(status, 'تم حفظ الإجراء.'); }
    catch (error) { showError(error, c, true); }
    finally { if (isCurrent(c)) lock(false); }
  }
  function command(key, payload) {
    const signature = JSON.stringify(payload), prior = commands.get(key);
    if (prior?.signature === signature) return prior.body;
    const body = {requestId:crypto.randomUUID(), ...payload}; commands.set(key, {signature, body}); return body;
  }
  async function createOrder(form, doc, c) {
    if (!isCurrent(c) || busy || !form.isConnected || !form.reportValidity() || !capability(workspace.capabilities.create)) return;
    const body = command('create:' + doc.id, {contractDocumentId:doc.id, contractVersion:doc.version, contractHash:doc.hash});
    lock(true); ui.setText(status, 'جارٍ حفظ الإجراء…');
    try {
      const result = await request(c, '/orders', body); if (!isCurrent(c)) return;
      if (!result?.id || result.organizationId !== c.organizationId) throw new Error('');
      commands.delete('create:' + doc.id); lock(false); await refresh(result.id);
      if (dialog.open && state.organizationId === c.organizationId && state.session === c.session && selectedOrder?.id === result.id) ui.setText(status, 'تم حفظ الإجراء.');
    } catch (error) { if (error?.status === 409 && isCurrent(c)) form.inert = true; showError(error, c, true); }
    finally { if (isCurrent(c)) lock(false); }
  }
  function renderCreation(parent) {
    const group = add('section', parent); add('h3', group, 'تجهيز المستندات');
    add('p', group, 'تُنشأ المسودات ثم تُراجع وتُعتمد وتُوقّع من مسار المستندات.');
    if (capability(workspace.capabilities.installTemplates) && Object.values(templateCodes).some(code => !workspace.templates.some(template => template.code === code))) button(group, 'حفظ نماذج المشتريات', () => void installTemplates());
    if (capability(workspace.capabilities.createDocuments)) {
      if (workspace.templates.some(row => row.code === templateCodes.supplier)) button(group, 'إنشاء مسودة تأهيل مورد', supplierDraft);
      if (workspace.templates.some(row => row.code === templateCodes.contract)) button(group, 'إنشاء مسودة عقد', contractDraft);
    }
    if (!capability(workspace.capabilities.create)) return;
    const create = add('details', parent); add('summary', create, 'إنشاء طلب من العقد الموقّع');
    const form = add('form', create); form.dataset.procurementCreate = '';
    const c = context(), docs = workspace.documents.contracts.filter(doc => validDocument(doc) && doc.purpose === purposes.contract && doc.payload?.makerAccountId === workspace.actor.accountId);
    const select = choices(form, 'العقد الموقّع', 'contract', docs.map(doc => ({value:doc.id, text:documentText(doc)})));
    const preview = add('div', form);
    if (!docs.length) add('p', form, 'لا توجد نسخة موقعة صالحة لهذا الغرض.');
    const accepted = control(form, 'راجعت العقد والمورد والبنود والأشخاص والشروط المحفوظة.', 'accepted', 'checkbox');
    const submit = button(form, 'إنشاء أمر الشراء'); submit.type = 'submit'; submit.disabled = !docs.length;
    select.addEventListener('change', () => {
      accepted.checked = false; preview.replaceChildren(); const doc = docs.find(row => row.id === select.value); if (!doc) return;
      const supplier = workspace.documents.suppliers.find(row => row.id === doc.payload.supplierDocumentId);
      renderTerms(preview, doc.payload, supplier?.payload?.supplierName);
      button(preview, 'نسخة المستند الموقّع PDF', () => void downloadDocument(doc.id, doc.referenceNumber));
    });
    form.addEventListener('submit', event => { event.preventDefault(); const doc = docs.find(row => row.id === select.value); if (doc && accepted.checked) void createOrder(form, doc, c); });
  }
  function renderWorkspace() {
    content.replaceChildren();
    renderCreation(content);
    draftContent = add('section', content); draftContent.hidden = true; draftContent.dataset.procurementDraftHost = '';
    const orders = add('section', content); add('h3', orders, 'طلبات الشراء');
    if (!workspace.orders.length) add('p', orders, 'لا توجد طلبات شراء محفوظة لهذه الجهة.');
    else {
      const list = add('div', orders); list.className = 'hl-org-procurement-list';
      for (const order of workspace.orders) {
        const item = button(list, null, () => void readOrder(order.id)); item.className = 'hl-org-procurement-order'; item.dataset.procurementOrder = order.id;
        add('bdi', item).textContent = order.purchaseReference;
        add('span', item, statuses[order.status] || 'حالة غير متاحة');
        add('bdi', item).textContent = money(order.amountMinor);
      }
    }
    orderContent = add('section', content); orderContent.dataset.procurementDetail = '';
    add('p', orderContent, 'اختر طلبًا لعرض مستنداته وإجراءاته.');
  }
  async function refresh(orderId = selectedOrder?.id) {
    if (!dialog.open || !auth()?.isAuthenticated?.() || busy) return;
    cancelReads(); state.generation++; const c = context();
    workspace = null; selectedOrder = null; content.replaceChildren(); documentsButton.disabled = true; refreshButton.disabled = true;
    ui.setText(status, 'جارٍ تحميل المشتريات…');
    try {
      const value = await request(c, '/workspace'); if (!isCurrent(c)) return;
      if (!value || value.organization?.id !== c.organizationId || !value.actor?.accountId || !value.capabilities || !Array.isArray(value.orders) || !Array.isArray(value.participants) || !Array.isArray(value.templates) || !Array.isArray(value.financeAccounts) || !['suppliers','contracts','evidence'].every(key => Array.isArray(value.documents?.[key]))) throw new Error(ui.t('تعذر التحقق من بيانات الجهة المسترجعة.'));
      workspace = value; organizationLabel.textContent = value.organization.displayName;
      documentsButton.disabled = false; renderWorkspace(); status.replaceChildren();
      if (orderId && value.orders.some(order => order.id === orderId)) await readOrder(orderId);
    } catch (error) { showError(error, c); }
    finally { if (isCurrent(c)) refreshButton.disabled = false; }
  }
  for (const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed']) document.addEventListener(event, close);
  document.addEventListener('hydroland:auth-changed', () => { if (!auth()?.isAuthenticated?.() || state.session !== auth()?.getSessionVersion?.()) close(); });
  window.HydrolandOrganizationProcurement = {
    open({organizationId} = {}) {
      if (!auth()?.isAuthenticated?.() || typeof organizationId !== 'string' || !organizationId.trim()) return;
      clear(); state.organizationId = organizationId; state.session = auth().getSessionVersion();
      if (!dialog.open) dialog.showModal(); void refresh();
    }, close
  };
})();
