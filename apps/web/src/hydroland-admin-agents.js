(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("admin-agents", {
  "دليل رصيد مستودع": "Warehouse balance evidence",
  "دليل استلام أو صرف مخزون": "Stock receipt or issue evidence",
  "دليل مشتريات": "Procurement evidence",
  "دليل تسليم سجل": "Record handover evidence",
  "قرار احتفاظ أو مانع إتلاف": "Retention decision or destruction hold",
  "دليل إتلاف سابق مأذون": "Evidence of previously authorized destruction",
  "دليل نشر حملة": "Campaign publication evidence",
  "دليل تحليلات حملة": "Campaign analytics evidence",
  "مسودة": "Draft",
  "موثق في السجل": "Documented in the register",
  "مؤرشف": "Archived",
  "السلعة": "Item",
  "موقع المستودع": "Warehouse location",
  "الكمية المرصودة": "Observed quantity",
  "نوع الحركة": "Movement type",
  "استلام": "Receipt",
  "صرف": "Issue",
  "الكمية": "Quantity",
  "مرجع المشتريات": "Procurement reference",
  "السجل الإداري": "Administrative record",
  "مرجع الجهة المستلمة": "Receiving organization reference",
  "نهاية مدة الاحتفاظ بتوقيت جهازك": "Retention end in your device's time zone",
  "هل يوجد مانع إتلاف؟": "Is destruction on hold?",
  "نعم": "Yes",
  "لا": "No",
  "مرجع سياسة الاحتفاظ": "Retention policy reference",
  "قرار الاحتفاظ المسجل للواقعة": "Recorded retention decision for this event",
  "مستند إذن الإتلاف": "Destruction authorization document",
  "مسودة الحملة": "Campaign draft",
  "قناة النشر": "Publication channel",
  "التطبيق": "App",
  "الموقع": "Website",
  "البريد": "Email",
  "رسائل نصية": "Text messages",
  "واتساب": "WhatsApp",
  "شبكات التواصل": "Social media",
  "إعلانات مدفوعة": "Paid advertising",
  "مرجع أو رابط النشر": "Publication reference or URL",
  "دليل النشر الموثق": "Documented publication evidence",
  "بداية فترة القياس بتوقيت جهازك": "Measurement period starts in your device's time zone",
  "نهاية فترة القياس بتوقيت جهازك": "Measurement period ends in your device's time zone",
  "مرات الظهور": "Impressions",
  "النقرات": "Clicks",
  "التحويلات": "Conversions",
  "الأدلة المسجلة": "Recorded evidence",
  "سجل أدلة الوقائع الداخلية": "Internal event evidence register",
  "للمالك: دوّن الوقائع الفعلية واربطها بمستنداتها. المسودة لا تدخل في مؤشرات الأدلة الموثقة. تسجيل دليل لا ينفذ صرفًا أو حركة مخزون أو نشرًا أو إتلافًا، ولا يمنح قبول تشغيل.": "For the owner: record actual events and link their documents. Drafts do not contribute to documented-evidence metrics. Recording evidence does not issue funds, move stock, publish content or destroy records, and does not grant operational acceptance.",
  "تحديث سجل الأدلة": "Refresh evidence register",
  "مسودة دليل جديد": "New evidence draft",
  "نوع الدليل": "Evidence type",
  "مرجع الواقعة": "Event reference",
  "وقت الواقعة بتوقيت جهازك": "Event time in your device's time zone",
  "حفظ مسودة الدليل": "Save evidence draft",
  "مسودة جديدة": "New draft",
  "أدلة أقدم": "Older evidence",
  "تغيرت الجلسة.": "The session has changed.",
  "تعذر إكمال الإجراء.": "Could not complete the action.",
  "تعذر حفظ الدليل؛ حدّث السجل وراجع المراجع.": "Could not save the evidence. Refresh the register and review the references.",
  "بحث": "Search",
  "المزيد من المراجع": "More references",
  "اختر المرجع السابق أولًا": "Select the preceding reference first",
  "اختر مرجعًا محفوظًا": "Select a saved reference",
  "استجابة المراجع غير مكتملة.": "The reference response is incomplete.",
  "مرجع غير صالح.": "Invalid reference.",
  "لا توجد مراجع مطابقة؛ أنشئ السجل أو المستند في مساره أولًا.": "No matching references. Create the record or document through its workflow first.",
  "مستند الإثبات وإصداره": "Evidence document and version",
  "اختر": "Select",
  "تعذر تأكيد سجل الدليل.": "Could not confirm the evidence record.",
  "· الإصدار": "· Version",
  "الإثبات:": "Evidence:",
  "مستند مرتبط": "Linked document",
  "· نسخة": "· Revision",
  "غير متاح": "Unavailable",
  "سبب الإجراء": "Reason for the action",
  "راجعت الواقعة ومراجعها؛ هذا تسجيل دليل ولا ينفذ إجراء أعمال": "I have reviewed the event and its references. This records evidence and does not execute a business action",
  "توثيق الواقعة في السجل": "Document the event in the register",
  "أرشفة الدليل": "Archive evidence",
  "سُجل الدليل؛ تُحتسب المؤشرات عند صلاحية مستنداته ومراجعه.": "Evidence recorded. Metrics count only when its documents and references are valid.",
  "أُرشف الدليل مع حفظ تاريخه.": "Evidence archived with its history retained.",
  "استجابة سجل الأدلة غير مكتملة.": "The evidence-register response is incomplete.",
  "لا توجد أدلة مسجلة بعد. قبل التشغيل لا تُنشأ وقائع أو أرصدة افتراضية.": "No evidence has been recorded. No hypothetical events or balances are created before operations begin.",
  "عنصر دليل غير صالح.": "Invalid evidence item.",
  "تم تحميل السجل من الجهة الداخلية.": "Register loaded from the internal organization.",
  "حُفظت مسودة الدليل. راجع مستندها ثم وثّق الواقعة عند توفر الاعتماد المطلوب.": "Evidence draft saved. Review its document, then record the event when the required approval is available.",
  "صفحات ملفات المراجعة": "Review file pages",
  "الوكيل": "Agent",
  "نوع مهمة الوكيل": "Agent task type",
  "لغة المهمة": "Task language",
  "صفحات مهام الوكيل": "Agent task pages",
  "وكلاء الذكاء الاصطناعي · التشغيل وضغط المهام": "AI agents · Operations and workload",
  "إدارة الوكلاء": "Agent management",
  "الإيقاف يمنع بدء مهام جديدة. الجارية تكمل عملها، والمنتظرة تبقى محفوظة للاستئناف. الرفض المؤقت من المزود يؤجّل بمحاولات محدودة؛ النتائج المكتملة والطلبات غير المؤكدة لا تعاد.": "Pausing prevents new tasks from starting. Running tasks finish, and queued tasks remain for resumption. Temporary provider rejection defers work with limited retries; completed results and unconfirmed requests are not repeated.",
  "تحديث الوكلاء": "Refresh agents",
  "ضغط مرتفع: ثلاث مهام منتظرة أو أكثر، أو انتظار تجاوز 15 دقيقة، أو تعثر غير مراجع. غير ذلك: مشغول عند وجود عمل، ومتاح عند خلو العمل بقياس حديث. القياسات القديمة بعد 90 ثانية تُعرض كغير متاحة. حالة التشغيل مستقلة عن الضغط.": "High workload means at least three queued tasks, a wait over 15 minutes or an unreviewed failure. Otherwise, agents are busy when work exists and available when a fresh measurement shows no work. Measurements older than 90 seconds are unavailable. Operational status is separate from workload.",
  "سبب تهيئة الوكلاء": "Reason for agent setup",
  "راجعت إنشاء سجلات الوكلاء في وضع الإيقاف، دون منح أدوار أو تشغيل مدفوع": "I have reviewed creation of paused agent records, without granting roles or starting paid work",
  "تهيئة سجلات الوكلاء": "Set up agent records",
  "مكتب الحوكمة والجودة: جودة ← مراجعة فنية ← أمن ومخاطر ← امتثال ← تحقق واختبارات ← توصية نهائية للمالك. المراجعات مرتبطة بالمخرج الأصلي؛ نقص الأدلة أو طلب التصحيح يوقف الانتقال. الاعتماد النهائي للمالك.": "Governance and quality office: quality → technical review → security and risk → compliance → verification and testing → final recommendation to the owner. Reviews remain linked to the original output. Missing evidence or requested corrections stop progression. The owner gives final approval.",
  "ملفات مراجعات مكتب الحوكمة": "Governance office review files",
  "ملخص المصدر والمراجعات الست والملاحظات والتكلفة المسجلة. جاهزية التوصية تسبق قرار المالك والاعتمادات المختصة.": "Source summary, six reviews, findings and recorded cost. Recommendation readiness precedes the owner's decision and specialist approvals.",
  "تحديث ملفات المراجعة": "Refresh review files",
  "ملفات أحدث": "Newer files",
  "ملفات أقدم": "Older files",
  "مهام الوكيل": "Agent tasks",
  "العربية السعودية": "Saudi Arabic",
  "نص مهمة الوكيل": "Agent task text",
  "أدخل موجزًا مناسبًا للمزود، دون كلمات مرور أو معلومات شخصية حساسة. قراءة العمليات ترسل مؤشرات مجمعة فقط. المسودات لا ترسل رسائل ولا تنفذ تغييرات أعمال.": "Enter a brief suitable for the provider, without passwords or sensitive personal information. Operational reads send aggregated metrics only. Drafts do not send messages or execute business changes.",
  "سبب تكليف الوكيل": "Reason for assigning the agent",
  "أسمح بمحاولة تصحيح نصي واحدة لهذه المسودة ومراجعتها عبر OpenAI ضمن السقف اليومي، مع حفظ الأصل": "I allow one text correction attempt and OpenAI review for this draft within the daily cap, retaining the original",
  "راجعت النص وحدود الوكيل وأوافق على إرسال نص المهمة إلى OpenAI عند تشغيلها": "I have reviewed the text and agent limits and agree to send the task text to OpenAI when it runs",
  "إضافة مهمة إلى الانتظار": "Add task to queue",
  "مهام أحدث": "Newer tasks",
  "مهام أقدم": "Older tasks",
  "تعيين رؤساء الأقسام": "Appoint section heads",
  "لكل قسم رئيس يتبع مدير إدارته. يستمر عبدالله في تجميع التقارير إلى جانب رئاسة السكرتارية. التعيين يحفظ الأدوار والتبعية؛ تكليف المهام يتم من مساره المعتاد.": "Each section head reports to the department director. Abdullah continues consolidating reports alongside leading the secretariat. Appointment saves roles and reporting lines; tasks are assigned through the usual workflow.",
  "سبب التعيين": "Reason for appointment",
  "تفعيل الرؤساء الجدد ضمن جاهزية المزود وحد التكلفة الحالي": "Activate new section heads within current provider readiness and cost limits",
  "راجعت رؤساء الأقسام وتبعيتهم؛ يبقى الاعتماد النهائي لدى صاحب الصلاحية": "I have reviewed section heads and reporting lines. Final approval remains with the authorized decision-maker",
  "عرض إدارة": "View department",
  "تصفية الوكلاء حسب الإدارة": "Filter agents by department",
  "فحص الاتصال دون توليد": "Check connection without generation",
  "فحص مصادر الإدارات دون توليد": "Check department sources without generation",
  "مصادر بيانات المديرين": "Department directors' data sources",
  "استكمال الوقائع والتحقق المستقل من أدلة أرصدة المستودعات والحركات والمشتريات": "Complete event records and independently verify warehouse balance, movement and procurement evidence",
  "ربط أرصدة المستودعات وحركات المخزون والمشتريات والموردين": "Link warehouse balances, stock movements, procurement and suppliers",
  "التحقق الرسمي من بيانات العمل والأهلية": "Official verification of employment data and eligibility",
  "التحقق من جهة التدريب وإصدار الشهادة": "Verify the training body and certificate issuance",
  "أدلة تصريح الرحلة وتنفيذها والعودة": "Trip authorization, execution and return evidence",
  "ربط سجل المستودعات والمشتريات والموردين": "Link warehouse, procurement and supplier registers",
  "أدلة المطابقة المالية وإقفال الفترة": "Financial reconciliation and period-close evidence",
  "أدلة المخاطر والتحقق من فاعلية الإجراءات التصحيحية": "Risk evidence and corrective-action effectiveness verification",
  "دليل تحقق نتيجة معالجة العميل": "Evidence verifying the customer case outcome",
  "ربط النشر الفعلي وتحليلات الحملات": "Link actual publication and campaign analytics",
  "أدلة الحوادث التقنية واختبارات التعافي": "Technical incident and recovery-test evidence",
  "ربط سجل الأصول الموحد وأوامر الصيانة": "Link the unified asset register and maintenance orders",
  "أدلة التسليم والاحتفاظ والإتلاف": "Handover, retention and destruction evidence",
  "أدلة تنفيذ القرارات التنفيذية": "Executive decision execution evidence",
  "أدلة التجربة والسوق والنتائج": "Experiment, market and outcome evidence",
  "ربط العقود التجارية والتأمين والمطالبات": "Link commercial contracts, insurance and claims",
  "أنواع القوالب المسجلة": "Registered template types",
  "أنواع القوالب النشطة": "Active template types",
  "تعارضات القوالب": "Template conflicts",
  "المستندات المسجلة بجميع حالاتها": "Registered documents in all statuses",
  "مسودات": "Drafts",
  "بانتظار الاعتماد": "Awaiting approval",
  "مستندات معتمدة": "Approved documents",
  "مستندات موقعة": "Signed documents",
  "مستندات مؤرشفة": "Archived documents",
  "روابط مستندات غير متسقة": "Inconsistent document links",
  "ملفات التسوية المسجلة": "Recorded reconciliation files",
  "ملفات تسوية بحالة معتمدة ووقت مراجعة": "Approved reconciliation files with a review time",
  "ملفات تسوية ذات فروق مسجلة": "Reconciliation files with recorded differences",
  "طلبات إقفال الفترات": "Period-close requests",
  "طلبات إقفال بحالة مقفلة ووقت إقفال": "Closed period requests with a closure time",
  "طلبات إقفال المناوبات": "Shift-close requests",
  "طلبات إقفال مناوبات بحالة معتمدة ووقت مراجعة": "Approved shift-close requests with a review time",
  "سجلات أدلة أرصدة مستودعات موثقة": "Documented warehouse balance evidence records",
  "سجلات أدلة استلام وصرف موثقة": "Documented receipt and issue evidence records",
  "سجلات أدلة مشتريات موثقة": "Documented procurement evidence records",
  "سجلات أدلة تسليم موثقة": "Documented handover evidence records",
  "سجلات أدلة احتفاظ موثقة": "Documented retention evidence records",
  "سجلات أدلة إتلاف سابق موثقة": "Documented prior destruction evidence records",
  "سجلات أدلة نشر موثقة": "Documented publication evidence records",
  "سجلات أدلة تحليلات موثقة": "Documented analytics evidence records",
  "مواقع المستودعات المسجلة بجميع حالاتها": "Registered warehouse locations in all statuses",
  "مواقع مستودعات مسجلة غير مؤرشفة": "Registered warehouse locations not archived",
  "مواقع مستودعات مؤرشفة": "Archived warehouse locations",
  "مسودات الحملات المسجلة بجميع حالاتها": "Registered campaign drafts in all statuses",
  "مسودات حملات قابلة للتحرير": "Editable campaign drafts",
  "مسودات حملات مؤرشفة": "Archived campaign drafts",
  "منتجات المتجر المادية المسجلة": "Registered physical store products",
  "منتجات المتجر المادية النشطة": "Active physical store products",
  "منتجات المتجر المادية المسودة": "Draft physical store products",
  "منتجات مادية نشطة برصيد صفر أو أقل": "Active physical products with zero or lower balances",
  "منتجات مادية برصيد مسجل سالب": "Physical products with recorded negative balances",
  "الأصول البحرية المسجلة للجهة": "Organization's registered marine assets",
  "الأصول البحرية النشطة": "Active marine assets",
  "سجلات صيانة الأصول البحرية": "Marine asset maintenance records",
  "سجلات صيانة بحرية بحالة مفتوحة": "Open marine maintenance records",
  "سجلات صيانة بحرية بحالة مكتملة ووقت إكمال": "Completed marine maintenance records with a completion time",
  "المرشحون المسجلون": "Registered candidates",
  "سجلات التوظيف": "Employment records",
  "التوظيف النشط": "Active employment",
  "طلبات الإجازة قيد المراجعة": "Leave requests under review",
  "عروض الدورات": "Course offerings",
  "الالتحاق النشط": "Active enrollments",
  "سجلات التدريب المكتملة": "Completed training records",
  "توصيات الشهادات": "Certificate recommendations",
  "الرحلات المسجلة": "Registered trips",
  "الرحلات المفتوحة": "Open trips",
  "حجوزات رحلات الجهة": "Organization trip bookings",
  "تكليفات الطاقم": "Crew assignments",
  "الحسابات المالية النشطة": "Active financial accounts",
  "قيود بانتظار الاعتماد": "Entries awaiting approval",
  "القيود المرحلة": "Posted entries",
  "قوائم السلامة": "Safety checklists",
  "قوائم تنتظر قرار السلامة": "Checklists awaiting a safety decision",
  "حوادث الرحلات غير المحلولة": "Unresolved trip incidents",
  "حالات العملاء": "Customer cases",
  "الحالات المفتوحة أو المسندة": "Open or assigned cases",
  "بانتظار العميل": "Awaiting customer",
  "الحالات المقفلة": "Closed cases",
  "مهام المالك المنتظرة": "Queued owner tasks",
  "مهام المالك الجارية": "Running owner tasks",
  "مهام المالك المتعثرة": "Failed owner tasks",
  "الوكلاء المفعّلون في المنصة": "Enabled platform agents",
  "المعاملات الإدارية": "Administrative transactions",
  "إحالات لم يُحسم قرارها": "Referrals awaiting a decision",
  "الاجتماعات المسجلة": "Recorded meetings",
  "الإدارات المفعّلة": "Enabled departments",
  "إصدارات تقييم الإدارات": "Department assessment versions",
  "مراجعات المكتب المنتظرة أو الجارية": "Queued or running office reviews",
  "المبادرات البحثية": "Research initiatives",
  "المراجعات البحثية المسجلة": "Recorded research reviews",
  "نسخ عقود العمل المسجلة": "Recorded employment contract versions",
  "نسخ عقود العمل في حالة المسودة": "Draft employment contract versions",
  "تعذر تأكيد بيانات مصدر الإدارة.": "Could not confirm department source data.",
  "تعذر تأكيد فهرس مصدر الإدارة.": "Could not confirm the department source index.",
  "السجلات المالية وأدلة الوقائع مرتبطة بمصادرها. أعداد الأدلة الموثقة لا تساوي رصيد مخزون أو إجمالي أداء حملة أو تحققًا مستقلًا أو قبول تشغيل.": "Financial records and event evidence are linked to their sources. Documented evidence counts are not stock balances, overall campaign performance, independent verification or operational acceptance.",
  "مؤشرات مسودات تخطيط الحملات فقط. لا تثبت اعتماد حملة أو نشرها أو نتائجها؛ النشر الفعلي وتحليلات الأداء ما زالت بحاجة إلى الربط.": "Campaign-planning draft metrics only. They do not establish campaign approval, publication or outcomes. Actual publication and performance analytics still require integration.",
  "مؤشرات منتجات المتجر ومواقع المستودعات المسجلة للجهة فقط. تسجيل الموقع لا يثبت رصيدًا فعليًا أو حركة مخزون أو تصريح تشغيل. الأرصدة والحركات والمشتريات والموردون ما زالوا بحاجة إلى الربط.": "Only the organization's registered store-product and warehouse-location metrics are shown. Recording a location does not establish an actual balance, stock movement or operating authorization. Balances, movements, procurement and suppliers still require integration.",
  "مؤشرات منتجات المتجر المادية المسجلة للجهة فقط. سجلات المستودعات والمشتريات والموردين ما زالت بحاجة إلى الربط.": "Only the organization's registered physical store-product metrics are shown. Warehouse, procurement and supplier registers still require integration.",
  "مؤشرات الأصول البحرية المسجلة للجهة وصيانتها فقط. سجل المرافق والأصول الموحد وأوامر العمل ما زال بحاجة إلى الربط.": "Only the organization's registered marine-asset and maintenance metrics are shown. The unified facilities/asset register and work orders still require integration.",
  "لقطة أعداد داخل جهة هيدرولاند؛ التغطية جزئية والقبول التشغيلي لم يُقيّم.": "Count snapshot within the Hydroland organization. Coverage is partial; operational acceptance has not been assessed.",
  "سجل نماذج الإدارة": "Department form register",
  "السجلات التشغيلية": "Operational records",
  "المتبقي:": "Remaining:",
  "اعتماد مستند أو وجود سجل لا يثبت تنفيذ الإجراء أو إقفال الإدارة.": "An approved document or an existing record does not establish execution of an action or department closure.",
  "المصدر التشغيلي غير متصل؛ لا توجد قيمة مقاسة لهذا النطاق.": "The operational source is not connected. There is no measured value for this scope.",
  "استكمال أدلة النشر والتحليلات والتحقق المستقل منها": "Complete publication and analytics evidence and independent verification",
  "سبب استكمال المزود": "Reason for resuming provider requests",
  "راجعت حدود المزود وسبب التوقف وأوافق على استكمال الطلبات المرفوضة قطعياً ضمن حد التشغيل": "I have reviewed the provider limits and pause reason and agree to resume definitively rejected requests within the operating limit",
  "استكمال المزود بعد المراجعة": "Resume provider requests after review",
  "دورات التقارير": "Reporting cycles",
  "تقارير مديري الإدارات إلى سلطان": "Department directors' reports to Sultan",
  "مديرو الإدارات الأربعة عشر يرفعون تقاريرهم إلى مكتب الحوكمة والامتثال والجودة، ثم يجمع عبدالله النتائج في تقرير موحد. هذه الدورة متاحة لمالك المنصة.": "The fourteen department directors report to the governance, compliance and quality office. Abdullah then consolidates the results into one report. This cycle is available to the platform owner.",
  "موجز التقرير": "Report brief",
  "سبب بدء الدورة": "Reason for starting the cycle",
  "إرسال التقرير إلى بريدي الموثق بعد صياغة عبدالله": "Email the report to my verified address after Abdullah drafts it",
  "اعتمد بدء دورة التقارير ضمن حد التشغيل المحدد؛ الاعتماد النهائي للقرارات يبقى لي": "I approve starting the reporting cycle within the defined operating limit. Final decision approval remains with me",
  "بدء دورة التقارير": "Start reporting cycle",
  "تحديث التقرير": "Refresh report",
  "لم تبدأ المراجعة": "Review not started",
  "بانتظار المراجعة": "Awaiting review",
  "المراجعة جارية": "Review in progress",
  "مطلوب تصحيح أو أدلة": "Corrections or evidence required",
  "نتيجة المراجعة غير مكتملة": "Review outcome incomplete",
  "يتطلب قرار المالك": "Owner decision required",
  "المراجعة متوقفة": "Review paused",
  "إحالة المراجعة مؤجلة": "Review referral deferred",
  "روابط المراجعات تحتاج تحققًا": "Review links require verification",
  "التوصية جاهزة لقرار المالك": "Recommendation ready for owner decision",
  "متاح": "Available",
  "مشغول": "Busy",
  "ضغط مرتفع": "High workload",
  "غير مهيأ": "Not configured",
  "موقوف": "Stopped",
  "مفعّل": "Enabled",
  "قراءة مؤشرات العمليات المجمعة": "Read aggregated operational metrics",
  "مسودة رسالة": "Message draft",
  "مسودة حملة": "Campaign draft",
  "مسودة تقرير": "Report draft",
  "مسودة طلب اعتماد": "Approval request draft",
  "أُحيلت المسودة لمحاولة التصحيح الواحدة؛ الأصل محفوظ.": "Draft referred for its single correction attempt. The original is retained.",
  "أُحيل المخرج المحفوظ للمراجع التالي؛ التنفيذ مرتبط بحالة الوكيل والميزانية.": "Saved output referred to the next reviewer. Execution depends on agent status and budget.",
  "يتطلب تصحيحًا أو استكمال أدلة؛ مسار المراجعة متوقف.": "Corrections or further evidence required. The review workflow is paused.",
  "نتيجة المراجعة غير مكتملة؛ مسار المراجعة متوقف.": "Review outcome incomplete. The review workflow is paused.",
  "يتطلب قرار المالك؛ مسار المراجعة متوقف.": "Owner decision required. The review workflow is paused.",
  "لم تثبت سلسلة المراجعات؛ لا اجتياز تلقائي.": "The review chain has not been established. No automatic pass is granted.",
  "المراجعة مؤجلة حتى تهيئة الوكيل.": "Review deferred until the agent is configured.",
  "المراجعة مؤجلة لامتلاء طابور الوكيل؛ المخرج الأصلي محفوظ.": "Review deferred because the agent queue is full. The original output is retained.",
  "اكتملت توصية المكتب وتنتظر اعتماد المالك؛ لم يصدر اعتماد نهائي.": "The office recommendation is complete and awaits owner approval. No final approval has been issued.",
  "منتظرة": "Queued",
  "جارية": "Running",
  "مكتملة": "Completed",
  "متعثرّة": "Failed",
  "منقطعة وتحتاج مراجعة": "Interrupted; review required",
  "ملغاة": "Cancelled",
  "رُوجع التعثر دون إعادة التنفيذ": "Failure reviewed without rerunning",
  "إعدادات التنفيذ مكتملة ضمن الحد المعتمد": "Execution settings complete within the approved limit",
  "تكامل النموذج غير مفعل": "Model integration not enabled",
  "مزود التنفيذ غير محدد": "Execution provider not selected",
  "بيانات اتصال المزود غير مهيأة": "Provider connection credentials not configured",
  "النموذج غير محدد": "Model not selected",
  "حد التكلفة أو حدود الاستخدام غير مهيأة": "Cost or usage limits not configured",
  "إعداد المزود يحتاج مراجعة": "Provider configuration requires review",
  "حد اليوم أقل من الحجز المطلوب للمهمة": "Daily limit is below the task's required reservation",
  "بلغ الحجز حد التكلفة اليومي": "Reserved cost has reached the daily limit",
  "قياس محرك التنفيذ غير متاح أو قديم": "Execution-engine measurement unavailable or stale",
  "المفتاح غير مقبول لدى المزود": "Provider rejected the key",
  "المفتاح لا يملك وصولًا إلى النموذج": "The key does not have access to the model",
  "حد طلبات المزود يمنع الفحص حاليًا": "Provider request limit currently prevents the check",
  "المزود لم يقبل طلب الفحص": "Provider did not accept the check request",
  "تعذر الاتصال بالمزود": "Could not connect to the provider",
  "تعذر التحقق من استجابة المزود": "Could not verify the provider response",
  "المهام محفوظة حتى انتهاء وقت الانتظار": "Tasks are retained until the wait ends",
  "حدود المزود تحتاج مراجعة قبل الاستكمال": "Provider limits require review before resuming",
  "تنظيم سرعة بدء المهام": "Task-start rate control",
  "بلغ استخدام المزود حده المؤقت": "Provider usage has reached its temporary limit",
  "المزود مشغول مؤقتًا": "Provider temporarily busy",
  "المزود طلب الانتظار": "Provider requested a wait",
  "رصيد المزود أو حد الإنفاق يحتاج مراجعة": "Provider balance or spending limit requires review",
  "سبب حد المزود لم يُحدد؛ يلزم التحقق": "Provider-limit reason not identified; verification required",
  "بلغ الحد اليومي ولم يحدد المزود موعد التجدد": "Daily limit reached; the provider did not specify a reset time",
  "بلغت المهمة حد المحاولات المسموح": "The task reached the permitted attempt limit",
  "انتهت مدة الاستكمال التلقائي": "Automatic resumption period expired",
  "تعذر تحديد موعد انتظار آمن": "Could not determine a safe wait time",
  "التنفيذ مؤجل لدى المزود": "Provider execution deferred",
  "· أقرب استكمال": "· Earliest resumption",
  "· نوع الحد": "· Limit type",
  "؛ المهام والنتائج المكتملة محفوظة.": "; completed tasks and results are retained.",
  "محاولات محفوظة:": "Recorded attempts:",
  "من 4": "of 4",
  "· محاولات بتكلفة غير مؤكدة:": "· Attempts with unconfirmed cost:",
  "المهمة محفوظة للاستكمال": "Task retained for resumption",
  "؛ لا تعاد النتائج المكتملة.": "; completed results are not repeated.",
  "بعد": "After",
  "بعد مراجعة حدود المزود": "After reviewing provider limits",
  "سبب استكمال الطلب المرفوض": "Reason for resuming the rejected request",
  "راجعت رفض المزود المؤكد وأوافق على استكماله ضمن حد المحاولات والتكلفة": "I have reviewed the provider's confirmed rejection and agree to resume within attempt and cost limits",
  "استكمال الطلب المرفوض": "Resume rejected request",
  "غير مؤكد": "Unconfirmed",
  "تقارير المديرين ومراجعات المكتب جارية": "Directors' reports and office reviews in progress",
  "عبدالله يصوغ التقرير الموحد": "Abdullah is drafting the consolidated report",
  "التقرير بانتظار الإرسال إلى بريد المالك": "Report awaiting email to the owner",
  "اكتملت دورة التقرير": "Reporting cycle completed",
  "الدورة تحتاج مراجعة": "Cycle requires review",
  "تعذر التحقق من قائمة التقارير.": "Could not verify the report list.",
  "لا توجد دورات تقارير محفوظة بعد.": "No reporting cycles have been saved.",
  "تعذر التحقق من التقرير.": "Could not verify the report.",
  "· قَبِل مزود البريد الرسالة؛ وصولها إلى صندوق البريد لم يُتحقق منه.": "· The email provider accepted the message; inbox delivery has not been verified.",
  "· الاعتماد النهائي للقرارات للمالك.": "· Final decision approval belongs to the owner.",
  "تظهر صياغة عبدالله بعد اكتمال نتائج الإدارات ومراجعات المكتب.": "Abdullah's draft appears after department results and office reviews are complete.",
  "تعذر تحميل التقرير.": "Could not load the report.",
  "تغيرت الحالة؛ راجع الإجراء قبل تأكيده.": "The status has changed. Review the action before confirming it.",
  "غير متاح — القياسات قديمة": "Unavailable — stale measurements",
  "قياس الأداء قديم؛ حدّث القراءة.": "Performance measurement is stale. Refresh the reading.",
  "جميع الإدارات": "All departments",
  "تغيرت الحالة؛ حدّث الوكلاء وراجع الإجراء.": "The status has changed. Refresh agents and review the action.",
  "تعذر إكمال إجراء الوكيل.": "Could not complete the agent action.",
  "مهمة غير متاحة": "Task unavailable",
  "قياس الأداء غير متاح.": "Performance measurement unavailable.",
  "ثانية": "seconds",
  "الأداء التاريخي · جميع المهام المحفوظة": "Historical performance · All saved tasks",
  "نسبة قبول النتائج: غير متاحة حتى ربط قرارات المراجعة النهائية. اكتمال المهمة لا يعني اعتماد المالك.": "Result acceptance rate is unavailable until final review decisions are linked. Task completion does not mean owner approval.",
  "المدة تستثني الانتظار والمراجعات اللاحقة. الحجز والتقدير ليسا فاتورة نهائية.": "Duration excludes waiting and subsequent reviews. Reservations and estimates are not final invoices.",
  "فاشلة": "Failed",
  "منقطعة": "Interrupted",
  "تعثر روجع": "Reviewed failure",
  "متوسط التنفيذ": "Average execution time",
  "عينات مدة التنفيذ": "Execution-time samples",
  "حجز تراكمي": "Cumulative reservation",
  "تقدير معروف": "Known estimate",
  "محاولات بتكلفة غير معلومة": "Attempts with unknown cost",
  "رؤساء الأقسام:": "Section heads:",
  "· سجلات مهيأة:": "· Configured records:",
  "حُفظ التعيين": "Appointment saved",
  "بانتظار تسجيل التعيين": "Appointment not yet recorded",
  "هوية جديدة و": "new identity and",
  "أدوار مسندة إلى الوكلاء الموجودين.": "roles assigned to existing agents.",
  "جاهزية التنفيذ غير متاحة": "Execution readiness unavailable",
  "· النموذج:": "· Model:",
  "آخر قراءة:": "Last reading:",
  "· قياس المحرك:": "· Engine measurement:",
  "حد اليوم": "Daily limit",
  "· محجوز": "· Reserved",
  "· أقصى حجز للمهمة": "· Maximum task reservation",
  "· يوم UTC": "· UTC day",
  "؛ تقدير حسب الأسعار المعتمدة وليس فاتورة المزود.": "; estimate based on approved rates, not the provider's invoice.",
  "حد التكلفة غير مهيأ؛ التنفيذ المدفوع غير متاح.": "Cost limit is not configured. Paid execution is unavailable.",
  "سكرتير تنفيذي ورئيس قسم": "Executive secretary and section head",
  "مدير إدارة": "Department director",
  "رئيس قسم": "Section head",
  "مراجع حوكمة": "Governance reviewer",
  "سكرتير تنفيذي": "Executive secretary",
  "اختصاصي": "Specialist",
  "دور تنظيمي": "Organizational role",
  "· يرفع إلى": "· Reports to",
  "مدير الإدارة": "Department director",
  "متأخرة": "Overdue",
  "متعثرّة دون مراجعة": "Failed without review",
  "هيّئ سجلات الوكلاء لإدارة تشغيله.": "Set up agent records to manage operation.",
  "سبب إجراء": "Reason for action",
  "راجعت حالة الوكيل وأثر الإجراء على مهامه": "I have reviewed the agent's status and the effect on its tasks",
  "الإيقاف يحفظ المنتظرة ويتيح للجارية إكمال عملها.": "Pausing retains queued tasks and lets running tasks finish.",
  "التشغيل يسمح ببدء المنتظرة ضمن الميزانية؛ المهام المتعثرة لا تعاد.": "Starting allows queued tasks to begin within budget. Failed tasks are not repeated.",
  "إيقاف الوكيل": "Pause agent",
  "تشغيل الوكيل": "Start agent",
  "حالة غير متاحة": "Status unavailable",
  "مهمة": "Task",
  "التكلفة التقديرية:": "Estimated cost:",
  "التكلفة النهائية غير مؤكدة؛ حجز التكلفة محفوظ عند بدء التنفيذ.": "Final cost is unconfirmed. Cost reservation is recorded when execution starts.",
  "حالة مسار المراجعة تحتاج تحققًا؛ لا يصدر عنها اعتماد.": "Review workflow status requires verification and provides no approval.",
  "تحتاج المهمة مراجعة؛ لا يعاد طلب النموذج تلقائيًا.": "The task needs review. The model request is not repeated automatically.",
  "مسودة تتطلب قرارًا بشريًا مستقلًا قبل أي إرسال أو تنفيذ.": "Draft requiring an independent human decision before any sending or execution.",
  "قراءة معلومات فقط؛ لم تُنفذ تغييرات.": "Information read only. No changes were executed.",
  "سبب استئناف الإحالة": "Reason for resuming the referral",
  "راجعت المخرج والمراجعات السابقة وأوافق على إحالتها إلى OpenAI ضمن السقف اليومي": "I have reviewed the output and previous reviews and agree to refer them to OpenAI within the daily cap",
  "استئناف إحالة المراجعة": "Resume review referral",
  "سبب استكمال التصحيح": "Reason for resuming correction",
  "راجعت إذن التصحيح والمخرج والملاحظات وأوافق على إرسالها إلى OpenAI ضمن السقف اليومي": "I have reviewed the correction authorization, output and findings and agree to send them to OpenAI within the daily cap",
  "استكمال محاولة التصحيح المأذونة": "Resume the authorized correction attempt",
  "سبب قرار المهمة": "Reason for task decision",
  "راجعت حالة المهمة؛ القرار لا يعيد التنفيذ": "I have reviewed the task status. This decision does not rerun it",
  "إلغاء المهمة المنتظرة": "Cancel queued task",
  "حفظ مراجعة التعثر": "Save failure review",
  "لا توجد مهام محفوظة لهذا الوكيل.": "No saved tasks for this agent.",
  "غير مكتملة": "Incomplete",
  "لم تثبت لقطة المؤشرات لهذا المخرج؛ يلزم استكمال الدليل.": "The metric snapshot for this output has not been established. Further evidence is required.",
  "تعذر تأكيد وقت مصدر الإدارة.": "Could not confirm the department source time.",
  "مصادر الإدارة المستخدمة في التقرير": "Department sources used in the report",
  "وقت القراءة:": "Read time:",
  "المراجعات المعلقة": "Pending reviews",
  "الحجوزات النشطة": "Active bookings",
  "الجهات بانتظار المراجعة": "Organizations awaiting review",
  "تعذر تأكيد دليل المؤشرات.": "Could not confirm metric evidence.",
  "المؤشرات المستخدمة في التقرير": "Metrics used in the report",
  "تعذر تأكيد رابط التصحيح؛ الأصل محفوظ ويحتاج مراجعة.": "Could not confirm the correction link. The original is retained and requires review.",
  "تعذر تأكيد رابط محاولة التصحيح.": "Could not confirm the correction-attempt link.",
  "محاولة تصحيح نصي واحدة:": "One text correction attempt:",
  "عرض ملف المسودة المصححة": "View corrected draft file",
  "تعذر قراءة ملف التصحيح.": "Could not read the correction file.",
  "تعذر تأكيد روابط ملف المراجعة.": "Could not confirm review file links.",
  "تفاصيل ملف المراجعة": "Review file details",
  "· المراجعات المجتازة": "· Passed reviews",
  "من 6": "of 6",
  "التكلفة التقديرية المسجلة:": "Recorded estimated cost:",
  "مرجع المصدر:": "Source reference:",
  "المصدر والمخرج الأصلي": "Source and original output",
  "التوصية تحتاج قرار المالك؛ لم يصدر اعتماد نهائي.": "The recommendation requires the owner's decision. No final approval has been issued.",
  "استكمال المراجعة والمعالجة لدى الجهة المختصة.": "Complete review and remediation with the responsible authority.",
  "لم تبدأ": "Not started",
  "تحتاج تحققًا": "Needs verification",
  "الملاحظات": "Notes",
  "الأدلة الناقصة": "Missing evidence",
  "نص المراجعة المحفوظ": "Saved review text",
  "مرجع المراجعة:": "Review reference:",
  "جارٍ تحميل ملفات المراجعة…": "Loading review files…",
  "استجابة ملفات المراجعة غير مكتملة.": "The review-files response is incomplete.",
  "من 6 ·": "of 6 ·",
  "عرض الملف": "View file",
  "لا توجد مخرجات مكتملة للوكلاء لعرض مراجعاتها.": "No completed agent outputs are available for review.",
  "تم تحميل ملفات المراجعة من السجل المحفوظ.": "Review files loaded from the saved register.",
  "تعذر تحميل ملفات المراجعة.": "Could not load review files.",
  "استجابة المهام غير مكتملة.": "The task response is incomplete.",
  "جارٍ تحميل حالة الوكلاء…": "Loading agent status…",
  "استجابة الوكلاء غير مكتملة.": "The agent response is incomplete.",
  "تم تحميل حالة الوكلاء من الخادم.": "Agent status loaded from the server.",
  "تعذر تحميل الوكلاء.": "Could not load agents.",
  "جارٍ قراءة مصادر الإدارات دون توليد أو تغيير السجلات…": "Reading department sources without generation or record changes…",
  "تعذر تأكيد فحص مصادر الإدارات.": "Could not confirm the department source check.",
  "تعذر تأكيد نسخة مصادر الإدارات.": "Could not confirm the department source version.",
  "تعذر تأكيد نطاق مصدر الإدارة.": "Could not confirm the department source scope.",
  "الإدارة غير مفعّلة في الهيكل الداخلي؛ لم تُقرأ مؤشرات تشغيلية.": "The department is not enabled in the internal structure. No operational metrics were read.",
  "تعذر تأكيد حالة مصدر الإدارة.": "Could not confirm department source status.",
  "· تغطية جزئية": "· Partial coverage",
  "قراءة": "Read",
  "· 14 إدارة؛ لم يُستدعَ النموذج ولم تتغير سجلات الأعمال. هذه قراءة حالية مستقلة عن مصادر التقارير السابقة.": "· 14 departments. The model was not called and business records were unchanged. This is a current reading, independent of previous report sources.",
  "تعذر فحص مصادر الإدارات.": "Could not check department sources.",
  "جارٍ فحص الاتصال دون توليد نص أو تشغيل أي وكيل…": "Checking the connection without generating text or running an agent…",
  "تعذر تأكيد نتيجة فحص الاتصال.": "Could not confirm the connection-check result.",
  "آخر فحص": "Last check",
  "نجح فحص المفتاح وإتاحة النموذج": "Key and model-access check passed",
  "تعذر التحقق من الاتصال": "Could not verify the connection",
  "؛ لم يُختبر التوليد أو الرصيد.": "; generation and balance were not tested.",
  "تعذر فحص الاتصال.": "Could not check the connection.",
  "جارٍ حفظ إجراء الوكيل…": "Saving the agent action…",
  "جارٍ حفظ الإجراء…": "Saving the action…",
  "تعذر تأكيد الحفظ؛ حدّث الوكلاء للتحقق.": "Could not confirm saving. Refresh agents to verify.",
  "تعذر حفظ الإجراء.": "Could not save the action.",
  "حُفظ تعيين رؤساء الأقسام وتبعيتهم لمديري الإدارات.": "Section-head appointments and reporting lines to department directors were saved.",
  "بدأت دورة تقارير الإدارات؛ التنفيذ مرتبط بجاهزية الوكلاء وحد التشغيل.": "Department reporting cycle started. Execution depends on agent readiness and operating limits.",
  "حُفظت مراجعة حدود المزود؛ استكمال المهام مرتبط بحالة الوكلاء والميزانية.": "Provider-limit review saved. Task resumption depends on agent status and budget.",
  "حُفظ الطلب نفسه للاستكمال بعد رفض مؤكد؛ بقيت المحاولات والتكلفة محفوظة.": "The same request was retained for resumption after confirmed rejection. Attempts and cost remain recorded.",
  "تمت تهيئة الوكلاء في وضع الإيقاف.": "Agents were configured in the paused state.",
  "أُوقف بدء مهام الوكيل؛ الجارية تكمل والمنتظرة محفوظة.": "New agent tasks are paused. Running tasks finish and queued tasks are retained.",
  "فُعّل الوكيل للمهام المنتظرة ضمن حدود التنفيذ.": "Agent enabled for queued tasks within execution limits.",
  "حُفظت المهمة في الانتظار؛ التنفيذ مرتبط بحالة الوكيل والمزود والميزانية.": "Task queued. Execution depends on agent status, provider and budget.",
  "حُفظت محاولة التصحيح المأذونة؛ بقي الأصل والمراجعات محفوظة.": "Authorized correction attempt saved. The original and reviews are retained.",
  "حُفظت إحالة المراجعة من المخرج السابق؛ لم يُعَد توليد المصدر.": "Review referral saved from the previous output. The source was not generated again.",
  "حُفظ قرار المهمة دون إعادة تنفيذها.": "Task decision saved without rerunning the task.",
  "بحث {0}": "Search {0}",
  "{0} · {1}": "{0} · {1}",
  "{0} · الإصدار {1} · {2}": "{0} · Version {1} · {2}",
  "الإثبات: {0} · نسخة {1}": "Evidence: {0} · Revision {1}",
  "{0} · {1} · {2}": "{0} · {1} · {2}",
  "{0}{1}{2}؛ المهام والنتائج المكتملة محفوظة.": "{0}{1}{2}; completed tasks and results are retained.",
  " · أقرب استكمال {0}": " · Earliest resumption {0}",
  " · نوع الحد {0}": " · Limit type {0}",
  " · محاولات بتكلفة غير مؤكدة: {0}": " · Attempts with unconfirmed cost: {0}",
  " بعد {0}": " After {0}",
  " بعد مراجعة حدود المزود": " After reviewing provider limits",
  "{0}{1} · الاعتماد النهائي للقرارات للمالك.": "{0}{1} · Final decision approval belongs to the owner.",
  " · قَبِل مزود البريد الرسالة؛ وصولها إلى صندوق البريد لم يُتحقق منه.": " · The email provider accepted the message; inbox delivery has not been verified.",
  " ثانية": " seconds",
  "رؤساء الأقسام: {0} · سجلات مهيأة: {1} · {2} · {3} هوية جديدة و{4} أدوار مسندة إلى الوكلاء الموجودين.": "Section heads: {0} · Configured records: {1} · {2} · {3} new identities and {4} roles assigned to existing agents.",
  "OpenAI · {0}{1}": "OpenAI · {0}{1}",
  " · النموذج: {0}": " · Model: {0}",
  "آخر قراءة: {0} · قياس المحرك: {1}": "Last reading: {0} · Engine measurement: {1}",
  "حد اليوم {0} · محجوز {1} · أقصى حجز للمهمة {2} · يوم UTC {3}؛ تقدير حسب الأسعار المعتمدة وليس فاتورة المزود.": "Daily limit {0} · Reserved {1} · Maximum task reservation {2} · UTC day {3}; estimate based on approved rates, not the provider's invoice.",
  " · يرفع إلى {0}": " · Reports to {0}",
  "التكلفة التقديرية: {0}": "Estimated cost: {0}",
  "قراءة {0} · 14 إدارة؛ لم يُستدعَ النموذج ولم تتغير سجلات الأعمال. هذه قراءة حالية مستقلة عن مصادر التقارير السابقة.": "Read {0} · 14 departments. The model was not called and business records were unchanged. This is a current reading, independent of previous report sources.",
  "آخر فحص {0} · {1}؛ لم يُختبر التوليد أو الرصيد.": "Last check {0} · {1}; generation and balance were not tested."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


function mountEvidencePanel(box,host,auth,access){
 const kinds={WAREHOUSE_BALANCE:'دليل رصيد مستودع',WAREHOUSE_MOVEMENT:'دليل استلام أو صرف مخزون',PROCUREMENT:'دليل مشتريات',RECORD_DELIVERY:'دليل تسليم سجل',RECORD_RETENTION:'قرار احتفاظ أو مانع إتلاف',RECORD_DISPOSAL:'دليل إتلاف سابق مأذون',CAMPAIGN_PUBLICATION:'دليل نشر حملة',CAMPAIGN_ANALYTICS:'دليل تحليلات حملة'};
 const states={DRAFT:'مسودة',RECORDED:'موثق في السجل',ARCHIVED:'مؤرشف'};
 const ref=(name,label,type,subject)=>({name,label,type:'reference',referenceType:type,subject});
 const schemas={WAREHOUSE_BALANCE:[ref('productId','السلعة','product'),ref('locationId','موقع المستودع','location'),{name:'quantity',label:'الكمية المرصودة',type:'number',min:0}],WAREHOUSE_MOVEMENT:[ref('productId','السلعة','product'),ref('locationId','موقع المستودع','location'),{name:'direction',label:'نوع الحركة',type:'select',options:{RECEIPT:'استلام',ISSUE:'صرف'}},{name:'quantity',label:'الكمية',type:'number',min:1}],PROCUREMENT:[ref('productId','السلعة','product'),{name:'quantity',label:'الكمية',type:'number',min:1},{name:'procurementReference',label:'مرجع المشتريات',type:'text'}],RECORD_DELIVERY:[ref('recordId','السجل الإداري','record'),{name:'recipientReference',label:'مرجع الجهة المستلمة',type:'text'}],RECORD_RETENTION:[ref('recordId','السجل الإداري','record'),{name:'retainUntil',label:'نهاية مدة الاحتفاظ بتوقيت جهازك',type:'datetime-local'},{name:'hold',label:'هل يوجد مانع إتلاف؟',type:'select',options:{true:'نعم',false:'لا'}},{name:'policyReference',label:'مرجع سياسة الاحتفاظ',type:'text'}],RECORD_DISPOSAL:[ref('recordId','السجل الإداري','record'),ref('retentionEvidenceId','قرار الاحتفاظ المسجل للواقعة','retention','recordId'),ref('authorizationDocumentId','مستند إذن الإتلاف','document')],CAMPAIGN_PUBLICATION:[ref('campaignDraftId','مسودة الحملة','campaign'),{name:'channel',label:'قناة النشر',type:'select',options:{APP:'التطبيق',WEB:'الموقع',EMAIL:'البريد',SMS:'رسائل نصية',WHATSAPP:'واتساب',SOCIAL:'شبكات التواصل',PAID_ADS:'إعلانات مدفوعة'}},{name:'publicationReference',label:'مرجع أو رابط النشر',type:'text',max:500}],CAMPAIGN_ANALYTICS:[ref('campaignDraftId','مسودة الحملة','campaign'),ref('publicationEvidenceId','دليل النشر الموثق','publication','campaignDraftId'),{name:'windowStart',label:'بداية فترة القياس بتوقيت جهازك',type:'datetime-local'},{name:'windowEnd',label:'نهاية فترة القياس بتوقيت جهازك',type:'datetime-local'},{name:'impressions',label:'مرات الظهور',type:'number',min:0},{name:'clicks',label:'النقرات',type:'number',min:0},{name:'conversions',label:'التحويلات',type:'number',min:0}]};
 const panel=document.createElement('details');panel.dataset.operationalEvidence='';
 uiLocale.setHTML(panel, uiLocale.html`<summary>سجل أدلة الوقائع الداخلية</summary><p>للمالك: دوّن الوقائع الفعلية واربطها بمستنداتها. المسودة لا تدخل في مؤشرات الأدلة الموثقة. تسجيل دليل لا ينفذ صرفًا أو حركة مخزون أو نشرًا أو إتلافًا، ولا يمنح قبول تشغيل.</p><p role="status" data-evidence-feedback></p><button type="button" data-evidence-refresh>تحديث سجل الأدلة</button><form data-evidence-create><fieldset><legend>مسودة دليل جديد</legend><label>نوع الدليل<select name="kind" required></select></label><label>مرجع الواقعة<input name="reference" required maxlength="200"></label><label>وقت الواقعة بتوقيت جهازك<input type="datetime-local" name="occurredAt" required></label><div data-evidence-proof></div><div data-evidence-fields></div><button type="submit">حفظ مسودة الدليل</button><button type="button" data-evidence-new>مسودة جديدة</button></fieldset></form><section aria-label="الأدلة المسجلة" data-evidence-list></section><button type="button" data-evidence-more hidden>أدلة أقدم</button><section aria-live="polite" data-evidence-detail></section>`);
 box.querySelector('[data-ai-department-sources]').insertAdjacentElement('afterend',panel);
 const feedback=panel.querySelector('[data-evidence-feedback]'),form=panel.querySelector('[data-evidence-create]'),fields=panel.querySelector('[data-evidence-fields]'),proof=panel.querySelector('[data-evidence-proof]'),list=panel.querySelector('[data-evidence-list]'),detail=panel.querySelector('[data-evidence-detail]'),more=panel.querySelector('[data-evidence-more]'),kind=form.elements.kind;
 for(const [value,label] of Object.entries(kinds))kind.add((option=>{uiLocale.setMessage(option, uiLocale.message(label));return option;})(new Option('', value)));
 let epoch=0,busy=false,next=null,fieldVersion=0;
 const usable=()=>Boolean(box.open&&!host.hidden&&auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin'));
 const current=(version,session)=>version===epoch&&session===auth()?.getSessionVersion?.()&&panel.open&&usable();
 const quiet=()=>Object.assign(localError(uiLocale.message('تغيرت الجلسة.')),{silent:true});
 const lock=()=>{panel.querySelectorAll('fieldset').forEach(f=>f.disabled=busy);panel.querySelectorAll('button').forEach(b=>b.disabled=busy);};
 function clear(close=true){epoch++;busy=false;next=null;fieldVersion++;form.reset();delete form.dataset.requestKey;fields.replaceChildren();proof.replaceChildren();list.replaceChildren();detail.replaceChildren();uiLocale.setMessage(feedback, '');more.hidden=true;if(close)panel.open=false;lock();}
 const fail=e=>{if(!e.silent)uiLocale.setMessage(feedback, (localErrorMessage(e) || uiLocale.message('تعذر إكمال الإجراء.')));};
 async function request(path,options={}){const version=epoch,session=auth()?.getSessionVersion?.();if(!current(version,session))throw quiet();const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>current(version,session)});if(!allowed||!current(version,session))throw quiet();const response=await auth().authorizedFetch('/admin/operational-evidence'+path,options),data=await response.json().catch(()=>null);if(!current(version,session))throw quiet();if(!response.ok){if(response.status===401||response.status===403)clear(false);throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر حفظ الدليل؛ حدّث السجل وراجع المراجع.')));}return data;}
 const post=(path,value)=>request(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});
 function referenceControl(spec,container,version){
  const group=document.createElement('fieldset'),legend=document.createElement('legend'),search=document.createElement('input'),select=document.createElement('select'),find=document.createElement('button'),older=document.createElement('button');uiLocale.setText(legend, spec.label);search.type='search';search.maxLength=100;uiLocale.setAttribute(search, "aria-label", "بحث {0}", [uiLocale.message(spec.label)]);select.name=spec.name;select.required=true;uiLocale.setAttribute(select,'aria-label',spec.label);find.type=older.type='button';uiLocale.setMessage(find, uiLocale.message('بحث'));uiLocale.setMessage(older, uiLocale.message('المزيد من المراجع'));older.hidden=true;let cursor=null,ticket=0;
  group.style.minWidth='0';select.style.width='100%';select.style.maxWidth='100%';search.style.maxWidth='100%';group.append(legend,search,find,select,older);container.append(group);
  async function load(append=false){const own=++ticket,selectedKind=kind.value,subject=spec.subject?form.elements.namedItem(spec.subject)?.value:null;if(spec.subject&&!subject){select.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر المرجع السابق أولًا'));return option;})(new Option('', '')));older.hidden=true;return;}if(!append){select.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر مرجعًا محفوظًا'));return option;})(new Option('', '')));cursor=null;}older.hidden=true;const q=new URLSearchParams({type:spec.referenceType,kind:selectedKind,query:search.value});if(subject)q.set('subjectId',subject);if(append&&cursor)q.set('cursor',cursor);
   try{const result=await request('/references?'+q);if(own!==ticket||version!==fieldVersion||kind.value!==selectedKind||!group.isConnected)return;if(!Array.isArray(result.items)||result.items.length>50||typeof result.hasMore!=='boolean')throw localError(uiLocale.message('استجابة المراجع غير مكتملة.'));for(const item of result.items){if(typeof item.id!=='string'||typeof item.label!=='string')throw localError(uiLocale.message('مرجع غير صالح.'));select.add((option=>{uiLocale.setMessage(option, item.label);return option;})(new Option('', item.id)));}cursor=result.nextCursor;older.hidden=!result.hasMore;if(!append&&!result.items.length)uiLocale.setMessage(select.options[0], uiLocale.message('لا توجد مراجع مطابقة؛ أنشئ السجل أو المستند في مساره أولًا.'));}catch(e){fail(e);}
  }
  find.addEventListener('click',()=>void load());search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void load();}});older.addEventListener('click',()=>void load(true));if(spec.subject)form.elements.namedItem(spec.subject)?.addEventListener('change',()=>void load());void load();
 }
 function renderFields(){const version=++fieldVersion;fields.replaceChildren();proof.replaceChildren();referenceControl(ref('proofDocumentId',uiLocale.t('مستند الإثبات وإصداره'),'document'),proof,version);for(const spec of schemas[kind.value]){if(spec.type==='reference'){referenceControl(spec,fields,version);continue;}const label=document.createElement('label'),input=document.createElement(spec.type==='select'?'select':'input');uiLocale.setText(label,spec.label);input.name=spec.name;input.required=true;if(spec.type==='select'){input.add((option=>{uiLocale.setMessage(option, uiLocale.message('اختر'));return option;})(new Option('', '')));for(const [value,title] of Object.entries(spec.options))input.add((option=>{uiLocale.setText(option, title);return option;})(new Option('', value)));}else{input.type=spec.type;if(spec.type==='number'){input.min=String(spec.min);input.max='1000000000';input.step='1';}if(spec.type==='text')input.maxLength=spec.max||200;}label.append(input);fields.append(label);}}
 function show(record){
  if(!record||!kinds[record.kind]||!states[record.status]||!Number.isSafeInteger(record.revision))throw localError(uiLocale.message('تعذر تأكيد سجل الدليل.'));detail.replaceChildren();const title=document.createElement('h5'),meta=document.createElement('p'),notice=document.createElement('p');uiLocale.setMessage(title, uiLocale.message("{0} · {1}", [(value=>value===undefined?value:uiLocale.message(value))(kinds[record.kind]), record.reference]));uiLocale.setMessage(meta, uiLocale.message("{0} · الإصدار {1} · {2}", [(value=>value===undefined?value:uiLocale.message(value))(states[record.status]), record.revision, new Date(record.occurredAt).toLocaleString('ar-SA')]));uiLocale.setMessage(notice, uiLocale.message("الإثبات: {0} · نسخة {1}", [(record.proofReference || uiLocale.message('مستند مرتبط')), record.proofVersion]));detail.append(title,meta,notice);
  const facts=document.createElement('dl');for(const spec of schemas[record.kind]){if(spec.type==='reference')continue;const term=document.createElement('dt'),value=document.createElement('dd');uiLocale.setText(term, spec.label);const raw=record.details?.[spec.name];uiLocale.setMessage(value, (spec.type==='select' ? (Object.hasOwn(spec.options,String(raw))?uiLocale.message(spec.options[String(raw)]):uiLocale.message('غير متاح')) : (spec.type==='datetime-local' ? new Date(raw).toLocaleString('ar-SA') : String(raw??'غير متاح'))));facts.append(term,value);}detail.append(facts);
  if(record.status==='ARCHIVED')return;const action=document.createElement('form');uiLocale.setHTML(action, uiLocale.html`<fieldset><label>سبب الإجراء<input name="reason" required maxlength="500"></label><label><input type="checkbox" name="confirmed" required>راجعت الواقعة ومراجعها؛ هذا تسجيل دليل ولا ينفذ إجراء أعمال</label><button type="submit" name="operation" value="record">توثيق الواقعة في السجل</button><button type="submit" name="operation" value="archive">أرشفة الدليل</button></fieldset>`);if(record.status!=='DRAFT')action.querySelector('[value="record"]').hidden=true;
  action.addEventListener('submit',async e=>{e.preventDefault();if(busy||!action.reportValidity()||!usable())return;busy=true;lock();action.querySelector('fieldset').disabled=true;const v=epoch,s=auth()?.getSessionVersion?.();try{const operation=e.submitter?.value;if(!['record','archive'].includes(operation))return;const result=await post('/'+encodeURIComponent(record.id)+'/'+operation,{expectedRevision:record.revision,reason:action.elements.reason.value,confirmed:action.elements.confirmed.checked});if(!current(v,s))return;show(result.record);await loadList();if(current(v,s))uiLocale.setMessage(feedback, (operation==='record' ? uiLocale.message('سُجل الدليل؛ تُحتسب المؤشرات عند صلاحية مستنداته ومراجعه.') : uiLocale.message('أُرشف الدليل مع حفظ تاريخه.')));}catch(error){fail(error);}finally{if(current(v,s)){busy=false;lock();if(action.isConnected)action.querySelector('fieldset').disabled=false;}}});detail.append(action);lock();
 }
 async function loadList(append=false){const result=await request(next&&append?'?cursor='+encodeURIComponent(next):'');if(!Array.isArray(result.items)||result.items.length>50||typeof result.hasMore!=='boolean')throw localError(uiLocale.message('استجابة سجل الأدلة غير مكتملة.'));if(!append)list.replaceChildren();if(!result.items.length&&!append){const p=document.createElement('p');uiLocale.setMessage(p, uiLocale.message('لا توجد أدلة مسجلة بعد. قبل التشغيل لا تُنشأ وقائع أو أرصدة افتراضية.'));list.append(p);}for(const row of result.items){if(!kinds[row.kind]||!states[row.status]||typeof row.id!=='string')throw localError(uiLocale.message('عنصر دليل غير صالح.'));const p=document.createElement('p'),button=document.createElement('button');button.type='button';uiLocale.setMessage(button, uiLocale.message("{0} · {1} · {2}", [(value=>value===undefined?value:uiLocale.message(value))(kinds[row.kind]), row.reference, (value=>value===undefined?value:uiLocale.message(value))(states[row.status])]));button.addEventListener('click',async()=>{if(busy||!usable())return;try{const value=await request('/'+encodeURIComponent(row.id));show(value.record);}catch(e){fail(e);}});p.append(button);list.append(p);}next=result.nextCursor;more.hidden=!result.hasMore;}
 async function refresh(){if(busy||!usable()||!panel.open)return;busy=true;lock();const v=epoch,s=auth()?.getSessionVersion?.();try{await loadList();if(!current(v,s))return;detail.replaceChildren();renderFields();uiLocale.setMessage(feedback, uiLocale.message('تم تحميل السجل من الجهة الداخلية.'));}catch(e){fail(e);}finally{if(current(v,s)){busy=false;lock();}}}
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy||!form.reportValidity()||!usable())return;const selected=kind.value,details={};for(const spec of schemas[selected]){let value=form.elements.namedItem(spec.name).value;if(spec.type==='number')value=Number(value);else if(spec.type==='datetime-local')value=new Date(value).toISOString();else if(spec.name==='hold')value=value==='true';details[spec.name]=value;}form.dataset.requestKey||=crypto.randomUUID();const payload={requestKey:form.dataset.requestKey,kind:selected,reference:form.elements.reference.value,occurredAt:new Date(form.elements.occurredAt.value).toISOString(),proofDocumentId:form.elements.proofDocumentId.value,details};busy=true;lock();const v=epoch,s=auth()?.getSessionVersion?.();try{const result=await post('',payload);if(!current(v,s))return;delete form.dataset.requestKey;form.reset();kind.value=selected;show(result.record);await loadList();renderFields();uiLocale.setMessage(feedback, uiLocale.message('حُفظت مسودة الدليل. راجع مستندها ثم وثّق الواقعة عند توفر الاعتماد المطلوب.'));}catch(error){fail(error);}finally{if(current(v,s)){busy=false;lock();}}});
 kind.addEventListener('change',()=>{if(usable())renderFields();});panel.querySelector('[data-evidence-new]').addEventListener('click',()=>{form.reset();delete form.dataset.requestKey;if(usable())renderFields();});panel.querySelector('[data-evidence-refresh]').addEventListener('click',()=>void refresh());more.addEventListener('click',()=>{if(!busy&&usable())void loadList(true).catch(fail);});panel.addEventListener('toggle',()=>{if(panel.open)void refresh();else clear(false);});
 return {clear};
}

 const mount=()=>{
  const host=document.getElementById('hl-admin-employees');if(!host)return false;if(window.HydrolandAdminAgentWorkforce)return true;
  const box=document.createElement('details');box.className='hl-ai-workforce';box.dataset.agentWorkforce='';
  uiLocale.setHTML(box, uiLocale.html`<summary>وكلاء الذكاء الاصطناعي · التشغيل وضغط المهام</summary><div class="hl-ai-body"><header><div><h4>إدارة الوكلاء</h4><p>الإيقاف يمنع بدء مهام جديدة. الجارية تكمل عملها، والمنتظرة تبقى محفوظة للاستئناف. الرفض المؤقت من المزود يؤجّل بمحاولات محدودة؛ النتائج المكتملة والطلبات غير المؤكدة لا تعاد.</p></div><button type="button" data-ai-refresh>تحديث الوكلاء</button></header><p role="status" data-ai-feedback></p><p data-ai-provider></p><p data-ai-observed></p><p data-ai-budget></p><p class="hl-ai-explainer">ضغط مرتفع: ثلاث مهام منتظرة أو أكثر، أو انتظار تجاوز 15 دقيقة، أو تعثر غير مراجع. غير ذلك: مشغول عند وجود عمل، ومتاح عند خلو العمل بقياس حديث. القياسات القديمة بعد 90 ثانية تُعرض كغير متاحة. حالة التشغيل مستقلة عن الضغط.</p>
  <form data-ai-initialize hidden><fieldset><label>سبب تهيئة الوكلاء<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input name="reviewed" type="checkbox" required>راجعت إنشاء سجلات الوكلاء في وضع الإيقاف، دون منح أدوار أو تشغيل مدفوع</label><button type="submit">تهيئة سجلات الوكلاء</button></fieldset><p role="status" data-ai-message></p></form><p data-ai-governance-office hidden>مكتب الحوكمة والجودة: جودة ← مراجعة فنية ← أمن ومخاطر ← امتثال ← تحقق واختبارات ← توصية نهائية للمالك. المراجعات مرتبطة بالمخرج الأصلي؛ نقص الأدلة أو طلب التصحيح يوقف الانتقال. الاعتماد النهائي للمالك.</p><details data-ai-governance-inbox hidden><summary>ملفات مراجعات مكتب الحوكمة</summary><p>ملخص المصدر والمراجعات الست والملاحظات والتكلفة المسجلة. جاهزية التوصية تسبق قرار المالك والاعتمادات المختصة.</p><button type="button" data-ai-inbox-refresh>تحديث ملفات المراجعة</button><p role="status" data-ai-inbox-feedback></p><div data-ai-inbox-list></div><nav aria-label="صفحات ملفات المراجعة"><button type="button" data-ai-inbox-newer>ملفات أحدث</button><button type="button" data-ai-inbox-older>ملفات أقدم</button></nav><section data-ai-inbox-detail aria-live="polite"></section></details><div class="hl-ai-cards" data-ai-cards></div>
  <section data-ai-tasks hidden><h4>مهام الوكيل</h4><label>الوكيل<select data-ai-agent-select aria-label="الوكيل"></select></label><form data-ai-task-form><fieldset><div class="hl-ai-grid"><label>نوع مهمة الوكيل<select name="action" aria-label="نوع مهمة الوكيل"></select></label><label>لغة المهمة<select name="language" aria-label="لغة المهمة"><option value="ar-SA">العربية السعودية</option><option value="en">English</option></select></label></div><label>نص مهمة الوكيل<textarea name="prompt" required minlength="3" maxlength="2000" rows="3"></textarea></label><p>أدخل موجزًا مناسبًا للمزود، دون كلمات مرور أو معلومات شخصية حساسة. قراءة العمليات ترسل مؤشرات مجمعة فقط. المسودات لا ترسل رسائل ولا تنفذ تغييرات أعمال.</p><label>سبب تكليف الوكيل<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label hidden data-ai-correction-choice><input type="checkbox" name="correctionPolicy">أسمح بمحاولة تصحيح نصي واحدة لهذه المسودة ومراجعتها عبر OpenAI ضمن السقف اليومي، مع حفظ الأصل</label><label><input type="checkbox" name="reviewed" required>راجعت النص وحدود الوكيل وأوافق على إرسال نص المهمة إلى OpenAI عند تشغيلها</label><button type="submit">إضافة مهمة إلى الانتظار</button></fieldset><p role="status" data-ai-message></p></form><div data-ai-task-list aria-live="polite"></div><nav aria-label="صفحات مهام الوكيل"><button type="button" data-ai-newer>مهام أحدث</button><button type="button" data-ai-older>مهام أقدم</button></nav></section></div>`);
  host.querySelector('[data-staff-feedback]').insertAdjacentElement('afterend',box);
  const sectionPanel=document.createElement('details');sectionPanel.dataset.aiSectionHeads='';sectionPanel.hidden=true;
  uiLocale.setHTML(sectionPanel, uiLocale.html`<summary>تعيين رؤساء الأقسام</summary><p role="status" data-ai-section-status></p><p>لكل قسم رئيس يتبع مدير إدارته. يستمر عبدالله في تجميع التقارير إلى جانب رئاسة السكرتارية. التعيين يحفظ الأدوار والتبعية؛ تكليف المهام يتم من مساره المعتاد.</p><form data-ai-section-appointments><fieldset><label>سبب التعيين<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="enableNewHeads">تفعيل الرؤساء الجدد ضمن جاهزية المزود وحد التكلفة الحالي</label><label><input type="checkbox" name="reviewed" required>راجعت رؤساء الأقسام وتبعيتهم؛ يبقى الاعتماد النهائي لدى صاحب الصلاحية</label><button type="submit">تعيين رؤساء الأقسام</button></fieldset><p role="status" data-ai-message></p></form>`);
  const sectionStatus=sectionPanel.querySelector('[data-ai-section-status]'),sectionForm=sectionPanel.querySelector('form');
  box.querySelector('[data-ai-initialize]').insertAdjacentElement('afterend',sectionPanel);
  const departmentLabel=document.createElement('label'),departmentFilter=document.createElement('select');uiLocale.setMessage(departmentLabel, uiLocale.message('عرض إدارة'));departmentFilter.dataset.aiDepartmentFilter='';uiLocale.setAttribute(departmentFilter, "aria-label", 'تصفية الوكلاء حسب الإدارة');departmentLabel.append(departmentFilter);box.querySelector('[data-ai-cards]').insertAdjacentElement('beforebegin',departmentLabel);
  departmentFilter.addEventListener('change',()=>{for(const card of box.querySelectorAll('[data-ai-key]'))card.hidden=Boolean(departmentFilter.value&&data?.items?.find(agent=>agent.key===card.dataset.aiKey)?.departmentCode!==departmentFilter.value);});
  const providerActions=document.createElement('div');providerActions.className='hl-ai-provider-actions';
  const refreshButton=box.querySelector('[data-ai-refresh]');refreshButton.replaceWith(providerActions);providerActions.append(refreshButton);
  const checkButton=document.createElement('button');checkButton.type='button';checkButton.dataset.aiProviderCheck='';uiLocale.setMessage(checkButton, uiLocale.message('فحص الاتصال دون توليد'));providerActions.append(checkButton);
  const connection=document.createElement('p');connection.dataset.aiConnection='';connection.setAttribute('role','status');box.querySelector('[data-ai-provider]').insertAdjacentElement('afterend',connection);
  const sourceButton=document.createElement('button');sourceButton.type='button';sourceButton.dataset.aiSourceCheck='';uiLocale.setMessage(sourceButton, uiLocale.message('فحص مصادر الإدارات دون توليد'));providerActions.append(sourceButton);
  const sourcePanel=document.createElement('details');sourcePanel.dataset.aiDepartmentSources='';sourcePanel.hidden=true;uiLocale.setHTML(sourcePanel, uiLocale.html`<summary>مصادر بيانات المديرين</summary><p role="status" data-ai-source-status></p><div data-ai-source-list></div>`);connection.insertAdjacentElement('afterend',sourcePanel);
  const sourceStatus=sourcePanel.querySelector('[data-ai-source-status]'),sourceList=sourcePanel.querySelector('[data-ai-source-list]');
  const departmentMetricsV2={HR:['candidates','employments','activeEmployments','pendingLeaves'],TRAINING:['courseOffers','activeEnrollments','completedTrainingRecords','certificateRecommendations'],MARINE_OPERATIONS:['trips','openTrips','tripBookings','crewAssignments'],INVENTORY_LOGISTICS:[],FINANCE:['activeFinanceAccounts','pendingFinanceEntries','postedFinanceEntries'],SAFETY_COMPLIANCE_RISK:['safetyChecklists','pendingSafetyDecisions','unresolvedTripIncidents'],CUSTOMER_EXPERIENCE:['customerCases','openCustomerCases','waitingCustomerCases','closedCustomerCases'],MARKETING_GROWTH:[],TECHNOLOGY_CYBERSECURITY:['queuedOwnerTasks','runningOwnerTasks','failedOwnerTasks','enabledAgents'],FACILITIES_ASSETS_MAINTENANCE:[],ADMIN_AFFAIRS_RECORDS:['administrativeRecords','pendingRoutings','meetings'],EXECUTIVE_GOVERNANCE:['activeDepartments','assessmentRevisions','pendingOfficeTasks'],RND_MARKET_INTELLIGENCE:['researchInitiatives','researchReviews'],LEGAL_CONTRACTS_INSURANCE:['employmentContractVersions','draftEmploymentContractVersions']};
  const departmentMetricsV3={...departmentMetricsV2,INVENTORY_LOGISTICS:['storeGoodsProducts','activeStoreGoodsProducts','draftStoreGoodsProducts','unavailableActiveStoreGoodsProducts','negativeStockStoreGoodsProducts'],FACILITIES_ASSETS_MAINTENANCE:['marineAssets','activeMarineAssets','marineMaintenanceRecords','openMarineMaintenanceRecords','recordedCompletedMarineMaintenanceRecords']};
  const departmentMetricsV4={...departmentMetricsV3,MARKETING_GROWTH:['marketingCampaignDrafts','openMarketingCampaignDrafts','archivedMarketingCampaignDrafts']};
  const departmentMetrics={...departmentMetricsV4,INVENTORY_LOGISTICS:[...departmentMetricsV3.INVENTORY_LOGISTICS,'warehouseLocations','recordedWarehouseLocations','archivedWarehouseLocations']};
  const departmentMetricsV6={...departmentMetrics,FINANCE:[...departmentMetrics.FINANCE,'settlementImports','approvedSettlementImports','settlementImportsWithMismatches','periodCloseSubmissions','recordedClosedPeriodSubmissions','shiftCloseSubmissions','approvedShiftCloseSubmissions'],INVENTORY_LOGISTICS:[...departmentMetrics.INVENTORY_LOGISTICS,'recordedWarehouseBalanceEvidence','recordedWarehouseMovementEvidence','recordedProcurementEvidence'],ADMIN_AFFAIRS_RECORDS:[...departmentMetrics.ADMIN_AFFAIRS_RECORDS,'recordedDeliveryEvidence','recordedRetentionEvidence','recordedDisposalEvidence'],MARKETING_GROWTH:[...departmentMetrics.MARKETING_GROWTH,'recordedPublicationEvidence','recordedAnalyticsEvidence']};
  const sourceMetrics=version=>version===2?departmentMetricsV2:version===3?departmentMetricsV3:version===4?departmentMetricsV4:version===5?departmentMetrics:version===6?departmentMetricsV6:null;
  const departmentAgents={HR:'HR_DIRECTOR',TRAINING:'TRAINING_DIRECTOR',MARINE_OPERATIONS:'MARINE_DIRECTOR',INVENTORY_LOGISTICS:'INVENTORY',FINANCE:'FINANCE_DIRECTOR',SAFETY_COMPLIANCE_RISK:'SAFETY_DIRECTOR',CUSTOMER_EXPERIENCE:'SUPPORT',MARKETING_GROWTH:'MARKETING',TECHNOLOGY_CYBERSECURITY:'CYBER_SECURITY',FACILITIES_ASSETS_MAINTENANCE:'FACILITIES_DIRECTOR',ADMIN_AFFAIRS_RECORDS:'ADMIN_DIRECTOR',EXECUTIVE_GOVERNANCE:'GOVERNANCE_DIRECTOR',RND_MARKET_INTELLIGENCE:'RESEARCH_DIRECTOR',LEGAL_CONTRACTS_INSURANCE:'LEGAL_RISK'};
  const departmentGaps={HR:'OFFICIAL_WORKFORCE_VALIDATION',TRAINING:'TRAINING_AUTHORITY_VERIFICATION',MARINE_OPERATIONS:'TRIP_RELEASE_RETURN_EVIDENCE',INVENTORY_LOGISTICS:'WAREHOUSE_PROCUREMENT_REGISTRY',FINANCE:'FINANCIAL_RECONCILIATION_CLOSE',SAFETY_COMPLIANCE_RISK:'RISK_CAPA_EFFECTIVENESS',CUSTOMER_EXPERIENCE:'CUSTOMER_OUTCOME_CONFIRMATION',MARKETING_GROWTH:'CAMPAIGN_PUBLICATION_ANALYTICS',TECHNOLOGY_CYBERSECURITY:'SECURITY_INCIDENT_RECOVERY_EVIDENCE',FACILITIES_ASSETS_MAINTENANCE:'UNIFIED_ASSET_WORK_ORDERS',ADMIN_AFFAIRS_RECORDS:'DELIVERY_RETENTION_DISPOSAL_EVIDENCE',EXECUTIVE_GOVERNANCE:'EXECUTIVE_DECISION_EXECUTION_EVIDENCE',RND_MARKET_INTELLIGENCE:'EXPERIMENT_MARKET_EVIDENCE',LEGAL_CONTRACTS_INSURANCE:'COMMERCIAL_INSURANCE_CLAIMS_REGISTRY'};
  const sourceGap=(version,code)=>version>=6&&code==='INVENTORY_LOGISTICS'?'WAREHOUSE_OPERATIONAL_EVIDENCE_VERIFICATION':version>=5&&code==='INVENTORY_LOGISTICS'?'WAREHOUSE_BALANCES_MOVEMENTS_PROCUREMENT_REGISTRY':departmentGaps[code];
  const gapLabels={WAREHOUSE_OPERATIONAL_EVIDENCE_VERIFICATION:'استكمال الوقائع والتحقق المستقل من أدلة أرصدة المستودعات والحركات والمشتريات',WAREHOUSE_BALANCES_MOVEMENTS_PROCUREMENT_REGISTRY:'ربط أرصدة المستودعات وحركات المخزون والمشتريات والموردين',OFFICIAL_WORKFORCE_VALIDATION:'التحقق الرسمي من بيانات العمل والأهلية',TRAINING_AUTHORITY_VERIFICATION:'التحقق من جهة التدريب وإصدار الشهادة',TRIP_RELEASE_RETURN_EVIDENCE:'أدلة تصريح الرحلة وتنفيذها والعودة',WAREHOUSE_PROCUREMENT_REGISTRY:'ربط سجل المستودعات والمشتريات والموردين',FINANCIAL_RECONCILIATION_CLOSE:'أدلة المطابقة المالية وإقفال الفترة',RISK_CAPA_EFFECTIVENESS:'أدلة المخاطر والتحقق من فاعلية الإجراءات التصحيحية',CUSTOMER_OUTCOME_CONFIRMATION:'دليل تحقق نتيجة معالجة العميل',CAMPAIGN_PUBLICATION_ANALYTICS:'ربط النشر الفعلي وتحليلات الحملات',SECURITY_INCIDENT_RECOVERY_EVIDENCE:'أدلة الحوادث التقنية واختبارات التعافي',UNIFIED_ASSET_WORK_ORDERS:'ربط سجل الأصول الموحد وأوامر الصيانة',DELIVERY_RETENTION_DISPOSAL_EVIDENCE:'أدلة التسليم والاحتفاظ والإتلاف',EXECUTIVE_DECISION_EXECUTION_EVIDENCE:'أدلة تنفيذ القرارات التنفيذية',EXPERIMENT_MARKET_EVIDENCE:'أدلة التجربة والسوق والنتائج',COMMERCIAL_INSURANCE_CLAIMS_REGISTRY:'ربط العقود التجارية والتأمين والمطالبات'};
  const documentLabels={templateTypes:'أنواع القوالب المسجلة',activeTemplateTypes:'أنواع القوالب النشطة',templateConflicts:'تعارضات القوالب',documents:'المستندات المسجلة بجميع حالاتها',drafts:'مسودات',pendingApproval:'بانتظار الاعتماد',approved:'مستندات معتمدة',signed:'مستندات موقعة',archived:'مستندات مؤرشفة',inconsistentLinks:'روابط مستندات غير متسقة'};
  const metricLabels={settlementImports:'ملفات التسوية المسجلة',approvedSettlementImports:'ملفات تسوية بحالة معتمدة ووقت مراجعة',settlementImportsWithMismatches:'ملفات تسوية ذات فروق مسجلة',periodCloseSubmissions:'طلبات إقفال الفترات',recordedClosedPeriodSubmissions:'طلبات إقفال بحالة مقفلة ووقت إقفال',shiftCloseSubmissions:'طلبات إقفال المناوبات',approvedShiftCloseSubmissions:'طلبات إقفال مناوبات بحالة معتمدة ووقت مراجعة',recordedWarehouseBalanceEvidence:'سجلات أدلة أرصدة مستودعات موثقة',recordedWarehouseMovementEvidence:'سجلات أدلة استلام وصرف موثقة',recordedProcurementEvidence:'سجلات أدلة مشتريات موثقة',recordedDeliveryEvidence:'سجلات أدلة تسليم موثقة',recordedRetentionEvidence:'سجلات أدلة احتفاظ موثقة',recordedDisposalEvidence:'سجلات أدلة إتلاف سابق موثقة',recordedPublicationEvidence:'سجلات أدلة نشر موثقة',recordedAnalyticsEvidence:'سجلات أدلة تحليلات موثقة',warehouseLocations:'مواقع المستودعات المسجلة بجميع حالاتها',recordedWarehouseLocations:'مواقع مستودعات مسجلة غير مؤرشفة',archivedWarehouseLocations:'مواقع مستودعات مؤرشفة',marketingCampaignDrafts:'مسودات الحملات المسجلة بجميع حالاتها',openMarketingCampaignDrafts:'مسودات حملات قابلة للتحرير',archivedMarketingCampaignDrafts:'مسودات حملات مؤرشفة',storeGoodsProducts:'منتجات المتجر المادية المسجلة',activeStoreGoodsProducts:'منتجات المتجر المادية النشطة',draftStoreGoodsProducts:'منتجات المتجر المادية المسودة',unavailableActiveStoreGoodsProducts:'منتجات مادية نشطة برصيد صفر أو أقل',negativeStockStoreGoodsProducts:'منتجات مادية برصيد مسجل سالب',marineAssets:'الأصول البحرية المسجلة للجهة',activeMarineAssets:'الأصول البحرية النشطة',marineMaintenanceRecords:'سجلات صيانة الأصول البحرية',openMarineMaintenanceRecords:'سجلات صيانة بحرية بحالة مفتوحة',recordedCompletedMarineMaintenanceRecords:'سجلات صيانة بحرية بحالة مكتملة ووقت إكمال',candidates:'المرشحون المسجلون',employments:'سجلات التوظيف',activeEmployments:'التوظيف النشط',pendingLeaves:'طلبات الإجازة قيد المراجعة',courseOffers:'عروض الدورات',activeEnrollments:'الالتحاق النشط',completedTrainingRecords:'سجلات التدريب المكتملة',certificateRecommendations:'توصيات الشهادات',trips:'الرحلات المسجلة',openTrips:'الرحلات المفتوحة',tripBookings:'حجوزات رحلات الجهة',crewAssignments:'تكليفات الطاقم',activeFinanceAccounts:'الحسابات المالية النشطة',pendingFinanceEntries:'قيود بانتظار الاعتماد',postedFinanceEntries:'القيود المرحلة',safetyChecklists:'قوائم السلامة',pendingSafetyDecisions:'قوائم تنتظر قرار السلامة',unresolvedTripIncidents:'حوادث الرحلات غير المحلولة',customerCases:'حالات العملاء',openCustomerCases:'الحالات المفتوحة أو المسندة',waitingCustomerCases:'بانتظار العميل',closedCustomerCases:'الحالات المقفلة',queuedOwnerTasks:'مهام المالك المنتظرة',runningOwnerTasks:'مهام المالك الجارية',failedOwnerTasks:'مهام المالك المتعثرة',enabledAgents:'الوكلاء المفعّلون في المنصة',administrativeRecords:'المعاملات الإدارية',pendingRoutings:'إحالات لم يُحسم قرارها',meetings:'الاجتماعات المسجلة',activeDepartments:'الإدارات المفعّلة',assessmentRevisions:'إصدارات تقييم الإدارات',pendingOfficeTasks:'مراجعات المكتب المنتظرة أو الجارية',researchInitiatives:'المبادرات البحثية',researchReviews:'المراجعات البحثية المسجلة',employmentContractVersions:'نسخ عقود العمل المسجلة',draftEmploymentContractVersions:'نسخ عقود العمل في حالة المسودة'};
  function resetSources(){uiLocale.setMessage(sourceStatus, '');sourceList.replaceChildren();sourcePanel.hidden=true;sourcePanel.open=false;}
  function renderDepartmentValues(values,agentKey){
    const code=values?.department,keys=sourceMetrics(values?.version)?.[code],scalarCounts=(x,list)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===list.length&&list.every(k=>Number.isSafeInteger(x[k])&&x[k]>=0);
    if(!values||Object.keys(values).length!==8||!keys||![2,3,4,5,6].includes(values.version)||values.scope!=='INTERNAL_PLATFORM_ORGANIZATION'||values.coverage!=='PARTIAL'||departmentAgents[code]!==agentKey||!scalarCounts(values.documents,Object.keys(documentLabels))||!scalarCounts(values.metrics,keys)||!Array.isArray(values.missingSources)||values.missingSources.length!==1||values.missingSources[0]!==sourceGap(values.version,code))throw localError(uiLocale.message('تعذر تأكيد بيانات مصدر الإدارة.'));
    if(!values.catalog||Object.keys(values.catalog).length!==2||!/^\d{4}-\d{2}-\d{2}\.\d{1,3}$/.test(values.catalog.revision)||!/^[a-f0-9]{64}$/.test(values.catalog.codesDigest))throw localError(uiLocale.message('تعذر تأكيد فهرس مصدر الإدارة.'));
    const rows=(labels,counts)=>Object.entries(labels).map(([key,label])=>uiLocale.html`<li>${label}: ${esc(counts[key])}</li>`).join('');
    const subset=values.version>=6&&['FINANCE','INVENTORY_LOGISTICS','ADMIN_AFFAIRS_RECORDS','MARKETING_GROWTH'].includes(code)?uiLocale.html`<p data-ai-source-subset>السجلات المالية وأدلة الوقائع مرتبطة بمصادرها. أعداد الأدلة الموثقة لا تساوي رصيد مخزون أو إجمالي أداء حملة أو تحققًا مستقلًا أو قبول تشغيل.</p>`:values.version<3?'':values.version>=4&&code==='MARKETING_GROWTH'?uiLocale.html`<p data-ai-source-subset>مؤشرات مسودات تخطيط الحملات فقط. لا تثبت اعتماد حملة أو نشرها أو نتائجها؛ النشر الفعلي وتحليلات الأداء ما زالت بحاجة إلى الربط.</p>`:values.version>=5&&code==='INVENTORY_LOGISTICS'?uiLocale.html`<p data-ai-source-subset>مؤشرات منتجات المتجر ومواقع المستودعات المسجلة للجهة فقط. تسجيل الموقع لا يثبت رصيدًا فعليًا أو حركة مخزون أو تصريح تشغيل. الأرصدة والحركات والمشتريات والموردون ما زالوا بحاجة إلى الربط.</p>`:code==='INVENTORY_LOGISTICS'?uiLocale.html`<p data-ai-source-subset>مؤشرات منتجات المتجر المادية المسجلة للجهة فقط. سجلات المستودعات والمشتريات والموردين ما زالت بحاجة إلى الربط.</p>`:code==='FACILITIES_ASSETS_MAINTENANCE'?uiLocale.html`<p data-ai-source-subset>مؤشرات الأصول البحرية المسجلة للجهة وصيانتها فقط. سجل المرافق والأصول الموحد وأوامر العمل ما زال بحاجة إلى الربط.</p>`:'';
    return uiLocale.html`<p>لقطة أعداد داخل جهة هيدرولاند؛ التغطية جزئية والقبول التشغيلي لم يُقيّم.</p><h6>سجل نماذج الإدارة</h6><ul>${rows(documentLabels,values.documents)}</ul>${subset}<h6>السجلات التشغيلية</h6>${keys.length?uiLocale.html`<ul>${rows(Object.fromEntries(keys.map(k=>[k,metricLabels[k]])),values.metrics)}</ul>`:uiLocale.html`<p>المصدر التشغيلي غير متصل؛ لا توجد قيمة مقاسة لهذا النطاق.</p>`}<p>المتبقي: ${uiLocale.messageHTML((values.version>=6&&code==='MARKETING_GROWTH' ? uiLocale.message('استكمال أدلة النشر والتحليلات والتحقق المستقل منها') : (value=>value===undefined?value:uiLocale.message(value))(gapLabels[sourceGap(values.version,code)])))}.</p><p>اعتماد مستند أو وجود سجل لا يثبت تنفيذ الإجراء أو إقفال الإدارة.</p>`;
  }
  const rateStatus=document.createElement('p');rateStatus.dataset.aiRateStatus='';rateStatus.setAttribute('role','status');box.querySelector('[data-ai-budget]').insertAdjacentElement('afterend',rateStatus);
  const providerRecovery=document.createElement('form');providerRecovery.dataset.aiProviderRecovery='';providerRecovery.hidden=true;
  uiLocale.setHTML(providerRecovery, uiLocale.html`<fieldset><label>سبب استكمال المزود<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت حدود المزود وسبب التوقف وأوافق على استكمال الطلبات المرفوضة قطعياً ضمن حد التشغيل</label><button type="submit">استكمال المزود بعد المراجعة</button></fieldset><p role="status" data-ai-message></p>`);
  rateStatus.insertAdjacentElement('afterend',providerRecovery);
  const reporting=document.createElement('details');reporting.hidden=true;reporting.dataset.aiReporting='';
  uiLocale.setHTML(reporting, uiLocale.html`<summary>تقارير مديري الإدارات إلى سلطان</summary><p>مديرو الإدارات الأربعة عشر يرفعون تقاريرهم إلى مكتب الحوكمة والامتثال والجودة، ثم يجمع عبدالله النتائج في تقرير موحد. هذه الدورة متاحة لمالك المنصة.</p><form data-ai-report-cycle><fieldset><label>موجز التقرير<textarea name="brief" required minlength="3" maxlength="1000" rows="3"></textarea></label><label>سبب بدء الدورة<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="sendEmail" checked>إرسال التقرير إلى بريدي الموثق بعد صياغة عبدالله</label><label><input type="checkbox" name="reviewed" required>اعتمد بدء دورة التقارير ضمن حد التشغيل المحدد؛ الاعتماد النهائي للقرارات يبقى لي</label><button type="submit">بدء دورة التقارير</button></fieldset><p role="status" data-ai-message></p></form><label>دورات التقارير<select data-ai-report-select aria-label="دورات التقارير"></select></label><button type="button" data-ai-report-refresh>تحديث التقرير</button><p role="status" data-ai-report-status></p><pre data-ai-report-text style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>`);
  box.querySelector('[data-ai-cards]').insertAdjacentElement('beforebegin',reporting);
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const evidencePanel=mountEvidencePanel(box,host,auth,access);
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin')&&!host.hidden&&box.open);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const feedback=box.querySelector('[data-ai-feedback]'),cards=box.querySelector('[data-ai-cards]'),picker=box.querySelector('[data-ai-agent-select]'),taskForm=box.querySelector('[data-ai-task-form]'),taskList=box.querySelector('[data-ai-task-list]');
  const inbox=box.querySelector('[data-ai-governance-inbox]'),inboxList=box.querySelector('[data-ai-inbox-list]'),inboxDetail=box.querySelector('[data-ai-inbox-detail]'),inboxFeedback=box.querySelector('[data-ai-inbox-feedback]');
  const inboxStatuses={NOT_STARTED:'لم تبدأ المراجعة',WAITING_FOR_REVIEW:'بانتظار المراجعة',REVIEW_IN_PROGRESS:'المراجعة جارية',CORRECTION_REQUIRED:'مطلوب تصحيح أو أدلة',EVIDENCE_REQUIRED:'نتيجة المراجعة غير مكتملة',OWNER_ESCALATION_REQUIRED:'يتطلب قرار المالك',REVIEW_STOPPED:'المراجعة متوقفة',ROUTE_DEFERRED:'إحالة المراجعة مؤجلة',INTEGRITY_REVIEW_REQUIRED:'روابط المراجعات تحتاج تحققًا',READY_FOR_OWNER:'التوصية جاهزة لقرار المالك'};
  const reviewOrder=['GOV_QUALITY_AUDIT','GOV_TECH_REVIEW','GOV_SECURITY_RISK','GOV_COMPLIANCE_POLICY','GOV_VERIFICATION','GOV_FINAL_GATE'];
  const pressure={UNAVAILABLE:'غير متاح',AVAILABLE:'متاح',BUSY:'مشغول',HIGH:'ضغط مرتفع'},operating={UNINITIALIZED:'غير مهيأ',PAUSED:'موقوف',ENABLED:'مفعّل'};
  const actions={READ_OPERATIONS:'قراءة مؤشرات العمليات المجمعة',DRAFT_MESSAGE:'مسودة رسالة',DRAFT_CAMPAIGN:'مسودة حملة',DRAFT_REPORT:'مسودة تقرير',REQUEST_HUMAN_APPROVAL:'مسودة طلب اعتماد'};
  const governanceStatuses={DRAFT_CORRECTION_QUEUED:'أُحيلت المسودة لمحاولة التصحيح الواحدة؛ الأصل محفوظ.',MANUAL_ROUTE_RESUMED:'أُحيل المخرج المحفوظ للمراجع التالي؛ التنفيذ مرتبط بحالة الوكيل والميزانية.',CORRECTION_REQUIRED:'يتطلب تصحيحًا أو استكمال أدلة؛ مسار المراجعة متوقف.',INVALID_REVIEW:'نتيجة المراجعة غير مكتملة؛ مسار المراجعة متوقف.',OWNER_ESCALATION_REQUIRED:'يتطلب قرار المالك؛ مسار المراجعة متوقف.',UNLINKED_REVIEW:'لم تثبت سلسلة المراجعات؛ لا اجتياز تلقائي.',GOVERNANCE_AGENT_UNINITIALIZED:'المراجعة مؤجلة حتى تهيئة الوكيل.',GOVERNANCE_QUEUE_FULL:'المراجعة مؤجلة لامتلاء طابور الوكيل؛ المخرج الأصلي محفوظ.',OWNER_RECOMMENDATION_READY:'اكتملت توصية المكتب وتنتظر اعتماد المالك؛ لم يصدر اعتماد نهائي.'};
  const taskStates={QUEUED:'منتظرة',RUNNING:'جارية',COMPLETED:'مكتملة',FAILED:'متعثرّة',INTERRUPTED:'منقطعة وتحتاج مراجعة',CANCELLED:'ملغاة',REVIEWED:'رُوجع التعثر دون إعادة التنفيذ'};
  const readiness={READY:'إعدادات التنفيذ مكتملة ضمن الحد المعتمد',INTEGRATION_DISABLED:'تكامل النموذج غير مفعل',PROVIDER_NOT_SELECTED:'مزود التنفيذ غير محدد',CREDENTIALS_MISSING:'بيانات اتصال المزود غير مهيأة',MODEL_NOT_SELECTED:'النموذج غير محدد',BUDGET_OR_LIMITS_MISSING:'حد التكلفة أو حدود الاستخدام غير مهيأة',PROVIDER_CONFIGURATION_INVALID:'إعداد المزود يحتاج مراجعة',BUDGET_BELOW_TASK_RESERVE:'حد اليوم أقل من الحجز المطلوب للمهمة',DAILY_BUDGET_EXHAUSTED:'بلغ الحجز حد التكلفة اليومي',WORKER_STALE:'قياس محرك التنفيذ غير متاح أو قديم'};
  const connectionReasons={PROVIDER_AUTH_FAILED:'المفتاح غير مقبول لدى المزود',PROVIDER_ACCESS_DENIED:'المفتاح لا يملك وصولًا إلى النموذج',PROVIDER_RATE_LIMITED:'حد طلبات المزود يمنع الفحص حاليًا',PROVIDER_REQUEST_FAILED:'المزود لم يقبل طلب الفحص',PROVIDER_CONNECTION_FAILED:'تعذر الاتصال بالمزود',PROVIDER_RESPONSE_INVALID:'تعذر التحقق من استجابة المزود'};
  const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ar-SA'):uiLocale.t('غير متاح');
  Object.assign(readiness,{PROVIDER_WAITING:'المهام محفوظة حتى انتهاء وقت الانتظار',PROVIDER_ACTION_REQUIRED:'حدود المزود تحتاج مراجعة قبل الاستكمال'});
  const rateReasons={PROVIDER_PACING:'تنظيم سرعة بدء المهام',PROVIDER_RATE_LIMITED:'بلغ استخدام المزود حده المؤقت',PROVIDER_OVERLOADED:'المزود مشغول مؤقتًا',PROVIDER_WAIT_REQUIRED:'المزود طلب الانتظار',PROVIDER_QUOTA_EXHAUSTED:'رصيد المزود أو حد الإنفاق يحتاج مراجعة',PROVIDER_USAGE_LIMITED:'سبب حد المزود لم يُحدد؛ يلزم التحقق',PROVIDER_DAILY_RESET_UNKNOWN:'بلغ الحد اليومي ولم يحدد المزود موعد التجدد',PROVIDER_RETRY_EXHAUSTED:'بلغت المهمة حد المحاولات المسموح',PROVIDER_RECOVERY_EXPIRED:'انتهت مدة الاستكمال التلقائي',PROVIDER_DELAY_REQUIRES_REVIEW:'تعذر تحديد موعد انتظار آمن'};
  function renderRateControl(gate){
    const active=gate&&['WAITING','ACTION_REQUIRED'].includes(gate.state);
    uiLocale.setMessage(rateStatus, (active ? uiLocale.message("{0}{1}{2}؛ المهام والنتائج المكتملة محفوظة.", [((value=>value===undefined?value:uiLocale.message(value))(rateReasons[gate.reason]) || uiLocale.message('التنفيذ مؤجل لدى المزود')), (gate.notBefore ? uiLocale.message(" · أقرب استكمال {0}", [date(gate.notBefore)]) : ''), (gate.limits?.dimension ? uiLocale.message(" · نوع الحد {0}", [gate.limits.dimension]) : '')]) : ''));
    providerRecovery.hidden=gate?.state!=='ACTION_REQUIRED'||!validId(gate?.revision);
    if(providerRecovery.dataset.revision!==gate?.revision){providerRecovery.elements.reviewed.checked=false;uiLocale.setMessage(providerRecovery.querySelector('[data-ai-message]'), '');}
    providerRecovery.dataset.revision=gate?.revision||'';
  }
  function renderProviderTask(task){
    const count=Number.isSafeInteger(task.attemptCount)?task.attemptCount:0;
    let text=count?uiLocale.html`<p>محاولات محفوظة: ${esc(count)} من 4${uiLocale.messageHTML((task.unknownCostAttempts ? uiLocale.message(" · محاولات بتكلفة غير مؤكدة: {0}", [task.unknownCostAttempts]) : ''))}</p>`:'';
    if(task.state==='QUEUED'&&task.errorCode)text+=uiLocale.html`<p data-ai-retry-wait>المهمة محفوظة للاستكمال${uiLocale.messageHTML((task.retryNotBefore ? uiLocale.message(" بعد {0}", [date(task.retryNotBefore)]) : uiLocale.message(' بعد مراجعة حدود المزود')))}؛ لا تعاد النتائج المكتملة.</p>`;
    if(task.state==='FAILED'&&!task.result&&['PROVIDER_RATE_LIMITED','PROVIDER_OVERLOADED'].includes(task.errorCode)&&count<4)text+=uiLocale.html`<form data-ai-task-decision data-key="${esc(task.id)}:PROVIDER_RETRY" data-id="${esc(task.id)}" data-revision="${esc(task.revision)}" data-target="PROVIDER_RETRY"><fieldset><label>سبب استكمال الطلب المرفوض<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت رفض المزود المؤكد وأوافق على استكماله ضمن حد المحاولات والتكلفة</label><button type="submit">استكمال الطلب المرفوض</button></fieldset><p role="status" data-ai-message></p></form>`;
    return text;
  }
  const usd=value=>Number.isFinite(value)?(value/1_000_000).toLocaleString('en',{maximumFractionDigits:6})+' USD':uiLocale.t('غير مؤكد');
  let version=0,busy=false,data=null,stale=true,fetchedAt=0,cursor=null,nextCursor=null,history=[],connectionModel=null,inboxCursor=null,inboxNext=null,inboxHistory=[],selectedWork=null,linkedWork=null;
  let selectedReport=null;
  const reportSelect=reporting.querySelector('[data-ai-report-select]'),reportStatus=reporting.querySelector('[data-ai-report-status]'),reportText=reporting.querySelector('[data-ai-report-text]');
  const reportStates={REVIEWING:'تقارير المديرين ومراجعات المكتب جارية',FORMATTING:'عبدالله يصوغ التقرير الموحد',EMAIL_PENDING:'التقرير بانتظار الإرسال إلى بريد المالك',COMPLETE:'اكتملت دورة التقرير',ATTENTION_REQUIRED:'الدورة تحتاج مراجعة'};
  function resetReporting(){selectedReport=null;reporting.hidden=true;reporting.open=false;reportSelect.replaceChildren();uiLocale.setMessage(reportStatus, '');uiLocale.setMessage(reportText, '');delete reporting.querySelector('form').dataset.requestId;}
  async function loadReports(v,s){
    if(!reporting.open||reporting.hidden)return;
    try{
      const response=await auth().authorizedFetch('/admin/agents/reporting/cycles'),payload=await body(response,v,s);
      if(!current(v,s)||!reporting.open)return;
      if(!Array.isArray(payload?.items)||payload.items.some(c=>!validId(c.id)||!reportStates[c.state]))throw localError(uiLocale.message('تعذر التحقق من قائمة التقارير.'));
      uiLocale.setHTML(reportSelect, payload.items.map(c=>uiLocale.html`<option value="${esc(c.id)}">${esc(date(c.createdAt))} · ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(reportStates[c.state]))}</option>`).join(''));
      if(payload.items.some(c=>c.id===selectedReport))reportSelect.value=selectedReport;selectedReport=reportSelect.value;
      if(!selectedReport){uiLocale.setMessage(reportStatus, uiLocale.message('لا توجد دورات تقارير محفوظة بعد.'));uiLocale.setMessage(reportText, '');return;}
      const detailResponse=await auth().authorizedFetch('/admin/agents/reporting/cycles/'+encodeURIComponent(selectedReport)),detail=await body(detailResponse,v,s);
      if(!current(v,s)||!reporting.open)return;
      if(detail?.id!==selectedReport||detail.approved!==false||!reportStates[detail.state]||!Array.isArray(detail.sources)||detail.sources.length!==14)throw localError(uiLocale.message('تعذر التحقق من التقرير.'));
      uiLocale.setMessage(reportStatus, uiLocale.message("{0}{1} · الاعتماد النهائي للقرارات للمالك.", [(value=>value===undefined?value:uiLocale.message(value))(reportStates[detail.state]), (detail.emailStatus==='PROVIDER_ACCEPTED' ? uiLocale.message(' · قَبِل مزود البريد الرسالة؛ وصولها إلى صندوق البريد لم يُتحقق منه.') : '')]));
      uiLocale.setMessage(reportText, (typeof detail.executiveTask?.result==='string' ? detail.executiveTask.result : uiLocale.message('تظهر صياغة عبدالله بعد اكتمال نتائج الإدارات ومراجعات المكتب.')));
    }catch(error){if(current(v,s)&&reporting.open){uiLocale.setMessage(reportText, '');uiLocale.setMessage(reportStatus, (localErrorMessage(error) || uiLocale.message('تعذر تحميل التقرير.')));}}
  }
  const current=(v,s)=>v===version&&s===auth()?.getSessionVersion?.()&&eligible();
  const draftMap=parent=>new Map([...parent.querySelectorAll('form[data-ai-control],form[data-ai-task-decision]')].map(f=>[f.dataset.key||f.dataset.id,{reason:f.elements.reason.value,reviewed:f.elements.reviewed.checked,revision:f.dataset.revision,target:f.dataset.target,message:f.querySelector('[data-ai-message]').textContent}]));
  function restoreDrafts(parent,drafts){for(const form of parent.querySelectorAll('form')){const draft=drafts.get(form.dataset.key||form.dataset.id);if(!draft)continue;form.elements.reason.value=draft.reason;const unchanged=form.dataset.revision===draft.revision&&form.dataset.target===draft.target;form.elements.reviewed.checked=unchanged&&draft.reviewed;uiLocale.setMessage(form.querySelector('[data-ai-message]'), (unchanged ? draft.message : (draft.reason ? uiLocale.message('تغيرت الحالة؛ راجع الإجراء قبل تأكيده.') : '')));}}
  function lock(){box.querySelectorAll('fieldset').forEach(f=>{if(!f.closest('[data-operational-evidence]'))f.disabled=busy;});box.querySelectorAll('button').forEach(b=>{if(!b.closest('[data-operational-evidence]'))b.disabled=busy;});picker.disabled=busy;box.querySelectorAll('[data-ai-enable]').forEach(b=>b.disabled=busy||stale||!data?.provider?.ready||b.dataset.allowed!=='true');box.querySelector('[data-ai-newer]').disabled=busy||!history.length;box.querySelector('[data-ai-older]').disabled=busy||!nextCursor;box.querySelector('[data-ai-inbox-newer]').disabled=busy||!inboxHistory.length;box.querySelector('[data-ai-inbox-older]').disabled=busy||!inboxNext;}
  function markStale(){stale=true;cards.querySelectorAll('[data-ai-pressure]').forEach(e=>uiLocale.setMessage(e, uiLocale.message('غير متاح — القياسات قديمة')));cards.querySelectorAll('[data-ai-count]').forEach(e=>uiLocale.setMessage(e, '—'));cards.querySelectorAll('[data-ai-performance]').forEach(e=>uiLocale.setMessage(e, uiLocale.message('قياس الأداء قديم؛ حدّث القراءة.')));lock();}
  function clear(){evidencePanel.clear();sectionPanel.hidden=true;uiLocale.setMessage(sectionStatus, '');departmentFilter.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('جميع الإدارات'));return option;})(new Option('', '')));resetSources();uiLocale.setMessage(rateStatus, '');providerRecovery.hidden=true;delete providerRecovery.dataset.revision;version++;busy=false;data=null;stale=true;cursor=nextCursor=null;history=[];connectionModel=null;uiLocale.setMessage(connection, '');resetInbox();resetReporting();cards.replaceChildren();box.querySelector('[data-ai-governance-office]').hidden=true;taskList.replaceChildren();uiLocale.setMessage(feedback, '');picker.replaceChildren();box.querySelectorAll('form').forEach(f=>f.reset());delete taskForm.dataset.requestId;box.querySelectorAll('[data-ai-message]').forEach(e=>uiLocale.setMessage(e, ''));box.querySelectorAll('[data-ai-provider],[data-ai-observed],[data-ai-budget]').forEach(e=>uiLocale.setMessage(e, ''));box.querySelector('[data-ai-tasks]').hidden=true;box.querySelector('[data-ai-initialize]').hidden=true;box.open=false;}
  // Current-view fencing must survive a role refresh that revokes permission,
  // so the central authorizer can clear the entire protected workspace.
  async function authorize(v,s){const ok=await access()?.authorizeRole?.('admin',{sessionVersion:s,isCurrent:()=>v===version&&!host.hidden&&box.open});if(!ok||!current(v,s)){if(v===version)clear();return false}return true;}
  async function body(response,v,s){const payload=await response.json().catch(()=>null);if(response.status===403&&current(v,s))await authorize(v,s);if(!response.ok)throw localError((typeof payload?.message==='string' ? payload.message : (response.status===409 ? uiLocale.message('تغيرت الحالة؛ حدّث الوكلاء وراجع الإجراء.') : uiLocale.message('تعذر إكمال إجراء الوكيل.'))));return payload;}
  function correctionChoice(){
    const allowed=['EXECUTIVE','MARKETING','SALES','SUPPORT','INVENTORY','SOCIAL'].includes(picker.value)&&['DRAFT_REPORT','DRAFT_MESSAGE','DRAFT_CAMPAIGN'].includes(taskForm.elements.action.value);
    const input=taskForm.elements.correctionPolicy;input.closest('label').hidden=!allowed;input.disabled=!allowed;if(!allowed)input.checked=false;
  }
  function taskActions(){const previous=taskForm.elements.action.value,agent=data?.items?.find(a=>a.key===picker.value);uiLocale.setHTML(taskForm.elements.action, (agent?.allowedActions||[]).map(a=>uiLocale.html`<option value="${esc(a)}">${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(actions[a]) || uiLocale.message('مهمة غير متاحة')))}</option>`).join(''));if(agent?.allowedActions?.includes(previous))taskForm.elements.action.value=previous;correctionChoice();}
  function renderPerformance(p){
    if(!p||p.period!=='ALL_RECORDED_TASKS')return uiLocale.html`<p data-ai-performance>قياس الأداء غير متاح.</p>`;
    const count=n=>Number.isSafeInteger(n)&&n>=0?esc(n):uiLocale.t('غير متاح');
    const duration=Number.isFinite(p.averageExecutionMs)&&p.averageExecutionMs>=0&&p.durationSamples>0?(p.averageExecutionMs/1000).toLocaleString('ar-SA',{maximumFractionDigits:1})+uiLocale.t(' ثانية'):uiLocale.t('غير متاح');
    return uiLocale.html`<section data-ai-performance><h6>الأداء التاريخي · جميع المهام المحفوظة</h6><dl>${[['مكتملة',count(p.completed)],['فاشلة',count(p.failed)],['منقطعة',count(p.interrupted)],['تعثر روجع',count(p.reviewed)],['ملغاة',count(p.cancelled)],['متوسط التنفيذ',esc(duration)],['عينات مدة التنفيذ',count(p.durationSamples)],['حجز تراكمي',esc(usd(p.reservedMicroUsd))],['تقدير معروف',esc(usd(p.knownEstimatedMicroUsd))],['محاولات بتكلفة غير معلومة',count(p.unknownEstimates)]].map(([label,value])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(uiLocale.message(label))}</dt><dd>${value}</dd></div>`).join('')}</dl><p>نسبة قبول النتائج: غير متاحة حتى ربط قرارات المراجعة النهائية. اكتمال المهمة لا يعني اعتماد المالك.</p><p>المدة تستثني الانتظار والمراجعات اللاحقة. الحجز والتقدير ليسا فاتورة نهائية.</p></section>`;
  }
  function renderCatalog(payload){
    const drafts=draftMap(cards),selected=picker.value;data=payload;stale=!payload.provider.ready;fetchedAt=performance.now();
    renderRateControl(payload.provider.rateControl);
    if(connectionModel!==payload.provider.model||!payload.provider.ready){connectionModel=null;uiLocale.setMessage(connection, '');}
    box.querySelector('[data-ai-governance-office]').hidden=!payload.items.some(a=>a.key==='GOV_QUALITY_AUDIT');inbox.hidden=box.querySelector('[data-ai-governance-office]').hidden;if(inbox.hidden)resetInbox();
    reporting.hidden=payload.items.filter(a=>a.reportingRole==='DEPARTMENT_DIRECTOR').length!==14;
    const sectionInfo=payload.sectionHeads;
    sectionPanel.hidden=!sectionInfo||sectionInfo.total!==83;
    sectionForm.hidden=Boolean(sectionInfo?.appointed);sectionForm.dataset.catalogVersion=sectionInfo?.catalogVersion||'';
    uiLocale.setMessage(sectionStatus, (sectionInfo ? uiLocale.message("رؤساء الأقسام: {0} · سجلات مهيأة: {1} · {2} · {3} هوية جديدة و{4} أدوار مسندة إلى الوكلاء الموجودين.", [sectionInfo.total, sectionInfo.initialized, (sectionInfo.appointed ? uiLocale.message('حُفظ التعيين') : uiLocale.message('بانتظار تسجيل التعيين')), sectionInfo.newIdentities, sectionInfo.reusedIdentities]) : ''));
    const departmentChoice=departmentFilter.value,departments=new Map(payload.items.map(agent=>[agent.departmentCode,agent.departmentName||agent.departmentCode]));
    departmentFilter.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('جميع الإدارات'));return option;})(new Option('', '')));for(const [code,label]of departments)departmentFilter.add((option=>{uiLocale.setMessage(option, label);return option;})(new Option('', code)));if(departments.has(departmentChoice))departmentFilter.value=departmentChoice;
    box.querySelector('[data-ai-initialize]').hidden=payload.initialized;box.querySelector('[data-ai-tasks]').hidden=!payload.initialized;
    uiLocale.setMessage(box.querySelector('[data-ai-provider]'), uiLocale.message("OpenAI · {0}{1}", [((value=>value===undefined?value:uiLocale.message(value))(readiness[payload.provider.reason]) || uiLocale.message('جاهزية التنفيذ غير متاحة')), (payload.provider.model ? uiLocale.message(" · النموذج: {0}", [payload.provider.model]) : '')]));
    uiLocale.setMessage(box.querySelector('[data-ai-observed]'), uiLocale.message("آخر قراءة: {0} · قياس المحرك: {1}", [date(payload.observedAt), date(payload.workerObservedAt)]));
    uiLocale.setMessage(box.querySelector('[data-ai-budget]'), (payload.budget.limitMicroUsd ? uiLocale.message("حد اليوم {0} · محجوز {1} · أقصى حجز للمهمة {2} · يوم UTC {3}؛ تقدير حسب الأسعار المعتمدة وليس فاتورة المزود.", [usd(payload.budget.limitMicroUsd), usd(payload.budget.reservedMicroUsd), usd(payload.budget.taskReserveMicroUsd), payload.budget.day]) : uiLocale.message('حد التكلفة غير مهيأ؛ التنفيذ المدفوع غير متاح.')));
    uiLocale.setHTML(cards, payload.items.map(agent=>uiLocale.html`<article data-ai-key="${esc(agent.key)}"><header><div><h5>${esc(agent.nameAr)}</h5><p>${esc(agent.departmentName||agent.departmentCode)}</p><p data-ai-hierarchy>${uiLocale.messageHTML((agent.key==='EXECUTIVE'&&agent.section ? uiLocale.message('سكرتير تنفيذي ورئيس قسم') : ((value=>value===undefined?value:uiLocale.message(value))(({DEPARTMENT_DIRECTOR:'مدير إدارة',SECTION_HEAD:'رئيس قسم',GOVERNANCE_REVIEWER:'مراجع حوكمة',EXECUTIVE_SECRETARY:'سكرتير تنفيذي',SPECIALIST:'اختصاصي'})[agent.reportingRole]) || uiLocale.message('دور تنظيمي'))))}${uiLocale.messageHTML((agent.reportsToAgentKey ? uiLocale.message(" · يرفع إلى {0}", [(payload.items.find(parent=>parent.key===agent.reportsToAgentKey)?.nameAr || uiLocale.message('مدير الإدارة'))]) : ''))}</p></div><strong>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(operating[agent.state]) || uiLocale.message('غير متاح')))}</strong></header><p data-ai-pressure>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(pressure[agent.workload]) || uiLocale.message('غير متاح')))}</p><dl>${[['running','جارية'],['queued','منتظرة'],['overdue','متأخرة'],['failed','متعثرّة دون مراجعة']].map(([key,label])=>uiLocale.html`<div><dt>${uiLocale.messageHTML(uiLocale.message(label))}</dt><dd data-ai-count>${agent.counts&&Number.isInteger(agent.counts[key])?agent.counts[key]:'—'}</dd></div>`).join('')}</dl>${renderPerformance(agent.performance)}${agent.state==='UNINITIALIZED'?uiLocale.html`<p>هيّئ سجلات الوكلاء لإدارة تشغيله.</p>`:uiLocale.html`<form data-ai-control data-key="${esc(agent.key)}" data-revision="${esc(agent.revision)}" data-target="${agent.state==='ENABLED'?'PAUSED':'ENABLED'}"><fieldset><p>${uiLocale.messageHTML((agent.state==='ENABLED' ? uiLocale.message('الإيقاف يحفظ المنتظرة ويتيح للجارية إكمال عملها.') : uiLocale.message('التشغيل يسمح ببدء المنتظرة ضمن الميزانية؛ المهام المتعثرة لا تعاد.')))}</p><label>سبب إجراء ${esc(agent.nameAr)}<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت حالة الوكيل وأثر الإجراء على مهامه</label><button type="submit" ${agent.state==='PAUSED'?`data-ai-enable data-allowed="${agent.canEnable===true}"`:''}>${uiLocale.messageHTML((agent.state==='ENABLED' ? uiLocale.message('إيقاف الوكيل') : uiLocale.message('تشغيل الوكيل')))}</button></fieldset><p role="status" data-ai-message></p></form>`}</article>`).join(''));restoreDrafts(cards,drafts);
    departmentFilter.dispatchEvent(new Event('change'));
    uiLocale.setHTML(picker, payload.items.map(a=>uiLocale.html`<option value="${esc(a.key)}">${esc(a.nameAr)}</option>`).join(''));if(payload.items.some(a=>a.key===selected))picker.value=selected;taskActions();
  }
  function renderTasks(payload){const drafts=draftMap(taskList);uiLocale.setHTML(taskList, payload.items.length?payload.items.map(task=>uiLocale.html`<article data-ai-task-id="${esc(task.id)}"><header><strong>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(taskStates[task.state]) || uiLocale.message('حالة غير متاحة')))}</strong><span>${esc(date(task.createdAt))}</span></header><p>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(actions[task.action]) || uiLocale.message('مهمة')))} · ${esc(task.language)}</p><p>${esc(task.prompt)}</p><p>${uiLocale.messageHTML((task.estimatedCostMicroUsd!==null ? uiLocale.message("التكلفة التقديرية: {0}", [usd(task.estimatedCostMicroUsd)]) : uiLocale.message('التكلفة النهائية غير مؤكدة؛ حجز التكلفة محفوظ عند بدء التنفيذ.')))}</p>${renderProviderTask(task)}${task.governanceRouting?uiLocale.html`<p data-ai-governance-status>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(governanceStatuses[task.governanceRouting.status]) || uiLocale.message('حالة مسار المراجعة تحتاج تحققًا؛ لا يصدر عنها اعتماد.')))}</p>`:''}${task.errorCode&&task.state!=='QUEUED'?uiLocale.html`<p>تحتاج المهمة مراجعة؛ لا يعاد طلب النموذج تلقائيًا.</p>`:''}${task.result?uiLocale.html`<p>${uiLocale.messageHTML((task.approvalRequired ? uiLocale.message('مسودة تتطلب قرارًا بشريًا مستقلًا قبل أي إرسال أو تنفيذ.') : uiLocale.message('قراءة معلومات فقط؛ لم تُنفذ تغييرات.')))}</p><pre>${esc(task.result)}</pre>`:''}${task.state==='COMPLETED'&&['GOVERNANCE_QUEUE_FULL','GOVERNANCE_AGENT_UNINITIALIZED'].includes(task.governanceRouting?.status)?uiLocale.html`<form data-ai-task-decision data-id="${esc(task.id)}" data-revision="${esc(task.revision)}" data-target="RESUME_GOVERNANCE"><fieldset><label>سبب استئناف الإحالة<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت المخرج والمراجعات السابقة وأوافق على إحالتها إلى OpenAI ضمن السقف اليومي</label><button type="submit">استئناف إحالة المراجعة</button></fieldset><p role="status" data-ai-message></p></form>`:''}${task.state==='COMPLETED'&&['QUEUE_FULL','AGENT_UNINITIALIZED'].includes(task.governanceRouting?.draftCorrection?.status)?uiLocale.html`<form data-ai-task-decision data-id="${esc(task.id)}" data-revision="${esc(task.revision)}" data-target="RESUME_DRAFT_CORRECTION"><fieldset><label>سبب استكمال التصحيح<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت إذن التصحيح والمخرج والملاحظات وأوافق على إرسالها إلى OpenAI ضمن السقف اليومي</label><button type="submit">استكمال محاولة التصحيح المأذونة</button></fieldset><p role="status" data-ai-message></p></form>`:''}${['QUEUED','FAILED','INTERRUPTED'].includes(task.state)?uiLocale.html`<form data-ai-task-decision data-id="${esc(task.id)}" data-revision="${esc(task.revision)}" data-target="${task.state==='QUEUED'?'CANCEL':'ACKNOWLEDGE'}"><fieldset><label>سبب قرار المهمة<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت حالة المهمة؛ القرار لا يعيد التنفيذ</label><button type="submit">${uiLocale.messageHTML((task.state==='QUEUED' ? uiLocale.message('إلغاء المهمة المنتظرة') : uiLocale.message('حفظ مراجعة التعثر')))}</button></fieldset><p role="status" data-ai-message></p></form>`:''}</article>`).join(''):uiLocale.html`<p>لا توجد مهام محفوظة لهذا الوكيل.</p>`);restoreDrafts(taskList,drafts);nextCursor=payload.nextCursor||null;}
  const validId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const inboxCost=cost=>Number.isSafeInteger(cost?.estimatedMicroUsd)&&cost.estimatedMicroUsd>=0?usd(cost.estimatedMicroUsd):uiLocale.t('غير مكتملة');
  function resetInbox(){inboxCursor=inboxNext=selectedWork=linkedWork=null;inboxHistory=[];inboxList.replaceChildren();inboxDetail.replaceChildren();uiLocale.setMessage(inboxFeedback, '');inbox.open=false;}
  function renderOperationsEvidence(evidence,agentKey){
    if(evidence===null||evidence===undefined)return '';
    if(['NOT_RECORDED','INVALID'].includes(evidence.status))return uiLocale.html`<p data-ai-inbox-evidence>لم تثبت لقطة المؤشرات لهذا المخرج؛ يلزم استكمال الدليل.</p>`;
    if(evidence.status==='RECORDED'&&['DEPARTMENT_AGGREGATE_V2','DEPARTMENT_AGGREGATE_V3','DEPARTMENT_AGGREGATE_V4','DEPARTMENT_AGGREGATE_V5','DEPARTMENT_AGGREGATE_V6'].includes(evidence.scope)){if(evidence.values?.version!==(evidence.scope==='DEPARTMENT_AGGREGATE_V2'?2:evidence.scope==='DEPARTMENT_AGGREGATE_V3'?3:evidence.scope==='DEPARTMENT_AGGREGATE_V4'?4:evidence.scope==='DEPARTMENT_AGGREGATE_V5'?5:6)||!Number.isFinite(Date.parse(evidence.observedAt)))throw localError(uiLocale.message('تعذر تأكيد وقت مصدر الإدارة.'));return uiLocale.html`<section data-ai-inbox-evidence><h6>مصادر الإدارة المستخدمة في التقرير</h6><p>وقت القراءة: ${esc(date(evidence.observedAt))}</p>${renderDepartmentValues(evidence.values,agentKey)}</section>`;}
    const labels={pendingReviews:'المراجعات المعلقة',openTrips:'الرحلات المفتوحة',activeBookings:'الحجوزات النشطة',pendingOrganizations:'الجهات بانتظار المراجعة'},values=evidence.values;
    if(evidence.status!=='RECORDED'||!Number.isFinite(Date.parse(evidence.observedAt))||!values||Object.keys(values).length!==4||Object.keys(labels).some(key=>!Number.isSafeInteger(values[key])||values[key]<0))throw localError(uiLocale.message('تعذر تأكيد دليل المؤشرات.'));
    return uiLocale.html`<section data-ai-inbox-evidence><h6>المؤشرات المستخدمة في التقرير</h6><p>وقت القراءة: ${esc(date(evidence.observedAt))}</p><ul>${Object.entries(labels).map(([key,label])=>uiLocale.html`<li>${uiLocale.messageHTML(uiLocale.message(label))}: ${esc(values[key])}</li>`).join('')}</ul></section>`;
  }
  function renderDraftCorrection(c){
    if(c===null||c===undefined)return '';
    if(c.status==='INTEGRITY_REVIEW_REQUIRED')return uiLocale.html`<p data-ai-inbox-correction>تعذر تأكيد رابط التصحيح؛ الأصل محفوظ ويحتاج مراجعة.</p>`;
    if(c.status!=='LINKED'||!validId(c.taskId)||!taskStates[c.state])throw localError(uiLocale.message('تعذر تأكيد رابط محاولة التصحيح.'));
    return uiLocale.html`<aside data-ai-inbox-correction><p>محاولة تصحيح نصي واحدة: ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(taskStates[c.state]))}. الأصل والمراجعات محفوظة؛ تكلفة المسودة الجديدة ومراجعاتها في ملفها المنفصل.</p>${c.state==='COMPLETED'?uiLocale.html`<button type="button" data-ai-correction-file="${esc(c.taskId)}">عرض ملف المسودة المصححة</button>`:''}</aside>`;
  }
  async function openCorrectionFile(id){
    if(busy||!eligible()||!validId(id))return;const v=++version,s=auth()?.getSessionVersion?.();busy=true;inboxDetail.replaceChildren();lock();
    try{if(!await authorize(v,s))return;const response=await auth().authorizedFetch('/admin/agents/governance-reviews/'+encodeURIComponent(id)),file=await body(response,v,s);if(current(v,s)&&inbox.open){selectedWork=linkedWork=id;renderInboxDetail(file);}}
    catch(error){if(current(v,s)){selectedWork=linkedWork=null;inboxDetail.replaceChildren();uiLocale.setMessage(inboxFeedback, (localErrorMessage(error) || uiLocale.message('تعذر قراءة ملف التصحيح.')));}}
    finally{if(current(v,s)){busy=false;lock();}}
  }
  function renderInboxDetail(file){
    if(file?.status==='READY_FOR_OWNER'&&file.source?.action==='READ_OPERATIONS'&&file.source?.operationsEvidence?.status!=='RECORDED')throw localError(uiLocale.message('تعذر تأكيد دليل المؤشرات.'));
    if(file?.scope!=='ADVISORY_RUNTIME_OUTPUTS'||file.readOnly!==true||file.approved!==false||file.source?.id!==selectedWork||!validId(file.source?.revision)||!Array.isArray(file.reviews)||file.reviews.length!==6||file.reviews.some((r,i)=>r.agentKey!==reviewOrder[i])||!inboxStatuses[file.status])throw localError(uiLocale.message('تعذر تأكيد روابط ملف المراجعة.'));
    uiLocale.setHTML(inboxDetail, uiLocale.html`<h5>تفاصيل ملف المراجعة</h5><p data-ai-inbox-status>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(inboxStatuses[file.status]))} · المراجعات المجتازة ${esc(file.completedReviews)} من 6</p><p>${uiLocale.messageHTML((file.ownerApprovalRequired ? uiLocale.message('التوصية تحتاج قرار المالك؛ لم يصدر اعتماد نهائي.') : uiLocale.message('استكمال المراجعة والمعالجة لدى الجهة المختصة.')))}</p><p>التكلفة التقديرية المسجلة: ${esc(inboxCost(file.cost))}</p><p>مرجع المصدر: ${esc(file.source.id)} · ${esc(file.source.departmentName)} · ${esc(date(file.source.createdAt))}</p><details open><summary>المصدر والمخرج الأصلي</summary><pre>${esc(file.source.prompt)}</pre><pre>${esc(file.source.result)}</pre></details>${renderOperationsEvidence(file.source.operationsEvidence,file.source.agentKey)}${renderDraftCorrection(file.draftCorrection)}<div class="hl-ai-inbox-stages">${file.reviews.map(stage=>uiLocale.html`<article data-ai-inbox-stage="${esc(stage.agentKey)}"><h6>${esc(stage.nameAr)}</h6><p>${uiLocale.messageHTML((stage.state==='NOT_STARTED' ? uiLocale.message('لم تبدأ') : ((value=>value===undefined?value:uiLocale.message(value))(taskStates[stage.state]) || uiLocale.message('تحتاج تحققًا'))))}</p>${stage.review?.findings?.length?uiLocale.html`<p>الملاحظات</p><ul>${stage.review.findings.map(x=>uiLocale.html`<li>${esc(x)}</li>`).join('')}</ul>`:''}${stage.review?.evidenceGaps?.length?uiLocale.html`<p>الأدلة الناقصة</p><ul>${stage.review.evidenceGaps.map(x=>uiLocale.html`<li>${esc(x)}</li>`).join('')}</ul>`:''}${stage.result?uiLocale.html`<details><summary>نص المراجعة المحفوظ</summary><pre>${esc(stage.result)}</pre></details>`:''}${stage.taskId?uiLocale.html`<p>مرجع المراجعة: ${esc(stage.taskId)}</p>`:''}</article>`).join('')}</div>`);
  }
  async function loadInbox(v,s){
    if(inbox.hidden||!inbox.open)return;
    inboxList.replaceChildren();inboxDetail.replaceChildren();uiLocale.setMessage(inboxFeedback, uiLocale.message('جارٍ تحميل ملفات المراجعة…'));
    try{
      const response=await auth().authorizedFetch('/admin/agents/governance-reviews'+(inboxCursor?'?cursor='+encodeURIComponent(inboxCursor):'')),payload=await body(response,v,s);
      if(!current(v,s)||!inbox.open)return;
      if(payload?.scope!=='ADVISORY_RUNTIME_OUTPUTS'||payload.readOnly!==true||!Array.isArray(payload.items)||payload.items.some(x=>!validId(x.source?.id)||x.approved!==false||!inboxStatuses[x.status])||payload.nextCursor!==null&&!validId(payload.nextCursor))throw localError(uiLocale.message('استجابة ملفات المراجعة غير مكتملة.'));
      inboxNext=payload.nextCursor;if(selectedWork&&selectedWork!==linkedWork&&!payload.items.some(file=>file.source.id===selectedWork))selectedWork=null;
      uiLocale.setHTML(inboxList, payload.items.length?payload.items.map(file=>uiLocale.html`<article><h6>${esc(file.source.nameAr)} · ${esc(file.source.departmentName)}</h6><p>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(inboxStatuses[file.status]))} · ${esc(file.completedReviews)} من 6 · ${esc(date(file.source.createdAt))}</p><p>التكلفة التقديرية المسجلة: ${esc(inboxCost(file.cost))}</p><button type="button" data-ai-inbox-work="${esc(file.source.id)}">عرض الملف ${esc(file.source.id.slice(0,8))}</button></article>`).join(''):uiLocale.html`<p>لا توجد مخرجات مكتملة للوكلاء لعرض مراجعاتها.</p>`);
      uiLocale.setMessage(inboxFeedback, uiLocale.message('تم تحميل ملفات المراجعة من السجل المحفوظ.'));
      if(selectedWork){const detail=await auth().authorizedFetch('/admin/agents/governance-reviews/'+encodeURIComponent(selectedWork)),file=await body(detail,v,s);if(current(v,s)&&inbox.open)renderInboxDetail(file);}
    }catch(error){if(current(v,s)&&inbox.open){inboxList.replaceChildren();inboxDetail.replaceChildren();inboxNext=null;uiLocale.setMessage(inboxFeedback, (localErrorMessage(error) || uiLocale.message('تعذر تحميل ملفات المراجعة.')));}}
  }
  async function loadTasks(v,s){const key=picker.value;if(!key||!data?.initialized){taskList.replaceChildren();return;}const response=await auth().authorizedFetch('/admin/agents/'+encodeURIComponent(key)+'/tasks'+(cursor?'?cursor='+encodeURIComponent(cursor):'')),payload=await body(response,v,s);if(!current(v,s)||picker.value!==key)return;if(!Array.isArray(payload?.items))throw localError(uiLocale.message('استجابة المهام غير مكتملة.'));renderTasks(payload);}
  async function load({background=false}={}){if(!eligible())return;if(!background)resetSources();const v=++version,s=auth()?.getSessionVersion?.();busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ تحميل حالة الوكلاء…'));lock();try{if(!await authorize(v,s))return;const response=await auth().authorizedFetch('/admin/agents'),payload=await body(response,v,s);if(!current(v,s))return;if(!Array.isArray(payload?.items)||!payload.provider||!payload.budget||typeof payload.initialized!=='boolean')throw localError(uiLocale.message('استجابة الوكلاء غير مكتملة.'));renderCatalog(payload);await loadTasks(v,s);await loadInbox(v,s);await loadReports(v,s);if(current(v,s))uiLocale.setMessage(feedback, uiLocale.message('تم تحميل حالة الوكلاء من الخادم.'));}catch(error){if(current(v,s)){resetSources();uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تحميل الوكلاء.')));markStale();}}finally{if(current(v,s)){busy=false;lock();}}}
  async function checkSources(){
    if(busy||!eligible())return;const v=++version,s=auth()?.getSessionVersion?.();busy=true;resetSources();sourcePanel.hidden=false;sourcePanel.open=true;uiLocale.setMessage(sourceStatus, uiLocale.message('جارٍ قراءة مصادر الإدارات دون توليد أو تغيير السجلات…'));lock();
    try{
      if(!await authorize(v,s))return;
      const response=await auth().authorizedFetch('/admin/agents/department-sources'),payload=await body(response,v,s);if(!current(v,s)||!sourcePanel.open)return;
      if(payload?.scope!=='DEPARTMENT_SOURCE_PREVIEW'||payload.readOnly!==true||payload.generationTested!==false||payload.operationalAcceptance!=='NOT_ASSESSED'||payload.coverage!=='PARTIAL'||!Number.isFinite(Date.parse(payload.observedAt))||!Array.isArray(payload.departments)||payload.departments.length!==14||new Set(payload.departments.map(d=>d.department)).size!==14)throw localError(uiLocale.message('تعذر تأكيد فحص مصادر الإدارات.'));
      const version=payload.sourceVersion??2,metrics=sourceMetrics(version);if(!metrics)throw localError(uiLocale.message('تعذر تأكيد نسخة مصادر الإدارات.'));
      const html=payload.departments.map(d=>{
        if(!metrics[d.department]||departmentAgents[d.department]!==d.agentKey||!['ACTIVE','INACTIVE','NOT_CONFIGURED'].includes(d.unitState)||d.operationalCountsConnected!==(metrics[d.department].length>0)||d.unitState==='ACTIVE'&&d.evidence?.version!==version)throw localError(uiLocale.message('تعذر تأكيد نطاق مصدر الإدارة.'));
        const content=d.unitState==='ACTIVE'?renderDepartmentValues(d.evidence,d.agentKey):d.evidence===null?uiLocale.html`<p>الإدارة غير مفعّلة في الهيكل الداخلي؛ لم تُقرأ مؤشرات تشغيلية.</p>`:null;if(content===null)throw localError(uiLocale.message('تعذر تأكيد حالة مصدر الإدارة.'));
        return uiLocale.html`<details data-ai-source-department="${esc(d.department)}"><summary>${esc(d.nameAr)} · تغطية جزئية</summary>${content}</details>`;
      }).join('');
      uiLocale.setHTML(sourceList, html);uiLocale.setMessage(sourceStatus, uiLocale.message("قراءة {0} · 14 إدارة؛ لم يُستدعَ النموذج ولم تتغير سجلات الأعمال. هذه قراءة حالية مستقلة عن مصادر التقارير السابقة.", [date(payload.observedAt)]));
    }catch(error){if(current(v,s)){sourceList.replaceChildren();uiLocale.setMessage(sourceStatus, (localErrorMessage(error) || uiLocale.message('تعذر فحص مصادر الإدارات.')));}}
    finally{if(current(v,s)){busy=false;lock();}}
  }
  async function checkConnection(){
    if(busy||!eligible())return;const v=++version,s=auth()?.getSessionVersion?.();busy=true;connectionModel=null;uiLocale.setMessage(connection, uiLocale.message('جارٍ فحص الاتصال دون توليد نص أو تشغيل أي وكيل…'));lock();
    try{
      if(!await authorize(v,s))return;
      const response=await auth().authorizedFetch('/admin/agents/provider-connection'),payload=await body(response,v,s);if(!current(v,s))return;
      if(payload?.scope!=='MODEL_ACCESS_ONLY'||payload.generationTested!==false||typeof payload.connected!=='boolean'||!Number.isFinite(Date.parse(payload.checkedAt)))throw localError(uiLocale.message('تعذر تأكيد نتيجة فحص الاتصال.'));
      connectionModel=payload.model;
      const verified=payload.connected&&payload.reason==='MODEL_ACCESS_VERIFIED';
      uiLocale.setMessage(connection, uiLocale.message("آخر فحص {0} · {1}؛ لم يُختبر التوليد أو الرصيد.", [date(payload.checkedAt), (verified ? uiLocale.message('نجح فحص المفتاح وإتاحة النموذج') : (((value=>value===undefined?value:uiLocale.message(value))(connectionReasons[payload.reason]) || (value=>value===undefined?value:uiLocale.message(value))(readiness[payload.reason])) || uiLocale.message('تعذر التحقق من الاتصال')))]));
    }catch(error){if(current(v,s))uiLocale.setMessage(connection, (localErrorMessage(error) || uiLocale.message('تعذر فحص الاتصال.')));}
    finally{if(current(v,s)){busy=false;lock();}}
  }
  async function mutate(form,path,payload,method,success){const v=version,s=auth()?.getSessionVersion?.(),message=form.querySelector('[data-ai-message]');busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ إجراء الوكيل…'));uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ الإجراء…'));lock();try{if(!await authorize(v,s)||!form.isConnected)return;const response=await auth().authorizedFetch(path,{method,body:JSON.stringify(payload)}),saved=await body(response,v,s);if(!current(v,s)||!form.isConnected)return;if(path.endsWith('/provider-recovery')?saved?.id!==payload.expectedRevision||saved?.resumed!==true:path.endsWith('/provider-retry')?saved?.id!==form.dataset.id||saved?.state!=='QUEUED'||saved?.resumed!==true:path.endsWith('/section-head-appointments')?saved?.appointed!==true||saved?.sectionCount!==83||saved?.catalogVersion!==payload.catalogVersion:path.endsWith('/initialize')?!saved?.initialized:path.endsWith('/control')?saved?.key!==form.dataset.key||saved?.state!==payload.state:path.endsWith('/governance-resume')?saved?.id!==form.dataset.id||typeof saved?.resumed!=='boolean'||typeof saved?.reviewTaskId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.reviewTaskId):path.endsWith('/draft-correction')?saved?.id!==form.dataset.id||!validId(saved?.correctionTaskId):!saved?.id)throw localError(uiLocale.message('تعذر تأكيد الحفظ؛ حدّث الوكلاء للتحقق.'));if(form.matches('[data-ai-report-cycle]'))selectedReport=saved.id;form.reset();delete form.dataset.requestId;uiLocale.setMessage(message, '');cursor=null;history=[];const refreshedVersion=version+1;await load();if(version===refreshedVersion&&eligible())uiLocale.setMessage(feedback, success);}catch(error){if(current(v,s)&&form.isConnected)uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر حفظ الإجراء.')));}finally{if(current(v,s)){busy=false;lock();}}}
  box.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();if(busy||!eligible())return;const form=event.target,values=Object.fromEntries(new FormData(form)),reason=String(values.reason||'').trim(),reviewed=values.reviewed==='on';if(!reviewed||reason.length<5)return;
    if(form===sectionForm){void mutate(form, '/admin/agents/section-head-appointments', {catalogVersion:form.dataset.catalogVersion,enableNewHeads:values.enableNewHeads==='on',reason,reviewed}, 'POST', uiLocale.message('حُفظ تعيين رؤساء الأقسام وتبعيتهم لمديري الإدارات.'));return;}
    if(form.matches('[data-ai-report-cycle]')){const requestId=form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID());void mutate(form, '/admin/agents/reporting/cycles', {requestId,brief:values.brief,sendEmail:values.sendEmail==='on',reason,reviewed}, 'POST', uiLocale.message('بدأت دورة تقارير الإدارات؛ التنفيذ مرتبط بجاهزية الوكلاء وحد التشغيل.'));return;}
    if(form===providerRecovery){void mutate(form, '/admin/agents/provider-recovery', {expectedRevision:form.dataset.revision,reason,reviewed}, 'POST', uiLocale.message('حُفظت مراجعة حدود المزود؛ استكمال المهام مرتبط بحالة الوكلاء والميزانية.'));return;}
    if(form.matches('[data-ai-task-decision]')&&form.dataset.target==='PROVIDER_RETRY'){void mutate(form, '/admin/agents/tasks/'+encodeURIComponent(form.dataset.id)+'/provider-retry', {expectedRevision:form.dataset.revision,reason,reviewed}, 'POST', uiLocale.message('حُفظ الطلب نفسه للاستكمال بعد رفض مؤكد؛ بقيت المحاولات والتكلفة محفوظة.'));return;}
    if(form.matches('[data-ai-initialize]')){void mutate(form, '/admin/agents/initialize', {reason,reviewed}, 'POST', uiLocale.message('تمت تهيئة الوكلاء في وضع الإيقاف.'));return;}
    if(form.matches('[data-ai-control]')){void mutate(form, '/admin/agents/'+encodeURIComponent(form.dataset.key)+'/control', {state:form.dataset.target,expectedRevision:form.dataset.revision,reason,reviewed}, 'PATCH', (form.dataset.target==='PAUSED' ? uiLocale.message('أُوقف بدء مهام الوكيل؛ الجارية تكمل والمنتظرة محفوظة.') : uiLocale.message('فُعّل الوكيل للمهام المنتظرة ضمن حدود التنفيذ.')));return;}
    if(form===taskForm){const requestId=form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID());void mutate(form, '/admin/agents/'+encodeURIComponent(picker.value)+'/tasks', {action:values.action,language:values.language,prompt:values.prompt,requestId,reason,reviewed,...(values.correctionPolicy==='on'?{correctionPolicy:'ONE_DRAFT_REVISION_V1'}:{})}, 'POST', uiLocale.message('حُفظت المهمة في الانتظار؛ التنفيذ مرتبط بحالة الوكيل والمزود والميزانية.'));return;}
    if(form.matches('[data-ai-task-decision]')&&form.dataset.target==='RESUME_DRAFT_CORRECTION'){void mutate(form, '/admin/agents/tasks/'+encodeURIComponent(form.dataset.id)+'/draft-correction', {expectedRevision:form.dataset.revision,reason,reviewed}, 'POST', uiLocale.message('حُفظت محاولة التصحيح المأذونة؛ بقي الأصل والمراجعات محفوظة.'));return;}
    if(form.matches('[data-ai-task-decision]')&&form.dataset.target==='RESUME_GOVERNANCE'){void mutate(form, '/admin/agents/tasks/'+encodeURIComponent(form.dataset.id)+'/governance-resume', {expectedRevision:form.dataset.revision,reason,reviewed}, 'POST', uiLocale.message('حُفظت إحالة المراجعة من المخرج السابق؛ لم يُعَد توليد المصدر.'));return;}
    if(form.matches('[data-ai-task-decision]'))void mutate(form, '/admin/agents/tasks/'+encodeURIComponent(form.dataset.id)+'/decision', {action:form.dataset.target,expectedRevision:form.dataset.revision,reason,reviewed}, 'PATCH', uiLocale.message('حُفظ قرار المهمة دون إعادة تنفيذها.'));
  });
  taskForm.addEventListener('input',()=>delete taskForm.dataset.requestId);taskForm.addEventListener('change',event=>{delete taskForm.dataset.requestId;if(event.target.name==='action'){taskForm.elements.correctionPolicy.checked=false;correctionChoice();}});
  picker.addEventListener('change',()=>{if(busy)return;taskForm.elements.correctionPolicy.checked=false;delete taskForm.dataset.requestId;cursor=null;history=[];taskList.replaceChildren();taskActions();void load();});
  box.querySelector('[data-ai-refresh]').addEventListener('click',()=>{if(!busy)void load();});
  reporting.addEventListener('toggle',()=>{if(reporting.open&&eligible()&&!busy)void load();else if(!reporting.open){uiLocale.setMessage(reportText, '');uiLocale.setMessage(reportStatus, '');}});
  reporting.querySelector('[data-ai-report-refresh]').addEventListener('click',()=>{if(!busy)void load();});
  reportSelect.addEventListener('change',()=>{selectedReport=reportSelect.value;if(!busy)void load();});
  reporting.querySelector('form').addEventListener('input',()=>delete reporting.querySelector('form').dataset.requestId);
  checkButton.addEventListener('click',()=>void checkConnection());
  sourceButton.addEventListener('click',()=>void checkSources());
  sourcePanel.addEventListener('toggle',()=>{if(!sourcePanel.open){sourceList.replaceChildren();uiLocale.setMessage(sourceStatus, '');sourcePanel.hidden=true;}});
  box.querySelector('[data-ai-older]').addEventListener('click',()=>{if(!busy&&nextCursor){history.push(cursor);cursor=nextCursor;void load();}});
  box.querySelector('[data-ai-newer]').addEventListener('click',()=>{if(!busy&&history.length){cursor=history.pop();void load();}});
  inbox.addEventListener('toggle',()=>{if(inbox.open&&eligible())void load();else if(!inbox.open){inboxList.replaceChildren();inboxDetail.replaceChildren();uiLocale.setMessage(inboxFeedback, '');selectedWork=linkedWork=null;}});
  box.querySelector('[data-ai-inbox-refresh]').addEventListener('click',()=>{if(!busy)void load();});
  inboxDetail.addEventListener('click',event=>{const button=event.target.closest('[data-ai-correction-file]');if(button)void openCorrectionFile(button.dataset.aiCorrectionFile);});
  inboxList.addEventListener('click',event=>{const button=event.target.closest('[data-ai-inbox-work]');if(!busy&&button){linkedWork=null;selectedWork=button.dataset.aiInboxWork;void load();}});
  box.querySelector('[data-ai-inbox-older]').addEventListener('click',()=>{if(!busy&&inboxNext){inboxHistory.push(inboxCursor);inboxCursor=inboxNext;selectedWork=linkedWork=null;void load();}});
  box.querySelector('[data-ai-inbox-newer]').addEventListener('click',()=>{if(!busy&&inboxHistory.length){inboxCursor=inboxHistory.pop();selectedWork=linkedWork=null;void load();}});
  box.addEventListener('toggle',()=>{if(box.open)void load();else{evidencePanel.clear();resetSources();version++;busy=false;resetInbox();taskList.replaceChildren();taskForm.reset();delete taskForm.dataset.requestId;cards.querySelectorAll('form').forEach(f=>f.reset());box.querySelectorAll('[data-ai-message]').forEach(e=>uiLocale.setMessage(e, ''));}});
  document.addEventListener('hydroland:workspace-selected',event=>{if(event.detail?.target!==host)clear();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.()||!access()?.roleAllowed?.('admin'))clear();});
  setInterval(()=>{if(!eligible()||document.visibilityState!=='visible')return;if(data&&performance.now()-fetchedAt+(Date.parse(data.observedAt)-Date.parse(data.workerObservedAt||''))>data.metricsMaxAgeSeconds*1000)markStale();if(!busy)void load({background:true});},15000);
  window.HydrolandAdminAgentWorkforce=Object.freeze({open(){const wasOpen=box.open;box.open=true;if(wasOpen)void load();},reload:load});
  return true;
 };
 if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();

