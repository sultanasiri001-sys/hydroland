(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("role-dashboards", {
  "DIVE PROFESSIONALS · محترفي الغوص": "DIVE PROFESSIONALS",
  "لوحة محترفي الغوص": "Dive professional dashboard",
  "إدارة التدريب والطلاب والجدول والشهادات والإيرادات من مساحة واحدة.": "Manage training, students, schedules, certificates and earnings in one place.",
  "طلاب نشطون": "Active students",
  "جلسات اليوم": "Today's sessions",
  "شهادات جاهزة": "Certificates ready",
  "تقييم المدرب": "Instructor rating",
  "الرئيسية": "Home",
  "إدارة الدورات": "Manage courses",
  "الطلاب": "Students",
  "الجدول الزمني": "Schedule",
  "التقييمات": "Assessments",
  "الشهادات": "Certificates",
  "الإيرادات": "Earnings",
  "إدارة الطلاب": "Manage students",
  "جدول التدريب": "Training schedule",
  "تقييم المهارات": "Skills assessment",
  "إصدار الشهادات": "Issue certificates",
  "جلسات التدريب": "Training sessions",
  "من النظام": "From the system",
  "الطلاب بانتظار التقييم": "Students awaiting assessment",
  "شهادات بانتظار الاعتماد": "Certificates awaiting approval",
  "يعرض النظام الجلسات المؤكدة والمواقع والطلاب عند توفر البيانات.": "The system shows confirmed sessions, locations and students when data is available.",
  "المواد التدريبية": "Training materials",
  "إدارة مواد الدورة والتقييمات": "Manage course materials and assessments",
  "سجل الحضور": "Attendance record",
  "توثيق الحضور والمهارات": "Record attendance and skills",
  "الملف المهني": "Professional profile",
  "الشهادات والاعتمادات والتقييمات": "Certificates, accreditations and reviews",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "تشغيل مركز الغوص": "Dive center operations",
  "تشغيل الحجوزات والرحلات والمعدات ومحترفي الغوص والتقارير والملف التجاري.": "Operate bookings, trips, equipment, dive professionals, reports and the business profile.",
  "حجوزات بانتظار التأكيد": "Bookings awaiting confirmation",
  "رحلات اليوم": "Today's trips",
  "أعضاء نشطون": "Active members",
  "إجمالي الرحلات": "Total trips",
  "إدارة الحجوزات": "Manage bookings",
  "الرحلات": "Trips",
  "المتجر والعروض": "Store and offers",
  "المعدات والمخزون": "Equipment and inventory",
  "محترفي الغوص": "Dive professionals",
  "التدريب والدورات": "Training and courses",
  "العملاء": "Customers",
  "المستندات والتراخيص": "Documents and licenses",
  "السلامة": "Safety",
  "ورديات المحاسب": "Cashier shifts",
  "الذمم والتحصيل": "Receivables and collections",
  "التقارير": "Reports",
  "الملف التجاري": "Business profile",
  "إدارة الرحلات": "Manage trips",
  "المخزون والمعدات": "Inventory and equipment",
  "الطاقم والمدربين": "Crew and instructors",
  "تقارير السلامة": "Safety reports",
  "تقارير الحجوزات والمدفوعات": "Booking and payment reports",
  "الحجوزات المؤكدة": "Confirmed bookings",
  "فحوص المعدات": "Equipment checks",
  "تشغيل اليوم": "Today's operations",
  "الحجوزات والرحلات وحالة الجاهزية تظهر من بيانات التشغيل المتصلة.": "Bookings, trips and readiness status appear from connected operating data.",
  "التوفر والصيانة والاستئجار": "Availability, maintenance and rental",
  "المدربين والجداول والتكليفات": "Instructors, schedules and assignments",
  "الوثائق والتراخيص والتقييمات": "Documents, licenses and reviews",
  "MARINE BROKERAGE · الوساطة البحرية": "MARINE BROKERAGE",
  "لوحة الوساطة البحرية": "Marine brokerage dashboard",
  "إدارة القوارب والرحلات والحجوزات والصيانة والطاقم والتراخيص والخدمات الفنية.": "Manage boats, trips, bookings, maintenance, crew, licenses and technical services.",
  "قوارب نشطة": "Active boats",
  "رحلات مجدولة": "Scheduled trips",
  "أعمال صيانة مفتوحة": "Open maintenance jobs",
  "حجوزات مؤكدة": "Confirmed bookings",
  "إدارة القوارب": "Manage boats",
  "الرحلات والحجوزات": "Trips and bookings",
  "الطاقم": "Crew",
  "الجدولة والتقويم": "Scheduling and calendar",
  "الصيانة والمعدات": "Maintenance and equipment",
  "السلامة واللوائح": "Safety and regulations",
  "الطقس وحالة البحر": "Weather and sea conditions",
  "المالية والفواتير": "Finance and invoices",
  "التسويق والعروض": "Marketing and offers",
  "إنشاء رحلة": "Create a trip",
  "إدارة الطاقم": "Manage crew",
  "سجل الصيانة": "Maintenance log",
  "حالة البحر والطقس": "Sea conditions and weather",
  "فحص قبل الإبحار": "Pre-departure inspection",
  "الصيانة القادمة": "Upcoming maintenance",
  "التراخيص والوثائق": "Licenses and documents",
  "حالة الأسطول": "Fleet status",
  "يعرض النظام القوارب وحالة الجاهزية والصيانة والرحلات عند توفر البيانات.": "The system shows boats, readiness, maintenance and trips when data is available.",
  "الخدمات الفنية": "Technical services",
  "فنيون وورش وطلبات صيانة": "Technicians, workshops and maintenance requests",
  "قطع الغيار": "Spare parts",
  "مزودون وطلبات قطع الغيار": "Suppliers and spare-parts requests",
  "الربط مع المراكز": "Center connections",
  "طلبات الربط واعتماد مركز الغوص": "Connection requests and dive center approval",
  "CORPORATE & GOVERNMENT · الشركات والجهات الحكومية": "CORPORATE & GOVERNMENT",
  "بوابة الشركات والجهات الحكومية": "Corporate and government portal",
  "إدارة بيانات الجهات والمستندات ومتابعة سجلات المدفوعات المتاحة.": "Manage organization information and documents and review available payment records.",
  "جهات نشطة": "Active organizations",
  "جهات بانتظار المراجعة": "Organizations awaiting review",
  "دعوات معلّقة": "Pending invitations",
  "مدفوعات الحساب": "Account payments",
  "بيانات الجهات": "Organization details",
  "طلبات الخدمات": "Service requests",
  "العقود والمستندات": "Contracts and documents",
  "المشاركون": "Participants",
  "السلامة والامتثال": "Safety and compliance",
  "الفواتير المؤسسية": "Organization invoices",
  "طلبات الخدمات البحرية": "Marine service requests",
  "رفع الوثائق": "Upload documents",
  "متابعة اعتماد المستندات": "Track document approvals",
  "تقارير الالتزام": "Compliance reports",
  "فواتير الجهة": "Organization invoices",
  "تُدار من صفحة الجهة": "Managed from the organization page",
  "تُدار من حجوزات الجهة": "Managed through organization bookings",
  "بانتظار اعتماد سياسة الفوترة": "Awaiting approval of the invoicing policy",
  "مساحة الجهة": "Organization workspace",
  "إدارة بيانات العضوية ومستندات الجهة، وفتح طلبات خدمة ومتابعتها عبر سجل خدمة العملاء.": "Manage membership information and organization documents, and open and track service requests through the customer service record.",
  "عرض حالة الجهة والعضوية المرتبطة بحسابك": "View the organization status and membership linked to your account",
  "طلبات خدمة الجهات": "Organization service requests",
  "إنشاء الطلبات والردود ومتابعة حالتها": "Create requests and replies and track their status",
  "المستندات والعقود": "Documents and contracts",
  "إنشاء المسودات ومتابعة الاعتماد والتوقيع": "Create drafts and track approval and signing",
  "HYDROLAND CONTROL TOWER · الإدارة": "HYDROLAND CONTROL TOWER",
  "مركز القيادة والتحكم": "Command center",
  "لوحة موحدة لإدارة المستخدمين والاعتمادات والرحلات والسلامة والمالية؛ الربط الخارجي مؤجل.": "One dashboard for users, approvals, trips, safety and finance; external integration is deferred.",
  "طلبات اعتماد": "Approval requests",
  "رحلات مفتوحة": "Open trips",
  "مراجعات امتثال": "Compliance reviews",
  "حالة النظام": "System status",
  "المستخدمون": "Users",
  "إدارة الموظفين": "Manage employees",
  "الموافقات والطلبات": "Approvals and requests",
  "مراكز الغوص": "Dive centers",
  "الوساطة البحرية": "Marine brokerage",
  "الشركات والجهات الحكومية": "Companies and government organizations",
  "المعدات والمستودعات": "Equipment and warehouses",
  "ضوابط الرحلات والتدريب": "Trip and training controls",
  "التقارير والإحصائيات": "Reports and statistics",
  "الذكاء الاصطناعي": "Artificial intelligence",
  "إدارة المحتوى": "Manage content",
  "الإشعارات والرسائل": "Notifications and messages",
  "الإعدادات": "Settings",
  "الاعتمادات": "Approvals",
  "إدارة المستخدمين": "Manage users",
  "مركز الحوادث": "Incident center",
  "إعدادات المنصة": "Platform settings",
  "طلبات اعتماد المراكز": "Center approval requests",
  "طلبات محترفي الغوص": "Dive professional requests",
  "مراجعات السلامة": "Safety reviews",
  "المؤشرات والخرائط والتنبيهات تعتمد على البيانات الفعلية ولا تعرض أرقامًا تجريبية.": "Indicators, maps and alerts depend on real data and do not show sample figures.",
  "مركز السلامة والطوارئ": "Safety and emergency center",
  "الحوادث وحالة الرحلات": "Incidents and trip status",
  "الجهات الخارجية · مؤجل": "External organizations · Deferred",
  "لا يوجد ربط أو إرسال خارجي مفعّل حاليًا": "No external integration or sending is currently enabled",
  "الوكلاء والموافقات البشرية": "Agents and human approvals",
  "حساب HYDROLAND": "HYDROLAND account",
  "جارٍ تحميل بيانات الجهة والمدفوعات…": "Loading organization and payment data…",
  "تعذر تحميل بيانات الجهات. أعد المحاولة.": "Could not load organization information. Try again.",
  "لا تتوفر صلاحية عرض الجهات المرتبطة.": "Access to linked organizations is unavailable.",
  "تعذر التحقق من بيانات الجهات. أعد المحاولة.": "Could not verify organization data. Try again.",
  "تم تحديث الجهات والمدفوعات من النظام · ": "Organizations and payments updated from the system · ",
  "تعذر تحميل ملخص الجهة. أعد المحاولة.": "Could not load the organization summary. Try again.",
  "جارٍ تحميل ملخص الوساطة البحرية…": "Loading the marine brokerage summary…",
  "لا تتوفر صلاحية الوساطة البحرية النشطة.": "An active marine brokerage permission is unavailable.",
  "تعذر تحميل ملخص الوساطة البحرية. أعد المحاولة.": "Could not load the marine brokerage summary. Try again.",
  "تعذر التحقق من بيانات الملخص. أعد المحاولة.": "Could not verify summary data. Try again.",
  "تعذر التحقق من وقت تحديث الملخص. أعد المحاولة.": "Could not verify the summary update time. Try again.",
  "آخر تحديث: ": "Last updated: ",
  " · بتوقيت الرياض": " · Riyadh time",
  "تعذر تحميل الملخص. أعد المحاولة.": "Could not load the summary. Try again.",
  "بانتظار التحديث": "Awaiting refresh",
  "جارٍ تحميل ملخص المركز…": "Loading the center summary…",
  "لا تتوفر صلاحية إدارة مركز نشط. راجع الملف التجاري أو أعد المحاولة.": "Access to manage an active center is unavailable. Review the business profile or try again.",
  "تعذر تحميل ملخص المركز. أعد المحاولة.": "Could not load the center summary. Try again.",
  "فتح التفاصيل": "View details",
  "المؤشرات محدثة. تفاصيل الملخص غير متاحة؛ أعد التحديث.": "Indicators are current. Summary details are unavailable; refresh again.",
  "محترف غوص": "Diving professional",
  "الملف المهني مرتبط ببيانات الحساب والشهادات الموثقة.": "The professional profile is linked to account information and verified certificates.",
  "فتح جدول التدريب": "Open training schedule",
  "محترفو الغوص": "Dive professionals",
  "الخدمة جارٍ تحميلها أو غير متاحة": "The service is loading or unavailable",
  " · الخدمة غير متاحة حاليًا": " · Service currently unavailable",
  "الحجوزات والعقود": "Bookings and contracts",
  "المستندات والتصاريح": "Documents and permits",
  "الفواتير": "Invoices",
  "مكتبة العقود": "Contract library",
  "العقود والتوقيع الإلكتروني": "Contracts and electronic signatures",
  "وثائق الأصول البحرية": "Marine asset documents",
  "قيد الربط بالخدمة": "Service connection pending",
  "العقود الإلكترونية": "Electronic contracts",
  "التوقيع الإلكتروني": "Electronic signature",
  "فتح مستندات الجهة": "Open organization documents",
  "إدارة بيانات الجهات": "Manage organization information",
  "عرض المدفوعات": "View payments",
  "التقارير المالية": "Financial reports",
  "عرض المخزون": "View inventory",
  "عرض الجدول": "View schedule",
  "عرض قائمة التشغيل": "View operations list",
  "سلامة أولًا": "Safety first",
  "تجارب مميزة": "Distinctive experiences",
  "تشغيل احترافي": "Professional operations",
  "رحلات بحرية موثقة": "Recorded marine trips",
  "disabled aria-disabled=\"true\" title=\"قيد الربط بالخدمة\"": "disabled aria-disabled=\"true\" title=\"Service connection pending\"",
  "مركز السلامة والامتثال": "Safety and compliance center",
  "السلامة أولًا": "Safety first",
  "راجع جاهزية الرحلة قبل الانطلاق": "Review trip readiness before departure",
  "قوائم الفحص": "Checklists",
  "حسب الرحلة": "By trip",
  "قرار التشغيل": "Operating decision",
  "من مراجعة السلامة": "From the safety review",
  "غير متاح": "Unavailable",
  "لم تُحمّل بيانات هذا القسم.": "Data for this section has not been loaded.",
  "الحجز مفتوح": "Booking open",
  "الحجز مغلق": "Booking closed",
  "مجدولة": "Scheduled",
  "الحضور مفتوح": "Attendance open",
  "جارية": "Running",
  "المعروض __HL_SLOT_0__ من __HL_SLOT_1__": "Showing __HL_SLOT_0__ of __HL_SLOT_1__",
  "المعروض  من": "Showing  of",
  "المعروض {0} من {1}": "Showing {0} of {1}",
  "غير محددة": "Not specified",
  "لا توجد رحلات قادمة أو جارية.": "No upcoming or ongoing trips.",
  "لا توجد جلسات تدريب قادمة أو جارية.": "No upcoming or ongoing training sessions.",
  "متاحة بالمخزون": "Available in stock",
  "معارة / خارج المستودع": "On loan / checked out",
  "تحت الصيانة": "Under maintenance",
  "محجوزة للفحص": "Held for inspection",
  "مستبعدة من الخدمة": "Retired from service",
  "تشغيل اليوم والمتابعة": "Today's operations and follow-up",
  "حجوزات اليوم المؤكدة": "Confirmed bookings today",
  "المقاعد المؤكدة لرحلات اليوم": "Confirmed seats for today's trips",
  "رحلات مسودة": "Draft trips",
  "متابعة الحجوزات": "Track bookings",
  "جدول الرحلات والتدريب": "Trips and training schedule",
  "الرحلات القادمة والجارية": "Upcoming and ongoing trips",
  "بلاغات مفتوحة أو قيد المراجعة": "Open reports or reports under review",
  "منها بلاغات حرجة": "Including critical reports",
  "راجع فحص كل رحلة وقرار السلامة قبل الانطلاق.": "Review each trip's checklist and safety decision before departure.",
  "حالة المعدات والمخزون": "Equipment and inventory status",
  "ملخص المخزون غير متاح حاليًا.": "The inventory summary is currently unavailable.",
  "حالة أخرى": "Other status",
  " · غير مفعلة": " · Inactive",
  "لا توجد معدات مسجلة للمركز.": "No equipment is registered for the center.",
  "حالة المخزون المسجلة؛ نتائج فحوص الجاهزية داخل بطاقة المعدة.": "Recorded stock status; readiness check results are in the equipment card.",
  "منتهية الصلاحية": "Expired",
  "تنتهي خلال 30 يومًا": "Expire within 30 days",
  "بيانات أو مرفقات ناقصة": "Missing information or attachments",
  "بانتظار مراجعة الإدارة": "Awaiting administrative review",
  "لا توجد تراخيص مسجلة للمركز.": "No licenses are registered for the center.",
  "متابعة التراخيص": "Track licenses",
  "أنشئ مسودة من نموذج متاح للجهة، ثم تابع الإرسال للاعتماد والتوقيع بحسب دور عضويتك.": "Create a draft from an available organization template, then track submission for approval and signing according to your membership role.",
  "تكامل النظام": "System integration",
  "جاهزية الدفع والتسوية": "Payment and settlement readiness",
  "اعرض حالة إعدادات المزود والبنود الناقصة من لوحة الإدارة.": "View provider configuration status and missing items from the administration dashboard.",
  "الحسابات": "Accounts",
  "المستندات": "Documents",
  "المالية": "Finance",
  "فحص إعدادات الدفع والتسوية": "Check payment and reconciliation settings",
  "المراكز والمستخدمون": "Centers and users",
  "قائمة الاعتمادات": "Approvals list",
  "الشهادات المهنية": "Professional certificates",
  "المراجعة والتوثيق": "Review and verification",
  "متابعة الحالة": "Track status",
  "فتح الاعتمادات": "Open approvals",
  "التنبيهات والإشعارات": "Alerts and notifications",
  "__HL_SLOT_0__رسائل الحساب والتنبيهات التشغيلية": "__HL_SLOT_0__Account messages and operational alerts",
  "رسائل الحساب والتنبيهات التشغيلية": "Account messages and operational alerts",
  "{0}رسائل الحساب والتنبيهات التشغيلية": "{0}Account messages and operational alerts",
  "فتح مركز الإشعارات __HL_SLOT_1__": "Open notification center __HL_SLOT_1__",
  "فتح مركز الإشعارات": "Open notification center",
  "فتح مركز الإشعارات {1}": "Open notification center {1}",
  "حالة خدمات الجهة": "Organization service status",
  "افتح بيانات الجهات، ثم اختر الجهة للوصول إلى طلباتها وحجوزاتها وبلاغاتها بحسب عضويتك.": "Open organization information, then choose the organization to access its requests, bookings and reports according to your membership.",
  "تحقق من حالة التسجيل والعضويات المرتبطة بحسابك.": "Check the registration status and memberships linked to your account.",
  "يعرض هذا القسم سجل المدفوعات المرتبط بحساب المستخدم.": "This section shows payment records linked to the user account.",
  "الخدمات الفنية وقطع الغيار": "Technical services and spare parts",
  "سجل المعدات": "Equipment register",
  "المشتريات": "Procurement",
  "متابعة الطلبات": "Track requests",
  "التدريب والتقييم": "Training and assessment",
  "الحضور والمهارات": "Attendance and skills",
  "سجل التدريب": "Training record",
  "الشهادات والملف المهني": "Certificates and professional profile",
  "شهاداتك واعتماداتك وجداول التكليف": "Your certificates, accreditations and assignment schedules",
  "مركز القيادة والإدارة": "Management command center",
  "نظم رحلاتك… واصنع تجربة غوص استثنائية": "Organize your trips and create exceptional diving experiences",
  "كل ما تحتاجه لإدارة منظومة هيدرولاند في مكان واحد": "Manage the HYDROLAND platform in one place",
  "إدارة الجهات والوثائق المؤسسية من حسابك": "Manage organizations and their documents from your account",
  "علّم، ألهم… واصنع جيلًا من الغواصين": "Teach, inspire and develop the next generation of divers",
  "أدر أسطولك وخدماتك البحرية بثقة": "Manage your fleet and marine services with confidence",
  "__HL_SLOT_8__تبديل الواجهة": "__HL_SLOT_8__Switch interface",
  "تبديل الواجهة": "Switch workspace",
  "{8}تبديل الواجهة": "{8}Switch interface",
  "__HL_SLOT_9__تسجيل الخروج": "__HL_SLOT_9__Sign out",
  "تسجيل الخروج": "Sign out",
  "{9}تسجيل الخروج": "{9}Sign out",
  "فتح قائمة البوابة": "Open workspace menu",
  "بحث": "Search",
  "فتح الإشعارات": "Open notifications",
  "فتح الرسائل الداخلية": "Open internal messages",
  "الإجراءات الرئيسية": "Main actions",
  "__HL_SLOT_29__الرئيسية": "__HL_SLOT_29__Home",
  "{29}الرئيسية": "{29}Home",
  "المملكة العربية السعودية": "Kingdom of Saudi Arabia",
  "نطاق البحث في المركز": "Center search scope",
  "الحجوزات": "Bookings",
  "رمز المعدة": "Equipment code",
  "بحث في بيانات المركز": "Search center data",
  "بحث في المنصة": "Search the platform",
  "رقم الحجز أو اسم العميل أو الرحلة": "Booking number, customer or trip name",
  "ابحث في هيدرولاند…": "Search HYDROLAND…",
  "تحديث الملخص": "Refresh summary",
  "جارٍ تحميل بيانات الجهة…": "Loading organization data…",
  "الخدمات والمهام السريعة": "Quick services and tasks",
  "اسم العميل": "Customer name",
  "رمز المعدة أو الرقم التسلسلي": "Equipment code or serial number",
  "خدمة البحث غير جاهزة. حدّث الصفحة وأعد المحاولة.": "Search is not ready. Refresh the page and try again.",
  "تم تحديث الجهات والمدفوعات من النظام · {0}": "Organizations and payments updated from the system · {0}",
  "آخر تحديث: {0} · بتوقيت الرياض": "Last updated: {0} · Riyadh time",
  "{0} · الخدمة غير متاحة حاليًا": "{0} · Service currently unavailable",
  "{0} · غير مفعلة": "{0} · Inactive",
  "تم تحديث الجهات والمدفوعات من النظام ·": "Organizations and payments updated from the system ·",
  "آخر تحديث:": "Last updated:",
  "· بتوقيت الرياض": "· Riyadh time",
  "· الخدمة غير متاحة حاليًا": "· Service currently unavailable",
  "· غير مفعلة": "· Inactive"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Read live preference per action; missing media support must not animate.
  const residualScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  const {icon,brand,emblem,esc}=window.HydrolandUI;
  const consoleEl=document.getElementById('role-console');if(!consoleEl)return;

  const authoredLabel=value=>uiLocale.messageHTML(typeof value==='string'?uiLocale.message(value):value);
  const timestampBindings=new Map();
  const timeLocale=()=>window.HydrolandI18n?.getLocale()==='en'?'en-GB':'ar-SA';
  const setTimestamp=(node,source,value,options)=>{const date=new Date(value),formatted=new Intl.DateTimeFormat(timeLocale(),{timeZone:'Asia/Riyadh',...options}).format(date);uiLocale.setText(node,source,[formatted]);timestampBindings.set(node,{source,date,options,formatted})};
  document.addEventListener('hydroland:locale-changed',()=>{for(const [node,binding] of timestampBindings){if(!node.isConnected||node.textContent!==uiLocale.format(binding.source,[binding.formatted])){timestampBindings.delete(node);continue}setTimestamp(node,binding.source,binding.date,binding.options)}});
  const authoredErrors=new WeakMap();
  const localError=source=>{const message=uiLocale.message(source),error=new Error(String(message));authoredErrors.set(error,message);return error};
  const localErrorMessage=(error,fallback)=>authoredErrors.get(error)||error?.message||uiLocale.message(fallback);
  const configs={
    instructor:{
      k:'DIVE PROFESSIONALS · محترفي الغوص',t:'لوحة محترفي الغوص',s:'إدارة التدريب والطلاب والجدول والشهادات والإيرادات من مساحة واحدة.',icon:'🤿',
      m:[['—','طلاب نشطون'],['—','جلسات اليوم'],['—','شهادات جاهزة'],['—','تقييم المدرب']],
      nav:['الرئيسية','إدارة الدورات','الطلاب','الجدول الزمني','التقييمات','الشهادات','الإيرادات'],
      a:[['إدارة الدورات','training','▱'],['إدارة الطلاب','training','♟'],['جدول التدريب','training','◫'],['تقييم المهارات','training','✓'],['إصدار الشهادات','training','◇'],['الإيرادات','finance','◈']],
      q:[['جلسات التدريب','من النظام'],['الطلاب بانتظار التقييم','من النظام'],['شهادات بانتظار الاعتماد','من النظام']],
      spotlight:['جلسات اليوم','يعرض النظام الجلسات المؤكدة والمواقع والطلاب عند توفر البيانات.'],
      lower:[['المواد التدريبية','إدارة مواد الدورة والتقييمات'],['سجل الحضور','توثيق الحضور والمهارات'],['الملف المهني','الشهادات والاعتمادات والتقييمات']]
    },
    center:{
      k:'DIVE CENTER · مركز الغوص',t:'تشغيل مركز الغوص',s:'تشغيل الحجوزات والرحلات والمعدات ومحترفي الغوص والتقارير والملف التجاري.',icon:'◉',
      m:[['—','حجوزات بانتظار التأكيد'],['—','رحلات اليوم'],['—','أعضاء نشطون'],['—','إجمالي الرحلات']],
      nav:['الرئيسية','إدارة الحجوزات','الرحلات','المتجر والعروض','المعدات والمخزون','محترفي الغوص','التدريب والدورات','العملاء','المستندات والتراخيص','السلامة','ورديات المحاسب','الذمم والتحصيل','التقارير','الملف التجاري'],
      a:[['إدارة الحجوزات','trips','▣'],['إدارة الرحلات','trips','⌖'],['المخزون والمعدات','store','◫'],['الطاقم والمدربين','trips','♟'],['المستندات والتراخيص','documents','◇'],['تقارير السلامة','safety','⬡'],['تقارير الحجوزات والمدفوعات','finance','◈']],
      q:[['الحجوزات المؤكدة','من النظام'],['رحلات اليوم','من النظام'],['فحوص المعدات','من النظام']],
      spotlight:['تشغيل اليوم','الحجوزات والرحلات وحالة الجاهزية تظهر من بيانات التشغيل المتصلة.'],
      lower:[['المعدات والمخزون','التوفر والصيانة والاستئجار'],['محترفي الغوص','المدربين والجداول والتكليفات'],['الملف التجاري','الوثائق والتراخيص والتقييمات']]
    },
    boat:{
      k:'MARINE BROKERAGE · الوساطة البحرية',t:'لوحة الوساطة البحرية',s:'إدارة القوارب والرحلات والحجوزات والصيانة والطاقم والتراخيص والخدمات الفنية.',icon:'⛵',
      m:[['—','قوارب نشطة'],['—','رحلات مجدولة'],['—','أعمال صيانة مفتوحة'],['—','حجوزات مؤكدة']],
      nav:['الرئيسية','إدارة القوارب','الرحلات والحجوزات','الطاقم','الجدولة والتقويم','الصيانة والمعدات','السلامة واللوائح','الطقس وحالة البحر','المستندات والتراخيص','المالية والفواتير','التقييمات','التسويق والعروض','التقارير'],
      a:[['إدارة القوارب','trips','⛵'],['إنشاء رحلة','trips','⌖'],['إدارة الحجوزات','trips','▣'],['إدارة الطاقم','trips','♟'],['سجل الصيانة','store','⌁'],['السلامة واللوائح','safety','⬡'],['حالة البحر والطقس','marine-intelligence','☀'],['المستندات والتراخيص','marine-documents','◇'],['المالية والفواتير','finance','◈'],['التسويق والعروض','community','★']],
      q:[['فحص قبل الإبحار','من النظام'],['الصيانة القادمة','من النظام'],['التراخيص والوثائق','من النظام']],
      spotlight:['حالة الأسطول','يعرض النظام القوارب وحالة الجاهزية والصيانة والرحلات عند توفر البيانات.'],
      lower:[['الخدمات الفنية','فنيون وورش وطلبات صيانة'],['قطع الغيار','مزودون وطلبات قطع الغيار'],['الربط مع المراكز','طلبات الربط واعتماد مركز الغوص']]
    },
    organization:{
      k:'CORPORATE & GOVERNMENT · الشركات والجهات الحكومية',t:'بوابة الشركات والجهات الحكومية',s:'إدارة بيانات الجهات والمستندات ومتابعة سجلات المدفوعات المتاحة.',icon:'◆',
      m:[['—','جهات نشطة'],['—','جهات بانتظار المراجعة'],['—','دعوات معلّقة'],['—','مدفوعات الحساب']],
      nav:['الرئيسية','بيانات الجهات','طلبات الخدمات','العقود والمستندات','المشاركون','السلامة والامتثال','التقارير','مدفوعات الحساب','الفواتير المؤسسية'],
      a:[['بيانات الجهات','organizations','◆'],['طلبات الخدمات البحرية','organizations','⌖'],['العقود والمستندات','documents','◇'],['المشاركون','organizations','♟'],['رفع الوثائق','documents','▣'],['متابعة اعتماد المستندات','documents','✓'],['السلامة والامتثال','organizations','⬡'],['تقارير الالتزام',null,'▥'],['مدفوعات الحساب','finance','◈'],['فواتير الجهة',null,'▤']],
      q:[['طلبات الخدمات','تُدار من صفحة الجهة'],['المشاركون','تُدار من حجوزات الجهة'],['فواتير الجهة','بانتظار اعتماد سياسة الفوترة']],
      spotlight:['مساحة الجهة','إدارة بيانات العضوية ومستندات الجهة، وفتح طلبات خدمة ومتابعتها عبر سجل خدمة العملاء.'],
      lower:[['بيانات الجهات','عرض حالة الجهة والعضوية المرتبطة بحسابك'],['طلبات خدمة الجهات','إنشاء الطلبات والردود ومتابعة حالتها'],['المستندات والعقود','إنشاء المسودات ومتابعة الاعتماد والتوقيع']]
    },
    admin:{
      k:'HYDROLAND CONTROL TOWER · الإدارة',t:'مركز القيادة والتحكم',s:'لوحة موحدة لإدارة المستخدمين والاعتمادات والرحلات والسلامة والمالية؛ الربط الخارجي مؤجل.',icon:'H',
      m:[['—','طلبات اعتماد'],['—','رحلات مفتوحة'],['—','مراجعات امتثال'],['—','حالة النظام']],
      nav:['مركز القيادة والتحكم','خدمة العملاء','المستخدمون','إدارة الموظفين','الموافقات والطلبات','مراكز الغوص','محترفي الغوص','الوساطة البحرية','الشركات والجهات الحكومية','الرحلات والحجوزات','المعدات والمستودعات','السلامة والامتثال','ضوابط الرحلات والتدريب','المالية والفواتير','التقارير والإحصائيات','الذكاء الاصطناعي','إدارة المحتوى','الإشعارات والرسائل','الإعدادات'],
      a:[['خدمة العملاء','support','♟'],['الاعتمادات','admin','✓'],['إدارة المستخدمين','admin','♟'],['إدارة الموظفين','admin-employees','♟'],['الرحلات والحجوزات','trips','⌖'],['المعدات والمستودعات','store','▣'],['ضوابط الرحلات والتدريب','operational-controls','⚙'],['مركز الحوادث','safety','⬡'],['الطقس وحالة البحر','marine-intelligence','☀'],['المالية والفواتير','finance','◈'],['إعدادات المنصة','admin','⚙'],['التقارير والإحصائيات','admin','▥'],['إدارة المحتوى','community','★']],
      q:[['طلبات اعتماد المراكز','من النظام'],['طلبات محترفي الغوص','من النظام'],['مراجعات السلامة','من النظام']],
      spotlight:['مركز القيادة والتحكم','المؤشرات والخرائط والتنبيهات تعتمد على البيانات الفعلية ولا تعرض أرقامًا تجريبية.'],
      lower:[['مركز السلامة والطوارئ','الحوادث وحالة الرحلات'],['الجهات الخارجية · مؤجل','لا يوجد ربط أو إرسال خارجي مفعّل حاليًا'],['الذكاء الاصطناعي','الوكلاء والموافقات البشرية']]
    }
  };

  function clearDashboard(){document.querySelector('.hl-role-dashboard')?.remove()}
  const syncDashboardIdentity=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const person=window.HydrolandProfileData?.profile?.person||{},name=[person.firstName,person.lastName].filter(Boolean).join(' ').trim();d.querySelectorAll('[data-portal-name],[data-center-name]').forEach(node=>{if(node.hasAttribute('data-center-name')&&d.dataset.centerScopeLoaded==='1')return;if(name){if(node.textContent!==name)node.textContent=name}else uiLocale.setText(node,'حساب HYDROLAND')});d.querySelectorAll('[data-portal-avatar],[data-center-avatar]').forEach(node=>{const value=(person.firstName||'H').trim().slice(0,1).toUpperCase();if(node.textContent!==value)node.textContent=value})};
  const centerLoads=new WeakMap();
  const marineLoads=new WeakMap();
  const organizationLoads=new WeakMap();
  const loadOrganizationSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='organization'||!d.isConnected)return;
    const version=(organizationLoads.get(d)||0)+1;organizationLoads.set(d,version);
    const session=auth?.getSessionVersion?.(),current=()=>d.isConnected&&organizationLoads.get(d)===version&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated?.()&&access?.getCurrentRole?.()==='organization'&&access?.roleAllowed?.('organization');
    const tiles=d.querySelectorAll('.hl-role-tile b'),status=d.querySelector('[data-organization-home-status]'),refresh=d.querySelector('[data-organization-home-refresh]');
    tiles.forEach(node=>node.textContent='—');uiLocale.setText(status, ...['جارٍ تحميل بيانات الجهة والمدفوعات…']);status.setAttribute('role','status');refresh.disabled=true;
    try{
      if(typeof access?.authorizeRole!=='function'||!await access.authorizeRole('organization',{sessionVersion:session,isCurrent:()=>d.isConnected&&organizationLoads.get(d)===version})||!current())return;
      const [membershipsResult,paymentsResult]=await Promise.allSettled([auth.authorizedFetch('/organizations/mine'),auth.authorizedFetch('/finance/mine/payments')]);
      if(membershipsResult.status==='rejected')throw localError('تعذر تحميل بيانات الجهات. أعد المحاولة.');
      const membershipsResponse=membershipsResult.value,paymentsResponse=paymentsResult.status==='fulfilled'?paymentsResult.value:null;
      if(!current())return;
      if(!membershipsResponse.ok)throw localError(membershipsResponse.status===403?'لا تتوفر صلاحية عرض الجهات المرتبطة.':'تعذر تحميل بيانات الجهات. أعد المحاولة.');
      const memberships=await membershipsResponse.json();
      if(!Array.isArray(memberships)||memberships.some(row=>!row||typeof row.status!=='string'||!row.organization||typeof row.organization.status!=='string'))throw localError('تعذر التحقق من بيانات الجهات. أعد المحاولة.');
      const values=[memberships.filter(row=>row.status==='ACTIVE'&&row.organization.status==='ACTIVE').length,memberships.filter(row=>row.organization.status==='PENDING_REVIEW').length,memberships.filter(row=>row.status==='PENDING').length];
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      let payments='—';if(paymentsResponse?.ok){const rows=await paymentsResponse.json();if(current()&&Array.isArray(rows))payments=String(rows.length)}
      if(!current())return;if(tiles[3])tiles[3].textContent=payments;
      setTimestamp(status,'تم تحديث الجهات والمدفوعات من النظام · {0}',new Date(),{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }catch(error){if(current()){tiles.forEach(node=>node.textContent='—');status.setAttribute('role','alert');uiLocale.setMessage(status,localErrorMessage(error,'تعذر تحميل ملخص الجهة. أعد المحاولة.'))}}
    finally{if(d.isConnected&&organizationLoads.get(d)===version)refresh.disabled=false}
  };
  const loadMarineSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='boat'||!d.isConnected)return;
    const version=(marineLoads.get(d)||0)+1;marineLoads.set(d,version);
    const session=auth?.getSessionVersion?.(),current=()=>d.isConnected&&marineLoads.get(d)===version&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated?.()&&access?.getCurrentRole?.()==='boat'&&access?.roleAllowed?.('boat');
    const status=d.querySelector('[data-marine-home-status]'),refresh=d.querySelector('[data-marine-home-refresh]'),tiles=d.querySelectorAll('.hl-role-tile b');
    const reset=()=>tiles.forEach(node=>node.textContent='—');reset();uiLocale.setText(status, ...['جارٍ تحميل ملخص الوساطة البحرية…']);status.setAttribute('role','status');refresh.disabled=true;
    try{
      if(typeof access?.authorizeRole!=='function'||!await access.authorizeRole('boat',{sessionVersion:session,isCurrent:()=>d.isConnected&&marineLoads.get(d)===version})||!current())return;
      const response=await auth.authorizedFetch('/marine-operations/overview/mine'),data=await response.json().catch(()=>null);
      if(!current())return;
      if(!response.ok)throw localError(response.status===403?'لا تتوفر صلاحية الوساطة البحرية النشطة.':'تعذر تحميل ملخص الوساطة البحرية. أعد المحاولة.');
      const keys=['activeAssets','scheduledTrips','openMaintenance','confirmedBookings'],values=keys.map(key=>data?.metrics?.[key]);
      if(values.some(value=>!Number.isSafeInteger(value)||value<0))throw localError('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      if(typeof data.generatedAt!=='string'||!Number.isFinite(Date.parse(data.generatedAt)))throw localError('تعذر التحقق من وقت تحديث الملخص. أعد المحاولة.');
      setTimestamp(status,'آخر تحديث: {0} · بتوقيت الرياض',data.generatedAt,{dateStyle:'medium',timeStyle:'short'});
    }catch(error){if(current()){reset();status.setAttribute('role','alert');uiLocale.setMessage(status,localErrorMessage(error,'تعذر تحميل الملخص. أعد المحاولة.'))}}
    finally{if(d.isConnected&&marineLoads.get(d)===version)refresh.disabled=false}
  };
  const loadCenterSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='center'||!d.isConnected||!auth?.isAuthenticated?.()||access?.getCurrentRole?.()!=='center')return;
    const version=(centerLoads.get(d)||0)+1;centerLoads.set(d,version);
    const session=auth.getSessionVersion?.(),current=()=>d.isConnected&&centerLoads.get(d)===version&&session===auth.getSessionVersion?.()&&auth.isAuthenticated()&&access.getCurrentRole?.()==='center'&&access.roleAllowed?.('center');
    const status=d.querySelector('[data-center-home-status]'),body=d.querySelector('[data-center-home-panels]'),refresh=d.querySelector('[data-center-home-refresh]');
    const reset=()=>{d.dataset.centerScopeLoaded='0';d.querySelectorAll('.hl-role-tile b').forEach(node=>node.textContent='—');d.querySelectorAll('.hl-role-tile span').forEach(node=>uiLocale.setText(node, ...['بانتظار التحديث']));syncDashboardIdentity();uiLocale.setHTML(body, centerHomePanels(null));connectHomeControls(d)};
    reset();uiLocale.setText(status, ...['جارٍ تحميل ملخص المركز…']);status.setAttribute('role','status');body.setAttribute('aria-busy','true');refresh.disabled=true;
    try{
      if(typeof access.authorizeRole!=='function'||!await access.authorizeRole('center',{sessionVersion:session,isCurrent:()=>d.isConnected&&centerLoads.get(d)===version})||!current())return;
      const response=await auth.authorizedFetch('/center/me/overview'),data=await response.json().catch(()=>null);
      if(!current())return;
      if(!response.ok)throw localError(response.status===403?'لا تتوفر صلاحية إدارة مركز نشط. راجع الملف التجاري أو أعد المحاولة.':'تعذر تحميل ملخص المركز. أعد المحاولة.');
      const values=['newBookings','tripsToday','activeMembers','totalTrips'].map(key=>data?.metrics?.[key]);
      if(typeof data?.center?.displayName!=='string'||values.some(value=>!Number.isSafeInteger(value)||value<0))throw localError('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      const complete=data.operations&&data.safety&&data.licenses&&data.equipment&&data.schedule;
      if(complete){
        const counts=[...Object.values(data.operations),...Object.values(data.safety),...Object.values(data.licenses),...(data.equipment.available===false?[]:[data.equipment.total]),data.schedule.trips?.total,data.schedule.training?.total];
        if(counts.some(value=>!Number.isSafeInteger(value)||value<0)||!Array.isArray(data.equipment.groups)||!Array.isArray(data.schedule.trips?.items)||!Array.isArray(data.schedule.training?.items))throw localError('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      }
      values.forEach((value,index)=>d.querySelectorAll('.hl-role-tile b')[index].textContent=String(value));
      d.querySelectorAll('.hl-role-tile span').forEach(node=>uiLocale.setText(node, ...['فتح التفاصيل']));
      d.querySelectorAll('[data-center-name]').forEach(node=>node.textContent=data.center.displayName);d.dataset.centerScopeLoaded='1';
      uiLocale.setHTML(body, centerHomePanels(complete?data:null));connectHomeControls(d);
      complete?setTimestamp(status,'آخر تحديث: {0} · بتوقيت الرياض',data.generatedAt,{dateStyle:'medium',timeStyle:'short'}):uiLocale.setText(status,'المؤشرات محدثة. تفاصيل الملخص غير متاحة؛ أعد التحديث.');
    }catch(error){if(current()){reset();status.setAttribute('role','alert');uiLocale.setMessage(status,localErrorMessage(error,'تعذر تحميل ملخص المركز. أعد المحاولة.'))}}
    finally{if(d.isConnected&&centerLoads.get(d)===version){body.removeAttribute('aria-busy');refresh.disabled=false;d.hidden=false}}
  };
  const loadInstructorSummary=async d=>{
    const auth=window.HydrolandAuth;if(!d||d.dataset.role!=='instructor'||!auth?.isAuthenticated?.())return;
    const session=auth.getSessionVersion?.();
    try{
      const response=await auth.authorizedFetch('/training/professional/me');
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.message||'PROFILE_UNAVAILABLE');
      if(!d.isConnected||session!==auth.getSessionVersion?.()||d.dataset.role!=='instructor')return;
      const tiles=d.querySelectorAll('.hl-role-tile b');
      const values=[data?.metrics?.activeStudents??0,data?.metrics?.sessionsToday??0,data?.metrics?.verifiedCredentials??0,data?.metrics?.completedSessions??0];
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      const profile=data?.profile||{};
      const name=profile.displayName||uiLocale.message('محترف غوص');
      d.querySelectorAll('[data-portal-name]').forEach(node=>uiLocale.setMessage(node,name));
      const spotlight=d.querySelector('.hl-role-spotlight p,.hl-role-spotlight small');
      if(spotlight)uiLocale.setMessage(spotlight,[profile.headline,profile.regionCode].filter(Boolean).join(' · ')||uiLocale.message('الملف المهني مرتبط ببيانات الحساب والشهادات الموثقة.'));
      d.dataset.professionalProfileLoaded='1';
    }catch{
      if(d.isConnected){d.dataset.professionalProfileLoaded='0';d.querySelectorAll('.hl-role-tile b').forEach(node=>node.textContent='—');}
    }
  };
  const ensureWeatherAdmin=()=>{if(document.querySelector('script[data-hl-weather-admin]'))return;const script=document.createElement('script');script.src='./hydroland-weather-admin.js';script.dataset.hlWeatherAdmin='1';document.body.appendChild(script)};
  const denyRoleAction=()=>{clearDashboard();const exit=document.getElementById('exit-role');if(exit)exit.click();else window.HydrolandPortalAccess?.clearProtectedPortal?.();return false};
  const authorizeRoleAction=async role=>{const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;if(!auth?.isAuthenticated?.()||typeof access?.authorizeRole!=='function')return denyRoleAction();const allowed=await access.authorizeRole(role,{sessionVersion:auth.getSessionVersion?.()});if(!allowed)return denyRoleAction();return true};
  const routeSelectors={support:'.hl-support','contract-library':'#hl-contract-library',contracts:'#hl-contracts','admin-employees':'.hl-admin-employees','admin-accounts':'.hl-admin-accounts','operational-controls':'.hl-policy-center',finance:'.hl-finance',admin:'.hl-admin',documents:'#hl-documents','marine-documents':'#hl-marine-documents',inventory:'.hl-inventory',training:'.hl-training',crew:'.hl-crew-assignments',organizations:'.hl-organizations',incidents:'#hl-safety-incidents','trip-admin':'.hl-trip-admin','store-admin':'.hl-store-admin',weather:'.hl-weather-admin',procurement:'.hl-procurement',logistics:'.hl-logistics','theme-admin':'.hl-theme-admin'};
  // Navigation follows the selected workspace, including controller opens and home shortcuts.
  const centerNavigationTargets={
    'hl-center-bookings':'center-bookings','hl-center-operations':'center-operations',store:'store',
    'hl-center-training':'center-training','hl-center-equipment':'center-equipment','hl-center-team':'center-team','hl-center-customers':'center-customers',
    'hl-center-documents':'center-documents','hl-marine-documents':'center-documents','hl-center-safety':'center-safety',
    'hl-center-finance':'center-finance','hl-center-receivables':'center-receivables','hl-center-reports':'center-reports',
    'hl-center-business-profile':'center-business-profile'
  };
  document.addEventListener('hydroland:workspace-selected',event=>{
    const d=document.querySelector('.hl-role-dashboard[data-role="center"]'),target=event.detail?.target;
    if(!d||!(target instanceof Element)||window.HydrolandPortalAccess?.getCurrentRole?.()!=='center')return;
    const home=target===d||target.id==='home',route=target.id==='hl-center-team'&&target.dataset.centerTrainingView==='assignments'?'center-training':centerNavigationTargets[target.id]||(target.matches('.hl-training')?'center-training':null);
    d.querySelectorAll('.hl-portal-nav-item').forEach((item,index)=>{
      const active=home?index===0:Boolean(route&&item.dataset.hlNavRoute===route);
      item.classList.toggle('active',active);
      if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    });
  });
  const targetFor=id=>routeSelectors[id]?document.querySelector(routeSelectors[id]):document.getElementById(id);
  const openTarget=(id,role,label)=>{if(id==='support'&&role==='admin'){window.HydrolandWorkspaceUI?.show?.(document.querySelector('.hl-support'));void window.HydrolandSupport?.openAdmin?.();return}if(id==='contract-library'){window.HydrolandContractLibrary?.open?.();return}if(id==='contracts'){window.HydrolandContracts?.open?.();return}if(role==='admin'&&id==='admin-employees'&&label==='الذكاء الاصطناعي'){window.HydrolandWorkspaceUI?.show?.(targetFor(id));window.HydrolandAdminAgentWorkforce?.open?.();return}if(role==='center'&&id==='center-training'){void window.HydrolandCenterTraining?.open?.();return}if(role==='center'&&id==='store'){void window.HydrolandStoreProvider?.open?.();return}if(role==='organization'&&id==='organizations'){window.HydrolandOrganizations?.open?.();return}if(role==='center'&&id==='center-marine-documents'){window.HydrolandMarineDocuments?.open?.('center');return}if(role==='boat'&&id==='marine-trips'){window.HydrolandMarineTrips?.open?.();return}if(id==='operational-controls')void window.HydrolandPolicyAdmin?.reload?.();if(role==='center'&&id==='center-receivables'){window.HydrolandCenterReceivables?.open?.();return}if(role==='center'&&id==='center-finance'){window.HydrolandCenterFinance?.open?.();return}if(role==='center'&&id==='center-reports'){window.HydrolandCenterReports?.open?.();return}if(role==='center'&&id==='center-business-profile'){window.HydrolandCenterBusinessProfile?.open?.();return}if(role==='center'&&id==='center-safety'){window.HydrolandCenterSafety?.open?.();return}if(role==='center'&&id==='center-documents'){window.HydrolandCenterDocuments?.open?.();return}if(role==='center'&&id==='center-equipment'){window.HydrolandCenterEquipment?.open?.();return}if(role==='center'&&id==='center-customers'){window.HydrolandCenterCustomers?.open?.();return}if(role==='center'&&id==='center-bookings'){window.HydrolandCenterBookings?.open?.();return}if(role==='center'&&id==='center-operations'){window.HydrolandCenterOperations?.open?.();return}if(role==='center'&&id==='center-team'){window.HydrolandCenterTeam?.open?.(label==='فتح جدول التدريب'?'assignments':['محترفو الغوص','محترفي الغوص'].includes(label)?'professionals':'team');return}const actualId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id;if(id==='professional-profile'){document.getElementById('profile-dialog')?.showModal();return}const target=targetFor(actualId);if(actualId==='documents')window.HydrolandDocuments?.open?.();if(actualId==='marine-documents')window.HydrolandMarineDocuments?.open?.(role);if(actualId==='incidents')window.HydrolandSafetyIncidents?.open?.(role);if(actualId==='training'){const trainingTarget=document.querySelector('.hl-training');window.HydrolandWorkspaceUI?.show?.(trainingTarget);const mode=id==='training-schedule'?'instructor-schedule':id==='training-skills'?'instructor-skills':id==='training-certificates'?'instructor-certificates':id==='training-earnings'?'instructor-earnings':role==='instructor'?'instructor':undefined;Promise.resolve(window.HydrolandTraining?.reload?.(mode)).finally(()=>window.HydrolandWorkspaceUI?.show?.(document.querySelector('.hl-training')));return}if(actualId==='hl-marine-readiness')window.HydrolandMarineReadiness?.open?.(role);window.HydrolandWorkspaceUI?.show?.(target)};
  const setTargetAvailability=(node,id,label,role)=>{if(!node.hasAttribute('data-hl-original-aria-label'))node.dataset.hlOriginalAriaLabel=node.getAttribute('aria-label')||'';const professionalTraining=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id),resolvedId=professionalTraining?'training':id,target=professionalTraining?document.querySelector('.hl-training'):targetFor(resolvedId),available=professionalTraining?Boolean(target&&window.HydrolandPortalAccess?.roleAllowed?.('instructor')):id==='support'?Boolean(window.HydrolandSupport?.openAdmin&&window.HydrolandPortalAccess?.roleAllowed?.('admin')):id==='contracts'?Boolean(target&&window.HydrolandContracts?.open&&['center','instructor','admin'].includes(role)&&window.HydrolandPortalAccess?.roleAllowed?.(role)):id==='contract-library'?Boolean(target&&window.HydrolandContractLibrary?.open):role==='center'&&id==='store'?Boolean(window.HydrolandStoreProvider?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='organizations'?Boolean(window.HydrolandOrganizations?.open&&role==='organization'&&window.HydrolandPortalAccess?.roleAllowed?.('organization')):id==='operational-controls'?Boolean(target&&window.HydrolandPortalAccess?.roleAllowed?.('admin')):id==='professional-profile'?Boolean(document.getElementById('profile-dialog')):id==='center-receivables'?Boolean(window.HydrolandCenterReceivables?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-finance'?Boolean(window.HydrolandCenterFinance?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-training'?Boolean(window.HydrolandCenterTraining?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-reports'?Boolean(window.HydrolandCenterReports?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-safety'?Boolean(window.HydrolandCenterSafety?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-documents'?Boolean(window.HydrolandCenterDocuments?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-equipment'?Boolean(window.HydrolandCenterEquipment?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-business-profile'?Boolean(window.HydrolandCenterBusinessProfile?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-customers'?Boolean(window.HydrolandCenterCustomers?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-bookings'?Boolean(window.HydrolandCenterBookings?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-operations'?Boolean(window.HydrolandCenterOperations?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-team'?Boolean(window.HydrolandCenterTeam?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-receivables'?Boolean(window.HydrolandCenterReceivables?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-finance'?Boolean(window.HydrolandCenterFinance?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='marine-trips'?Boolean(window.HydrolandMarineTrips?.open&&window.HydrolandPortalAccess?.roleAllowed?.('boat')):id==='center-marine-documents'?Boolean(window.HydrolandMarineDocuments?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):Boolean(target&&!target.classList.contains('hl-workspace-hidden')&&(!target.hidden||['admin-employees','admin-accounts','documents','marine-documents','incidents','hl-marine-readiness'].includes(id)));node.disabled=!available;if(available){node.removeAttribute('aria-disabled');node.title='';node.removeAttribute('data-hl-unavailable');if(node.dataset.hlOriginalAriaLabel)node.setAttribute('aria-label',node.dataset.hlOriginalAriaLabel);else node.removeAttribute('aria-label')}else{node.setAttribute('aria-disabled','true');uiLocale.setAttribute(node, "title", ...['الخدمة جارٍ تحميلها أو غير متاحة']);node.dataset.hlUnavailable='1';uiLocale.setAttribute(node, "aria-label", ...["{0} · الخدمة غير متاحة حاليًا", [uiLocale.message(label)]])}return available};
  const connectControl=(node,role,id,label)=>{node.dataset.hlRoute=id;node.dataset.hlRole=role;if(!node.dataset.hlConnected){node.dataset.hlConnected='1';node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();const route=node.dataset.hlRoute,activeRole=node.dataset.hlRole;if(!(await authorizeRoleAction(activeRole)))return;if(activeRole==='organization'&&route==='organizations'){openTarget(route,activeRole,label);return}if(activeRole==='boat'&&route==='marine-trips'){openTarget(route,activeRole,label);return}if(activeRole==='center'&&['center-training','center-safety','center-documents','center-marine-documents','center-equipment','center-customers','center-business-profile','center-operations','center-bookings','center-team','center-reports','center-finance','center-receivables'].includes(route)){openTarget(route,activeRole,label);return}const controllerRoute=route==='professional-profile'||['training-schedule','training-skills','training-certificates','training-earnings'].includes(route),target=controllerRoute?null:targetFor(route);if(!controllerRoute&&!target){setTargetAvailability(node,route,label,activeRole);return}openTarget(route,activeRole,label);if(controllerRoute||(route==='training'&&activeRole==='instructor'))return;target.scrollIntoView({behavior: residualScrollBehavior(),block:'start'});history.replaceState(null,'','#'+(route==='documents'?'hl-documents':route==='marine-documents'?'hl-marine-documents':route))})}return setTargetAvailability(node,id,label,role)};
  const portalNavTargets={'المتجر والعروض':'store','إدارة الدورات':'training','الطلاب':'training','الجدول الزمني':'training','التقييمات':'community','الشهادات':'community','الإيرادات':'finance','إدارة الحجوزات':'trips','الرحلات':'trips','المعدات والمخزون':'store','محترفي الغوص':'training','العملاء':'community','التقارير':'admin','الملف التجاري':'community','إدارة القوارب':'trips','الرحلات والحجوزات':'trips','الطاقم':'trips','الجدولة والتقويم':'trips','الصيانة والمعدات':'store','السلامة واللوائح':'safety','الطقس وحالة البحر':'marine-intelligence','المالية والفواتير':'finance','التسويق والعروض':'community','طلبات الخدمات':'trips','الحجوزات والعقود':'community','المشاركون':'community','المستندات والتصاريح':'documents','ضوابط الرحلات والتدريب':'operational-controls','السلامة والامتثال':'safety','الفواتير':'finance','المستخدمون':'admin','الموافقات والطلبات':'admin','مراكز الغوص':'admin','الوساطة البحرية':'admin','الشركات والجهات الحكومية':'admin','المعدات والمستودعات':'store','التقارير والإحصائيات':'admin','الذكاء الاصطناعي':'admin','إدارة المحتوى':'community','الإشعارات والرسائل':'community','الإعدادات':'admin'};
  const portalNavTarget=(role,label)=>{if(role==='admin'&&label==='خدمة العملاء')return 'support';if(label==='مكتبة العقود')return 'contract-library';if(label==='العقود والتوقيع الإلكتروني')return 'contracts';if(role==='admin'&&['إدارة الموظفين','الذكاء الاصطناعي'].includes(label))return 'admin-employees';if(role==='organization')return ({'بيانات الجهات':'organizations','طلبات الخدمات':'organizations','المشاركون':'organizations','السلامة والامتثال':'organizations','العقود والمستندات':'documents','مدفوعات الحساب':'finance'})[label]||null;if(role==='center'&&label==='التدريب والدورات')return 'center-training';if(role==='center'&&label==='وثائق الأصول البحرية')return 'center-marine-documents';if(role==='boat'&&label==='الرحلات والحجوزات')return 'marine-trips';if(role==='admin'&&label==='المستخدمون')return 'admin-accounts';if(role==='admin'&&label==='الرحلات والحجوزات')return 'trip-admin';if(role==='center'&&label==='الذمم والتحصيل')return 'center-receivables';if(role==='center'&&label==='ورديات المحاسب')return 'center-finance';if(role==='center'&&label==='التقارير')return 'center-reports';if(role==='center'&&label==='الملف التجاري')return 'center-business-profile';if(role==='instructor'&&label==='إدارة الدورات')return 'training';if(role==='instructor'&&label==='الطلاب')return 'training';if(role==='instructor'&&label==='الجدول الزمني')return 'training-schedule';if(role==='instructor'&&label==='التقييمات')return 'training-skills';if(role==='instructor'&&label==='الشهادات')return 'training-certificates';if(role==='instructor'&&label==='الإيرادات')return 'training-earnings';if(role==='center'&&label==='السلامة')return 'center-safety';if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents';if(role==='center'&&label==='المعدات والمخزون')return 'center-equipment';if(role==='center'&&label==='العملاء')return 'center-customers';if(role==='center'&&label==='إدارة الحجوزات')return 'center-bookings';if(role==='center'&&label==='الرحلات')return 'center-operations';if(role==='center'&&label==='محترفي الغوص')return 'center-team';if(label==='المستندات والتراخيص')return role==='boat'?'marine-documents':'documents';if(label==='الصيانة والمعدات'&&role==='boat')return 'hl-marine-readiness';if(role==='admin'&&label==='الوساطة البحرية')return 'marine-documents';if(['المعدات والمخزون','المعدات والمستودعات'].includes(label))return 'inventory';if(label==='الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';if(label==='الذكاء الاصطناعي'||label==='التسويق والعروض')return null;return portalNavTargets[label]};
  const reconnectDashboard=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const role=d.dataset.role;d.querySelectorAll('[data-hl-route]').forEach(node=>connectControl(node,role,node.dataset.hlRoute,node.dataset.actionLabel||node.dataset.secondaryLabel||node.textContent.trim()));d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>{if(index===0)return;const label=node.dataset.portalLabel,id=portalNavTarget(role,label);if(!id){node.disabled=true;uiLocale.setAttribute(node, "title", ...['قيد الربط بالخدمة']);node.setAttribute('aria-disabled','true');return}node.dataset.hlNavRoute=id;setTargetAvailability(node,id,label,role)})};
  let reconnectQueued=false;new MutationObserver(()=>{if(reconnectQueued)return;reconnectQueued=true;queueMicrotask(()=>{reconnectQueued=false;reconnectDashboard()})}).observe(document.body,{childList:true,subtree:true});

  const centerServiceIcons={'إدارة الحجوزات':'calendar','المتجر والعروض':'bag','ورديات المحاسب':'clock','الذمم والتحصيل':'wallet','الملف التجاري':'building'};
  const iconFor=label=>centerServiceIcons[label]||(/الرئيسية|القيادة/.test(label)?'home':/سلامة|امتثال|حوادث/.test(label)?'shield':/مستند|وثائق|عقود|تراخيص|تصاريح|توقيع/.test(label)?'file':/مالية|إيراد|فواتير/.test(label)?'chart':/معدات|مخزون|مستودع|غيار/.test(label)?'tanks':/دورات|تدريب|محترفي|المواد/.test(label)?'learn':/شهادات|اعتماد|موافقة/.test(label)?'certificate':/طقس|البحر/.test(label)?'cloud':/قارب|قوارب|رحل|أسطول/.test(label)?'boat':/جدول|جلسات|تقويم/.test(label)?'calendar':/رسائل|إشعارات/.test(label)?'mail':/إعداد|صيانة|فنية/.test(label)?'settings':/مستخدم|طلاب|طاقم|عملاء|مشارك|مركز|جهات/.test(label)?'people':/ذكاء/.test(label)?'bot':/تقارير|تقييم/.test(label)?'chart':'compass');
  const actionRoute=(role,label,fallback)=>{if(label==='مكتبة العقود')return 'contract-library';if(label==='العقود والتوقيع الإلكتروني')return 'contracts';if(role==='admin'&&['إدارة الموظفين','الذكاء الاصطناعي'].includes(label))return 'admin-employees';if(role==='organization')return ({'بيانات الجهات':'organizations','طلبات الخدمات البحرية':'organizations','العقود والمستندات':'documents','العقود الإلكترونية':'documents','رفع الوثائق':'documents','متابعة اعتماد المستندات':'documents','التوقيع الإلكتروني':'documents','مدفوعات الحساب':'finance','فتح مستندات الجهة':'documents','إدارة بيانات الجهات':'organizations','عرض المدفوعات':'finance'})[label]||null;if(role==='boat'&&['إنشاء رحلة','إدارة الرحلات','الرحلات والحجوزات'].includes(label))return 'marine-trips';
    if(role==='center'&&['التقارير المالية','تقارير الحجوزات والمدفوعات'].includes(label))return 'center-reports';
    if(role==='center'&&['السلامة','تقارير السلامة'].includes(label))return 'center-safety';if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents';if(role==='center'&&['المعدات والمخزون','المخزون والمعدات','عرض المخزون'].includes(label))return 'center-equipment';if(role==='center'&&label==='العملاء')return 'center-customers';if(role==='center'&&label==='إدارة الحجوزات')return 'center-bookings';if(role==='center'&&['إدارة الرحلات','عرض الجدول','عرض قائمة التشغيل'].includes(label))return 'center-operations';if(role==='center'&&['الطاقم والمدربين','محترفو الغوص','محترفي الغوص'].includes(label))return 'center-team';
    if(label==='مركز الحوادث')return 'incidents';if(label==='المخزون والمعدات'||label==='المعدات والمستودعات')return 'inventory';if(label==='إدارة المحتوى')return 'theme-admin';if(label==='إعدادات المنصة')return 'admin';
    if(role==='admin'&&label==='إدارة المستخدمين')return 'admin-accounts';if(label==='إدارة الرحلات'||label==='إنشاء رحلة'||(label==='الرحلات والحجوزات'&&role==='admin'))return 'trip-admin';if(label==='الطاقم والمدربين'||label==='إدارة الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='سجل الصيانة')return 'hl-marine-readiness';if(label==='حالة البحر والطقس'||label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';
    if(role==='instructor'&&label==='جدول التدريب')return 'training-schedule';if(role==='instructor'&&label==='تقييم المهارات')return 'training-skills';if(role==='instructor'&&label==='إصدار الشهادات')return 'training-certificates';if(role==='instructor'&&label==='الإيرادات')return 'training-earnings';if(role==='instructor'&&label==='الملف المهني')return 'professional-profile';if(label==='التسويق والعروض')return null;return fallback;
  };
  const highlights=()=>uiLocale.html`<div class="hl-center-highlights">${[['shield','سلامة أولًا'],['water','تجارب مميزة'],['settings','تشغيل احترافي'],['boat','رحلات بحرية موثقة']].map(([art,text])=>uiLocale.html`<span>${icon(art)}${authoredLabel(text)}</span>`).join('')}</div>`;
  const panel=(title,art,body,cls='')=>uiLocale.html`<section class="hl-panel hl-board-panel ${cls}"><h4 class="hl-panel-title">${icon(art)}${authoredLabel(title)}</h4>${body}</section>`;
  const rows=items=>uiLocale.html`<div class="hl-board-rows">${items.map(([title,state])=>uiLocale.html`<div><span>${authoredLabel(title)}</span><b>${authoredLabel(state)}</b></div>`).join('')}</div>`;
  const action=(label,route,secondary=false)=>uiLocale.html`<button type="button" ${secondary?'data-secondary-label':'data-action-label'}="${label}" ${route?`data-route="${route}"`:'disabled aria-disabled="true" '+uiLocale.attribute('title','قيد الربط بالخدمة')}>${authoredLabel(label)}${icon('arrow')}</button>`;
  const safetyPanel=()=>panel('مركز السلامة والامتثال','shield',uiLocale.html`<div class="hl-board-safety">${icon('shield')}<strong>السلامة أولًا</strong><span>راجع جاهزية الرحلة قبل الانطلاق</span></div>${rows([['قوائم الفحص','حسب الرحلة'],['قرار التشغيل','من مراجعة السلامة']])}${action('تقارير السلامة','safety')}`,'hl-safety-board');
  const queuePanel=c=>panel(c.spotlight[0],'calendar',`${rows(c.q)}${action('عرض قائمة التشغيل','trips')}`,'hl-queue');
  const centerHomeDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(timeLocale(),{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'}).format(date):uiLocale.message('غير متاح')};
  const connectHomeControls=d=>d.querySelectorAll('[data-center-home-panels] [data-route]').forEach(node=>connectControl(node,'center',actionRoute('center',node.dataset.actionLabel,node.dataset.route),node.dataset.actionLabel));
  const centerHomePanels=data=>{
    const missing=uiLocale.html`<p class="hl-home-empty">لم تُحمّل بيانات هذا القسم.</p>`,empty=text=>uiLocale.html`<p class="hl-home-empty">${authoredLabel(text)}</p>`;
    const state={OPEN:'الحجز مفتوح',CLOSED:'الحجز مغلق',SCHEDULED:'مجدولة',CHECK_IN_OPEN:'الحضور مفتوح',IN_PROGRESS:'جارية'};
    const schedule=(part,kind)=>part.total?uiLocale.html`<p>${uiLocale.label('المعروض {0} من {1}',[part.items.length,part.total])}</p><ul class="hl-home-agenda">${part.items.map(row=>uiLocale.html`<li><strong>${esc(kind==='trip'?row.title:row.courseCode)}</strong><small>${uiLocale.messageHTML(centerHomeDate(row.startsAt))}</small><span>${esc(state[row.status]||'غير محددة')}</span></li>`).join('')}</ul>`:empty(kind==='trip'?'لا توجد رحلات قادمة أو جارية.':'لا توجد جلسات تدريب قادمة أو جارية.');
    const stock={AVAILABLE:'متاحة بالمخزون',CHECKED_OUT:'معارة / خارج المستودع',MAINTENANCE:'تحت الصيانة',QUARANTINED:'محجوزة للفحص',RETIRED:'مستبعدة من الخدمة'};
    return panel('تشغيل اليوم والمتابعة','calendar',data?rows([['حجوزات اليوم المؤكدة',data.operations.confirmedBookingsToday],['المقاعد المؤكدة لرحلات اليوم',data.operations.confirmedSeatsToday],['حجوزات بانتظار التأكيد',data.metrics.newBookings],['رحلات مسودة',data.operations.draftTrips]])+action('عرض قائمة التشغيل','center-operations')+action('متابعة الحجوزات','center-bookings'):missing+action('عرض قائمة التشغيل','center-operations'),'hl-queue')
      +panel('جدول الرحلات والتدريب','calendar',data?uiLocale.html`<h5>الرحلات القادمة والجارية</h5>${schedule(data.schedule.trips,'trip')}${action('عرض الجدول','center-operations')}<h5>جلسات التدريب</h5>${schedule(data.schedule.training,'training')}${action('فتح جدول التدريب','center-team')}`:missing+action('عرض الجدول','center-operations'),'hl-center-schedule')
      +panel('مركز السلامة والامتثال','shield',(data?rows([['بلاغات مفتوحة أو قيد المراجعة',data.safety.openIncidents],['منها بلاغات حرجة',data.safety.criticalIncidents]])+uiLocale.html`<p>راجع فحص كل رحلة وقرار السلامة قبل الانطلاق.</p>`:missing)+action('تقارير السلامة','center-safety'),'hl-safety-board')
      +panel('حالة المعدات والمخزون','tanks',(data?(data.equipment.available===false?empty('ملخص المخزون غير متاح حاليًا.'):data.equipment.total?rows(data.equipment.groups.map(row=>[row.active?uiLocale.message(stock[row.status]||'حالة أخرى'):uiLocale.message('{0} · غير مفعلة',[uiLocale.message(stock[row.status]||'حالة أخرى')]),row.count])):empty('لا توجد معدات مسجلة للمركز.')):missing)+uiLocale.html`<p>حالة المخزون المسجلة؛ نتائج فحوص الجاهزية داخل بطاقة المعدة.</p>`+action('عرض المخزون','center-equipment'),'hl-center-stock')
      +panel('المستندات والتراخيص','file',(data?(data.licenses.total?rows([['منتهية الصلاحية',data.licenses.expired],['تنتهي خلال 30 يومًا',data.licenses.expiringSoon],['بيانات أو مرفقات ناقصة',data.licenses.incomplete],['بانتظار مراجعة الإدارة',data.licenses.pendingReview]]):empty('لا توجد تراخيص مسجلة للمركز.')):missing)+action('متابعة التراخيص','center-documents')+action('وثائق الأصول البحرية','center-marine-documents'),'hl-center-license-summary');
  };
  const documentsPanel=()=>panel('المستندات والعقود','file',uiLocale.html`<p>أنشئ مسودة من نموذج متاح للجهة، ثم تابع الإرسال للاعتماد والتوقيع بحسب دور عضويتك.</p>${action('فتح مستندات الجهة','documents')}`);
  const adminPanels=()=>uiLocale.html`<div class="hl-portal-lower hl-admin-lower">${panel('تكامل النظام','link',uiLocale.html`<div class="hl-integration-grid">${[['people','الحسابات'],['file','المستندات'],['boat','الرحلات'],['chart','المالية']].map(([art,title])=>uiLocale.html`<span>${icon(art)}${authoredLabel(title)}</span>`).join('')}</div><div class="hl-insight-cards"><article><h5>جاهزية الدفع والتسوية</h5><p>اعرض حالة إعدادات المزود والبنود الناقصة من لوحة الإدارة.</p>${action('فحص إعدادات الدفع والتسوية','admin')}</article></div>`)}${safetyPanel()}${panel('الموافقات والطلبات','certificate',`${rows([['المراكز والمستخدمون','قائمة الاعتمادات'],['الشهادات المهنية','المراجعة والتوثيق'],['طلبات الخدمات','متابعة الحالة']])}${action('فتح الاعتمادات','admin')}`)}</div>${panel('التنبيهات والإشعارات','bell',uiLocale.html`<div class="hl-notification-summary"><span>${icon('mail')}رسائل الحساب والتنبيهات التشغيلية</span><button type="button" data-board-notifications>فتح مركز الإشعارات ${icon('arrow')}</button></div>`,'hl-board-notifications')}`;
  const lowerFor=(role,c)=>{
    if(role==='admin')return adminPanels();
    if(role==='organization')return uiLocale.html`<div class="hl-portal-lower hl-organization-lower">${panel('حالة خدمات الجهة','compass',uiLocale.html`<div class="hl-board-rows">${c.q.map(([label,state])=>uiLocale.html`<div><span>${authoredLabel(label)}</span><b>${authoredLabel(state)}</b></div>`).join('')}</div><p>افتح بيانات الجهات، ثم اختر الجهة للوصول إلى طلباتها وحجوزاتها وبلاغاتها بحسب عضويتك.</p>`)}${documentsPanel()}${panel('بيانات الجهات','people',uiLocale.html`<p>تحقق من حالة التسجيل والعضويات المرتبطة بحسابك.</p>${action('إدارة بيانات الجهات','organizations')}`)}${panel('مدفوعات الحساب','chart',uiLocale.html`<p>يعرض هذا القسم سجل المدفوعات المرتبط بحساب المستخدم.</p>${action('عرض المدفوعات','finance')}`)}</div>`;
    if(role==='center')return uiLocale.html`<div class="hl-portal-lower hl-center-home-grid" data-center-home-panels>${centerHomePanels(null)}</div>`;
    if(role==='boat')return uiLocale.html`<div class="hl-portal-lower">${panel('الخدمات الفنية وقطع الغيار','wrench',`${rows([['الصيانة والمعدات','سجل المعدات'],['المشتريات','متابعة الطلبات']])}${action('الخدمات الفنية','inventory',true)}${action('قطع الغيار','procurement',true)}`)}${safetyPanel()}${queuePanel(c)}</div>`;
    return uiLocale.html`<div class="hl-portal-lower">${panel('التدريب والتقييم','learn',`${rows([['المواد التدريبية','إدارة الدورات'],['الحضور والمهارات','سجل التدريب']])}${action('المواد التدريبية','training',true)}`)}${panel('الشهادات والملف المهني','certificate',uiLocale.html`<p>شهاداتك واعتماداتك وجداول التكليف</p>${action('الملف المهني','professional-profile',true)}`)}${queuePanel(c)}</div>`;
  };
  function render(role){
    clearDashboard();
    if(role==='diver'||!window.HydrolandAuth?.isAuthenticated?.()||!window.HydrolandPortalAccess?.roleAllowed?.(role))return;
    const c=configs[role];if(!c)return;if(role==='admin')ensureWeatherAdmin();
    const d=document.createElement('section');d.className='hl-role-dashboard';d.dataset.role=role;if(role==='center')d.hidden=true;
    const center=role==='center',operational=['center','boat','instructor'].includes(role),heroTitle={center:'تشغيل مركز الغوص',admin:'مركز القيادة والإدارة',organization:'بوابة الشركات والجهات الحكومية',instructor:'محترفي الغوص',boat:'الوساطة البحرية'}[role];
    const heroSubtitle={center:'نظم رحلاتك… واصنع تجربة غوص استثنائية',admin:'كل ما تحتاجه لإدارة منظومة هيدرولاند في مكان واحد',organization:'إدارة الجهات والوثائق المؤسسية من حسابك',instructor:'علّم، ألهم… واصنع جيلًا من الغواصين',boat:'أدر أسطولك وخدماتك البحرية بثقة'}[role];
    const actions=c.a.filter(([label])=>!center||label!=='المستندات والتراخيص');if(['center','instructor','admin'].includes(role))actions.push(['العقود والتوقيع الإلكتروني','contracts','◇'],['مكتبة العقود','contract-library','◇']);
    uiLocale.setHTML(d, uiLocale.html`${center?uiLocale.html`<header class="hl-center-masthead"><a class="brand" href="#home">${brand()}</a><div class="hl-saudi-mark">${emblem}<span>المملكة العربية السعودية</span></div></header>`:''}<div class="hl-portal-shell">
      <aside id="hl-portal-navigation" class="hl-portal-nav" ${uiLocale.attribute('aria-label',c.t)}>
        ${!center?uiLocale.html`<a class="brand" href="#home">${brand()}</a>`:''}
        <section class="hl-portal-member ${center?'hl-center-member':''}"><span class="avatar" ${center?'data-center-avatar':'data-portal-avatar'}>H</span><div><b ${center?'data-center-name':'data-portal-name'}>حساب HYDROLAND</b><small>${authoredLabel(c.t)}</small></div></section>
        <nav>${c.nav.map((label,index)=>uiLocale.html`<button type="button" class="hl-portal-nav-item${index===0?' active':''}" data-portal-label="${label}" ${index===0?'aria-current="page"':''}>${icon(iconFor(label))}<span>${authoredLabel(label)}</span></button>`).join('')}</nav>
        <div class="hl-portal-safe"><p lang="en" dir="ltr">Explore · Learn<br>Protect · Belong</p><button type="button" class="hl-portal-switch" data-portal-switch>${icon('people')}تبديل الواجهة</button><button type="button" class="hl-portal-switch" data-hl-action="logout">${icon('arrow')}تسجيل الخروج</button></div>
      </aside>
      <div class="hl-portal-main"><header class="hl-portal-topbar"><button type="button" class="icon-button hl-portal-menu" aria-label="فتح قائمة البوابة" aria-expanded="false" data-portal-menu>${icon('menu')}</button><form class="hl-portal-search" role="search">${center?uiLocale.html`<select aria-label="نطاق البحث في المركز"><option value="bookings">الحجوزات</option><option value="customers">العملاء</option><option value="equipment">رمز المعدة</option></select>`:''}<input ${uiLocale.attribute('aria-label',center?'بحث في بيانات المركز':'بحث في المنصة')} ${uiLocale.attribute('placeholder',center?'رقم الحجز أو اسم العميل أو الرحلة':'ابحث في هيدرولاند…')} ${center?'required maxlength="120"':''}><button type="submit" aria-label="بحث">${icon('search')}</button></form><div class="hl-portal-utility"><button type="button" class="hl-locale-switch" data-hl-locale-switch="portal"><span data-hl-locale-name lang="en">EN</span></button><button type="button" class="icon-button" data-portal-notifications aria-label="فتح الإشعارات">${icon('bell')}</button><button type="button" class="icon-button" data-portal-messages aria-label="فتح الرسائل الداخلية">${icon('mail')}</button><button type="button" class="hl-portal-account" data-portal-profile><span class="avatar" data-portal-avatar>H</span><span data-portal-name>حساب HYDROLAND</span></button></div></header>
      <div class="hl-portal-content"><header class="hl-role-head${center?' hl-center-hero':''}"><div><small>${authoredLabel(c.k)}</small><h1>${uiLocale.label(heroTitle)}</h1><p>${uiLocale.label(heroSubtitle)}</p>${role!=='admin'?highlights():''}</div></header>
      ${center?uiLocale.html`<div class="hl-center-home-toolbar"><p data-center-home-status role="status">جارٍ تحميل ملخص المركز…</p><button type="button" data-center-home-refresh>تحديث الملخص</button></div>`:role==='boat'?uiLocale.html`<div class="hl-center-home-toolbar"><p data-marine-home-status role="status">جارٍ تحميل ملخص الوساطة البحرية…</p><button type="button" data-marine-home-refresh>تحديث الملخص</button></div>`:role==='organization'?uiLocale.html`<div class="hl-center-home-toolbar"><p data-organization-home-status role="status">جارٍ تحميل بيانات الجهة…</p><button type="button" data-organization-home-refresh>تحديث الملخص</button></div>`:''}
      <div class="hl-role-grid">${c.m.map(([value,label],index)=>uiLocale.html`<${center?'button type="button" data-route="'+['center-bookings','center-operations','center-team','center-operations'][index]+'"':'article'} class="hl-role-tile">${icon(iconFor(label))}<div><small>${authoredLabel(label)}</small><b>${value}</b><span>${uiLocale.label(center?'فتح التفاصيل':'من النظام')}</span></div></${center?'button':'article'}>`).join('')}</div>
      <section class="hl-command" aria-label="الإجراءات الرئيسية">${['admin','organization'].includes(role)?uiLocale.html`<h2 class="hl-command-title">الخدمات والمهام السريعة</h2>`:''}<div class="hl-command-grid ${operational?'hl-picture-actions':''}">${actions.map(([label,target],index)=>{const route=actionRoute(role,label,target);return uiLocale.html`<button type="button" ${route?`data-route="${route}"`:'disabled aria-disabled="true" '+uiLocale.attribute('title','قيد الربط بالخدمة')} data-action-label="${label}" data-art="${index%6}"><span class="hl-action-art">${icon(iconFor(label))}</span><span>${authoredLabel(label)}</span></button>`}).join('')}</div></section>
      ${lowerFor(role,c)}</div><div class="hl-service-heading" hidden><button type="button" data-portal-home>${icon('home')}الرئيسية</button><span aria-hidden="true">/</span><h1 data-service-title></h1></div></div></div>`);
    document.getElementById('main')?.prepend(d);
    if(role==='admin')uiLocale.setText(d.querySelector('.brand-copy small'), ...['مركز القيادة والإدارة']);
    syncDashboardIdentity();
    if(role==='instructor')void loadInstructorSummary(d);
    if(role==='center')void loadCenterSummary(d);
    if(role==='boat')void loadMarineSummary(d);
    if(role==='organization')void loadOrganizationSummary(d);

    d.querySelector('[data-center-home-refresh]')?.addEventListener('click',()=>loadCenterSummary(d));
    d.querySelector('[data-marine-home-refresh]')?.addEventListener('click',()=>loadMarineSummary(d));
    d.querySelector('[data-organization-home-refresh]')?.addEventListener('click',()=>loadOrganizationSummary(d));
    d.querySelector('[data-board-notifications]')?.addEventListener('click',()=>window.HydrolandAccountCenter?.openNotifications?.());
    d.querySelector('[data-board-messages]')?.addEventListener('click',()=>window.HydrolandMessages?.open?.());
    d.querySelector('[data-portal-profile]')?.addEventListener('click',()=>document.getElementById('profile-dialog')?.showModal());
    window.HydrolandUI.bindNavigationMenu(d.querySelector('[data-portal-menu]'),d.querySelector('.hl-portal-nav'),d,'hl-portal-nav-open');
    d.querySelector('[data-portal-home]').addEventListener('click',()=>window.HydrolandWorkspaceUI?.show?.(d));
    const portalSearch=d.querySelector('.hl-portal-search');
    portalSearch.querySelector('select')?.addEventListener('change',event=>{uiLocale.setAttribute(portalSearch.querySelector('input'), "placeholder", ...[{bookings:'رقم الحجز أو اسم العميل أو الرحلة',customers:'اسم العميل',equipment:'رمز المعدة أو الرقم التسلسلي'}[event.target.value]])});
    portalSearch.addEventListener('submit',event=>{
      event.preventDefault();const query=event.currentTarget.querySelector('input').value.trim();
      if(center){
        if(!query)return;
        const handlers={bookings:window.HydrolandCenterBookings,customers:window.HydrolandCenterCustomers,equipment:window.HydrolandCenterEquipment};
        const handler=handlers[event.currentTarget.querySelector('select').value];
        if(typeof handler?.search==='function')void handler.search(query);
        else {const input=event.currentTarget.querySelector('input');input.dataset.hlSearchUnavailable='1';input.setCustomValidity(uiLocale.t('خدمة البحث غير جاهزة. حدّث الصفحة وأعد المحاولة.'));input.reportValidity();input.addEventListener('input',()=>{delete input.dataset.hlSearchUnavailable;input.setCustomValidity('')},{once:true})}
        return;
      }
      const form=document.getElementById('search-form');form.querySelector('input').value=query;form.requestSubmit();
    });
    d.querySelectorAll('a.brand').forEach(node=>node.addEventListener('click',event=>{event.preventDefault();window.HydrolandWorkspaceUI?.show?.(d)}));
    d.querySelector('[data-portal-notifications]')?.addEventListener('click',()=>window.HydrolandAccountCenter?.openNotifications?.());
    d.querySelector('[data-portal-messages]')?.addEventListener('click',()=>window.HydrolandMessages?.open?.());
    d.querySelector('[data-portal-switch]')?.addEventListener('click',async()=>{
      const freshness=window.HydrolandPortalFreshness;
      if(freshness?.openRoleSwitcher)await freshness.openRoleSwitcher();
      else document.getElementById('role-dialog')?.showModal();
    });
    d.querySelectorAll('[data-route]').forEach(node=>{const label=node.dataset.actionLabel||node.textContent.trim(),id=actionRoute(role,label,node.dataset.route);if(!id){node.disabled=true;node.setAttribute('aria-disabled','true');return}connectControl(node,role,id,label)});
    d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();if(index===0){window.HydrolandWorkspaceUI?.show?.(d);d.classList.remove('hl-portal-nav-open');d.scrollIntoView({behavior: residualScrollBehavior(),block:'start'});return}const id=node.dataset.hlNavRoute;if(!id||!(await authorizeRoleAction(role)))return;if(role==='boat'&&id==='marine-trips'){openTarget(id,role,node.dataset.portalLabel);d.classList.remove('hl-portal-nav-open');return}if(role==='center'&&['center-training','center-safety','center-documents','center-marine-documents','center-equipment','center-customers','center-business-profile','center-operations','center-bookings','center-team','center-reports','center-finance','center-receivables'].includes(id)){openTarget(id,role,node.dataset.portalLabel);d.classList.remove('hl-portal-nav-open');return}const resolvedId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id,target=targetFor(resolvedId);if(!target){setTargetAvailability(node,id,node.dataset.portalLabel);return}if(role!=='center'){d.querySelectorAll('.hl-portal-nav-item').forEach(x=>x.classList.remove('active'));node.classList.add('active')}openTarget(id,role,node.dataset.portalLabel);d.classList.remove('hl-portal-nav-open');target.scrollIntoView({behavior: residualScrollBehavior(),block:'start'});history.replaceState(null,'','#'+(id==='documents'?'hl-documents':id==='marine-documents'?'hl-marine-documents':id))}));
    reconnectDashboard();
    window.HydrolandI18n?.bindNavigation(d);
  }

  document.addEventListener('hydroland:locale-changed',()=>{document.querySelectorAll('[data-hl-search-unavailable]').forEach(input=>input.setCustomValidity(uiLocale.t('خدمة البحث غير جاهزة. حدّث الصفحة وأعد المحاولة.')))});
  for(const event of ['hydroland:center-profile-saved','hydroland:center-trips-changed','hydroland:workspace-home'])document.addEventListener(event,()=>loadCenterSummary(document.querySelector('.hl-role-dashboard[data-role="center"]')));
  for(const event of ['hydroland:marine-assets-changed','hydroland:marine-trips-changed','hydroland:workspace-home'])document.addEventListener(event,()=>loadMarineSummary(document.querySelector('.hl-role-dashboard[data-role="boat"]')));
  window.HydrolandRoleDashboards={refreshControls:reconnectDashboard};
  const applyRole=role=>{const next=role||'diver';if(next==='diver'){clearDashboard();return}render(next)};
  document.addEventListener('hydroland:role-changed',event=>applyRole(event.detail?.role));
  document.addEventListener('hydroland:profile-data-ready',()=>syncDashboardIdentity());
  document.getElementById('exit-role')?.addEventListener('click',clearDashboard);
  document.addEventListener('hydroland:portal-cleared',clearDashboard);
  document.addEventListener('hydroland:session-cleared',clearDashboard);
  document.addEventListener('hydroland:auth-changed',()=>{const role=window.HydrolandPortalAccess?.getCurrentRole?.()||'diver';if(!window.HydrolandAuth?.isAuthenticated?.()||role==='diver'||!window.HydrolandPortalAccess?.roleAllowed?.(role)){clearDashboard();return}applyRole(role)});
  queueMicrotask(()=>applyRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'));
  const taskScript=document.createElement('script');taskScript.src='./hydroland-role-task-routing.js';document.body.appendChild(taskScript);
})();

