(()=>{
 if(window.HydrolandStaffApprovals)return;
 const root=document.getElementById('role-console');if(!root)return;
 const auth=()=>window.HydrolandAuth,session=()=>auth()?.getSessionVersion?.(),signedIn=()=>Boolean(auth()?.isAuthenticated?.());
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ownerPanel=document.createElement('section');ownerPanel.dataset.staffDelegations='';ownerPanel.hidden=true;
 ownerPanel.innerHTML='<h4>تفويض اعتماد الموظفين</h4><button type="button" data-delegation-refresh>تحديث التفويضات</button><p>يعتمد حساب مالك هيدرولاند موظفي الإدارة العليا وجميع الإدارات الداخلية. يمكنك تفويض موظف نشط لاعتماد تعييناتهم دون منحه إدارة المنصة. لا يشمل التفويض موظفي المراكز ولا يسمح بإعادة التفويض أو اعتماد الموظف لتعيينه.</p><form data-delegation-grant><fieldset><label>بريد الموظف المفوض<input name="email" type="email" required maxlength="254" autocomplete="off"></label><label>سبب التفويض<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت تفويض اعتماد موظفي جميع الإدارات الداخلية</label><button type="submit">تفويض الاعتماد</button></fieldset></form><div data-delegation-items></div><p role="status" data-delegation-feedback></p>';
 document.getElementById('hl-admin-employees')?.querySelector('[data-staff-readiness]')?.after(ownerPanel);
 const panel=document.createElement('section');panel.id='hl-staff-approvals';panel.className='hl-staff-approvals';panel.hidden=true;
 panel.innerHTML='<h3>اعتماد موظفي هيدرولاند</h3><p>اعتماد التعيينات التي راجعها مالك هيدرولاند في جميع الإدارات الداخلية. تُراجع صلاحيتك وحالة الحساب وضوابط الموارد البشرية عند كل قرار.</p><button type="button" data-approval-refresh>تحديث طلبات الاعتماد</button><form data-approval-search><label>البحث في طلبات الاعتماد<input name="search" maxlength="120"></label><button type="submit">بحث طلبات الاعتماد</button></form><p role="status" data-approval-feedback></p><div data-approval-items></div><button type="button" data-approval-more hidden>طلبات الاعتماد التالية</button>';
 root.after(panel);
 let generation=0,ownerGeneration=0,capabilityGeneration=0,revision=null,busy=false,ownerBusy=false,cursor=null,search='';
 const message=panel.querySelector('[data-approval-feedback]'),ownerMessage=ownerPanel.querySelector('[data-delegation-feedback]');
 const valid=(v,s)=>v===generation&&s===session()&&signedIn()&&!panel.hidden;
 const ownerValid=(v,s)=>v===ownerGeneration&&s===session()&&signedIn()&&window.HydrolandPortalAccess?.getCurrentRole?.()==='admin'&&!document.getElementById('hl-admin-employees')?.hidden;
 async function call(path,options){const response=await auth().authorizedFetch(path,options),data=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error(data?.message||'تعذر إكمال الإجراء؛ حدّث الصفحة للتحقق.'),{status:response.status});return data;}
 function clear(){generation++;ownerGeneration++;capabilityGeneration++;busy=ownerBusy=false;revision=cursor=null;search='';panel.hidden=ownerPanel.hidden=true;panel.querySelector('[data-approval-items]').replaceChildren();ownerPanel.querySelector('[data-delegation-items]').replaceChildren();panel.querySelectorAll('form').forEach(f=>f.reset());ownerPanel.querySelector('form').reset();message.textContent=ownerMessage.textContent='';document.querySelector('[data-open-staff-approvals]')?.remove();}
 function renderDelegations(data){
  if(typeof data?.revision!=='string'||data.scope!=='ALL_INTERNAL_DEPARTMENTS'||!Array.isArray(data.items))throw new Error('تعذر قراءة التفويضات.');
  revision=data.revision;ownerPanel.hidden=false;
  ownerPanel.querySelector('[data-delegation-items]').innerHTML=data.items.length?data.items.map(row=>`<article><p dir="ltr">${esc(row.email||'حساب غير متاح')}</p><p>${row.eligible?'تفويض فعال':'التفويض متوقف لعدم اكتمال أهلية الموظف'}</p><form data-delegation-revoke data-account="${esc(row.accountId)}"><fieldset><label>سبب سحب التفويض<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت سحب صلاحية الاعتماد</label><button type="submit">سحب التفويض</button></fieldset></form></article>`).join(''):'<p>لا يوجد موظفون مفوضون حاليًا. حسابك يحتفظ بصلاحية الاعتماد.</p>';
 }
 async function loadDelegations(){
  document.getElementById('hl-admin-employees')?.querySelector('[data-staff-readiness]')?.after(ownerPanel);ownerBusy=false;ownerPanel.querySelectorAll('fieldset').forEach(f=>f.disabled=false);
  const v=++ownerGeneration,s=session();revision=null;ownerPanel.hidden=true;ownerPanel.querySelector('[data-delegation-items]').replaceChildren();
  try{const data=await call('/admin/employees/approval-delegations');if(!ownerValid(v,s))return;renderDelegations(data);ownerMessage.textContent='';}
  catch(error){if(ownerValid(v,s)&&error.status!==403){ownerPanel.hidden=false;ownerMessage.textContent=error.message;}}
 }
 ownerPanel.querySelector('[data-delegation-refresh]').addEventListener('click',()=>{if(!ownerBusy)void loadDelegations();});
 ownerPanel.addEventListener('submit',async event=>{
  event.preventDefault();if(ownerBusy||!revision)return;const form=event.target,values=Object.fromEntries(new FormData(form));if(values.reviewed!=='on')return;
  const v=ownerGeneration,s=session(),grant=form.matches('[data-delegation-grant]');if(!ownerValid(v,s))return;
  const body={action:grant?'GRANT':'REVOKE',...(grant?{email:values.email}:{accountId:form.dataset.account}),expectedRevision:revision,reason:values.reason,reviewed:true};
  ownerBusy=true;ownerPanel.querySelectorAll('fieldset').forEach(f=>f.disabled=true);ownerMessage.textContent='جارٍ حفظ التفويض…';
  try{const data=await call('/admin/employees/approval-delegations',{method:'POST',body:JSON.stringify(body)});if(!ownerValid(v,s))return;renderDelegations(data);if(grant)form.reset();ownerMessage.textContent=grant?'تم تفويض صلاحية اعتماد موظفي جميع الإدارات الداخلية.':'تم سحب التفويض؛ لا يمكن للحساب استخدامه في القرارات التالية.';}
  catch(error){if(ownerValid(v,s)){ownerMessage.textContent=error.message;if(error.status===403){revision=null;ownerPanel.querySelector('[data-delegation-items]').replaceChildren();}}}
  finally{if(ownerValid(v,s)){ownerBusy=false;ownerPanel.querySelectorAll('fieldset').forEach(f=>f.disabled=false);}}
 });
 async function load(){
  const v=++generation,s=session();if(!signedIn()){clear();return}busy=true;panel.hidden=false;message.textContent='جارٍ قراءة طلبات الاعتماد…';panel.querySelector('[data-approval-items]').replaceChildren();panel.querySelector('[data-approval-more]').hidden=true;
  try{const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(search)query.set('search',search);const data=await call('/employee-approvals'+(query.size?'?'+query:''));if(!valid(v,s))return;if(!Array.isArray(data?.items))throw new Error('تعذر قراءة الطلبات.');
   const rows=data.items.filter(row=>row.canApprove);panel.querySelector('[data-approval-items]').innerHTML=rows.length?rows.map(row=>`<article><h4>${esc([row.account?.person?.firstName,row.account?.person?.lastName].filter(Boolean).join(' '))}</h4><p dir="ltr">${esc(row.account?.email)}</p><p>${esc(row.employment?.department?.nameAr)} · ${esc(row.employment?.position?.titleAr)}</p><p>سبب الطلب: ${esc(row.reason)}</p><p>الصلاحيات المطلوبة: ${esc(data.profiles?.find(p=>p.code===row.requestedProfile)?.label||row.requestedProfile)}</p><form data-delegated-decision data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>سبب اعتماد التعيين<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت الموظف والإدارة والصلاحيات المطلوبة</label><button type="submit">اعتماد التعيين وتفعيل الصلاحيات</button></fieldset></form></article>`).join(''):'<p>لا توجد طلبات متاحة لاعتمادك في هذه الصفحة.</p>';
   cursor=data.nextCursor||null;panel.querySelector('[data-approval-more]').hidden=!cursor;message.textContent=data.approvalReadiness?.compliance?.ready?'تم تحميل الطلبات المتاحة لاعتمادك.':'ضوابط الموارد البشرية غير مكتملة؛ يلزم إكمالها قبل تفعيل التعيين.';
  }catch(error){if(valid(v,s)){message.textContent=error.message;if(error.status===403)document.querySelector('[data-open-staff-approvals]')?.remove();}}
  finally{if(valid(v,s))busy=false;}
 }
 panel.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const form=event.target,values=Object.fromEntries(new FormData(form));
  if(form.matches('[data-approval-search]')){search=String(values.search||'').trim();cursor=null;void load();return;}
  if(!form.matches('[data-delegated-decision]')||values.reviewed!=='on')return;
  const v=generation,s=session();busy=true;panel.querySelectorAll('fieldset').forEach(f=>f.disabled=true);message.textContent='جارٍ اعتماد التعيين…';
  try{const data=await call('/employee-approvals/'+encodeURIComponent(form.dataset.id)+'/decision',{method:'PATCH',body:JSON.stringify({action:'APPROVE',reason:values.reason,reviewed:true,expectedUpdatedAt:form.dataset.revision})});if(!valid(v,s))return;if(data?.id!==form.dataset.id||data.status!=='EFFECTIVE')throw new Error('تعذر تأكيد الاعتماد؛ حدّث الطلبات.');await load();if(s===session()&&!panel.hidden)message.textContent='تم اعتماد التعيين وتفعيل الصلاحيات وتسجيل القرار. يلزم دخول جديد للموظف.';}
  catch(error){if(valid(v,s)){message.textContent=error.message;if(error.status===403){panel.querySelector('[data-approval-items]').replaceChildren();document.querySelector('[data-open-staff-approvals]')?.remove();}}}
  finally{if(valid(v,s)){busy=false;panel.querySelectorAll('fieldset').forEach(f=>f.disabled=false);}}
 });
 panel.querySelector('[data-approval-refresh]').addEventListener('click',()=>{if(!busy){cursor=null;void load();}});
 panel.querySelector('[data-approval-more]').addEventListener('click',()=>{if(!busy)void load();});
 async function refreshCapability(){
  const v=++capabilityGeneration,s=session();if(!signedIn())return;
  try{const data=await call('/employee-approvals/capability');if(v!==capabilityGeneration||s!==session()||!signedIn())return;let button=document.querySelector('[data-open-staff-approvals]');if(data?.canApprove!==true){button?.remove();return;}
   if(!button){const host=document.querySelector('#profile-dialog .profile-list');if(!host)return;button=document.createElement('button');button.type='button';button.dataset.openStaffApprovals='';button.textContent='اعتماد موظفي هيدرولاند';host.append(button);button.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();panel.hidden=false;window.HydrolandWorkspaceUI?.show?.(panel);cursor=null;void load();});}
  }catch{if(v===capabilityGeneration&&s===session())document.querySelector('[data-open-staff-approvals]')?.remove();}
 }
 document.addEventListener('hydroland:workspace-selected',event=>{if(event.detail?.target?.id==='hl-admin-employees')void loadDelegations();else{ownerGeneration++;revision=null;ownerPanel.hidden=true;ownerPanel.querySelector('[data-delegation-items]').replaceChildren();ownerPanel.querySelector('form').reset();ownerMessage.textContent='';}if(event.detail?.target!==panel){generation++;busy=false;panel.hidden=true;panel.querySelector('[data-approval-items]').replaceChildren();message.textContent='';}});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:auth-changed',()=>{clear();if(signedIn())void refreshCapability();});
 document.addEventListener('hydroland:role-changed',()=>{if(signedIn())void refreshCapability();});
 document.addEventListener('hydroland:profile-data-ready',()=>void refreshCapability());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&signedIn()){void refreshCapability();if(!panel.hidden)void load();}});
 window.HydrolandStaffApprovals=Object.freeze({refreshCapability});if(signedIn())void refreshCapability();
})();
