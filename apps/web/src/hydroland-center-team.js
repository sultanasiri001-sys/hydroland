(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0,lastMode='team';
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-team';section.id='hl-center-team';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2 data-center-team-title>الطاقم</h2><p data-center-team-description>أعضاء المركز وحالة عضويتهم.</p></div></header><div class="hl-member-actions"><button type="button" data-center-team-mode="team">الطاقم</button><button type="button" data-center-team-mode="professionals">محترفو الغوص</button></div><div data-center-team-list aria-live="polite"></div>';section.addEventListener('click',event=>{const mode=event.target.closest?.('[data-center-team-mode]')?.dataset.centerTeamMode;if(mode)void open(mode);if(event.target.closest?.('[data-center-team-retry]'))void open(lastMode)});document.getElementById('main')?.prepend(section);return section};
 async function open(mode='team'){
   mode=mode==='professionals'?'professionals':'team';lastMode=mode;if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-team-list]'),version=++viewVersion,session=auth().getSessionVersion?.(),current=()=>version===viewVersion&&host.isConnected&&eligible()&&session===auth()?.getSessionVersion?.();
   host.querySelector('[data-center-team-title]').textContent=mode==='professionals'?'محترفو الغوص':'الطاقم';
   host.querySelector('[data-center-team-description]').textContent=mode==='professionals'?'محترفو الغوص النشطون المرتبطون بالمركز وتكليفاتهم التدريبية.':'أعضاء المركز وحالة عضويتهم الفعلية.';
   host.querySelectorAll('[data-center-team-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.centerTeamMode===mode)));
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ التحميل...</p>';
   try{const response=await auth().authorizedFetch(mode==='professionals'?'/center/me/professionals':'/center/me/team'),rows=await response.json().catch(()=>null);if(!current())return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض أعضاء هذا المركز.':rows?.message||'تعذر التحميل');if(!Array.isArray(rows))throw new Error('استجابة أعضاء المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=rows.length?rows.map((row,index)=>`<article class="hl-course" data-center-team-member="${index}"><div class="hl-course-top"><div><b>${esc(row.displayName||row.person?.displayName||'عضو المركز')}</b><small>${esc(row.headline||row.person?.headline||row.role||'عضو المركز')}</small></div><span>${esc(row.status||row.professional?.instructorStatus||'ACTIVE')}</span></div><small>الشهادات الموثقة: ${count(row.verifiedCredentials??row.professional?.verifiedCredentials)}${row.assignedTrainingCount!==undefined?' · التكليفات التدريبية: '+count(row.assignedTrainingCount):''}</small></article>`).join(''):'<p>لا توجد سجلات في هذا القسم حاليًا.</p>'}
   catch(error){if(current())list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر التحميل')}</p><button type="button" data-center-team-retry>إعادة المحاولة</button>`}
   finally{if(current())list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterTeam=Object.freeze({open});
})();