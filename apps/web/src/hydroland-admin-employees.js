(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("admin-employees", {
  "طريقة إضافة الموظف": "How to add the employee",
  "الإدارة": "Department",
  "الصلاحيات المطلوبة": "Requested permissions",
  "طريقة تحقق صاحب الحساب": "Account-holder verification method",
  "الحساب المراد ربطه": "Account to link",
  "صفحات الموظفين": "Employee pages",
  "مركز القيادة · إدارة الموظفين": "Command center · Employees",
  "إدارة الموظفين": "Employee management",
  "إنشاء حساب أو ربط حساب موجود، وتحديد الإدارة والوظيفة والصلاحيات المطلوبة. يراجع موظفي هيدرولاند حساب الإدارة العليا المالك للجهة، ويعتمد تعيينهم. يمكن للمالك تفويض اعتماد موظفي جميع إدارات هيدرولاند لموظف عبر بريده، وسحب التفويض من هذه الصفحة.": "Create an account or link an existing one, then select the department, position and requested permissions. The senior-management account that owns the organization reviews and approves Hydroland appointments. The owner can delegate approval of employees across all Hydroland departments to an employee by email, and revoke that delegation here.",
  "يدير موظفي كل مركز ويراجعهم حساب إدارة مركزهم من بوابة المركز. حالة حساب المنصة وعضويات مراكز الغوص تُداران من مساراتهما المستقلة.": "Each center's management account manages and reviews its employees through the center portal. Platform account status and dive-center memberships are managed through separate workflows.",
  "تحديث الموظفين": "Refresh employees",
  "تهيئة الهيكل الداخلي": "Set up internal structure",
  "ينشئ هذا الإجراء المقر الداخلي والإدارات الأربع عشرة المعتمدة لإدارة موظفي هيدرولاند.": "This creates the internal headquarters and fourteen approved departments for managing Hydroland employees.",
  "سبب التهيئة": "Reason for setup",
  "راجعت تهيئة الهيكل الداخلي": "I have reviewed internal-structure setup",
  "تهيئة الهيكل الوظيفي": "Set up employment structure",
  "طلب تعيين موظف": "Employee appointment request",
  "ربط حساب موجود": "Link an existing account",
  "إنشاء حساب جديد": "Create a new account",
  "المسمى الوظيفي": "Job title",
  "الاسم الأول": "First name",
  "اسم العائلة": "Last name",
  "بريد الموظف": "Employee email",
  "Google — بريد Gmail أو Google Workspace": "Google — Gmail or Google Workspace address",
  "رسالة تحقق بالبريد": "Email verification message",
  "يبقى الحساب بانتظار تحقق صاحبه. عند اختيار Google يسجل صاحبه الدخول بالبريد المطابق. عند اختيار البريد تُرسل رسالة التحقق؛ وبعد التحقق يمكنه تعيين كلمة مروره من استعادة كلمة المرور.": "The account awaits verification by its holder. With Google, the holder signs in using the matching email. With email, a verification message is sent; after verification, the holder can set a password through password recovery.",
  "البحث عن حساب بالاسم أو جزء من البريد": "Search accounts by name or part of an email",
  "بحث عن حساب موجود": "Search existing accounts",
  "ابحث ثم اختر حسابًا متحققًا": "Search, then select a verified account",
  "سبب طلب التعيين": "Reason for appointment request",
  "راجعت الحساب والوظيفة والصلاحيات المطلوبة": "I have reviewed the account, position and requested permissions",
  "الصلاحيات لا تتفعل بمجرد حفظ الطلب. الاعتماد يتطلب اكتمال ضوابط الموارد البشرية، وتفعيل الصلاحيات يستلزم دخولًا جديدًا للموظف.": "Saving a request does not activate permissions. Approval requires completed HR controls. Permission activation requires the employee to sign in again.",
  "حفظ طلب التعيين": "Save appointment request",
  "البحث في طلبات الموظفين": "Search employee requests",
  "بحث الموظفين": "Search employees",
  "طلبات أحدث": "Newer requests",
  "طلبات أقدم": "Older requests",
  "متطلبات اعتماد التعيين": "Appointment approval requirements",
  "يمكن حفظ الطلب قبل اكتمال متطلبات الاعتماد. هذه قراءة عامة؛ يُعاد التحقق من مسؤول المراجعة وصلاحية المالك أو مفوضه ومنع اعتماد الموظف لتعيينه ومن حالة الحساب والضوابط عند كل قرار.": "A request can be saved before approval requirements are complete. This is a general reading. The reviewer, owner or delegate authority, prohibition on self-approval, account status and controls are rechecked for every decision.",
  "بانتظار مراجعة الموارد البشرية": "Awaiting HR review",
  "بانتظار اعتماد التعيين": "Awaiting appointment approval",
  "تعيين معتمد": "Appointment approved",
  "طلب مرفوض": "Request rejected",
  "طلب ملغى": "Request cancelled",
  "نشط": "Active",
  "بانتظار التحقق": "Awaiting verification",
  "معلق": "Suspended",
  "مؤرشف": "Archived",
  "موظف": "Employee",
  "مراجع موارد بشرية": "HR reviewer",
  "مدير موارد بشرية": "HR manager",
  "إدارة المنصة": "Platform administration",
  "هواة الغوص": "Recreational divers",
  "محترف غوص": "Diving professional",
  "مركز غوص": "Dive center",
  "وسائط بحرية": "Marine vessels",
  "جهة": "Organization",
  "مراجع": "Reviewer",
  "إدارة الموارد البشرية": "Human resources management",
  "اعتماد تنفيذي": "Executive approval",
  "خدمة الصلاحيات": "Permissions service",
  "إدارة مركز": "Center administration",
  "ضوابط الموارد البشرية مكتملة بحسب القراءة الحالية.": "HR controls are complete according to the current reading.",
  "لم تُضبط ضوابط الموارد البشرية للاعتماد.": "HR approval controls have not been configured.",
  "بعض الضوابط تفتقد مرجع المتطلب أو نسخته.": "Some controls lack a requirement reference or version.",
  "أدلة بعض ضوابط الموارد البشرية غير مكتملة.": "Evidence for some HR controls is incomplete.",
  "بعض ضوابط الموارد البشرية لم تجتز التحقق أو انتهت صلاحيتها.": "Some HR controls have not passed verification or have expired.",
  "توجد ملاحظة مانعة في ضوابط الموارد البشرية.": "A blocking finding exists in HR controls.",
  "تعذر التحقق من متطلبات الاعتماد؛ حدّث الموظفين لقراءة الحالة.": "Could not verify approval requirements. Refresh employees to read the status.",
  "وقت القراءة:": "Read time:",
  "حساب مسؤول مراجعة موظفي هيدرولاند غير متاح حاليًا؛ يلزم حساب مالك الجهة النشط والمتحقق والمخول بالإدارة.": "The Hydroland employee-review account is currently unavailable. An active, verified organization owner with administrative authority is required.",
  "حسابك هو مسؤول مراجعة موظفي هيدرولاند؛ يمكنك مراجعة الطلب الذي أنشأته.": "Your account is responsible for reviewing Hydroland employees. You can review a request you created.",
  "مسؤول مراجعة موظفي هيدرولاند هو حساب الإدارة العليا المالك للجهة.": "The senior-management account that owns the organization is responsible for reviewing Hydroland employees.",
  "حسابات الإدارة النشطة والمتحققة:": "Active, verified administrative accounts:",
  "؛ الحد الأدنى لحساب مالك الجهة:": "; Minimum for the organization-owner account:",
  "حساب المالك الإداري النشط مطلوب للاعتماد.": "An active administrative owner account is required for approval.",
  "تُراجع صلاحية المالك أو الموظف المفوض لكل طلب.": "Owner or delegated-employee authority is checked for every request.",
  "تغير الطلب؛ حدّث الموظفين وراجع القرار.": "The request has changed. Refresh employees and review the decision.",
  "تعذر إكمال الطلب.": "Could not complete the request.",
  "حفظ مراجعة الموارد البشرية": "Save HR review",
  "اعتماد التعيين وتفعيل الصلاحيات": "Approve appointment and activate permissions",
  "رفض الطلب": "Reject request",
  "إلغاء طلب التعيين": "Cancel appointment request",
  "ينتظر دخول صاحب الحساب عبر Google بالبريد المطابق.": "Awaiting the account holder's Google sign-in with the matching email.",
  "ينتظر إكمال صاحب الحساب التحقق من البريد.": "Awaiting email verification by the account holder.",
  "الوظيفة": "Position",
  "حالة الحساب": "Account status",
  "الصلاحيات الحالية في النطاق:": "Current scoped permissions:",
  "سبب الطلب:": "Request reason:",
  "قيد مراجعة المسار": "Under workflow review",
  "غير متاحة": "Unavailable",
  "غير محددة في هذا المسار": "Not defined in this workflow",
  "صلاحية أخرى": "Other permission",
  "لم تُفعّل": "Not activated",
  "التعيين والصلاحيات متاحان للحساب النشط.": "Appointment and permissions are available for the active account.",
  "التعيين معتمد؛ الوصول الحالي يحتاج مراجعة حالة الحساب أو الصلاحيات.": "Appointment approved. Current access requires an account-status or permission review.",
  "المراجعة والاعتماد يسبقان تفعيل الصلاحيات.": "Review and approval precede permission activation.",
  "عقود الموظف من المكتبة": "Employee contracts from the library",
  "سبب القرار": "Decision reason",
  "راجعت الطلب وحالة الموظف والصلاحيات": "I have reviewed the request, employee status and permissions",
  "الإجراء التالي متاح للمالك أو المفوض المخول بحسب حالة الطلب.": "The next action is available to the owner or authorized delegate according to request status.",
  "لا توجد طلبات موظفين مطابقة في النطاق الداخلي.": "No matching employee requests in the internal scope.",
  "جارٍ تحميل طلبات الموظفين…": "Loading employee requests…",
  "جارٍ قراءة متطلبات الاعتماد…": "Reading approval requirements…",
  "استجابة الموظفين غير مكتملة.": "The employee response is incomplete.",
  "nav[aria-label=\"صفحات الموظفين\"]": "nav[aria-label=\"صفحات الموظفين\"]",
  "إرسال البريد التجريبي مقيد. يمكن اختيار Google إذا كان متاحًا أو ربط حساب متحقق موجود.": "Test email sending is restricted. Use Google if available or link an existing verified account.",
  "التحقق بالبريد غير جاهز. يمكن استخدام Google إذا كان متاحًا أو ربط حساب متحقق.": "Email verification is not ready. Use Google if available or link a verified account.",
  "إنشاء الحساب بالبريد يرسل رسالة تحقق آمنة إلى صاحبه.": "Creating an email account sends a secure verification message to its holder.",
  "تم تحميل": "Loaded",
  "طلبًا من الخادم.": "requests from the server.",
  "الهيكل الداخلي لم يُهيأ بعد. ابدأ بالتهيئة لإضافة الموظفين.": "The internal structure has not been configured. Set it up before adding employees.",
  "تعذر تحميل الموظفين.": "Could not load employees.",
  "جارٍ حفظ الإجراء…": "Saving the action…",
  "تعذر التحقق من الحفظ؛ حدّث الموظفين للتحقق من الحالة.": "Could not verify saving. Refresh employees to verify the status.",
  "تعذر تأكيد الحفظ؛ حدّث الموظفين للتحقق.": "Could not confirm saving. Refresh employees to verify.",
  "تمت تهيئة الهيكل الداخلي. يمكنك إنشاء طلب تعيين.": "Internal structure configured. You can create an appointment request.",
  "حُفظ طلب التعيين. يلزم تحقق الحساب ثم مراجعة المالك واعتماد المالك أو مفوضه.": "Appointment request saved. Account verification, owner review and owner or delegate approval are required.",
  "تم اعتماد التعيين وتطبيق الصلاحيات وتسجيل القرار. يلزم دخول جديد للموظف.": "Appointment approved, permissions applied and decision recorded. The employee must sign in again.",
  "تم حفظ قرار التوظيف وتسجيله.": "Employment decision saved and recorded.",
  "جارٍ البحث عن الحساب…": "Searching accounts…",
  "تعذر قراءة الحسابات.": "Could not read accounts.",
  "اختر الحساب المتحقق": "Select the verified account",
  "مستخدم": "User",
  "ظهرت أول صفحة من الحسابات؛ حدّد البحث لتقليل النتائج.": "The first page of accounts is shown. Narrow your search for fewer results.",
  "تم العثور على": "Found",
  "حسابًا. الحسابات غير المتحققة أو المعلقة غير متاحة للربط.": "accounts. Unverified or suspended accounts cannot be linked.",
  "تعذر البحث.": "Search failed.",
  "الإصدار": "Version",
  "مسودة": "Draft",
  "قالب الإصدار": "Version template",
  "عرض النسخة المحفوظة": "View saved version",
  "أُعدت من قالب معتمد إداريًا من مسؤول الإدارتين؛ المراجعة القانونية المستقلة لم تكتمل. هذه مسودة داخلية فقط.": "Prepared from a template administratively approved by the person responsible for both departments. Independent legal review is incomplete. This is an internal draft only.",
  "إصدار جديد من مسودة الإصدار": "New version of draft version",
  "؛ النسخة السابقة محفوظة.": "; the previous version is retained.",
  "لم يستكمل": "Not completed",
  "إنشاء إصدار جديد من المسودة": "Create a new draft version",
  "سجل سابق دون ربط بمكتبة العقود؛ لم يُعدّل.": "Historical record not linked to the contract library. It was not modified.",
  "عقود": "Contracts",
  "تُحفظ مسودة مرتبطة بإصدار القالب المعتمد وبيانات الموظف وقت الإنشاء. إعداد المسودة لا يوقّع عقدًا أو يعتمد تعيينًا أو يفعّل صلاحية. توقيع العامل والتوثيق الرسمي لهما إجراء لاحق.": "The saved draft is linked to the approved template version and employee data at creation. Preparing a draft does not sign a contract, approve an appointment or activate permission. Employee signature and official authentication require a later procedure.",
  "لا توجد عقود موظف محفوظة.": "No saved employee contracts.",
  "يلزم اعتماد قالب موظفين للمسودات في مكتبة العقود من مسؤول الإدارتين المكلف، أو بعد المراجعتين المستقلتين والنشر.": "An employee template must be approved for drafts in the contract library by the appointed person responsible for both departments, or through two independent reviews and publication.",
  "مسودة عقد جديدة": "New contract draft",
  "إلغاء إعداد الإصدار الجديد": "Cancel new version preparation",
  "قالب عقد الموظف": "Employee contract template",
  "تاريخ سريان المسودة": "Draft effective date",
  "نهاية المدة إن وجدت": "Term end, if applicable",
  "سبب إعداد مسودة العقد": "Reason for preparing the contract draft",
  "راجعت القالب وبيانات الموظف وأطلب حفظ مسودة فقط": "I have reviewed the template and employee data and request saving a draft only",
  "حفظ مسودة عقد الموظف": "Save employee contract draft",
  "· الإصدار": "· Version",
  "· اعتماد إداري للمسودات فقط": "· Administrative approval for drafts only",
  "إنشاء مسودة غير متاح لحالة الموظف أو صلاحية الحساب الحالية.": "Draft creation is unavailable for the employee status or current account authority.",
  "القالب": "Template",
  "تاريخ السريان": "Effective date",
  "نهاية المدة": "Term end",
  "البند": "Clause",
  "ضوابط استخدام القالب": "Template-use controls",
  "مقارنة التغييرات": "Compare changes",
  "راجع البيانات والبنود المتغيرة قبل تأكيد حفظ الإصدار الجديد.": "Review changed data and clauses before confirming the new version.",
  "لا توجد تغييرات على المسودة السابقة.": "No changes from the previous draft.",
  "المسودة": "Draft",
  "والإصدار المقترح": "and proposed version",
  "البيان": "Item",
  "النسخة السابقة": "Previous version",
  "الإصدار الجديد": "New version",
  "بنود القالب المحدد": "Selected template clauses",
  "استخدم مراجع الإثبات فقط؛ لا تكتب أرقام الهوية أو التفاصيل الطبية في المسودة.": "Use evidence references only. Do not enter identity numbers or medical details in the draft.",
  "اعتماد إداري للمسودات الداخلية فقط. المراجعة القانونية المستقلة لم تكتمل، والتوقيع والتوثيق الرسمي متطلبات منفصلة.": "Administrative approval for internal drafts only. Independent legal review is incomplete. Signature and official authentication are separate requirements.",
  "يلزم استكمال المصدر الأصلي": "Original source must be completed",
  "إصدار جديد من المسودة": "New draft version",
  "تُحدّث بيانات الموظف والجهة من مصادرها الحالية، وتُنقل الشروط التي تطابق حقول القالب الحالي. أكمل الحقول الجديدة أو المتغيرة وراجع البنود. تبقى المسودة السابقة محفوظة.": "Employee and organization data are refreshed from current sources. Terms matching the current template fields are copied. Complete new or changed fields and review the clauses. The previous draft is retained.",
  "حفظ إصدار جديد من المسودة": "Save new draft version",
  "جارٍ حفظ المسودة…": "Saving draft…",
  "لم تعد صلاحية عقود الموظف متاحة لهذا الحساب.": "Employee-contract authority is no longer available for this account.",
  "تعذر تأكيد حفظ المسودة.": "Could not confirm saving the draft.",
  "تعذر حفظ المسودة؛ حدّث عقود الموظف للتحقق.": "Could not save the draft. Refresh employee contracts to verify.",
  "جارٍ تحميل عقود الموظف…": "Loading employee contracts…",
  "تعذر قراءة عقود الموظف.": "Could not read employee contracts.",
  "تعذر تحميل عقود الموظف.": "Could not load employee contracts.",
  "وقت القراءة: {0}": "Read time: {0}",
  "حسابات الإدارة النشطة والمتحققة: {0}؛ الحد الأدنى لحساب مالك الجهة: {1}. {2}": "Active, verified administrative accounts: {0}; Minimum for the organization-owner account: {1}. {2}",
  "تم تحميل {0} طلبًا من الخادم.": "Loaded {0} requests from the server.",
  "تم العثور على {0} حسابًا. الحسابات غير المتحققة أو المعلقة غير متاحة للربط.": "Found {0} accounts. Unverified or suspended accounts cannot be linked.",
  " · اعتماد إداري للمسودات فقط": " · Administrative approval for drafts only",
  " · الإصدار ": " · Version ",
  "البند ": "Clause ",
  "إصدار جديد من المسودة {0}": "New draft version {0}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


 if(window.HydrolandAdminEmployees)return;
 const root=document.getElementById('role-console');if(!root)return;
 const panel=document.createElement('section');panel.id='hl-admin-employees';panel.className='hl-admin-employees';panel.hidden=true;
 uiLocale.setHTML(panel, uiLocale.html`<header><div><small>مركز القيادة · إدارة الموظفين</small><h3>إدارة الموظفين</h3><p>إنشاء حساب أو ربط حساب موجود، وتحديد الإدارة والوظيفة والصلاحيات المطلوبة. يراجع موظفي هيدرولاند حساب الإدارة العليا المالك للجهة، ويعتمد تعيينهم. يمكن للمالك تفويض اعتماد موظفي جميع إدارات هيدرولاند لموظف عبر بريده، وسحب التفويض من هذه الصفحة.</p><p>يدير موظفي كل مركز ويراجعهم حساب إدارة مركزهم من بوابة المركز. حالة حساب المنصة وعضويات مراكز الغوص تُداران من مساراتهما المستقلة.</p></div><button type="button" data-staff-refresh>تحديث الموظفين</button></header><p role="status" data-staff-feedback></p>
 <section data-staff-setup hidden><h4>تهيئة الهيكل الداخلي</h4><p>ينشئ هذا الإجراء المقر الداخلي والإدارات الأربع عشرة المعتمدة لإدارة موظفي هيدرولاند.</p><form data-staff-initialize><fieldset><label>سبب التهيئة<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>راجعت تهيئة الهيكل الداخلي</label><button type="submit">تهيئة الهيكل الوظيفي</button></fieldset><p role="status" data-form-feedback></p></form></section>
 <section data-staff-request-section hidden><h4>طلب تعيين موظف</h4><p data-staff-auth-note></p><form data-staff-request><fieldset><div class="hl-staff-grid"><label>طريقة إضافة الموظف<select name="mode" aria-label="طريقة إضافة الموظف"><option value="LINK">ربط حساب موجود</option><option value="CREATE">إنشاء حساب جديد</option></select></label><label>الإدارة<select name="departmentCode" aria-label="الإدارة" required></select></label><label>المسمى الوظيفي<input name="jobTitle" required maxlength="120" autocomplete="off"></label><label>الصلاحيات المطلوبة<select name="profile" aria-label="الصلاحيات المطلوبة" required></select></label></div><p data-staff-profile-note></p>
 <div data-staff-create hidden><div class="hl-staff-grid"><label>الاسم الأول<input name="firstName" required maxlength="80" autocomplete="off"></label><label>اسم العائلة<input name="lastName" required maxlength="80" autocomplete="off"></label><label>بريد الموظف<input name="email" type="email" required maxlength="254" autocomplete="off"></label><label>طريقة تحقق صاحب الحساب<select name="verificationMethod" aria-label="طريقة تحقق صاحب الحساب"><option value="GOOGLE">Google — بريد Gmail أو Google Workspace</option><option value="EMAIL">رسالة تحقق بالبريد</option></select></label></div><p>يبقى الحساب بانتظار تحقق صاحبه. عند اختيار Google يسجل صاحبه الدخول بالبريد المطابق. عند اختيار البريد تُرسل رسالة التحقق؛ وبعد التحقق يمكنه تعيين كلمة مروره من استعادة كلمة المرور.</p></div>
 <div data-staff-link><label>البحث عن حساب بالاسم أو جزء من البريد<input name="accountSearch" maxlength="120" autocomplete="off"></label><button type="button" data-staff-find>بحث عن حساب موجود</button><p role="status" data-staff-lookup-feedback></p><label>الحساب المراد ربطه<select name="accountId" aria-label="الحساب المراد ربطه" required><option value="">ابحث ثم اختر حسابًا متحققًا</option></select></label></div>
 <label>سبب طلب التعيين<textarea name="reason" required minlength="5" maxlength="1000" rows="3"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>راجعت الحساب والوظيفة والصلاحيات المطلوبة</label><p>الصلاحيات لا تتفعل بمجرد حفظ الطلب. الاعتماد يتطلب اكتمال ضوابط الموارد البشرية، وتفعيل الصلاحيات يستلزم دخولًا جديدًا للموظف.</p><button type="submit">حفظ طلب التعيين</button></fieldset><p role="status" data-form-feedback></p></form></section>
 <form data-staff-search hidden><fieldset><label>البحث في طلبات الموظفين<input name="search" maxlength="120" autocomplete="off"></label><button type="submit">بحث الموظفين</button></fieldset></form><div data-staff-list aria-live="polite"></div><nav data-staff-pagination aria-label="صفحات الموظفين" hidden><button type="button" data-staff-previous>طلبات أحدث</button><button type="button" data-staff-next>طلبات أقدم</button></nav>`);
 root.insertAdjacentElement('afterend',panel);
 const readinessPanel=document.createElement('section');readinessPanel.dataset.staffReadiness='';readinessPanel.hidden=true;readinessPanel.setAttribute('aria-labelledby','hl-staff-readiness-title');
 uiLocale.setHTML(readinessPanel, uiLocale.html`<h4 id="hl-staff-readiness-title">متطلبات اعتماد التعيين</h4><p role="status" data-staff-readiness-status></p><p data-staff-review-authority></p><p data-staff-readiness-admins></p><p data-staff-readiness-compliance></p><p>يمكن حفظ الطلب قبل اكتمال متطلبات الاعتماد. هذه قراءة عامة؛ يُعاد التحقق من مسؤول المراجعة وصلاحية المالك أو مفوضه ومنع اعتماد الموظف لتعيينه ومن حالة الحساب والضوابط عند كل قرار.</p>`);
 panel.querySelector('[data-staff-setup]').before(readinessPanel);
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const feedback=panel.querySelector('[data-staff-feedback]'),list=panel.querySelector('[data-staff-list]'),requestForm=panel.querySelector('[data-staff-request]'),searchForm=panel.querySelector('[data-staff-search]');
 const stateLabels={HR_REVIEW:'بانتظار مراجعة الموارد البشرية',APPROVAL_REQUIRED:'بانتظار اعتماد التعيين',EFFECTIVE:'تعيين معتمد',REJECTED:'طلب مرفوض',CANCELLED:'طلب ملغى'};
 const accountLabels={ACTIVE:'نشط',PENDING_VERIFICATION:'بانتظار التحقق',SUSPENDED:'معلق',ARCHIVED:'مؤرشف'};
 const roleLabels={STAFF:'موظف',HR_REVIEWER:'مراجع موارد بشرية',HR_MANAGER:'مدير موارد بشرية',ADMIN:'إدارة المنصة',DIVER:'هواة الغوص',INSTRUCTOR:'محترف غوص',DIVE_CENTER:'مركز غوص',BOAT_OWNER:'وسائط بحرية',ORGANIZATION:'جهة',REVIEWER:'مراجع',HR_EXECUTIVE:'إدارة الموارد البشرية',EXECUTIVE_APPROVER:'اعتماد تنفيذي',IAM_SERVICE:'خدمة الصلاحيات',CENTER_MANAGER:'إدارة مركز'};
 const complianceLabels={READY:'ضوابط الموارد البشرية مكتملة بحسب القراءة الحالية.',HR_COMPLIANCE_CONTROLS_MISSING:'لم تُضبط ضوابط الموارد البشرية للاعتماد.',HR_COMPLIANCE_REQUIREMENT_MISSING:'بعض الضوابط تفتقد مرجع المتطلب أو نسخته.',HR_COMPLIANCE_EVIDENCE_MISSING:'أدلة بعض ضوابط الموارد البشرية غير مكتملة.',HR_COMPLIANCE_VALIDATION_FAILED:'بعض ضوابط الموارد البشرية لم تجتز التحقق أو انتهت صلاحيتها.',HR_COMPLIANCE_BLOCKING_FINDING:'توجد ملاحظة مانعة في ضوابط الموارد البشرية.'};
 let catalog=null,version=0,busy=false,cursor=null,nextCursor=null,history=[],search='';
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible()&&!panel.hidden;
 function renderReadiness(value,unavailable=uiLocale.t('تعذر التحقق من متطلبات الاعتماد؛ حدّث الموظفين لقراءة الحالة.')){
  const status=readinessPanel.querySelector('[data-staff-readiness-status]'),admins=readinessPanel.querySelector('[data-staff-readiness-admins]'),compliance=readinessPanel.querySelector('[data-staff-readiness-compliance]'),reviewer=readinessPanel.querySelector('[data-staff-review-authority]');
  uiLocale.setMessage(admins, compliance.textContent=reviewer.textContent='');readinessPanel.hidden=false;
  const counts=value?.independentAdministrators,control=value?.compliance,authority=value?.reviewAuthority,time=typeof value?.checkedAt==='string'?Date.parse(value.checkedAt):NaN;
  if(!Number.isFinite(time)||!Number.isInteger(counts?.available)||counts.available<0||counts.required!==1||authority?.kind!=='PLATFORM_OWNER'||typeof authority.available!=='boolean'||typeof authority.isCurrentAccount!=='boolean'||authority.isCurrentAccount&&!authority.available||typeof control?.ready!=='boolean'||!Object.hasOwn(complianceLabels,control.reason)||control.ready!==(control.reason==='READY')){uiLocale.setMessage(status, unavailable);return;}
  uiLocale.setMessage(status, uiLocale.message("وقت القراءة: {0}", [new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'medium'}).format(time)]));
  uiLocale.setMessage(reviewer, (!authority.available ? uiLocale.message('حساب مسؤول مراجعة موظفي هيدرولاند غير متاح حاليًا؛ يلزم حساب مالك الجهة النشط والمتحقق والمخول بالإدارة.') : (authority.isCurrentAccount ? uiLocale.message('حسابك هو مسؤول مراجعة موظفي هيدرولاند؛ يمكنك مراجعة الطلب الذي أنشأته.') : uiLocale.message('مسؤول مراجعة موظفي هيدرولاند هو حساب الإدارة العليا المالك للجهة.'))));
  uiLocale.setMessage(admins, uiLocale.message("حسابات الإدارة النشطة والمتحققة: {0}؛ الحد الأدنى لحساب مالك الجهة: {1}. {2}", [counts.available, counts.required, (counts.available<counts.required ? uiLocale.message('حساب المالك الإداري النشط مطلوب للاعتماد.') : uiLocale.message('تُراجع صلاحية المالك أو الموظف المفوض لكل طلب.'))]));
  uiLocale.setMessage(compliance, (value=>value===undefined?value:uiLocale.message(value))(complianceLabels[control.reason]));
 }
 function syncForm(){
  const form=requestForm.elements,create=form.mode.value==='CREATE';
  for(const [selector,enabled] of [['[data-staff-create]',create],['[data-staff-link]',!create]]){const group=requestForm.querySelector(selector);group.hidden=!enabled;group.querySelectorAll('input,select,button').forEach(e=>e.disabled=!enabled);}
  const available=(catalog?.profiles||[]).filter(p=>form.departmentCode.value==='HR'||p.code==='STAFF'),selected=form.profile.value;
  uiLocale.setHTML(form.profile, available.map(p=>uiLocale.html`<option value="${esc(p.code)}">${esc(p.label)}</option>`).join(''));if(available.some(p=>p.code===selected))form.profile.value=selected;
  uiLocale.setMessage(panel.querySelector('[data-staff-profile-note]'), (available.find(p=>p.code===form.profile.value)?.description || ''));
  if(catalog){for(const option of form.verificationMethod.options)option.disabled=option.value==='GOOGLE'?!catalog.google?.enabled:!catalog.email?.enabled;
   if(form.verificationMethod.selectedOptions[0]?.disabled)form.verificationMethod.value=catalog.google?.enabled?'GOOGLE':'EMAIL';}
  const canCreate=Boolean(catalog?.google?.enabled||catalog?.email?.enabled);form.mode.querySelector('[value="CREATE"]').disabled=!canCreate;
  if(create&&!canCreate){form.mode.value='LINK';syncForm();}
 }
 function lock(){
  panel.querySelectorAll('fieldset,button').forEach(e=>{if(!e.closest('[data-agent-workforce],[data-hr-control-review],[data-department-references]'))e.disabled=busy;});
  panel.querySelectorAll('[data-contract-save]').forEach(e=>e.disabled=busy||e.dataset.unchanged==='true');
  syncForm();panel.querySelector('[data-staff-previous]').disabled=busy||!history.length;panel.querySelector('[data-staff-next]').disabled=busy||!nextCursor;
 }
 function clear(){version++;busy=false;catalog=null;cursor=nextCursor=null;history=[];search='';panel.hidden=true;list.replaceChildren();uiLocale.setMessage(feedback, '');readinessPanel.hidden=true;readinessPanel.querySelectorAll('[data-staff-readiness-status],[data-staff-review-authority],[data-staff-readiness-admins],[data-staff-readiness-compliance]').forEach(e=>uiLocale.setMessage(e, ''));panel.querySelectorAll('form').forEach(f=>f.reset());delete requestForm.dataset.requestId;uiLocale.setHTML(requestForm.elements.accountId, uiLocale.html`<option value="">ابحث ثم اختر حسابًا متحققًا</option>`);uiLocale.setMessage(panel.querySelector('[data-staff-lookup-feedback]'), '');panel.querySelectorAll('[data-form-feedback]').forEach(e=>uiLocale.setMessage(e, ''));syncForm();}
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version&&!panel.hidden});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true;}
 async function responseBody(response,v,session){const data=await response.json().catch(()=>null);if(response.status===403&&current(v,session))await authorize(v,session);if(!response.ok)throw localError((response.status===409 ? (data?.message || uiLocale.message('تغير الطلب؛ حدّث الموظفين وراجع القرار.')) : (data?.message || uiLocale.message('تعذر إكمال الطلب.'))));return data;}
 function renderRows(rows){
  uiLocale.setHTML(list, rows.length?rows.map(row=>{
   const name=[row.account?.person?.firstName,row.account?.person?.lastName].filter(Boolean).join(' ')||uiLocale.t('موظف'),profile=catalog.profiles.find(p=>p.code===row.requestedProfile),actions=[];
   if(row.canReview)actions.push(['REVIEW','حفظ مراجعة الموارد البشرية']);if(row.canApprove)actions.push(['APPROVE','اعتماد التعيين وتفعيل الصلاحيات']);if(row.canReject)actions.push(['REJECT','رفض الطلب']);if(row.canCancel)actions.push(['CANCEL','إلغاء طلب التعيين']);
   const pending=row.account?.status==='PENDING_VERIFICATION'?uiLocale.html`<p>${uiLocale.messageHTML((row.verificationMethod==='GOOGLE' ? uiLocale.message('ينتظر دخول صاحب الحساب عبر Google بالبريد المطابق.') : uiLocale.message('ينتظر إكمال صاحب الحساب التحقق من البريد.')))}</p>`:'';
   return uiLocale.html`<article data-staffing-record="${esc(row.id)}"><header><div><h4>${esc(name)}</h4><p dir="ltr">${esc(row.account?.email)}</p></div><strong>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(stateLabels[row.status]) || uiLocale.message('قيد مراجعة المسار')))}</strong></header><dl><div><dt>الإدارة</dt><dd>${esc(row.employment?.department?.nameAr)}</dd></div><div><dt>الوظيفة</dt><dd>${esc(row.employment?.position?.titleAr)}</dd></div><div><dt>حالة الحساب</dt><dd>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(accountLabels[row.account?.status]) || uiLocale.message('غير متاحة')))}</dd></div><div><dt>الصلاحيات المطلوبة</dt><dd>${uiLocale.messageHTML((profile?.label || uiLocale.message('غير محددة في هذا المسار')))}</dd></div></dl><p>الصلاحيات الحالية في النطاق: ${uiLocale.messageHTML(((row.grantedRoles||[]).map(r=>roleLabels[r]||'صلاحية أخرى').join('، ') || uiLocale.message('لم تُفعّل')))}</p><p>${uiLocale.messageHTML((row.status==='EFFECTIVE' ? (row.effectiveAccess ? uiLocale.message('التعيين والصلاحيات متاحان للحساب النشط.') : uiLocale.message('التعيين معتمد؛ الوصول الحالي يحتاج مراجعة حالة الحساب أو الصلاحيات.')) : uiLocale.message('المراجعة والاعتماد يسبقان تفعيل الصلاحيات.')))}</p>${pending}${row.canManageContractDrafts&&row.employment?.id?uiLocale.html`<button type="button" data-employment-contracts="${esc(row.employment.id)}">عقود الموظف من المكتبة</button><section data-employment-contract-box hidden></section>`:''}<p>سبب الطلب: ${esc(row.reason)}</p>${actions.length?uiLocale.html`<form data-staff-decision data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>سبب القرار<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>راجعت الطلب وحالة الموظف والصلاحيات</label><div class="hl-staff-actions">${actions.map(([action,label])=>uiLocale.html`<button type="submit" name="action" value="${action}">${label}</button>`).join('')}</div></fieldset><p role="status" data-form-feedback></p></form>`:uiLocale.html`<p>الإجراء التالي متاح للمالك أو المفوض المخول بحسب حالة الطلب.</p>`}</article>`;
  }).join(''):uiLocale.html`<p>لا توجد طلبات موظفين مطابقة في النطاق الداخلي.</p>`);
 }
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ تحميل طلبات الموظفين…'));list.replaceChildren();renderReadiness(null,uiLocale.t('جارٍ قراءة متطلبات الاعتماد…'));lock();
  try{if(!await authorize(v,session))return;const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(search)query.set('search',search);const response=await auth().authorizedFetch('/admin/employees'+(query.size?'?'+query:''));const data=await responseBody(response,v,session);if(!current(v,session))return;if(!Array.isArray(data?.items)||!Array.isArray(data.departments)||!Array.isArray(data.profiles))throw localError(uiLocale.message('استجابة الموظفين غير مكتملة.'));
   catalog={initialized:data.initialized,departments:data.departments,profiles:data.profiles,email:data.email,google:data.google};nextCursor=data.nextCursor||null;renderReadiness(data.approvalReadiness);
   panel.querySelector('[data-staff-setup]').hidden=Boolean(data.initialized);panel.querySelector('[data-staff-request-section]').hidden=!data.initialized;searchForm.hidden=!data.initialized;panel.querySelector('[data-staff-pagination]').hidden=!data.initialized;
   const selected=requestForm.elements.departmentCode.value;uiLocale.setHTML(requestForm.elements.departmentCode, data.departments.filter(d=>d.active).map(d=>uiLocale.html`<option value="${esc(d.code)}">${esc(d.nameAr)}</option>`).join(''));if(data.departments.some(d=>d.active&&d.code===selected))requestForm.elements.departmentCode.value=selected;
   uiLocale.setMessage(panel.querySelector('[data-staff-auth-note]'), (data.email?.restricted ? uiLocale.message('إرسال البريد التجريبي مقيد. يمكن اختيار Google إذا كان متاحًا أو ربط حساب متحقق موجود.') : (!data.email?.enabled ? uiLocale.message('التحقق بالبريد غير جاهز. يمكن استخدام Google إذا كان متاحًا أو ربط حساب متحقق.') : uiLocale.message('إنشاء الحساب بالبريد يرسل رسالة تحقق آمنة إلى صاحبه.'))));
   renderRows(data.items);uiLocale.setMessage(feedback, (data.initialized ? uiLocale.message("تم تحميل {0} طلبًا من الخادم.", [data.items.length]) : uiLocale.message('الهيكل الداخلي لم يُهيأ بعد. ابدأ بالتهيئة لإضافة الموظفين.')));
  }catch(error){if(current(v,session)){nextCursor=null;renderReadiness(null);uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تحميل الموظفين.')));}}
  finally{if(current(v,session)){busy=false;lock();}}
 }
 async function mutate(form,path,body,method,success){
  const v=version,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-form-feedback]');busy=true;lock();uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ الإجراء…'));
  try{if(!await authorize(v,session)||!form.isConnected)return;const response=await auth().authorizedFetch(path,{method,body:JSON.stringify(body)});const data=await responseBody(response,v,session);if(!current(v,session)||!form.isConnected)return;if(path.endsWith('/initialize')&&data?.initialized!==true||method==='POST'&&path==='/admin/employees'&&!data?.id||method==='PATCH'&&data?.id!==form.dataset.id)throw localError(uiLocale.message('تعذر التحقق من الحفظ؛ حدّث الموظفين للتحقق من الحالة.'));form.reset();delete form.dataset.requestId;cursor=null;history=[];search='';searchForm.reset();uiLocale.setMessage(message, '');await load();if(eligible()&&!panel.hidden)uiLocale.setMessage(feedback, success);
  }catch(error){if(current(v,session)&&form.isConnected)uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر تأكيد الحفظ؛ حدّث الموظفين للتحقق.')));}
  finally{if(current(v,session)){busy=false;lock();}}
 }
 panel.addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;const form=event.target;
  if(form===searchForm){search=String(new FormData(form).get('search')||'').trim();cursor=null;history=[];void load();return;}
  const values=Object.fromEntries(new FormData(form)),reason=String(values.reason||'').trim(),reviewed=values.reviewed==='on';if(!reviewed||reason.length<5)return;
  if(form.matches('[data-staff-initialize]')){void mutate(form, '/admin/employees/initialize', {reason,reviewed}, 'POST', uiLocale.message('تمت تهيئة الهيكل الداخلي. يمكنك إنشاء طلب تعيين.'));return;}
  if(form===requestForm){
   const body={mode:values.mode,departmentCode:values.departmentCode,jobTitle:values.jobTitle,profile:values.profile,reason,reviewed,requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID())};
   if(values.mode==='CREATE')Object.assign(body,{email:values.email,firstName:values.firstName,lastName:values.lastName,verificationMethod:values.verificationMethod});else Object.assign(body,{accountId:values.accountId});
   void mutate(form, '/admin/employees', body, 'POST', uiLocale.message('حُفظ طلب التعيين. يلزم تحقق الحساب ثم مراجعة المالك واعتماد المالك أو مفوضه.'));return;
  }
  if(form.matches('[data-staff-decision]')){
   const action=event.submitter?.value;if(!['REVIEW','APPROVE','REJECT','CANCEL'].includes(action))return;
   void mutate(form, '/admin/employees/'+encodeURIComponent(form.dataset.id)+'/decision', {action,reason,reviewed,expectedUpdatedAt:form.dataset.revision}, 'PATCH', (action==='APPROVE' ? uiLocale.message('تم اعتماد التعيين وتطبيق الصلاحيات وتسجيل القرار. يلزم دخول جديد للموظف.') : uiLocale.message('تم حفظ قرار التوظيف وتسجيله.')));
  }
 });
 requestForm.addEventListener('input',()=>delete requestForm.dataset.requestId);requestForm.addEventListener('change',()=>{delete requestForm.dataset.requestId;syncForm();});
 panel.querySelector('[data-staff-find]').addEventListener('click',async()=>{
  if(busy)return;const v=version,session=auth()?.getSessionVersion?.(),query=requestForm.elements.accountSearch.value.trim(),message=panel.querySelector('[data-staff-lookup-feedback]');busy=true;lock();uiLocale.setMessage(message, uiLocale.message('جارٍ البحث عن الحساب…'));
  try{if(!await authorize(v,session))return;const response=await auth().authorizedFetch('/admin/accounts?search='+encodeURIComponent(query)),data=await responseBody(response,v,session);if(!current(v,session))return;if(!Array.isArray(data?.items))throw localError(uiLocale.message('تعذر قراءة الحسابات.'));uiLocale.setHTML(requestForm.elements.accountId, uiLocale.html`<option value="">اختر الحساب المتحقق</option>${data.items.map(row=>uiLocale.html`<option value="${esc(row.id)}"${row.status!=='ACTIVE'||!row.emailVerifiedAt?' disabled':''}>${uiLocale.messageHTML(([row.person?.firstName,row.person?.lastName].filter(Boolean).join(' ') || uiLocale.message('مستخدم')))} · ${esc(row.email)} · ${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(accountLabels[row.status]) || row.status))}</option>`).join('')}`);uiLocale.setMessage(message, (data.nextCursor ? uiLocale.message('ظهرت أول صفحة من الحسابات؛ حدّد البحث لتقليل النتائج.') : uiLocale.message("تم العثور على {0} حسابًا. الحسابات غير المتحققة أو المعلقة غير متاحة للربط.", [data.items.length])));
  }catch(error){if(current(v,session))uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر البحث.')));}
  finally{if(current(v,session)){busy=false;lock();}}
 });
 panel.querySelector('[data-staff-refresh]').addEventListener('click',()=>void load());
 panel.querySelector('[data-staff-next]').addEventListener('click',()=>{if(busy||!nextCursor)return;history.push(cursor);cursor=nextCursor;void load();});
 panel.querySelector('[data-staff-previous]').addEventListener('click',()=>{if(busy||!history.length)return;cursor=history.pop();void load();});
 document.addEventListener('hydroland:workspace-selected',event=>{if(event.detail?.target===panel)void load();else clear();});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear();});

 const contractAutomatic=new Set(['EMPLOYMENT_ACCOUNT','EMPLOYMENT_POSITION','EMPLOYMENT_ORG_UNIT','EMPLOYMENT','ORGANIZATION']);
 function contractHistory(row,data){
  const snapshot=row.librarySnapshot,available=snapshot&&row.status==='DRAFT'&&data.canCreate&&data.templates.some(t=>t.code===snapshot.template.code);
  return uiLocale.html`<article><h5>الإصدار ${esc(row.version)} · ${esc(snapshot?.template?.titleAr||row.contractType)}</h5><p>${uiLocale.messageHTML((row.status==='DRAFT' ? uiLocale.message('مسودة') : row.status))} · ${esc(row.effectiveFrom?.slice(0,10))}</p>${snapshot?uiLocale.html`${snapshot.template.approval?.basis==='OWNER_COMBINED_INTERNAL_DRAFTS'?uiLocale.html`<p>أُعدت من قالب معتمد إداريًا من مسؤول الإدارتين؛ المراجعة القانونية المستقلة لم تكتمل. هذه مسودة داخلية فقط.</p>`:''}<p>قالب الإصدار ${esc(snapshot.template.version)} · ${esc(snapshot.snapshotHash)}</p>${snapshot.revisionOf?uiLocale.html`<p>إصدار جديد من مسودة الإصدار ${esc(snapshot.revisionOf.version)}؛ النسخة السابقة محفوظة.</p>`:''}<details><summary>عرض النسخة المحفوظة</summary><dl>${snapshot.template.content.fields.map(f=>uiLocale.html`<dt>${esc(f.label)}</dt><dd>${uiLocale.messageHTML((snapshot.values[f.key] || uiLocale.message('لم يستكمل')))}</dd>`).join('')}</dl><ol>${snapshot.template.content.clauses.map(c=>uiLocale.html`<li>${esc(c)}</li>`).join('')}</ol></details>${available?uiLocale.html`<button type="button" data-contract-revise="${esc(row.id)}">إنشاء إصدار جديد من المسودة ${esc(row.version)}</button>`:''}`:uiLocale.html`<p>سجل سابق دون ربط بمكتبة العقود؛ لم يُعدّل.</p>`}</article>`;
 }
 function renderContractDrafts(box,data,id){
  box.hidden=false;uiLocale.setHTML(box, uiLocale.html`<h4>عقود ${esc(data.employeeName)}</h4><p>تُحفظ مسودة مرتبطة بإصدار القالب المعتمد وبيانات الموظف وقت الإنشاء. إعداد المسودة لا يوقّع عقدًا أو يعتمد تعيينًا أو يفعّل صلاحية. توقيع العامل والتوثيق الرسمي لهما إجراء لاحق.</p><div data-employment-contract-history>${data.items.length?data.items.map(r=>contractHistory(r,data)).join(''):uiLocale.html`<p>لا توجد عقود موظف محفوظة.</p>`}</div>${!data.templates.length?uiLocale.html`<p>يلزم اعتماد قالب موظفين للمسودات في مكتبة العقود من مسؤول الإدارتين المكلف، أو بعد المراجعتين المستقلتين والنشر.</p>`:data.canCreate?uiLocale.html`<form data-employment-contract-draft><fieldset><legend data-contract-form-title>مسودة عقد جديدة</legend><p data-contract-revision-note hidden></p><button type="button" data-contract-revision-cancel hidden>إلغاء إعداد الإصدار الجديد</button><label>قالب عقد الموظف<select name="templateId">${data.templates.map(t=>uiLocale.html`<option value="${esc(t.id)}">${esc(t.titleAr)} · الإصدار ${esc(t.version)}${uiLocale.messageHTML((t.approval?.basis==='OWNER_COMBINED_INTERNAL_DRAFTS' ? uiLocale.message(' · اعتماد إداري للمسودات فقط') : ''))}</option>`).join('')}</select></label><div data-employment-contract-fields></div><label>تاريخ سريان المسودة<input type="date" name="effectiveFrom" required></label><label>نهاية المدة إن وجدت<input type="date" name="effectiveTo"></label><section data-contract-comparison hidden></section><label>سبب إعداد مسودة العقد<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label class="hl-staff-ack"><input name="reviewed" type="checkbox" required>راجعت القالب وبيانات الموظف وأطلب حفظ مسودة فقط</label><button type="submit" data-contract-save>حفظ مسودة عقد الموظف</button></fieldset></form>`:uiLocale.html`<p>إنشاء مسودة غير متاح لحالة الموظف أو صلاحية الحساب الحالية.</p>`}<p role="status" data-employment-contract-feedback></p>`);
  const form=box.querySelector('form');if(!form)return;
  let revising=null;
  const selected=()=>data.templates.find(t=>t.id===form.elements.templateId.value),save=form.querySelector('[data-contract-save]'),comparison=form.querySelector('[data-contract-comparison]');
  const normalized=value=>String(value??'').trim().normalize('NFC');
  function compare(){
   comparison.hidden=!revising;save.dataset.unchanged='false';save.disabled=busy;
   if(!revising){comparison.replaceChildren();return;}
   const old=revising.librarySnapshot,t=selected(),rows=[];
   const add=(label,before,after,changed=false)=>{if(changed||before!==after)rows.push([label,before,after]);};
   add(uiLocale.t('القالب'),old.template.titleAr+uiLocale.t(' · الإصدار ')+old.template.version,t.titleAr+uiLocale.t(' · الإصدار ')+t.version,old.template.id!==t.id||old.template.contentHash!==t.contentHash);
   add(uiLocale.t('تاريخ السريان'),revising.effectiveFrom.slice(0,10),form.elements.effectiveFrom.value);
   add(uiLocale.t('نهاية المدة'),revising.effectiveTo?.slice(0,10)||'',form.elements.effectiveTo.value);
   for(const key of new Set([...old.template.content.fields,...t.content.fields].map(f=>f.key))){
    const before=old.template.content.fields.find(f=>f.key===key),after=t.content.fields.find(f=>f.key===key);
    const next=after?(contractAutomatic.has(after.source)?data.sourceValues[key]||'':normalized(form.elements.namedItem('value.'+key)?.value)):'';
    add(after?.label||before.label,before?old.values[key]||'':'',next,Boolean(before&&after&&(before.label!==after.label||before.source!==after.source||before.required!==after.required))||!before||!after);
   }
   for(let n=0;n<Math.max(old.template.content.clauses.length,t.content.clauses.length);n++)add(uiLocale.t('البند ')+(n+1),old.template.content.clauses[n]||'',t.content.clauses[n]||'');
   add(uiLocale.t('ضوابط استخدام القالب'),old.template.content.usageNotes||'',t.content.usageNotes||'');
   uiLocale.setHTML(comparison, uiLocale.html`<h5>مقارنة التغييرات</h5><p>${uiLocale.messageHTML((rows.length ? uiLocale.message('راجع البيانات والبنود المتغيرة قبل تأكيد حفظ الإصدار الجديد.') : uiLocale.message('لا توجد تغييرات على المسودة السابقة.')))}</p>${rows.length?uiLocale.html`<table class="hl-contract-comparison"><caption>المسودة ${esc(revising.version)} والإصدار المقترح</caption><thead><tr><th scope="col">البيان</th><th scope="col">النسخة السابقة</th><th scope="col">الإصدار الجديد</th></tr></thead><tbody>${rows.map(([label,before,after])=>uiLocale.html`<tr><th scope="row">${esc(label)}</th><td>${uiLocale.messageHTML((before || uiLocale.message('لم يستكمل')))}</td><td>${uiLocale.messageHTML((after || uiLocale.message('لم يستكمل')))}</td></tr>`).join('')}</tbody></table>`:''}`);
   save.dataset.unchanged=String(!rows.length);save.disabled=busy||!rows.length;
  }
  function fields(){
   const t=selected();uiLocale.setHTML(form.querySelector('[data-employment-contract-fields]'), uiLocale.html`${t.approval?.basis==='OWNER_COMBINED_INTERNAL_DRAFTS'?uiLocale.html`<p>اعتماد إداري للمسودات الداخلية فقط. المراجعة القانونية المستقلة لم تكتمل، والتوقيع والتوثيق الرسمي متطلبات منفصلة.</p>`:''}<details><summary>بنود القالب المحدد</summary><ol>${t.content.clauses.map(c=>uiLocale.html`<li>${esc(c)}</li>`).join('')}</ol></details><dl>${t.content.fields.filter(f=>contractAutomatic.has(f.source)).map(f=>uiLocale.html`<dt>${esc(f.label)}</dt><dd>${uiLocale.messageHTML((data.sourceValues[f.key] || uiLocale.message('يلزم استكمال المصدر الأصلي')))}</dd>`).join('')}</dl><p>استخدم مراجع الإثبات فقط؛ لا تكتب أرقام الهوية أو التفاصيل الطبية في المسودة.</p>${t.content.fields.filter(f=>!contractAutomatic.has(f.source)).map(f=>uiLocale.html`<label>${esc(f.label)}<textarea name="value.${esc(f.key)}" maxlength="2000"></textarea></label>`).join('')}`);
   if(revising)for(const field of t.content.fields.filter(f=>!contractAutomatic.has(f.source))){
    const prior=revising.librarySnapshot.template.content.fields.find(f=>f.key===field.key&&f.label===field.label&&f.source===field.source);
    if(prior)form.elements.namedItem('value.'+field.key).value=revising.librarySnapshot.values[field.key]||'';
   }
   delete form.dataset.requestId;form.elements.reviewed.checked=false;compare();
  }
  box.querySelector('[data-employment-contract-history]').addEventListener('click',event=>{
   const button=event.target.closest('[data-contract-revise]');if(!button||busy)return;
   const row=data.items.find(r=>r.id===button.dataset.contractRevise),t=data.templates.find(t=>t.code===row?.librarySnapshot?.template.code);if(!row||!t)return;
   revising=row;form.reset();form.elements.templateId.value=t.id;
   for(const option of form.elements.templateId.options)option.disabled=data.templates.find(t=>t.id===option.value)?.code!==t.code;
   form.elements.effectiveFrom.value=row.effectiveFrom.slice(0,10);form.elements.effectiveTo.value=row.effectiveTo?.slice(0,10)||'';
   uiLocale.setMessage(form.querySelector('[data-contract-form-title]'), uiLocale.message("إصدار جديد من المسودة {0}", [row.version]));
   const note=form.querySelector('[data-contract-revision-note]');note.hidden=false;uiLocale.setMessage(note, uiLocale.message('تُحدّث بيانات الموظف والجهة من مصادرها الحالية، وتُنقل الشروط التي تطابق حقول القالب الحالي. أكمل الحقول الجديدة أو المتغيرة وراجع البنود. تبقى المسودة السابقة محفوظة.'));
   form.querySelector('[data-contract-revision-cancel]').hidden=false;uiLocale.setMessage(save, uiLocale.message('حفظ إصدار جديد من المسودة'));uiLocale.setMessage(box.querySelector('[data-employment-contract-feedback]'), '');fields();form.elements.reason.focus();
  });
  form.querySelector('[data-contract-revision-cancel]').addEventListener('click',()=>{
   if(busy)return;revising=null;form.reset();for(const option of form.elements.templateId.options)option.disabled=false;
   uiLocale.setMessage(form.querySelector('[data-contract-form-title]'), uiLocale.message('مسودة عقد جديدة'));form.querySelector('[data-contract-revision-note]').hidden=true;form.querySelector('[data-contract-revision-cancel]').hidden=true;uiLocale.setMessage(save, uiLocale.message('حفظ مسودة عقد الموظف'));fields();
  });
  fields();form.elements.templateId.addEventListener('change',fields);
  const changed=event=>{delete form.dataset.requestId;if(event.target!==form.elements.reviewed)form.elements.reviewed.checked=false;compare();};
  form.addEventListener('input',changed);form.addEventListener('change',changed);
  form.addEventListener('submit',async event=>{
   event.preventDefault();event.stopPropagation();if(busy)return;
   const v=version,session=auth()?.getSessionVersion?.(),message=box.querySelector('[data-employment-contract-feedback]'),entry=new FormData(form),t=data.templates.find(t=>t.id===entry.get('templateId'));
   const values=Object.fromEntries(t.content.fields.filter(f=>!contractAutomatic.has(f.source)).map(f=>[f.key,entry.get('value.'+f.key)||'']));
   if(revising&&save.dataset.unchanged==='true')return;
   const body={requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID()),expectedEmploymentUpdatedAt:data.employmentUpdatedAt,expectedSourceHash:data.sourceHash,expectedContractVersion:data.expectedContractVersion,templateId:t.id,expectedTemplateVersion:t.version,expectedTemplateContentHash:t.contentHash,effectiveFrom:entry.get('effectiveFrom'),effectiveTo:entry.get('effectiveTo')||null,values,reason:entry.get('reason'),reviewed:entry.get('reviewed')==='on',...(revising?{revisesContract:{id:revising.id,expectedSnapshotHash:revising.librarySnapshot.snapshotHash}}:{})};
   busy=true;lock();uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ المسودة…'));
   try{if(!await authorize(v,session)||!form.isConnected)return;const response=await auth().authorizedFetch('/hr/employments/'+encodeURIComponent(id)+'/contracts',{method:'POST',body:JSON.stringify(body)});if([401,403].includes(response.status)){if(current(v,session)&&box.isConnected)uiLocale.setMessage(box, uiLocale.message('لم تعد صلاحية عقود الموظف متاحة لهذا الحساب.'));return;}const result=await responseBody(response,v,session);if(!current(v,session)||!form.isConnected)return;if(!result?.id||result.status!=='DRAFT')throw localError(uiLocale.message('تعذر تأكيد حفظ المسودة.'));await loadContractDrafts(box,id);}
   catch(error){if(current(v,session)&&form.isConnected)uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر حفظ المسودة؛ حدّث عقود الموظف للتحقق.')));}
   finally{if(current(v,session)){busy=false;lock();}}
  });
 }
 async function loadContractDrafts(box,id){
  const v=version,session=auth()?.getSessionVersion?.(),token=String((Number(box.dataset.contractLoad)||0)+1);box.dataset.contractLoad=token;box.hidden=false;uiLocale.setMessage(box, uiLocale.message('جارٍ تحميل عقود الموظف…'));
  try{if(!await authorize(v,session)||!box.isConnected)return;const response=await auth().authorizedFetch('/hr/employments/'+encodeURIComponent(id)+'/contracts');const data=await responseBody(response,v,session);if(!current(v,session)||!box.isConnected||box.dataset.contractLoad!==token)return;if(!Array.isArray(data?.items)||!Array.isArray(data.templates))throw localError(uiLocale.message('تعذر قراءة عقود الموظف.'));renderContractDrafts(box,data,id);}
  catch(error){if(current(v,session)&&box.isConnected&&box.dataset.contractLoad===token)uiLocale.setMessage(box, (localErrorMessage(error) || uiLocale.message('تعذر تحميل عقود الموظف.')));}
 }
 list.addEventListener('click',event=>{const button=event.target.closest('[data-employment-contracts]');if(!button||busy)return;void loadContractDrafts(button.closest('article').querySelector('[data-employment-contract-box]'),button.dataset.employmentContracts);});
 window.HydrolandAdminEmployees=Object.freeze({reload:load});
})();
