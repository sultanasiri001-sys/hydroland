(()=>{
  const translations={
    'الطاقم والتكليفات':'Crew and assignments','تكليفاتي':'My assignments','إدارة الطاقم':'Manage crew','تحديث':'Refresh',
    'جارٍ التحميل':'Loading','تم الحفظ':'Saved','تعذر تحميل التكليفات':'Could not load assignments','تعذر الحفظ. أعد المحاولة بنفس القرار.':'Could not save. Retry the same decision.',
    'لا توجد تكليفات':'No assignments','اختر الرحلة':'Choose trip','المورد البشري':'Crew resource','مصدر التأهيل المعتمد':'Approved qualification source',
    'اختر':'Choose','تكليف جديد':'New assignment','بديل لتكليف':'Replacement for assignment','بدون استبدال':'No replacement',
    'سبب التكليف':'Assignment reason','إضافة إلى قائمة الانتظار':'Add to waiting list','إرسال للاعتماد المستقل':'Submit for independent approval',
    'لا يوجد مصدر تأهيل معتمد مطابق للدور والرحلة. جهّز المصدر وراجعه في إدارة المستندات.':'No approved qualification source matches this role and trip. Prepare and review the source in Documents.',
    'إعداد نموذج التأهيل الفارغ':'Prepare blank qualification form','فتح إدارة المستندات':'Open Documents',
    'النموذج فارغ؛ لا ينشئ مؤهلات أو موافقات فعلية.':'The form is blank; it creates no actual qualifications or approvals.',
    'قائمة الانتظار':'Waiting list','بانتظار الاعتماد المستقل':'Awaiting independent approval','بانتظار رد المكلّف':'Awaiting crew response',
    'مقبول':'Accepted','مرفوض':'Declined','ملغي':'Cancelled','تم الاستبدال':'Replaced',
    'قبول المهمة':'Accept assignment','رفض المهمة':'Decline assignment','إلغاء التكليف':'Cancel assignment','اعتماد التكليف':'Approve assignment',
    'ترشيح من الانتظار':'Propose from waiting list','رفض الترشيح':'Decline proposal','سبب القرار':'Decision reason',
    'قرأت تفاصيل التعويض المحفوظة وأقبل هذا التكليف':'I have read the recorded compensation terms and accept this assignment',
    'تحقق مصدر التأهيل':'Qualification source verified','تكليف قديم يحتاج مراجعة المصدر':'Legacy assignment needs source review',
    'بانتظار قبول الشخص بعد تحقق المصدر':'Source checks passed; awaiting crew acceptance','يحتاج مراجعة الأهلية الحالية':'Current eligibility needs review','قبول الشخص مستقل عن جاهزية المصدر.':'Crew acceptance is separate from current source readiness.',
    'يبقى التكليف السابق محفوظًا حتى قبول البديل المعتمد.':'The original assignment remains in place until the approved substitute accepts.',
    'نسخة التعويض وقت التكليف':'Compensation at assignment','لا يوجد تعويض مثبت لهذا التكليف':'No recorded compensation for this assignment',
    'البدلات':'Allowances','المزايا':'Benefits','راتب فقط':'Salary only','مبلغ ثابت':'Fixed amount','نسبة':'Percentage','مبلغ ثابت ونسبة':'Fixed amount and percentage','شروط الموظف المعتمدة':'Approved employment terms',
    'توقيت الاستحقاق':'Earning timing','شروط العكس':'Reversal terms','مرجع التأهيل':'Qualification reference','عدد الشهادات المطابقة':'Matching credential count',
    'إصدار':'Revision','لا ينشئ هذا الإجراء دفعة أو استحقاقًا.':'This action creates no payment or earning.',
    'تغيرت البيانات. حدّث القائمة قبل القرار.':'Data changed. Refresh before deciding.','يلزم مراجع مستقل عن طالب التكليف والمكلّف.':'An approver independent of the requester and crew member is required.',
    'راجع مصدر التأهيل ومطابقته للدور والنشاط والمدة.':'Review the qualification source for this role, activity and period.',
    'راجع الشهادات السارية وتوثيق مراجعتها.':'Review current credentials and their recorded verification.',
    'لا يوجد اتفاق تعويض نافذ معتمد.':'No applicable approved compensation agreement exists.',
    'يوجد تعارض في التقويم.':'The calendar has a conflict.','لم يعد الحساب أو الدور أو العضوية نشطًا.':'The account, role or membership is no longer active.',
    'لم تعد الرحلة متاحة لتغيير التكليف.':'The trip no longer permits assignment changes.','لا تملك صلاحية هذا الإجراء.':'You no longer have permission for this action.',
    'ثبّت موافقتك على تفاصيل التعويض قبل القبول.':'Confirm the recorded compensation terms before accepting.',
    'تم قبول تفاصيل التكليف والتعويض المحفوظة':'Accepted the recorded assignment and compensation terms',
    'يتطلب تسجيل الدخول':'Sign in to view assignments','حتى':'Until','مدرب':'Instructor','قائد':'Captain','طاقم':'Crew',
  };
  const locale=window.HydrolandI18n?.createScope('crew-assignments',translations), t=(text)=>locale?.t?.(text)??text;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.HydrolandAuth, session=()=>auth()?.getSessionVersion?.();
  const root=document.getElementById('role-console')||document.querySelector('main');if(!root)return;
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='hydroland-crew-assignments.css';document.head.appendChild(stylesheet);
  const panel=document.createElement('section');panel.className='hl-crew-assignments';panel.hidden=true;root.insertAdjacentElement('afterend',panel);
  const entry=document.createElement('button');entry.type='button';entry.dataset.hlCrewAssignments='';entry.hidden=true;
  document.querySelector('#profile-dialog .profile-list')?.appendChild(entry);
  const activeRoles=()=>new Set((window.HydrolandProfileData?.profile?.roles||[]).filter(r=>typeof r==='string'||r?.status==='ACTIVE').map(r=>typeof r==='string'?r:r.role));
  const crewUser=()=>['STAFF','ADMIN','INSTRUCTOR','BOAT_OWNER','DIVE_CENTER','ORGANIZATION'].some(r=>activeRoles().has(r));
  function visibility(){entry.hidden=!auth()?.isAuthenticated?.()||!crewUser();entry.textContent=t('الطاقم والتكليفات');}
  let generation=0,mode='mine',role='',data=null,mine=[],chosenTrip='',busy=false;
  const requests=new Map();
  const requestId=body=>{const key=JSON.stringify(body);if(!requests.has(key))requests.set(key,crypto.randomUUID());return requests.get(key);};
  const statuses={WAITLISTED:'قائمة الانتظار',PROPOSED:'بانتظار الاعتماد المستقل',PENDING:'بانتظار رد المكلّف',ACCEPTED:'مقبول',REJECTED:'مرفوض',CANCELLED:'ملغي',REASSIGNED:'تم الاستبدال'};
  const actions={ACCEPT:'قبول المهمة',REJECT:'رفض المهمة',CANCEL:'إلغاء التكليف',APPROVE:'اعتماد التكليف',PROPOSE:'ترشيح من الانتظار',DECLINE:'رفض الترشيح'};
  const roleName=value=>t(({INSTRUCTOR:'مدرب',CAPTAIN:'قائد',CREW:'طاقم'})[value]||value);
  const fmt=value=>{try{return new Intl.DateTimeFormat(window.HydrolandI18n?.getLocale?.()==='en'?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return'';}};
  function state(message){const node=panel.querySelector('[data-crew-state]');if(node)node.textContent=message;}
  function errorText(error){
    const code=error.code||'';
    if(error.status===401||error.status===403)return t('لا تملك صلاحية هذا الإجراء.');
    if(code.includes('STALE')||code.includes('CHANGED')||code.includes('REQUEST_ID')||code.includes('ALREADY')||code.includes('INVALID_STATE'))return t('تغيرت البيانات. حدّث القائمة قبل القرار.');
    if(code.includes('INDEPENDENT')||code.includes('APPROVAL'))return t('يلزم مراجع مستقل عن طالب التكليف والمكلّف.');
    if(code.includes('LEGACY')||code.includes('SOURCE')||code.includes('REQUIREMENTS'))return t('راجع مصدر التأهيل ومطابقته للدور والنشاط والمدة.');
    if(code.includes('CREDENTIAL'))return t('راجع الشهادات السارية وتوثيق مراجعتها.');
    if(code.includes('COMPENSATION'))return t('لا يوجد اتفاق تعويض نافذ معتمد.');
    if(code.includes('INACTIVE')||code.includes('ACTIVE_VERIFIED'))return t('لم يعد الحساب أو الدور أو العضوية نشطًا.');
    if(code.includes('TRIP'))return t('لم تعد الرحلة متاحة لتغيير التكليف.');
    if(String(error.message).includes('Calendar resource conflict'))return t('يوجد تعارض في التقويم.');
    return t('تعذر الحفظ. أعد المحاولة بنفس القرار.');
  }
  async function api(path,method='GET',body){
    if(!auth()?.isAuthenticated?.())throw Object.assign(new Error(),{status:401});
    const response=await auth().authorizedFetch('/trips/crew/assignments'+path,{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
    const value=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error(value?.message||''),{status:response.status,code:value?.code});return value;
  }
  const current=(v,s)=>v===generation&&s===session()&&auth()?.isAuthenticated?.()&&!panel.hidden;
  function compensation(item){
    const c=item.compensation;if(!c)return `<p>${esc(t('لا يوجد تعويض مثبت لهذا التكليف'))}</p>`;
    const modes={SALARY_ONLY:'راتب فقط',FIXED:'مبلغ ثابت',PERCENTAGE:'نسبة',FIXED_PLUS_PERCENTAGE:'مبلغ ثابت ونسبة'};
    const money=value=>new Intl.NumberFormat(window.HydrolandI18n?.getLocale?.()==='en'?'en-SA':'ar-SA',{style:'currency',currency:c.currency||'SAR'}).format(Number(value)/100);
    return `<div data-crew-compensation><strong>${esc(t('نسخة التعويض وقت التكليف'))}</strong><p>${esc(t(modes[c.mode]||'شروط الموظف المعتمدة'))} · ${esc(t('إصدار'))} ${esc(c.revision)}</p>${c.fixedMinor?`<p>${esc(money(c.fixedMinor))}</p>`:''}${c.rateBps?`<p>${esc(Number(c.rateBps)/100)}%</p>`:''}${c.baseAmountMinor!==undefined?`<p>${esc(money(c.baseAmountMinor))}</p>`:''}${c.allowances?`<p>${esc(t('البدلات'))}: ${esc(JSON.stringify(c.allowances))}</p>`:''}${c.benefits?`<p>${esc(t('المزايا'))}: ${esc(JSON.stringify(c.benefits))}</p>`:''}${c.earningTiming?`<p>${esc(t('توقيت الاستحقاق'))}: ${esc(c.earningTiming)}</p>`:''}${c.reversalTerms?`<p>${esc(t('شروط العكس'))}: ${esc(c.reversalTerms)}</p>`:''}<small>${esc(t('لا ينشئ هذا الإجراء دفعة أو استحقاقًا.'))}</small></div>`;
  }
  function card(item){
    return `<article class="hl-crew-assignment-card" data-crew-id="${esc(item.id)}"><header><strong>${esc(item.tripTitle)}</strong><span>${esc(roleName(item.roleType))}</span><span class="hl-status">${esc(t(statuses[item.status]||item.status))}</span></header><p>${esc(fmt(item.startsAt))} · ${esc(t('حتى'))} ${esc(fmt(item.endsAt))}</p><p data-crew-readiness>${esc(t(item.legacyUnverified?'تكليف قديم يحتاج مراجعة المصدر':item.operationalReady?'تحقق مصدر التأهيل':item.reasons?.length===1&&item.reasons[0]==='F02_CREW_ACCEPTANCE_REQUIRED'?'بانتظار قبول الشخص بعد تحقق المصدر':'يحتاج مراجعة الأهلية الحالية'))}</p><small>${esc(t('قبول الشخص مستقل عن جاهزية المصدر.'))}</small>${item.qualification?`<p>${esc(t('مرجع التأهيل'))}: ${esc(item.qualification.sourceReference)} · ${esc(t('عدد الشهادات المطابقة'))}: ${esc(item.qualification.credentialCount)}</p>`:''}${item.replacesAssignmentId?`<p>${esc(t('يبقى التكليف السابق محفوظًا حتى قبول البديل المعتمد.'))}</p>`:''}${compensation(item)}${item.decisionReason?`<p>${esc(item.decisionReason)}</p>`:''}${item.actions?.length?`<form data-crew-decision><label>${esc(t('سبب القرار'))}<input name="reason" minlength="3" maxlength="1000" autocomplete="off"></label>${item.actions.includes('ACCEPT')?`<label><input name="terms" type="checkbox">${esc(t('قرأت تفاصيل التعويض المحفوظة وأقبل هذا التكليف'))}</label>`:''}<div class="hl-member-actions">${item.actions.map(action=>`<button type="submit" data-crew-action="${action}">${esc(t(actions[action]))}</button>`).join('')}</div></form>`:''}</article>`;
  }
  function render(){
    const manager=['center','boat','organization','admin','staff'].includes(role)||['STAFF','ADMIN','DIVE_CENTER','BOAT_OWNER','ORGANIZATION'].some(r=>activeRoles().has(r));
    panel.innerHTML=`<header class="hl-trip-admin__head"><h3>${esc(t('الطاقم والتكليفات'))}</h3><span role="status" aria-live="polite" data-crew-state></span></header><nav aria-label="${esc(t('الطاقم والتكليفات'))}"><button type="button" data-crew-mode="mine">${esc(t('تكليفاتي'))}</button>${manager?`<button type="button" data-crew-mode="manage">${esc(t('إدارة الطاقم'))}</button>`:''}<button type="button" data-crew-refresh>${esc(t('تحديث'))}</button></nav><div data-crew-workspace></div><div data-crew-list></div>`;
    const host=panel.querySelector('[data-crew-workspace]');
    if(mode==='manage'&&data){
      host.innerHTML=`${data.canPrepareTemplate&&!data.templateReady?`<p>${esc(t('النموذج فارغ؛ لا ينشئ مؤهلات أو موافقات فعلية.'))}</p><button type="button" data-crew-template>${esc(t('إعداد نموذج التأهيل الفارغ'))}</button>`:''}<button type="button" data-crew-documents>${esc(t('فتح إدارة المستندات'))}</button><label>${esc(t('اختر الرحلة'))}<select data-crew-trip>${(data.trips||[]).map(trip=>`<option value="${esc(trip.id)}" ${trip.id===data.trip?.id?'selected':''}>${esc(trip.title)} · ${esc(fmt(trip.startsAt))}</option>`).join('')}</select></label>${data.trip?`<form data-crew-proposal><h4>${esc(t('تكليف جديد'))}</h4><label>${esc(t('المورد البشري'))}<select name="resourceId" required><option value="">${esc(t('اختر'))}</option>${(data.resources||[]).map(r=>`<option value="${esc(r.id)}">${esc(r.name)} · ${esc(roleName(r.type))}</option>`).join('')}</select></label><label>${esc(t('مصدر التأهيل المعتمد'))}<select name="sourceId" required><option value="">${esc(t('اختر'))}</option></select></label><p data-crew-source-note>${esc(t('لا يوجد مصدر تأهيل معتمد مطابق للدور والرحلة. جهّز المصدر وراجعه في إدارة المستندات.'))}</p><label>${esc(t('بديل لتكليف'))}<select name="replacesAssignmentId"><option value="">${esc(t('بدون استبدال'))}</option>${(data.assignments||[]).filter(a=>['PENDING','ACCEPTED','REJECTED','CANCELLED'].includes(a.status)).map(a=>`<option value="${esc(a.id)}">${esc((data.resources||[]).find(r=>r.id===a.resourceId)?.name||a.accountId)} · ${esc(roleName(a.roleType))} · ${esc(t(statuses[a.status]))}</option>`).join('')}</select></label><label>${esc(t('سبب التكليف'))}<input name="reason" required minlength="3" maxlength="1000"></label><label><input type="checkbox" name="waitlisted">${esc(t('إضافة إلى قائمة الانتظار'))}</label><button type="submit">${esc(t('إرسال للاعتماد المستقل'))}</button></form>`:''}`;
    }
    const rows=mode==='manage'?(data?.assignments||[]):mine;
    panel.querySelector('[data-crew-list]').innerHTML=rows.length?rows.map(card).join(''):`<p>${esc(t('لا توجد تكليفات'))}</p>`;
    bind();
  }
  function refreshSources(){
    const form=panel.querySelector('[data-crew-proposal]');if(!form)return;
    const resource=data.resources.find(r=>r.id===form.elements.resourceId.value),sources=(data.sources||[]).filter(s=>s.roleType===resource?.type);
    form.elements.sourceId.innerHTML=`<option value="">${esc(t('اختر'))}</option>`+sources.map(s=>`<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    form.querySelector('[data-crew-source-note]').hidden=sources.length>0;
  }
  function bind(){
    panel.querySelectorAll('[data-crew-mode]').forEach(button=>button.onclick=()=>{if(busy)return;mode=button.dataset.crewMode;void load();});
    panel.querySelector('[data-crew-refresh]').onclick=()=>{if(!busy)void load();};
    const trip=panel.querySelector('[data-crew-trip]');if(trip)trip.onchange=()=>{chosenTrip=trip.value;void load();};
    const documents=panel.querySelector('[data-crew-documents]');if(documents)documents.onclick=()=>window.HydrolandDocuments?.open?.({department:'MARINE_OPERATIONS',internal:true});
    const template=panel.querySelector('[data-crew-template]');if(template)template.onclick=()=>mutate('/qualification-template','POST',{confirmed:true});
    const form=panel.querySelector('[data-crew-proposal]');if(form){form.elements.resourceId.onchange=refreshSources;form.onsubmit=event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const f=form.elements,old=data.assignments.find(a=>a.id===f.replacesAssignmentId.value);
      const body={resourceId:f.resourceId.value,sourceId:f.sourceId.value,reason:f.reason.value.trim(),waitlisted:f.waitlisted.checked,...(old?{replacesAssignmentId:old.id,replacesRevision:old.revision}:{})};
      void mutate('/trips/'+encodeURIComponent(data.trip.id)+'/proposals','POST',{...body,requestId:requestId({tripId:data.trip.id,...body})});
    };}
    panel.querySelectorAll('[data-crew-decision]').forEach(form=>form.onsubmit=event=>{
      event.preventDefault();const action=event.submitter?.dataset.crewAction;if(!action||busy)return;
      const id=form.closest('[data-crew-id]').dataset.crewId,item=(mode==='manage'?data.assignments:mine).find(row=>row.id===id);
      if(action==='ACCEPT'&&!form.elements.terms.checked){state(t('ثبّت موافقتك على تفاصيل التعويض قبل القبول.'));return;}
      const reason=form.elements.reason.value.trim()||(action==='ACCEPT'?t('تم قبول تفاصيل التكليف والتعويض المحفوظة'):'');
      if(reason.length<3){form.elements.reason.required=true;form.reportValidity();return;}
      const body={expectedRevision:item.revision,reason,...(['ACCEPT','REJECT'].includes(action)?{response:action==='ACCEPT'?'ACCEPTED':'REJECTED'}:{action})};
      void mutate('/'+encodeURIComponent(id)+(['ACCEPT','REJECT'].includes(action)?'/respond':'/commands'),['ACCEPT','REJECT'].includes(action)?'PATCH':'POST',{...body,requestId:requestId({id,...body})});
    });
  }
  async function load(){
    const v=++generation,s=session();if(!auth()?.isAuthenticated?.()){clear();return;}
    render();state(t('جارٍ التحميل'));
    try{
      if(mode==='manage'){const next=await api('/workspace'+(chosenTrip?'?tripId='+encodeURIComponent(chosenTrip):''));if(!current(v,s))return;data=next;chosenTrip=data.trip?.id||'';}
      else{const rows=await api('/mine');if(!current(v,s))return;mine=Array.isArray(rows)?rows:[];}
      render();
    }catch(error){if(!current(v,s))return;data=null;mine=[];render();state(error.status===403?t('لا تملك صلاحية هذا الإجراء.'):t('تعذر تحميل التكليفات'));}
  }
  async function mutate(path,method,body){
    if(busy)return;const v=generation,s=session();busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await api(path,method,body);if(!current(v,s))return;await load();if(s!==session()||panel.hidden)return;state(t('تم الحفظ'));document.dispatchEvent(new CustomEvent('hydroland:crew-assignment-updated'));window.dispatchEvent(new CustomEvent('hydroland:crew-assignment-changed'));}
    catch(error){if(current(v,s)){if(error.status===401||error.status===403){data=null;mine=[];render();}state(errorText(error));}}
    finally{busy=false;if(s===session())panel.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function clear(){generation++;data=null;mine=[];chosenTrip='';requests.clear();busy=false;panel.replaceChildren();panel.hidden=true;}
  function show(nextRole,explicit=false){role=nextRole||'';const visible=(['instructor','boat','admin','center','organization','staff'].includes(role)||explicit&&crewUser())&&auth()?.isAuthenticated?.();if(!visible){clear();return;}panel.hidden=false;mode='mine';void load();}
  entry.onclick=()=>{document.getElementById('profile-dialog')?.close();show(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver',true);window.HydrolandWorkspaceUI?.refresh?.();window.HydrolandWorkspaceUI?.show?.(panel);};
  document.addEventListener('hydroland:role-changed',event=>show(event.detail?.role));
  document.addEventListener('hydroland:session-cleared',()=>{clear();visibility();});
  document.addEventListener('hydroland:portal-cleared',()=>{clear();visibility();});
  document.addEventListener('hydroland:profile-data-ready',visibility);
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.())clear();else if(!panel.hidden)void load();});
  document.addEventListener('hydroland:locale-changed',()=>{visibility();if(!panel.hidden)render();});
  window.addEventListener('hydroland:booking-confirmed',()=>{if(!panel.hidden)void load();});
  window.HydrolandCrewAssignments={reload:load,open:()=>show(window.HydrolandPortalAccess?.getCurrentRole?.()||role)};
  visibility();
})();
