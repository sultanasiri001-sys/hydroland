(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("contract-library", {
  "شعار هيدرولاند": "Hydroland logo",
  "اسم العقد": "Contract name",
  "هيدرولاند": "Hydroland",
  "مكتبة العقود": "Contract library",
  "قوالب موحدة، إصدارات محفوظة، ومراجعة قبل الاعتماد.": "Unified templates, retained versions and review before approval.",
  "تحديث المكتبة": "Refresh library",
  "مسؤول الموارد البشرية والشؤون القانونية": "HR and legal-affairs officer",
  "تكليف إداري للمالك في الإدارتين يتيح اعتماد قوالب الموظفين لإعداد المسودات الداخلية من حسابه نفسه. يبقى الاعتماد الإداري منفصلاً عن المراجعة القانونية المستقلة والتوقيع والتوثيق الرسمي.": "An administrative appointment of the owner to both departments allows the same account to approve employee templates for internal drafts. Administrative approval remains separate from independent legal review, signature and official authentication.",
  "مرجع تكليف الإدارتين": "Dual-department appointment reference",
  "سبب تكليف الإدارتين": "Reason for dual-department appointment",
  "راجعت الحساب ونطاق التكليف في الموارد البشرية والشؤون القانونية": "I have reviewed the account and appointment scope in HR and legal affairs",
  "أوافق على جمع مسؤولية الإدارتين واعتماد المسودات في حساب المالك نفسه": "I agree to combine responsibility for both departments and draft approval in the owner's account",
  "تفعيل تكليف حسابي بالإدارتين": "Appoint my account to both departments",
  "إيقاف تكليف الإدارتين": "Deactivate dual-department appointment",
  "بحث عن قالب": "Search templates",
  "التصنيف": "Category",
  "كل التصنيفات": "All categories",
  "عقود التعاون": "Cooperation contracts",
  "عقود الموظفين": "Employee contracts",
  "قوالب أخرى": "Other templates",
  "حالة أحدث إصدار": "Latest version status",
  "كل الحالات": "All statuses",
  "مسودة": "Draft",
  "قيد المراجعة": "Under review",
  "معتمد للاستخدام": "Approved for use",
  "معتمد إداريًا للمسودات": "Administratively approved for drafts",
  "مسحوب من الاستخدام": "Withdrawn from use",
  "بحث": "Search",
  "إضافة أربعة قوالب أولية من نماذج هيدرولاند السابقة، كمسودات تحتاج المراجعة.": "Add four initial templates from previous Hydroland forms as drafts requiring review.",
  "أؤكد إضافتها كمسودات للمراجعة": "I confirm adding these as drafts for review",
  "إضافة القوالب الأولية": "Add initial templates",
  "قوالب العقود": "Contract templates",
  "اختر قالباً لمراجعة بنوده وإصداراته.": "Select a template to review its clauses and versions.",
  "مراجعة المالك المؤقتة مفعّلة حتى": "Temporary owner review is enabled until",
  "بتوقيت السعودية. يمكن للمالك تنفيذ المراحل المسموحة؛ قوالب الموظفين تتطلب مراجعة قانونية مستقلة لا يتيحها هذا الوضع. تبقى المراجع واجبة وتُسجل الصلاحية المؤقتة مع القرار.": "Saudi time. The owner can perform permitted stages. Employee templates require independent legal review, which this mode does not provide. References remain mandatory, and temporary authority is recorded with the decision.",
  "إصدار سابق": "Previous version",
  "بيانات المركز": "Center data",
  "بيانات العضوية": "Membership data",
  "حساب الموظف": "Employee account",
  "سجل الموظف": "Employee record",
  "الوظيفة": "Position",
  "الإدارة": "Department",
  "بيانات الجهة": "Organization data",
  "الممثل المفوض": "Authorized representative",
  "مرجع إثبات محفوظ لدى الموارد البشرية": "Evidence reference retained by HR",
  "بيانات العقد": "Contract data",
  "إرسال للمراجعة": "Submit for review",
  "تسجيل الموافقة الداخلية على الصياغة": "Record internal wording approval",
  "اعتماد إداري لإعداد المسودات": "Administrative approval for draft preparation",
  "تسجيل المراجعة القانونية": "Record legal review",
  "تسجيل مراجعة الموارد البشرية": "Record HR review",
  "اعتماد للاستخدام": "Approve for use",
  "إعادة للتعديل": "Return for changes",
  "سحب من الاستخدام": "Withdraw from use",
  "سجل الدخول للمتابعة.": "Sign in to continue.",
  "تعذر إتمام إجراء المكتبة.": "Could not complete the library action.",
  "مكلّف بالإدارتين:": "Appointed to both departments:",
  "الحساب المرشح لتكليف الإدارتين:": "Account nominated for both departments:",
  "المالك الحالي": "Current owner",
  "· النطاق: اعتماد قوالب الموظفين للمسودات الداخلية فقط.": "· Scope: employee-template approval for internal drafts only.",
  "تعذر تأكيد التكليف؛ حدّث المكتبة للتحقق.": "Could not confirm the appointment. Refresh the library to verify.",
  "حُفظ تكليف مسؤول الإدارتين. اعتماد كل قالب للمسودات قرار منفصل.": "Dual-department officer appointment saved. Each template's approval for drafts is a separate decision.",
  "أوقف التكليف. المسودات السابقة محفوظة ولا يتيح التكليف القديم إنشاء مسودات جديدة.": "Appointment deactivated. Previous drafts are retained; the former appointment does not allow new drafts.",
  "الإصدار": "Version",
  "المستخدم حالياً: الإصدار": "Currently used: version",
  "لا توجد قوالب مطابقة. تظهر القوالب هنا بعد إضافتها، وتتاح للأطراف بعد اعتمادها.": "No matching templates. Templates appear after addition and become available to parties after approval.",
  "· الإصدار": "· Version",
  "ارتباط الإدارات": "Department links",
  "الشؤون القانونية: مراجعة البنود والاعتماد. الشؤون الإدارية: حفظ المستندات والأدلة.": "Legal affairs: clause review and approval. Administrative affairs: document and evidence retention.",
  "قالب موحد · الإصدار": "Unified template · Version",
  "البيانات المطلوبة ومصدرها": "Required data and its source",
  "بنود العقد": "Contract clauses",
  "ضوابط الاستخدام": "Usage controls",
  "إعداد من:": "Prepared by:",
  "تحفظ العقود المنفذة نص القالب ورقم إصداره وقت الإنشاء.": "Executed contracts retain the template text and version number at creation.",
  "المراجعات": "Reviews",
  "الشؤون القانونية:": "Legal affairs:",
  "اعتماد للاستخدام:": "Approval for use:",
  "سجل الإصدارات": "Version history",
  "الموارد البشرية: بيانات العامل والوظيفة من سجل الموظف. يمكن حفظ مسودة من القالب المعتمد عبر عقود الموظف في إدارة الموظفين. يبقى توقيع العامل والتوثيق الرسمي ضمن إجراءات الموارد البشرية اللاحقة.": "Human resources: employee and position data come from the employee record. A draft can be saved from an approved template through employee contracts in employee management. Employee signature and official authentication remain later HR procedures.",
  "بيانات المركز والمحترف من ملفيهما المسجلين؛ توقيع الطرفين ثم اعتماد هيدرولاند.": "Center and professional data come from their registered profiles, followed by both parties' signatures and Hydroland approval.",
  "الموافقة الداخلية على الصياغة:": "Internal wording approval:",
  "الموافقة الداخلية لإعداد المسودات لا تغني عن المراجعة القانونية المستقلة ومراجعة الموارد البشرية، ولا تتيح استخدام القالب بمفردها. إعداد المسودات يتطلب اعتمادًا إداريًا من مسؤول الإدارتين أو اكتمال المراجعات المستقلة ونشر القالب.": "Internal approval for draft preparation does not replace independent legal and HR reviews, or permit use of the template by itself. Draft preparation requires administrative approval from the dual-department officer, or completed independent reviews and template publication.",
  "مسجلة ·": "Recorded ·",
  "بانتظار موافقة المالك": "Awaiting owner approval",
  "تمت المراجعة ·": "Reviewed ·",
  "· بصلاحية المالك المؤقتة": "· Using temporary owner authority",
  "بانتظار المراجعة المستقلة": "Awaiting independent review",
  "الموارد البشرية:": "Human resources:",
  "بانتظار مراجعة الموارد البشرية": "Awaiting HR review",
  "اعتماد إداري لإعداد المسودات:": "Administrative approval for draft preparation:",
  "سُجل القرار من حساب مسؤول الإدارتين نفسه. المراجعة القانونية المستقلة والتوقيع والتوثيق الرسمي متطلبات منفصلة.": "The decision was recorded by the same dual-department officer account. Independent legal review, signature and official authentication are separate requirements.",
  "التكليف الحالي ساري؛ القالب متاح لإعداد المسودات الداخلية.": "The current appointment is valid. The template is available for internal drafts.",
  "التكليف غير فعال لهذا القرار حاليًا؛ إعداد مسودات جديدة من هذا القالب متوقف.": "The appointment is not currently effective for this decision. New drafts from this template are paused.",
  "تعديل القالب أو إضافة قالب مستقل": "Edit template or add a separate template",
  "اسم العقد بالعربية": "Contract name in Arabic",
  "اسم العقد بالإنجليزية": "Contract name in English",
  "البنود — افصل بين كل بندين بسطر فارغ": "Clauses — separate each pair with a blank line",
  "سبب التعديل أو إضافة القالب": "Reason for editing or adding the template",
  "يحفظ التعديل إصداراً جديداً يحتاج مراجعة، وتظل العقود السابقة مرتبطة بنسختها.": "Editing saves a new version requiring review. Existing contracts retain their version.",
  "حفظ إصدار جديد": "Save new version",
  "إضافة كقالب مستقل": "Add as a separate template",
  "قرار القالب": "Template decision",
  "سبب القرار أو الملاحظة": "Decision reason or note",
  "راجعت بنود هذا الإصدار وضوابط استخدامه": "I have reviewed this version's clauses and usage controls",
  "رقم المذكرة أو مرجع التحقق": "Memorandum number or verification reference",
  "مرجع المراجعة أو الموافقة الداخلية": "Review or internal approval reference",
  "قرارات هذا الإصدار": "Decisions for this version",
  "جارٍ تحميل القرارات…": "Loading decisions…",
  "إضافة المسودة": "Add draft",
  "إضافة قالب مستقل": "Add separate template",
  "حل إصدار أحدث محل هذا الإصدار": "A newer version replaced this version",
  "تحديث القالب": "Update template",
  "لا توجد قرارات.": "No decisions.",
  "جارٍ تحميل مكتبة العقود…": "Loading contract library…",
  "اختر قالباً. يحفظ كل تعديل بإصدار مستقل، ويستخدم العقد الجديد النسخة المعتمدة فقط.": "Select a template. Each change is saved as a separate version; new contracts use only the approved version.",
  "جارٍ تحميل القالب…": "Loading template…",
  "قالب معتمد إداريًا لإعداد المسودات الداخلية فقط.": "Template administratively approved for internal drafts only.",
  "قالب معتمد للاستخدام.": "Template approved for use.",
  "هذه النسخة مخصصة للإعداد أو المراجعة.": "This version is for preparation or review.",
  "أضيفت": "Added",
  "قوالب كمسودات للمراجعة.": "templates as drafts for review.",
  "القوالب الأولية موجودة؛ لم تنشأ نسخ مكررة.": "Initial templates already exist. No duplicates were created.",
  "تم حفظ الإجراء وسجله. العقود السابقة تحتفظ بنسختها.": "Action and history saved. Existing contracts retain their version.",
  "احفظ الإصدار الجديد قبل إجراء قرار على القالب.": "Save the new version before making a template decision.",
  "إصدارات القالب": "Template versions",
  "مكتبة عقود هيدرولاند": "Hydroland contract library",
  "مراجعة المالك المؤقتة مفعّلة حتى {0} بتوقيت السعودية. يمكن للمالك تنفيذ المراحل المسموحة؛ قوالب الموظفين تتطلب مراجعة قانونية مستقلة لا يتيحها هذا الوضع. تبقى المراجع واجبة وتُسجل الصلاحية المؤقتة مع القرار.": "Temporary owner review is enabled until {0} Saudi time. The owner can perform permitted stages. Employee templates require independent legal review, which this mode does not provide. References remain mandatory, and temporary authority is recorded with the decision.",
  "{0}{1} · النطاق: اعتماد قوالب الموظفين للمسودات الداخلية فقط.": "{0}{1} · Scope: employee-template approval for internal drafts only.",
  "مكلّف بالإدارتين: ": "Appointed to both departments: ",
  "الحساب المرشح لتكليف الإدارتين: ": "Account nominated for both departments: ",
  "مسجلة · {0} · {1}": "Recorded · {0} · {1}",
  "تمت المراجعة · {0} · {1}{2}": "Reviewed · {0} · {1}{2}",
  " · بصلاحية المالك المؤقتة": " · Using temporary owner authority",
  "أضيفت {0} قوالب كمسودات للمراجعة.": "Added {0} templates as drafts for review."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if(window.HydrolandContractLibrary)return;
  const host=document.getElementById('role-console');if(!host)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=document.createElement('section');panel.id='hl-contract-library';panel.className='hl-contracts hl-contract-library';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<header class="hl-contract-heading"><div class="hl-contract-brand"><img src="./assets/hydroland-mark-reference.webp" alt="شعار هيدرولاند"><div><b>HYDROLAND</b><span>هيدرولاند</span></div></div><div><h2>مكتبة العقود</h2><p>قوالب موحدة، إصدارات محفوظة، ومراجعة قبل الاعتماد.</p></div><button type="button" data-library-refresh>تحديث المكتبة</button></header><p role="status" aria-live="polite" data-library-note></p><p data-library-owner-review hidden></p><details data-library-responsibility hidden><summary>مسؤول الموارد البشرية والشؤون القانونية</summary><p>تكليف إداري للمالك في الإدارتين يتيح اعتماد قوالب الموظفين لإعداد المسودات الداخلية من حسابه نفسه. يبقى الاعتماد الإداري منفصلاً عن المراجعة القانونية المستقلة والتوقيع والتوثيق الرسمي.</p><p data-library-responsibility-status></p><form data-library-responsibility-form><label>مرجع تكليف الإدارتين<input name="reference" maxlength="240" required></label><label>سبب تكليف الإدارتين<textarea name="reason" minlength="5" maxlength="1000" required rows="2"></textarea></label><label class="hl-library-check"><input type="checkbox" name="reviewed" required><span>راجعت الحساب ونطاق التكليف في الموارد البشرية والشؤون القانونية</span></label><label class="hl-library-check"><input type="checkbox" name="acknowledgeCombinedApproval" required><span>أوافق على جمع مسؤولية الإدارتين واعتماد المسودات في حساب المالك نفسه</span></label><div class="hl-library-actions"><button type="submit" value="ASSIGN">تفعيل تكليف حسابي بالإدارتين</button><button type="submit" value="REVOKE">إيقاف تكليف الإدارتين</button></div></form></details><div class="hl-library-toolbar"><form data-library-search><label>بحث عن قالب<input name="q" type="search" maxlength="160" placeholder="اسم العقد"></label><label>التصنيف<select name="category"><option value="">كل التصنيفات</option><option value="COOPERATION">عقود التعاون</option><option value="EMPLOYMENT">عقود الموظفين</option><option value="GENERAL">قوالب أخرى</option></select></label><label>حالة أحدث إصدار<select name="state"><option value="">كل الحالات</option><option value="DRAFT">مسودة</option><option value="IN_REVIEW">قيد المراجعة</option><option value="PUBLISHED">معتمد للاستخدام</option><option value="APPROVED_FOR_DRAFTS">معتمد إداريًا للمسودات</option><option value="RETIRED">مسحوب من الاستخدام</option></select></label><button type="submit">بحث</button></form><form data-library-initialize hidden><p>إضافة أربعة قوالب أولية من نماذج هيدرولاند السابقة، كمسودات تحتاج المراجعة.</p><label class="hl-library-check"><input type="checkbox" name="reviewed" required><span>أؤكد إضافتها كمسودات للمراجعة</span></label><button type="submit">إضافة القوالب الأولية</button></form></div><div class="hl-contract-layout"><aside><h3>قوالب العقود</h3><div data-library-list></div></aside><div data-library-detail><p>اختر قالباً لمراجعة بنوده وإصداراته.</p></div></div>`);
  host.insertAdjacentElement('afterend',panel);
  const css=document.createElement('link');css.rel='stylesheet';css.href='./hydroland-contract-library.css';document.head.appendChild(css);
  const auth=()=>window.HydrolandAuth,session=()=>auth()?.getSessionVersion?.();
  let generation=0,capabilityGeneration=0,active=null,items=[],workspace=null,busy=false,dirty=false;
  const current=(g,s)=>g===generation&&s===session()&&auth()?.isAuthenticated?.();
  const note=s=>{uiLocale.setMessage(panel.querySelector('[data-library-note]'), s)};
  function ownerNotice(mode=workspace?.temporaryOwnerReview){const el=panel.querySelector('[data-library-owner-review]'),active=mode?.active===true&&Number.isFinite(Date.parse(mode.expiresAt))&&Date.parse(mode.expiresAt)>Date.now();el.hidden=!active;uiLocale.setMessage(el, (active ? uiLocale.message("مراجعة المالك المؤقتة مفعّلة حتى {0} بتوقيت السعودية. يمكن للمالك تنفيذ المراحل المسموحة؛ قوالب الموظفين تتطلب مراجعة قانونية مستقلة لا يتيحها هذا الوضع. تبقى المراجع واجبة وتُسجل الصلاحية المؤقتة مع القرار.", [date(mode.expiresAt)]) : ''));}
  const states={DRAFT:'مسودة',IN_REVIEW:'قيد المراجعة',PUBLISHED:'معتمد للاستخدام',APPROVED_FOR_DRAFTS:'معتمد إداريًا للمسودات',RETIRED:'مسحوب من الاستخدام',SUPERSEDED:'إصدار سابق'};
  const categories={COOPERATION:'عقود التعاون',EMPLOYMENT:'عقود الموظفين',GENERAL:'قوالب أخرى'};
  const sources={CENTER_PROFILE:'بيانات المركز',MEMBER_PROFILE:'بيانات العضوية',EMPLOYMENT_ACCOUNT:'حساب الموظف',EMPLOYMENT:'سجل الموظف',EMPLOYMENT_POSITION:'الوظيفة',EMPLOYMENT_ORG_UNIT:'الإدارة',ORGANIZATION:'بيانات الجهة',AUTHORIZED_REPRESENTATIVE:'الممثل المفوض',HR_RESTRICTED_EVIDENCE:'مرجع إثبات محفوظ لدى الموارد البشرية',CONTRACT_TERMS:'بيانات العقد'};
  const actions={SUBMIT:'إرسال للمراجعة',INTERNAL_APPROVAL:'تسجيل الموافقة الداخلية على الصياغة',APPROVE_FOR_DRAFTS:'اعتماد إداري لإعداد المسودات',LEGAL_REVIEW:'تسجيل المراجعة القانونية',HR_REVIEW:'تسجيل مراجعة الموارد البشرية',PUBLISH:'اعتماد للاستخدام',RETURN:'إعادة للتعديل',RETIRE:'سحب من الاستخدام'};
  const date=v=>v?new Date(v).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}):'—';
  async function request(path,method='GET',body){
    if(!auth()?.isAuthenticated?.())throw localError(uiLocale.message('سجل الدخول للمتابعة.'));
    const r=await auth().authorizedFetch(path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const value=await r.json().catch(()=>null);if(!r.ok)throw Object.assign(localError((typeof value?.message==='string' ? value.message : uiLocale.message('تعذر إتمام إجراء المكتبة.'))),{status:r.status});return value;
  }
  function responsibility(){const box=panel.querySelector('[data-library-responsibility]'),form=panel.querySelector('[data-library-responsibility-form]'),mode=workspace?.ownerDepartmentResponsibility;box.hidden=mode?.canManage!==true;if(box.hidden){form.reset();box.open=false;delete form.dataset.revision;uiLocale.setMessage(panel.querySelector('[data-library-responsibility-status]'), '');return;}if(form.dataset.revision!==(mode.revision||'NONE')){form.querySelectorAll('[type=checkbox]').forEach(e=>e.checked=false);}form.dataset.revision=mode.revision||'NONE';uiLocale.setMessage(panel.querySelector('[data-library-responsibility-status]'), uiLocale.message("{0}{1} · النطاق: اعتماد قوالب الموظفين للمسودات الداخلية فقط.", [(mode.active ? uiLocale.message('مكلّف بالإدارتين: ') : uiLocale.message('الحساب المرشح لتكليف الإدارتين: ')), (mode.account?.email || uiLocale.message('المالك الحالي'))]));}
  async function changeResponsibility(form,action){if(!workspace?.ownerDepartmentResponsibility?.canManage||!['ASSIGN','REVOKE'].includes(action))return;const data=new FormData(form),payload={action,expectedRevision:workspace.ownerDepartmentResponsibility.revision,scope:'INTERNAL_HR_DRAFTS_ONLY',reference:data.get('reference'),reason:data.get('reason'),reviewed:data.get('reviewed')==='on',acknowledgeCombinedApproval:data.get('acknowledgeCombinedApproval')==='on'},g=generation,s=session();busy=true;controls();try{const value=await request('/contracts/library/owner-responsibility','POST',payload);if(!current(g,s))return;if(value.canManage!==true||value.active!==(action==='ASSIGN'))throw localError(uiLocale.message('تعذر تأكيد التكليف؛ حدّث المكتبة للتحقق.'));form.reset();busy=false;await refresh();if(current(g+1,s)){panel.querySelector('[data-library-responsibility]').open=true;note((action==='ASSIGN' ? uiLocale.message('حُفظ تكليف مسؤول الإدارتين. اعتماد كل قالب للمسودات قرار منفصل.') : uiLocale.message('أوقف التكليف. المسودات السابقة محفوظة ولا يتيح التكليف القديم إنشاء مسودات جديدة.')));}}catch(error){if(current(g,s)){if(error.status===403){workspace=null;responsibility();active=null;items=[];list();panel.querySelector('[data-library-detail]').replaceChildren();}note(localErrorMessage(error));}}finally{if(s===session()){busy=false;controls();}}}
  function clear(){generation++;capabilityGeneration++;document.querySelector('[data-open-contract-library]')?.remove();active=null;items=[];workspace=null;responsibility();busy=false;dirty=false;panel.querySelector('[data-library-owner-review]').hidden=true;uiLocale.setMessage(panel.querySelector('[data-library-owner-review]'), '');panel.hidden=true;panel.querySelector('[data-library-list]').replaceChildren();panel.querySelector('[data-library-detail]').replaceChildren();panel.querySelector('[data-library-initialize]').hidden=true;panel.querySelectorAll('form').forEach(f=>f.reset());note('');controls();}
  function controls(){panel.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=busy);if(dirty)panel.querySelectorAll('[data-library-decision] button').forEach(n=>n.disabled=true);const mode=workspace?.ownerDepartmentResponsibility;panel.querySelector('[data-library-responsibility-form] [value=ASSIGN]').disabled=busy||!mode?.canManage||mode.active;panel.querySelector('[data-library-responsibility-form] [value=REVOKE]').disabled=busy||!mode?.canManage||!mode.active;}
  function list(){uiLocale.setHTML(panel.querySelector('[data-library-list]'), items.length?items.map(v=>uiLocale.html`<button type="button" class="hl-contract-list-item" data-library-open="${esc(v.id)}" aria-pressed="${v.id===active?.id}"><b>${esc(v.titleAr)}</b><span>الإصدار ${v.version} · ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(states[v.state]))}</span>${v.publishedVersion&&v.publishedVersion!==v.version?uiLocale.html`<small>المستخدم حالياً: الإصدار ${v.publishedVersion}</small>`:''}</button>`).join(''):uiLocale.html`<p>لا توجد قوالب مطابقة. تظهر القوالب هنا بعد إضافتها، وتتاح للأطراف بعد اعتمادها.</p>`);}
  function render(){
    if(!active)return;ownerNotice();const v=active,c=v.capabilities,content=v.content;
    dirty=false;
    const allowed=[['submit','SUBMIT'],['internalApprove','INTERNAL_APPROVAL'],['approveForDrafts','APPROVE_FOR_DRAFTS'],['legalReview','LEGAL_REVIEW'],['hrReview','HR_REVIEW'],['publish','PUBLISH'],['return','RETURN'],['retire','RETIRE']].filter(([cap])=>c[cap]);
    uiLocale.setHTML(panel.querySelector('[data-library-detail]'), uiLocale.html`<div class="hl-contract-detail-heading"><div><h3>${esc(v.titleAr)}</h3><p>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(categories[content.category]))} · الإصدار ${v.version} · <b class="hl-library-state" data-state="${esc(v.state)}">${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(states[v.state]))}</b></p></div>${c.history?uiLocale.html`<button type="button" data-library-history>سجل الإصدارات</button>`:''}</div><div class="hl-library-integration"><strong>ارتباط الإدارات</strong><p>الشؤون القانونية: مراجعة البنود والاعتماد. الشؤون الإدارية: حفظ المستندات والأدلة.</p>${content.category==='EMPLOYMENT'?uiLocale.html`<p>الموارد البشرية: بيانات العامل والوظيفة من سجل الموظف. يمكن حفظ مسودة من القالب المعتمد عبر عقود الموظف في إدارة الموظفين. يبقى توقيع العامل والتوثيق الرسمي ضمن إجراءات الموارد البشرية اللاحقة.</p>`:uiLocale.html`<p>بيانات المركز والمحترف من ملفيهما المسجلين؛ توقيع الطرفين ثم اعتماد هيدرولاند.</p>`}</div><div data-library-history-list></div><article class="hl-contract-paper" dir="rtl"><header class="hl-contract-paper-head"><div class="hl-contract-brand"><img src="./assets/hydroland-mark-reference.webp" alt=""><div><b>HYDROLAND</b><span>هيدرولاند</span></div></div><h3>${esc(v.titleAr)}</h3></header><div class="hl-contract-paper-meta"><span>قالب موحد · الإصدار ${v.version}</span><b>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(states[v.state]))}</b></div><h4>البيانات المطلوبة ومصدرها</h4><dl>${content.fields.map(f=>uiLocale.html`<div><dt>${esc(f.label)}</dt><dd>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(sources[f.source]) || uiLocale.message('بيانات العقد')))}</dd></div>`).join('')}</dl><h4>بنود العقد</h4><ol>${content.clauses.map(t=>uiLocale.html`<li>${esc(t)}</li>`).join('')}</ol><h4>ضوابط الاستخدام</h4><p>${esc(content.usageNotes)}</p><footer>إعداد من: ${esc(content.source.name)} · ${esc(content.source.revision)}<br>تحفظ العقود المنفذة نص القالب ورقم إصداره وقت الإنشاء.</footer></article><section class="hl-library-reviews"><h3>المراجعات</h3>${content.category==='EMPLOYMENT'?uiLocale.html`<p>الموافقة الداخلية على الصياغة: ${uiLocale.messageHTML((v.internalApproval ? uiLocale.message("مسجلة · {0} · {1}", [v.internalApproval.reference, date(v.internalApproval.at)]) : uiLocale.message('بانتظار موافقة المالك')))}</p><p>الموافقة الداخلية لإعداد المسودات لا تغني عن المراجعة القانونية المستقلة ومراجعة الموارد البشرية، ولا تتيح استخدام القالب بمفردها. إعداد المسودات يتطلب اعتمادًا إداريًا من مسؤول الإدارتين أو اكتمال المراجعات المستقلة ونشر القالب.</p>`:''}<p>الشؤون القانونية: ${uiLocale.messageHTML((v.reviews.legal ? uiLocale.message("تمت المراجعة · {0} · {1}{2}", [v.reviews.legal.reference, date(v.reviews.legal.at), (v.reviews.legal.temporaryOwnerReview ? uiLocale.message(' · بصلاحية المالك المؤقتة') : '')]) : uiLocale.message('بانتظار المراجعة المستقلة')))}</p>${content.category==='EMPLOYMENT'?uiLocale.html`<p>الموارد البشرية: ${uiLocale.messageHTML((v.reviews.hr ? uiLocale.message("تمت المراجعة · {0} · {1}{2}", [v.reviews.hr.reference, date(v.reviews.hr.at), (v.reviews.hr.temporaryOwnerReview ? uiLocale.message(' · بصلاحية المالك المؤقتة') : '')]) : uiLocale.message('بانتظار مراجعة الموارد البشرية')))}</p>`:''}${v.ownerDepartmentApproval?uiLocale.html`<p>اعتماد إداري لإعداد المسودات: ${esc(v.ownerDepartmentApproval.reference)} · ${esc(date(v.ownerDepartmentApproval.at))}</p><p>سُجل القرار من حساب مسؤول الإدارتين نفسه. المراجعة القانونية المستقلة والتوقيع والتوثيق الرسمي متطلبات منفصلة.</p>${v.state==='APPROVED_FOR_DRAFTS'?uiLocale.html`<p>${uiLocale.messageHTML((v.draftUseAvailable ? uiLocale.message('التكليف الحالي ساري؛ القالب متاح لإعداد المسودات الداخلية.') : uiLocale.message('التكليف غير فعال لهذا القرار حاليًا؛ إعداد مسودات جديدة من هذا القالب متوقف.')))}</p>`:''}`:''}<p>اعتماد للاستخدام: ${esc(date(v.publishedAt))}</p></section>${c.edit?uiLocale.html`<details data-library-editor><summary>تعديل القالب أو إضافة قالب مستقل</summary><form data-library-edit><div class="hl-contract-grid"><label>اسم العقد بالعربية<input name="titleAr" maxlength="180" required value="${esc(v.titleAr)}"></label><label>اسم العقد بالإنجليزية<input name="titleEn" maxlength="180" required value="${esc(v.titleEn)}"></label></div><label>البنود — افصل بين كل بندين بسطر فارغ<textarea name="clauses" rows="16" maxlength="60000" required>${esc(content.clauses.join('\n\n'))}</textarea></label><label>ضوابط الاستخدام<textarea name="usageNotes" rows="4" maxlength="3000">${esc(content.usageNotes)}</textarea></label><label>سبب التعديل أو إضافة القالب<textarea name="reason" rows="2" minlength="5" maxlength="1200" required></textarea></label><p>يحفظ التعديل إصداراً جديداً يحتاج مراجعة، وتظل العقود السابقة مرتبطة بنسختها.</p><div class="hl-library-actions"><button type="submit" value="revise">حفظ إصدار جديد</button><button type="submit" value="copy">إضافة كقالب مستقل</button></div></form></details>`:''}${allowed.length?uiLocale.html`<form data-library-decision><h3>قرار القالب</h3>${c.internalApprove||c.approveForDrafts||c.legalReview||c.hrReview?uiLocale.html`<label>مرجع المراجعة أو الموافقة الداخلية<input name="reference" maxlength="240" placeholder="رقم المذكرة أو مرجع التحقق"></label>`:''}<label>سبب القرار أو الملاحظة<textarea name="reason" minlength="5" maxlength="1200" rows="3" required></textarea></label><label class="hl-library-check"><input type="checkbox" name="reviewed" required><span>راجعت بنود هذا الإصدار وضوابط استخدامه</span></label><div class="hl-library-actions">${allowed.map(([,action])=>uiLocale.html`<button type="submit" value="${action}">${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(actions[action]))}</button>`).join('')}</div></form>`:''}${c.history?uiLocale.html`<details><summary>قرارات هذا الإصدار</summary><div data-library-events>جارٍ تحميل القرارات…</div></details>`:''}`);
    if(c.history)void events(v.id,generation,session());controls();
  }
  async function events(id,g,s){try{const r=await request('/contracts/library/'+encodeURIComponent(id)+'/events');if(!current(g,s)||active?.id!==id)return;const el=panel.querySelector('[data-library-events]');if(el)uiLocale.setHTML(el, r.items.map(e=>uiLocale.html`<p>${uiLocale.messageHTML(((((((value=>value===undefined?value:uiLocale.message(value))(actions[e.action.replace('CONTRACT_TEMPLATE_','')]) || (e.action==='CONTRACT_TEMPLATE_REVISED' && uiLocale.message('حفظ إصدار جديد'))) || (e.action==='CONTRACT_TEMPLATE_INITIALIZED' && uiLocale.message('إضافة المسودة'))) || (e.action==='CONTRACT_TEMPLATE_COPIED' && uiLocale.message('إضافة قالب مستقل'))) || (e.action==='CONTRACT_TEMPLATE_REPLACED' && uiLocale.message('حل إصدار أحدث محل هذا الإصدار'))) || uiLocale.message('تحديث القالب')))} · ${esc(date(e.occurredAt))}<br>${esc(e.metadata?.reason)}</p>`).join('')||uiLocale.html`<p>لا توجد قرارات.</p>`);}catch(error){if(current(g,s)&&active?.id===id){const el=panel.querySelector('[data-library-events]');if(el)uiLocale.setMessage(el, localErrorMessage(error));}}}
  const query=()=>new URLSearchParams([...new FormData(panel.querySelector('[data-library-search]'))].filter(([,v])=>v)).toString();
  async function refresh(){
    if(busy)return;const responsibilityOpen=panel.querySelector('[data-library-responsibility]').open,g=++generation,s=session();active=null;workspace=null;responsibility();ownerNotice(null);dirty=false;items=[];list();panel.querySelector('[data-library-detail]').replaceChildren();panel.querySelector('[data-library-initialize]').hidden=true;controls();note(uiLocale.message('جارٍ تحميل مكتبة العقود…'));
    try{const [w,r]=await Promise.all([request('/contracts/library/workspace'),request('/contracts/library?'+query())]);if(!current(g,s))return;workspace=w;responsibility();panel.querySelector('[data-library-responsibility]').open=responsibilityOpen&&w.ownerDepartmentResponsibility?.canManage===true;ownerNotice();items=r.items;list();panel.querySelector('[data-library-initialize]').hidden=!w.canInitialize;controls();note(uiLocale.message('اختر قالباً. يحفظ كل تعديل بإصدار مستقل، ويستخدم العقد الجديد النسخة المعتمدة فقط.'));}catch(error){if(current(g,s))note(localErrorMessage(error));}
  }
  async function select(id){
    if(busy)return;const g=++generation,s=session();active=null;dirty=false;panel.querySelector('[data-library-detail]').replaceChildren();note(uiLocale.message('جارٍ تحميل القالب…'));
    try{const v=await request('/contracts/library/'+encodeURIComponent(id));if(!current(g,s))return;active=v;list();render();note((v.state==='APPROVED_FOR_DRAFTS' ? uiLocale.message('قالب معتمد إداريًا لإعداد المسودات الداخلية فقط.') : (v.state==='PUBLISHED' ? uiLocale.message('قالب معتمد للاستخدام.') : uiLocale.message('هذه النسخة مخصصة للإعداد أو المراجعة.'))));}catch(error){if(current(g,s))note(localErrorMessage(error));}
  }
  async function mutate(path,body,initial=false){
    if(busy)return;busy=true;controls();const g=generation,s=session();
    try{const v=await request(path,'POST',body);if(!current(g,s))return;
      if(initial){busy=false;controls();const next=generation+1;await refresh();if(current(next,s))note((v.created ? uiLocale.message("أضيفت {0} قوالب كمسودات للمراجعة.", [v.created]) : uiLocale.message('القوالب الأولية موجودة؛ لم تنشأ نسخ مكررة.')));return;}
      const r=await request('/contracts/library?'+query());if(!current(g,s))return;active=v;items=r.items;list();render();note(uiLocale.message('تم حفظ الإجراء وسجله. العقود السابقة تحتفظ بنسختها.'));
    }catch(error){if(current(g,s)){if(error.status===403){active=null;items=[];workspace=null;responsibility();ownerNotice(null);dirty=false;list();panel.querySelector('[data-library-detail]').replaceChildren();panel.querySelector('[data-library-initialize]').hidden=true;document.querySelector('[data-open-contract-library]')?.remove();}note(localErrorMessage(error));}}finally{if(current(g,s)){busy=false;controls();}}
  }
  const expected=()=>({expectedVersion:active.version,expectedContentHash:active.contentHash});
  panel.addEventListener('input',e=>{if(e.target.closest('[data-library-edit]')){dirty=true;controls();note(uiLocale.message('احفظ الإصدار الجديد قبل إجراء قرار على القالب.'));}});
  panel.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const form=e.target,data=new FormData(form);
    if(form.matches('[data-library-responsibility-form]')){await changeResponsibility(form,e.submitter?.value);return;}
    if(form.matches('[data-library-search]')){await refresh();return;}
    if(form.matches('[data-library-initialize]')){await mutate('/contracts/library/initialize',{reviewed:data.get('reviewed')==='on'},true);return;}
    if(!active)return;const path='/contracts/library/'+encodeURIComponent(active.id);
    if(form.matches('[data-library-edit]'))await mutate(path+'/'+(e.submitter?.value==='copy'?'copy':'revise'),{...expected(),titleAr:data.get('titleAr'),titleEn:data.get('titleEn'),clauses:String(data.get('clauses')).split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean),usageNotes:data.get('usageNotes'),reason:data.get('reason')});
    if(form.matches('[data-library-decision]')&&!dirty)await mutate(path+'/decision',{...expected(),action:e.submitter?.value,reason:data.get('reason'),reference:data.get('reference')||'',reviewed:data.get('reviewed')==='on'});
  });
  panel.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||busy)return;
    if(b.hasAttribute('data-library-refresh')){await refresh();return;}
    if(b.hasAttribute('data-library-open')){await select(b.dataset.libraryOpen);return;}
    if(b.hasAttribute('data-library-history')&&active){const id=active.id,g=generation,s=session();try{const r=await request('/contracts/library/'+encodeURIComponent(id)+'/history');if(!current(g,s)||active?.id!==id)return;uiLocale.setHTML(panel.querySelector('[data-library-history-list]'), uiLocale.html`<nav aria-label="إصدارات القالب" class="hl-library-history">${r.items.map(v=>uiLocale.html`<button type="button" data-library-open="${esc(v.id)}">الإصدار ${v.version} · ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(states[v.state]))}</button>`).join('')}</nav>`);}catch(error){if(current(g,s))note(localErrorMessage(error));}}
  });
  async function capability(){const g=++capabilityGeneration,s=session();if(!auth()?.isAuthenticated?.())return;try{const w=await request('/contracts/library/workspace');if(g!==capabilityGeneration||s!==session()||!auth()?.isAuthenticated?.())return;if(!w.internal)return;const host=document.querySelector('#profile-dialog .profile-list');if(!host||host.querySelector('[data-open-contract-library]'))return;const button=document.createElement('button');button.type='button';button.dataset.openContractLibrary='';uiLocale.setMessage(button, uiLocale.message('مكتبة عقود هيدرولاند'));host.appendChild(button);button.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();window.HydrolandContractLibrary.open();});}catch{if(g===capabilityGeneration&&s===session())document.querySelector('[data-open-contract-library]')?.remove();}}
  for(const event of ['hydroland:auth-changed','hydroland:portal-role-revoked','hydroland:role-changed','hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
  for(const event of ['hydroland:auth-changed','hydroland:profile-data-ready'])document.addEventListener(event,()=>{if(auth()?.isAuthenticated?.())void capability();});
  window.HydrolandContractLibrary={open:()=>{if(!auth()?.isAuthenticated?.())return;window.HydrolandWorkspaceUI?.show?.(panel);panel.hidden=false;void refresh();panel.scrollIntoView({block:'start'});},close:clear};
})();
