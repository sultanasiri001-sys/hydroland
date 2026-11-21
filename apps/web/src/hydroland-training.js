(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("training", {
  "اتفاقات الاستحقاق مع المراكز": "Compensation agreements with centers",
  "نسبة فقط": "Percentage only",
  "مبلغ ثابت فقط": "Fixed amount only",
  "مبلغ ثابت مع نسبة": "Fixed amount plus percentage",
  "راتب فقط (بدون استحقاق إضافي عن الدورة)": "Salary only (no additional course compensation)",
  "مركز التدريب والدورات": "Training and courses center",
  "سجلك التدريبي المباشر": "Your live training record",
  "دوراتي": "My courses",
  "دورات نشطة": "Active courses",
  "دورات مكتملة": "Completed courses",
  "متوسط التقدم": "Average progress",
  "مساري التدريبي": "My training pathway",
  "سجل الدخول لعرض بيانات التدريب.": "Sign in to view training details.",
  "بانتظار التفعيل": "Awaiting activation",
  "نشط": "Active",
  "موقوف": "Suspended",
  "مكتمل": "Completed",
  "ملغي": "Cancelled",
  "معايير المنظمة المرتبطة بالدورة": "Organization standards linked to the course",
  "· إصدار": "· Version",
  "الإصدار ثابت لهذه الدورة. يتحقق الخادم من نفاذ اعتماده وتأهيل المدرب عند بدء التدريب وإتمامه، ولا تتجاوز هذه المعايير المتطلبات السعودية.": "This version is fixed for the course. The server checks approval validity and instructor qualifications when training starts and finishes. These standards do not override Saudi requirements.",
  "لم يرتبط برنامج المنظمة بهذه الدورة. لا يبدأ التدريب قبل وجود إصدار معتمد وتأهيل مدرب مطابق. إذا بدأت أدلة التدريب بالفعل فتحتاج الدورة مسار مراجعة، ولا يعاد ربطها تلقائيًا.": "No organization program is linked to this course. Training cannot start without an approved version and matching instructor qualifications. If training evidence has already started, the course requires review and is not relinked automatically.",
  "اختيار المنظمة ومعايير الدورة": "Choose the organization and course standards",
  "المنظمة": "Organization",
  "اختر المنظمة": "Choose an organization",
  "البرنامج والمستوى والإصدار": "Program, level and version",
  "اختر المنظمة أولًا": "Choose an organization first",
  "بيئة التدريب": "Training environment",
  "اختر البرنامج أولًا": "Choose a program first",
  "أقصى عمق مخطط بالمتر": "Maximum planned depth in meters",
  "سبب اختيار الإصدار": "Reason for choosing this version",
  "راجعت البرنامج والإصدار وحدود الإشراف؛ لن يتغير الإصدار تلقائيًا بعد الربط.": "I reviewed the program, version and supervision limits. The version will not change automatically after linkage.",
  "ربط معايير المنظمة بالدورة": "Link organization standards to the course",
  "اختر البرنامج والمستوى والإصدار": "Choose program, level and version",
  "اختر بيئة التدريب": "Choose a training environment",
  "مسبح": "Pool",
  "مياه محصورة": "Confined water",
  "مياه مفتوحة": "Open water",
  "الحد الأدنى للعمر:": "Minimum age:",
  "· الجلسات:": "· Sessions:",
  "· غوصات المياه المفتوحة:": "· Open-water dives:",
  "· دقائق المياه المفتوحة:": "· Open-water minutes:",
  "المهارات المطلوبة:": "Required skills:",
  "النماذج المطلوبة:": "Required forms:",
  "تتحدد حدود الإشراف والعمق حسب عمر المتدرب وبيئة التدريب عند التحقق في الخادم. لا يضيف اختيار المنظمة تأهيلًا غير مثبت للمدرب.": "Supervision and depth limits are determined from the student's age and training environment during server validation. Selecting an organization does not add unproven instructor qualifications.",
  "، ": ", ",
  "لا توجد في هذا الإصدار": "None in this version",
  "جارٍ التحقق من الإصدار والتأهيل وحفظ الربط...": "Checking the version and qualifications and saving the link...",
  "تعذر ربط إصدار معايير المنظمة.": "Could not link the organization standards version.",
  "تعذر الحفظ.": "Could not save.",
  "خطة التدريب وإتمام الدورة": "Training plan and course completion",
  "التقدم من المهارات الموقعة، وإتمام الدورة بعد إغلاق الجلسات": "Progress comes from signed skills. Course completion follows closed sessions",
  "جارٍ تحميل خطة التدريب...": "Loading training plan...",
  "تعذر تحميل خطة التدريب.": "Could not load the training plan.",
  "تعذر التحقق من معايير المنظمة.": "Could not verify organization standards.",
  "نظري": "Theory",
  "عملي": "Practical",
  "إلكتروني": "Online",
  "مدمج": "Blended",
  "لم يبدأ": "Not started",
  "قيد التقييم": "Under assessment",
  "يحتاج مراجعة": "Review needed",
  "متقن": "Mastered",
  "العودة إلى الدورات": "Back to courses",
  "حالة الدورة:": "Course status:",
  "· تقدم المهارات:": "· Skills progress:",
  " · توقيع المدرب موثق": " · Instructor signature verified",
  "لا توجد مهارات في هذه المرحلة.": "No skills in this phase.",
  "لا توجد خطة مهارات لهذه الدورة. أضف المرحلة والمهارات قبل تقييمها.": "No skills plan exists for this course. Add the phase and skills before assessing them.",
  "إضافة مهارة إلى الخطة": "Add a skill to the plan",
  "المرحلة": "Phase",
  "مرحلة جديدة": "New phase",
  "اسم المرحلة": "Phase name",
  "طريقة التدريب": "Training method",
  "رمز المهارة": "Skill code",
  "اسم المهارة": "Skill name",
  "ملاحظة الخطة": "Plan note",
  "حفظ المهارة في الخطة": "Save skill in plan",
  "تقييم المهارات متاح من صفحة «التقييمات». تتغير نسبة التقدم بعد حفظ التقييم.": "Skills assessment is available from Assessments. Progress changes after the assessment is saved.",
  "ملاحظات الإتمام": "Completion notes",
  "راجعت المهارات الموثقة والجلسات المكتملة": "I reviewed documented skills and completed sessions",
  "إتمام السجل لا يصدر شهادة. تبقى توصية الشهادة ومراجعتها المستقلة خطوتين منفصلتين.": "Completing the record does not issue a certificate. Certificate recommendation and independent review remain separate steps.",
  "إتمام سجل الدورة": "Complete course record",
  "تحديث الخطة": "Refresh plan",
  "تعذر تحميل الخطة.": "Could not load the plan.",
  "جارٍ الحفظ...": "Saving...",
  "تعذر حفظ سجل الدورة.": "Could not save the course record.",
  "الإيرادات": "Earnings",
  "استحقاقاتك التدريبية فقط — لا تعرض حسابات العملاء أو المنصة": "Your training entitlements only — customer and platform accounts are not shown",
  "جارٍ تحميل الاستحقاقات...": "Loading entitlements...",
  "تعذر تحميل الاستحقاقات": "Could not load entitlements",
  "تعذر عرض المبلغ": "Could not display the amount",
  " وحدة صغرى (": " minor units (",
  "المجاميع بالريال السعودي. تظهر الاستحقاقات الأخرى بعملتها الأصلية.": "Totals are in Saudi riyals. Other entitlements are shown in their original currency.",
  "قيد الاعتماد": "Awaiting approval",
  "معتمد": "Approved",
  "تمت التسوية": "Settled",
  "لا توجد استحقاقات تدريبية مسجلة حتى الآن.": "No training entitlements recorded yet.",
  "الشهادات": "Certificates",
  "توصية المدرب ثم اعتماد مستقل قبل الإصدار": "Instructor recommendation followed by independent approval before issuance",
  "جارٍ تحميل حالة الشهادات...": "Loading certificate status...",
  "تعذر تحميل الشهادات": "Could not load certificates",
  "بانتظار مراجعة الإدارة": "Awaiting administrative review",
  "مرفوض": "Rejected",
  "ملغى": "Revoked",
  "طالب": "Student",
  "جاهز للتوصية": "Ready for recommendation",
  "غير مكتمل": "Incomplete",
  "توصية المدرب بالشهادة": "Instructor certificate recommendation",
  "التوصية وحدها لا تصدر شهادة. القرار لمراجع مستقل.": "The recommendation alone does not issue a certificate. An independent reviewer makes the decision.",
  "راجعت اكتمال سجل التدريب قبل التوصية": "I reviewed completion of the training record before recommending",
  "إرسال توصية الاعتماد": "Submit approval recommendation",
  "ملاحظات الإدارة:": "Administrative notes:",
  "رقم الشهادة الداخلية:": "Internal certificate number:",
  "لا توجد سجلات تدريب مرتبطة بك.": "No training records are linked to you.",
  "تعذر إرسال التوصية": "Could not submit recommendation",
  "تقييم المهارات": "Skills assessment",
  "مهارات الطلاب المعيّنين لك فقط": "Only skills for students assigned to you",
  "جارٍ تحميل المهارات...": "Loading skills...",
  "تعذر تحميل المهارات": "Could not load skills",
  "السجل مغلق أو موقوف؛ التقييم محفوظ للعرض فقط.": "The record is closed or suspended. The assessment is retained for viewing only.",
  "لا توجد مهارات بانتظار التقييم.": "No skills awaiting assessment.",
  "الجدول الزمني والحضور": "Schedule and attendance",
  "جلساتك المعيّنة لك · الأوقات بتوقيت الرياض": "Your assigned sessions · Times in Riyadh time",
  "جارٍ تحميل جدولك...": "Loading your schedule...",
  "صلاحية المدرب غير متاحة. حدّث حسابك.": "Instructor permission is unavailable. Refresh your account.",
  "تعذر تحميل الجدول": "Could not load schedule",
  "حضور المدرب:": "Instructor attendance:",
  "· حضور الطالب:": "· Student attendance:",
  "فتح الحضور": "Open attendance",
  "تسجيل حضور المدرب": "Record instructor attendance",
  "مسجل": "Recorded",
  "غير مسجل": "Not recorded",
  "لا توجد جلسات مكلّفة لك حاليًا.": "No sessions are currently assigned to you.",
  "تحديث الجدول": "Refresh schedule",
  "جارٍ تحميل الدورات والطلاب المكلفين لك...": "Loading courses and students assigned to you...",
  "تعذر تحميل دورات المدرب": "Could not load instructor courses",
  "إدارة الدورات والطلاب": "Manage courses and students",
  "التكليفات المرتبطة بحسابك المهني فقط": "Only assignments linked to your professional account",
  "الجلسة القادمة: ": "Next session: ",
  "لا توجد جلسة قادمة": "No upcoming session",
  "لا توجد دورات أو طلاب مكلفون لك حاليًا.": "No courses or students are currently assigned to you.",
  "جارٍ تحميل السجل التدريبي...": "Loading training record...",
  "تعذر تحميل بيانات التدريب": "Could not load training details",
  "تم تعيين المدرب": "Instructor assigned",
  "بانتظار تعيين المدرب": "Awaiting instructor assignment",
  "لا توجد دورات مسجلة على حسابك حتى الآن.": "No courses are registered to your account yet.",
  "تعذر حفظ التقييم": "Could not save assessment",
  "تعذر تحديث الحضور": "Could not update attendance",
  "،": ",",
  "· توقيع المدرب موثق": "· Instructor signature verified",
  "وحدة صغرى (": "minor units (",
  "الجلسة القادمة:": "Next session:"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  // Respect live motion preference without changing shortcut authorization or routing.
  const shortcutScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  const auth=window.HydrolandAuth;
  const host=document.querySelector('.training')||document.querySelector('#training')||document.querySelector('.courses');
  if(!host||document.querySelector('.hl-training'))return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const section=document.createElement('section');section.className='hl-training';
  uiLocale.setHTML(section, uiLocale.html`<header class="hl-training-head"><div><small>HYDROLAND LEARNING</small><h3>مركز التدريب والدورات</h3></div><span>سجلك التدريبي المباشر</span></header><div class="hl-training-grid"><article class="hl-training-card"><small>دوراتي</small><b data-training-count>—</b></article><article class="hl-training-card"><small>دورات نشطة</small><b data-training-active>—</b></article><article class="hl-training-card"><small>دورات مكتملة</small><b data-training-completed>—</b></article><article class="hl-training-card"><small>متوسط التقدم</small><b data-training-progress>—</b></article></div><div class="hl-training-main"><section class="hl-training-panel"><h4>مساري التدريبي</h4><div class="hl-course-list" data-training-list><p>سجل الدخول لعرض بيانات التدريب.</p></div></section></div>`);
  host.insertAdjacentElement('afterend',section);

  const label=status=>({PENDING:'بانتظار التفعيل',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي'}[status]||status||'—');
  let planVersion=0,planEnrollment=null,certificateVersion=0;
  const certificateCurrent=(version,session)=>version===certificateVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-certificates'&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor';
  const certificateAuthorized=async(version,session)=>{const authorize=window.HydrolandPortalAccess?.authorizeRole;return typeof authorize==='function'&&await authorize('instructor',{sessionVersion:session,isCurrent:()=>certificateCurrent(version,session)})&&certificateCurrent(version,session)};
  const planCurrent=(version,session)=>version===planVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-plan'&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor';
  const planAuthorized=async(version,session)=>{const authorize=window.HydrolandPortalAccess?.authorizeRole;return typeof authorize==='function'&&await authorize('instructor',{sessionVersion:session,isCurrent:()=>planCurrent(version,session)})&&planCurrent(version,session)};
  const standardsByForm=new WeakMap();
  function standardEditor(list,data){
    const binding=data.binding;
    if(binding){uiLocale.insertHTML(list, 'beforeend', uiLocale.html`<article class="hl-course"><h4>معايير المنظمة المرتبطة بالدورة</h4><p>${esc(binding.agencyCode)} · ${esc(binding.programCode)} · ${esc(binding.level)} · إصدار ${esc(binding.edition)}</p><p>الإصدار ثابت لهذه الدورة. يتحقق الخادم من نفاذ اعتماده وتأهيل المدرب عند بدء التدريب وإتمامه، ولا تتجاوز هذه المعايير المتطلبات السعودية.</p></article>`);return;}
    const profiles=Array.isArray(data.profiles)?data.profiles:[];
    if(!data.canSelect||!profiles.length){uiLocale.insertHTML(list, 'beforeend', uiLocale.html`<p role="status">لم يرتبط برنامج المنظمة بهذه الدورة. لا يبدأ التدريب قبل وجود إصدار معتمد وتأهيل مدرب مطابق. إذا بدأت أدلة التدريب بالفعل فتحتاج الدورة مسار مراجعة، ولا يعاد ربطها تلقائيًا.</p>`);return;}
    const agencies=[...new Set(profiles.map(row=>row.profile.agencyCode))];
    uiLocale.insertHTML(list, 'beforeend', uiLocale.html`<form data-standard-select data-revision="${esc(data.updatedAt)}"><fieldset><h4>اختيار المنظمة ومعايير الدورة</h4><label>المنظمة<select name="agencyCode" required><option value="">اختر المنظمة</option>${agencies.map(code=>uiLocale.html`<option value="${esc(code)}">${esc(code)}</option>`).join('')}</select></label><label>البرنامج والمستوى والإصدار<select name="profileId" required disabled><option value="">اختر المنظمة أولًا</option></select></label><label>بيئة التدريب<select name="environment" required disabled><option value="">اختر البرنامج أولًا</option></select></label><label>أقصى عمق مخطط بالمتر<input name="plannedMaximumDepthMetres" type="number" min="0" max="200" step="0.1" required></label><div data-standard-requirements aria-live="polite"></div><label>سبب اختيار الإصدار<textarea name="reason" minlength="5" maxlength="1000" required></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت البرنامج والإصدار وحدود الإشراف؛ لن يتغير الإصدار تلقائيًا بعد الربط.</label><button type="submit">ربط معايير المنظمة بالدورة</button></fieldset><p data-plan-message role="status"></p></form>`);
    standardsByForm.set(list.querySelector('[data-standard-select]'),profiles);
  }
  section.addEventListener('change',event=>{
    const form=event.target.closest?.('[data-standard-select]');if(!form)return;
    const profiles=standardsByForm.get(form)||[],program=form.elements.profileId,environment=form.elements.environment,details=form.querySelector('[data-standard-requirements]');
    if(event.target.name==='agencyCode'){
      const rows=profiles.filter(row=>row.profile.agencyCode===form.elements.agencyCode.value);
      uiLocale.setHTML(program, uiLocale.html`<option value="">اختر البرنامج والمستوى والإصدار</option>${rows.map(row=>uiLocale.html`<option value="${esc(row.id)}">${esc(row.profile.programCode)} · ${esc(row.profile.level)} · ${esc(row.profile.edition)}</option>`).join('')}`);program.disabled=!rows.length;
      uiLocale.setHTML(environment, uiLocale.html`<option value="">اختر البرنامج أولًا</option>`);environment.disabled=true;details.textContent='';form.elements.plannedMaximumDepthMetres.value='';
    }else if(event.target.name==='profileId'){
      const selected=profiles.find(row=>row.id===program.value&&row.profile.agencyCode===form.elements.agencyCode.value),requirements=selected?.profile?.requirements;
      uiLocale.setHTML(environment, uiLocale.html`<option value="">اختر بيئة التدريب</option>${requirements?[...new Set(requirements.supervision.map(row=>row.environment))].map(code=>uiLocale.html`<option value="${esc(code)}">${uiLocale.label({POOL:'مسبح',CONFINED_WATER:'مياه محصورة',OPEN_WATER:'مياه مفتوحة'}[code]||code)}</option>`).join(''):''}`);environment.disabled=!requirements;form.elements.plannedMaximumDepthMetres.value='';
      uiLocale.setHTML(details, requirements?uiLocale.html`<p>الحد الأدنى للعمر: ${esc(requirements.minimumAge)} · الجلسات: ${esc(requirements.minimumCompletedSessions)} · غوصات المياه المفتوحة: ${esc(requirements.minimumOpenWaterDives)} · دقائق المياه المفتوحة: ${esc(requirements.minimumOpenWaterMinutes)}</p><p>المهارات المطلوبة: ${requirements.requiredSkillCodes.map(esc).join('، ')}<br>النماذج المطلوبة: ${requirements.requiredFormCodes.map(esc).join('، ')||uiLocale.t('لا توجد في هذا الإصدار')}</p><p>تتحدد حدود الإشراف والعمق حسب عمر المتدرب وبيئة التدريب عند التحقق في الخادم. لا يضيف اختيار المنظمة تأهيلًا غير مثبت للمدرب.</p>`:'');
    }
  });
  section.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-standard-select]'))return;event.preventDefault();if(form.dataset.busy||!planEnrollment||!form.elements.reviewed.checked)return;
    const enrollmentId=planEnrollment,version=planVersion,session=auth?.getSessionVersion?.(),values=new FormData(form),message=form.querySelector('[data-plan-message]'),live=()=>planCurrent(version,session)&&form.isConnected;
    const payload={profileId:values.get('profileId'),environment:values.get('environment'),plannedMaximumDepthMetres:Number(values.get('plannedMaximumDepthMetres')),expectedUpdatedAt:form.dataset.revision,reason:values.get('reason')};
    form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setText(message, ...['جارٍ التحقق من الإصدار والتأهيل وحفظ الربط...']);
    try{if(!await planAuthorized(version,session)||!live())return;const response=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+'/standard',{method:'POST',body:JSON.stringify(payload)}),data=await response.json().catch(()=>null);if(!live())return;if(!response.ok||data?.enrollmentId!==enrollmentId)throw localError(data?.message||uiLocale.message('تعذر ربط إصدار معايير المنظمة.'));await openPlan(enrollmentId);}
    catch(error){if(live())uiLocale.setMessage(message, localErrorMessage(error)||uiLocale.message('تعذر الحفظ.'));}
    finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false;}
  });
  async function openPlan(enrollmentId){
    scheduleVersion++;certificateVersion++;planEnrollment=enrollmentId;const version=++planVersion,session=auth?.getSessionVersion?.(),list=section.querySelector('[data-training-list]');
    section.dataset.trainingMode='professional-plan';section.querySelector('.hl-training-grid').hidden=true;uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['خطة التدريب وإتمام الدورة']);uiLocale.setText(section.querySelector('.hl-training-head span'), ...['التقدم من المهارات الموقعة، وإتمام الدورة بعد إغلاق الجلسات']);
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل خطة التدريب...</p>`);
    try{
      if(!(await planAuthorized(version,session)))return;
      const response=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+'/plan'),data=await response.json().catch(()=>null);
      if(!planCurrent(version,session))return;if(!response.ok||data?.enrollmentId!==enrollmentId||!Array.isArray(data.stages)||!Array.isArray(data.completionReasons))throw localError(data?.message||uiLocale.message('تعذر تحميل خطة التدريب.'));
      const standardResponse=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+'/standard-options'),standardData=await standardResponse.json().catch(()=>null);
      if(!planCurrent(version,session))return;if(!standardResponse.ok||standardData?.enrollmentId!==enrollmentId)throw localError(standardData?.message||uiLocale.message('تعذر التحقق من معايير المنظمة.'));
      const revision=data.record?.updatedAt||data.updatedAt,stageTypes={THEORY:'نظري',PRACTICAL:'عملي',ONLINE:'إلكتروني',BLENDED:'مدمج'},skillStatuses={NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التقييم',NEEDS_REVIEW:'يحتاج مراجعة',COMPETENT:'متقن'};
      uiLocale.setHTML(list, uiLocale.html`<button type="button" data-plan-back>العودة إلى الدورات</button><article class="hl-course" data-training-plan-view><h4>${esc(data.courseCode)}</h4><p>حالة الدورة: ${uiLocale.label(label(data.enrollmentStatus))} · تقدم المهارات: ${Number(data.record?.progressPercent||0)}%</p>${data.stages.length?data.stages.map(stage=>uiLocale.html`<section class="hl-course"><h4>${esc(stage.stageType)}</h4><p>${uiLocale.label(stageTypes[stage.deliveryMode]||stage.deliveryMode)}</p>${stage.skills.map(skill=>uiLocale.html`<p>${esc(skill.name)} · ${uiLocale.label(skillStatuses[skill.status]||skill.status)}${skill.signedOffAt?uiLocale.t(' · توقيع المدرب موثق'):''}</p>`).join('')||uiLocale.html`<p>لا توجد مهارات في هذه المرحلة.</p>`}</section>`).join(''):uiLocale.html`<p>لا توجد خطة مهارات لهذه الدورة. أضف المرحلة والمهارات قبل تقييمها.</p>`}${data.completionReasons.length?uiLocale.html`<ul>${data.completionReasons.map(reason=>uiLocale.html`<li>${esc(reason)}</li>`).join('')}</ul>`:''}</article>`);
      if(data.canEdit)uiLocale.insertHTML(list, 'beforeend', uiLocale.html`<details><summary>إضافة مهارة إلى الخطة</summary><form data-plan-skill data-revision="${esc(revision)}"><fieldset><label>المرحلة<select name="stageId"><option value="">مرحلة جديدة</option>${data.stages.map(stage=>uiLocale.html`<option value="${esc(stage.id)}">${esc(stage.stageType)}</option>`).join('')}</select></label><fieldset data-plan-new-stage><label>اسم المرحلة<input name="stageType" maxlength="80" required></label><label>طريقة التدريب<select name="deliveryMode">${Object.entries(stageTypes).map(([value,text])=>uiLocale.html`<option value="${value}">${text}</option>`).join('')}</select></label></fieldset><label>رمز المهارة<input name="skillCode" maxlength="80" required></label><label>اسم المهارة<input name="name" maxlength="200" required></label><label>ملاحظة الخطة<textarea name="reason" maxlength="1000" required></textarea></label><button type="submit">حفظ المهارة في الخطة</button></fieldset><p data-plan-message role="status"></p></form></details><p>تقييم المهارات متاح من صفحة «التقييمات». تتغير نسبة التقدم بعد حفظ التقييم.</p>`);
      if(data.canComplete)uiLocale.insertHTML(list, 'beforeend', uiLocale.html`<form data-plan-complete data-revision="${esc(revision)}"><fieldset><label>ملاحظات الإتمام<textarea name="reason" maxlength="1000" required></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت المهارات الموثقة والجلسات المكتملة</label><p>إتمام السجل لا يصدر شهادة. تبقى توصية الشهادة ومراجعتها المستقلة خطوتين منفصلتين.</p><button type="submit">إتمام سجل الدورة</button></fieldset><p data-plan-message role="status"></p></form>`);
      standardEditor(list,standardData);
    }catch(error){if(planCurrent(version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الخطة.'))}</p><button type="button" data-plan-refresh>تحديث الخطة</button><button type="button" data-plan-back>العودة إلى الدورات</button>`);}
  }
  section.addEventListener('change',event=>{const select=event.target.closest?.('[data-plan-skill] [name="stageId"]');if(!select)return;const fields=select.form.querySelector('[data-plan-new-stage]');fields.hidden=Boolean(select.value);fields.disabled=Boolean(select.value)});
  section.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-plan-skill],[data-plan-complete]'))return;event.preventDefault();if(form.dataset.busy||!planEnrollment)return;
    const enrollmentId=planEnrollment,version=planVersion,session=auth?.getSessionVersion?.(),fields=new FormData(form),complete=form.matches('[data-plan-complete]'),payload={expectedUpdatedAt:form.dataset.revision,reason:fields.get('reason')},message=form.querySelector('[data-plan-message]'),live=()=>planCurrent(version,session)&&form.isConnected;
    if(complete)payload.reviewed=fields.get('reviewed')==='on';else{form.dataset.requestId ||= crypto.randomUUID();Object.assign(payload,{requestId:form.dataset.requestId,name:fields.get('name'),skillCode:fields.get('skillCode')},fields.get('stageId')?{stageId:fields.get('stageId')}:{stageType:fields.get('stageType'),deliveryMode:fields.get('deliveryMode')})}
    form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setText(message, ...['جارٍ الحفظ...']);
    try{
      if(!(await planAuthorized(version,session))||!live())return;
      const response=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+(complete?'/complete':'/plan'),{method:'POST',body:JSON.stringify(payload)}),data=await response.json().catch(()=>null);
      if(!live())return;if(!response.ok||data?.enrollmentId!==enrollmentId)throw localError(data?.message||uiLocale.message('تعذر حفظ سجل الدورة.'));
      await openPlan(enrollmentId);
    }catch(error){if(live()){uiLocale.setMessage(message, error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر الحفظ.'));if(!form.querySelector('[data-plan-refresh]'))uiLocale.insertHTML(message, 'afterend', uiLocale.html`<button type="button" data-plan-refresh>تحديث الخطة</button>`)}}
    finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
  });
  let requestedMode='student',scheduleVersion=0;
  const scheduleCurrent=(version,session)=>version===scheduleVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-schedule';
  const scheduleAuthorized=async(version,session)=>{const fn=window.HydrolandPortalAccess?.authorizeRole;return typeof fn==='function'&&await fn('instructor',{sessionVersion:session,isCurrent:()=>scheduleCurrent(version,session)})&&scheduleCurrent(version,session)};
  const scheduleDate=value=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));
  async function loadProfessionalEarnings(){
    const list=section.querySelector('[data-training-list]'),session=auth.getSessionVersion?.();section.dataset.trainingMode='professional-earnings';
    const current=()=>list.isConnected && section?.dataset.trainingMode==='professional-earnings' && session===auth.getSessionVersion?.();
    uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['الإيرادات']);uiLocale.setText(section.querySelector('.hl-training-head span'), ...['استحقاقاتك التدريبية فقط — لا تعرض حسابات العملاء أو المنصة']);
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل الاستحقاقات...</p>`);
    try{const response=await auth.authorizedFetch('/training/professional/me/earnings'),data=await response.json().catch(()=>null);if(!current())return;if(!response.ok)throw localError(data?.message||uiLocale.message('تعذر تحميل الاستحقاقات'));
      const entries=Array.isArray(data?.entries)?data.entries:[];
      const hasOtherCurrencies=entries.some(item=>item.currency!=='SAR');
      const knownCurrencies=new Set(Intl.supportedValuesOf?.('currency')||['SAR']);
      const money=(minor,currency)=>{
        if(!Number.isSafeInteger(minor)||typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))return uiLocale.t('تعذر عرض المبلغ');
        if(!knownCurrencies.has(currency))return minor.toLocaleString('ar-SA')+uiLocale.t(' وحدة صغرى (')+currency+')';
        const format=new Intl.NumberFormat('ar-SA',{style:'currency',currency,currencyDisplay:currency==='SAR'?'symbol':'code'});
        const digits=format.resolvedOptions().maximumFractionDigits;
        return format.format(minor/(10**digits));
      };
      let totals=data?.totals;
      if(hasOtherCurrencies&&data?.totalsScope!=='SAR_ONLY'){
        // An older server may have combined all currencies in the headline.
        totals={pendingMinor:0,approvedMinor:0,settledMinor:0};
        const fields={PENDING:'pendingMinor',APPROVED:'approvedMinor',SETTLED:'settledMinor'};
        for(const item of entries){
          const field=fields[item.status];
          if(item.currency==='SAR'&&Object.hasOwn(fields,item.status)&&Number.isSafeInteger(item.amountMinor))totals[field]+=item.amountMinor;
        }
      }
      const summary=(hasOtherCurrencies?uiLocale.html`<p>المجاميع بالريال السعودي. تظهر الاستحقاقات الأخرى بعملتها الأصلية.</p>`:'')+
        uiLocale.html`<div class="hl-role-tiles"><article><small>قيد الاعتماد</small><b>${money(totals?.pendingMinor,'SAR')}</b></article><article><small>معتمد</small><b>${money(totals?.approvedMinor,'SAR')}</b></article><article><small>تمت التسوية</small><b>${money(totals?.settledMinor,'SAR')}</b></article></div>`;
      const modes={PERCENTAGE:'نسبة فقط',FIXED:'مبلغ ثابت فقط',FIXED_PLUS_PERCENTAGE:'مبلغ ثابت مع نسبة',SALARY_ONLY:'راتب فقط (بدون استحقاق إضافي عن الدورة)'};
      const agreements=(Array.isArray(data?.agreements)?data.agreements:[]).filter(a=>Object.hasOwn(modes,a.mode));
      const contracts=agreements.length?uiLocale.html`<h4>اتفاقات الاستحقاق مع المراكز</h4>`+agreements.map(a=>{
        const parts=[];if(a.fixedMinor)parts.push(money(a.fixedMinor,'SAR'));
        if(a.rateBps)parts.push(new Intl.NumberFormat(document.documentElement.lang||'ar-SA',{style:'percent',maximumFractionDigits:2}).format(a.rateBps/10000));
        return uiLocale.html`<article class="hl-course"><b>${esc(a.centerName)}</b><p>${uiLocale.messageHTML(uiLocale.message(modes[a.mode]))} ${esc(parts.join(' + '))}</p></article>`;
      }).join(''):'';
      uiLocale.setHTML(list, contracts+summary+(entries.length?entries.map(item=>uiLocale.html`<article class="hl-course"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${new Date(item.createdAt).toLocaleDateString('ar-SA')}</small></div><span>${money(item.amountMinor,item.currency)} · ${esc(item.status)}</span></div></article>`).join(''):uiLocale.html`<p>لا توجد استحقاقات تدريبية مسجلة حتى الآن.</p>`));
    }catch(error){if(!current())return;uiLocale.setHTML(list, uiLocale.html`<p>${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الاستحقاقات'))}</p>`);}
  }
  async function loadProfessionalCertificates(){
    const list=section.querySelector('[data-training-list]'),version=++certificateVersion,session=auth?.getSessionVersion?.();section.dataset.trainingMode='professional-certificates';
    uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['الشهادات']);uiLocale.setText(section.querySelector('.hl-training-head span'), ...['توصية المدرب ثم اعتماد مستقل قبل الإصدار']);
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل حالة الشهادات...</p>`);
    try{
      if(!await certificateAuthorized(version,session))return;
      const response=await auth.authorizedFetch('/training/professional/me/certificates'),rows=await response.json().catch(()=>null);if(!certificateCurrent(version,session))return;if(!response.ok||!Array.isArray(rows))throw localError(rows?.message||uiLocale.message('تعذر تحميل الشهادات'));
      const states={RECOMMENDED:'بانتظار مراجعة الإدارة',APPROVED:'معتمد',REJECTED:'مرفوض',REVOKED:'ملغى'};
      uiLocale.setHTML(list, rows.length?rows.map(item=>uiLocale.html`<article class="hl-course" data-certificate-record="${esc(item.trainingRecordId)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||uiLocale.t('طالب'))}</small></div><span>${uiLocale.label(item.certificate?(states[item.certificate.status]||item.certificate.status):(item.readyForRecommendation?'جاهز للتوصية':'غير مكتمل'))}</span></div>${item.readyForRecommendation&&!item.certificate?uiLocale.html`<details><summary>توصية المدرب بالشهادة</summary><form data-certificate-recommend-form><fieldset><p>التوصية وحدها لا تصدر شهادة. القرار لمراجع مستقل.</p><label><input type="checkbox" name="reviewed" required>راجعت اكتمال سجل التدريب قبل التوصية</label><button type="submit" data-certificate-recommend>إرسال توصية الاعتماد</button></fieldset><p data-certificate-feedback role="status"></p></form></details>`:''}${item.certificate?.reviewReason?uiLocale.html`<p>ملاحظات الإدارة: ${esc(item.certificate.reviewReason)}</p>`:''}${item.certificate?.certificateNumber?uiLocale.html`<small>رقم الشهادة الداخلية: ${esc(item.certificate.certificateNumber)}</small>`:''}</article>`).join(''):uiLocale.html`<p>لا توجد سجلات تدريب مرتبطة بك.</p>`);
    }catch(error){if(certificateCurrent(version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الشهادات'))}</p>`);}
  }
  section.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-certificate-recommend-form]'))return;event.preventDefault();if(form.dataset.busy||!form.elements.reviewed.checked)return;
    const version=certificateVersion,session=auth?.getSessionVersion?.(),id=form.closest('[data-certificate-record]').dataset.certificateRecord,live=()=>certificateCurrent(version,session)&&form.isConnected;
    form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
    try{
      if(!await certificateAuthorized(version,session)||!live())return;
      const response=await auth.authorizedFetch('/training/professional/me/records/'+encodeURIComponent(id)+'/certificate-recommendation',{method:'POST'}),data=await response.json().catch(()=>null);
      if(!live())return;if(!response.ok||data?.trainingRecordId!==id)throw localError(data?.message||uiLocale.message('تعذر إرسال التوصية'));await loadProfessionalCertificates();
    }catch(error){if(live())uiLocale.setMessage(form.querySelector('[data-certificate-feedback]'), localErrorMessage(error)||uiLocale.message('تعذر إرسال التوصية'));}
    finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
  });
  async function loadProfessionalSkills(){
    const list=section.querySelector('[data-training-list]');section.dataset.trainingMode='professional-skills';
    uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['تقييم المهارات']);uiLocale.setText(section.querySelector('.hl-training-head span'), ...['مهارات الطلاب المعيّنين لك فقط']);
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل المهارات...</p>`);
    try{
      const response=await auth.authorizedFetch('/training/professional/me/skills'),rows=await response.json().catch(()=>[]);
      if(!response.ok)throw localError(rows?.message||uiLocale.message('تعذر تحميل المهارات'));
      uiLocale.setHTML(list, (Array.isArray(rows)&&rows.length)?rows.map(item=>uiLocale.html`<article class="hl-course" data-professional-skill="${esc(item.id)}"><div class="hl-course-top"><div><b>${esc(item.name)}</b><small>${esc(item.courseCode)} · ${esc(item.student?.displayName||uiLocale.t('طالب'))} · ${esc(item.stageType)}</small></div><span>${esc(item.status)}</span></div>${item.canAssess===false?uiLocale.html`<p>السجل مغلق أو موقوف؛ التقييم محفوظ للعرض فقط.</p>`:uiLocale.html`<div class="hl-member-actions"><button type="button" data-skill-status="IN_PROGRESS">قيد التقييم</button><button type="button" data-skill-status="NEEDS_REVIEW">يحتاج مراجعة</button><button type="button" data-skill-status="COMPETENT">متقن</button></div>`}</article>`).join(''):uiLocale.html`<p>لا توجد مهارات بانتظار التقييم.</p>`);
    }catch(error){uiLocale.setHTML(list, uiLocale.html`<p>${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل المهارات'))}</p>`);}
  }
  async function loadProfessionalSchedule(){
    const list=section.querySelector('[data-training-list]'),version=++scheduleVersion,session=auth?.getSessionVersion?.();
    section.dataset.trainingMode='professional-schedule';
    uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['الجدول الزمني والحضور']);
    uiLocale.setText(section.querySelector('.hl-training-head span'), ...['جلساتك المعيّنة لك · الأوقات بتوقيت الرياض']);
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل جدولك...</p>`);
    try{
      if(!(await scheduleAuthorized(version,session))){if(scheduleCurrent(version,session))uiLocale.setHTML(list, uiLocale.html`<p>صلاحية المدرب غير متاحة. حدّث حسابك.</p>`);return}
      const response=await auth.authorizedFetch('/training/professional/me/schedule'),rows=await response.json().catch(()=>null);
      if(!scheduleCurrent(version,session))return;
      if(!response.ok||!Array.isArray(rows))throw localError(rows?.message||uiLocale.message('تعذر تحميل الجدول'));
      uiLocale.setHTML(list, rows.length?rows.map(item=>uiLocale.html`<article class="hl-course" data-professional-session="${esc(item.id)}" data-revision="${esc(item.updatedAt)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||uiLocale.t('طالب'))} · ${esc(scheduleDate(item.startsAt))}</small></div><span>${uiLocale.label(label(item.status))}</span></div><div class="hl-member-actions">${item.updatedAt&&item.actions?.includes('OPEN')?uiLocale.html`<button type="button" data-attendance-action="OPEN">فتح الحضور</button>`:''}${item.updatedAt&&item.actions?.includes('INSTRUCTOR_CHECK_IN')?uiLocale.html`<button type="button" data-attendance-action="INSTRUCTOR_CHECK_IN">تسجيل حضور المدرب</button>`:''}</div><small>حضور المدرب: ${uiLocale.label(item.attendance?.instructorCheckedIn?'مسجل':'غير مسجل')} · حضور الطالب: ${uiLocale.label(item.attendance?.studentCheckedIn?'مسجل':'غير مسجل')}</small></article>`).join(''):uiLocale.html`<p>لا توجد جلسات مكلّفة لك حاليًا.</p>`);
    }catch(error){if(scheduleCurrent(version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الجدول'))}</p><button type="button" data-training-schedule-refresh>تحديث الجدول</button>`);}
  }
  async function loadProfessional(){
    const list=section.querySelector('[data-training-list]');
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل الدورات والطلاب المكلفين لك...</p>`);
    try{
      const response=await auth.authorizedFetch('/training/professional/me/assignments');
      const rows=await response.json().catch(()=>[]);
      if(!response.ok)throw localError(rows?.message||uiLocale.message('تعذر تحميل دورات المدرب'));
      const enrollments=Array.isArray(rows)?rows:[];
      const active=enrollments.filter(x=>x.status==='ACTIVE').length;
      const completed=enrollments.filter(x=>x.status==='COMPLETED').length;
      const students=new Set(enrollments.map(x=>x.student?.displayName).filter(Boolean));
      const progresses=enrollments.map(x=>Number(x.record?.progressPercent||0));
      uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['إدارة الدورات والطلاب']);
      uiLocale.setText(section.querySelector('.hl-training-head span'), ...['التكليفات المرتبطة بحسابك المهني فقط']);
      section.querySelector('[data-training-count]').textContent=String(enrollments.length);
      section.querySelector('[data-training-active]').textContent=String(active);
      section.querySelector('[data-training-completed]').textContent=String(completed);
      section.querySelector('[data-training-progress]').textContent=(progresses.length?Math.round(progresses.reduce((a,b)=>a+b,0)/progresses.length):0)+'%';
      uiLocale.setHTML(list, enrollments.length?enrollments.map(item=>{
        const progress=Math.max(0,Math.min(100,Number(item.record?.progressPercent||0)));
        const sessions=Array.isArray(item.record?.sessions)?item.record.sessions:[];
        const next=sessions.find(x=>['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS'].includes(x.status));
        return uiLocale.html`<article class="hl-course" data-professional-enrollment="${esc(item.enrollmentId)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||uiLocale.t('طالب'))} · ${uiLocale.label(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${next?uiLocale.t('الجلسة القادمة: ')+new Date(next.startsAt).toLocaleString('ar-SA'):uiLocale.t('لا توجد جلسة قادمة')}</small><button type="button" data-training-plan="${esc(item.enrollmentId)}">خطة التدريب وإتمام الدورة</button></article>`;
      }).join(''):uiLocale.html`<p>لا توجد دورات أو طلاب مكلفون لك حاليًا.</p>`);
      section.dataset.trainingMode='professional';section.dataset.professionalStudents=String(students.size);
    }catch(error){uiLocale.setHTML(list, uiLocale.html`<p>${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل دورات المدرب'))}</p>`);}
  }

  async function load(mode){
    scheduleVersion++;planVersion++;certificateVersion++;planEnrollment=null;section.querySelector('.hl-training-grid').hidden=false;
    if(mode)requestedMode=mode;
    const instructorPortal=document.querySelector('.hl-role-dashboard[data-role="instructor"]');
    if(!mode&&instructorPortal&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor')requestedMode='instructor';
    mode=requestedMode;
    const list=section.querySelector('[data-training-list]');
    if(!auth?.isAuthenticated()){uiLocale.setHTML(list, uiLocale.html`<p>سجل الدخول لعرض بيانات التدريب.</p>`);return;}
    if(mode==='instructor'){section.dataset.trainingMode='professional';return loadProfessional();}
    if(mode==='instructor-schedule')return loadProfessionalSchedule();
    if(mode==='instructor-skills')return loadProfessionalSkills();
    if(mode==='instructor-certificates')return loadProfessionalCertificates();
    if(mode==='instructor-earnings')return loadProfessionalEarnings();
    uiLocale.setText(section.querySelector('.hl-training-head h3'), ...['مركز التدريب والدورات']);
    uiLocale.setText(section.querySelector('.hl-training-head span'), ...['سجلك التدريبي المباشر']);
    section.dataset.trainingMode='student';
    uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل السجل التدريبي...</p>`);
    try{
      const response=await auth.authorizedFetch('/training/mine/enrollments');
      const rows=await response.json().catch(()=>[]);
      if(!response.ok)throw localError(rows?.message||uiLocale.message('تعذر تحميل بيانات التدريب'));
      const enrollments=Array.isArray(rows)?rows:[];
      const active=enrollments.filter(x=>x.status==='ACTIVE').length;
      const completed=enrollments.filter(x=>x.status==='COMPLETED').length;
      const progresses=enrollments.map(x=>Number(x.record?.progressPercent||0));
      const average=progresses.length?Math.round(progresses.reduce((a,b)=>a+b,0)/progresses.length):0;
      section.querySelector('[data-training-count]').textContent=String(enrollments.length);
      section.querySelector('[data-training-active]').textContent=String(active);
      section.querySelector('[data-training-completed]').textContent=String(completed);
      section.querySelector('[data-training-progress]').textContent=average+'%';
      uiLocale.setHTML(list, enrollments.length?enrollments.map(item=>{const progress=Math.max(0,Math.min(100,Number(item.record?.progressPercent||0)));return uiLocale.html`<article class="hl-course"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${uiLocale.label(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${uiLocale.label(item.instructorAccountId?'تم تعيين المدرب':'بانتظار تعيين المدرب')}</small></article>`;}).join(''):uiLocale.html`<p>لا توجد دورات مسجلة على حسابك حتى الآن.</p>`);
    }catch(error){uiLocale.setHTML(list, uiLocale.html`<p>${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل بيانات التدريب'))}</p>`);}
  }
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-hl-action="training"],[data-training-open]');if(!button)return;event.preventDefault();section.scrollIntoView({behavior:shortcutScrollBehavior(),block:'start'});if(!auth?.isAuthenticated()){const list=section.querySelector('[data-training-list]');if(list)uiLocale.setHTML(list, uiLocale.html`<p>سجل الدخول لعرض بيانات التدريب.</p>`);return}const instructor=Boolean(button.closest?.('.hl-role-dashboard[data-role="instructor"]'));load(instructor?'instructor':undefined);});
  section.addEventListener('click',async event=>{
    const plan=event.target.closest?.('[data-training-plan]');if(plan){await openPlan(plan.dataset.trainingPlan);return}
    if(event.target.closest?.('[data-plan-back]')){await load('instructor');return}
    if(event.target.closest?.('[data-plan-refresh]')){if(planEnrollment)await openPlan(planEnrollment);return}
    if(event.target.closest?.('[data-training-schedule-refresh]')){await loadProfessionalSchedule();return}
    const skillButton=event.target.closest?.('[data-skill-status]');
    if(skillButton){
      const article=skillButton.closest('[data-professional-skill]'),id=article?.dataset.professionalSkill;if(!id)return;
      skillButton.disabled=true;
      try{const response=await auth.authorizedFetch('/training/skills/'+encodeURIComponent(id)+'/assessment',{method:'PATCH',body:JSON.stringify({status:skillButton.dataset.skillStatus})});if(!response.ok){const body=await response.json().catch(()=>null);throw localError(body?.message||uiLocale.message('تعذر حفظ التقييم'))}await loadProfessionalSkills();}
      catch(error){skillButton.disabled=false;uiLocale.insertHTML(section.querySelector('[data-training-list]'), 'afterbegin', uiLocale.html`<p role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر حفظ التقييم'))}</p>`);}
      return;
    }
    const button=event.target.closest?.('[data-attendance-action]');if(!button||button.disabled)return;
    const article=button.closest('[data-professional-session]'),id=article?.dataset.professionalSession;if(!id)return;
    const version=scheduleVersion,session=auth?.getSessionVersion?.(),live=()=>scheduleCurrent(version,session)&&article.isConnected;
    button.disabled=true;
    try{
      if(!(await scheduleAuthorized(version,session))||!live()){if(live())uiLocale.setHTML(section.querySelector('[data-training-list]'), uiLocale.html`<p>صلاحية المدرب غير متاحة. حدّث حسابك.</p>`);return}
      const response=await auth.authorizedFetch('/training/professional/me/sessions/'+encodeURIComponent(id)+'/attendance',{method:'PATCH',body:JSON.stringify({action:button.dataset.attendanceAction,expectedUpdatedAt:article.dataset.revision})});
      const body=await response.json().catch(()=>null);if(!live())return;
      if(!response.ok)throw localError(body?.message||uiLocale.message('تعذر تحديث الحضور'));
      await loadProfessionalSchedule();
    }catch(error){if(live())uiLocale.insertHTML(article, 'beforeend', uiLocale.html`<p role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحديث الحضور'))}</p><button type="button" data-training-schedule-refresh>تحديث الجدول</button>`);}
    finally{button.disabled=false}
  });
  document.addEventListener('hydroland:session-cleared',()=>{scheduleVersion++;planVersion++;certificateVersion++;planEnrollment=null;if(['professional-schedule','professional-plan','professional-certificates'].includes(section.dataset.trainingMode))uiLocale.setText(section.querySelector('[data-training-list]'), ...['سجل الدخول لعرض بيانات التدريب.'])});
  document.addEventListener('hydroland:role-changed',()=>{if(window.HydrolandPortalAccess?.getCurrentRole?.()!=='instructor'){if(section.dataset.trainingMode==='professional-certificates'){certificateVersion++;section.querySelector('[data-training-list]').textContent=''}if(section.dataset.trainingMode==='professional-plan'){planVersion++;planEnrollment=null;section.querySelector('[data-training-list]').textContent=''}}});
  document.addEventListener('hydroland:auth-changed',()=>load(requestedMode));
  window.HydrolandTraining={reload:mode=>load(mode)};
  setTimeout(load,0);
})();

