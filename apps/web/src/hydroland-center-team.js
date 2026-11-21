(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-team", {
  "اتفاق استحقاق المدرب": "Instructor compensation agreement",
  "طريقة الاستحقاق": "Compensation method",
  "اختر طريقة الاستحقاق": "Select a compensation method",
  "توقيت استحقاق المدرب": "When the instructor earns compensation",
  "شروط عكس الاستحقاق عند الاسترداد": "Reversal terms when a refund is issued",
  "نسبة فقط": "Percentage only",
  "مبلغ ثابت فقط": "Fixed amount only",
  "مبلغ ثابت مع نسبة": "Fixed amount plus percentage",
  "راتب فقط (بدون استحقاق إضافي عن الدورة)": "Salary only (no additional course compensation)",
  "النسبة المئوية": "Percentage",
  "المبلغ الثابت بالريال": "Fixed amount in SAR",
  "أساس النسبة للتجربة بالريال": "Example calculation base in SAR",
  "معاينة الاستحقاق الإضافي": "Additional compensation preview",
  "حفظ الاتفاق": "Save agreement",
  "أغلق الاتفاق": "Close agreement",
  "أدخل قيم الاتفاق لعرض المعاينة.": "Enter the agreement values to see the preview.",
  "الإضافة عن الدورة تساوي صفرًا، ويستمر الراتب من مسار الرواتب.": "Additional course compensation is zero. Salary continues through payroll.",
  "تُحفظ الطريقة والقيم لهذا المدرب في المركز.": "The method and amounts are saved for this instructor at this center.",
  "تعذر تحميل اتفاق المدرب.": "Could not load the instructor agreement.",
  "تعذر حفظ الاتفاق.": "Could not save the agreement.",
  "تم حفظ اتفاق المدرب.": "Instructor agreement saved.",
  "هذا الاتفاق متاح للقراءة.": "This agreement is available to view.",
  "لا يوجد اتفاق محفوظ.": "No agreement has been saved.",
  "تغير الاتفاق. افتحه من جديد قبل الحفظ.": "The agreement changed. Reopen it before saving.",
  "مرفوض": "Rejected",
  "بانتظار المراجعة": "Awaiting review",
  "غير مسجل": "Not recorded",
  "إعادة المحاولة": "Try again",
  "مكتملة": "Completed",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "موقوف": "Suspended",
  "مؤرشف": "Archived",
  "غير محددة": "Not specified",
  "نشط": "Active",
  "غير معروف": "Unknown",
  "ملغاة": "Cancelled",
  "مالك المركز": "Center owner",
  "مدير المركز": "Center manager",
  "مسؤول تشغيل": "Operations officer",
  "مدرب غوص": "Dive instructor",
  "عضو فريق": "Team member",
  "مشاهد": "Viewer",
  "بانتظار قبول الدعوة": "Awaiting invitation acceptance",
  "منتهية": "Expired",
  "غير مفعل": "Inactive",
  "الطاقم": "Team",
  "إدارة أعضاء هذا المركز ومراجعة عضويتهم من حساب إدارة المركز.": "Manage members of this center and review their membership using a center management account.",
  "محترفو الغوص": "Dive professionals",
  "التكليفات التدريبية": "Training assignments",
  "دعوة عضو للمركز": "Invite a center member",
  "البريد المسجل في المنصة": "Email registered on the platform",
  "الدور داخل المركز": "Role within the center",
  "تظهر الدعوة في إشعارات صاحب الحساب، ولا تتفعل العضوية إلا بعد قبوله. دور المدرب يتطلب حساب محترف غوص نشطًا. العضوية لا تمنح صلاحيات الإدارة العليا.": "The invitation appears in the account holder's notifications. Membership activates only after acceptance. The instructor role requires an active dive professional account. Membership does not grant platform administration permissions.",
  "إرسال الدعوة": "Send invitation",
  "جارٍ حفظ الدعوة...": "Saving invitation...",
  "تعذر إرسال الدعوة. أعد المحاولة.": "Could not send the invitation. Try again.",
  "تم حفظ الدعوة. العضوية بانتظار قبول صاحب الحساب من إشعاراته.": "Invitation saved. Membership awaits the account holder's acceptance from their notifications.",
  "تعذر إرسال الدعوة.": "Could not send the invitation.",
  "تعذر إلغاء الدعوة.": "Could not cancel the invitation.",
  "تم إلغاء الدعوة المعلقة.": "Pending invitation cancelled.",
  "تعديل العضوية": "Edit membership",
  "الإجراء": "Action",
  "تغيير الدور": "Change role",
  "الدور الجديد": "New role",
  "سبب التعديل": "Reason for change",
  "التعديل يخص عضوية هذا المركز. الإيقاف يمنع الوصول التشغيلي ويحفظ السجلات. دور المدرب يتطلب حساب محترف غوص نشطًا.": "This change affects membership in this center. Suspension blocks operational access and preserves records. The instructor role requires an active dive professional account.",
  "حفظ التعديل": "Save change",
  "تحديث قائمة الطاقم": "Refresh team list",
  "إيقاف العضوية": "Suspend membership",
  "إعادة تفعيل العضوية": "Reactivate membership",
  "التكليفات غير المنتهية:": "Ongoing assignments:",
  "· الجلسات غير المنتهية:": "· Ongoing sessions:",
  ". عند إيقاف المدرب أو تغيير دوره، تبقى محفوظة وتحتاج متابعة إسنادها إلى مدرب مؤهل.": ". If an instructor is suspended or their role changes, these records remain saved and need reassignment to a qualified instructor.",
  "جارٍ حفظ التعديل...": "Saving change...",
  "تعذر حفظ تعديل العضوية. أعد المحاولة.": "Could not save the membership change. Try again.",
  "تم إيقاف العضوية في المركز.": "Center membership suspended.",
  "تمت إعادة تفعيل العضوية في المركز.": "Center membership reactivated.",
  "تم حفظ الدور الجديد داخل المركز.": "New role within the center saved.",
  "تعذر حفظ تعديل العضوية.": "Could not save the membership change.",
  "بانتظار البدء": "Awaiting start",
  "نشطة": "Active",
  "موقوفة": "Suspended",
  "مجدولة": "Scheduled",
  "الحضور مفتوح": "Attendance open",
  "جارية": "In progress",
  "موعد غير متاح": "Schedule unavailable",
  "التكليف محفوظ للمتابعة؛ لا يمكن تغييره بعد انتهاء الدورة أو عند بدء الجلسة أو تسجيل حضورها.": "The assignment is retained for follow-up. It cannot change after course completion, session start or attendance recording.",
  "لا يوجد مدرب مؤهل للتكليف حاليًا. راجع عضويات الطاقم وحالة حسابات المدربين.": "No qualified instructor is currently available for assignment. Review team memberships and instructor account status.",
  "المدرب الجديد": "New instructor",
  "اختر المدرب": "Choose an instructor",
  "سبب التكليف": "Assignment reason",
  "حفظ التكليف": "Save assignment",
  "تحديث التكليفات": "Refresh assignments",
  "تغيير مدرب الجلسة": "Change session instructor",
  "تغيير مدرب الدورة": "Change course instructor",
  "إسناد مدرب للدورة": "Assign a course instructor",
  "نقل الجلسات القادمة المجدولة من المدرب السابق إلى المدرب الجديد": "Transfer upcoming scheduled sessions from the previous instructor to the new instructor",
  "الجلسات المسندة لمدرب آخر تبقى كما هي. تُحفظ الجلسات المنتهية والتقييمات السابقة بأسماء أصحابها.": "Sessions assigned to another instructor remain unchanged. Completed sessions and previous assessments retain their original authors.",
  "يتغير مدرب هذه الجلسة فقط؛ يبقى موعدها ومدرب الدورة كما هما.": "Only this session's instructor changes. Its schedule and the course instructor remain unchanged.",
  "فتح الحضور": "Open attendance",
  "توثيق حضور المدرب من المركز": "Record instructor attendance on behalf of the center",
  "توثيق حضور المتدرب من المركز": "Record trainee attendance on behalf of the center",
  "بدء الجلسة": "Start session",
  "إنهاء الجلسة": "Complete session",
  "إلغاء الجلسة": "Cancel session",
  "بداية الجلسة بتوقيت الرياض": "Session start in Riyadh time",
  "نهاية الجلسة بتوقيت الرياض": "Session end in Riyadh time",
  "إضافة جلسة": "Add session",
  "تعديل موعد الجلسة": "Edit session schedule",
  "الحضور وحالة الجلسة": "Attendance and session status",
  "إجراء الجلسة": "Session action",
  "اختر الإجراء": "Choose an action",
  "توثيق الحضور هنا يُسجل باسم إدارة المركز. يفتح الحضور قبل الموعد بـ30 دقيقة، ويبدأ التدريب عند حلول الموعد وبعد تسجيل حضور المدرب والمتدرب.": "Attendance entered here is recorded on behalf of center management. Attendance opens 30 minutes before the scheduled time. Training starts at that time after both instructor and trainee attendance is recorded.",
  "مدرب الجلسة": "Session instructor",
  "بيئة الجلسة حسب برنامج المنظمة": "Session environment under the agency program",
  "اختر البيئة": "Choose an environment",
  "مسبح": "Pool",
  "مياه محصورة": "Confined water",
  "مياه مفتوحة": "Open water",
  "أقصى عمق مخطط بالمتر": "Maximum planned depth in meters",
  "نوع غوصة المياه المفتوحة": "Open-water dive type",
  "اختر النوع": "Choose a type",
  "غوصة تأهيلية": "Qualifying dive",
  "غوصة خبرة": "Experience dive",
  "رقم الغوصة التأهيلية": "Qualifying dive number",
  "تُراجع الخطة حسب إصدار المنظمة. يعاد التحقق من الغوصات السابقة والمهارات الفعلية عند بدء الجلسة.": "The plan is reviewed against the agency version. Previous dives and actual skills are rechecked when the session starts.",
  "يتحقق الخادم من الإصدار المرتبط بالدورة وتأهيل المدرب وحدود العمر والبيئة قبل الجدولة.": "The server checks the course's agency version, instructor qualifications and age and environment limits before scheduling.",
  "سبب إجراء الجلسة": "Reason for session action",
  "حفظ الجلسة": "Save session",
  "حفظ الموعد": "Save schedule",
  "حفظ إجراء الجلسة": "Save session action",
  "جارٍ الحفظ...": "Saving...",
  "تعذر حفظ الجلسة. أعد المحاولة.": "Could not save the session. Try again.",
  "تم حفظ الجلسة.": "Session saved.",
  "تم حفظ الموعد الجديد.": "New schedule saved.",
  "تم حفظ إجراء الجلسة.": "Session action saved.",
  "تعذر حفظ الجلسة.": "Could not save the session.",
  "لم يُسند بعد": "Not assigned yet",
  "· غير متاح لتكليف جديد": "· Unavailable for a new assignment",
  "مدرب الدورة:": "Course instructor:",
  "الجلسات المسجلة (": "Recorded sessions (",
  "متدرب": "Trainee",
  "النهاية:": "End:",
  "· مدرب الجلسة:": "· Session instructor:",
  "حضور المدرب:": "Instructor attendance:",
  "· حضور المتدرب:": "· Trainee attendance:",
  "مسجل": "Recorded",
  "· وثقه المركز": "· Recorded by the center",
  "لا توجد جلسات مسجلة لهذه الدورة حتى الآن.": "No sessions have been recorded for this course yet.",
  "لا توجد دورات مسجلة مرتبطة بالمركز حتى الآن.": "No enrolled courses are linked to this center yet.",
  "الصفحة الأولى": "First page",
  "الصفحة التالية": "Next page",
  "جارٍ حفظ التكليف...": "Saving assignment...",
  "تعذر حفظ التكليف. أعد المحاولة.": "Could not save the assignment. Try again.",
  "تم حفظ التكليف.": "Assignment saved.",
  "الجلسات القادمة المنقولة:": "Upcoming sessions transferred:",
  "تعذر حفظ التكليف.": "Could not save the assignment.",
  "تسجيلات دورات المركز وتكليف المدربين وجدولة الجلسات وتوثيق الحضور. الأوقات بتوقيت الرياض.": "Center course enrollments, instructor assignments, session scheduling and attendance recording. Times are shown in Riyadh time.",
  "محترفو الغوص النشطون المرتبطون بالمركز وتكليفاتهم التدريبية.": "Active dive professionals linked to the center and their training assignments.",
  "إدارة أعضاء هذا المركز ومراجعة عضويتهم وحالتها الفعلية من حساب إدارة المركز.": "Manage this center's members and review their membership and actual status using a center management account.",
  "جارٍ التحميل...": "Loading...",
  "لا تملك صلاحية عرض أعضاء هذا المركز.": "You do not have permission to view this center's members.",
  "تعذر التحميل": "Could not load",
  "استجابة التكليفات غير مكتملة. أعد المحاولة.": "The assignment response is incomplete. Try again.",
  "استجابة أعضاء المركز غير مكتملة. أعد المحاولة.": "The center member response is incomplete. Try again.",
  "الشهادات الموثقة:": "Verified certifications:",
  "عضو المركز": "Center member",
  "دور المركز:": "Center role:",
  "· التكليفات التدريبية:": "· Training assignments:",
  "الحساب غير نشط على المنصة؛ إعادة تفعيل عضوية المركز لا تفعّل الحساب.": "The platform account is inactive. Reactivating center membership does not activate the account.",
  "إلغاء الدعوة": "Cancel invitation",
  "لا توجد سجلات في هذا القسم حاليًا.": "No records in this section right now.",
  " · غير متاح لتكليف جديد": " · Unavailable for a new assignment",
  " · وثقه المركز": " · Recorded by the center",
  "تم حفظ التكليف.{0}": "Assignment saved.{0}",
  " الجلسات القادمة المنقولة: {0}.": " Upcoming sessions transferred: {0}.",
  " · التكليفات التدريبية: {0}": " · Training assignments: {0}"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0,lastMode='team',lastTrainingCursor='';
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const roles={OWNER:'مالك المركز',ADMIN:'مدير المركز',OPERATOR:'مسؤول تشغيل',INSTRUCTOR:'مدرب غوص',STAFF:'عضو فريق',VIEWER:'مشاهد'};
 const statuses={PENDING:'بانتظار قبول الدعوة',ACTIVE:'نشط',SUSPENDED:'موقوف',REMOVED:'منتهية',DRAFT:'غير مفعل',PENDING_REVIEW:'بانتظار المراجعة',REJECTED:'مرفوض',ARCHIVED:'مؤرشف'};
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 async function authorize(host,version,session){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
   const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected&&version===viewVersion&&session===auth()?.getSessionVersion?.())clear();return false}return true
 }
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-team';host.id='hl-center-team';host.hidden=true;
   uiLocale.setHTML(host, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2 data-center-team-title>الطاقم</h2><p data-center-team-description>إدارة أعضاء هذا المركز ومراجعة عضويتهم من حساب إدارة المركز.</p></div></header><div class="hl-member-actions"><button type="button" data-center-team-mode="team">الطاقم</button><button type="button" data-center-team-mode="professionals">محترفو الغوص</button><button type="button" data-center-team-mode="assignments">التكليفات التدريبية</button></div><details data-team-invitation><summary>دعوة عضو للمركز</summary><form data-center-team-invite><fieldset><label>البريد المسجل في المنصة<input type="email" name="email" required maxlength="254" autocomplete="off"></label><label>الدور داخل المركز<select name="role"><option value="STAFF">عضو فريق</option><option value="OPERATOR">مسؤول تشغيل</option><option value="INSTRUCTOR">مدرب غوص</option><option value="VIEWER">مشاهد</option></select></label><p>تظهر الدعوة في إشعارات صاحب الحساب، ولا تتفعل العضوية إلا بعد قبوله. دور المدرب يتطلب حساب محترف غوص نشطًا. العضوية لا تمنح صلاحيات الإدارة العليا.</p><button type="submit">إرسال الدعوة</button></fieldset><p data-invite-message role="status"></p></form></details><p data-team-feedback role="status"></p><div data-center-team-list aria-live="polite"></div>`);
   host.querySelector('[data-center-team-invite]').addEventListener('submit',invite);
   host.addEventListener('submit',event=>{if(event.target.matches('[data-team-manage]'))void manageMember(event);if(event.target.matches('[data-training-assign]'))void assignTraining(event);if(event.target.matches('[data-training-session-form]'))void saveSession(event)});
   host.addEventListener('change',event=>{
     const sessionForm=event.target.closest('[data-training-session-form="create"]');
     if(sessionForm&&['environment','diveKind'].includes(event.target.name)){
       const group=sessionForm.querySelector('[data-dive-plan]'),open=sessionForm.elements.environment.value==='OPEN_WATER';
       group.hidden=!open;sessionForm.elements.diveKind.disabled=!open;sessionForm.elements.diveKind.required=open;
       const numbered=open&&sessionForm.elements.diveKind.value==='QUALIFYING';sessionForm.elements.qualifyingNumber.disabled=!numbered;sessionForm.elements.qualifyingNumber.required=numbered;
       if(!numbered)sessionForm.elements.qualifyingNumber.value='';
       return;
     }
     const form=event.target.closest('[data-team-manage]');if(!form||event.target.name!=='action')return;
     const label=form.querySelector('[data-team-role-field]'),select=label.querySelector('select');
     label.hidden=select.disabled=event.target.value!=='CHANGE_ROLE';
   });
   host.addEventListener('click',event=>{
     const mode=event.target.closest?.('[data-center-team-mode]')?.dataset.centerTeamMode;if(mode)void open(mode);
     if(event.target.closest?.('[data-center-team-retry]'))void open(lastMode, '', lastMode==='assignments'?lastTrainingCursor:'');
     const next=event.target.closest?.('[data-training-page]');if(next)void open('assignments', '', next.dataset.trainingPage);
     const agreement=event.target.closest?.('[data-compensation-open]');if(agreement)void openCompensation(host,agreement);
     const button=event.target.closest?.('[data-team-cancel]');if(button)void cancelInvitation(host,button);
   });
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function openCompensation(host,button){
   const article=button.closest('[data-center-team-member]'),slot=article.querySelector('[data-compensation-slot]');
   if(slot.childElementCount){slot.replaceChildren();button.setAttribute('aria-expanded','false');return}
   const version=viewVersion,session=auth()?.getSessionVersion?.(),live=()=>current(host,version,session)&&button.isConnected;
   const url='/center/me/professionals/'+encodeURIComponent(button.dataset.compensationOpen)+'/compensation';
   const message=article.querySelector('[data-team-error]');
   button.disabled=true;message.textContent='';
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch(url),result=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||!result)throw localError('تعذر تحميل اتفاق المدرب.');
     let revision=result.terms?.revision??0;
     uiLocale.setHTML(slot,uiLocale.html`<form data-compensation-form><fieldset><legend>اتفاق استحقاق المدرب</legend>
       <label>طريقة الاستحقاق <select name="mode" required><option value="">اختر طريقة الاستحقاق</option><option value="PERCENTAGE">نسبة فقط</option><option value="FIXED">مبلغ ثابت فقط</option><option value="FIXED_PLUS_PERCENTAGE">مبلغ ثابت مع نسبة</option><option value="SALARY_ONLY">راتب فقط (بدون استحقاق إضافي عن الدورة)</option></select></label>
       <label data-rate>النسبة المئوية <input name="rate" type="number" min="0.01" max="100" step="0.01" inputmode="decimal"></label>
       <label data-fixed>المبلغ الثابت بالريال <input name="fixed" type="number" min="0.01" max="21474836.47" step="0.01" inputmode="decimal"></label>
       <label data-basis>أساس النسبة للتجربة بالريال <input name="basis" type="number" min="0" max="21474836.47" step="0.01" inputmode="decimal"></label>
       <label data-earning-timing>توقيت استحقاق المدرب <textarea name="earningTiming" maxlength="1000"></textarea></label>
       <label data-reversal-terms>شروط عكس الاستحقاق عند الاسترداد <textarea name="reversalTerms" maxlength="1000"></textarea></label>
       <p data-salary>الإضافة عن الدورة تساوي صفرًا، ويستمر الراتب من مسار الرواتب.</p><label>معاينة الاستحقاق الإضافي <output data-preview aria-live="polite"></output></label>
       <p>تُحفظ الطريقة والقيم لهذا المدرب في المركز.</p><button type="submit">حفظ الاتفاق</button></fieldset><p data-compensation-message role="status"></p></form>`);
     const form=slot.querySelector('form'),fields=form.elements,status=form.querySelector('[role=status]');
     button.setAttribute('aria-expanded','true');
     const hasRate=()=>['PERCENTAGE','FIXED_PLUS_PERCENTAGE'].includes(fields.mode.value);
     const hasFixed=()=>['FIXED','FIXED_PLUS_PERCENTAGE'].includes(fields.mode.value);
     function minor(input){
       if(input.value===''||!input.validity.valid)return null;
       const [whole,fraction='']=input.value.split('.');
       if(!/^\d+$/.test(whole)||!/^\d{0,2}$/.test(fraction))return null;
       return Number(whole)*100+Number(fraction.padEnd(2,'0'));
     }
     function draw(){
       for(const [selector,input,active] of [['[data-rate]',fields.rate,hasRate()],['[data-fixed]',fields.fixed,hasFixed()],['[data-basis]',fields.basis,hasRate()]]){
         form.querySelector(selector).hidden=!active;input.disabled=!active;input.required=active&&input!==fields.basis;
       }
       const salary=fields.mode.value==='SALARY_ONLY';form.querySelector('[data-salary]').hidden=!salary;
       for(const name of ['earningTiming','reversalTerms']){
         const input=fields[name],active=Boolean(fields.mode.value)&&!salary;
         input.closest('label').hidden=!active;input.disabled=!active;input.required=active;
       }
       const base=hasRate()?minor(fields.basis):0,rate=hasRate()?minor(fields.rate):0,fixed=hasFixed()?minor(fields.fixed):0;
       const output=form.querySelector('[data-preview]');
       if(!fields.mode.value||base===null||rate===null||fixed===null){uiLocale.setText(output,'أدخل قيم الاتفاق لعرض المعاينة.');return}
       const amount=fixed+Math.floor((base*rate+5000)/10000);
       output.textContent=new Intl.NumberFormat(document.documentElement.lang||'ar-SA',{style:'currency',currency:'SAR'}).format(amount/100);
     }
     fields.earningTiming.value=result.terms?.earningTiming??'';
     fields.reversalTerms.value=result.terms?.reversalTerms??'';
     fields.mode.value=result.terms?.mode??'';
     if(result.terms?.rateBps)fields.rate.value=String(result.terms.rateBps/100);
     if(result.terms?.fixedMinor)fields.fixed.value=String(result.terms.fixedMinor/100);
     draw();form.addEventListener('input',draw);form.addEventListener('change',draw);
     if(!result.canEdit){
       form.querySelector('fieldset').disabled=true;form.querySelector('[type=submit]').hidden=true;
       uiLocale.setText(status,result.terms?'هذا الاتفاق متاح للقراءة.':'لا يوجد اتفاق محفوظ.');return;
     }
     form.addEventListener('submit',async event=>{
       event.preventDefault();if(form.dataset.busy||!live()||!form.isConnected||!form.reportValidity())return;
       const payload={mode:fields.mode.value,rateBps:hasRate()?minor(fields.rate):0,fixedMinor:hasFixed()?minor(fields.fixed):0,expectedRevision:revision};
       if(fields.mode.value!=='SALARY_ONLY')Object.assign(payload,{earningTiming:fields.earningTiming.value.trim(),reversalTerms:fields.reversalTerms.value.trim()});
       form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
       try{
         if(!(await authorize(host,version,session))||!live()||!form.isConnected)return;
         const resp=await auth().authorizedFetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),saved=await resp.json().catch(()=>null);
         if(!live()||!form.isConnected)return;
         if(!resp.ok||!saved?.terms)throw localError(resp.status===409?'تغير الاتفاق. افتحه من جديد قبل الحفظ.':'تعذر حفظ الاتفاق.');
         revision=saved.terms.revision;uiLocale.setText(status,'تم حفظ اتفاق المدرب.');
       }catch(error){if(live()&&form.isConnected)setLocalErrorText(status,error,'تعذر حفظ الاتفاق.')}
       finally{delete form.dataset.busy;if(form.isConnected)form.querySelector('fieldset').disabled=false}
     });
   }catch(error){if(live())setLocalErrorText(message,error,'تعذر تحميل اتفاق المدرب.')}
   finally{if(live())button.disabled=false}
 }
 async function invite(event){
   event.preventDefault();const form=event.currentTarget,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const payload=Object.fromEntries(new FormData(form)),version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-invite-message]');
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ الدعوة...'));
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/team/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok||!body?.id||body.status!=='PENDING')throw (value=>value?new Error(value):localError('تعذر إرسال الدعوة. أعد المحاولة.'))(body?.message);
     form.reset();message.textContent='';await open('team', uiLocale.message('تم حفظ الدعوة. العضوية بانتظار قبول صاحب الحساب من إشعاراته.'));
   }catch(error){if(current(host,version,session))setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر إرسال الدعوة.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function cancelInvitation(host,button){
   if(button.disabled)return;
   const version=viewVersion,session=auth()?.getSessionVersion?.(),article=button.closest('[data-center-team-member]');
   const live=()=>current(host,version,session)&&article?.isConnected;button.disabled=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/team/'+encodeURIComponent(button.dataset.teamCancel)+'/cancel-invitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUpdatedAt:button.dataset.revision})}),body=await response.json().catch(()=>null);
     if(!live())return;if(!response.ok)throw (value=>value?new Error(value):localError('تعذر إلغاء الدعوة.'))(body?.message);await open('team', uiLocale.message('تم إلغاء الدعوة المعلقة.'));
   }catch(error){if(live())setLocalErrorText(article.querySelector('[data-team-error]'), (error instanceof Error?error:undefined), 'تعذر إلغاء الدعوة.')}
   finally{button.disabled=false}
 }
 function managementForm(row){
   if(!row.membershipId||!row.updatedAt||!['ACTIVE','SUSPENDED'].includes(row.status)||!['OPERATOR','INSTRUCTOR','STAFF','VIEWER'].includes(row.role)||!row.canChangeRole)return '';
   const impact=count(row.openTrainingEnrollments)+count(row.openTrainingSessions);
   return uiLocale.html`<details><summary>تعديل العضوية</summary><form data-team-manage="${esc(row.membershipId)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>الإجراء<select name="action" aria-label="الإجراء"><option value="CHANGE_ROLE">تغيير الدور</option>${(row.canSuspend?uiLocale.html`<option value="SUSPEND">إيقاف العضوية</option>`:'')}${(row.canReactivate?uiLocale.html`<option value="REACTIVATE">إعادة تفعيل العضوية</option>`:'')}</select></label><label data-team-role-field>الدور الجديد<select name="role">${['STAFF','OPERATOR','INSTRUCTOR','VIEWER'].map(role=>uiLocale.html`<option value="${role}"${role===row.role?' selected':''}>${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(roles[role]))}</option>`).join('')}</select></label><label>سبب التعديل<textarea name="reason" required maxlength="1000" rows="3"></textarea></label><p>التعديل يخص عضوية هذا المركز. الإيقاف يمنع الوصول التشغيلي ويحفظ السجلات. دور المدرب يتطلب حساب محترف غوص نشطًا.</p>${(impact?uiLocale.html`<p data-training-impact>التكليفات غير المنتهية: ${count(row.openTrainingEnrollments)} · الجلسات غير المنتهية: ${count(row.openTrainingSessions)}. عند إيقاف المدرب أو تغيير دوره، تبقى محفوظة وتحتاج متابعة إسنادها إلى مدرب مؤهل.</p>`:'')}<button type="submit">حفظ التعديل</button></fieldset><p data-team-manage-message role="status"></p><button type="button" data-center-team-retry hidden>تحديث قائمة الطاقم</button></form></details>`;
 }
 async function manageMember(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const payload={...Object.fromEntries(new FormData(form)),expectedUpdatedAt:form.dataset.revision},version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-team-manage-message]');
   const live=()=>current(host,version,session)&&form.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ التعديل...'));form.querySelector('[data-center-team-retry]').hidden=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/team/'+encodeURIComponent(form.dataset.teamManage),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||body?.id!==form.dataset.teamManage||!['ACTIVE','SUSPENDED'].includes(body?.status)){
       form.querySelector('[data-center-team-retry]').hidden=response.status!==409;
       throw (value=>value?new Error(value):localError('تعذر حفظ تعديل العضوية. أعد المحاولة.'))(body?.message);
     }
     await open('team', (payload.action==='SUSPEND'?uiLocale.message('تم إيقاف العضوية في المركز.'):(payload.action==='REACTIVATE'?uiLocale.message('تمت إعادة تفعيل العضوية في المركز.'):uiLocale.message('تم حفظ الدور الجديد داخل المركز.'))));
   }catch(error){if(live())setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ تعديل العضوية.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 const trainingStatuses={PENDING:'بانتظار البدء',ACTIVE:'نشطة',SUSPENDED:'موقوفة',COMPLETED:'مكتملة',CANCELLED:'ملغاة',SCHEDULED:'مجدولة',CHECK_IN_OPEN:'الحضور مفتوح',IN_PROGRESS:'جارية'};
 const trainingDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(date):uiLocale.t('موعد غير متاح')};
 function assignmentForm(row,kind,instructors){
   if(!row.canAssign)return uiLocale.html`<p>التكليف محفوظ للمتابعة؛ لا يمكن تغييره بعد انتهاء الدورة أو عند بدء الجلسة أو تسجيل حضورها.</p>`;
   if(!instructors.length)return uiLocale.html`<p>لا يوجد مدرب مؤهل للتكليف حاليًا. راجع عضويات الطاقم وحالة حسابات المدربين.</p>`;
   return uiLocale.html`<details><summary>${uiLocale.messageHTML((kind==='session'?uiLocale.message('تغيير مدرب الجلسة'):(row.instructor?uiLocale.message('تغيير مدرب الدورة'):uiLocale.message('إسناد مدرب للدورة'))))}</summary><form data-training-assign="${kind}" data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>المدرب الجديد<select name="instructorAccountId" aria-label="المدرب الجديد" required><option value="">اختر المدرب</option>${instructors.map(person=>uiLocale.html`<option value="${esc(person.accountId)}">${esc(person.displayName)}</option>`).join('')}</select></label>${(kind==='enrollment'?uiLocale.html`<label class="hl-training-transfer"><input type="checkbox" name="transferUpcomingSessions" checked>نقل الجلسات القادمة المجدولة من المدرب السابق إلى المدرب الجديد</label><p>الجلسات المسندة لمدرب آخر تبقى كما هي. تُحفظ الجلسات المنتهية والتقييمات السابقة بأسماء أصحابها.</p>`:uiLocale.html`<p>يتغير مدرب هذه الجلسة فقط؛ يبقى موعدها ومدرب الدورة كما هما.</p>`)}<label>سبب التكليف<textarea name="reason" required maxlength="1000" rows="3"></textarea></label><button type="submit">حفظ التكليف</button></fieldset><p data-training-message role="status"></p><button type="button" data-center-team-retry hidden>تحديث التكليفات</button></form></details>`;
 }
 const sessionActionLabels={OPEN:'فتح الحضور',INSTRUCTOR_CHECK_IN:'توثيق حضور المدرب من المركز',STUDENT_CHECK_IN:'توثيق حضور المتدرب من المركز',START:'بدء الجلسة',COMPLETE:'إنهاء الجلسة',CANCEL:'إلغاء الجلسة'};
 const riyadhInput=value=>{const date=new Date(value);return value&&Number.isFinite(date.getTime())?new Date(date.getTime()+3*60*60*1000).toISOString().slice(0,16):''};
 const sessionDates=row=>uiLocale.html`<label>بداية الجلسة بتوقيت الرياض<input type="datetime-local" name="startsAt" value="${esc(riyadhInput(row?.startsAt))}" required></label><label>نهاية الجلسة بتوقيت الرياض<input type="datetime-local" name="endsAt" value="${esc(riyadhInput(row?.endsAt))}" required></label>`;
 function sessionForm(row,kind,instructors=[]){
   if(kind==='create'&&(!row.canCreateSession||!instructors.length))return '';
   if(kind==='schedule'&&!row.canReschedule)return '';
   const actions=(row.actions||[]).filter(action=>sessionActionLabels[action]);if(kind==='action'&&!actions.length)return '';
   const title=kind==='create'?'إضافة جلسة':kind==='schedule'?'تعديل موعد الجلسة':'الحضور وحالة الجلسة';
   const fields=kind==='action'?uiLocale.html`<label>إجراء الجلسة<select name="action" aria-label="إجراء الجلسة" required><option value="">اختر الإجراء</option>${actions.map(action=>uiLocale.html`<option value="${action}">${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(sessionActionLabels[action]))}</option>`).join('')}</select></label><p>توثيق الحضور هنا يُسجل باسم إدارة المركز. يفتح الحضور قبل الموعد بـ30 دقيقة، ويبدأ التدريب عند حلول الموعد وبعد تسجيل حضور المدرب والمتدرب.</p>`:(kind==='create'?uiLocale.html`<label>مدرب الجلسة<select name="instructorAccountId" required><option value="">اختر المدرب</option>${instructors.map(person=>uiLocale.html`<option value="${esc(person.accountId)}"${person.accountId===row.instructor?.accountId?' selected':''}>${esc(person.displayName)}</option>`).join('')}</select></label>`:'')+sessionDates(kind==='schedule'?row:null);
   const standardFields=kind==='create'?uiLocale.html`<label>بيئة الجلسة حسب برنامج المنظمة<select name="environment" required><option value="">اختر البيئة</option><option value="POOL">مسبح</option><option value="CONFINED_WATER">مياه محصورة</option><option value="OPEN_WATER">مياه مفتوحة</option></select></label><label>أقصى عمق مخطط بالمتر<input name="plannedMaximumDepthMetres" type="number" min="0" max="200" step="0.1" required></label><div data-dive-plan hidden><label>نوع غوصة المياه المفتوحة<select name="diveKind" disabled><option value="">اختر النوع</option><option value="QUALIFYING">غوصة تأهيلية</option><option value="EXPERIENCE">غوصة خبرة</option></select></label><label>رقم الغوصة التأهيلية<input name="qualifyingNumber" type="number" min="1" max="200" step="1" disabled></label><p>تُراجع الخطة حسب إصدار المنظمة. يعاد التحقق من الغوصات السابقة والمهارات الفعلية عند بدء الجلسة.</p></div><p>يتحقق الخادم من الإصدار المرتبط بالدورة وتأهيل المدرب وحدود العمر والبيئة قبل الجدولة.</p>`:'';
   return uiLocale.html`<details><summary>${uiLocale.messageHTML(uiLocale.message(title))}</summary><form data-training-session-form="${kind}" data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset>${fields}${standardFields}<label>سبب إجراء الجلسة<textarea name="reason" required maxlength="1000" rows="2"></textarea></label><button type="submit">${uiLocale.messageHTML((kind==='create'?uiLocale.message('حفظ الجلسة'):(kind==='schedule'?uiLocale.message('حفظ الموعد'):uiLocale.message('حفظ إجراء الجلسة'))))}</button></fieldset><p data-session-message role="status"></p><button type="button" data-center-team-retry hidden>تحديث التكليفات</button></form></details>`;
 }
 async function saveSession(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const kind=form.dataset.trainingSessionForm,fields=new FormData(form),payload={reason:fields.get('reason'),expectedUpdatedAt:form.dataset.revision};
   if(kind==='action')payload.action=fields.get('action');else{payload.startsAt=fields.get('startsAt')+':00+03:00';payload.endsAt=fields.get('endsAt')+':00+03:00'}
   if(kind==='create'){form.dataset.requestId ||= crypto.randomUUID();payload.requestId=form.dataset.requestId;payload.instructorAccountId=fields.get('instructorAccountId');payload.environment=fields.get('environment');payload.plannedMaximumDepthMetres=Number(fields.get('plannedMaximumDepthMetres'));if(payload.environment==='OPEN_WATER'){payload.diveKind=fields.get('diveKind');payload.qualifyingNumber=payload.diveKind==='QUALIFYING'?Number(fields.get('qualifyingNumber')):null}}
   const version=viewVersion,session=auth()?.getSessionVersion?.(),cursor=lastTrainingCursor,message=form.querySelector('[data-session-message]'),live=()=>current(host,version,session)&&form.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;form.querySelector('[data-center-team-retry]').hidden=true;uiLocale.setMessage(message, uiLocale.message('جارٍ الحفظ...'));
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const path=kind==='create'?'enrollments/'+encodeURIComponent(form.dataset.id)+'/sessions':'sessions/'+encodeURIComponent(form.dataset.id)+(kind==='schedule'?'/schedule':'/actions');
     const response=await auth().authorizedFetch('/center/me/training/'+path,{method:kind==='create'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||body?.id!==(kind==='create'?payload.requestId:form.dataset.id)){form.querySelector('[data-center-team-retry]').hidden=response.status!==409;throw (value=>value?new Error(value):localError('تعذر حفظ الجلسة. أعد المحاولة.'))(body?.message)}
     await open('assignments', (kind==='create'?uiLocale.message('تم حفظ الجلسة.'):(kind==='schedule'?uiLocale.message('تم حفظ الموعد الجديد.'):uiLocale.message('تم حفظ إجراء الجلسة.'))), cursor);
   }catch(error){if(live())setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ الجلسة.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 function renderAssignments(data,cursor){
   const instructor=row=>`${esc(row.instructor?.displayName||uiLocale.t('لم يُسند بعد'))}${row.instructor&&!row.instructor.eligible?uiLocale.t(' · غير متاح لتكليف جديد'):''}`;
   const rows=data.enrollments.map(row=>uiLocale.html`<article class="hl-course hl-training-assignment" data-training-enrollment="${esc(row.id)}"><div class="hl-course-top"><div><h3>${esc(row.courseCode)}</h3><p>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('متدرب')))(row.student?.displayName)}</p></div><span>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(trainingStatuses[row.status]) || uiLocale.message('غير معروف')))}</span></div><p>مدرب الدورة: ${instructor(row)}</p>${assignmentForm(row,'enrollment',data.instructors)}${sessionForm(row,'create',data.instructors)}<details><summary>الجلسات المسجلة (${count(row.record?.sessions?.length)})</summary>${(row.record?.sessions?.length?row.record.sessions.map(session=>uiLocale.html`<article class="hl-training-session" data-training-session="${esc(session.id)}"><h4>${esc(trainingDate(session.startsAt))}</h4><p>النهاية: ${(session.endsAt?esc(trainingDate(session.endsAt)):uiLocale.messageHTML(uiLocale.message('غير محددة')))}</p><p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(trainingStatuses[session.status]) || uiLocale.message('غير معروف')))} · مدرب الجلسة: ${instructor(session)}</p><p>حضور المدرب: ${uiLocale.messageHTML((session.attendance?.instructorCheckedIn?uiLocale.message('مسجل'):uiLocale.message('غير مسجل')))}${uiLocale.messageHTML((session.attendance?.instructorRecordedByCenter?uiLocale.message(' · وثقه المركز'):''))} · حضور المتدرب: ${uiLocale.messageHTML((session.attendance?.studentCheckedIn?uiLocale.message('مسجل'):uiLocale.message('غير مسجل')))}${uiLocale.messageHTML((session.attendance?.studentRecordedByCenter?uiLocale.message(' · وثقه المركز'):''))}</p>${assignmentForm(session,'session',data.instructors)}${sessionForm(session,'schedule')}${sessionForm(session,'action')}</article>`).join(''):uiLocale.html`<p>لا توجد جلسات مسجلة لهذه الدورة حتى الآن.</p>`)}</details></article>`).join('');
   return (rows||uiLocale.html`<p>لا توجد دورات مسجلة مرتبطة بالمركز حتى الآن.</p>`)+uiLocale.html`<div class="hl-member-actions">${(cursor?uiLocale.html`<button type="button" data-training-page="">الصفحة الأولى</button>`:'')}${(data.nextCursor?uiLocale.html`<button type="button" data-training-page="${esc(data.nextCursor)}">الصفحة التالية</button>`:'')}</div>`;
 }
 async function assignTraining(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const kind=form.dataset.trainingAssign,fields=new FormData(form),payload={instructorAccountId:fields.get('instructorAccountId'),reason:fields.get('reason'),expectedUpdatedAt:form.dataset.revision};
   if(kind==='enrollment')payload.transferUpcomingSessions=fields.has('transferUpcomingSessions');
   const version=viewVersion,session=auth()?.getSessionVersion?.(),cursor=lastTrainingCursor,message=form.querySelector('[data-training-message]'),live=()=>current(host,version,session)&&form.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ التكليف...'));form.querySelector('[data-center-team-retry]').hidden=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/training/'+(kind==='enrollment'?'enrollments':'sessions')+'/'+encodeURIComponent(form.dataset.id)+'/instructor',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||body?.id!==form.dataset.id){form.querySelector('[data-center-team-retry]').hidden=response.status!==409;throw (value=>value?new Error(value):localError('تعذر حفظ التكليف. أعد المحاولة.'))(body?.message);}
     await open('assignments', uiLocale.message("تم حفظ التكليف.{0}", [(kind==='enrollment'?uiLocale.message(" الجلسات القادمة المنقولة: {0}.", [count(body.transferredSessionCount)]):'')]), cursor);
   }catch(error){if(live())setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ التكليف.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function open(mode='team',notice='',cursor=''){
   mode=['professionals','assignments'].includes(mode)?mode:'team';lastMode=mode;if(mode==='assignments')lastTrainingCursor=cursor;if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-team-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   uiLocale.setMessage(host.querySelector('[data-center-team-title]'), (mode==='assignments'?uiLocale.message('التكليفات التدريبية'):(mode==='professionals'?uiLocale.message('محترفو الغوص'):uiLocale.message('الطاقم'))));
   uiLocale.setMessage(host.querySelector('[data-center-team-description]'), (mode==='assignments'?uiLocale.message('تسجيلات دورات المركز وتكليف المدربين وجدولة الجلسات وتوثيق الحضور. الأوقات بتوقيت الرياض.'):(mode==='professionals'?uiLocale.message('محترفو الغوص النشطون المرتبطون بالمركز وتكليفاتهم التدريبية.'):uiLocale.message('إدارة أعضاء هذا المركز ومراجعة عضويتهم وحالتها الفعلية من حساب إدارة المركز.'))));
   uiLocale.setMessage(host.querySelector('[data-team-feedback]'), notice);
   host.querySelector('[data-team-invitation]').hidden=mode==='assignments';
   host.querySelectorAll('[data-center-team-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.centerTeamMode===mode)));
   host.dataset.centerTrainingView=mode;host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ التحميل...</p>`);
   try{if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch(mode==='assignments'?'/center/me/training'+(cursor?'?cursor='+encodeURIComponent(cursor):''):mode==='professionals'?'/center/me/professionals':'/center/me/team'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية عرض أعضاء هذا المركز.'):(value=>value?new Error(value):localError('تعذر التحميل'))(rows?.message));if(mode==='assignments'){if(!rows||!Array.isArray(rows.enrollments)||!Array.isArray(rows.instructors))throw localError('استجابة التكليفات غير مكتملة. أعد المحاولة.');uiLocale.setHTML(list, renderAssignments(rows,cursor));return}if(!Array.isArray(rows))throw localError('استجابة أعضاء المركز غير مكتملة. أعد المحاولة.');
     uiLocale.setHTML(list, rows.length?rows.map((row,index)=>uiLocale.html`<article class="hl-course" data-center-team-member="${index}"><div class="hl-course-top"><div><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عضو المركز')))(row.displayName||row.person?.displayName)}</b><small>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عضو المركز')))(row.headline||row.person?.headline||roles[row.role])}</small>${(row.role?uiLocale.html`<small>دور المركز: ${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(roles[row.role]) || uiLocale.message('غير معروف')))}</small>`:'')}</div><span>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(statuses[row.status||row.professional?.instructorStatus||'ACTIVE']) || uiLocale.message('غير معروف')))}</span></div><small>الشهادات الموثقة: ${count(row.verifiedCredentials??row.professional?.verifiedCredentials)}${(row.assignedTrainingCount!==undefined?uiLocale.label(" · التكليفات التدريبية: {0}", [count(row.assignedTrainingCount)]):'')}</small>${(row.accountStatus&&row.accountStatus!=='ACTIVE'?uiLocale.html`<p>الحساب غير نشط على المنصة؛ إعادة تفعيل عضوية المركز لا تفعّل الحساب.</p>`:'')}${(row.canCancelInvitation&&row.status==='PENDING'&&row.membershipId&&row.updatedAt?uiLocale.html`<button type="button" data-team-cancel="${esc(row.membershipId)}" data-revision="${esc(row.updatedAt)}">إلغاء الدعوة</button>`:'')}${managementForm(row)}${mode==='professionals'&&row.accountId?uiLocale.html`<button type="button" aria-expanded="false" data-compensation-open="${esc(row.accountId)}">اتفاق استحقاق المدرب</button><div data-compensation-slot></div>`:''}<p data-team-error role="alert"></p></article>`).join(''):uiLocale.html`<p>لا توجد سجلات في هذا القسم حاليًا.</p>`);
   }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر التحميل')}</p><button type="button" data-center-team-retry>إعادة المحاولة</button>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterTeam=Object.freeze({open});
})();

