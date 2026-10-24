(()=>{
  const auth=()=>window.HydrolandAuth;
  const esc=value=>window.HydrolandUI?.esc?.(value)??String(value??'');
  let version=0,section=null;
  const statusLabel=value=>({PENDING:'قيد الانتظار',ACTIVE:'نشط',SUSPENDED:'موقوف',COMPLETED:'مكتمل',CANCELLED:'ملغي',NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التنفيذ',DELAYED:'متأخر'}[value]||value||'—');
  const ensure=()=>{
    if(section?.isConnected)return section;
    section=document.createElement('section');section.className='hl-professional-assignments hl-workspace-hidden';section.hidden=true;
    section.innerHTML='<header><div><small>DIVE PROFESSIONALS · محترفي الغوص</small><h2>الدورات والطلاب المعيّنون لك</h2></div><button type="button" data-professional-close>العودة للوحة</button></header><div data-professional-summary></div><div data-professional-list><p>جارٍ التحميل...</p></div>';
    document.getElementById('main')?.prepend(section);
    section.querySelector('[data-professional-close]').addEventListener('click',()=>{const d=document.querySelector('.hl-role-dashboard[data-role="instructor"]');if(d)window.HydrolandWorkspaceUI?.show?.(d)});
    return section;
  };
  const render=rows=>{
    const host=ensure(),list=host.querySelector('[data-professional-list]'),summary=host.querySelector('[data-professional-summary]');
    const students=new Set(rows.map(row=>row.student?.displayName)).size,courses=new Set(rows.map(row=>row.courseCode)).size;
    summary.textContent=String(courses)+' دورة · '+String(students)+' طالب · '+String(rows.length)+' تسجيل';
    list.innerHTML=rows.length?rows.map(row=>`<article class="hl-course"><div class="hl-course-top"><div><b>${esc(row.courseCode)}</b><small>${esc(row.student?.displayName||'طالب')} · ${esc(statusLabel(row.status))}</small></div><span>${Number(row.record?.progressPercent||0)}%</span></div><div class="hl-progress"><i style="width:${Math.max(0,Math.min(100,Number(row.record?.progressPercent||0)))}%"></i></div><small>${esc(statusLabel(row.record?.status))} · ${row.record?.sessions?.length||0} جلسة مرتبطة</small></article>`).join(''):'<p>لا توجد دورات أو طلاب معيّنون لك حاليًا.</p>';
  };
  async function open(){
    const role='instructor',access=window.HydrolandPortalAccess;if(!auth()?.isAuthenticated?.()||!access?.roleAllowed?.(role))return;
    const freshness=window.HydrolandPortalFreshness;if(typeof freshness?.refresh!=='function')return;await freshness.refresh();if(!auth()?.isAuthenticated?.()||!access.roleAllowed(role))return;
    const host=ensure(),v=++version,session=auth().getSessionVersion?.();window.HydrolandWorkspaceUI?.refresh?.();window.HydrolandWorkspaceUI?.show?.(host);host.querySelector('[data-professional-list]').innerHTML='<p>جارٍ تحميل الدورات والطلاب...</p>';
    try{const response=await auth().authorizedFetch('/training/professional/me/assignments'),body=await response.json().catch(()=>[]);if(!response.ok)throw new Error();if(v!==version||session!==auth().getSessionVersion?.()||!auth().isAuthenticated?.()||!access.roleAllowed(role))return;render(Array.isArray(body)?body:[])}
    catch{if(v===version&&host.isConnected)host.querySelector('[data-professional-list]').innerHTML='<p>تعذر تحميل الدورات والطلاب. أعد المحاولة.</p>'}
  }
  document.addEventListener('hydroland:session-cleared',()=>{version++;section?.remove();section=null});
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.()){version++;section?.remove();section=null}});
  document.addEventListener('click',event=>{const node=event.target.closest?.('.hl-role-dashboard[data-role="instructor"] [data-action-label="إدارة الطلاب"]');if(!node)return;event.preventDefault();event.stopImmediatePropagation();void open();},true);
  window.HydrolandProfessionalAssignments=Object.freeze({open});
})();
