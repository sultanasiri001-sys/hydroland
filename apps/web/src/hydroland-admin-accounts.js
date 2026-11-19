(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("admin-accounts", {
  "صفحات الحسابات": "Account pages",
  "مركز القيادة · المستخدمون": "Command center · Users",
  "إدارة حسابات المستخدمين والموظفين": "User and employee accounts",
  "التعليق يوقف حساب المنصة وجميع جلساته مع حفظ البيانات والعضويات والتكليفات. إعادة التفعيل تتطلب تسجيل دخول جديد.": "Suspension blocks the platform account and all its sessions while retaining data, memberships and assignments. Reactivation requires a new sign-in.",
  "عضوية المركز وحالة التوظيف تُداران من مساراتهما المستقلة.": "Center membership and employment status are managed through their respective workflows.",
  "تحديث الحسابات": "Refresh accounts",
  "البحث بالاسم أو البريد": "Search by name or email",
  "بحث الحسابات": "Search accounts",
  "الصفحة السابقة": "Previous page",
  "الصفحة التالية": "Next page",
  "نشط": "Active",
  "معلق": "Suspended",
  "بانتظار التحقق": "Awaiting verification",
  "مؤرشف": "Archived",
  "إدارة": "Administration",
  "موظف": "Employee",
  "هاوٍ": "Recreational diver",
  "محترف غوص": "Diving professional",
  "مركز غوص": "Dive center",
  "مراجع": "Reviewer",
  "لا توجد أدوار نشطة": "No active roles",
  "تعليق الحساب": "Suspend account",
  "إعادة تفعيل الحساب": "Reactivate account",
  "حالة الحساب:": "Account status:",
  "الأدوار:": "Roles:",
  "مستخدم": "User",
  "سبب": "Reason for",
  "راجعت الحساب وأؤكد": "I have reviewed the account and confirm",
  "ستُلغى جميع جلسات الحساب ويُمنع دخوله حتى إعادة التفعيل.": "All account sessions will be revoked. Access will remain blocked until reactivation.",
  "سيتاح دخول جديد؛ لن تُستعاد الجلسات الملغاة.": "A new sign-in will be allowed. Revoked sessions will not be restored.",
  "هذا حسابك الحالي؛ لا يمكنك تعليقه.": "This is your current account. You cannot suspend it.",
  "إجراءات التعليق والتفعيل متاحة للحسابات التي أكملت التحقق فقط.": "Suspension and reactivation are available only for verified accounts.",
  "لا توجد حسابات مطابقة.": "No matching accounts.",
  "جارٍ تحميل الحسابات…": "Loading accounts…",
  "تعذر تحميل الحسابات.": "Could not load accounts.",
  "تم تحميل": "Loaded",
  "حسابًا من النظام.": "accounts from the system.",
  "جارٍ حفظ القرار…": "Saving the decision…",
  "تغير الحساب؛ حدّث الحسابات ثم راجع القرار.": "The account has changed. Refresh the accounts and review the decision again.",
  "تعذر تأكيد الحفظ؛ حدّث الحسابات للتحقق من الحالة.": "Could not confirm saving. Refresh the accounts to verify their status.",
  "تعذر التحقق من نتيجة الحفظ.": "Could not verify the saved result.",
  "تم تعليق الحساب وإلغاء جلساته وتسجيل القرار.": "The account was suspended, its sessions revoked and the decision recorded.",
  "تمت إعادة تفعيل الحساب؛ يلزم تسجيل دخول جديد.": "The account was reactivated. A new sign-in is required.",
  "تعذر الحفظ.": "Could not save.",
  "تم تحميل {0} حسابًا من النظام.": "Loaded {0} accounts from the system."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


 if(window.HydrolandAdminAccounts)return;
 const root=document.getElementById('role-console');if(!root)return;
 const panel=document.createElement('section');panel.id='hl-admin-accounts';panel.className='hl-admin-accounts';panel.hidden=true;
 uiLocale.setHTML(panel, uiLocale.html`<header><div><small>مركز القيادة · المستخدمون</small><h3>إدارة حسابات المستخدمين والموظفين</h3><p>التعليق يوقف حساب المنصة وجميع جلساته مع حفظ البيانات والعضويات والتكليفات. إعادة التفعيل تتطلب تسجيل دخول جديد.</p><p>عضوية المركز وحالة التوظيف تُداران من مساراتهما المستقلة.</p></div><button type="button" data-accounts-refresh>تحديث الحسابات</button></header><form data-accounts-search><label>البحث بالاسم أو البريد<input name="search" maxlength="120" autocomplete="off"></label><button type="submit">بحث الحسابات</button></form><p role="status" data-accounts-feedback></p><div data-accounts-list></div><nav aria-label="صفحات الحسابات"><button type="button" data-accounts-previous>الصفحة السابقة</button><button type="button" data-accounts-next>الصفحة التالية</button></nav>`);
 root.insertAdjacentElement('afterend',panel);
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess,eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const list=panel.querySelector('[data-accounts-list]'),feedback=panel.querySelector('[data-accounts-feedback]'),searchForm=panel.querySelector('[data-accounts-search]');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={ACTIVE:'نشط',SUSPENDED:'معلق',PENDING_VERIFICATION:'بانتظار التحقق',ARCHIVED:'مؤرشف'},roles={ADMIN:'إدارة',STAFF:'موظف',DIVER:'هاوٍ',INSTRUCTOR:'محترف غوص',DIVE_CENTER:'مركز غوص',REVIEWER:'مراجع'};
 let version=0,busy=false,cursor=null,nextCursor=null,history=[],search='';
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 function lock(){panel.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=busy);panel.querySelector('[data-accounts-previous]').disabled=busy||!history.length;panel.querySelector('[data-accounts-next]').disabled=busy||!nextCursor;}
 function clear(){version++;panel.hidden=true;list.replaceChildren();uiLocale.setMessage(feedback, '');searchForm.reset();busy=false;cursor=nextCursor=null;history=[];search='';}
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true;}
 function render(rows){uiLocale.setHTML(list, rows.length?rows.map(row=>{
  const activeRoles=(row.roleAssignments||[]).filter(r=>r.status==='ACTIVE').map(r=>Object.hasOwn(roles,r.role)?uiLocale.label(roles[r.role]):esc(r.role)).join('، ')||uiLocale.label('لا توجد أدوار نشطة');
  const manageable=!row.isCurrentAccount&&row.emailVerifiedAt&&['ACTIVE','SUSPENDED'].includes(row.status),next=row.status==='ACTIVE'?'SUSPENDED':'ACTIVE',action=next==='SUSPENDED'?'تعليق الحساب':'إعادة تفعيل الحساب';
  return uiLocale.html`<article data-admin-account="${esc(row.id)}"><h4>${uiLocale.messageHTML(([row.person?.firstName,row.person?.lastName].filter(Boolean).join(' ') || uiLocale.message('مستخدم')))}</h4><p dir="ltr">${esc(row.email)}</p><p>حالة الحساب: <strong>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(labels[row.status]) || row.status))}</strong></p><p>الأدوار: ${activeRoles}</p>${manageable?uiLocale.html`<form data-account-status data-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}" data-status="${next}"><fieldset><legend>${uiLocale.messageHTML(uiLocale.message(action))}</legend><p>${uiLocale.messageHTML((next==='SUSPENDED' ? uiLocale.message('ستُلغى جميع جلسات الحساب ويُمنع دخوله حتى إعادة التفعيل.') : uiLocale.message('سيتاح دخول جديد؛ لن تُستعاد الجلسات الملغاة.')))}</p><label>سبب ${uiLocale.messageHTML(uiLocale.message(action))}<textarea name="reason" required minlength="5" maxlength="1000" rows="2" autocomplete="off"></textarea></label><label class="hl-admin-accounts__ack"><input type="checkbox" name="reviewed" required>راجعت الحساب وأؤكد ${uiLocale.messageHTML(uiLocale.message(action))}</label><button type="submit">${uiLocale.messageHTML(uiLocale.message(action))}</button></fieldset><p role="status" data-account-feedback></p></form>`:uiLocale.html`<p>${uiLocale.messageHTML((row.isCurrentAccount ? uiLocale.message('هذا حسابك الحالي؛ لا يمكنك تعليقه.') : uiLocale.message('إجراءات التعليق والتفعيل متاحة للحسابات التي أكملت التحقق فقط.')))}</p>`}</article>`;
 }).join(''):uiLocale.html`<p>لا توجد حسابات مطابقة.</p>`);}
 async function load(){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;list.replaceChildren();busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ تحميل الحسابات…'));lock();
  try{if(!await authorize(v,session))return;const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(search)query.set('search',search);const response=await auth().authorizedFetch('/admin/accounts'+(query.size?'?'+query:'')),data=await response.json().catch(()=>null);if(!current(v,session))return;if(!response.ok||!Array.isArray(data?.items))throw localError(uiLocale.message('تعذر تحميل الحسابات.'));nextCursor=data.nextCursor||null;render(data.items);uiLocale.setMessage(feedback, uiLocale.message("تم تحميل {0} حسابًا من النظام.", [data.items.length]));}
  catch(error){if(current(v,session)){nextCursor=null;uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تحميل الحسابات.')));}}
  finally{if(current(v,session)){busy=false;lock();}}
 }
 panel.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(event.target===searchForm){search=new FormData(searchForm).get('search')?.toString().trim()||'';cursor=null;history=[];void load();return;}
  const form=event.target.closest('[data-account-status]');if(!form)return;
  const fields=new FormData(form),reason=String(fields.get('reason')||'').trim(),reviewed=fields.get('reviewed')==='on';if(!reviewed||reason.length<5||reason.length>1000)return;
  const id=form.dataset.id,body={status:form.dataset.status,reason,reviewed,expectedUpdatedAt:form.dataset.revision},v=version,session=auth()?.getSessionVersion?.(),result=form.querySelector('[data-account-feedback]');busy=true;lock();uiLocale.setMessage(result, uiLocale.message('جارٍ حفظ القرار…'));
  try{if(!await authorize(v,session)||!form.isConnected)return;const response=await auth().authorizedFetch('/admin/accounts/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!current(v,session)||!form.isConnected)return;if(!response.ok)throw localError((response.status===409 ? uiLocale.message('تغير الحساب؛ حدّث الحسابات ثم راجع القرار.') : (data?.message || uiLocale.message('تعذر تأكيد الحفظ؛ حدّث الحسابات للتحقق من الحالة.'))));if(data?.id!==id||data?.status!==body.status)throw localError(uiLocale.message('تعذر التحقق من نتيجة الحفظ.'));await load();if(eligible())uiLocale.setMessage(feedback, (body.status==='SUSPENDED' ? uiLocale.message('تم تعليق الحساب وإلغاء جلساته وتسجيل القرار.') : uiLocale.message('تمت إعادة تفعيل الحساب؛ يلزم تسجيل دخول جديد.')));}
  catch(error){if(current(v,session)&&form.isConnected)uiLocale.setMessage(result, (localErrorMessage(error) || uiLocale.message('تعذر الحفظ.')));}
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
