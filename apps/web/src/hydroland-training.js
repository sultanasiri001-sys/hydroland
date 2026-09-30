(()=>{
  const auth=window.HydrolandAuth;
  const host=document.querySelector('.training')||document.querySelector('#training')||document.querySelector('.courses');
  if(!host||document.querySelector('.hl-training'))return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const section=document.createElement('section');section.className='hl-training';
  section.innerHTML=`<header class="hl-training-head"><div><small>HYDROLAND LEARNING</small><h3>مركز التدريب والدورات</h3></div><span>سجلك التدريبي المباشر</span></header><div class="hl-training-grid"><article class="hl-training-card"><small>دوراتي</small><b data-training-count>—</b></article><article class="hl-training-card"><small>دورات نشطة</small><b data-training-active>—</b></article><article class="hl-training-card"><small>دورات مكتملة</small><b data-training-completed>—</b></article><article class="hl-training-card"><small>متوسط التقدم</small><b data-training-progress>—</b></article></div><div class="hl-training-main"><section class="hl-training-panel"><h4>مساري التدريبي</h4><div class="hl-course-list" data-training-list><p>سجل الدخول لعرض بيانات التدريب.</p></div></section></div>`;
  host.insertAdjacentElement('afterend',section);

  const label=status=>({PENDING:'بانتظار التفعيل',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي'}[status]||status||'—');
  async function loadProfessional(){
    const list=section.querySelector('[data-training-list]');
    list.innerHTML='<p>جارٍ تحميل الدورات والطلاب المكلفين لك...</p>';
    try{
      const response=await auth.authorizedFetch('/training/professional/enrollments');
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
        return `<article class="hl-course" data-professional-enrollment="${esc(item.id)}"><div class="hl-course-top"><div><b>${esc(item.courseCode)}</b><small>${esc(item.student?.displayName||'طالب')} · ${esc(label(item.status))}</small></div><span>${progress}%</span></div><div class="hl-progress"><i style="width:${progress}%"></i></div><small>${next?'الجلسة القادمة: '+new Date(next.startsAt).toLocaleString('ar-SA'):'لا توجد جلسة قادمة'}</small></article>`;
      }).join(''):'<p>لا توجد دورات أو طلاب مكلفون لك حاليًا.</p>';
      section.dataset.trainingMode='professional';section.dataset.professionalStudents=String(students.size);
    }catch(error){list.innerHTML=`<p>${esc(error instanceof Error?error.message:'تعذر تحميل دورات المدرب')}</p>`;}
  }

  async function load(mode){
    const list=section.querySelector('[data-training-list]');
    if(!auth?.isAuthenticated()){list.innerHTML='<p>سجل الدخول لعرض بيانات التدريب.</p>';return;}
    if(mode==='instructor')return loadProfessional();
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
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-hl-action="training"],[data-training-open]');if(!button)return;event.preventDefault();section.scrollIntoView({behavior:'smooth',block:'start'});if(!auth?.isAuthenticated()){const list=section.querySelector('[data-training-list]');if(list)list.innerHTML='<p>سجل الدخول لعرض بيانات التدريب.</p>';return}load();});
  document.addEventListener('hydroland:auth-changed',load);
  window.HydrolandTraining={reload:load};
  setTimeout(load,0);
})();
