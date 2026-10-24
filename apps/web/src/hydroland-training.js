(()=>{
  const auth=window.HydrolandAuth;
  const host=document.querySelector('.training')||document.querySelector('#training')||document.querySelector('.courses');
  if(!host||document.querySelector('.hl-training'))return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const section=document.createElement('section');section.className='hl-training';
  section.innerHTML=`<header class="hl-training-head"><div><small>HYDROLAND LEARNING</small><h3>مركز التدريب والدورات</h3></div><span>سجلك التدريبي المباشر</span></header><div class="hl-training-grid"><article class="hl-training-card"><small>دوراتي</small><b data-training-count>—</b></article><article class="hl-training-card"><small>دورات نشطة</small><b data-training-active>—</b></article><article class="hl-training-card"><small>دورات مكتملة</small><b data-training-completed>—</b></article><article class="hl-training-card"><small>متوسط التقدم</small><b data-training-progress>—</b></article></div><div class="hl-training-main"><section class="hl-training-panel"><h4>مساري التدريبي</h4><div class="hl-course-list" data-training-list><p>سجل الدخول لعرض بيانات التدريب.</p></div></section></div>`;
  host.insertAdjacentElement('afterend',section);

  const label=status=>({PENDING:'بانتظار التفعيل',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي'}[status]||status||'—');
  let planVersion=0,planEnrollment=null,certificateVersion=0;
  const certificateCurrent=(version,session)=>version===certificateVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-certificates'&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor';
  const certificateAuthorized=async(version,session)=>{const authorize=window.HydrolandPortalAccess?.authorizeRole;return typeof authorize==='function'&&await authorize('instructor',{sessionVersion:session,isCurrent:()=>certificateCurrent(version,session)})&&certificateCurrent(version,session)};
  const planCurrent=(version,session)=>version===planVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-plan'&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor';
  const planAuthorized=async(version,session)=>{const authorize=window.HydrolandPortalAccess?.authorizeRole;return typeof authorize==='function'&&await authorize('instructor',{sessionVersion:session,isCurrent:()=>planCurrent(version,session)})&&planCurrent(version,session)};
  async function openPlan(enrollmentId){
    scheduleVersion++;certificateVersion++;planEnrollment=enrollmentId;const version=++planVersion,session=auth?.getSessionVersion?.(),list=section.querySelector('[data-training-list]');
    section.dataset.trainingMode='professional-plan';section.querySelector('.hl-training-grid').hidden=true;section.querySelector('.hl-training-head h3').textContent='خطة التدريب وإتمام الدورة';section.querySelector('.hl-training-head span').textContent='التقدم من المهارات الموقعة، وإتمام الدورة بعد إغلاق الجلسات';
    list.innerHTML='<p>جارٍ تحميل خطة التدريب...</p>';
    try{
      if(!(await planAuthorized(version,session)))return;
      const response=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+'/plan'),data=await response.json().catch(()=>null);
      if(!planCurrent(version,session))return;if(!response.ok||data?.enrollmentId!==enrollmentId||!Array.isArray(data.stages)||!Array.isArray(data.completionReasons))throw new Error(data?.message||'تعذر تحميل خطة التدريب.');
      const revision=data.record?.updatedAt||data.updatedAt,stageTypes={THEORY:'نظري',PRACTICAL:'عملي',ONLINE:'إلكتروني',BLENDED:'مدمج'},skillStatuses={NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التقييم',NEEDS_REVIEW:'يحتاج مراجعة',COMPETENT:'متقن'};
      list.innerHTML=`<button type="button" data-plan-back>العودة إلى الدورات</button><article class="hl-course" data-training-plan-view><h4>${esc(data.courseCode)}</h4><p>حالة الدورة: ${esc(label(data.enrollmentStatus))} · تقدم المهارات: ${Number(data.record?.progressPercent||0)}%</p>${data.stages.length?data.stages.map(stage=>`<section class="hl-course"><h4>${esc(stage.stageType)}</h4><p>${esc(stageTypes[stage.deliveryMode]||stage.deliveryMode)}</p>${stage.skills.map(skill=>`<p>${esc(skill.name)} · ${esc(skillStatuses[skill.status]||skill.status)}${skill.signedOffAt?' · توقيع المدرب موثق':''}</p>`).join('')||'<p>لا توجد مهارات في هذه المرحلة.</p>'}</section>`).join(''):'<p>لا توجد خطة مهارات لهذه الدورة. أضف المرحلة والمهارات قبل تقييمها.</p>'}${data.completionReasons.length?'<ul>'+data.completionReasons.map(reason=>'<li>'+esc(reason)+'</li>').join('')+'</ul>':''}</article>`;
      if(data.canEdit)list.insertAdjacentHTML('beforeend',`<details><summary>إضافة مهارة إلى الخطة</summary><form data-plan-skill data-revision="${esc(revision)}"><fieldset><label>المرحلة<select name="stageId"><option value="">مرحلة جديدة</option>${data.stages.map(stage=>`<option value="${esc(stage.id)}">${esc(stage.stageType)}</option>`).join('')}</select></label><fieldset data-plan-new-stage><label>اسم المرحلة<input name="stageType" maxlength="80" required></label><label>طريقة التدريب<select name="deliveryMode">${Object.entries(stageTypes).map(([value,text])=>`<option value="${value}">${text}</option>`).join('')}</select></label></fieldset><label>رمز المهارة<input name="skillCode" maxlength="80" required></label><label>اسم المهارة<input name="name" maxlength="200" required></label><label>ملاحظة الخطة<textarea name="reason" maxlength="1000" required></textarea></label><button type="submit">حفظ المهارة في الخطة</button></fieldset><p data-plan-message role="status"></p></form></details><p>تقييم المهارات متاح من صفحة «التقييمات». تتغير نسبة التقدم بعد حفظ التقييم.</p>`);
      if(data.canComplete)list.insertAdjacentHTML('beforeend',`<form data-plan-complete data-revision="${esc(revision)}"><fieldset><label>ملاحظات الإتمام<textarea name="reason" maxlength="1000" required></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت المهارات الموثقة والجلسات المكتملة</label><p>إتمام السجل لا يصدر شهادة. تبقى توصية الشهادة ومراجعتها المستقلة خطوتين منفصلتين.</p><button type="submit">إتمام سجل الدورة</button></fieldset><p data-plan-message role="status"></p></form>`);
    }catch(error){if(planCurrent(version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الخطة.')}</p><button type="button" data-plan-refresh>تحديث الخطة</button><button type="button" data-plan-back>العودة إلى الدورات</button>`;}
  }
  section.addEventListener('change',event=>{const select=event.target.closest?.('[data-plan-skill] [name="stageId"]');if(!select)return;const fields=select.form.querySelector('[data-plan-new-stage]');fields.hidden=Boolean(select.value);fields.disabled=Boolean(select.value)});
  section.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-plan-skill],[data-plan-complete]'))return;event.preventDefault();if(form.dataset.busy||!planEnrollment)return;
    const enrollmentId=planEnrollment,version=planVersion,session=auth?.getSessionVersion?.(),fields=new FormData(form),complete=form.matches('[data-plan-complete]'),payload={expectedUpdatedAt:form.dataset.revision,reason:fields.get('reason')},message=form.querySelector('[data-plan-message]'),live=()=>planCurrent(version,session)&&form.isConnected;
    if(complete)payload.reviewed=fields.get('reviewed')==='on';else{form.dataset.requestId ||= crypto.randomUUID();Object.assign(payload,{requestId:form.dataset.requestId,name:fields.get('name'),skillCode:fields.get('skillCode')},fields.get('stageId')?{stageId:fields.get('stageId')}:{stageType:fields.get('stageType'),deliveryMode:fields.get('deliveryMode')})}
    form.dataset.busy='true';form.querySelector('fieldset').disabled=true;message.textContent='جارٍ الحفظ...';
    try{
      if(!(await planAuthorized(version,session))||!live())return;
      const response=await auth.authorizedFetch('/training/professional/me/enrollments/'+encodeURIComponent(enrollmentId)+(complete?'/complete':'/plan'),{method:'POST',body:JSON.stringify(payload)}),data=await response.json().catch(()=>null);
      if(!live())return;if(!response.ok||data?.enrollmentId!==enrollmentId)throw new Error(data?.message||'تعذر حفظ سجل الدورة.');
      await openPlan(enrollmentId);
    }catch(error){if(live()){message.textContent=error instanceof Error?error.message:'تعذر الحفظ.';if(!form.querySelector('[data-plan-refresh]'))message.insertAdjacentHTML('afterend','<button type="button" data-plan-refresh>تحديث الخطة</button>')}}
    finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
  });
  let requestedMode='student',scheduleVersion=0;
  const scheduleCurrent=(version,session)=>version===scheduleVersion&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated()&&section.dataset.trainingMode==='professional-schedule';
  const scheduleAuthorized=async(version,session)=>{const fn=window.HydrolandPortalAccess?.authorizeRole;return typeof fn==='function'&&await fn('instructor',{sessionVersion:session,isCurrent:()=>scheduleCurrent(version,session)})&&scheduleCurrent(version,session)};
  const scheduleDate=value=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));
  async function loadProfessionalEarnings(){
    const list=section.querySelector('[data-training-list]');section.dataset.trainingMode='professional-earnings';
    section.querySelector('.hl-training-head h3').textContent='الإيرادات';section.querySelector('.hl-training-head span').textContent='استحقاقاتك التدريبية فقط — لا تعرض حسابات العملاء أو المنصة';
    list.innerHTML='<p>جارٍ تحميل الاستحقاقات...</p>';
    try{const response=await auth.authorizedFetch('/training/professional/me/earnings'),data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||'تعذر تحميل الاستحقاقات');
      const sar=minor=>(Number(minor||0)/100).toLocaleString('ar-SA',{style:'currency',currency:'SAR'});
      const entries=Array.isArray(data?.entries)?data.entries:[];
      list.innerHTML=`<div class="hl-role-tiles"><article><small>قيد الاعتماد</small><b>${sar(data?.totals?.pendingMinor)}</b></article><article><small>معتمد</small><b>${sar(data?.totals?.approvedMinor)}</b></article><article><small>تمت التسوية</small><b>${sar(data?.totals?.settledMinor)}</b></article></div>`+(entries.length?entries.map(item=>`<article class="hl-course"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${new Date(item.createdAt).toLocaleDateString('ar-SA')}</small></div><span>${sar(item.amountMinor)} · ${esc(item.status)}</span></div></article>`).join(''):'<p>لا توجد استحقاقات تدريبية مسجلة حتى الآن.</p>');
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل الاستحقاقات')}</p>`;}
  }
  async function loadProfessionalCertificates(){
    const list=section.querySelector('[data-training-list]'),version=++certificateVersion,session=auth?.getSessionVersion?.();section.dataset.trainingMode='professional-certificates';
    section.querySelector('.hl-training-head h3').textContent='الشهادات';section.querySelector('.hl-training-head span').textContent='توصية المدرب ثم اعتماد مستقل قبل الإصدار';
    list.innerHTML='<p>جارٍ تحميل حالة الشهادات...</p>';
    try{
      if(!await certificateAuthorized(version,session))return;
      const response=await auth.authorizedFetch('/training/professional/me/certificates'),rows=await response.json().catch(()=>null);if(!certificateCurrent(version,session))return;if(!response.ok||!Array.isArray(rows))throw new Error(rows?.message||'تعذر تحميل الشهادات');
      const states={RECOMMENDED:'بانتظار مراجعة الإدارة',APPROVED:'معتمد',REJECTED:'مرفوض',REVOKED:'ملغى'};
      list.innerHTML=rows.length?rows.map(item=>`<article class="hl-course" data-certificate-record="${esc(item.trainingRecordId)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')}</small></div><span>${esc(item.certificate?(states[item.certificate.status]||item.certificate.status):(item.readyForRecommendation?'جاهز للتوصية':'غير مكتمل'))}</span></div>${item.readyForRecommendation&&!item.certificate?'<details><summary>توصية المدرب بالشهادة</summary><form data-certificate-recommend-form><fieldset><p>التوصية وحدها لا تصدر شهادة. القرار لمراجع مستقل.</p><label><input type="checkbox" name="reviewed" required>راجعت اكتمال سجل التدريب قبل التوصية</label><button type="submit" data-certificate-recommend>إرسال توصية الاعتماد</button></fieldset><p data-certificate-feedback role="status"></p></form></details>':''}${item.certificate?.reviewReason?`<p>ملاحظات الإدارة: ${esc(item.certificate.reviewReason)}</p>`:''}${item.certificate?.certificateNumber?`<small>رقم الشهادة الداخلية: ${esc(item.certificate.certificateNumber)}</small>`:''}</article>`).join(''):'<p>لا توجد سجلات تدريب مرتبطة بك.</p>';
    }catch(error){if(certificateCurrent(version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الشهادات')}</p>`;}
  }
  section.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-certificate-recommend-form]'))return;event.preventDefault();if(form.dataset.busy||!form.elements.reviewed.checked)return;
    const version=certificateVersion,session=auth?.getSessionVersion?.(),id=form.closest('[data-certificate-record]').dataset.certificateRecord,live=()=>certificateCurrent(version,session)&&form.isConnected;
    form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
    try{
      if(!await certificateAuthorized(version,session)||!live())return;
      const response=await auth.authorizedFetch('/training/professional/me/records/'+encodeURIComponent(id)+'/certificate-recommendation',{method:'POST'}),data=await response.json().catch(()=>null);
      if(!live())return;if(!response.ok||data?.trainingRecordId!==id)throw new Error(data?.message||'تعذر إرسال التوصية');await loadProfessionalCertificates();
    }catch(error){if(live())form.querySelector('[data-certificate-feedback]').textContent=error.message||'تعذر إرسال التوصية';}
    finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
  });
  async function loadProfessionalSkills(){
    const list=section.querySelector('[data-training-list]');section.dataset.trainingMode='professional-skills';
    section.querySelector('.hl-training-head h3').textContent='تقييم المهارات';section.querySelector('.hl-training-head span').textContent='مهارات الطلاب المعيّنين لك فقط';
    list.innerHTML='<p>جارٍ تحميل المهارات...</p>';
    try{
      const response=await auth.authorizedFetch('/training/professional/me/skills'),rows=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(rows?.message||'تعذر تحميل المهارات');
      list.innerHTML=(Array.isArray(rows)&&rows.length)?rows.map(item=>`<article class="hl-course" data-professional-skill="${esc(item.id)}"><div class="hl-course-top"><div><b>${esc(item.name)}</b><small>${esc(item.courseCode)} · ${esc(item.student?.displayName||'طالب')} · ${esc(item.stageType)}</small></div><span>${esc(item.status)}</span></div>${item.canAssess===false?'<p>السجل مغلق أو موقوف؛ التقييم محفوظ للعرض فقط.</p>':'<div class="hl-member-actions"><button type="button" data-skill-status="IN_PROGRESS">قيد التقييم</button><button type="button" data-skill-status="NEEDS_REVIEW">يحتاج مراجعة</button><button type="button" data-skill-status="COMPETENT">متقن</button></div>'}</article>`).join(''):'<p>لا توجد مهارات بانتظار التقييم.</p>';
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل المهارات')}</p>`;}
  }
  async function loadProfessionalSchedule(){
    const list=section.querySelector('[data-training-list]'),version=++scheduleVersion,session=auth?.getSessionVersion?.();
    section.dataset.trainingMode='professional-schedule';
    section.querySelector('.hl-training-head h3').textContent='الجدول الزمني والحضور';
    section.querySelector('.hl-training-head span').textContent='جلساتك المعيّنة لك · الأوقات بتوقيت الرياض';
    list.innerHTML='<p>جارٍ تحميل جدولك...</p>';
    try{
      if(!(await scheduleAuthorized(version,session))){if(scheduleCurrent(version,session))list.innerHTML='<p>صلاحية المدرب غير متاحة. حدّث حسابك.</p>';return}
      const response=await auth.authorizedFetch('/training/professional/me/schedule'),rows=await response.json().catch(()=>null);
      if(!scheduleCurrent(version,session))return;
      if(!response.ok||!Array.isArray(rows))throw new Error(rows?.message||'تعذر تحميل الجدول');
      list.innerHTML=rows.length?rows.map(item=>`<article class="hl-course" data-professional-session="${esc(item.id)}" data-revision="${esc(item.updatedAt)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')} · ${esc(scheduleDate(item.startsAt))}</small></div><span>${esc(label(item.status))}</span></div><div class="hl-member-actions">${item.updatedAt&&item.actions?.includes('OPEN')?'<button type="button" data-attendance-action="OPEN">فتح الحضور</button>':''}${item.updatedAt&&item.actions?.includes('INSTRUCTOR_CHECK_IN')?'<button type="button" data-attendance-action="INSTRUCTOR_CHECK_IN">تسجيل حضور المدرب</button>':''}</div><small>حضور المدرب: ${item.attendance?.instructorCheckedIn?'مسجل':'غير مسجل'} · حضور الطالب: ${item.attendance?.studentCheckedIn?'مسجل':'غير مسجل'}</small></article>`).join(''):'<p>لا توجد جلسات مكلّفة لك حاليًا.</p>';
    }catch(error){if(scheduleCurrent(version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الجدول')}</p><button type="button" data-training-schedule-refresh>تحديث الجدول</button>`;}
  }
  async function loadProfessional(){
    const list=section.querySelector('[data-training-list]');
    list.innerHTML='<p>جارٍ تحميل الدورات والطلاب المكلفين لك...</p>';
    try{
      const response=await auth.authorizedFetch('/training/professional/me/assignments');
      const rows=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(rows?.message||'تعذر تحميل دورات المدرب');
      const enrollments=Array.isArray(rows)?rows:[];
      const active=enrollments.filter(x=>x.status==='ACTIVE').length;
      const completed=enrollments.filter(x=>x.status==='COMPLETED').length;
      const students=new Set(enrollments.map(x=>x.student?.displayName).filter(Boolean));
      const progresses=enrollments.map(x=>Number(x.record?.progressPercent||0));
      section.querySelector('.hl-training-head h3').textContent='إدارة الدورات والطلاب';
      section.querySelector('.hl-training-head span').textContent='التكليفات المرتبطة بحسابك المهني فقط';
      section.querySelector('[data-training-count]').textContent=String(enrollments.length);
      section.querySelector('[data-training-active]').textContent=String(active);
      section.querySelector('[data-training-completed]').textContent=String(completed);
      section.querySelector('[data-training-progress]').textContent=(progresses.length?Math.round(progresses.reduce((a,b)=>a+b,0)/progresses.length):0)+'%';
      list.innerHTML=enrollments.length?enrollments.map(item=>{
        const progress=Math.max(0,Math.min(100,Number(item.record?.progressPercent||0)));
        const sessions=Array.isArray(item.record?.sessions)?item.record.sessions:[];
        const next=sessions.find(x=>['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS'].includes(x.status));
        return `<article class="hl-course" data-professional-enrollment="${esc(item.enrollmentId)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')} · ${esc(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${next?'الجلسة القادمة: '+new Date(next.startsAt).toLocaleString('ar-SA'):'لا توجد جلسة قادمة'}</small><button type="button" data-training-plan="${esc(item.enrollmentId)}">خطة التدريب وإتمام الدورة</button></article>`;
      }).join(''):'<p>لا توجد دورات أو طلاب مكلفون لك حاليًا.</p>';
      section.dataset.trainingMode='professional';section.dataset.professionalStudents=String(students.size);
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل دورات المدرب')}</p>`;}
  }

  async function load(mode){
    scheduleVersion++;planVersion++;certificateVersion++;planEnrollment=null;section.querySelector('.hl-training-grid').hidden=false;
    if(mode)requestedMode=mode;
    const instructorPortal=document.querySelector('.hl-role-dashboard[data-role="instructor"]');
    if(!mode&&instructorPortal&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor')requestedMode='instructor';
    mode=requestedMode;
    const list=section.querySelector('[data-training-list]');
    if(!auth?.isAuthenticated()){list.innerHTML='<p>سجل الدخول لعرض بيانات التدريب.</p>';return;}
    if(mode==='instructor'){section.dataset.trainingMode='professional';return loadProfessional();}
    if(mode==='instructor-schedule')return loadProfessionalSchedule();
    if(mode==='instructor-skills')return loadProfessionalSkills();
    if(mode==='instructor-certificates')return loadProfessionalCertificates();
    if(mode==='instructor-earnings')return loadProfessionalEarnings();
    section.querySelector('.hl-training-head h3').textContent='مركز التدريب والدورات';
    section.querySelector('.hl-training-head span').textContent='سجلك التدريبي المباشر';
    section.dataset.trainingMode='student';
    list.innerHTML='<p>جارٍ تحميل السجل التدريبي...</p>';
    try{
      const response=await auth.authorizedFetch('/training/mine/enrollments');
      const rows=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(rows?.message||'تعذر تحميل بيانات التدريب');
      const enrollments=Array.isArray(rows)?rows:[];
      const active=enrollments.filter(x=>x.status==='ACTIVE').length;
      const completed=enrollments.filter(x=>x.status==='COMPLETED').length;
      const progresses=enrollments.map(x=>Number(x.record?.progressPercent||0));
      const average=progresses.length?Math.round(progresses.reduce((a,b)=>a+b,0)/progresses.length):0;
      section.querySelector('[data-training-count]').textContent=String(enrollments.length);
      section.querySelector('[data-training-active]').textContent=String(active);
      section.querySelector('[data-training-completed]').textContent=String(completed);
      section.querySelector('[data-training-progress]').textContent=average+'%';
      list.innerHTML=enrollments.length?enrollments.map(item=>{const progress=Math.max(0,Math.min(100,Number(item.record?.progressPercent||0)));return `<article class="hl-course"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${item.instructorAccountId?'تم تعيين المدرب':'بانتظار تعيين المدرب'}</small></article>`;}).join(''):'<p>لا توجد دورات مسجلة على حسابك حتى الآن.</p>';
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل بيانات التدريب')}</p>`;}
  }
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-hl-action="training"],[data-training-open]');if(!button)return;event.preventDefault();section.scrollIntoView({behavior:'smooth',block:'start'});if(!auth?.isAuthenticated()){const list=section.querySelector('[data-training-list]');if(list)list.innerHTML='<p>سجل الدخول لعرض بيانات التدريب.</p>';return}const instructor=Boolean(button.closest?.('.hl-role-dashboard[data-role="instructor"]'));load(instructor?'instructor':undefined);});
  section.addEventListener('click',async event=>{
    const plan=event.target.closest?.('[data-training-plan]');if(plan){await openPlan(plan.dataset.trainingPlan);return}
    if(event.target.closest?.('[data-plan-back]')){await load('instructor');return}
    if(event.target.closest?.('[data-plan-refresh]')){if(planEnrollment)await openPlan(planEnrollment);return}
    if(event.target.closest?.('[data-training-schedule-refresh]')){await loadProfessionalSchedule();return}
    const skillButton=event.target.closest?.('[data-skill-status]');
    if(skillButton){
      const article=skillButton.closest('[data-professional-skill]'),id=article?.dataset.professionalSkill;if(!id)return;
      skillButton.disabled=true;
      try{const response=await auth.authorizedFetch('/training/skills/'+encodeURIComponent(id)+'/assessment',{method:'PATCH',body:JSON.stringify({status:skillButton.dataset.skillStatus})});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message||'تعذر حفظ التقييم')}await loadProfessionalSkills();}
      catch(error){skillButton.disabled=false;section.querySelector('[data-training-list]').insertAdjacentHTML('afterbegin',`<p role="alert">${esc(error instanceof Error?error.message:'تعذر حفظ التقييم')}</p>`);}
      return;
    }
    const button=event.target.closest?.('[data-attendance-action]');if(!button||button.disabled)return;
    const article=button.closest('[data-professional-session]'),id=article?.dataset.professionalSession;if(!id)return;
    const version=scheduleVersion,session=auth?.getSessionVersion?.(),live=()=>scheduleCurrent(version,session)&&article.isConnected;
    button.disabled=true;
    try{
      if(!(await scheduleAuthorized(version,session))||!live()){if(live())section.querySelector('[data-training-list]').innerHTML='<p>صلاحية المدرب غير متاحة. حدّث حسابك.</p>';return}
      const response=await auth.authorizedFetch('/training/professional/me/sessions/'+encodeURIComponent(id)+'/attendance',{method:'PATCH',body:JSON.stringify({action:button.dataset.attendanceAction,expectedUpdatedAt:article.dataset.revision})});
      const body=await response.json().catch(()=>null);if(!live())return;
      if(!response.ok)throw new Error(body?.message||'تعذر تحديث الحضور');
      await loadProfessionalSchedule();
    }catch(error){if(live())article.insertAdjacentHTML('beforeend',`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحديث الحضور')}</p><button type="button" data-training-schedule-refresh>تحديث الجدول</button>`);}
    finally{button.disabled=false}
  });
  document.addEventListener('hydroland:session-cleared',()=>{scheduleVersion++;planVersion++;certificateVersion++;planEnrollment=null;if(['professional-schedule','professional-plan','professional-certificates'].includes(section.dataset.trainingMode))section.querySelector('[data-training-list]').textContent='سجل الدخول لعرض بيانات التدريب.'});
  document.addEventListener('hydroland:role-changed',()=>{if(section.dataset.trainingMode==='professional-certificates'&&window.HydrolandPortalAccess?.getCurrentRole?.()!=='instructor'){certificateVersion++;section.querySelector('[data-training-list]').textContent=''}});
  document.addEventListener('hydroland:auth-changed',()=>load(requestedMode));
  window.HydrolandTraining={reload:mode=>load(mode)};
  setTimeout(load,0);
})();
