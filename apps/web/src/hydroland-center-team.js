(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0,lastMode='team';
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
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
 }
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-team';host.id='hl-center-team';host.hidden=true;
   host.innerHTML=`<header><div><small>DIVE CENTER · مركز الغوص</small><h2 data-center-team-title>الطاقم</h2><p data-center-team-description>أعضاء المركز وحالة عضويتهم.</p></div></header><div class="hl-member-actions"><button type="button" data-center-team-mode="team">الطاقم</button><button type="button" data-center-team-mode="professionals">محترفو الغوص</button></div><details><summary>دعوة عضو للمركز</summary><form data-center-team-invite><fieldset><label>البريد المسجل في المنصة<input type="email" name="email" required maxlength="254" autocomplete="off"></label><label>الدور داخل المركز<select name="role"><option value="STAFF">عضو فريق</option><option value="OPERATOR">مسؤول تشغيل</option><option value="INSTRUCTOR">مدرب غوص</option><option value="VIEWER">مشاهد</option></select></label><p>تظهر الدعوة في إشعارات صاحب الحساب، ولا تتفعل العضوية إلا بعد قبوله. دور المدرب يتطلب حساب محترف غوص نشطًا. العضوية لا تمنح صلاحيات الإدارة العليا.</p><button type="submit">إرسال الدعوة</button></fieldset><p data-invite-message role="status"></p></form></details><p data-team-feedback role="status"></p><div data-center-team-list aria-live="polite"></div>`;
   host.querySelector('[data-center-team-invite]').addEventListener('submit',invite);
   host.addEventListener('click',event=>{
     const mode=event.target.closest?.('[data-center-team-mode]')?.dataset.centerTeamMode;if(mode)void open(mode);
     if(event.target.closest?.('[data-center-team-retry]'))void open(lastMode);
     const button=event.target.closest?.('[data-team-cancel]');if(button)void cancelInvitation(host,button);
   });
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function invite(event){
   event.preventDefault();const form=event.currentTarget,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const payload=Object.fromEntries(new FormData(form)),version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-invite-message]');
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;message.textContent='جارٍ حفظ الدعوة...';
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/team/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok||!body?.id||body.status!=='PENDING')throw new Error(body?.message||'تعذر إرسال الدعوة. أعد المحاولة.');
     form.reset();message.textContent='';await open('team','تم حفظ الدعوة. العضوية بانتظار قبول صاحب الحساب من إشعاراته.');
   }catch(error){if(current(host,version,session))message.textContent=error instanceof Error?error.message:'تعذر إرسال الدعوة.'}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function cancelInvitation(host,button){
   if(button.disabled)return;
   const version=viewVersion,session=auth()?.getSessionVersion?.(),article=button.closest('[data-center-team-member]');
   const live=()=>current(host,version,session)&&article?.isConnected;button.disabled=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/team/'+encodeURIComponent(button.dataset.teamCancel)+'/cancel-invitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUpdatedAt:button.dataset.revision})}),body=await response.json().catch(()=>null);
     if(!live())return;if(!response.ok)throw new Error(body?.message||'تعذر إلغاء الدعوة.');await open('team','تم إلغاء الدعوة المعلقة.');
   }catch(error){if(live())article.querySelector('[data-team-error]').textContent=error instanceof Error?error.message:'تعذر إلغاء الدعوة.'}
   finally{button.disabled=false}
 }
 async function open(mode='team',notice=''){
   mode=mode==='professionals'?'professionals':'team';lastMode=mode;if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-team-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.querySelector('[data-center-team-title]').textContent=mode==='professionals'?'محترفو الغوص':'الطاقم';
   host.querySelector('[data-center-team-description]').textContent=mode==='professionals'?'محترفو الغوص النشطون المرتبطون بالمركز وتكليفاتهم التدريبية.':'أعضاء المركز وحالة عضويتهم الفعلية.';
   host.querySelector('[data-team-feedback]').textContent=notice;
   host.querySelectorAll('[data-center-team-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.centerTeamMode===mode)));
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ التحميل...</p>';
   try{if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch(mode==='professionals'?'/center/me/professionals':'/center/me/team'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض أعضاء هذا المركز.':rows?.message||'تعذر التحميل');if(!Array.isArray(rows))throw new Error('استجابة أعضاء المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=rows.length?rows.map((row,index)=>`<article class="hl-course" data-center-team-member="${index}"><div class="hl-course-top"><div><b>${esc(row.displayName||row.person?.displayName||'عضو المركز')}</b><small>${esc(row.headline||row.person?.headline||roles[row.role]||'عضو المركز')}</small>${row.role?`<small>دور المركز: ${esc(roles[row.role]||'غير معروف')}</small>`:''}</div><span>${esc(statuses[row.status||row.professional?.instructorStatus||'ACTIVE']||'غير معروف')}</span></div><small>الشهادات الموثقة: ${count(row.verifiedCredentials??row.professional?.verifiedCredentials)}${row.assignedTrainingCount!==undefined?' · التكليفات التدريبية: '+count(row.assignedTrainingCount):''}</small>${row.canCancelInvitation&&row.status==='PENDING'&&row.membershipId&&row.updatedAt?`<button type="button" data-team-cancel="${esc(row.membershipId)}" data-revision="${esc(row.updatedAt)}">إلغاء الدعوة</button>`:''}<p data-team-error role="alert"></p></article>`).join(''):'<p>لا توجد سجلات في هذا القسم حاليًا.</p>';
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر التحميل')}</p><button type="button" data-center-team-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterTeam=Object.freeze({open});
})();
