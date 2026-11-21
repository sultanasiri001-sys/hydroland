(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("support", {
  "جارٍ حفظ الإجراء…": "Saving action…",
  "غير محددة": "Not specified",
  "مفتوحة": "Open",
  "الصفحة": "Page",
  "العميل": "Customer",
  "الإجراء": "Action",
  "يتطلب تسجيل الدخول": "Sign-in required",
  "تحديث الحالة": "Refresh status",
  "نوع الطلب": "Request type",
  "استفسار": "Question",
  "دعم": "Support",
  "شكوى": "Complaint",
  "مشكلة حجز": "Booking issue",
  "مشكلة دفع": "Payment issue",
  "ملاحظة سلامة": "Safety concern",
  "أعترض وأطلب متابعة المعالجة": "I object and request further handling",
  "إضافة رد": "Add a reply",
  "إرسال الرد": "Send reply",
  "خدمة العملاء والدعم": "Customer service and support",
  "عرض خدمة العملاء": "Customer-service view",
  "تذاكري": "My tickets",
  "صندوق خدمة العملاء": "Customer-service inbox",
  "إنشاء تذكرة": "Create ticket",
  "عنوان التذكرة": "Ticket title",
  "تفاصيل التذكرة": "Ticket details",
  "اكتب التفاصيل": "Enter details",
  "إرسال التذكرة": "Send ticket",
  "حالة الخدمة": "Service status",
  "تُحفظ التذاكر في حسابك ويمكن متابعتها من هذه الصفحة.": "Tickets are saved in your account and can be followed from this page.",
  "تحديث التذاكر": "Refresh tickets",
  "تذاكر فعلية": "Recorded tickets",
  "آخر تحديث": "Last updated",
  "تحديث الصندوق": "Refresh inbox",
  "صفحات تذاكر الدعم": "Support ticket pages",
  "السابقة": "Previous",
  "التالية": "Next",
  "لإنشاء تذكرة أو متابعة طلباتك، سجّل الدخول إلى حسابك.": "Sign in to create a ticket or follow your requests.",
  "تسجيل الدخول": "Sign in",
  "مسندة": "Assigned",
  "بانتظار رد العميل": "Awaiting customer response",
  "رفع تجميد دليل البلاغ":"Release case evidence hold","مراجعة الرسالة المبلّغ عنها":"Review reported message","سبب زوال الحاجة لحفظ الدليل":"Reason the evidence hold can end","رُفع التجميد.":"Hold released.","سُجّل الطلب بانتظار تأكيد مفوّض ثانٍ.":"A second authorized reviewer must confirm release.","تعذرت مراجعة الدليل أو تغيّرت الصلاحية.":"Evidence is unavailable or your permissions changed.",
  "بانتظار قبول الحل": "Awaiting resolution acceptance",
  "مغلقة": "Closed",
  "فريق الدعم": "Support team",
  "النظام": "System",
  "المساعد": "Assistant",
  "تكليف أو تحديث المهلة": "Assign or update deadline",
  "طلب معلومات من العميل": "Request customer information",
  "تصعيد وتكليف المتابعة": "Escalate and assign follow-up",
  "تقديم الحل للعميل": "Propose a resolution",
  "إنشاء التذكرة": "Ticket created",
  "إنشاء طلب الجهة": "Organization request created",
  "تكليف المسؤول وتحديد المهلة": "Owner assigned and deadline set",
  "انتظار رد العميل": "Awaiting customer response",
  "تصعيد الحالة": "Case escalated",
  "تقديم الحل": "Resolution proposed",
  "قبول العميل وإقفال الحالة": "Customer accepted and case closed",
  "اعتراض العميل وإعادة المعالجة": "Customer objected and case reopened",
  "رد العميل": "Customer reply",
  "رد الجهة": "Organization reply",
  "المهلة:": "Deadline:",
  "· تجاوزت المهلة": "· Overdue",
  "لم تُحدد مهلة بعد.": "No deadline has been set yet.",
  "مشاركة": "Contribution",
  "سجّل الدخول لعرض التذاكر": "Sign in to view tickets",
  "عرض المحادثة ومتابعة الطلب": "View conversation and follow request",
  "قيد المراجعة": "Under review",
  "طلب خدمة": "Service request",
  "تُراجع هذه الحالة من مسار اعتراضات المزود.": "This case is reviewed through the provider-appeal workflow.",
  "ردك على الحل": "Your response to the resolution",
  "أقبل الحل وأغلق التذكرة": "I accept the resolution and close the ticket",
  "لا توجد تذاكر": "No tickets",
  "يمكنك إنشاء أول تذكرة من النموذج.": "You can create your first ticket using the form.",
  "جارٍ تحميل التذاكر": "Loading tickets",
  "جارٍ تحميل التذاكر...": "Loading tickets...",
  "متصل بالنظام": "Connected to the system",
  "تعذر تحميل الخدمة": "Could not load the service",
  "تعذر تحميل التذاكر. أعد المحاولة.": "Could not load tickets. Try again.",
  "سجّل الدخول أولًا.": "Sign in first.",
  "تم تسجيل التذكرة في النظام.": "Ticket recorded in the system.",
  "تعذر تسجيل التذكرة. تحقق من تسجيل الدخول وحاول مرة أخرى.": "Could not create the ticket. Check your sign-in and try again.",
  "جارٍ حفظ الرد…": "Saving reply…",
  "تغيرت حالة التذكرة. حدّث التذاكر قبل المتابعة.": "The ticket status has changed. Refresh tickets before continuing.",
  "لم تعد هذه التذكرة متاحة لهذا الحساب.": "This ticket is no longer available to this account.",
  "تعذر تأكيد الحفظ. حدّث التذاكر للتحقق ثم حاول مجددًا.": "Could not confirm saving. Refresh tickets to verify, then try again.",
  "اختر تذكرة لعرض سجلها وإجراءاتها.": "Choose a ticket to view its history and actions.",
  "جارٍ تحميل صندوق خدمة العملاء…": "Loading customer-service inbox…",
  "لا توجد تذاكر في صندوق خدمة العملاء.": "No tickets in the customer-service inbox.",
  "تذكرة": "tickets",
  "تغيرت صلاحية إدارة خدمة العملاء. أعد فتح الواجهة بعد التحقق.": "Customer-service administration permission has changed. Reopen the view after verification.",
  "تعذر تحميل الصندوق. أعد المحاولة.": "Could not load the inbox. Try again.",
  "المسؤول:": "Owner:",
  "تاريخ الحالة": "Case history",
  "يلزم مراجعة تكليف المسؤول": "Owner assignment needs review",
  "لم يُكلّف مسؤول بعد": "No owner assigned yet",
  "المسؤول": "Owner",
  "اختر المسؤول": "Choose an owner",
  "مهلة هذه الحالة": "Deadline for this case",
  "تُعرض المهلة بتوقيت جهازك. أدخل موعدًا صريحًا عند التكليف الأول.": "The deadline is shown in your device timezone. Enter an explicit date and time for the initial assignment.",
  "الرسالة أو سبب الإجراء": "Message or reason for the action",
  "حفظ الإجراء": "Save action",
  "يبقى الحل بانتظار قبول العميل أو اعتراضه. يُقفل الطلب عند قبوله.": "The resolution awaits the customer's acceptance or objection. Acceptance closes the request.",
  "هذه الحالة مغلقة.": "This case is closed.",
  "جارٍ تحميل التذكرة…": "Loading ticket…",
  "تعذر عرض التذكرة. حدّث الصندوق ثم حاول مجددًا.": "Could not display the ticket. Refresh the inbox and try again.",
  "تغيرت صلاحية إدارة خدمة العملاء. أعد التحقق من المسؤول والتكليف.": "Customer-service administration permission has changed. Recheck the owner and assignment.",
  "تعذر تطبيق الإجراء. حدّث الحالة وتحقق من المسؤول والمهلة.": "Could not apply the action. Refresh the case and check the owner and deadline.",
  "تعذر تأكيد الحفظ. حدّث الحالة للتحقق قبل المحاولة مجددًا.": "Could not confirm saving. Refresh the case to verify before trying again.",
  " · تجاوزت المهلة": " · Overdue",
  "الصفحة {0} · {1} تذكرة": "Page {0} · {1} tickets"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  const community=document.getElementById('community');if(!community||document.querySelector('.hl-support'))return;
  const Auth=window.HydrolandAuth;
  const wrap=document.createElement('section');wrap.className='hl-support';
  uiLocale.setHTML(wrap, uiLocale.html`<header class="hl-support-head"><div><small>SUPPORT CENTER · HYDROLAND</small><h3>خدمة العملاء والدعم</h3></div><span data-support-state>يتطلب تسجيل الدخول</span></header>
    <nav class="hl-support-actions" aria-label="عرض خدمة العملاء"><button type="button" data-support-mine>تذاكري</button><button type="button" data-support-inbox hidden>صندوق خدمة العملاء</button></nav>
    <div data-support-customer><div class="hl-support-grid"><section class="hl-support-panel"><h4>إنشاء تذكرة</h4><form class="hl-support-input" data-support-form><select name="type" aria-label="نوع الطلب"><option value="SUPPORT">دعم</option><option value="QUESTION">استفسار</option><option value="COMPLAINT">شكوى</option><option value="BOOKING_ISSUE">مشكلة حجز</option><option value="PAYMENT_ISSUE">مشكلة دفع</option><option value="SAFETY_CONCERN">ملاحظة سلامة</option></select><input name="subject" maxlength="160" aria-label="عنوان التذكرة" placeholder="عنوان التذكرة" required><textarea name="description" maxlength="3000" aria-label="تفاصيل التذكرة" placeholder="اكتب التفاصيل" required></textarea><button type="submit">إرسال التذكرة</button></form></section><section class="hl-support-panel"><h4>تذاكري</h4><div class="hl-ticket-list" data-support-list></div></section><section class="hl-support-panel"><h4>حالة الخدمة</h4><p data-support-message role="status">تُحفظ التذاكر في حسابك ويمكن متابعتها من هذه الصفحة.</p><button type="button" data-support-refresh>تحديث التذاكر</button></section></div><div class="hl-support-metrics"><article><small>تذاكر فعلية</small><b data-support-count>—</b></article><article><small>آخر تحديث</small><b data-support-link>—</b></article></div></div>
    <section class="hl-support-panel" data-support-admin hidden><header class="hl-support-head"><h4>صندوق خدمة العملاء</h4><button type="button" data-support-admin-refresh>تحديث الصندوق</button></header><p data-support-admin-feedback role="status"></p><div class="hl-support-inbox"><div data-support-admin-list></div><section data-support-admin-detail aria-live="polite"></section></div><nav class="hl-support-actions" aria-label="صفحات تذاكر الدعم"><button type="button" data-support-previous>السابقة</button><button type="button" data-support-next>التالية</button></nav></section>`);
  community.insertAdjacentElement('afterend',wrap);
  const state=wrap.querySelector('[data-support-state]'),list=wrap.querySelector('[data-support-list]'),count=wrap.querySelector('[data-support-count]'),message=wrap.querySelector('[data-support-message]'),form=wrap.querySelector('[data-support-form]');
  const customerPanel=wrap.querySelector('[data-support-customer]'),adminPanel=wrap.querySelector('[data-support-admin]'),adminList=wrap.querySelector('[data-support-admin-list]'),adminDetail=wrap.querySelector('[data-support-admin-detail]'),adminFeedback=wrap.querySelector('[data-support-admin-feedback]'),inboxButton=wrap.querySelector('[data-support-inbox]');
  const guestGate=document.createElement('div');guestGate.className='hl-support-guest-gate';guestGate.hidden=true;uiLocale.setHTML(guestGate, uiLocale.html`<span>لإنشاء تذكرة أو متابعة طلباتك، سجّل الدخول إلى حسابك.</span><button type="button">تسجيل الدخول</button>`);form.insertAdjacentElement('afterend',guestGate);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const labels={OPEN:'مفتوحة',ASSIGNED:'مسندة',WAITING_CUSTOMER:'بانتظار رد العميل',RESOLVED:'بانتظار قبول الحل',CLOSED:'مغلقة'};
  const types={SUPPORT:'دعم',QUESTION:'استفسار',COMPLAINT:'شكوى',BOOKING_ISSUE:'مشكلة حجز',PAYMENT_ISSUE:'مشكلة دفع',SAFETY_CONCERN:'ملاحظة سلامة'};
  const actors={CUSTOMER:'العميل',STAFF:'فريق الدعم',SYSTEM:'النظام',AI_AGENT:'المساعد'};
  const actions={ASSIGN:'تكليف أو تحديث المهلة',WAIT:'طلب معلومات من العميل',ESCALATE:'تصعيد وتكليف المتابعة',RESOLVE:'تقديم الحل للعميل'};
  const historyLabels={'customer_case.created':'إنشاء التذكرة','organization.customer_case.created':'إنشاء طلب الجهة','customer_case.assign':'تكليف المسؤول وتحديد المهلة','customer_case.wait':'انتظار رد العميل','customer_case.escalate':'تصعيد الحالة','customer_case.resolve':'تقديم الحل','customer_case.resolution_accepted':'قبول العميل وإقفال الحالة','customer_case.resolution_objected':'اعتراض العميل وإعادة المعالجة','customer_case.replied':'رد العميل','organization.customer_case.replied':'رد الجهة'};
  const date=value=>value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleString('ar-SA'):uiLocale.t('غير محددة');
  const deadline=item=>item.dueAt?uiLocale.html`<p class="${item.overdue?'hl-support-overdue':''}">المهلة: ${esc(date(item.dueAt))}${uiLocale.messageHTML((item.overdue?uiLocale.message(' · تجاوزت المهلة'):''))}</p>`:uiLocale.html`<p>لم تُحدد مهلة بعد.</p>`;
  const thread=item=>uiLocale.html`<div class="hl-support-thread">${(item.interactions||[]).map(row=>uiLocale.html`<p><b>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(actors[row.actorType]) || uiLocale.message('مشاركة')))}:</b> ${esc(row.message)}<small>${esc(date(row.createdAt))}</small></p>`).join('')}</div>`;
  const protectedCase=item=>item.referenceType==='PROVIDER_QUALITY_TRIP_REHEARSAL_V1';
  const adminEligible=()=>Boolean(Auth?.isAuthenticated?.()&&window.HydrolandPortalAccess?.roleAllowed?.('admin')&&window.HydrolandPortalAccess?.getCurrentRole?.()==='admin');
  const sessionCurrent=version=>Auth?.isAuthenticated?.()&&Auth.getSessionVersion()===version;
  let loadVersion=0,view='mine',adminVersion=0,detailVersion=0,adminPage=1,adminTotal=0,assignees=[],selected=null,adminBusy=false;
  const request=async(path,options)=>{const response=await Auth.authorizedFetch(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error('REQUEST_FAILED'),{status:response.status});return body;};
  function setView(next){view=next;customerPanel.hidden=next!=='mine';adminPanel.hidden=next!=='admin';}
  function clearAdmin(){adminVersion++;detailVersion++;assignees=[];selected=null;adminBusy=false;adminPage=1;adminTotal=0;adminList.replaceChildren();adminDetail.replaceChildren();adminFeedback.textContent='';setView('mine');}
  const syncAccess=()=>{const allowed=Boolean(Auth?.isAuthenticated?.());form.hidden=!allowed;guestGate.hidden=allowed;inboxButton.hidden=!adminEligible();if(!allowed)uiLocale.setMessage(state, uiLocale.message('يتطلب تسجيل الدخول'));};
  const guestList=()=>{uiLocale.setMessage(state, uiLocale.message('يتطلب تسجيل الدخول'));count.textContent='—';uiLocale.setHTML(list, uiLocale.html`<div class="hl-ticket"><span><strong>سجّل الدخول لعرض التذاكر</strong></span><b class="hl-status closed">—</b></div>`);};
  function clearPrivate(){loadVersion++;form.reset();form.querySelector('button').disabled=false;uiLocale.setMessage(message, uiLocale.message('تُحفظ التذاكر في حسابك ويمكن متابعتها من هذه الصفحة.'));wrap.querySelector('[data-support-link]').textContent='—';guestList();clearAdmin();syncAccess();}
  function renderMine(rows){uiLocale.setHTML(list, rows.length?rows.map(item=>uiLocale.html`<article class="hl-support-case" data-support-case="${esc(item.id)}"><div class="hl-ticket"><strong>${esc(item.subject)}</strong><b class="hl-status">${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(labels[item.status]) || uiLocale.message('قيد المراجعة')))}</b></div><small>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(types[item.type]) || uiLocale.message('طلب خدمة')))} · ${esc(date(item.createdAt))}</small>${deadline(item)}<details><summary>عرض المحادثة ومتابعة الطلب</summary><p>${esc(item.description)}</p>${thread(item)}${(protectedCase(item)?uiLocale.html`<p>تُراجع هذه الحالة من مسار اعتراضات المزود.</p>`:(item.status==='RESOLVED'?uiLocale.html`<form data-support-resolution><label>ردك على الحل<textarea name="message" required maxlength="10000" rows="2"></textarea></label><div class="hl-support-actions"><button type="submit" name="decision" value="ACCEPT">أقبل الحل وأغلق التذكرة</button><button type="submit" name="decision" value="OBJECT">أعترض وأطلب متابعة المعالجة</button></div></form>`:(item.status!=='CLOSED'?uiLocale.html`<form data-support-reply><label>إضافة رد<textarea name="message" required maxlength="10000" rows="2"></textarea></label><button type="submit">إرسال الرد</button></form>`:'')))}<p data-support-case-feedback role="status"></p></details></article>`).join(''):uiLocale.html`<div class="hl-ticket"><span><strong>لا توجد تذاكر</strong><small>يمكنك إنشاء أول تذكرة من النموذج.</small></span><b class="hl-status closed">—</b></div>`);}
  async function load(){
    const generation=++loadVersion;if(!Auth?.isAuthenticated?.()||!Auth?.authorizedFetch){guestList();return;}
    const version=Auth.getSessionVersion(),current=()=>generation===loadVersion&&sessionCurrent(version);
    uiLocale.setMessage(state, uiLocale.message('جارٍ تحميل التذاكر'));count.textContent='—';uiLocale.setMessage(list, uiLocale.message('جارٍ تحميل التذاكر...'));
    try{const rows=await request('/customer-service/cases/mine');if(!current())return;if(!Array.isArray(rows))throw new Error('INVALID_CASE_LIST');uiLocale.setMessage(state, uiLocale.message('متصل بالنظام'));count.textContent=String(rows.length);wrap.querySelector('[data-support-link]').textContent=new Date().toLocaleTimeString('ar-SA');renderMine(rows);}
    catch{if(current()){uiLocale.setMessage(state, uiLocale.message('تعذر تحميل الخدمة'));count.textContent='—';uiLocale.setMessage(list, uiLocale.message('تعذر تحميل التذاكر. أعد المحاولة.'));}}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!Auth?.isAuthenticated?.()||!Auth?.authorizedFetch){uiLocale.setMessage(message, uiLocale.message('سجّل الدخول أولًا.'));return;}
    const data=new FormData(form),body={type:data.get('type'),subject:String(data.get('subject')||'').trim(),description:String(data.get('description')||'').trim()};if(!body.subject||!body.description)return;
    const version=Auth.getSessionVersion(),button=form.querySelector('button');button.disabled=true;
    try{const response=await Auth.authorizedFetch('/customer-service/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!sessionCurrent(version))return;if(!response.ok)throw new Error('CREATE_FAILED');form.reset();uiLocale.setMessage(message, uiLocale.message('تم تسجيل التذكرة في النظام.'));await load();}
    catch{if(sessionCurrent(version))uiLocale.setMessage(message, uiLocale.message('تعذر تسجيل التذكرة. تحقق من تسجيل الدخول وحاول مرة أخرى.'));}
    finally{if(sessionCurrent(version))button.disabled=false;}
  });
  list.addEventListener('submit',async event=>{
    const entryForm=event.target.closest('[data-support-reply],[data-support-resolution]');if(!entryForm)return;event.preventDefault();
    const card=entryForm.closest('[data-support-case]'),id=card?.dataset.supportCase,session=Auth?.getSessionVersion?.(),generation=loadVersion;
    const current=()=>sessionCurrent(session)&&generation===loadVersion&&card.isConnected;if(!id||!current())return;
    const body={message:String(new FormData(entryForm).get('message')||'').trim()};if(!body.message)return;
    const resolution=entryForm.hasAttribute('data-support-resolution');if(resolution){body.decision=event.submitter?.value;if(!['ACCEPT','OBJECT'].includes(body.decision))return;}
    const feedback=card.querySelector('[data-support-case-feedback]');entryForm.querySelectorAll('button').forEach(button=>button.disabled=true);uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ الرد…'));
    try{await request('/customer-service/cases/'+encodeURIComponent(id)+(resolution?'/resolution-response':'/replies'),{method:'POST',body:JSON.stringify(body)});if(current())await load();}
    catch(error){if(current())uiLocale.setMessage(feedback, ([400,409].includes(error.status)?uiLocale.message('تغيرت حالة التذكرة. حدّث التذاكر قبل المتابعة.'):(error.status===403||error.status===404?uiLocale.message('لم تعد هذه التذكرة متاحة لهذا الحساب.'):uiLocale.message('تعذر تأكيد الحفظ. حدّث التذاكر للتحقق ثم حاول مجددًا.'))));}
    finally{if(current())entryForm.querySelectorAll('button').forEach(button=>button.disabled=false);}
  });
  const adminCurrent=(version,session)=>version===adminVersion&&sessionCurrent(session)&&adminEligible()&&view==='admin';
  async function authorize(version,session){const allowed=await window.HydrolandPortalAccess?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>version===adminVersion&&view==='admin'});if(!allowed||!adminCurrent(version,session)){if(version===adminVersion){clearAdmin();syncAccess();}return false;}return true;}
  function lockAdmin(){adminPanel.querySelectorAll('button,input,select,textarea').forEach(node=>node.disabled=adminBusy);adminPanel.querySelector('[data-support-previous]').disabled=adminBusy||adminPage===1;adminPanel.querySelector('[data-support-next]').disabled=adminBusy||adminPage*20>=adminTotal;}
  async function loadAdmin(){
    if(!adminEligible()){clearAdmin();syncAccess();return;}
    setView('admin');const version=++adminVersion,session=Auth.getSessionVersion();detailVersion++;selected=null;adminList.replaceChildren();uiLocale.setMessage(adminDetail, uiLocale.message('اختر تذكرة لعرض سجلها وإجراءاتها.'));uiLocale.setMessage(adminFeedback, uiLocale.message('جارٍ تحميل صندوق خدمة العملاء…'));adminBusy=true;lockAdmin();
    try{if(!await authorize(version,session))return;const [data,owners]=await Promise.all([request('/customer-service/admin/cases?page='+adminPage+'&pageSize=20'),request('/customer-service/admin/cases/assignees')]);if(!adminCurrent(version,session))return;if(!Array.isArray(data?.items)||!Array.isArray(owners))throw new Error('INVALID_INBOX');assignees=owners;adminTotal=data.total;uiLocale.setHTML(adminList, data.items.length?data.items.map(item=>uiLocale.html`<article class="hl-support-case"><button type="button" data-support-select="${esc(item.id)}">${esc(item.subject)}</button><p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(labels[item.status]) || uiLocale.message('قيد المراجعة')))} · ${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(types[item.type]) || uiLocale.message('طلب خدمة')))}</p>${deadline(item)}</article>`).join(''):uiLocale.html`<p>لا توجد تذاكر في صندوق خدمة العملاء.</p>`);uiLocale.setText(adminFeedback, "الصفحة {0} · {1} تذكرة", [adminPage, adminTotal]);}
    catch(error){if(adminCurrent(version,session)){adminList.replaceChildren();adminDetail.replaceChildren();if(error.status===403){clearAdmin();uiLocale.setMessage(message, uiLocale.message('تغيرت صلاحية إدارة خدمة العملاء. أعد فتح الواجهة بعد التحقق.'));}else uiLocale.setMessage(adminFeedback, uiLocale.message('تعذر تحميل الصندوق. أعد المحاولة.'));}}
    finally{if(adminCurrent(version,session)){adminBusy=false;lockAdmin();}}
  }
  function localDate(value){if(!value)return '';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function syncActionFields(entryForm){const action=entryForm.elements.action.value,assignment=['ASSIGN','ESCALATE'].includes(action);entryForm.querySelector('[data-case-owner-fields]').hidden=!assignment;entryForm.elements.assignedAccountId.disabled=!assignment;entryForm.elements.dueAt.disabled=!assignment;entryForm.elements.dueAt.required=assignment&&!selected?.dueAt;entryForm.querySelector('[data-case-message-field]').hidden=action==='ASSIGN';entryForm.elements.message.disabled=action==='ASSIGN';entryForm.elements.message.required=action!=='ASSIGN';}
  function renderDetail(item){
    selected=item;const actorId=window.HydrolandProfileData?.profile?.id,options=[];
    if(['OPEN','ASSIGNED','WAITING_CUSTOMER'].includes(item.status)){options.push('ASSIGN','ESCALATE');if(item.status==='ASSIGNED')options.push('WAIT');if(['ASSIGNED','WAITING_CUSTOMER'].includes(item.status)&&item.assignedAccountId===actorId)options.push('RESOLVE');}
    const owner=assignees.find(row=>row.id===item.assignedAccountId);
    uiLocale.setHTML(adminDetail, uiLocale.html`<h4>${esc(item.subject)}</h4><p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(labels[item.status]) || uiLocale.message('قيد المراجعة')))}</p><p>المسؤول: ${(value=>value?esc(value):uiLocale.messageHTML((item.assignedAccountId?uiLocale.message('يلزم مراجعة تكليف المسؤول'):uiLocale.message('لم يُكلّف مسؤول بعد'))))(owner?.displayName||owner?.email)}</p>${deadline(item)}<p>${esc(item.description)}</p>${thread(item)}${(options.length?uiLocale.html`<form data-support-action><label>الإجراء<select name="action">${options.map(value=>uiLocale.html`<option value="${value}">${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(actions[value]))}</option>`).join('')}</select></label><div data-case-owner-fields><label>المسؤول<select name="assignedAccountId" required><option value="">اختر المسؤول</option>${assignees.map(row=>uiLocale.html`<option value="${esc(row.id)}" ${row.id===item.assignedAccountId?'selected':''}>${esc(row.displayName)} · ${esc(row.email)}</option>`).join('')}</select></label><label>مهلة هذه الحالة<input type="datetime-local" name="dueAt" value="${esc(localDate(item.dueAt))}"></label><small>تُعرض المهلة بتوقيت جهازك. أدخل موعدًا صريحًا عند التكليف الأول.</small></div><label data-case-message-field>الرسالة أو سبب الإجراء<textarea name="message" maxlength="10000" rows="3"></textarea></label><button type="submit">حفظ الإجراء</button></form>`:(item.status==='RESOLVED'?uiLocale.html`<p>يبقى الحل بانتظار قبول العميل أو اعتراضه. يُقفل الطلب عند قبوله.</p>`:uiLocale.html`<p>هذه الحالة مغلقة.</p>`))}<p data-support-action-feedback role="status"></p><details><summary>تاريخ الحالة</summary>${(item.history||[]).map(row=>uiLocale.html`<p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(historyLabels[row.action]) || uiLocale.message('تحديث الحالة')))} · ${esc(date(row.occurredAt))}</p>`).join('')}</details>`);
    if(item.referenceType==='PRIVATE_MESSAGE_ABUSE'){
      const panel=document.createElement('div'),result=document.createElement('p');
      const detail=detailVersion,session=Auth.getSessionVersion();
      const current=()=>selected?.id===item.id&&detailVersion===detail&&Auth.getSessionVersion()===session&&view==='admin';
      for(const action of ['message-evidence','release-message-hold']){
        const release=action==='release-message-hold';
        if(release&&item.status!=='CLOSED')continue;
        const button=document.createElement('button');button.type='button';
        uiLocale.setMessage(button,uiLocale.message(release?'رفع تجميد دليل البلاغ':'مراجعة الرسالة المبلّغ عنها'));
        button.addEventListener('click',async()=>{
          const reason=release?window.prompt(uiLocale.message('سبب زوال الحاجة لحفظ الدليل')):null;
          if(!current()||(release&&!reason))return;
          button.disabled=true;
          try{
            const data=await request('/customer-service/admin/cases/'+encodeURIComponent(item.id)+'/'+action,release?{method:'POST',body:JSON.stringify({reason})}:undefined);
            if(current())result.textContent=release?uiLocale.message(data.released?'رُفع التجميد.':'سُجّل الطلب بانتظار تأكيد مفوّض ثانٍ.'):data.body||data.mediaUrl||'';
          }catch{if(current())uiLocale.setMessage(result,uiLocale.message('تعذرت مراجعة الدليل أو تغيّرت الصلاحية.'))}
          finally{button.disabled=false}
        });
        panel.appendChild(button);
      }
      panel.appendChild(result);adminDetail.appendChild(panel);
    }
      const entryForm=adminDetail.querySelector('[data-support-action]');if(entryForm)syncActionFields(entryForm);
  }
  async function openDetail(id){
    const version=adminVersion,detail=++detailVersion,session=Auth.getSessionVersion(),current=()=>adminCurrent(version,session)&&detail===detailVersion;selected=null;uiLocale.setMessage(adminDetail, uiLocale.message('جارٍ تحميل التذكرة…'));
    try{if(!await authorize(version,session))return;const item=await request('/customer-service/admin/cases/'+encodeURIComponent(id));if(current())renderDetail(item);}
    catch(error){if(current()){adminDetail.replaceChildren();if(error.status===403){clearAdmin();syncAccess();}else uiLocale.setMessage(adminDetail, uiLocale.message('تعذر عرض التذكرة. حدّث الصندوق ثم حاول مجددًا.'));}}
  }
  adminList.addEventListener('click',event=>{const button=event.target.closest('[data-support-select]');if(button&&!adminBusy)void openDetail(button.dataset.supportSelect);});
  adminDetail.addEventListener('change',event=>{const entryForm=event.target.closest('[data-support-action]');if(entryForm&&event.target.name==='action')syncActionFields(entryForm);});
  adminDetail.addEventListener('submit',async event=>{
    const entryForm=event.target.closest('[data-support-action]');if(!entryForm)return;event.preventDefault();if(!selected||adminBusy)return;
    const item=selected,version=adminVersion,detail=detailVersion,session=Auth.getSessionVersion(),current=()=>adminCurrent(version,session)&&detail===detailVersion&&entryForm.isConnected;
    const action=entryForm.elements.action.value,body={};if(['ASSIGN','ESCALATE'].includes(action)){body.assignedAccountId=entryForm.elements.assignedAccountId.value;const value=entryForm.elements.dueAt.value;if(value&&value!==localDate(item.dueAt))body.dueAt=new Date(value).toISOString();}
    if(action!=='ASSIGN')body.message=entryForm.elements.message.value.trim();
    const feedback=adminDetail.querySelector('[data-support-action-feedback]');adminBusy=true;lockAdmin();uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ الإجراء…'));
    try{if(!await authorize(version,session)||!current())return;await request('/customer-service/admin/cases/'+encodeURIComponent(item.id)+'/'+action.toLowerCase(),{method:'POST',body:JSON.stringify(body)});if(!current())return;await loadAdmin();if(adminEligible()&&view==='admin')await openDetail(item.id);}
    catch(error){if(current()){if(error.status===403){clearAdmin();syncAccess();uiLocale.setMessage(message, uiLocale.message('تغيرت صلاحية إدارة خدمة العملاء. أعد التحقق من المسؤول والتكليف.'));}else uiLocale.setMessage(feedback, ([400,409].includes(error.status)?uiLocale.message('تعذر تطبيق الإجراء. حدّث الحالة وتحقق من المسؤول والمهلة.'):uiLocale.message('تعذر تأكيد الحفظ. حدّث الحالة للتحقق قبل المحاولة مجددًا.')));}}
    finally{if(adminCurrent(version,session)){adminBusy=false;lockAdmin();const activeForm=adminDetail.querySelector('[data-support-action]');if(activeForm)syncActionFields(activeForm);}}
  });
  async function openAdmin(){syncAccess();if(!adminEligible())return;adminPage=1;await loadAdmin();}
  inboxButton.addEventListener('click',()=>void openAdmin());
  wrap.querySelector('[data-support-mine]').addEventListener('click',()=>{clearAdmin();void load();});
  wrap.querySelector('[data-support-admin-refresh]').addEventListener('click',()=>void loadAdmin());
  wrap.querySelector('[data-support-previous]').addEventListener('click',()=>{if(adminPage>1&&!adminBusy){adminPage--;void loadAdmin();}});
  wrap.querySelector('[data-support-next]').addEventListener('click',()=>{if(adminPage*20<adminTotal&&!adminBusy){adminPage++;void loadAdmin();}});
  wrap.querySelector('[data-support-refresh]').addEventListener('click',load);
  guestGate.querySelector('button').addEventListener('click',()=>document.querySelector('.hl-login')?.classList.remove('hidden'));
  document.addEventListener('hydroland:session-cleared',clearPrivate);
  document.addEventListener('hydroland:auth-changed',()=>{clearPrivate();void load();});
  for(const name of ['hydroland:role-changed','hydroland:portal-cleared'])document.addEventListener(name,()=>{clearAdmin();syncAccess();});
  document.addEventListener('hydroland:profile-data-ready',syncAccess);
  window.HydrolandSupport=Object.freeze({openAdmin});syncAccess();guestList();void load();
})();
