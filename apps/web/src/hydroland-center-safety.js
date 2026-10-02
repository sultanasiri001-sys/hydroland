(()=>{
  const auth=()=>window.HydrolandAuth;
  const access=()=>window.HydrolandPortalAccess;
  let section=null,viewVersion=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
  const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA')};
  const clear=()=>{viewVersion++;section?.remove();section=null};
  const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
  async function authorize(host,version,session){
    if(!current(host,version,session))return false;
    try{const response=await auth().authorizedFetch('/me'),body=await response.json().catch(()=>null);if(!current(host,version,session))return false;if(!response.ok||!body||typeof body!=='object'||Array.isArray(body)){clear();return false}const roles=Array.isArray(body.roleAssignments)?body.roleAssignments:Array.isArray(body.roles)?body.roles:[];window.HydrolandProfileData={...(window.HydrolandProfileData||{}),profile:{...body,roles}};if(!eligible()){clear();access()?.clearProtectedPortal?.();return false}return true}catch{if(current(host,version,session))clear();return false}
  }
  const ensure=()=>{
    if(section?.isConnected)return section;
    section=document.createElement('section');section.className='hl-center-safety';section.id='hl-center-safety';section.hidden=true;
    section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>السلامة</h2><p>عرض سجلات رحلات المركز فقط؛ الاعتماد وتغيير الحالة عبر مسار المراجعة المختص.</p></div></header><div data-center-safety aria-live="polite"></div>';
    section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-safety-retry]'))void open()});
    document.getElementById('main')?.prepend(section);return section;
  };
  async function open(){
    if(!eligible()){clear();return;}
    const host=ensure(),list=host.querySelector('[data-center-safety]');
    const version=++viewVersion,session=auth().getSessionVersion();
    host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل سجلات السلامة...</p>';
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/safety');
      const data=await response.json().catch(()=>null);
      if(!current(host,version,session))return;
      if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض سجلات هذا المركز.':data?.message||'تعذر تحميل السلامة');
      if(!Array.isArray(data?.checklists)||!Array.isArray(data?.incidents))throw new Error('استجابة سجلات السلامة غير مكتملة. أعد المحاولة.');
      const checks=data.checklists,incidents=data.incidents;
      list.innerHTML=`<p>قوائم الفحص: ${checks.length} · الحوادث: ${incidents.length}</p><h3>قوائم الفحص</h3>`+
        (checks.length?checks.map(row=>`<article class="hl-course" data-center-checklist="${esc(row.id)}"><div class="hl-course-top"><b>${esc(row.trip?.title||'رحلة المركز')}</b><span>${esc(row.decision||'—')}</span></div><small>آخر تحديث: ${esc(date(row.decidedAt||row.updatedAt))}</small>${row.notes?`<p>${esc(row.notes)}</p>`:''}</article>`).join(''):'<p>لا توجد قوائم فحص مرتبطة برحلات المركز.</p>')+
        '<h3>الحوادث</h3>'+(incidents.length?incidents.map(row=>`<article class="hl-course" data-center-incident="${esc(row.id)}"><div class="hl-course-top"><b>${esc(row.title)}</b><span>${esc(row.severity)} · ${esc(row.status)}</span></div><small>${esc(row.trip?.title||'رحلة المركز')} · ${esc(row.locationName||'')} · ${esc(date(row.createdAt))}</small></article>`).join(''):'<p>لا توجد حوادث مرتبطة برحلات المركز.</p>');
    }catch(error){
      if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل السلامة')}</p><button type="button" data-center-safety-retry>إعادة المحاولة</button>`;
    }finally{if(current(host,version,session))list.removeAttribute('aria-busy');}
  }
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
  window.HydrolandCenterSafety=Object.freeze({open});
})();
