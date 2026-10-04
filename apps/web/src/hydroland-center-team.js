(()=>{
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
   host.innerHTML=`<header><div><small>DIVE CENTER · مركز الغوص</small><h2 data-center-team-title>الطاقم</h2><p data-center-team-description>أعضاء المركز وحالة عضويتهم.</p></div></header><div class="hl-member-actions"><button type="button" data-center-team-mode="team">الطاقم</button><button type="button" data-center-team-mode="professionals">محترفو الغوص</button><button type="button" data-center-team-mode="assignments">التكليفات التدريبية</button></div><details data-team-invitation><summary>دعوة عضو للمركز</summary><form data-center-team-invite><fieldset><label>البريد المسجل في المنصة<input type="email" name="email" required maxlength="254" autocomplete="off"></label><label>الدور داخل المركز<select name="role"><option value="STAFF">عضو فريق</option><option value="OPERATOR">مسؤول تشغيل</option><option value="INSTRUCTOR">مدرب غوص</option><option value="VIEWER">مشاهد</option></select></label><p>تظهر الدعوة في إشعارات صاحب الحساب، ولا تتفعل العضوية إلا بعد قبوله. دور المدرب يتطلب حساب محترف غوص نشطًا. العضوية لا تمنح صلاحيات الإدارة العليا.</p><button type="submit">إرسال الدعوة</button></fieldset><p data-invite-message role="status"></p></form></details><p data-team-feedback role="status"></p><div data-center-team-list aria-live="polite"></div>`;
   host.querySelector('[data-center-team-invite]').addEventListener('submit',invite);
   host.addEventListener('submit',event=>{if(event.target.matches('[data-team-manage]'))void manageMember(event);if(event.target.matches('[data-training-assign]'))void assignTraining(event)});
   host.addEventListener('change',event=>{
     const form=event.target.closest('[data-team-manage]');if(!form||event.target.name!=='action')return;
     const label=form.querySelector('[data-team-role-field]'),select=label.querySelector('select');
     label.hidden=select.disabled=event.target.value!=='CHANGE_ROLE';
   });
   host.addEventListener('click',event=>{
     const mode=event.target.closest?.('[data-center-team-mode]')?.dataset.centerTeamMode;if(mode)void open(mode);
     if(event.target.closest?.('[data-center-team-retry]'))void open(lastMode,'',lastMode==='assignments'?lastTrainingCursor:'');
     const next=event.target.closest?.('[data-training-page]');if(next)void open('assignments','',next.dataset.trainingPage);
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
 function managementForm(row){
   if(!row.membershipId||!row.updatedAt||!['ACTIVE','SUSPENDED'].includes(row.status)||!['OPERATOR','INSTRUCTOR','STAFF','VIEWER'].includes(row.role)||!row.canChangeRole)return '';
   const impact=count(row.openTrainingEnrollments)+count(row.openTrainingSessions);
   return `<details><summary>تعديل العضوية</summary><form data-team-manage="${esc(row.membershipId)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>الإجراء<select name="action" aria-label="الإجراء"><option value="CHANGE_ROLE">تغيير الدور</option>${row.canSuspend?'<option value="SUSPEND">إيقاف العضوية</option>':''}${row.canReactivate?'<option value="REACTIVATE">إعادة تفعيل العضوية</option>':''}</select></label><label data-team-role-field>الدور الجديد<select name="role">${['STAFF','OPERATOR','INSTRUCTOR','VIEWER'].map(role=>`<option value="${role}"${role===row.role?' selected':''}>${roles[role]}</option>`).join('')}</select></label><label>سبب التعديل<textarea name="reason" required maxlength="1000" rows="3"></textarea></label><p>التعديل يخص عضوية هذا المركز. الإيقاف يمنع الوصول التشغيلي ويحفظ السجلات. دور المدرب يتطلب حساب محترف غوص نشطًا.</p>${impact?`<p data-training-impact>التكليفات غير المنتهية: ${count(row.openTrainingEnrollments)} · الجلسات غير المنتهية: ${count(row.openTrainingSessions)}. عند إيقاف المدرب أو تغيير دوره، تبقى محفوظة وتحتاج متابعة إسنادها إلى مدرب مؤهل.</p>`:''}<button type="submit">حفظ التعديل</button></fieldset><p data-team-manage-message role="status"></p><button type="button" data-center-team-retry hidden>تحديث قائمة الطاقم</button></form></details>`;
 }
 async function manageMember(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const payload={...Object.fromEntries(new FormData(form)),expectedUpdatedAt:form.dataset.revision},version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-team-manage-message]');
   const live=()=>current(host,version,session)&&form.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;message.textContent='جارٍ حفظ التعديل...';form.querySelector('[data-center-team-retry]').hidden=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/team/'+encodeURIComponent(form.dataset.teamManage),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||body?.id!==form.dataset.teamManage||!['ACTIVE','SUSPENDED'].includes(body?.status)){
       form.querySelector('[data-center-team-retry]').hidden=response.status!==409;
       throw new Error(body?.message||'تعذر حفظ تعديل العضوية. أعد المحاولة.');
     }
     await open('team',payload.action==='SUSPEND'?'تم إيقاف العضوية في المركز.':payload.action==='REACTIVATE'?'تمت إعادة تفعيل العضوية في المركز.':'تم حفظ الدور الجديد داخل المركز.');
   }catch(error){if(live())message.textContent=error instanceof Error?error.message:'تعذر حفظ تعديل العضوية.'}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 const trainingStatuses={PENDING:'بانتظار البدء',ACTIVE:'نشطة',SUSPENDED:'موقوفة',COMPLETED:'مكتملة',CANCELLED:'ملغاة',SCHEDULED:'مجدولة',CHECK_IN_OPEN:'الحضور مفتوح',IN_PROGRESS:'جارية'};
 const trainingDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(date):'موعد غير متاح'};
 function assignmentForm(row,kind,instructors){
   if(!row.canAssign)return '<p>التكليف محفوظ للمتابعة؛ لا يمكن تغييره بعد انتهاء الدورة أو عند بدء الجلسة أو تسجيل حضورها.</p>';
   if(!instructors.length)return '<p>لا يوجد مدرب مؤهل للتكليف حاليًا. راجع عضويات الطاقم وحالة حسابات المدربين.</p>';
   return `<details><summary>${kind==='session'?'تغيير مدرب الجلسة':row.instructor?'تغيير مدرب الدورة':'إسناد مدرب للدورة'}</summary><form data-training-assign="${kind}" data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>المدرب الجديد<select name="instructorAccountId" aria-label="المدرب الجديد" required><option value="">اختر المدرب</option>${instructors.map(person=>`<option value="${esc(person.accountId)}">${esc(person.displayName)}</option>`).join('')}</select></label>${kind==='enrollment'?'<label class="hl-training-transfer"><input type="checkbox" name="transferUpcomingSessions" checked>نقل الجلسات القادمة المجدولة من المدرب السابق إلى المدرب الجديد</label><p>الجلسات المسندة لمدرب آخر تبقى كما هي. تُحفظ الجلسات المنتهية والتقييمات السابقة بأسماء أصحابها.</p>':'<p>يتغير مدرب هذه الجلسة فقط؛ يبقى موعدها ومدرب الدورة كما هما.</p>'}<label>سبب التكليف<textarea name="reason" required maxlength="1000" rows="3"></textarea></label><button type="submit">حفظ التكليف</button></fieldset><p data-training-message role="status"></p><button type="button" data-center-team-retry hidden>تحديث التكليفات</button></form></details>`;
 }
 function renderAssignments(data,cursor){
   const instructor=row=>`${esc(row.instructor?.displayName||'لم يُسند بعد')}${row.instructor&&!row.instructor.eligible?' · غير متاح لتكليف جديد':''}`;
   const rows=data.enrollments.map(row=>`<article class="hl-course hl-training-assignment" data-training-enrollment="${esc(row.id)}"><div class="hl-course-top"><div><h3>${esc(row.courseCode)}</h3><p>${esc(row.student?.displayName||'متدرب')}</p></div><span>${esc(trainingStatuses[row.status]||'غير معروف')}</span></div><p>مدرب الدورة: ${instructor(row)}</p>${assignmentForm(row,'enrollment',data.instructors)}<details><summary>الجلسات المسجلة (${count(row.record?.sessions?.length)})</summary>${row.record?.sessions?.length?row.record.sessions.map(session=>`<article class="hl-training-session" data-training-session="${esc(session.id)}"><h4>${esc(trainingDate(session.startsAt))}</h4><p>${esc(trainingStatuses[session.status]||'غير معروف')} · مدرب الجلسة: ${instructor(session)}</p>${assignmentForm(session,'session',data.instructors)}</article>`).join(''):'<p>لا توجد جلسات مسجلة لهذه الدورة حتى الآن.</p>'}</details></article>`).join('');
   return (rows||'<p>لا توجد دورات مسجلة مرتبطة بالمركز حتى الآن.</p>')+`<div class="hl-member-actions">${cursor?'<button type="button" data-training-page="">الصفحة الأولى</button>':''}${data.nextCursor?`<button type="button" data-training-page="${esc(data.nextCursor)}">الصفحة التالية</button>`:''}</div>`;
 }
 async function assignTraining(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-team');if(!host||!eligible()||form.dataset.busy)return;
   const kind=form.dataset.trainingAssign,fields=new FormData(form),payload={instructorAccountId:fields.get('instructorAccountId'),reason:fields.get('reason'),expectedUpdatedAt:form.dataset.revision};
   if(kind==='enrollment')payload.transferUpcomingSessions=fields.has('transferUpcomingSessions');
   const version=viewVersion,session=auth()?.getSessionVersion?.(),cursor=lastTrainingCursor,message=form.querySelector('[data-training-message]'),live=()=>current(host,version,session)&&form.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;message.textContent='جارٍ حفظ التكليف...';form.querySelector('[data-center-team-retry]').hidden=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     const response=await auth().authorizedFetch('/center/me/training/'+(kind==='enrollment'?'enrollments':'sessions')+'/'+encodeURIComponent(form.dataset.id)+'/instructor',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!live())return;
     if(!response.ok||body?.id!==form.dataset.id){form.querySelector('[data-center-team-retry]').hidden=response.status!==409;throw new Error(body?.message||'تعذر حفظ التكليف. أعد المحاولة.');}
     await open('assignments','تم حفظ التكليف.'+(kind==='enrollment'?' الجلسات القادمة المنقولة: '+count(body.transferredSessionCount)+'.':''),cursor);
   }catch(error){if(live())message.textContent=error instanceof Error?error.message:'تعذر حفظ التكليف.'}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function open(mode='team',notice='',cursor=''){
   mode=['professionals','assignments'].includes(mode)?mode:'team';lastMode=mode;if(mode==='assignments')lastTrainingCursor=cursor;if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-team-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.querySelector('[data-center-team-title]').textContent=mode==='assignments'?'التكليفات التدريبية':mode==='professionals'?'محترفو الغوص':'الطاقم';
   host.querySelector('[data-center-team-description]').textContent=mode==='assignments'?'إسناد دورات المركز وجلساته إلى المدربين المؤهلين. الأوقات بتوقيت الرياض.':mode==='professionals'?'محترفو الغوص النشطون المرتبطون بالمركز وتكليفاتهم التدريبية.':'أعضاء المركز وحالة عضويتهم الفعلية.';
   host.querySelector('[data-team-feedback]').textContent=notice;
   host.querySelector('[data-team-invitation]').hidden=mode==='assignments';
   host.querySelectorAll('[data-center-team-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.centerTeamMode===mode)));
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ التحميل...</p>';
   try{if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch(mode==='assignments'?'/center/me/training'+(cursor?'?cursor='+encodeURIComponent(cursor):''):mode==='professionals'?'/center/me/professionals':'/center/me/team'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض أعضاء هذا المركز.':rows?.message||'تعذر التحميل');if(mode==='assignments'){if(!rows||!Array.isArray(rows.enrollments)||!Array.isArray(rows.instructors))throw new Error('استجابة التكليفات غير مكتملة. أعد المحاولة.');list.innerHTML=renderAssignments(rows,cursor);return}if(!Array.isArray(rows))throw new Error('استجابة أعضاء المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=rows.length?rows.map((row,index)=>`<article class="hl-course" data-center-team-member="${index}"><div class="hl-course-top"><div><b>${esc(row.displayName||row.person?.displayName||'عضو المركز')}</b><small>${esc(row.headline||row.person?.headline||roles[row.role]||'عضو المركز')}</small>${row.role?`<small>دور المركز: ${esc(roles[row.role]||'غير معروف')}</small>`:''}</div><span>${esc(statuses[row.status||row.professional?.instructorStatus||'ACTIVE']||'غير معروف')}</span></div><small>الشهادات الموثقة: ${count(row.verifiedCredentials??row.professional?.verifiedCredentials)}${row.assignedTrainingCount!==undefined?' · التكليفات التدريبية: '+count(row.assignedTrainingCount):''}</small>${row.accountStatus&&row.accountStatus!=='ACTIVE'?'<p>الحساب غير نشط على المنصة؛ إعادة تفعيل عضوية المركز لا تفعّل الحساب.</p>':''}${row.canCancelInvitation&&row.status==='PENDING'&&row.membershipId&&row.updatedAt?`<button type="button" data-team-cancel="${esc(row.membershipId)}" data-revision="${esc(row.updatedAt)}">إلغاء الدعوة</button>`:''}${managementForm(row)}<p data-team-error role="alert"></p></article>`).join(''):'<p>لا توجد سجلات في هذا القسم حاليًا.</p>';
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر التحميل')}</p><button type="button" data-center-team-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterTeam=Object.freeze({open});
})();
