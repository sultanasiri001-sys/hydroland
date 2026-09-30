(()=>{
  const auth=window.HydrolandAuth;
  const host=document.querySelector('.training')||document.querySelector('#training')||document.querySelector('.courses');
  if(!host||document.querySelector('.hl-training'))return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const section=document.createElement('section');section.className='hl-training';
  section.innerHTML=`<header class="hl-training-head"><div><small>HYDROLAND LEARNING</small><h3>مركز التدريب والدورات</h3></div><span>سجلك التدريبي المباشر</span></header><div class="hl-training-grid"><article class="hl-training-card"><small>دوراتي</small><b data-training-count>—</b></article><article class="hl-training-card"><small>دورات نشطة</small><b data-training-active>—</b></article><article class="hl-training-card"><small>دورات مكتملة</small><b data-training-completed>—</b></article><article class="hl-training-card"><small>متوسط التقدم</small><b data-training-progress>—</b></article></div><div class="hl-training-main"><section class="hl-training-panel"><h4>مساري التدريبي</h4><div class="hl-course-list" data-training-list><p>سجل الدخول لعرض بيانات التدريب.</p></div></section></div>`;
  host.insertAdjacentElement('afterend',section);

  const label=status=>({PENDING:'بانتظار التفعيل',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي'}[status]||status||'—');
  let requestedMode='student';
  async function loadProfessionalSkills(){
    const list=section.querySelector('[data-training-list]');section.dataset.trainingMode='professional-skills';
    section.querySelector('.hl-training-head h3').textContent='تقييم المهارات';section.querySelector('.hl-training-head span').textContent='مهارات الطلاب المعيّنين لك فقط';
    list.innerHTML='<p>جارٍ تحميل المهارات...</p>';
    try{
      const response=await auth.authorizedFetch('/training/professional/me/skills'),rows=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(rows?.message||'تعذر تحميل المهارات');
      list.innerHTML=(Array.isArray(rows)&&rows.length)?rows.map(item=>`<article class="hl-course" data-professional-skill="${esc(item.id)}"><div class="hl-course-top"><div><b>${esc(item.name)}</b><small>${esc(item.courseCode)} · ${esc(item.student?.displayName||'طالب')} · ${esc(item.stageType)}</small></div><span>${esc(item.status)}</span></div><div class="hl-member-actions"><button type="button" data-skill-status="IN_PROGRESS">قيد التقييم</button><button type="button" data-skill-status="NEEDS_REVIEW">يحتاج مراجعة</button><button type="button" data-skill-status="COMPETENT">متقن</button></div></article>`).join(''):'<p>لا توجد مهارات بانتظار التقييم.</p>';
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل المهارات')}</p>`;}
  }
  async function loadProfessionalSchedule(){
    const list=section.querySelector('[data-training-list]');
    section.dataset.trainingMode='professional-schedule';
    section.querySelector('.hl-training-head h3').textContent='الجدول الزمني والحضور';
    section.querySelector('.hl-training-head span').textContent='جلساتك التدريبية المعيّنة لك فقط';
    list.innerHTML='<p>جارٍ تحميل جدولك...</p>';
    try{
      const response=await auth.authorizedFetch('/training/professional/me/schedule');
      const rows=await response.json().catch(()=>[]);
      if(!response.ok)throw new Error(rows?.message||'تعذر تحميل الجدول');
      list.innerHTML=(Array.isArray(rows)&&rows.length)?rows.map(item=>`<article class="hl-course" data-professional-session="${esc(item.id)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')} · ${new Date(item.startsAt).toLocaleString('ar-SA')}</small></div><span>${esc(label(item.status))}</span></div><div class="hl-member-actions">${item.status==='SCHEDULED'?'<button type="button" data-attendance-action="OPEN">فتح الحضور</button>':''}${['CHECK_IN_OPEN','IN_PROGRESS'].includes(item.status)&&!item.attendance?.instructorCheckedIn?'<button type="button" data-attendance-action="INSTRUCTOR_CHECK_IN">تسجيل حضور المدرب</button>':''}</div><small>حضور المدرب: ${item.attendance?.instructorCheckedIn?'مسجل':'غير مسجل'} · حضور الطالب: ${item.attendance?.studentCheckedIn?'مسجل':'غير مسجل'}</small></article>`).join(''):'<p>لا توجد جلسات مكلّفة لك حاليًا.</p>';
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل الجدول')}</p>`;}
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
        return `<article class="hl-course" data-professional-enrollment="${esc(item.enrollmentId)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')} · ${esc(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${next?'الجلسة القادمة: '+new Date(next.startsAt).toLocaleString('ar-SA'):'لا توجد جلسة قادمة'}</small></article>`;
      }).join(''):'<p>لا توجد دورات أو طلاب مكلفون لك حاليًا.</p>';
      section.dataset.trainingMode='professional';section.dataset.professionalStudents=String(students.size);
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل دورات المدرب')}</p>`;}
  }

  async function load(mode){
    if(mode)requestedMode=mode;
    const instructorPortal=document.querySelector('.hl-role-dashboard[data-role="instructor"]');
    if(!mode&&instructorPortal&&window.HydrolandPortalAccess?.getCurrentRole?.()==='instructor')requestedMode='instructor';
    mode=requestedMode;
    const list=section.querySelector('[data-training-list]');
    if(!auth?.isAuthenticated()){list.innerHTML='<p>سجل الدخول لعرض بيانات التدريب.</p>';return;}
    if(mode==='instructor'){section.dataset.trainingMode='professional';return loadProfessional();}
    if(mode==='instructor-schedule')return loadProfessionalSchedule();
    if(mode==='instructor-skills')return loadProfessionalSkills();
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
    const skillButton=event.target.closest?.('[data-skill-status]');
    if(skillButton){
      const article=skillButton.closest('[data-professional-skill]'),id=article?.dataset.professionalSkill;if(!id)return;
      skillButton.disabled=true;
      try{const response=await auth.authorizedFetch('/training/skills/'+encodeURIComponent(id)+'/assessment',{method:'PATCH',body:JSON.stringify({status:skillButton.dataset.skillStatus})});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message||'تعذر حفظ التقييم')}await loadProfessionalSkills();}
      catch(error){skillButton.disabled=false;section.querySelector('[data-training-list]').insertAdjacentHTML('afterbegin',`<p role="alert">${esc(error instanceof Error?error.message:'تعذر حفظ التقييم')}</p>`);}
      return;
    }
    const button=event.target.closest?.('[data-attendance-action]');if(!button)return;
    const article=button.closest('[data-professional-session]'),id=article?.dataset.professionalSession;if(!id)return;
    button.disabled=true;
    try{
      const response=await auth.authorizedFetch('/training/professional/me/sessions/'+encodeURIComponent(id)+'/attendance',{method:'PATCH',body:JSON.stringify({action:button.dataset.attendanceAction})});
      if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message||'تعذر تحديث الحضور')}
      await loadProfessionalSchedule();
    }catch(error){button.disabled=false;const list=section.querySelector('[data-training-list]');list.insertAdjacentHTML('afterbegin',`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحديث الحضور')}</p>`);}
  });
  document.addEventListener('hydroland:auth-changed',()=>load(requestedMode));
  window.HydrolandTraining={reload:mode=>load(mode)};
  setTimeout(load,0);
})();
