(() => {
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("organizations", {
  "إعدادات المشتريات": "Procurement settings",
  "اختر من القائمة أو اكتب خيارًا خاصًا بالجهة.": "Choose a suggestion or enter a custom option.",
  "طريقة الشراء": "Purchasing method",
  "أمر شراء": "Purchase order",
  "شراء مباشر": "Direct purchase",
  "اتفاقية إطارية": "Framework agreement",
  "نظام تبادل طلبات الشراء": "Procurement exchange system",
  "بوابة هيدرولاند": "HYDROLAND portal",
  "مستندات يدوية": "Manual documents",
  "نظام مشتريات الجهة": "Organization procurement system",
  "صفة ممثل الجهة": "Representative role",
  "مسؤول المشتريات": "Procurement officer",
  "ممثل مفوّض": "Authorized representative",
  "اسم ممثل الجهة": "Representative name",
  "مرجع العقد أو الاتفاقية": "Contract or agreement reference",
  "طريقة القبول": "Acceptance method",
  "ميداني": "On site",
  "عن بُعد": "Remote",
  "يُحدّد لاحقًا": "To be decided",
  "مؤكد": "Confirmed",
  "عدد المقاعد": "Number of seats",
  "قيد المعالجة": "Processing",
  "ملغى": "Cancelled",
  "جارٍ تحميل الحجوزات…": "Loading bookings…",
  "تعذر تحميل الحجوزات.": "Could not load bookings.",
  "رحلة": "Trip",
  "بانتظار مراجعة الإدارة": "Awaiting administrative review",
  "موقوف": "Suspended",
  "مسودة": "Draft",
  "نشط": "Active",
  "مكتمل": "Complete",
  "الحجوزات": "Bookings",
  "ر.س.": "SAR",
  "مرفوضة": "Rejected",
  "التفاصيل": "Details",
  "مسؤول تشغيل": "Operations officer",
  "مدرب غوص": "Dive instructor",
  "عضو فريق": "Team member",
  "مشاهد": "Viewer",
  "منتهية": "Expired",
  "إرسال الدعوة": "Send invitation",
  "تعذر إرسال الدعوة.": "Could not send the invitation.",
  "موقوفة": "Suspended",
  "السعر": "Price",
  "إغلاق": "Close",
  "حجوزات": "Bookings",
  "حفظ التعديلات": "Save changes",
  "إلغاء التعديل": "Cancel edit",
  "بيانات الجهة وحالة الاعتماد": "Organization details and approval status",
  "أنشئ جهة فعلية وارفعها لمسار المراجعة الإداري.": "Create an actual organization and submit it for administrative review.",
  "تحديث الحالة": "Refresh status",
  "جهاتي": "My organizations",
  "سجّل الدخول لعرض الجهات المرتبطة بحسابك.": "Sign in to view organizations linked to your account.",
  "تسجيل جهة جديدة": "Register a new organization",
  "اسم الجهة الظاهر": "Organization display name",
  "مثال: مركز هيدرولاند للغوص": "Example: HYDROLAND Dive Center",
  "نوع الجهة": "Organization type",
  "مركز غوص، شركة، جهة حكومية...": "Dive center, company, government organization...",
  "الاسم النظامي (اختياري)": "Legal name (optional)",
  "رقم السجل / الترخيص (اختياري)": "Registration / license number (optional)",
  "المنطقة (اختياري)": "Region (optional)",
  "إرسال للمراجعة": "Submit for review",
  "بيانات المنشأة المالية": "Business financial details",
  "عملة المنشأة": "Business currency",
  "الحالة الضريبية بحسب إقرار المنشأة": "Tax status as declared by the business",
  "لم تُحدد": "Not specified",
  "معفاة من الضرائب بحسب الإقرار": "Tax exempt as declared",
  "خاضعة للضريبة بحسب الإقرار": "Taxable as declared",
  "حالة تسجيل المنشأة": "Business registration status",
  "مسجّلة": "Registered",
  "التسجيل قيد الإجراء": "Registration in progress",
  "غير مسجّلة": "Not registered",
  "التسجيل منتهٍ": "Registration expired",
  "حفظ بيانات المنشأة": "Save business details",
  "مستندات المنشأة وإرفاق PDF": "Business documents and PDF attachments",
  "طلبات الجهة": "Organization requests",
  "جارٍ تحميل الطلبات…": "Loading requests…",
  "تحميل طلبات أقدم": "Load older requests",
  "إنشاء طلب خدمة": "Create a service request",
  "نوع الطلب": "Request type",
  "استفسار": "Question",
  "دعم": "Support",
  "شكوى": "Complaint",
  "مشكلة حجز": "Booking issue",
  "مشكلة دفع": "Payment issue",
  "ملاحظة سلامة": "Safety concern",
  "الموضوع": "Subject",
  "إرسال الطلب": "Send request",
  "حجوزات الجهة": "Organization bookings",
  "طلب حجز رحلة": "Request a trip booking",
  "الرحلة": "Trip",
  "جارٍ تحميل الرحلات…": "Loading trips…",
  "أسماء المشاركين، اسم في كل سطر (اختياري)": "Participant names, one per line (optional)",
  "اتركه فارغًا لإكمال الأسماء لاحقًا": "Leave empty to add names later",
  "أسماء المشاركين مطلوبة قبل اعتماد الحجز. إرسال الطلب لا يؤكد الحجز ولا ينفذ دفعة.": "Participant names are required before booking approval. Submitting a request does not confirm the booking or make a payment.",
  "اختر الرحلة لعرض سعر المقاعد.": "Choose a trip to view seat pricing.",
  "إرسال طلب الحجز": "Send booking request",
  "سلامة الجهة": "Organization safety",
  "جارٍ تحميل البلاغات…": "Loading reports…",
  "الإبلاغ عن حادثة أو ملاحظة سلامة": "Report an incident or safety concern",
  "الحجز المرتبط": "Linked booking",
  "اختر حجزًا": "Choose a booking",
  "الخطورة": "Severity",
  "منخفضة": "Low",
  "متوسطة": "Medium",
  "عالية": "High",
  "حرجة": "Critical",
  "الموقع (اختياري)": "Location (optional)",
  "إرسال البلاغ": "Send report",
  "لا تُنشأ أي جهة أو حالة اعتماد تجريبية.": "No sample organization or approval status is created.",
  "خدمة المصادقة غير جاهزة.": "Authentication service is not ready.",
  "تعذر إكمال الطلب.": "Could not complete the request.",
  "معتمدة ونشطة": "Approved and active",
  "مؤرشفة": "Archived",
  "مالك الجهة": "Organization owner",
  "مدير الجهة": "Organization manager",
  "دعوة معلّقة": "Pending invitation",
  "بيانات المنشأة المالية ·": "Business financial details ·",
  "جارٍ قراءة بيانات المنشأة…": "Reading business details…",
  "تعذرت قراءة بيانات المنشأة.": "Could not read business details.",
  "تعذر فتح مستندات المنشأة. حدّث الصفحة وحاول مجددًا.": "Could not open business documents. Refresh the page and try again.",
  "حُفظت بيانات المنشأة.": "Business details saved.",
  "لا توجد جهات مرتبطة بحسابك حتى الآن.": "No organizations are linked to your account yet.",
  "· دورك:": "· Your role:",
  "العضوية:": "Membership:",
  "تعديل بيانات الجهة": "Edit organization details",
  "عرض العضويات": "View memberships",
  "طلبات الخدمات": "Service requests",
  "السلامة والبلاغات": "Safety and reports",
  "عضويات": "Memberships",
  "عضو": "Member",
  "لا توجد عضويات مسجلة لهذه الجهة.": "No memberships recorded for this organization.",
  "دعوة عضو": "Invite a member",
  "البريد المسجل في HYDROLAND": "Email registered in HYDROLAND",
  "الدور داخل الجهة": "Role within the organization",
  "تصل الدعوة إلى إشعارات المستخدم، ولا تتفعل العضوية إلا بعد قبولها.": "The invitation appears in the user's notifications. Membership activates only after acceptance.",
  "سجّل الدخول بحسابك أولاً لعرض الجهات أو إنشاء جهة جديدة.": "Sign in first to view your organizations or create a new one.",
  "تم تحميل بيانات الجهات المرتبطة بحسابك من خادم HYDROLAND.": "Organizations linked to your account loaded from the HYDROLAND server.",
  "تعذر الاتصال بخدمة الجهات.": "Could not connect to the organization service.",
  "بانتظار الاعتماد": "Awaiting approval",
  "سعر الرحلة غير محدد؛ يرسل الطلب للمراجعة ولا ينفذ دفعة.": "The trip price is unspecified. The request is submitted for review without making a payment.",
  "سعر المقعد:": "Seat price:",
  "إجمالي المقاعد المختارة:": "Selected seats total:",
  "أدخل عدد مقاعد صالحًا.": "Enter a valid number of seats.",
  "السعر المعروض قبل مراجعة الطلب؛ لا تُنفذ دفعة هنا.": "The displayed price is subject to request review. No payment is made here.",
  "جارٍ تحميل أسعار الرحلات…": "Loading trip prices…",
  "مقعدًا": "seats",
  "اسم المشارك": "Participant name",
  "المؤهل": "Qualification",
  "حفظ بيانات المشارك": "Save participant details",
  "إلغاء الحجز (لا ينفذ استردادًا)": "Cancel booking (does not issue a refund)",
  "لا توجد حجوزات مسجلة لهذه الجهة.": "No bookings recorded for this organization.",
  "اختر رحلة متاحة": "Choose an available trip",
  "· المتبقي": "· Remaining",
  "لا توجد بلاغات سلامة مرتبطة بحجوزات الجهة.": "No safety reports are linked to this organization's bookings.",
  "تعذر تحميل البلاغات.": "Could not load reports.",
  "اكتب اسمًا لكل مقعد أو اترك الأسماء فارغة لإكمالها لاحقًا.": "Enter one name per seat or leave names empty to complete later.",
  "تم تسجيل طلب الحجز بحالة انتظار.": "Booking request recorded as pending.",
  "ر.س للمقعد.": "SAR per seat.",
  "لم يُضبط سعر الرحلة بعد.": "The trip price has not been set yet.",
  "تعذر إرسال طلب الحجز.": "Could not send the booking request.",
  "حدّث قائمة الحجوزات قبل تعديل المشاركين.": "Refresh the booking list before editing participants.",
  "تعذر حفظ بيانات المشارك.": "Could not save participant details.",
  "اكتب سبب الإلغاء (10 أحرف على الأقل). لن يُنفّذ النظام استردادًا ماليًا.": "Enter a cancellation reason (at least 10 characters). The system will not issue a refund.",
  "اكتب سبب إلغاء من 10 إلى 1000 حرف.": "Enter a cancellation reason of 10 to 1000 characters.",
  "تعذر تحميل حالة الحجز. حدّث الصفحة قبل الإلغاء.": "Could not load booking status. Refresh the page before cancelling.",
  "تعذر إلغاء الحجز.": "Could not cancel the booking.",
  "تم تسجيل البلاغ وربطه بحجز الجهة.": "Report recorded and linked to the organization's booking.",
  "تعذر إرسال البلاغ.": "Could not send the report.",
  "أُلغي تعديل بيانات الجهة.": "Organization edit cancelled.",
  "سلامة": "Safety",
  "طلبات": "Requests",
  "عدّل البيانات المطلوبة ثم احفظها. سيحتفظ النظام بحالة الاعتماد وفق سياسة الجهة.": "Edit the required details, then save. Approval status is retained according to the organization's policy.",
  "تعذر تحميل بيانات العضويات.": "Could not load membership details.",
  "لم تُسجّل الدعوة في حالة انتظار.": "The invitation was not recorded as pending.",
  "أُرسلت الدعوة. تنتظر قبول صاحب الحساب من إشعاراته.": "Invitation sent. Awaiting the account holder's acceptance from their notifications.",
  "مفتوح": "Open",
  "بانتظار رد الجهة": "Awaiting organization response",
  "تم الحل": "Resolved",
  "مغلق": "Closed",
  "لا توجد طلبات خدمة لهذه الجهة.": "No service requests for this organization.",
  "الجهة": "Organization",
  "مهلة الحالة:": "Case deadline:",
  "رد صاحب الطلب على الحل": "Requester's response to the resolution",
  "أقبل الحل وأغلق الطلب": "I accept the resolution and close the request",
  "أعترض وأطلب متابعة المعالجة": "I object and request further handling",
  "إضافة رد": "Add a reply",
  "اكتب ردًا على الطلب": "Write a reply to the request",
  "إرسال الرد": "Send reply",
  "تعذر تحميل الطلبات.": "Could not load requests.",
  "تم إرسال الطلب وحفظه في سجل خدمة العملاء.": "Request sent and saved in the customer-service history.",
  "تعذر إرسال الطلب.": "Could not send the request.",
  "تغيرت حالة الطلب. أعد فتح طلبات الجهة قبل المتابعة.": "The request status has changed. Reopen organization requests before continuing.",
  "لم يعد هذا الطلب أو الإجراء متاحًا لحسابك. أعد فتح طلبات الجهة.": "This request or action is no longer available to your account. Reopen organization requests.",
  "تعذر تأكيد الحفظ. أعد فتح الطلب للتحقق من الحالة.": "Could not confirm saving. Reopen the request to check its status.",
  "سجّل الدخول أولاً قبل إرسال طلب الجهة.": "Sign in first before submitting the organization request.",
  "حُفظت تعديلات الجهة.": "Organization changes saved.",
  "تم إرسال الجهة للمراجعة. ستظهر الحالة الفعلية بعد قرار الإدارة.": "Organization submitted for review. Its actual status will appear after the administrative decision.",
  "تعذر إرسال طلب الجهة. تحقق من البيانات المدخلة.": "Could not submit the organization request. Check the details you entered.",
  "بيانات المنشأة المالية · {0}": "Business financial details · {0}",
  "سعر المقعد: {0} ر.س.{1} السعر المعروض قبل مراجعة الطلب؛ لا تُنفذ دفعة هنا.": "Seat price: {0} SAR{1} The displayed price is subject to request review. No payment is made here.",
  " إجمالي المقاعد المختارة: {0} ر.س.": " Selected seats total: {0} SAR",
  " أدخل عدد مقاعد صالحًا.": " Enter a valid number of seats.",
  "تم تسجيل طلب الحجز بحالة انتظار. {0}": "Booking request recorded as pending. {0}",
  "السعر {0} ر.س للمقعد.": "Price {0} SAR per seat.",
  "حجوزات {0}": "Bookings {0}",
  "سلامة {0}": "Safety {0}",
  "طلبات {0}": "Requests {0}"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredStatusLabel=(status)=>((value=>value?uiLocale.message(value):value)({ PENDING_REVIEW: 'بانتظار مراجعة الإدارة', ACTIVE: 'معتمدة ونشطة', REJECTED: 'مرفوضة', SUSPENDED: 'موقوفة', ARCHIVED: 'مؤرشفة', DRAFT: 'مسودة' }[status]) || status);
  const authoredRoleLabel=(role)=>((value=>value?uiLocale.message(value):value)({ OWNER: 'مالك الجهة', ADMIN: 'مدير الجهة', OPERATOR: 'مسؤول تشغيل', INSTRUCTOR: 'مدرب غوص', STAFF: 'عضو فريق', VIEWER: 'مشاهد' }[role]) || role);
  const authoredMembershipStatusLabel=(status)=>((value=>value?uiLocale.message(value):value)({ ACTIVE: 'نشط', PENDING: 'دعوة معلّقة', SUSPENDED: 'موقوف', REMOVED: 'منتهية' }[status]) || status);
  const authoredBookingStatus=(status)=>((value=>value?uiLocale.message(value):value)({ PENDING: 'بانتظار الاعتماد', CONFIRMED: 'مؤكد', CANCELLED: 'ملغى', COMPLETED: 'مكتمل' }[status]) || status);
  const authoredSeverityLabel=(severity)=>((value=>value?uiLocale.message(value):value)({ LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية', CRITICAL: 'حرجة' }[severity]) || severity);
  const authoredCaseStatusLabel=(status)=>((value=>value?uiLocale.message(value):value)({ OPEN: 'مفتوح', ASSIGNED: 'قيد المعالجة', WAITING_CUSTOMER: 'بانتظار رد الجهة', RESOLVED: 'تم الحل', CLOSED: 'مغلق' }[status]) || status);

  // Read live preference per action; missing media support must not animate.
  const residualScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  if (!document.querySelector('script[data-hl-contract-library]')) {
    const library=document.createElement('script');library.src='./hydroland-contract-library.js';library.dataset.hlContractLibrary='1';document.body.appendChild(library);
  }
  if (!document.querySelector('script[data-hl-contracts]')) {
    const contracts=document.createElement('script');contracts.src='./hydroland-contracts.js';contracts.dataset.hlContracts='1';document.body.appendChild(contracts);
  }
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
  uiLocale.setHTML(panel, uiLocale.html`
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
    <section class="hl-org-requests" data-org-financial hidden>
      <header><h4 data-org-financial-title>بيانات المنشأة المالية</h4><button type="button" data-org-financial-close>إغلاق</button></header>
      <form class="hl-org-form" data-org-financial-form hidden>
        <label>عملة المنشأة<input name="currency" value="الريال السعودي (SAR)" readonly></label>
        <label>الحالة الضريبية بحسب إقرار المنشأة<select name="taxStatus"><option value="UNDECLARED">لم تُحدد</option><option value="EXEMPT">معفاة من الضرائب بحسب الإقرار</option><option value="TAXABLE">خاضعة للضريبة بحسب الإقرار</option></select></label>
        <label>حالة تسجيل المنشأة<select name="registrationStatus"><option value="UNDECLARED">لم تُحدد</option><option value="REGISTERED">مسجّلة</option><option value="IN_PROGRESS">التسجيل قيد الإجراء</option><option value="NOT_REGISTERED">غير مسجّلة</option><option value="EXPIRED">التسجيل منتهٍ</option></select></label>
        <details><summary>إعدادات المشتريات</summary><p>اختر من القائمة أو اكتب خيارًا خاصًا بالجهة.</p>
          <label>طريقة الشراء<input name="method" data-procurement-field maxlength="200" list="org-proc-method"></label>
          <datalist id="org-proc-method"><option>أمر شراء</option><option>شراء مباشر</option><option>اتفاقية إطارية</option></datalist>
          <label>نظام تبادل طلبات الشراء<input name="system" data-procurement-field maxlength="200" list="org-proc-system"></label>
          <datalist id="org-proc-system"><option>بوابة هيدرولاند</option><option>مستندات يدوية</option><option>نظام مشتريات الجهة</option></datalist>
          <label>صفة ممثل الجهة<input name="representativeRole" data-procurement-field maxlength="200" list="org-proc-representativeRole"></label>
          <datalist id="org-proc-representativeRole"><option>مسؤول المشتريات</option><option>ممثل مفوّض</option><option>مدير الجهة</option></datalist>
          <label>اسم ممثل الجهة<input name="representativeName" data-procurement-field maxlength="200"></label>
          <label>مرجع العقد أو الاتفاقية<input name="contractReference" data-procurement-field maxlength="200"></label>
          <label>طريقة القبول<input name="acceptanceMethod" data-procurement-field maxlength="200" list="org-proc-acceptanceMethod"></label>
          <datalist id="org-proc-acceptanceMethod"><option>ميداني</option><option>عن بُعد</option><option>يُحدّد لاحقًا</option></datalist>
        </details>
        <div class="hl-org-form-actions"><button type="submit">حفظ بيانات المنشأة</button><button type="button" data-org-financial-docs>مستندات المنشأة وإرفاق PDF</button></div>
      </form>
      <p data-org-financial-note role="status"></p>
    </section>
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
        <small>أسماء المشاركين مطلوبة قبل اعتماد الحجز. إرسال الطلب لا يؤكد الحجز ولا ينفذ دفعة.</small>
        <p data-org-trip-summary role="status">اختر الرحلة لعرض سعر المقاعد.</p>
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
  `);
  host.insertAdjacentElement('afterend', panel);

  const note = (message) => { const el = panel.querySelector('[data-org-note]'); if (el) uiLocale.setMessage(el, message); };
  const request = async (path, options = {}) => {
    const client = window.HydrolandAuth?.authorizedFetch;
    if (!client) throw localError('خدمة المصادقة غير جاهزة.');
    const response = await client(path, options);
    const body = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign((value=>value?new Error(value):localError('تعذر إكمال الطلب.'))(body?.message), { status: response.status });
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
  let bookingTripQuotes = new Map();
  const pendingCancellations = new Map();
  let selectedSafetyOrganization = null;
  let safetyLoadVersion = 0;
  let directoryLoadVersion = 0;
  const profileSection = panel.querySelector('[data-org-financial]');
  const profileForm = profileSection.querySelector('form');
  const profileNote = profileSection.querySelector('[role="status"]');
  let profileContext = null;
  function closeFinancialProfile() {
    profileContext = null;
    profileForm.reset();
    profileForm.querySelector('details').open = false;
    profileForm.hidden = true;
    profileSection.hidden = true;
    profileNote.textContent = '';
    uiLocale.setMessage(profileSection.querySelector('h4'), uiLocale.message('بيانات المنشأة المالية'));
  }
  function activeProfile(context) {
    return profileContext === context && window.HydrolandAuth?.isAuthenticated?.()
      && window.HydrolandAuth.getSessionVersion?.() === context.session;
  }
  async function openFinancialProfile(organization) {
    closeFinancialProfile();
    const context = { organizationId: organization.id, session: window.HydrolandAuth?.getSessionVersion?.(), revision: null };
    profileContext = context;
    profileSection.hidden = false;
    uiLocale.setText(profileSection.querySelector('h4'), "بيانات المنشأة المالية · {0}", [organization.displayName]);
    uiLocale.setMessage(profileNote, uiLocale.message('جارٍ قراءة بيانات المنشأة…'));
    profileSection.scrollIntoView({ behavior: residualScrollBehavior(), block: 'start' });
    try {
      const data = await request('/organizations/' + encodeURIComponent(organization.id) + '/financial-profile');
      if (!activeProfile(context)) return;
      if (data?.currency !== 'SAR' || !Number.isSafeInteger(data.revision)) throw localError('تعذرت قراءة بيانات المنشأة.');
      profileForm.elements.taxStatus.value = data.taxStatus;
      profileForm.elements.registrationStatus.value = data.registrationStatus;
      context.hasProcurement = Boolean(data.procurement);
      for (const input of profileForm.querySelectorAll('[data-procurement-field]')) input.value = data.procurement?.[input.name] ?? '';
      context.revision = data.revision;
      profileForm.hidden = false;
      profileForm.querySelector('[type="submit"]').disabled = false;
      profileNote.textContent = '';
    } catch (error) { if (activeProfile(context)) setLocalErrorText(profileNote, error, ''); }
  }
  profileSection.querySelector('[data-org-financial-close]').addEventListener('click', closeFinancialProfile);
  profileForm.querySelector('[data-org-financial-docs]').addEventListener('click', () => {
    if (!profileContext || !activeProfile(profileContext)) return;
    if (!window.HydrolandDocuments?.open) { uiLocale.setMessage(profileNote, uiLocale.message('تعذر فتح مستندات المنشأة. حدّث الصفحة وحاول مجددًا.')); return; }
    window.HydrolandDocuments.open({ organizationId: profileContext.organizationId, department: 'FINANCE' });
  });
  profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    const context = profileContext;
    if (!context || !activeProfile(context) || context.revision === null) return;
    const submit = profileForm.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const body = { currency: 'SAR', taxStatus: profileForm.elements.taxStatus.value, registrationStatus: profileForm.elements.registrationStatus.value, expectedRevision: context.revision };
    const procurement = {};
    for (const input of profileForm.querySelectorAll('[data-procurement-field]')) {
      if (input.value.trim()) procurement[input.name] = input.value.trim();
    }
    if (Object.keys(procurement).length || context.hasProcurement) body.procurement = procurement;
    try {
      const saved = await request('/organizations/' + encodeURIComponent(context.organizationId) + '/financial-profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!activeProfile(context)) return;
      context.revision = saved.revision;
      context.hasProcurement = Boolean(saved.procurement);
      uiLocale.setMessage(profileNote, uiLocale.message('حُفظت بيانات المنشأة.'));
    } catch (error) {
      if (activeProfile(context)) {
        if (error.status === 409) context.revision = null;
        setLocalErrorText(profileNote, error, '');
      }
    } finally { if (activeProfile(context)) submit.disabled = context.revision === null; }
  });
  const clearPrivateViews = () => {
    closeFinancialProfile();
    pendingBookingRequest = null;
    bookingTripQuotes.clear();
    uiLocale.setMessage(panel.querySelector('[data-org-trip-summary]'), uiLocale.message('اختر الرحلة لعرض سعر المقاعد.'));
    pendingCancellations.clear();
    for (const selector of ['[data-org-members]', '[data-org-request-list]', '[data-org-booking-list]', '[data-org-incident-list]']) uiLocale.setHTML(panel.querySelector(selector), '');
    for (const selector of ['[data-org-requests-note]', '[data-org-booking-note]', '[data-org-safety-note]']) panel.querySelector(selector).textContent = '';
    for (const selector of ['[data-org-request-form]', '[data-org-booking-form]', '[data-org-incident-form]']) panel.querySelector(selector).reset();
  };

  const resetForm = () => {
    editingOrganization = null;
    panel.querySelector('[data-org-form]').reset();
    uiLocale.setMessage(panel.querySelector('[data-org-form-title]'), uiLocale.message('تسجيل جهة جديدة'));
    uiLocale.setMessage(panel.querySelector('[data-org-submit]'), uiLocale.message('إرسال للمراجعة'));
    panel.querySelector('[data-org-cancel]').hidden = true;
  };

  function render(items) {
    const list = panel.querySelector('[data-org-list]');
    if (!list) return;
    if (!items.length) { uiLocale.setHTML(list, uiLocale.html`<p>لا توجد جهات مرتبطة بحسابك حتى الآن.</p>`); return; }
    uiLocale.setHTML(list, items.map(({ organization, role, status }) => {
      const manager = status === 'ACTIVE' && ['OWNER', 'ADMIN'].includes(role);
      const canViewRequests = status === 'ACTIVE' && organization.status === 'ACTIVE';
      const canOperate = status === 'ACTIVE' && organization.status === 'ACTIVE' && ['OWNER', 'ADMIN', 'OPERATOR'].includes(role);
      const canReportSafety = status === 'ACTIVE' && organization.status === 'ACTIVE' && ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(role);
      return uiLocale.html`<article class="hl-org-item" data-org-id="${esc(organization.id)}"><div><strong>${esc(organization.displayName)}</strong><small>${esc(organization.kind)} · دورك: ${uiLocale.messageHTML(authoredRoleLabel(role))}</small></div><span class="hl-org-status ${esc(organization.status.toLowerCase())}">${uiLocale.messageHTML(authoredStatusLabel(organization.status))}</span><small>العضوية: ${esc(status)}</small>${(manager || canViewRequests || canOperate || canReportSafety?uiLocale.html`<div class="hl-org-item-actions">${(manager?uiLocale.html`<button type="button" data-org-edit>تعديل بيانات الجهة</button><button type="button" data-org-financial-open>بيانات المنشأة المالية</button><button type="button" data-org-view-members>عرض العضويات</button>`:'')}${(canViewRequests?uiLocale.html`<button type="button" data-org-requests-open>طلبات الخدمات</button>`:'')}${(canViewRequests?uiLocale.html`<button type="button" data-org-bookings-open>الحجوزات</button>`:'')}${(canReportSafety?uiLocale.html`<button type="button" data-org-safety-open>السلامة والبلاغات</button>`:'')}</div>`:'')}</article>`;
    }).join(''));
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
    const roleOptions = (membership.role === 'OWNER' ? uiLocale.html`<option value="ADMIN">مدير الجهة</option>` : '') + uiLocale.html`<option value="OPERATOR">مسؤول تشغيل</option><option value="INSTRUCTOR">مدرب غوص</option><option value="STAFF">عضو فريق</option><option value="VIEWER">مشاهد</option>`;
    uiLocale.setHTML(box, uiLocale.html`<h4>عضويات ${esc(membership.organization.displayName)}</h4>${(people.length?uiLocale.html`<div class="hl-org-members">${people.map(member => {
      const person = member.account?.person || {};
      const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || member.account?.email || uiLocale.t('عضو');
      return uiLocale.html`<article><strong>${esc(name)}</strong><span>${uiLocale.messageHTML(authoredRoleLabel(member.role))}</span><small>${uiLocale.messageHTML(authoredMembershipStatusLabel(member.status))}${(member.account?.email?' · ' + esc(member.account.email):'')}</small></article>`;
    }).join('')}</div>`:uiLocale.html`<p>لا توجد عضويات مسجلة لهذه الجهة.</p>`)}${(invite?uiLocale.html`<form class="hl-org-invite" data-org-invite data-org-id="${esc(organizationId)}"><h5>دعوة عضو</h5><label>البريد المسجل في HYDROLAND<input type="email" name="email" required maxlength="254" autocomplete="off" placeholder="name@example.com"></label><label>الدور داخل الجهة<select name="role" required>${roleOptions}</select></label><small>تصل الدعوة إلى إشعارات المستخدم، ولا تتفعل العضوية إلا بعد قبولها.</small><button type="submit">إرسال الدعوة</button><p data-org-invite-feedback role="status"></p></form>`:'')}`);
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
    if (!current()) { stateMemberships = []; render([]); panel.querySelector('[data-org-members]').hidden = true; note(uiLocale.message('سجّل الدخول بحسابك أولاً لعرض الجهات أو إنشاء جهة جديدة.')); return; }
    try {
      const memberships = await request('/organizations/mine');
      if (!current()) return;
      stateMemberships = Array.isArray(memberships) ? memberships : [];
      render(stateMemberships);
      note((typeof successMessage === 'string'?successMessage:uiLocale.message('تم تحميل بيانات الجهات المرتبطة بحسابك من خادم HYDROLAND.')));
    } catch (error) { if (!current()) return; stateMemberships = []; render([]); panel.querySelector('[data-org-members]').hidden = true; note(localErrorMessage((error instanceof Error?error:undefined), 'تعذر الاتصال بخدمة الجهات.')); }
  }

  const bookingStatus = (status) => ({ PENDING: 'بانتظار الاعتماد', CONFIRMED: 'مؤكد', CANCELLED: 'ملغى', COMPLETED: 'مكتمل' }[status] || status);
  const severityLabel = (severity) => ({ LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية', CRITICAL: 'حرجة' }[severity] || severity);
  const updateBookingQuote = () => {
    const form = panel.querySelector('[data-org-booking-form]'), summary = panel.querySelector('[data-org-trip-summary]');
    const id = form.elements.tripId.value, price = bookingTripQuotes.get(id), seats = Number(form.elements.seats.value);
    if (!id) { uiLocale.setMessage(summary, uiLocale.message('اختر الرحلة لعرض سعر المقاعد.')); return; }
    if (!price?.configured || !Number.isSafeInteger(price.pricePerSeatMinor) || price.pricePerSeatMinor < 0 || price.currency !== 'SAR') { uiLocale.setMessage(summary, uiLocale.message('سعر الرحلة غير محدد؛ يرسل الطلب للمراجعة ولا ينفذ دفعة.')); return; }
    const total = price.pricePerSeatMinor * seats;
    uiLocale.setText(summary, "سعر المقعد: {0} ر.س.{1} السعر المعروض قبل مراجعة الطلب؛ لا تُنفذ دفعة هنا.", [(price.pricePerSeatMinor / 100).toFixed(2), (Number.isInteger(seats) && seats >= 1 && seats <= 30 && Number.isSafeInteger(total)?uiLocale.message(" إجمالي المقاعد المختارة: {0} ر.س.", [(total / 100).toFixed(2)]):uiLocale.message(' أدخل عدد مقاعد صالحًا.'))]);
  };
  panel.querySelector('[data-org-trip]').addEventListener('change', updateBookingQuote);
  panel.querySelector('[data-org-booking-form] [name="seats"]').addEventListener('input', updateBookingQuote);
  async function loadOrganizationBookings(organizationId, membership) {
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = ++bookingLoadVersion;
    selectedBookingsOrganization = organizationId;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === bookingLoadVersion && selectedBookingsOrganization === organizationId);
    bookingTripQuotes.clear();
    panel.querySelector('[data-org-booking-form]').hidden = true;
    uiLocale.setMessage(panel.querySelector('[data-org-trip-summary]'), uiLocale.message('جارٍ تحميل أسعار الرحلات…'));
    const box = panel.querySelector('[data-org-booking-list]'); uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل الحجوزات…</p>`);
    try {
      const [result, trips] = await Promise.all([request('/organizations/' + encodeURIComponent(organizationId) + '/bookings?page=1&pageSize=50'), request('/trips')]);
      if (!current()) return;
      const rows = Array.isArray(result?.items) ? result.items : [];
      const mayEdit = ['OWNER', 'ADMIN', 'OPERATOR'].includes(membership.role);
      const mayCancel = ['OWNER', 'ADMIN'].includes(membership.role);
      uiLocale.setHTML(box, rows.length ? rows.map(booking => {
        const canEdit = mayEdit && booking.status === 'PENDING' && new Date(booking.trip?.startsAt) > new Date();
        return uiLocale.html`<article class="hl-org-request" data-org-booking-id="${esc(booking.id)}" data-org-booking-version="${esc(booking.updatedAt)}"><div><strong>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة')))(booking.trip?.title)}</strong><span>${uiLocale.messageHTML(authoredBookingStatus(booking.status))}</span></div><small>${esc(new Date(booking.trip?.startsAt).toLocaleString('ar-SA'))} · ${esc(booking.seats)} مقعدًا</small><div class="hl-org-participants">${(booking.participants || []).map(person => uiLocale.html`<form data-org-participant data-participant-id="${esc(person.id)}"><label>اسم المشارك<input name="fullName" value="${esc(person.fullName)}" maxlength="160" required ${canEdit ? '' : 'disabled'}></label><label>المؤهل<input name="certificationTitle" value="${esc(person.certificationTitle || '')}" maxlength="160" ${canEdit ? '' : 'disabled'}></label>${(canEdit?uiLocale.html`<button type="submit">حفظ بيانات المشارك</button>`:uiLocale.html`<small>${esc(person.eligibilityStatus)}</small>`)}</form>`).join('')}</div>${(mayCancel && booking.status === 'PENDING'?uiLocale.html`<button type="button" data-org-booking-cancel>إلغاء الحجز (لا ينفذ استردادًا)</button>`:'')}</article>`;
      }).join('') : uiLocale.html`<p>لا توجد حجوزات مسجلة لهذه الجهة.</p>`);
      const tripsSelect = panel.querySelector('[data-org-trip]');
      const availableTrips = (Array.isArray(trips) ? trips : []).filter(trip => trip.status === 'OPEN' && new Date(trip.startsAt) > new Date());
      bookingTripQuotes = new Map(availableTrips.map(trip => [trip.id, trip.price]));
      uiLocale.setHTML(tripsSelect, uiLocale.html`<option value="">اختر رحلة متاحة</option>${availableTrips.map(trip => uiLocale.html`<option value="${esc(trip.id)}">${esc(trip.title)} · ${esc(new Date(trip.startsAt).toLocaleString('ar-SA'))} · المتبقي ${esc(trip.remainingSeats)}</option>`).join('')}`);
      tripsSelect.disabled = !mayEdit || availableTrips.length === 0;
      panel.querySelector('[data-org-booking-form]').hidden = !mayEdit || availableTrips.length === 0;
      updateBookingQuote();
    } catch (error) { if (current()) uiLocale.setHTML(box, uiLocale.html`<p class="hl-org-error">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل الحجوزات.')}</p>`); }
  }
  async function loadOrganizationIncidents(organizationId, membership) {
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = ++safetyLoadVersion;
    selectedSafetyOrganization = organizationId;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === safetyLoadVersion && selectedSafetyOrganization === organizationId);
    const box = panel.querySelector('[data-org-incident-list]'); uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل البلاغات…</p>`);
    try {
      const [incidents, bookings] = await Promise.all([request('/organizations/' + encodeURIComponent(organizationId) + '/safety/incidents'), request('/organizations/' + encodeURIComponent(organizationId) + '/bookings?page=1&pageSize=50')]);
      if (!current()) return;
      const rows = Array.isArray(incidents) ? incidents : [];
      uiLocale.setHTML(box, rows.length ? rows.map(item => uiLocale.html`<article class="hl-org-request"><div><strong>${esc(item.title)}</strong><span>${uiLocale.messageHTML(authoredSeverityLabel(item.severity))} · ${esc(item.status)}</span></div><small>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة')))(item.trip?.title)} · ${esc(new Date(item.createdAt).toLocaleString('ar-SA'))}${(item.locationName?' · ' + esc(item.locationName):'')}</small><p>${esc(item.description)}</p></article>`).join('') : uiLocale.html`<p>لا توجد بلاغات سلامة مرتبطة بحجوزات الجهة.</p>`);
      const select = panel.querySelector('[data-org-incident-booking]');
      const booked = Array.isArray(bookings?.items) ? bookings.items : [];
      uiLocale.setHTML(select, uiLocale.html`<option value="">اختر حجزًا</option>${booked.map(item => uiLocale.html`<option value="${esc(item.id)}">${esc(item.trip?.title || item.id)} · ${uiLocale.messageHTML(authoredBookingStatus(item.status))}</option>`).join('')}`);
      const canReport = ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership.role);
      panel.querySelector('[data-org-incident-form]').hidden = !canReport || booked.length === 0;
    } catch (error) { if (current()) uiLocale.setHTML(box, uiLocale.html`<p class="hl-org-error">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل البلاغات.')}</p>`); }
  }

  panel.querySelector('[data-org-booking-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const organizationId = selectedBookingsOrganization;
    const membership = stateMemberships.find(row => row.organization?.id === organizationId);
    if (!organizationId || !membership || !['OWNER', 'ADMIN', 'OPERATOR'].includes(membership.role)) return;
    const form = event.currentTarget, values = Object.fromEntries(new FormData(form).entries());
    const seats = Number(values.seats), participantNames = String(values.participantNames || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (participantNames.length && participantNames.length !== seats) { uiLocale.setMessage(panel.querySelector('[data-org-booking-note]'), uiLocale.message('اكتب اسمًا لكل مقعد أو اترك الأسماء فارغة لإكمالها لاحقًا.')); return; }
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
      uiLocale.setText(panel.querySelector('[data-org-booking-note]'), "تم تسجيل طلب الحجز بحالة انتظار. {0}", [(result?.price?.configured?uiLocale.message("السعر {0} ر.س للمقعد.", [(result.price.pricePerSeatMinor / 100).toFixed(2)]):uiLocale.message('لم يُضبط سعر الرحلة بعد.'))]);
      await loadOrganizationBookings(organizationId, membership);
    } catch (error) { if (current()) setLocalErrorText(panel.querySelector('[data-org-booking-note]'), (error instanceof Error?error:undefined), 'تعذر إرسال طلب الحجز.'); }
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
    if (!body.expectedUpdatedAt) { note(uiLocale.message('حدّث قائمة الحجوزات قبل تعديل المشاركين.')); return; }
    const button = form.querySelector('button'); if (button) button.disabled = true;
    try {
      await request('/organizations/' + encodeURIComponent(organizationId) + '/bookings/' + encodeURIComponent(bookingId) + '/participants/' + encodeURIComponent(participantId), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (current()) await loadOrganizationBookings(organizationId, stateMemberships.find(row => row.organization?.id === organizationId));
    } catch (error) { if (current()) note(localErrorMessage((error instanceof Error?error:undefined), 'تعذر حفظ بيانات المشارك.')); }
    finally { if (button) button.disabled = false; }
  });
  panel.querySelector('[data-org-booking-list]')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-org-booking-cancel]'); if (!button) return;
    const organizationId = selectedBookingsOrganization, bookingId = button.closest('[data-org-booking-id]')?.dataset.orgBookingId;
    if (!organizationId || !bookingId) return;
    const reason = window.prompt(uiLocale.t('اكتب سبب الإلغاء (10 أحرف على الأقل). لن يُنفّذ النظام استردادًا ماليًا.'))?.trim(); if (!reason) return;
    if (reason.length < 10 || reason.length > 1000) { note(uiLocale.message('اكتب سبب إلغاء من 10 إلى 1000 حرف.')); return; }
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = bookingLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedBookingsOrganization === organizationId && version === bookingLoadVersion);
    button.disabled = true;
    const path = '/organizations/' + encodeURIComponent(organizationId) + '/bookings/' + encodeURIComponent(bookingId);
    const key = JSON.stringify([session, organizationId, bookingId, reason]);
    try {
      let command = pendingCancellations.get(key);
      if (!command) {
        const detail = await request(path); if (!current()) return;
        if (!/^[a-f0-9]{64}$/.test(detail?.stateToken || '')) throw localError('تعذر تحميل حالة الحجز. حدّث الصفحة قبل الإلغاء.');
        command = { requestId: crypto.randomUUID(), expectedState: detail.stateToken, reason };
        pendingCancellations.set(key, command);
      }
      await request(path + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
      if (current()) { pendingCancellations.delete(key); await loadOrganizationBookings(organizationId, stateMemberships.find(row => row.organization?.id === organizationId)); }
    }
    catch (error) { if (current()) { if (error?.status >= 400 && error.status < 500) pendingCancellations.delete(key); note(localErrorMessage((error instanceof Error?error:undefined), 'تعذر إلغاء الحجز.')); } } finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-incident-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const organizationId = selectedSafetyOrganization; if (!organizationId) return;
    const form = event.currentTarget, body = Object.fromEntries(new FormData(form).entries()), button = form.querySelector('button[type="submit"]'); button.disabled = true;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), version = safetyLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedSafetyOrganization === organizationId && version === safetyLoadVersion);
    try { await request('/organizations/' + encodeURIComponent(organizationId) + '/safety/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!current()) return; form.reset(); uiLocale.setMessage(panel.querySelector('[data-org-safety-note]'), uiLocale.message('تم تسجيل البلاغ وربطه بحجز الجهة.')); await loadOrganizationIncidents(organizationId, stateMemberships.find(row => row.organization?.id === organizationId)); }
    catch (error) { if (current()) setLocalErrorText(panel.querySelector('[data-org-safety-note]'), (error instanceof Error?error:undefined), 'تعذر إرسال البلاغ.'); } finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-bookings-close]')?.addEventListener('click', () => { bookingLoadVersion++; selectedBookingsOrganization = null; panel.querySelector('[data-org-bookings]').hidden = true; });
  panel.querySelector('[data-org-safety-close]')?.addEventListener('click', () => { safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-safety]').hidden = true; });

  panel.querySelector('[data-org-refresh]')?.addEventListener('click', refresh);
  panel.querySelector('[data-org-cancel]')?.addEventListener('click', () => { resetForm(); note(uiLocale.message('أُلغي تعديل بيانات الجهة.')); });
  panel.querySelector('[data-org-list]')?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-org-edit],button[data-org-view-members],button[data-org-requests-open],button[data-org-bookings-open],button[data-org-safety-open],button[data-org-financial-open]');
    if (!button) return;
    const card = button.closest('[data-org-id]');
    const organizationId = card?.dataset.orgId;
    const membership = stateMemberships.find(row => row.organization?.id === organizationId);
    if (!membership || membership.status !== 'ACTIVE') return;
    if (button.matches('[data-org-bookings-open]')) {
      if (membership.organization.status !== 'ACTIVE') return;
      selectedBookingsOrganization = organizationId; uiLocale.setText(panel.querySelector('[data-org-bookings-title]'), "حجوزات {0}", [membership.organization.displayName]); panel.querySelector('[data-org-bookings]').hidden = false;
      panel.querySelector('[data-org-safety]').hidden = true; selectedSafetyOrganization = null; safetyLoadVersion++;
      await loadOrganizationBookings(organizationId, membership); return;
    }
    if (button.matches('[data-org-safety-open]')) {
      if (membership.organization.status !== 'ACTIVE' || !['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership.role)) return;
      selectedSafetyOrganization = organizationId; uiLocale.setText(panel.querySelector('[data-org-safety-title]'), "سلامة {0}", [membership.organization.displayName]); panel.querySelector('[data-org-safety]').hidden = false;
      panel.querySelector('[data-org-bookings]').hidden = true; selectedBookingsOrganization = null; bookingLoadVersion++;
      await loadOrganizationIncidents(organizationId, membership); return;
    }
    const canManage = ['OWNER', 'ADMIN'].includes(membership.role);
    if (button.matches('[data-org-financial-open]')) {
      if (canManage) await openFinancialProfile(membership.organization);
      return;
    }
    if (button.matches('[data-org-requests-open]')) {
      if (membership.organization.status !== 'ACTIVE') return;
      selectedRequestsOrganization = organizationId;
      uiLocale.setText(panel.querySelector('[data-org-requests-title]'), "طلبات {0}", [membership.organization.displayName]);
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
        uiLocale.setMessage(panel.querySelector('[data-org-form-title]'), uiLocale.message('تعديل بيانات الجهة'));
        uiLocale.setMessage(panel.querySelector('[data-org-submit]'), uiLocale.message('حفظ التعديلات'));
        panel.querySelector('[data-org-cancel]').hidden = false;
        form.scrollIntoView({ behavior: residualScrollBehavior(), block: 'center' });
        note(uiLocale.message('عدّل البيانات المطلوبة ثم احفظها. سيحتفظ النظام بحالة الاعتماد وفق سياسة الجهة.'));
      } else {
        await loadOrganizationMembers(organizationId, membership);
      }
    } catch (error) { note(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تحميل بيانات العضويات.')); }
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
      if (result?.status !== 'PENDING') throw localError('لم تُسجّل الدعوة في حالة انتظار.');
      note(uiLocale.message('أُرسلت الدعوة. تنتظر قبول صاحب الحساب من إشعاراته.'));
      await loadOrganizationMembers(organizationId, membership);
    } catch (error) { if (current()) { const feedback = form.querySelector('[data-org-invite-feedback]'); if (feedback) setLocalErrorText(feedback, (error instanceof Error?error:undefined), 'تعذر إرسال الدعوة.'); } }
    finally { submit.disabled = false; }
  });

  const caseStatusLabel = (status) => ({ OPEN: 'مفتوح', ASSIGNED: 'قيد المعالجة', WAITING_CUSTOMER: 'بانتظار رد الجهة', RESOLVED: 'تم الحل', CLOSED: 'مغلق' }[status] || status);
  async function loadOrganizationRequests(organizationId, page = 1, append = false) {
    const auth = window.HydrolandAuth;
    const session = auth?.getSessionVersion?.();
    const version = ++requestLoadVersion;
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && version === requestLoadVersion && selectedRequestsOrganization === organizationId);
    const list = panel.querySelector('[data-org-request-list]');
    if (!append) uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل الطلبات…</p>`);
    const more = panel.querySelector('[data-org-request-more]'); more.hidden = true;
    try {
      const result = await request('/organizations/' + encodeURIComponent(organizationId) + '/requests?page=' + page + '&pageSize=20');
      if (!current()) return;
      const rows = Array.isArray(result?.items) ? result.items : [];
      if (!rows.length && !append) { uiLocale.setHTML(list, uiLocale.html`<p>لا توجد طلبات خدمة لهذه الجهة.</p>`); requestPage = 1; return; }
      const membership = stateMemberships.find(row => row.organization?.id === organizationId);
      const canWrite = ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(membership?.role) && membership?.status === 'ACTIVE';
      const markup = rows.map(item => uiLocale.html`<article class="hl-org-request" data-org-case-id="${esc(item.id)}"><div><strong>${esc(item.subject)}</strong><span>${uiLocale.messageHTML(authoredCaseStatusLabel(item.status))}</span></div><small>${esc(item.type)} · ${esc(new Date(item.createdAt).toLocaleDateString('ar-SA'))}</small><p>${esc(item.description)}</p><div class="hl-org-request-thread">${(item.interactions || []).map(reply => uiLocale.html`<p><b>${esc(reply.actorType === 'CUSTOMER' ? uiLocale.t('الجهة') : reply.actorType)}:</b> ${esc(reply.message)}</p>`).join('')}</div>${(item.dueAt?uiLocale.html`<p>مهلة الحالة: ${esc(new Date(item.dueAt).toLocaleString('ar-SA'))}</p>`:'')}${(canWrite && item.referenceType !== 'PROVIDER_QUALITY_TRIP_REHEARSAL_V1' && item.status !== 'CLOSED'?(item.canRespondToResolution === true?uiLocale.html`<form data-org-case-response><label>رد صاحب الطلب على الحل<textarea name="message" required maxlength="10000" rows="2"></textarea></label><button type="submit" name="decision" value="ACCEPT">أقبل الحل وأغلق الطلب</button><button type="submit" name="decision" value="OBJECT">أعترض وأطلب متابعة المعالجة</button></form>`:uiLocale.html`<form data-org-case-reply><label>إضافة رد<input name="message" required maxlength="10000" placeholder="اكتب ردًا على الطلب"></label><button type="submit">إرسال الرد</button></form>`):'')}</article>`).join('');
      if (append) uiLocale.insertHTML(list, 'beforeend', markup); else uiLocale.setHTML(list, markup);
      requestPage = page; more.hidden = !(page < Number(result?.totalPages || 1));
    } catch (error) { if (current()) uiLocale.setHTML(list, uiLocale.html`<p class="hl-org-error">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل الطلبات.')}</p>`); }
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
      form.reset(); uiLocale.setMessage(panel.querySelector('[data-org-requests-note]'), uiLocale.message('تم إرسال الطلب وحفظه في سجل خدمة العملاء.'));
      await loadOrganizationRequests(organizationId);
    } catch (error) { if (current()) setLocalErrorText(panel.querySelector('[data-org-requests-note]'), (error instanceof Error?error:undefined), 'تعذر إرسال الطلب.'); }
    finally { button.disabled = false; }
  });
  panel.querySelector('[data-org-request-list]')?.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-org-case-reply],form[data-org-case-response]'); if (!form) return;
    event.preventDefault();
    const organizationId = selectedRequestsOrganization, caseId = form.closest('[data-org-case-id]')?.dataset.orgCaseId;
    if (!organizationId || !caseId) return;
    const auth = window.HydrolandAuth, session = auth?.getSessionVersion?.(), current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.() && selectedRequestsOrganization === organizationId);
    const submits = [...form.querySelectorAll('button[type="submit"]')]; submits.forEach(button => button.disabled = true);
    try {
      const message = new FormData(form).get('message'), response = form.hasAttribute('data-org-case-response');
      const decision = response ? event.submitter?.value : undefined;
      if (response && !['ACCEPT', 'OBJECT'].includes(decision)) return;
      await request('/organizations/' + encodeURIComponent(organizationId) + '/requests/' + encodeURIComponent(caseId) + (response ? '/resolution-response' : '/replies'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, ...(response ? { decision } : {}) }) });
      if (current()) await loadOrganizationRequests(organizationId);
    } catch (error) { if (current()) { if ([403, 404].includes(error?.status)) { requestLoadVersion++; panel.querySelector('[data-org-request-list]').replaceChildren(); } uiLocale.setMessage(panel.querySelector('[data-org-requests-note]'), ([400, 409].includes(error?.status)?uiLocale.message('تغيرت حالة الطلب. أعد فتح طلبات الجهة قبل المتابعة.'):([403, 404].includes(error?.status)?uiLocale.message('لم يعد هذا الطلب أو الإجراء متاحًا لحسابك. أعد فتح طلبات الجهة.'):uiLocale.message('تعذر تأكيد الحفظ. أعد فتح الطلب للتحقق من الحالة.')))); } }
    finally { if (current()) submits.forEach(button => button.disabled = false); }
  });
  panel.querySelector('[data-org-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const auth = window.HydrolandAuth;
    const session = auth?.getSessionVersion?.();
    const current = () => Boolean(auth?.isAuthenticated?.() && session === auth?.getSessionVersion?.());
    if (!current()) { note(uiLocale.message('سجّل الدخول أولاً قبل إرسال طلب الجهة.')); return; }
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    let successMessage;
    try {
      if (editingOrganization) {
        await request('/organizations/' + encodeURIComponent(editingOrganization), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!current()) return;
        resetForm();
        successMessage = uiLocale.t('حُفظت تعديلات الجهة.');
      } else {
        await request('/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!current()) return;
        form.reset();
        successMessage = uiLocale.t('تم إرسال الجهة للمراجعة. ستظهر الحالة الفعلية بعد قرار الإدارة.');
      }
      if (!current()) return;
      await refresh(successMessage);
    } catch (error) { if (!current()) return; note(localErrorMessage((error instanceof Error?error:undefined), 'تعذر إرسال طلب الجهة. تحقق من البيانات المدخلة.')); }
  });

  const show = () => { panel.hidden = false; window.HydrolandWorkspaceUI?.show?.(panel); void refresh(); };
  const hide = () => { directoryLoadVersion++; clearPrivateViews(); panel.hidden = true; memberLoadVersion++; selectedMembersOrganization = null; requestLoadVersion++; selectedRequestsOrganization = null; bookingLoadVersion++; selectedBookingsOrganization = null; safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-requests]').hidden = true; panel.querySelector('[data-org-bookings]').hidden = true; panel.querySelector('[data-org-safety]').hidden = true; };
  document.querySelectorAll('#role-dialog [data-role]').forEach((button) => button.addEventListener('click', () => setTimeout(() => {
    if (button.dataset.role === 'organization') { panel.hidden = false; void refresh(); } else hide();
  }, 0)));
  document.addEventListener('hydroland:auth-changed', () => { directoryLoadVersion++; clearPrivateViews(); memberLoadVersion++; selectedMembersOrganization = null; requestLoadVersion++; selectedRequestsOrganization = null; bookingLoadVersion++; selectedBookingsOrganization = null; safetyLoadVersion++; selectedSafetyOrganization = null; panel.querySelector('[data-org-requests]').hidden = true; panel.querySelector('[data-org-bookings]').hidden = true; panel.querySelector('[data-org-safety]').hidden = true; if (!window.HydrolandAuth?.isAuthenticated?.()) { stateMemberships = []; resetForm(); panel.querySelector('[data-org-members]').hidden = true; } if (!panel.hidden) refresh(); });
  window.HydrolandOrganizations = { open: show, refresh };
})();
