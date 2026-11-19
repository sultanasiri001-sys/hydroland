(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("documents", {
  "إدارة المستندات": "Document department",
  "DOCUMENT CONTROL · إدارة المستندات": "DOCUMENT CONTROL · Document management",
  "المستندات والنماذج التشغيلية": "Operational documents and forms",
  "إنشاء، تعديل، متابعة، اعتماد وتوقيع المستندات حسب صلاحيتك الفعلية في الجهة.": "Create, edit, track, approve and sign documents according to your actual authority in the organization.",
  "تحديث": "Refresh",
  "الجهة": "Organization",
  "كل الإدارات": "All departments",
  "اختر جهة لعرض مستنداتها.": "Select an organization to view its documents.",
  "مستندات الإدارات والنواقص": "Department documents and gaps",
  "عرض الأنواع": "Show types",
  "كل الأنواع": "All types",
  "بلا مستند محفوظ": "No saved document",
  "تنتظر الاعتماد": "Awaiting approval",
  "تحتاج تهيئة أو تصحيح النموذج": "Template setup or correction required",
  "نسخ مؤرشفة فقط": "Archived versions only",
  "حفظ نماذج دورة الموارد البشرية الناقصة": "Save missing HR workflow templates",
  "قوالب عقود الموظفين الموجودة": "Existing employee contract templates",
  "نماذج توثيق للإجراءات وربط مراجعها؛ التعيين والأجور وتعديل العقد وإيقاف الوصول تُنفّذ في مساراتها المختصة. قوالب العقود تُفتح من المكتبة نفسها.": "Forms document procedures and link their references. Appointments, wages, contract changes and access suspension are performed through their respective workflows. Contract templates open from the same library.",
  "حساب المالك هو صاحب الاعتماد الإداري في جميع الإدارات الأربع عشرة. لكل نسخة اعتماد محفوظ مستقل؛ أي تعديل لاحق يحتاج اعتماد النسخة الجديدة. المراجعة القانونية والفنية والتوقيعات وتنفيذ الإجراءات تبقى في مساراتها المختصة، ويمكن تكليف المراجعين لكل نسخة عند تفعيلهم.": "The owner's account holds administrative approval authority across all fourteen departments. Each version has a separate saved approval; later changes require approval of the new version. Legal/technical reviews, signatures and execution remain in their respective workflows. Reviewers can be assigned to each version when enabled.",
  "إنشاء مستند": "Create document",
  "النموذج": "Template",
  "تحميل طلبات التعيين المحفوظة": "Load saved appointment requests",
  "اختيار طلب التعيين": "Select appointment request",
  "اختر طلبًا محفوظًا": "Select a saved request",
  "طلبات تعيين أقدم": "Older appointment requests",
  "فحص مرجع الموظف وطلب التعيين": "Check employee and appointment references",
  "حفظ المسودة": "Save draft",
  "إلغاء التعديل": "Cancel edit",
  "مستندات الجهة": "Organization documents",
  "لم يتم تحميل المستندات بعد.": "Documents have not been loaded.",
  "بيانات من سجلات المنصة": "Data from platform records",
  "مصدر البيانات": "Data source",
  "تحميل السجلات": "Load records",
  "السجل المحفوظ": "Saved register",
  "اختر سجلًا": "Select a record",
  "سجلات أخرى": "More records",
  "إضافة السجل": "Add record",
  "جلب البيانات من المنصة": "Retrieve platform data",
  "إزالة الربط": "Remove link",
  "السجل الأول يحدد مرجع الإجراء. أضف السجلات الأخرى لبيانات الأطراف.": "The first record determines the action reference. Add other records for party data.",
  "حسابي": "My account",
  "سجل موظف": "Employee record",
  "طلب إجازة": "Leave request",
  "تسجيل متدرب ومدرب": "Trainee and instructor enrollment",
  "سجل غوص": "Dive log",
  "مشارك في حجز": "Booking participant",
  "حالة عميل": "Customer case",
  "وسيلة بحرية": "Marine vessel",
  "رحلة": "Trip",
  "حجز": "Booking",
  "معاملة مالية": "Financial transaction",
  "معاملة إدارية": "Administrative transaction",
  "خدمة المصادقة غير جاهزة": "Authentication service is not ready",
  "مسودة": "Draft",
  "بانتظار الاعتماد": "Awaiting approval",
  "معتمد": "Approved",
  "موقّع": "Signed",
  "مؤرشف": "Archived",
  "حذف صف من": "Remove a row from",
  "حذف الصف": "Remove row",
  "اختر إجابة": "Choose an answer",
  "نعم": "Yes",
  "لا": "No",
  "الإجراء": "Action",
  "إضافة صف": "Add row",
  "(إلزامي)": "(required)",
  "تحقق من بيانات جدول": "Check table data for",
  "أكمل الجدول الإلزامي:": "Complete the required table:",
  "الحد الأقصى للجدول مئة صف.": "A table can contain no more than 100 rows.",
  "لا توجد نماذج نشطة لهذه الجهة.": "No active templates for this organization.",
  "معدّ النموذج": "Form preparer",
  "غير مسجل في المصدر": "Not recorded in source",
  "تُعرض بيانات المصدر المثبتة مع هذا الإصدار. لا تتغير بتحديث الحساب تلقائيًا.": "Source data pinned to this version is shown. It does not change automatically when an account is updated.",
  "جارٍ قراءة السجلات المحفوظة...": "Reading saved records...",
  "تعذر التحقق من مصدر السجلات.": "Could not verify the record source.",
  "عُرض": "Showing",
  "سجلًا محفوظًا.": "saved records.",
  "لا توجد سجلات متاحة من هذا المصدر في الجهة الحالية.": "No records from this source are available in the current organization.",
  "تعذر قراءة السجلات.": "Could not read records.",
  "حمّل سجلات المصدر المختار.": "Load records from the selected source.",
  "اختر سجلًا محفوظًا.": "Select a saved record.",
  "يمكن ربط أربعة سجلات في المستند الواحد.": "Up to four records can be linked to one document.",
  "السجل مضاف بالفعل.": "Record already added.",
  "اجلب البيانات قبل الحفظ.": "Retrieve data before saving.",
  "ستزال بيانات الربط من الإصدار الجديد عند حفظ التعديل.": "Linked data will be removed from the new version when the edit is saved.",
  "أضف سجلًا محفوظًا أولًا.": "Add a saved record first.",
  "جارٍ جلب البيانات من مصادرها...": "Retrieving data from its sources...",
  "تعذر التحقق من بيانات المصدر.": "Could not verify source data.",
  "جُلبت البيانات من السجلات الأصلية. تُثبّت مع نسخة المستند عند الحفظ.": "Data retrieved from original records. It is pinned to the document version when saved.",
  "تعذر جلب البيانات.": "Could not retrieve data.",
  "لا توجد مستندات محفوظة ضمن الاختيار الحالي.": "No saved documents match the current selection.",
  "إرفاق ملف PDF للمستند": "Attach a PDF to the document",
  "إرفاق مستند PDF (حتى 10 ميغابايت)": "Attach PDF document (up to 10 MB)",
  "ك.ب": "KB",
  "لا توجد مرفقات PDF.": "No PDF attachments.",
  "· الإصدار": "· Version",
  "معتمد إداريًا من المالك": "Administratively approved by owner",
  "تعديل": "Edit",
  "إرسال للاعتماد": "Submit for approval",
  "اعتماد": "Approve",
  "توقيع": "Sign",
  "أرشفة": "Archive",
  "إدارة تكليف المراجعة المستقلة": "Manage independent review assignment",
  "فحص سجلات الحضور والإجازة": "Check attendance and leave records",
  "فحص السجل الوظيفي المرتبط": "Check linked employment record",
  "اعتماد المالك الإداري وسجله": "Owner administrative approval and history",
  "قرارات المالك الروتينية": "Routine owner decisions",
  "إصدار ومتابعة القرار التنفيذي": "Issue and track executive decision",
  "ملفات PDF المرفقة": "Attached PDF files",
  "فحص مسار الاعتماد": "Check approval workflow",
  "عرض PDF": "View PDF",
  "نموذج مهيأ": "Template configured",
  "النموذج غير مهيأ": "Template not configured",
  "النموذج غير نشط": "Template inactive",
  "تعارض الإصدارات النشطة": "Conflicting active versions",
  "تعارض الإدارة": "Department conflict",
  "عدم وجود مستند يحدد فجوة في السجل؛ تحديد وجوبه بحسب الإجراء والحالة يحتاج مراجعة. الحصر الكامل لمستندات الإدارة لم يُعتمد بعد. العقود في مكتبة العقود، والتراخيص في مسارها المختص. وقت القراءة:": "A missing document identifies a gap in the register. Whether it is required for the procedure and circumstances needs review. The full departmental document inventory has not yet been approved. Contracts are in the contract library; licenses have a separate workflow. Read time:",
  "يشمل": "Includes",
  "نوعًا أساسيًا و": "baseline types and",
  "نموذجًا لاستكمال الموارد البشرية، وأي نماذج إضافية مسجلة.": "HR completion templates, plus any additional registered templates.",
  "يشمل الأنواع المسجلة لهذه الجهة.": "Includes types registered for this organization.",
  "· توجد سجلات بتعارض في الإدارة تحتاج مراجعة.": "· Some records have department conflicts requiring review.",
  "نوع ·": "types ·",
  "بلا مستند ·": "without documents ·",
  "نوع المستند": "Document type",
  "تهيئة النموذج": "Template setup",
  "حالة السجل": "Record status",
  "مسودات": "Drafts",
  "معتمد / موقّع": "Approved / signed",
  "لا يوجد مستند محفوظ": "No saved document",
  "مؤرشف فقط": "Archived only",
  "مستندات محفوظة": "Saved documents",
  "عرض المستندات": "View documents",
  "لا توجد أنواع مطابقة للعرض الحالي.": "No types match the current view.",
  "جارٍ تحميل مستندات الإدارات وحصر النواقص...": "Loading department documents and identifying gaps...",
  "تعذر قراءة حصر المستندات؛ أعد المحاولة.": "Could not read the document inventory. Try again.",
  "تم تحميل": "Loaded",
  "مستند · صلاحيتك:": "documents · Your authority:",
  "مالك هيدرولاند الداخلي": "Internal Hydroland owner",
  "تعذر تحميل المستندات": "Could not load documents",
  "مستندات هذه المنشأة غير متاحة لصلاحيتك الحالية.": "This organization's documents are unavailable under your current authority.",
  "لا توجد جهة مستندات متاحة لصلاحيتك الحالية.": "No document organization is available under your current authority.",
  "تعذر تحميل الجهات": "Could not load organizations",
  "افتح مكتبة عقود هيدرولاند من الملف الشخصي.": "Open the Hydroland contract library from your profile.",
  "نماذج الموارد البشرية الموجودة محفوظة؛ لا توجد نماذج جديدة تحتاج تهيئة.": "Existing HR templates are retained. No new templates need setup.",
  "تم حفظ": "Saved",
  "من": "of",
  "نموذج في المكتبة...": "templates in the library...",
  "تعذر استكمال حفظ النماذج": "Could not finish saving templates",
  "حُفظ": "Saved",
  "نموذج؛": "templates;",
  "نموذج في مكتبة المستندات. لا تُنشأ سجلات موظفين أو قرارات تعيين من تهيئة النماذج.": "templates in the document library. Template setup does not create employee records or appointment decisions.",
  "تمت تهيئة النموذج؛ يمكنك إنشاء المستند الآن.": "Template configured. You can now create the document.",
  "تعذر تهيئة النموذج": "Could not configure template",
  "اجلب بيانات السجلات المختارة قبل حفظ المستند.": "Retrieve selected-record data before saving the document.",
  "تم حفظ التعديل والإصدار الجديد.": "Edit and new version saved.",
  "تم حفظ المستند كمسودة.": "Document saved as a draft.",
  "تعذر حفظ المستند": "Could not save document",
  "تعذر تحميل فحص الحضور": "Could not load attendance check",
  "جارٍ فحص مراجع النسخة المحفوظة…": "Checking references for the saved version…",
  "تعذر فحص السجلات.": "Could not check records.",
  "تعذر تحميل فحص السجل": "Could not load record check",
  "جارٍ قراءة طلبات التعيين…": "Reading appointment requests…",
  "طلبًا معروضًا": "requests shown",
  "؛ تتوفر طلبات أقدم": "; older requests are available",
  "لا توجد طلبات تعيين محفوظة في هذه الجهة.": "No saved appointment requests in this organization.",
  "تعذرت قراءة الطلبات.": "Could not read requests.",
  "جارٍ قراءة سجل الموظف وطلب التعيين…": "Reading employee record and appointment request…",
  "تعذر قراءة السجل.": "Could not read the record.",
  "جارٍ التحقق من مراجع النسخة المحفوظة…": "Verifying saved-version references…",
  "جارٍ قراءة سجل الاعتماد الإداري…": "Reading administrative approval history…",
  "تعذر التحقق من سجل الاعتماد الإداري.": "Could not verify administrative approval history.",
  "نسخة معتمدة إداريًا من المالك. المراجعة المستقلة والتوقيع يُعرضان في حالة المصدر.": "Version administratively approved by the owner. Independent review and signature are shown in source status.",
  "تعذرت قراءة الاعتمادات الإدارية؛ افتح سجل النسخة للتحقق من حالتها.": "Could not read administrative approvals. Open the version history to verify its status.",
  "تعذر تحميل اعتماد المالك": "Could not load owner approval",
  "تعذر تحميل مسار قرار المالك": "Could not load owner-decision workflow",
  "هذا الإجراء الداخلي من مسار التكليف المحدد، وبحساب الشخص المكلّف فقط.": "This internal action must use the specified assignment workflow and the assigned person's account.",
  "المالك هو منشئ المستند؛ لا يمكنه اعتماد مستنده أو توقيعه بصفته شخصًا مستقلًا.": "The owner created the document and cannot approve or sign it as an independent person.",
  "الوصول محصور بالمالك؛ ولا يمكن للمعتمد نفسه أن يكون الموقّع المستقل.": "Access is limited to the owner. The approver cannot also be the independent signer.",
  "المالك هو معتمد المستند؛ التوقيع يتطلب شخصًا مستقلًا مخوّلًا.": "The owner approved this document. Signing requires an independent authorized person.",
  "بيانات المعتمد غير مكتملة؛ يلزم فحص سجل المستند دون اصطناع اعتماد.": "Approver data is incomplete. Check the document history without inventing approval.",
  "يوجد تكليف فعّال لهذه النسخة؛ يتابع المراجع والموقّع من حسابيهما في صندوق المراجعات": "An active assignment exists for this version. The reviewer and signer continue from their own review inboxes",
  "المسار متعثر بالضوابط الحالية": "Workflow blocked by current controls",
  "المستند مؤرشف — قراءة فقط": "Document archived — read only",
  "المستند موقّع — الأرشفة إجراء منفصل": "Document signed — archiving is a separate action",
  "فحص صلاحية المستخدم الحالي فقط — ليس تأكيدًا لاكتمال مسار الاعتماد": "Current-user authority check only — not confirmation of a complete approval workflow",
  "جارٍ فحص مسار الاعتماد دون تغيير المستند…": "Checking approval workflow without changing the document…",
  "تعذر فحص المسار. لم يُغيّر المستند.": "Could not check the workflow. The document was unchanged.",
  "تغيّر المستند أو لم يُتحقق من نطاق النتيجة؛ حدّث القائمة وأعد الفحص.": "The document changed or result scope was not verified. Refresh the list and check again.",
  "الاعتماد": "Approval",
  "التوقيع": "Signature",
  "هذا فحص للقراءة فقط وليس اعتمادًا أو توقيعًا.": "This is a read-only check, not approval or signature.",
  "يلزم تكليف مراجع وموقّع مستقلين لهذه النسخة من إدارة تكليف المراجعة؛ هذا الفحص لا يمنح صلاحية.": "Assign an independent reviewer and signer to this version through review-assignment management. This check does not grant authority.",
  "تعذر فحص المسار؛ لم يُغيّر المستند.": "Could not check workflow. The document was unchanged.",
  "جارٍ رفع ملف PDF والتحقق منه…": "Uploading and validating PDF…",
  "اختر ملف PDF فقط.": "Select a PDF file only.",
  "حجم ملف PDF يجب ألا يتجاوز 10 ميغابايت.": "PDF size must not exceed 10 MB.",
  "تم إرفاق ملف PDF بالمستند.": "PDF attached to document.",
  "تعذر رفع ملف PDF.": "Could not upload PDF.",
  "تعذر تنزيل ملف PDF.": "Could not download PDF.",
  "حدّث الصفحة لتحميل مسار القرار التنفيذي.": "Refresh the page to load the executive-decision workflow.",
  "حدّث الصفحة لتحميل مسار المراجعة المستقلة.": "Refresh the page to load the independent-review workflow.",
  "تعديل المسودة": "Edit draft",
  "تم إرسال المستند للاعتماد.": "Document submitted for approval.",
  "تم اعتماد المستند.": "Document approved.",
  "تم توقيع المستند.": "Document signed.",
  "تمت أرشفة المستند.": "Document archived.",
  "تعذر تنفيذ الإجراء": "Could not perform the action",
  "العقود الإلكترونية": "Electronic contracts",
  "رفع الوثائق": "Upload documents",
  "التوقيع الإلكتروني": "Electronic signature",
  "طلب اعتماد الإدارة": "Request administrative approval",
  "متابعة الحالة": "Track status",
  "حذف صف من {0}": "Remove a row from {0}",
  " (إلزامي)": " (required)",
  "تحقق من بيانات جدول {0}": "Check table data for {0}",
  "أكمل الجدول الإلزامي: {0}": "Complete the required table: {0}",
  "عُرض {0} سجلًا محفوظًا.": "Showing {0} saved records.",
  "{0} عدم وجود مستند يحدد فجوة في السجل؛ تحديد وجوبه بحسب الإجراء والحالة يحتاج مراجعة. الحصر الكامل لمستندات الإدارة لم يُعتمد بعد. العقود في مكتبة العقود، والتراخيص في مسارها المختص. وقت القراءة: {1}{2}": "{0} A missing document identifies a gap in the register. Whether it is required for the procedure and circumstances needs review. The full departmental document inventory has not yet been approved. Contracts are in the contract library; licenses have a separate workflow. Read time: {1}{2}",
  "يشمل {0} نوعًا أساسيًا و{1} نموذجًا لاستكمال الموارد البشرية، وأي نماذج إضافية مسجلة.": "Includes {0} baseline types and {1} HR completion templates, plus any additional registered templates.",
  " · توجد سجلات بتعارض في الإدارة تحتاج مراجعة.": " · Some records have department conflicts requiring review.",
  "تم تحميل {0} مستند · صلاحيتك: {1}": "Loaded {0} documents · Your authority: {1}",
  "تم حفظ {0} من {1} نموذج في المكتبة...": "Saved {0} of {1} templates in the library...",
  "حُفظ {0} نموذج؛ {1}. يمكن استكمال الأنواع الناقصة من الحالة المحدّثة.": "Saved {0} templates; {1}. Missing types can be completed from the refreshed state.",
  "تم حفظ {0} نموذج في مكتبة المستندات. لا تُنشأ سجلات موظفين أو قرارات تعيين من تهيئة النماذج.": "Saved {0} templates in the document library. Template setup does not create employee records or appointment decisions.",
  "{0} طلبًا معروضًا{1}. اختيار الطلب يملأ مرجعي الموظف والتعيين.": "{0} requests shown{1}. Selecting a request fills the employee and appointment references.",
  "{0} نسخة معتمدة إداريًا من المالك. المراجعة المستقلة والتوقيع يُعرضان في حالة المصدر.": "{0} versions administratively approved by the owner. Independent review and signature are shown in source status.",
  "{0}. {1} {2} هذا فحص للقراءة فقط وليس اعتمادًا أو توقيعًا.": "{0}. {1} {2} This is a read-only check, not approval or signature."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? window.HydrolandHrSource?.authoredErrorMessage?.(error) ?? window.HydrolandHrAttendance?.authoredErrorMessage?.(error) ?? error?.message;

  const authoredStatusLabel = (s) => ((value=>value===undefined?value:uiLocale.message(value))({DRAFT:'مسودة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'}[s]) || s);
  const authoredTemplateStatus = (s) => ((value=>value===undefined?value:uiLocale.message(value))({READY:'نموذج مهيأ',NOT_CONFIGURED:'النموذج غير مهيأ',INACTIVE:'النموذج غير نشط',ACTIVE_VERSION_CONFLICT:'تعارض الإصدارات النشطة',DEPARTMENT_CONFLICT:'تعارض الإدارة'}[s]) || s);

  // Evaluate on each action so a changed accessibility preference takes effect immediately.
  const documentScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  if(document.getElementById('hl-documents'))return;
  const host=document.getElementById('role-console');if(!host)return;
  const style=document.createElement('style');uiLocale.setMessage(style, `
  .hl-documents{margin:1rem 0;padding:1rem;border:1px solid rgba(120,191,224,.18);border-radius:20px;background:rgba(3,25,39,.9);color:#eaf5fa}.hl-documents[hidden]{display:none}.hl-doc-head,.hl-doc-toolbar,.hl-doc-actions{display:flex;gap:.7rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.hl-doc-head h3,.hl-doc-card h4{margin:.2rem 0}.hl-doc-head p,.hl-doc-note,.hl-doc-meta{color:#9cb7c7}.hl-doc-toolbar{margin:.8rem 0}.hl-documents select,.hl-documents input,.hl-documents textarea{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.22);border-radius:11px;background:#0b293c;color:#fff;padding:.7rem}.hl-documents label{display:grid;gap:.3rem;font-weight:700}.hl-doc-layout{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(320px,1.2fr);gap:1rem}.hl-doc-card{border:1px solid rgba(120,191,224,.14);border-radius:16px;padding:.9rem;background:rgba(255,255,255,.025)}.hl-doc-fields{display:grid;gap:.65rem}.hl-doc-list{display:grid;gap:.65rem}.hl-doc-item{border:1px solid rgba(120,191,224,.14);border-radius:14px;padding:.8rem}.hl-doc-item header{display:flex;gap:.6rem;justify-content:space-between;align-items:flex-start}.hl-doc-status{font-size:.78rem;padding:.25rem .5rem;border-radius:999px;background:rgba(229,180,95,.14);color:#f3d496}.hl-doc-actions{justify-content:flex-start;margin-top:.65rem}.hl-documents button{border:1px solid rgba(120,191,224,.22);border-radius:10px;background:#12364b;color:#fff;padding:.55rem .75rem;font-weight:800;cursor:pointer}.hl-documents button.primary{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}.hl-documents button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:760px){.hl-doc-layout{grid-template-columns:1fr}}
  `);document.head.appendChild(style);
  const panel=document.createElement('section');panel.id='hl-documents';panel.className='hl-documents';panel.hidden=true;uiLocale.setHTML(panel, uiLocale.html`
    <header class="hl-doc-head"><div><small>DOCUMENT CONTROL · إدارة المستندات</small><h3>المستندات والنماذج التشغيلية</h3><p>إنشاء، تعديل، متابعة، اعتماد وتوقيع المستندات حسب صلاحيتك الفعلية في الجهة.</p></div><button type="button" data-doc-refresh>تحديث</button></header>
    <div class="hl-doc-toolbar"><label>الجهة<select data-doc-org></select></label><label>إدارة المستندات<select data-doc-department aria-label="إدارة المستندات"><option value="">كل الإدارات</option></select></label><span class="hl-doc-note" role="status" data-doc-note>اختر جهة لعرض مستنداتها.</span></div>
    <section class="hl-doc-card"><h4>مستندات الإدارات والنواقص</h4><p class="hl-doc-note" data-doc-inventory-scope></p><div data-doc-departments class="hl-doc-departments"></div><label>عرض الأنواع<select data-doc-gap-filter><option value="ALL">كل الأنواع</option><option value="NO_RECORD">بلا مستند محفوظ</option><option value="PENDING">تنتظر الاعتماد</option><option value="SETUP">تحتاج تهيئة أو تصحيح النموذج</option><option value="ARCHIVE_ONLY">نسخ مؤرشفة فقط</option></select></label><div class="hl-doc-actions"><button type="button" data-doc-setup-hr hidden>حفظ نماذج دورة الموارد البشرية الناقصة</button><button type="button" data-doc-hr-contracts hidden>قوالب عقود الموظفين الموجودة</button></div><p class="hl-doc-note" data-doc-hr-guidance hidden>نماذج توثيق للإجراءات وربط مراجعها؛ التعيين والأجور وتعديل العقد وإيقاف الوصول تُنفّذ في مساراتها المختصة. قوالب العقود تُفتح من المكتبة نفسها.</p><div data-doc-inventory></div></section>
    <p class="hl-doc-note" data-doc-workflow-policy hidden>حساب المالك هو صاحب الاعتماد الإداري في جميع الإدارات الأربع عشرة. لكل نسخة اعتماد محفوظ مستقل؛ أي تعديل لاحق يحتاج اعتماد النسخة الجديدة. المراجعة القانونية والفنية والتوقيعات وتنفيذ الإجراءات تبقى في مساراتها المختصة، ويمكن تكليف المراجعين لكل نسخة عند تفعيلهم.</p><p class="hl-doc-note" data-doc-owner-approval-status role="status" aria-live="polite"></p>
    <div class="hl-doc-layout"><form class="hl-doc-card" data-doc-form><h4 data-doc-form-title>إنشاء مستند</h4><label>النموذج<select data-doc-template required></select></label><div class="hl-doc-fields" data-doc-fields></div><section data-doc-hr-source-picker hidden><button type="button" data-doc-hr-source-load>تحميل طلبات التعيين المحفوظة</button><label>اختيار طلب التعيين<select data-doc-hr-source-select><option value="">اختر طلبًا محفوظًا</option></select></label><button type="button" data-doc-hr-source-more hidden>طلبات تعيين أقدم</button><p class="hl-doc-note" data-doc-hr-source-picker-status role="status"></p></section><button type="button" data-doc-hr-source-preview hidden>فحص مرجع الموظف وطلب التعيين</button><div class="hl-doc-note" data-doc-hr-source-preview-result role="status" aria-live="polite" hidden></div><section data-doc-attendance-check hidden style="overflow-wrap:anywhere"></section><div class="hl-doc-actions"><button class="primary" type="submit" data-doc-save>حفظ المسودة</button><button type="button" data-doc-cancel hidden>إلغاء التعديل</button></div></form><section class="hl-doc-card"><h4>مستندات الجهة</h4><div class="hl-doc-list" data-doc-list><p>لم يتم تحميل المستندات بعد.</p></div></section></div>`);
  host.insertAdjacentElement('afterend',panel);
  const extraStyle=document.createElement('style');uiLocale.setMessage(extraStyle, '.hl-doc-departments{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;margin:.7rem 0}.hl-doc-departments button{text-align:start}.hl-doc-departments small{display:block;color:#b3c9d6}.hl-doc-inventory-table{overflow:auto;margin:.8rem 0}.hl-doc-inventory-table table{width:100%;border-collapse:collapse;min-width:620px}.hl-doc-inventory-table th,.hl-doc-inventory-table td{text-align:start;border-bottom:1px solid #25485b;padding:.6rem}.hl-doc-inventory-table caption{text-align:start;font-weight:700;padding:.5rem}.hl-documents [data-doc-tablefield]{min-width:0;border:1px solid rgba(120,191,224,.22);border-radius:11px;padding:.7rem}.hl-documents [data-doc-tablefield] table{border-collapse:collapse;min-width:520px;width:100%}.hl-documents [data-doc-tablefield] td,.hl-documents [data-doc-tablefield] th{padding:.35rem;text-align:start;min-width:150px}.hl-documents [data-doc-tablefield] legend{font-weight:700}.hl-documents [aria-pressed="true"]{outline:2px solid #e5b45f}.hl-documents [data-doc-hr-source-preview-result],.hl-documents [data-doc-hr-source-result]{overflow-wrap:anywhere}.hl-documents [data-doc-hr-source-preview-result] dd,.hl-documents [data-doc-hr-source-result] dd{margin:.25rem 0 .7rem}');document.head.appendChild(extraStyle);
  let sourceCheckGeneration=0,sourceCandidatesGeneration=0,sourceCandidates=[],sourceCandidatesCursor=null;
  const state={memberships:[],orgId:null,member:null,templates:[],documents:[],inventory:null,department:'',typeCode:'',editing:null,generation:0,loading:false,preferInternal:false};
  const platformSourcePanel=document.createElement('section');platformSourcePanel.hidden=true;
  uiLocale.setHTML(platformSourcePanel, uiLocale.html`<h4>بيانات من سجلات المنصة</h4><label>مصدر البيانات<select data-platform-source-kind></select></label><button type="button" data-platform-source-load>تحميل السجلات</button><label>السجل المحفوظ<select data-platform-source-record><option value="">اختر سجلًا</option></select></label><button type="button" data-platform-source-more hidden>سجلات أخرى</button><button type="button" data-platform-source-add>إضافة السجل</button><div data-platform-source-selection></div><div class="hl-doc-actions"><button type="button" data-platform-source-preview>جلب البيانات من المنصة</button><button type="button" data-platform-source-clear>إزالة الربط</button></div><p data-platform-source-status class="hl-doc-note" role="status"></p><div data-platform-source-values style="overflow-wrap:anywhere"></div>`);
  panel.querySelector('[data-doc-fields]').before(platformSourcePanel);
  const platformSourceHelp=document.createElement('p');platformSourceHelp.className='hl-doc-note';uiLocale.setMessage(platformSourceHelp, uiLocale.message('السجل الأول يحدد مرجع الإجراء. أضف السجلات الأخرى لبيانات الأطراف.'));platformSourcePanel.querySelector('h4').after(platformSourceHelp);
  const platformKinds={ACCOUNT:'حسابي',EMPLOYMENT:'سجل موظف',LEAVE_REQUEST:'طلب إجازة',TRAINING_ENROLLMENT:'تسجيل متدرب ومدرب',DIVE_LOG:'سجل غوص',BOOKING_PARTICIPANT:'مشارك في حجز',CUSTOMER_CASE:'حالة عميل',MARINE_ASSET:'وسيلة بحرية',TRIP:'رحلة',BOOKING:'حجز',FINANCE_ENTRY:'معاملة مالية',ADMINISTRATIVE_RECORD:'معاملة إدارية'};
  let platformSourceGeneration=0,platformReferences=[],platformPreview=null,platformRemove=false,platformCandidates=[],platformCursor=null;
  const session=()=>window.HydrolandAuth?.getSessionVersion?.();
  const context=()=>({generation:state.generation,orgId:state.orgId,session:session()});
  const current=c=>c.generation===state.generation&&c.orgId===state.orgId&&c.session===session()&&Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=async(path,options={})=>{const client=window.HydrolandAuth?.authorizedFetch;if(!client)throw localError(uiLocale.message('خدمة المصادقة غير جاهزة'));const response=await client(path,options);const type=response.headers.get('content-type')||'';const body=type.includes('application/json')?await response.json().catch(()=>null):null;if(!response.ok){const error=new Error(body?.message||`HTTP ${response.status}`);error.status=response.status;throw error;}return body};
  const note=message=>{const el=panel.querySelector('[data-doc-note]');if(el)uiLocale.setMessage(el, message)};
  const statusLabel=s=>({DRAFT:'مسودة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'}[s]||s);
  const canManage=()=>['OWNER','ADMIN'].includes(state.member?.role);
  const canWrite=()=>['OWNER','ADMIN','OPERATOR','INSTRUCTOR','STAFF'].includes(state.member?.role);
  const myAccountId=()=>window.HydrolandProfileData?.profile?.id||null;
  const hash=async payload=>{const bytes=new TextEncoder().encode(JSON.stringify(payload));const digest=await crypto.subtle.digest('SHA-256',bytes);return 'sha256:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
  const tableRow=(field,row={})=>uiLocale.html`<tr data-doc-table-row>${field.options.map(column=>uiLocale.html`<td><input data-doc-table-cell="${esc(column)}" aria-label="${esc((field.labelAr||field.key)+' - '+column)}" value="${esc(row?.[column]??'')}" maxlength="8000"></td>`).join('')}<td><button type="button" data-doc-table-remove ${uiLocale.attribute("aria-label", "حذف صف من {0}", [(field.labelAr || field.key)])}>حذف الصف</button></td></tr>`;
  function fieldInput(field,value=''){
    const key=esc(field.key),label=esc(field.labelAr||field.labelEn||field.key),required=field.required?' required':'';
    const type=String(field.type||'TEXT').toUpperCase();
    if(type==='SECTION')return uiLocale.html`<h4 data-doc-section="${key}">${label}</h4>`;
    if(type==='STATEMENT')return uiLocale.html`<section data-doc-statement="${key}"><h4>${label}</h4><p style="white-space:pre-wrap">${esc(field.contentAr||field.contentEn||'')}</p></section>`;
    if(type==='BOOLEAN')return uiLocale.html`<label>${label}<select name="${key}"${required}><option value="">اختر إجابة</option><option value="true"${value===true||value==='true'?' selected':''}>نعم</option><option value="false"${value===false||value==='false'?' selected':''}>لا</option></select></label>`;
    if(type==='TABLE'){
      if(!field.options?.length)return uiLocale.html`<label>${label}<textarea name="${key}" data-doc-table-json rows="4"${required}>${esc(Array.isArray(value)?JSON.stringify(value,null,2):value)}</textarea></label>`;
      const rows=Array.isArray(value)&&value.length?value:[{}];
      return uiLocale.html`<fieldset data-doc-tablefield="${key}"><legend>${label}${uiLocale.messageHTML((field.required ? uiLocale.message(' (إلزامي)') : ''))}</legend><div style="overflow:auto"><table><thead><tr>${field.options.map(column=>uiLocale.html`<th scope="col">${esc(column)}</th>`).join('')}<th scope="col">الإجراء</th></tr></thead><tbody>${rows.map(row=>tableRow(field,row)).join('')}</tbody></table></div><button type="button" data-doc-table-add="${key}">إضافة صف</button></fieldset>`;
    }
    if(Array.isArray(field.options)&&field.options.length)return uiLocale.html`<label>${label}<select name="${key}"${required}>${field.options.map(o=>uiLocale.html`<option value="${esc(o)}"${String(o)===String(value)?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
    if(type==='TEXTAREA'||type==='LONG_TEXT')return uiLocale.html`<label>${label}<textarea name="${key}" rows="4"${required}>${esc(value)}</textarea></label>`;
    const htmlType=type==='DATE'?'date':type==='NUMBER'?'number':'text';
    return uiLocale.html`<label>${label}<input type="${htmlType}"${type==='NUMBER'?' step="any"':''} name="${key}" value="${esc(value)}"${required}></label>`;
  }
  function collectTableValues(form,template,payload){
    for(const field of template.fields.filter(f=>f.type==='TABLE')){
      if(!field.options?.length){try{payload[field.key]=JSON.parse(String(payload[field.key]||'[]'));}catch{throw localError(uiLocale.message("تحقق من بيانات جدول {0}", [field.labelAr]));}continue;}
      const holder=[...form.querySelectorAll('[data-doc-tablefield]')].find(e=>e.dataset.docTablefield===field.key);
      const rows=[...(holder?.querySelectorAll('[data-doc-table-row]')||[])].map(row=>Object.fromEntries([...row.querySelectorAll('[data-doc-table-cell]')].map(input=>[input.dataset.docTableCell,input.value]))).filter(row=>Object.values(row).some(v=>String(v).trim()));
      if(field.required&&!rows.length)throw localError(uiLocale.message("أكمل الجدول الإلزامي: {0}", [field.labelAr]));
      payload[field.key]=rows;
    }
  }
  panel.addEventListener('click',event=>{
    const add=event.target.closest('[data-doc-table-add]'),remove=event.target.closest('[data-doc-table-remove]');
    if((!add&&!remove)||!canWrite()||state.loading)return;
    if(remove){remove.closest('[data-doc-table-row]')?.remove();return;}
    const field=activeTemplate()?.fields.find(f=>f.key===add.dataset.docTableAdd&&f.type==='TABLE');
    const body=add.closest('[data-doc-tablefield]')?.querySelector('tbody');
    if(!field||!body)return;if(body.rows.length>=100){note(uiLocale.message('الحد الأقصى للجدول مئة صف.'));return;}
    uiLocale.insertHTML(body, 'beforeend', tableRow(field));
  });
  const activeTemplate=()=>state.editing?.template||state.templates.find(t=>t.id===panel.querySelector('[data-doc-template]')?.value);
  function renderFields(payload={}){const template=activeTemplate(),box=panel.querySelector('[data-doc-fields]');if(!box)return;uiLocale.setHTML(box, template?(Array.isArray(template.fields)?template.fields:[]).map(f=>fieldInput(f,payload?.[f.key]??'')).join(''):uiLocale.html`<p>لا توجد نماذج نشطة لهذه الجهة.</p>`);panel.querySelector('[data-doc-save]').disabled=!template||!canWrite();clearSourcePreview();resetSourcePicker();resetAttendanceCheck();resetPlatformSource(payload);}
  function platformMessage(message){uiLocale.setMessage(platformSourcePanel.querySelector('[data-platform-source-status]'), message);}
  function platformValues(snapshot){
    const box=platformSourcePanel.querySelector('[data-platform-source-values]');box.replaceChildren();
    if(!snapshot||snapshot.schemaVersion!==1||snapshot.organizationId!==state.orgId||!Array.isArray(snapshot.records))return;
    for(const record of snapshot.records){
      const h=document.createElement('h5');uiLocale.setMessage(h, (record.kind==='AUTHOR' ? uiLocale.message('معدّ النموذج') : ((value=>value===undefined?value:uiLocale.message(value))(platformKinds[record.kind]) || record.kind)));box.append(h);
      const dl=document.createElement('dl');
      for(const f of record.fields||[]){const dt=document.createElement('dt'),dd=document.createElement('dd');uiLocale.setMessage(dt, f.labelAr);uiLocale.setMessage(dd, (f.value===null ? uiLocale.message('غير مسجل في المصدر') : String(f.value)));dl.append(dt,dd);}box.append(dl);
    }
    for(const [key,value] of Object.entries(snapshot.bindings||{})){
      const input=[...panel.querySelectorAll('[data-doc-fields] [name]')].find(x=>x.name===key);if(!input)continue;input.value=value===null?'':String(value);if('readOnly' in input)input.readOnly=true;input.dataset.platformBound='1';
    }
  }
  function invalidatePlatformPreview(){platformSourceGeneration++;platformPreview=null;platformSourcePanel.querySelector('[data-platform-source-values]').replaceChildren();for(const el of panel.querySelectorAll('[data-platform-bound]')){el.readOnly=false;delete el.dataset.platformBound;}}
  function renderPlatformSelection(){uiLocale.setMessage(platformSourcePanel.querySelector('[data-platform-source-selection]'), platformReferences.map(r=>`${platformKinds[r.kind]}: ${r.label||r.id}`).join(' | '));}
  function resetPlatformSource(payload={}){
    invalidatePlatformPreview();platformReferences=[];platformRemove=false;platformCandidates=[];platformCursor=null;
    platformSourcePanel.hidden=!(state.inventory?.internalPlatform&&canManage()&&activeTemplate());
    uiLocale.setHTML(platformSourcePanel.querySelector('[data-platform-source-kind]'), Object.entries(platformKinds).map(([k,v])=>uiLocale.html`<option value="${k}">${uiLocale.messageHTML(uiLocale.message(v))}</option>`).join(''));
    uiLocale.setHTML(platformSourcePanel.querySelector('[data-platform-source-record]'), uiLocale.html`<option value="">اختر سجلًا</option>`);
    platformSourcePanel.querySelector('[data-platform-source-more]').hidden=true;renderPlatformSelection();platformMessage('');
    if(!platformSourcePanel.hidden&&payload?._platformSources){platformValues(payload._platformSources);platformMessage(uiLocale.message('تُعرض بيانات المصدر المثبتة مع هذا الإصدار. لا تتغير بتحديث الحساب تلقائيًا.'));}
  }
  async function loadPlatformCandidates(append=false){
    if(platformSourcePanel.hidden||state.loading)return;
    const c=context(),kind=platformSourcePanel.querySelector('[data-platform-source-kind]').value,ticket=++platformSourceGeneration;
    const valid=()=>current(c)&&!panel.hidden&&!platformSourcePanel.hidden&&ticket===platformSourceGeneration&&kind===platformSourcePanel.querySelector('[data-platform-source-kind]').value;
    platformMessage(uiLocale.message('جارٍ قراءة السجلات المحفوظة...'));
    try{
      const result=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/platform-sources/${kind}${append&&platformCursor?'?cursor='+encodeURIComponent(platformCursor):''}`,{cache:'no-store'});if(!valid())return;
      if(result?.organizationId!==c.orgId||result.kind!==kind||!Array.isArray(result.items))throw localError(uiLocale.message('تعذر التحقق من مصدر السجلات.'));
      platformCandidates=append?[...platformCandidates,...result.items]:result.items;platformCursor=result.nextCursor;
      uiLocale.setHTML(platformSourcePanel.querySelector('[data-platform-source-record]'), uiLocale.html`<option value="">اختر سجلًا</option>${platformCandidates.map(r=>uiLocale.html`<option value="${esc(r.id)}">${esc(r.label)} · ${esc(r.id)}</option>`).join('')}`);
      platformSourcePanel.querySelector('[data-platform-source-more]').hidden=!result.hasMore;platformMessage((platformCandidates.length ? uiLocale.message("عُرض {0} سجلًا محفوظًا.", [platformCandidates.length]) : uiLocale.message('لا توجد سجلات متاحة من هذا المصدر في الجهة الحالية.')));
    }catch(e){if(valid()){invalidatePlatformPreview();platformReferences=[];platformRemove=false;renderPlatformSelection();platformCandidates=[];platformCursor=null;platformSourcePanel.querySelector('[data-platform-source-record]').replaceChildren();platformSourcePanel.querySelector('[data-platform-source-more]').hidden=true;platformMessage((localErrorMessage(e) || uiLocale.message('تعذر قراءة السجلات.')));}}
  }
  platformSourcePanel.querySelector('[data-platform-source-load]').addEventListener('click',()=>loadPlatformCandidates());
  platformSourcePanel.querySelector('[data-platform-source-more]').addEventListener('click',()=>loadPlatformCandidates(true));
  platformSourcePanel.querySelector('[data-platform-source-kind]').addEventListener('change',()=>{invalidatePlatformPreview();platformCandidates=[];platformCursor=null;uiLocale.setHTML(platformSourcePanel.querySelector('[data-platform-source-record]'), uiLocale.html`<option value="">اختر سجلًا</option>`);platformSourcePanel.querySelector('[data-platform-source-more]').hidden=true;platformMessage(uiLocale.message('حمّل سجلات المصدر المختار.'));});
  platformSourcePanel.querySelector('[data-platform-source-add]').addEventListener('click',()=>{
    if(platformSourcePanel.hidden||state.loading)return;const kind=platformSourcePanel.querySelector('[data-platform-source-kind]').value,id=platformSourcePanel.querySelector('[data-platform-source-record]').value,item=platformCandidates.find(r=>r.id===id);
    if(!item){platformMessage(uiLocale.message('اختر سجلًا محفوظًا.'));return;}if(platformReferences.length>=4){platformMessage(uiLocale.message('يمكن ربط أربعة سجلات في المستند الواحد.'));return;}
    if(platformReferences.some(r=>r.kind===kind&&r.id===id)){platformMessage(uiLocale.message('السجل مضاف بالفعل.'));return;}invalidatePlatformPreview();platformReferences.push({kind,id,label:item.label});platformRemove=false;renderPlatformSelection();platformMessage(uiLocale.message('اجلب البيانات قبل الحفظ.'));
  });
  platformSourcePanel.querySelector('[data-platform-source-clear]').addEventListener('click',()=>{if(platformSourcePanel.hidden||state.loading)return;invalidatePlatformPreview();platformReferences=[];platformRemove=true;renderPlatformSelection();platformMessage(uiLocale.message('ستزال بيانات الربط من الإصدار الجديد عند حفظ التعديل.'));});
  platformSourcePanel.querySelector('[data-platform-source-preview]').addEventListener('click',async()=>{
    if(platformSourcePanel.hidden||state.loading||!platformReferences.length){platformMessage(uiLocale.message('أضف سجلًا محفوظًا أولًا.'));return;}
    const c=context(),t=activeTemplate(),ticket=++platformSourceGeneration,refs=platformReferences.map(({kind,id})=>({kind,id}));
    const valid=()=>current(c)&&!panel.hidden&&!platformSourcePanel.hidden&&ticket===platformSourceGeneration&&activeTemplate()?.id===t.id;
    platformPreview=null;platformMessage(uiLocale.message('جارٍ جلب البيانات من مصادرها...'));
    try{
      const result=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/platform-source-preview`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({templateId:t.id,references:refs}),cache:'no-store'});if(!valid())return;
      if(result?.organizationId!==c.orgId||result.templateId!==t.id||result.templateVersion!==t.version||result.snapshot?.organizationId!==c.orgId||!/^[a-f0-9]{64}$/.test(result.snapshot?.fingerprint||''))throw localError(uiLocale.message('تعذر التحقق من بيانات المصدر.'));
      platformPreview={references:refs,expectedFingerprint:result.snapshot.fingerprint};platformValues(result.snapshot);platformMessage(uiLocale.message('جُلبت البيانات من السجلات الأصلية. تُثبّت مع نسخة المستند عند الحفظ.'));
    }catch(e){if(valid()){invalidatePlatformPreview();platformReferences=[];platformRemove=false;renderPlatformSelection();platformMessage((localErrorMessage(e) || uiLocale.message('تعذر جلب البيانات.')));}}
  });
  function resetEditor(){state.editing=null;uiLocale.setMessage(panel.querySelector('[data-doc-form-title]'), uiLocale.message('إنشاء مستند'));panel.querySelector('[data-doc-template]').disabled=false;panel.querySelector('[data-doc-cancel]').hidden=true;renderFields({})}
  function renderDocuments(){
    const list=panel.querySelector('[data-doc-list]');if(!list)return;
    const docs=state.documents.filter(d=>(!state.department||d.department===state.department)&&(!state.typeCode||d.template?.code===state.typeCode));
    if(!docs.length){uiLocale.setHTML(list, uiLocale.html`<p>لا توجد مستندات محفوظة ضمن الاختيار الحالي.</p>`);return}
    const me=myAccountId();
    uiLocale.setHTML(list, docs.map(d=>{
      const admin=canManage(),canApprove=admin&&!state.inventory?.internalPlatform&&d.status==='PENDING_APPROVAL'&&d.createdByAccountId!==me,canSign=admin&&!state.inventory?.internalPlatform&&d.status==='APPROVED'&&d.createdByAccountId!==me&&d.approvedByAccountId!==me;
      const attachments=Array.isArray(d.attachments)?d.attachments:[];
      const attachmentControls=d.status==='DRAFT'&&canWrite()?uiLocale.html`<label>إرفاق مستند PDF (حتى 10 ميغابايت)<input type="file" accept="application/pdf,.pdf" data-doc-attachment-upload aria-label="إرفاق ملف PDF للمستند"></label>`:'';
      const attachmentList=attachments.length?attachments.map(a=>uiLocale.html`<button type="button" data-doc-attachment-download="${esc(a.id)}">${esc(a.filename)} · PDF · ${Math.ceil(a.byteSize/1024)} ك.ب</button>`).join(' '):uiLocale.html`<span class="hl-doc-note">لا توجد مرفقات PDF.</span>`;
      return uiLocale.html`<article class="hl-doc-item" data-document-id="${esc(d.id)}"><header><div><strong>${esc(d.template?.titleAr||d.template?.titleEn||d.referenceNumber)}</strong><div class="hl-doc-meta">${esc(d.referenceNumber)} · الإصدار ${esc(d.version)}</div></div><span class="hl-doc-status">${uiLocale.messageHTML(authoredStatusLabel(d.status))}</span>${state.ownerApprovals?.[d.id]?.sourceVersion===d.version?uiLocale.html`<span class="hl-doc-status" data-doc-owner-approved>معتمد إداريًا من المالك</span>`:''}</header><div class="hl-doc-actions">${d.status==='DRAFT'&&canWrite()?uiLocale.html`<button type="button" data-doc-action="edit">تعديل</button><button type="button" data-doc-action="submit">إرسال للاعتماد</button>`:''}${canApprove?uiLocale.html`<button type="button" data-doc-action="approve">اعتماد</button>`:''}${canSign?uiLocale.html`<button type="button" data-doc-action="sign">توقيع</button>`:''}${admin&&d.status==='SIGNED'?uiLocale.html`<button type="button" data-doc-action="archive">أرشفة</button>`:''}${admin&&state.inventory?.internalPlatform&&d.status!=='DRAFT'?uiLocale.html`<button type="button" data-doc-action="review-assignment">إدارة تكليف المراجعة المستقلة</button>`:''}${state.inventory?.internalPlatform&&supportsHrAttendance(d.template)?uiLocale.html`<button type="button" data-doc-action="attendance-source">فحص سجلات الحضور والإجازة</button>`:''}${state.inventory?.internalPlatform&&supportsHrSource(d.template)?uiLocale.html`<button type="button" data-doc-action="hr-source">فحص السجل الوظيفي المرتبط</button>`:''}${admin&&state.inventory?.internalPlatform?uiLocale.html`<button type="button" data-doc-action="owner-approval">اعتماد المالك الإداري وسجله</button>`:''}${state.inventory?.internalPlatform&&((d.template?.code==='ADM-MEETING-MINUTES'&&d.department==='ADMIN_AFFAIRS_RECORDS')||(d.template?.code==='EXE-FOLLOWUP'&&d.department==='EXECUTIVE_GOVERNANCE'))?uiLocale.html`<button type="button" data-doc-action="owner-decision">قرارات المالك الروتينية</button>`:''}${admin&&state.inventory?.internalPlatform&&d.template?.code==='EXE-DECISION'&&d.department==='EXECUTIVE_GOVERNANCE'&&d.status==='SIGNED'?uiLocale.html`<button type="button" data-doc-action="executive-decision">إصدار ومتابعة القرار التنفيذي</button>`:''}<button type="button" data-doc-action="readiness">فحص مسار الاعتماد</button><button type="button" data-doc-action="pdf">عرض PDF</button></div><section class="hl-doc-attachments" aria-label="ملفات PDF المرفقة"><div class="hl-doc-actions">${attachmentControls}${attachmentList}</div><p class="hl-doc-note" data-doc-attachment-status role="status" aria-live="polite"></p></section><div class="hl-doc-note" data-doc-readiness role="status" aria-live="polite" hidden></div><div class="hl-doc-note" data-doc-hr-source-result role="status" aria-live="polite" hidden></div><div class="hl-doc-note" data-doc-attendance-saved-result role="status" aria-live="polite" style="overflow-wrap:anywhere" hidden></div></article>`;
    }).join(''));
  }
  const templateStatus=s=>({READY:'نموذج مهيأ',NOT_CONFIGURED:'النموذج غير مهيأ',INACTIVE:'النموذج غير نشط',ACTIVE_VERSION_CONFLICT:'تعارض الإصدارات النشطة',DEPARTMENT_CONFLICT:'تعارض الإدارة'}[s]||s);
  function renderInventory(){
    const inventory=state.inventory,departments=inventory?.departments||[],filter=panel.querySelector('[data-doc-gap-filter]').value;
    panel.querySelector('[data-doc-workflow-policy]').hidden=!inventory?.internalPlatform;
    const hr=Boolean(inventory?.internalPlatform&&state.department==='HR'&&canManage());for(const selector of ['[data-doc-setup-hr]','[data-doc-hr-contracts]','[data-doc-hr-guidance]'])panel.querySelector(selector).hidden=!hr;
    uiLocale.setMessage(panel.querySelector('[data-doc-inventory-scope]'), (inventory ? uiLocale.message("{0} عدم وجود مستند يحدد فجوة في السجل؛ تحديد وجوبه بحسب الإجراء والحالة يحتاج مراجعة. الحصر الكامل لمستندات الإدارة لم يُعتمد بعد. العقود في مكتبة العقود، والتراخيص في مسارها المختص. وقت القراءة: {1}{2}", [(inventory.internalPlatform ? uiLocale.message("يشمل {0} نوعًا أساسيًا و{1} نموذجًا لاستكمال الموارد البشرية، وأي نماذج إضافية مسجلة.", [inventory.baselineTemplateCount, (inventory.extensionTemplateCount || 0)]) : uiLocale.message('يشمل الأنواع المسجلة لهذه الجهة.')), new Date(inventory.observedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}), (inventory.inconsistentRecordCount ? uiLocale.message(' · توجد سجلات بتعارض في الإدارة تحتاج مراجعة.') : '')]) : ''));
    uiLocale.setHTML(panel.querySelector('[data-doc-departments]'), departments.map(d=>uiLocale.html`<button type="button" data-doc-department-card="${esc(d.code)}" aria-pressed="${state.department===d.code}"><strong>${esc(d.nameAr)}</strong><small>${d.summary.types} نوع · ${d.summary.noRecord} بلا مستند · ${d.summary.pendingApproval} بانتظار الاعتماد</small></button>`).join(''));
    const shown=departments.filter(d=>!state.department||d.code===state.department);
    uiLocale.setHTML(panel.querySelector('[data-doc-inventory]'), shown.map(d=>{
      const items=d.items.filter(t=>filter==='ALL'||filter==='NO_RECORD'&&t.recordStatus==='NO_RECORD'||filter==='PENDING'&&t.counts.PENDING_APPROVAL>0||filter==='SETUP'&&t.templateStatus!=='READY'||filter==='ARCHIVE_ONLY'&&t.recordStatus==='ARCHIVE_ONLY');
      return uiLocale.html`<div class="hl-doc-inventory-table"><table><caption>${esc(d.nameAr)}</caption><thead><tr><th>نوع المستند</th><th>تهيئة النموذج</th><th>حالة السجل</th><th>مسودات</th><th>بانتظار الاعتماد</th><th>معتمد / موقّع</th><th>مؤرشف</th><th>الإجراء</th></tr></thead><tbody>${items.map(t=>uiLocale.html`<tr data-doc-inventory-code="${esc(t.code)}"><td>${esc(t.titleAr)}<small class="hl-doc-meta"> · ${esc(t.code)}</small></td><td>${uiLocale.messageHTML(authoredTemplateStatus(t.templateStatus))}</td><td>${uiLocale.messageHTML((t.recordStatus==='NO_RECORD' ? uiLocale.message('لا يوجد مستند محفوظ') : (t.recordStatus==='ARCHIVE_ONLY' ? uiLocale.message('مؤرشف فقط') : uiLocale.message('مستندات محفوظة'))))}</td><td>${t.counts.DRAFT}</td><td>${t.counts.PENDING_APPROVAL}</td><td>${t.counts.APPROVED} / ${t.counts.SIGNED}</td><td>${t.counts.ARCHIVED}</td><td>${t.setup&&canManage()?uiLocale.html`<button type="button" data-doc-setup="${esc(t.code)}" data-department="${esc(d.code)}">تهيئة النموذج</button>`:''}${t.activeTemplateId&&canWrite()?uiLocale.html`<button type="button" data-doc-create-type="${esc(t.code)}" data-department="${esc(d.code)}">إنشاء مستند</button>`:''}${t.total?uiLocale.html`<button type="button" data-doc-view-type="${esc(t.code)}" data-department="${esc(d.code)}">عرض المستندات</button>`:''}</td></tr>`).join('')||uiLocale.html`<tr><td colspan="8">لا توجد أنواع مطابقة للعرض الحالي.</td></tr>`}</tbody></table></div>`;
    }).join(''));
  }
  function renderSelection(){
    const select=panel.querySelector('[data-doc-template]'),prior=select.value;
    const available=new Set((state.inventory?.departments||[]).flatMap(d=>d.items.map(t=>t.activeTemplateId).filter(Boolean)));
    const templates=state.templates.filter(t=>available.has(t.id)&&(!state.department||t.department===state.department));
    uiLocale.setHTML(select, templates.map(t=>uiLocale.html`<option value="${esc(t.id)}">${esc(t.titleAr||t.titleEn||t.code)}</option>`).join(''));
    if(templates.some(t=>t.id===prior))select.value=prior;
    resetEditor();renderDocuments();renderInventory();
  }
  function clearData(){uiLocale.setMessage(panel.querySelector('[data-doc-owner-approval-status]'), '');state.ownerApprovals={};state.templates=[];state.documents=[];state.inventory=null;state.member=null;state.editing=null;panel.querySelector('[data-doc-template]').replaceChildren();uiLocale.setHTML(panel.querySelector('[data-doc-department]'), uiLocale.html`<option value="">كل الإدارات</option>`);renderSelection();}
  async function loadOrganization(orgId){
    if(state.orgId!==orgId)state.typeCode='';
    state.generation++;state.loading=true;state.orgId=orgId;const c=context();clearData();
    state.member=state.memberships.find(x=>x.organization?.id===orgId)||null;
    note(uiLocale.message('جارٍ تحميل مستندات الإدارات وحصر النواقص...'));
    try{
      const path=`/documents/organizations/${encodeURIComponent(orgId)}`;
      const [templates,documents,inventory]=await Promise.all([request(`${path}/templates`),request(`${path}/list`),request(`${path}/inventory`)]);
      if(!current(c))return;
      if(!inventory||inventory.organizationId!==orgId||!Array.isArray(inventory.departments))throw localError(uiLocale.message('تعذر قراءة حصر المستندات؛ أعد المحاولة.'));
      state.templates=Array.isArray(templates)?templates:[];state.documents=Array.isArray(documents)?documents:[];state.inventory=inventory;
      if(!inventory.departments.some(d=>d.code===state.department))state.department='';
      const select=panel.querySelector('[data-doc-department]');uiLocale.setHTML(select, uiLocale.html`<option value="">كل الإدارات</option>${inventory.departments.map(d=>uiLocale.html`<option value="${esc(d.code)}">${esc(d.nameAr)}</option>`).join('')}`);select.value=state.department;
      renderSelection();if(state.inventory?.internalPlatform)void loadOwnerApprovals();note(uiLocale.message("تم تحميل {0} مستند · صلاحيتك: {1}", [state.documents.length, (state.member?.accessBasis==='PLATFORM_OWNER' ? uiLocale.message('مالك هيدرولاند الداخلي') : (state.member?.role || '—'))]));
    }catch(error){if(current(c)){clearData();note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تحميل المستندات')));}}
    finally{if(current(c)){state.loading=false;panel.querySelector('[data-doc-hr-source-preview]').disabled=false;}}
  }
  async function refresh(requestedOrganizationId){
    state.generation++;const c=context();state.loading=true;clearData();
    if(!window.HydrolandAuth?.isAuthenticated?.()){state.memberships=[];panel.hidden=true;return;}
    try{
      const memberships=await request('/documents/workspace');if(!current(c))return;
      state.memberships=(Array.isArray(memberships)?memberships:[]).filter(x=>x.status==='ACTIVE');
      const orgSelect=panel.querySelector('[data-doc-org]');uiLocale.setHTML(orgSelect, state.memberships.map(x=>uiLocale.html`<option value="${esc(x.organization.id)}">${esc(x.organization.displayName)} · ${esc(x.role)}</option>`).join(''));
      if(typeof requestedOrganizationId==='string'&&!state.memberships.some(x=>x.organization.id===requestedOrganizationId)){
        state.orgId=null;state.loading=false;orgSelect.selectedIndex=-1;note(uiLocale.message('مستندات هذه المنشأة غير متاحة لصلاحيتك الحالية.'));return;
      }
      if(!state.memberships.length){state.orgId=null;state.loading=false;note(uiLocale.message('لا توجد جهة مستندات متاحة لصلاحيتك الحالية.'));return;}
      const internal=state.memberships.find(x=>x.organization.kind==='HYDROLAND_INTERNAL_PLATFORM');
      const wanted=typeof requestedOrganizationId==='string'?requestedOrganizationId:state.preferInternal&&internal?internal.organization.id:state.memberships.some(x=>x.organization.id===state.orgId)?state.orgId:state.memberships[0].organization.id;
      state.preferInternal=false;orgSelect.value=wanted;await loadOrganization(wanted);
    }catch(error){if(current(c)){state.loading=false;note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تحميل الجهات')));}}
  }
  panel.querySelector('[data-doc-hr-contracts]').addEventListener('click',()=>{if(!canManage()||state.department!=='HR'||!state.inventory?.internalPlatform)return;if(window.HydrolandContractLibrary?.open)window.HydrolandContractLibrary.open();else note(uiLocale.message('افتح مكتبة عقود هيدرولاند من الملف الشخصي.'));});
  panel.querySelector('[data-doc-setup-hr]').addEventListener('click',async()=>{
    if(state.loading||!canManage()||state.department!=='HR'||!state.inventory?.internalPlatform)return;
    const c=context(),button=panel.querySelector('[data-doc-setup-hr]'),items=state.inventory.departments.find(d=>d.code==='HR')?.items.filter(t=>t.setup)||[];
    if(!items.length){note(uiLocale.message('نماذج الموارد البشرية الموجودة محفوظة؛ لا توجد نماذج جديدة تحتاج تهيئة.'));return;}
    state.loading=true;button.disabled=true;let saved=0,failure='';
    try{for(const item of items){if(!current(c)||panel.hidden||state.department!=='HR')return;await request('/documents/templates',{method:'POST',body:JSON.stringify(item.setup)});saved++;if(current(c))note(uiLocale.message("تم حفظ {0} من {1} نموذج في المكتبة...", [saved, items.length]));}}
    catch(error){failure=error instanceof Error?error.message:uiLocale.t('تعذر استكمال حفظ النماذج');}
    finally{button.disabled=false;if(current(c)){state.loading=false;await loadOrganization(c.orgId);note((failure ? uiLocale.message("حُفظ {0} نموذج؛ {1}. يمكن استكمال الأنواع الناقصة من الحالة المحدّثة.", [saved, failure]) : uiLocale.message("تم حفظ {0} نموذج في مكتبة المستندات. لا تُنشأ سجلات موظفين أو قرارات تعيين من تهيئة النماذج.", [saved])));}}
  });
  function chooseDepartment(code){state.department=code;state.typeCode='';panel.querySelector('[data-doc-department]').value=code;renderSelection();}
  panel.querySelector('[data-doc-department]').addEventListener('change',event=>chooseDepartment(event.target.value));
  panel.querySelector('[data-doc-gap-filter]').addEventListener('change',renderInventory);
  panel.querySelector('[data-doc-departments]').addEventListener('click',event=>{const button=event.target.closest('[data-doc-department-card]');if(button)chooseDepartment(button.dataset.docDepartmentCard);});
  panel.querySelector('[data-doc-inventory]').addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||state.loading)return;
    const dept=state.inventory?.departments.find(d=>d.code===button.dataset.department),code=button.dataset.docSetup||button.dataset.docCreateType||button.dataset.docViewType,item=dept?.items.find(t=>t.code===code);if(!item)return;
    if(button.dataset.docSetup){
      if(!canManage()||!item.setup)return;const c=context();button.disabled=true;
      try{await request('/documents/templates',{method:'POST',body:JSON.stringify(item.setup)});if(!current(c))return;await loadOrganization(c.orgId);if(c.orgId===state.orgId&&c.session===session())note(uiLocale.message('تمت تهيئة النموذج؛ يمكنك إنشاء المستند الآن.'));}
      catch(error){if(current(c))note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تهيئة النموذج')));}
      finally{button.disabled=false;}return;
    }
    chooseDepartment(dept.code);state.typeCode=button.dataset.docViewType?code:'';renderDocuments();
    if(item.activeTemplateId){panel.querySelector('[data-doc-template]').value=item.activeTemplateId;renderFields({});}
    panel.querySelector(button.dataset.docViewType?'[data-doc-list]':'[data-doc-form]').scrollIntoView({block:'center'});
  });
  panel.querySelector('[data-doc-refresh]')?.addEventListener('click',refresh);
  panel.querySelector('[data-doc-org]')?.addEventListener('change',e=>loadOrganization(e.target.value));
  panel.querySelector('[data-doc-template]')?.addEventListener('change',()=>renderFields({}));
  panel.querySelector('[data-doc-cancel]')?.addEventListener('click',resetEditor);
  panel.querySelector('[data-doc-form]')?.addEventListener('submit',async event=>{
    event.preventDefault();const template=activeTemplate();if(!template||!state.orgId||!canWrite()||state.loading)return;
    const c=context(),editingId=state.editing?.id,payload=Object.fromEntries(new FormData(event.currentTarget).entries()),save=panel.querySelector('[data-doc-save]');save.disabled=true;
    try{
      collectTableValues(event.currentTarget,template,payload);
      if(platformReferences.length&&!platformPreview)throw localError(uiLocale.message('اجلب بيانات السجلات المختارة قبل حفظ المستند.'));
      const sourceBinding=platformPreview||(platformRemove?{references:[],expectedFingerprint:''}:undefined);
      const contentHash=await hash(payload);if(!current(c))return;
      if(editingId)await request(`/documents/${encodeURIComponent(editingId)}/revise`,{method:'POST',body:JSON.stringify({contentHash,payload,...(sourceBinding?{sourceBinding,expectedDocumentVersion:state.editing.version}:{})})});
      else await request('/documents',{method:'POST',body:JSON.stringify({organizationId:c.orgId,templateId:template.id,department:template.department,contentHash,payload,...(sourceBinding?{sourceBinding}:{})})});
      if(!current(c))return;await loadOrganization(c.orgId);
      if(c.orgId===state.orgId&&c.session===session())note((editingId ? uiLocale.message('تم حفظ التعديل والإصدار الجديد.') : uiLocale.message('تم حفظ المستند كمسودة.')));
    }catch(error){if(current(c))note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر حفظ المستند')));}
    finally{if(current(c))save.disabled=!activeTemplate()||!canWrite();}
  });

  const supportsHrAttendance=t=>t?.department==='HR'&&['HR-ATTENDANCE-SUMMARY','HR-LEAVE-RETURN'].includes(t.code);
  let attendanceLoad=null,attendanceDispose=null,attendanceGeneration=0;
  function clearSavedHrSources(){for(const old of panel.querySelectorAll('[data-doc-hr-source-result],[data-doc-attendance-saved-result]')){old.replaceChildren();old.hidden=true;}}
  function loadHrAttendance(){
    if(window.HydrolandHrAttendance)return Promise.resolve();
    if(!attendanceLoad)attendanceLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./hydroland-hr-attendance.js';script.onload=()=>{if(window.HydrolandHrAttendance)resolve();else{attendanceLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل فحص الحضور')));}};script.onerror=()=>{attendanceLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل فحص الحضور')));};document.body.appendChild(script);});return attendanceLoad;
  }
  function resetAttendanceCheck(){
    const ticket=++attendanceGeneration;attendanceDispose?.();attendanceDispose=null;
    const box=panel.querySelector('[data-doc-attendance-check]'),t=activeTemplate(),c=context();box.replaceChildren();box.hidden=!state.inventory?.internalPlatform||!supportsHrAttendance(t);if(box.hidden)return;
    const valid=()=>current(c)&&ticket===attendanceGeneration&&!panel.hidden&&activeTemplate()?.id===t.id;
    loadHrAttendance().then(()=>{if(valid())attendanceDispose=window.HydrolandHrAttendance.mount({host:box,form:panel.querySelector('[data-doc-form]'),request,organizationId:c.orgId,template:t,valid,onDenied:()=>{clearSourcePreview();resetSourcePicker();clearSavedHrSources();}});}).catch(e=>{if(valid())uiLocale.setMessage(box, localErrorMessage(e));});
  }
  const attendanceTickets=new WeakMap();
  async function inspectHrAttendance(d,article,c){
    const box=article.querySelector('[data-doc-attendance-saved-result]'),ticket={};attendanceTickets.set(article,ticket);
    const valid=()=>current(c)&&!panel.hidden&&article.isConnected&&attendanceTickets.get(article)===ticket&&state.documents.some(x=>x.id===d.id&&x.version===d.version);
    box.hidden=false;uiLocale.setMessage(box, uiLocale.message('جارٍ فحص مراجع النسخة المحفوظة…'));
    try{await loadHrAttendance();if(!valid())return;const r=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/documents/${encodeURIComponent(d.id)}/hr-attendance?version=${d.version}`,{cache:'no-store'});if(!valid())return;
      uiLocale.setHTML(box, window.HydrolandHrAttendance.format(r,{organizationId:c.orgId,templateId:d.templateId,templateVersion:d.template.version,templateCode:d.template.code,kind:'SAVED_DOCUMENT_REFERENCE_CHECK',documentId:d.id,documentVersion:d.version,input:d.payload}));
    }catch(e){if(valid()){if([401,403].includes(e?.status)){resetAttendanceCheck();resetSourcePicker();clearSourcePreview();clearSavedHrSources();}box.hidden=false;uiLocale.setMessage(box, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذر فحص السجلات.')));}}
  }
  const supportsHrSource=t=>t?.department==='HR'&&['HR-APPOINTMENT-RECORD','HR-COMMENCEMENT'].includes(t.code);
  function clearSourcePreview(){
    sourceCheckGeneration++;const b=panel.querySelector('[data-doc-hr-source-preview]'),box=panel.querySelector('[data-doc-hr-source-preview-result]');box.replaceChildren();box.hidden=true;
    b.hidden=!state.inventory?.internalPlatform||!supportsHrSource(activeTemplate());b.disabled=state.loading;
  }
  let hrSourceLoad=null;
  function loadHrSource(){
    if(window.HydrolandHrSource)return Promise.resolve();
    if(!hrSourceLoad)hrSourceLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./hydroland-hr-source.js';script.onload=()=>{if(window.HydrolandHrSource)resolve();else{hrSourceLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل فحص السجل')));}};script.onerror=()=>{hrSourceLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل فحص السجل')));};document.body.appendChild(script);});return hrSourceLoad;
  }
  function resetSourcePicker(){sourceCandidatesGeneration++;sourceCandidates=[];sourceCandidatesCursor=null;const box=panel.querySelector('[data-doc-hr-source-picker]');box.hidden=!state.inventory?.internalPlatform||!supportsHrSource(activeTemplate());uiLocale.setHTML(panel.querySelector('[data-doc-hr-source-select]'), uiLocale.html`<option value="">اختر طلبًا محفوظًا</option>`);uiLocale.setMessage(panel.querySelector('[data-doc-hr-source-picker-status]'), '');panel.querySelector('[data-doc-hr-source-more]').hidden=true;panel.querySelector('[data-doc-hr-source-load]').disabled=false;}
  async function loadSourceCandidates(append=false){
    const c=context(),t=activeTemplate(),ticket=++sourceCandidatesGeneration,box=panel.querySelector('[data-doc-hr-source-picker-status]'),b=panel.querySelector(append?'[data-doc-hr-source-more]':'[data-doc-hr-source-load]');if(!current(c)||!state.inventory?.internalPlatform||!supportsHrSource(t)||state.loading)return;
    const valid=()=>current(c)&&ticket===sourceCandidatesGeneration&&!panel.hidden&&activeTemplate()?.id===t.id;
    b.disabled=true;uiLocale.setMessage(box, uiLocale.message('جارٍ قراءة طلبات التعيين…'));
    try{await loadHrSource();if(!valid())return;const suffix=append&&sourceCandidatesCursor?`?cursor=${encodeURIComponent(sourceCandidatesCursor)}`:'';const r=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/hr-source-candidates${suffix}`,{cache:'no-store'});if(!valid())return;window.HydrolandHrSource.validateCandidates(r,c.orgId);
      sourceCandidates=append?[...sourceCandidates,...r.items]:r.items;sourceCandidatesCursor=r.nextCursor;const select=panel.querySelector('[data-doc-hr-source-select]'),chosen=select.value;uiLocale.setHTML(select, uiLocale.html`<option value="">اختر طلبًا محفوظًا</option>${sourceCandidates.map(x=>uiLocale.html`<option value="${esc(x.appointmentId)}">${esc(x.name)} · ${esc(x.positionTitle||x.departmentName)} · ${uiLocale.messageHTML(window.HydrolandHrSource.stateMessage(x.appointmentStatus))}</option>`).join('')}`);if(sourceCandidates.some(x=>x.appointmentId===chosen))select.value=chosen;
      panel.querySelector('[data-doc-hr-source-more]').hidden=!r.hasMore;uiLocale.setMessage(box, (sourceCandidates.length ? uiLocale.message("{0} طلبًا معروضًا{1}. اختيار الطلب يملأ مرجعي الموظف والتعيين.", [sourceCandidates.length, (r.hasMore ? uiLocale.message('؛ تتوفر طلبات أقدم') : '')]) : uiLocale.message('لا توجد طلبات تعيين محفوظة في هذه الجهة.')));
    }catch(e){if(valid()){resetSourcePicker();clearSourcePreview();if([401,403].includes(e?.status)){resetAttendanceCheck();clearSavedHrSources();}uiLocale.setMessage(box, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذرت قراءة الطلبات.')));}}finally{if(valid())b.disabled=false;}
  }
  panel.querySelector('[data-doc-hr-source-load]').addEventListener('click',()=>loadSourceCandidates());panel.querySelector('[data-doc-hr-source-more]').addEventListener('click',()=>loadSourceCandidates(true));
  panel.querySelector('[data-doc-hr-source-select]').addEventListener('change',e=>{const item=sourceCandidates.find(x=>x.appointmentId===e.target.value),t=activeTemplate();if(!item||!supportsHrSource(t)||state.loading)return;panel.querySelector('[name="employeeReference"]').value=item.employmentId;panel.querySelector(`[name="${t.code==='HR-APPOINTMENT-RECORD'?'movementReference':'appointmentReference'}"]`).value=item.appointmentId;clearSourcePreview();});
  panel.querySelector('[data-doc-form]').addEventListener('input',e=>{if(['employeeReference','movementReference','appointmentReference'].includes(e.target.name))panel.querySelector('[data-doc-hr-source-select]').value='';clearSourcePreview();});
  panel.querySelector('[data-doc-hr-source-preview]').addEventListener('click',async()=>{
    const c=context(),t=activeTemplate(),ticket=++sourceCheckGeneration,box=panel.querySelector('[data-doc-hr-source-preview-result]'),b=panel.querySelector('[data-doc-hr-source-preview]');
    if(!current(c)||state.loading||!state.inventory?.internalPlatform||!supportsHrSource(t))return;
    const values=new FormData(panel.querySelector('[data-doc-form]')),key=t.code==='HR-APPOINTMENT-RECORD'?'movementReference':'appointmentReference',employee=String(values.get('employeeReference')||'').trim(),appointment=String(values.get(key)||'').trim();
    const valid=()=>current(c)&&ticket===sourceCheckGeneration&&!panel.hidden&&activeTemplate()?.id===t.id;
    b.disabled=true;box.hidden=false;uiLocale.setMessage(box, uiLocale.message('جارٍ قراءة سجل الموظف وطلب التعيين…'));
    try{await loadHrSource();if(!valid())return;const r=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/hr-source-preview`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({templateId:t.id,expectedTemplateVersion:t.version,employeeReference:employee,[key]:appointment})});if(!valid())return;
      uiLocale.setHTML(box, window.HydrolandHrSource.format(r,{organizationId:c.orgId,templateId:t.id,templateVersion:t.version,templateCode:t.code,kind:'UNSAVED_REFERENCE_PREVIEW',documentId:null,documentVersion:null,employeeReference:employee,appointmentReference:appointment}));
    }catch(e){if(valid()){if([401,403].includes(e?.status)){resetSourcePicker();clearSourcePreview();resetAttendanceCheck();clearSavedHrSources();}box.hidden=false;uiLocale.setMessage(box, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذر قراءة السجل.')));}}finally{if(valid())b.disabled=false;}
  });
  async function inspectHrSource(d,article,c){
    const box=article.querySelector('[data-doc-hr-source-result]'),valid=()=>current(c)&&!panel.hidden&&article.isConnected&&state.documents.some(x=>x.id===d.id&&x.version===d.version);
    box.hidden=false;uiLocale.setMessage(box, uiLocale.message('جارٍ التحقق من مراجع النسخة المحفوظة…'));
    try{await loadHrSource();if(!valid())return;const r=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/documents/${encodeURIComponent(d.id)}/hr-source?version=${d.version}`,{cache:'no-store'});if(!valid())return;
      const key=d.template.code==='HR-APPOINTMENT-RECORD'?'movementReference':'appointmentReference';uiLocale.setHTML(box, window.HydrolandHrSource.format(r,{organizationId:c.orgId,templateId:d.templateId,templateVersion:d.template.version,templateCode:d.template.code,kind:'SAVED_DOCUMENT_REFERENCE_CHECK',documentId:d.id,documentVersion:d.version,employeeReference:String(d.payload?.employeeReference||'').trim(),appointmentReference:String(d.payload?.[key]||'').trim()}));
    }catch(e){if(valid()){if([401,403].includes(e?.status)){resetSourcePicker();clearSourcePreview();resetAttendanceCheck();clearSavedHrSources();}box.hidden=false;uiLocale.setMessage(box, (e instanceof Error ? localErrorMessage(e) : uiLocale.message('تعذر قراءة السجل.')));}}
  }
  async function loadOwnerApprovals(){
    const c=context();state.ownerApprovals={};uiLocale.setMessage(panel.querySelector('[data-doc-owner-approval-status]'), uiLocale.message('جارٍ قراءة سجل الاعتماد الإداري…'));
    try{const r=await request(`/documents/organizations/${encodeURIComponent(c.orgId)}/owner-approvals`);if(!current(c))return;
      if(!r||r.schemaVersion!==1||r.organizationId!==c.orgId||r.policy!=='OWNER_ADMINISTRATIVE_APPROVAL_V1'||!Array.isArray(r.approvals)||r.approvals.some(a=>!a||typeof a.documentId!=='string'||!Number.isSafeInteger(a.sourceVersion)||a.status!=='ADMINISTRATIVELY_APPROVED'))throw localError(uiLocale.message('تعذر التحقق من سجل الاعتماد الإداري.'));
      state.ownerApprovals=Object.fromEntries(r.approvals.map(a=>[a.documentId,a]));renderDocuments();uiLocale.setMessage(panel.querySelector('[data-doc-owner-approval-status]'), uiLocale.message("{0} نسخة معتمدة إداريًا من المالك. المراجعة المستقلة والتوقيع يُعرضان في حالة المصدر.", [r.approvals.length]));
    }catch(e){if(current(c)){state.ownerApprovals={};renderDocuments();uiLocale.setMessage(panel.querySelector('[data-doc-owner-approval-status]'), uiLocale.message('تعذرت قراءة الاعتمادات الإدارية؛ افتح سجل النسخة للتحقق من حالتها.'));}}
  }
  let ownerApprovalLoad=null;
  function loadOwnerApproval(){
    if(window.HydrolandOwnerApproval)return Promise.resolve();
    if(!ownerApprovalLoad)ownerApprovalLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./hydroland-owner-approval.js';script.onload=()=>{if(window.HydrolandOwnerApproval)resolve();else{ownerApprovalLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل اعتماد المالك')));}};script.onerror=()=>{ownerApprovalLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل اعتماد المالك')));};document.body.appendChild(script);});
    return ownerApprovalLoad;
  }
  document.addEventListener('hydroland:owner-approval-recorded',e=>{if(e.detail?.organizationId===state.orgId&&!panel.hidden){if(e.detail.reopened)void loadOrganization(state.orgId);else void loadOwnerApprovals();}});
  let ownerDecisionLoad=null;
  function loadOwnerDecision(){
    if(window.HydrolandOwnerDecision)return Promise.resolve();
    if(!ownerDecisionLoad)ownerDecisionLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./hydroland-owner-decision.js';script.onload=()=>{if(window.HydrolandOwnerDecision)resolve();else{ownerDecisionLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل مسار قرار المالك')));}};script.onerror=()=>{ownerDecisionLoad=null;script.remove();reject(localError(uiLocale.message('تعذر تحميل مسار قرار المالك')));};document.body.appendChild(script);});
    return ownerDecisionLoad;
  }
  const workflowReasons={USE_ASSIGNED_REVIEW_WORKFLOW:'هذا الإجراء الداخلي من مسار التكليف المحدد، وبحساب الشخص المكلّف فقط.',OWNER_IS_CREATOR:'المالك هو منشئ المستند؛ لا يمكنه اعتماد مستنده أو توقيعه بصفته شخصًا مستقلًا.',OWNER_WOULD_APPROVE_AND_SIGN:'الوصول محصور بالمالك؛ ولا يمكن للمعتمد نفسه أن يكون الموقّع المستقل.',OWNER_IS_APPROVER:'المالك هو معتمد المستند؛ التوقيع يتطلب شخصًا مستقلًا مخوّلًا.',APPROVAL_EVIDENCE_MISSING:'بيانات المعتمد غير مكتملة؛ يلزم فحص سجل المستند دون اصطناع اعتماد.'};
  const workflowAssessments={SCOPED_REVIEW_ASSIGNED:'يوجد تكليف فعّال لهذه النسخة؛ يتابع المراجع والموقّع من حسابيهما في صندوق المراجعات',BLOCKED:'المسار متعثر بالضوابط الحالية',ARCHIVED_READ_ONLY:'المستند مؤرشف — قراءة فقط',SIGNED_ARCHIVE_REMAINS:'المستند موقّع — الأرشفة إجراء منفصل',ACTOR_CHECK_ONLY:'فحص صلاحية المستخدم الحالي فقط — ليس تأكيدًا لاكتمال مسار الاعتماد'};
  async function inspectWorkflow(d,article,c){
    const box=article.querySelector('[data-doc-readiness]');
    const valid=()=>current(c)&&!panel.hidden&&article.isConnected&&state.documents.some(x=>x.id===d.id&&x.version===d.version&&x.status===d.status);
    box.hidden=false;uiLocale.setMessage(box, uiLocale.message('جارٍ فحص مسار الاعتماد دون تغيير المستند…'));
    try{
      const path=`/documents/organizations/${encodeURIComponent(c.orgId)}/documents/${encodeURIComponent(d.id)}/workflow-readiness`;
      const response=await window.HydrolandAuth.authorizedFetch(path,{cache:'no-store'});
      const r=await response.json().catch(()=>null);if(!valid())return;
      if([401,403].includes(response.status)){clear();return;}
      if(!response.ok)throw localError(uiLocale.message('تعذر فحص المسار. لم يُغيّر المستند.'));
      const actions=['edit','submit','approve','sign','archive'];
      if(!r||r.schemaVersion!==1||r.organizationId!==c.orgId||r.documentId!==d.id||r.documentVersion!==d.version||r.status!==d.status||r.observationOnly!==true||!Object.hasOwn(workflowAssessments,r.assessment)||!['INTERNAL_OWNER_ONLY','ORGANIZATION_MEMBERSHIP'].includes(r.scope)||typeof r.policyDecisionRequired!=='boolean'||!r.actorActions||actions.some(a=>typeof r.actorActions[a]!=='boolean')||!Array.isArray(r.blockers)||r.blockers.length>4||r.blockers.some(b=>!b||!['APPROVE','SIGN'].includes(b.step)||!Object.hasOwn(workflowReasons,b.reason)))throw localError(uiLocale.message('تغيّر المستند أو لم يُتحقق من نطاق النتيجة؛ حدّث القائمة وأعد الفحص.'));
      const explanation=r.blockers.map(b=>`${b.step==='APPROVE'?uiLocale.t('الاعتماد'):uiLocale.t('التوقيع')}: ${workflowReasons[b.reason]}`).join(' ');
      // Text-only; the snapshot never enables a button or replaces live server authorization.
      uiLocale.setMessage(box, uiLocale.message("{0}. {1} {2} هذا فحص للقراءة فقط وليس اعتمادًا أو توقيعًا.", [(value=>value===undefined?value:uiLocale.message(value))(workflowAssessments[r.assessment]), explanation, (r.policyDecisionRequired ? uiLocale.message('يلزم تكليف مراجع وموقّع مستقلين لهذه النسخة من إدارة تكليف المراجعة؛ هذا الفحص لا يمنح صلاحية.') : '')]));
    }catch(error){if(valid())uiLocale.setMessage(box, (error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر فحص المسار؛ لم يُغيّر المستند.')));}
  }
  panel.querySelector('[data-doc-list]').onchange=async event=>{
    const input=event.target.closest('input[data-doc-attachment-upload]');if(!input)return;
    const file=input.files?.[0],article=input.closest('[data-document-id]'),id=article?.dataset.documentId,d=state.documents.find(x=>x.id===id),status=article?.querySelector('[data-doc-attachment-status]');
    if(!file||!d)return;
    input.disabled=true;if(status)uiLocale.setMessage(status, uiLocale.message('جارٍ رفع ملف PDF والتحقق منه…'));
    const c=context();
    try{
      if((file.type&&file.type!=='application/pdf')||!file.name.toLowerCase().endsWith('.pdf'))throw localError(uiLocale.message('اختر ملف PDF فقط.'));
      if(file.size<1||file.size>10_000_000)throw localError(uiLocale.message('حجم ملف PDF يجب ألا يتجاوز 10 ميغابايت.'));
      const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)));
      await request('/documents/'+encodeURIComponent(id)+'/attachments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,mimeType:'application/pdf',base64:btoa(binary)})});
      if(!current(c))return;await loadOrganization(c.orgId);const latest=context();if(current(latest))note(uiLocale.message('تم إرفاق ملف PDF بالمستند.'));
    }catch(error){if(current(c)&&status)uiLocale.setMessage(status, (error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر رفع ملف PDF.')));}
    finally{input.disabled=false;input.value='';}
  };
  panel.querySelector('[data-doc-list]')?.addEventListener('click',async event=>{
    const attachmentButton=event.target.closest('button[data-doc-attachment-download]');
    if(attachmentButton){
      const article=attachmentButton.closest('[data-document-id]'),id=article?.dataset.documentId,attachmentId=attachmentButton.dataset.docAttachmentDownload,c=context();if(!id||!attachmentId)return;
      attachmentButton.disabled=true;
      try{const response=await window.HydrolandAuth.authorizedFetch('/documents/'+encodeURIComponent(id)+'/attachments/'+encodeURIComponent(attachmentId));if(!response.ok)throw localError(uiLocale.message('تعذر تنزيل ملف PDF.'));const blob=await response.blob();if(!current(c))return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=attachmentButton.textContent.split(' · PDF')[0]||'attachment.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      catch(error){if(current(c))note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تنزيل ملف PDF.')));}
      finally{attachmentButton.disabled=false;}
      return;
    }
    const button=event.target.closest('button[data-doc-action]');if(!button||button.disabled||state.loading)return;
    const article=button.closest('[data-document-id]'),id=article?.dataset.documentId,d=state.documents.find(x=>x.id===id);if(!d)return;
    const action=button.dataset.docAction,c=context();button.disabled=true;
    try{
      if(action==='executive-decision'){if(!window.HydrolandExecutiveDecisions)throw localError(uiLocale.message('حدّث الصفحة لتحميل مسار القرار التنفيذي.'));await window.HydrolandExecutiveDecisions.openOwner({organizationId:c.orgId,documentId:d.id});return;}
      if(action==='review-assignment'){if(!window.HydrolandDocumentReviews)throw localError(uiLocale.message('حدّث الصفحة لتحميل مسار المراجعة المستقلة.'));await window.HydrolandDocumentReviews.openOwner({organizationId:c.orgId,documentId:d.id});return;}
      if(action==='owner-approval'){await loadOwnerApproval();if(current(c)&&!panel.hidden&&state.inventory?.internalPlatform)window.HydrolandOwnerApproval.open({organizationId:c.orgId,documentId:d.id});return;}
      if(action==='owner-decision'){await loadOwnerDecision();if(current(c)&&!panel.hidden)window.HydrolandOwnerDecision.open({organizationId:c.orgId,documentId:d.id});return;}
      if(action==='attendance-source'){await inspectHrAttendance(d,article,c);return;}if(action==='hr-source'){await inspectHrSource(d,article,c);return;}
      if(action==='readiness'){await inspectWorkflow(d,article,c);return;}
      if(!['edit','pdf','submit','approve','sign','archive'].includes(action))return;
      if(action==='edit'){state.editing=d;const select=panel.querySelector('[data-doc-template]');select.value=d.templateId;select.disabled=true;uiLocale.setMessage(panel.querySelector('[data-doc-form-title]'), uiLocale.message('تعديل المسودة'));panel.querySelector('[data-doc-cancel]').hidden=false;renderFields(d.payload||{});panel.querySelector('[data-doc-form]').scrollIntoView({behavior:documentScrollBehavior(),block:'center'});return;}
      if(action==='pdf'){const response=await window.HydrolandAuth.authorizedFetch(`/documents/${encodeURIComponent(id)}/${state.inventory?.internalPlatform&&!['SIGNED','ARCHIVED'].includes(d.status)?'identity-pdf':'pdf'}`);if(!response.ok)throw new Error(`HTTP ${response.status}`);const blob=await response.blob();if(!current(c))return;const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);return;}
      await request(`/documents/${encodeURIComponent(id)}/${action}`,{method:'POST'});if(!current(c))return;await loadOrganization(c.orgId);
      if(c.orgId===state.orgId&&c.session===session())note((action==='submit' ? uiLocale.message('تم إرسال المستند للاعتماد.') : (action==='approve' ? uiLocale.message('تم اعتماد المستند.') : (action==='sign' ? uiLocale.message('تم توقيع المستند.') : uiLocale.message('تمت أرشفة المستند.')))));
    }catch(error){if(current(c))note((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تنفيذ الإجراء')));}
    finally{button.disabled=false;}
  });
  const connectDocumentButtons=root=>{root.querySelectorAll?.('button').forEach(button=>{const label=button.dataset.actionLabel||button.dataset.secondaryLabel||button.dataset.portalLabel||(button.textContent||'').trim();if(!['العقود الإلكترونية','رفع الوثائق','التوقيع الإلكتروني','طلب اعتماد الإدارة','متابعة الحالة'].includes(label)||button.dataset.hlDocumentsConnected)return;button.dataset.hlDocumentsConnected='1';button.disabled=false;button.removeAttribute('aria-disabled');button.title='';button.addEventListener('click',()=>{panel.hidden=false;refresh();panel.scrollIntoView({behavior:documentScrollBehavior(),block:'start'})})})};
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)connectDocumentButtons(node)})));observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('hydroland:role-changed',event=>{if(event.detail?.role==='organization'){panel.hidden=false;refresh()}else panel.hidden=true});
  document.addEventListener('hydroland:role-changed',()=>{if(panel.hidden)resetPlatformSource();});
  const clear=()=>{state.generation++;state.orgId=null;state.memberships=[];state.department='';state.typeCode='';state.loading=false;clearData();panel.querySelector('[data-doc-org]').replaceChildren();note('');panel.hidden=true;};
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())clear();else if(!panel.hidden)refresh();});
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
  window.HydrolandDocuments={open:(options={})=>{
    if(!window.HydrolandAuth?.isAuthenticated?.())return;
    state.department=options.department||'';state.typeCode='';state.preferInternal=options.internal===true||window.HydrolandPortalAccess?.getCurrentRole?.()==='admin';
    panel.hidden=false;refresh(options.organizationId);
    if(options.organizationId)panel.querySelector('[data-doc-org]').focus();
  },refresh};
})();


