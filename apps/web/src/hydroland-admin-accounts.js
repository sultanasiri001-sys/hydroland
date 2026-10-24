(()=>{
 if(window.HydrolandAdminAccounts)return;
 const root=document.getElementById('role-console');if(!root)return;
 const panel=document.createElement('section');panel.id='hl-admin-accounts';panel.className='hl-admin-accounts';panel.hidden=true;
 panel.innerHTML='<header><div><small>مركز القيادة · المستخدمون</small><h3>إدارة حسابات المستخدمين والموظفين</h3><p>التعليق يوقف حساب المنصة وجميع جلساته مع حفظ البيانات والعضويات والتكليفات. إعادة التفعيل تتطلب تسجيل دخول جديد.</p><p>عضوية المركز وحالة التوظيف تُداران من مساراتهما المستقلة.</p></div><button type="button" data-accounts-refresh>تحديث الحسابات</button></header><form data-accounts-search><label>البحث بالاسم أو البريد<input name="search" maxlength="120" autocomplete="off"></label><button type="submit">بحث الحسابات</button></form><p role="status" data-accounts-feedback></p><div data-accounts-list></div><nav aria-label="صفحات الحسابات"><button type="button" data-accounts-previous>الصفحة السابقة</button><button type="button" data-accounts-next>الصفحة التالية</button></nav>';
 root.insertAdjacentElement('afterend',panel);
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess,eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const list=panel.querySelector('[data-accounts-list]'),feedback=panel.querySelector('[data-accounts-feedback]'),searchForm=panel.querySelector('[data-accounts-search]');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={ACTIVE:'نشط',SUSPENDED:'معلق',PENDING_VERIFICATION:'بانتظار التحقق',ARCHIVED:'مؤرشف'},roles={ADMIN:'إدارة',STAFF:'موظف',DIVER:'هاوٍ',INSTRUCTOR:'محترف غوص',DIVE_CENTER:'مركز غوص',REVIEWER:'مراجع'};
 let version=0,busy=false,cursor=null,nextCursor=null,history=[],search='';
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 function lock(){panel.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=busy);panel.querySelector('[data-accounts-previous]').disabled=busy||!history.length;panel.querySelector('[data-accounts-next]').disabled=busy||!nextCursor;}
 function clear(){version++;panel.hidden=true;list.replaceChildren();feedback.textContent='';searchForm.reset();busy=false;cursor=nextCursor=null;history=[];search='';}
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true;}
 function render(rows){list.innerHTML=rows.length?rows.map(row=>{
  const activeRoles=(row.roleAssignments||[]).filter(r=>r.status==='ACTIVE').map(r=>roles[r.role]||r.role).join('، ')||'لا توجد أدوار نشطة';
  const manageable=!row.isCurrentAccount&&row.emailVerifiedAt&&['ACTIVE','SUSPENDED'].includes(row.status),next=row.status==='ACTIVE'?'SUSPENDED':'ACTIVE',action=next==='SUSPENDED'?'تعليق الحساب':'إعادة تفعيل الحساب';
  return `<article data-admin-account="${esc(row.id)}"><h4>${esc([row.person?.firstName,row.person?.lastName].filter(Boolean).join(' ')||'مستخدم')}</h4><p dir="ltr">${esc(row.email)}</p><p>حالة الحساب: <strong>${esc(labels[row.status]||row.status)}</strong></p><p>الأدوار: ${esc(activeRoles)}</p>${manageable?`<form data-account-status data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}" data-status="${next}"><fieldset><legend>${action}</legend><p>${next==='SUSPENDED'?'ستُلغى جميع جلسات الحساب ويُمنع دخوله حتى إعادة التفعيل.':'سيتاح دخول جديد؛ لن تُستعاد الجلسات الملغاة.'}</p><label>سبب ${action}<textarea name="reason" required minlength="5" maxlength="1000" rows="2" autocomplete="off"></textarea></label><label class="hl-admin-accounts__ack"><input type="checkbox" name="reviewed" required>راجعت الحساب وأؤكد ${action}</label><button type="submit">${action}</button></fieldset><p role="status" data-account-feedback></p></form>`:`<p>${row.isCurrentAccount?'هذا حسابك الحالي؛ لا يمكنك تعليقه.':'إجراءات التعليق والتفعيل متاحة للحسابات التي أكملت التحقق فقط.'}</p>`}</article>`;
 }).join(''):'<p>لا توجد حسابات مطابقة.</p>';}
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;list.replaceChildren();busy=true;feedback.textContent='جارٍ تحميل الحسابات…';lock();
  try{if(!await authorize(v,session))return;const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(search)query.set('search',search);const response=await auth().authorizedFetch('/admin/accounts'+(query.size?'?'+query:'')),data=await response.json().catch(()=>null);if(!current(v,session))return;if(!response.ok||!Array.isArray(data?.items))throw new Error('تعذر تحميل الحسابات.');nextCursor=data.nextCursor||null;render(data.items);feedback.textContent=`تم تحميل ${data.items.length} حسابًا من النظام.`;}
  catch(error){if(current(v,session)){nextCursor=null;feedback.textContent=error.message||'تعذر تحميل الحسابات.';}}
  finally{if(current(v,session)){busy=false;lock();}}
 }
 panel.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(event.target===searchForm){search=new FormData(searchForm).get('search')?.toString().trim()||'';cursor=null;history=[];void load();return;}
  const form=event.target.closest('[data-account-status]');if(!form)return;
  const fields=new FormData(form),reason=String(fields.get('reason')||'').trim(),reviewed=fields.get('reviewed')==='on';if(!reviewed||reason.length<5||reason.length>1000)return;
  const id=form.dataset.id,body={status:form.dataset.status,reason,reviewed,expectedUpdatedAt:form.dataset.revision},v=version,session=auth()?.getSessionVersion?.(),result=form.querySelector('[data-account-feedback]');busy=true;lock();result.textContent='جارٍ حفظ القرار…';
  try{if(!await authorize(v,session)||!form.isConnected)return;const response=await auth().authorizedFetch('/admin/accounts/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!current(v,session)||!form.isConnected)return;if(!response.ok)throw new Error(response.status===409?'تغير الحساب؛ حدّث الحسابات ثم راجع القرار.':data?.message||'تعذر تأكيد الحفظ؛ حدّث الحسابات للتحقق من الحالة.');if(data?.id!==id||data?.status!==body.status)throw new Error('تعذر التحقق من نتيجة الحفظ.');await load();if(eligible())feedback.textContent=body.status==='SUSPENDED'?'تم تعليق الحساب وإلغاء جلساته وتسجيل القرار.':'تمت إعادة تفعيل الحساب؛ يلزم تسجيل دخول جديد.';}
  catch(error){if(current(v,session)&&form.isConnected)result.textContent=error.message||'تعذر الحفظ.';}
  finally{if(current(v,session)){busy=false;lock();}}
 });
 panel.querySelector('[data-accounts-refresh]').addEventListener('click',()=>void load());
 panel.querySelector('[data-accounts-next]').addEventListener('click',()=>{if(!nextCursor||busy)return;history.push(cursor);cursor=nextCursor;void load();});
 panel.querySelector('[data-accounts-previous]').addEventListener('click',()=>{if(!history.length||busy)return;cursor=history.pop();void load();});
 document.addEventListener('hydroland:workspace-selected',event=>{if(event.detail?.target===panel)void load();else clear();});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear();});
 window.HydrolandAdminAccounts=Object.freeze({reload:load});
})();
