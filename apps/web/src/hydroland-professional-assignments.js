(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("professional-assignments", {
  "قيد الانتظار": "Pending",
  "نشط": "Active",
  "موقوف": "Suspended",
  "مكتمل": "Completed",
  "ملغي": "Cancelled",
  "لم يبدأ": "Not started",
  "قيد التنفيذ": "In progress",
  "متأخر": "Overdue",
  "DIVE PROFESSIONALS · محترفي الغوص": "DIVE PROFESSIONALS",
  "الدورات والطلاب المعيّنون لك": "Courses and students assigned to you",
  "العودة للوحة": "Back to dashboard",
  "جارٍ التحميل...": "Loading...",
  " دورة · ": " courses · ",
  " طالب · ": " students · ",
  " تسجيل": " enrollments",
  "جلسة مرتبطة": "Linked session",
  "طالب": "Student",
  "لا توجد دورات أو طلاب معيّنون لك حاليًا.": "No courses or students are currently assigned to you.",
  "جارٍ تحميل الدورات والطلاب...": "Loading courses and students...",
  "تعذر تحميل الدورات والطلاب. أعد المحاولة.": "Could not load courses and students. Try again.",
  ".hl-role-dashboard[data-role=\"instructor\"] [data-action-label=\"إدارة الطلاب\"]": ".hl-role-dashboard[data-role=\"instructor\"] [data-action-label=\"إدارة الطلاب\"]",
  "{0} دورة · {1} طالب · {2} تسجيل": "{0} courses · {1} students · {2} enrollments",
  "دورة ·": "courses ·",
  "طالب ·": "students ·",
  "تسجيل": "enrollments"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const auth=()=>window.HydrolandAuth;
  const esc=value=>window.HydrolandUI?.esc?.(value)??String(value??'');
  let version=0,section=null;
  const statusLabel=value=>({PENDING:'قيد الانتظار',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي',NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التنفيذ',DELAYED:'متأخر'}[value]||value||'—');
  const ensure=()=>{
    if(section?.isConnected)return section;
    section=document.createElement('section');section.className='hl-professional-assignments hl-workspace-hidden';section.hidden=true;
    uiLocale.setHTML(section, uiLocale.html`<header><div><small>DIVE PROFESSIONALS · محترفي الغوص</small><h2>الدورات والطلاب المعيّنون لك</h2></div><button type="button" data-professional-close>العودة للوحة</button></header><div data-professional-summary></div><div data-professional-list><p>جارٍ التحميل...</p></div>`);
    document.getElementById('main')?.prepend(section);
    section.querySelector('[data-professional-close]').addEventListener('click',()=>{const d=document.querySelector('.hl-role-dashboard[data-role="instructor"]');if(d)window.HydrolandWorkspaceUI?.show?.(d)});
    return section;
  };
  const render=rows=>{
    const host=ensure(),list=host.querySelector('[data-professional-list]'),summary=host.querySelector('[data-professional-summary]');
    const students=new Set(rows.map(row=>row.student?.displayName)).size,courses=new Set(rows.map(row=>row.courseCode)).size;
    uiLocale.setText(summary, ...["{0} دورة · {1} طالب · {2} تسجيل", [String(courses), String(students), String(rows.length)]]);
    uiLocale.setHTML(list, rows.length?rows.map(row=>uiLocale.html`<article class="hl-course"><div class="hl-course-top"><div><b>${esc(row.courseCode)}</b><small>${esc(row.student?.displayName||uiLocale.t('طالب'))} · ${uiLocale.label(statusLabel(row.status))}</small></div><span>${Number(row.record?.progressPercent||0)}%</span></div><div class="hl-progress"><i style="width:${Math.max(0,Math.min(100,Number(row.record?.progressPercent||0)))}%"></i></div><small>${uiLocale.label(statusLabel(row.record?.status))} · ${row.record?.sessions?.length||0} جلسة مرتبطة</small></article>`).join(''):uiLocale.html`<p>لا توجد دورات أو طلاب معيّنون لك حاليًا.</p>`);
  };
  async function open(){
    const role='instructor',access=window.HydrolandPortalAccess;if(!auth()?.isAuthenticated?.()||!access?.roleAllowed?.(role))return;
    const freshness=window.HydrolandPortalFreshness;if(typeof freshness?.refresh!=='function')return;await freshness.refresh();if(!auth()?.isAuthenticated?.()||!access.roleAllowed(role))return;
    const host=ensure(),v=++version,session=auth().getSessionVersion?.();window.HydrolandWorkspaceUI?.refresh?.();window.HydrolandWorkspaceUI?.show?.(host);uiLocale.setHTML(host.querySelector('[data-professional-list]'), uiLocale.html`<p>جارٍ تحميل الدورات والطلاب...</p>`);
    try{const response=await auth().authorizedFetch('/training/professional/me/assignments'),body=await response.json().catch(()=>[]);if(!response.ok)throw new Error();if(v!==version||session!==auth().getSessionVersion?.()||!auth().isAuthenticated?.()||!access.roleAllowed(role))return;render(Array.isArray(body)?body:[])}
    catch{if(v===version&&host.isConnected)uiLocale.setHTML(host.querySelector('[data-professional-list]'), uiLocale.html`<p>تعذر تحميل الدورات والطلاب. أعد المحاولة.</p>`)}
  }
  document.addEventListener('hydroland:session-cleared',()=>{version++;section?.remove();section=null});
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.()){version++;section?.remove();section=null}});
  document.addEventListener('click',event=>{const node=event.target.closest?.('.hl-role-dashboard[data-role="instructor"] [data-action-label="إدارة الطلاب"]');if(!node)return;event.preventDefault();event.stopImmediatePropagation();void open();},true);
  window.HydrolandProfessionalAssignments=Object.freeze({open});
})();
