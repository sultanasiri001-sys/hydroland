(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("diver-dashboard", {
  "عضو HYDROLAND": "HYDROLAND member",
  "لائق": "Fit",
  "الفحص الطبي صالح": "Medical assessment is valid",
  "غير لائق": "Unfit",
  "راجع حالتك الطبية": "Review your medical status",
  "قيد المراجعة": "Under review",
  "بانتظار المراجعة": "Awaiting review",
  "غير محدد": "Not specified",
  "أكمل ملف اللياقة الطبية": "Complete your medical fitness profile",
  "هواة الغوص": "Divers",
  "اللياقة الطبية": "Medical fitness",
  "الشهادات": "Certificates",
  " موثقة": " verified",
  "تم التحقق من شهاداتك": "Your certificates have been verified",
  "لا توجد موثقة": "None verified",
  "أضف شهادتك للتحقق": "Add your certificate for verification",
  "المعدات": "Equipment",
  " نشطة": " active",
  "معداتك المسجلة": "Your registered equipment",
  "غير مكتمل": "Incomplete",
  "أكمل سجل معداتك": "Complete your equipment record",
  "الطقس والبحر": "Weather and sea",
  "حسب موقع الرحلة": "Based on the trip location",
  "مرحبًا بك مجددًا": "Welcome back",
  "استعد لاكتشاف أعماق البحر الأحمر": "Get ready to explore the Red Sea",
  "رحلات مميزة .. تجارب آمنة .. مجتمع واحد.": "Memorable trips. Safe experiences. One community.",
  "__HL_SLOT_1__استكشف الرحلات القادمة __HL_SLOT_2__": "__HL_SLOT_1__Explore upcoming trips __HL_SLOT_2__",
  "استكشف الرحلات القادمة": "Explore upcoming trips",
  "{1}استكشف الرحلات القادمة {2}": "{1}Explore upcoming trips {2}",
  "فتح الإشعارات": "Open notifications",
  "فتح الرسائل الداخلية": "Open internal messages",
  "خدمات الغواص": "Diver services",
  "الإجراءات السريعة": "Quick actions",
  "__HL_SLOT_7__جاهزيتك للغوص": "__HL_SLOT_7__Your diving readiness",
  "جاهزيتك للغوص": "Your diving readiness",
  "{7}جاهزيتك للغوص": "{7}Your diving readiness",
  "راجع بياناتك قبل رحلتك القادمة": "Review your information before your next trip",
  "مركز السلامة": "Safety center",
  "تلخص هذه المؤشرات ملفك؛ قرار تشغيل الرحلة يصدر بعد مراجعة السلامة.": "These indicators summarize your profile; the trip operating decision follows the safety review.",
  "سجل الغوص": "Dive log",
  "من سجل الغوص": "From your dive log",
  "الشهادات الموثقة": "Verified certificates",
  "من حسابك": "From your account",
  "المعدات النشطة": "Active equipment",
  "معداتك الشخصية": "Your personal equipment",
  "من ملف الغواص": "From your diver profile",
  "الرحلات والحجوزات": "Trips and bookings",
  "اختر مغامرتك القادمة": "Choose your next adventure",
  "وثّق لحظاتك تحت الماء": "Record your underwater experiences",
  "بيانات الغواص": "Diver profile",
  "ملفك الطبي والطوارئ": "Your medical and emergency information",
  "معدات الغواص": "Diver equipment",
  "جاهز لكل رحلة": "Ready for every trip",
  "إنجازاتك في مكان واحد": "Your achievements in one place",
  "المتجر والتأجير": "Store and rentals",
  "اكتشف معداتك القادمة": "Find your next equipment",
  "اكتشف المزيد __HL_SLOT_5__": "Discover more __HL_SLOT_5__",
  "اكتشف المزيد": "Discover more",
  "اكتشف المزيد {5}": "Discover more {5}",
  "{0} موثقة": "{0} verified",
  "{0} نشطة": "{0} active",
  "موثقة": "verified",
  "نشطة": "active"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Read live preference per action; missing media support must not animate.
  const residualScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
 if(document.getElementById('hl-diver-dashboard'))return;
 const main=document.getElementById('main');if(!main)return;
 const {icon,esc}=window.HydrolandUI;
 const dashboard=document.createElement('section');dashboard.id='hl-diver-dashboard';dashboard.className='hl-diver-dashboard';dashboard.hidden=true;main.prepend(dashboard);
 const displayName=profile=>{const name=[profile?.person?.firstName,profile?.person?.lastName].filter(Boolean).join(' ').trim();return name&&name!=='Pending Profile'?name:uiLocale.message('عضو HYDROLAND')};
 const medicalState=value=>value==='FIT'?['ok','لائق','الفحص الطبي صالح']:value==='UNFIT'?['blocked','غير لائق','راجع حالتك الطبية']:value==='REVIEW'?['review','قيد المراجعة','بانتظار المراجعة']:['review','غير محدد','أكمل ملف اللياقة الطبية'];
 let snapshot='';
 function render(){
   if(!window.HydrolandAuth?.isAuthenticated?.()||(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver')!=='diver'){dashboard.hidden=true;snapshot='';const account=document.getElementById('profile-open');if(account?.classList.contains('hl-diver-account')){account.classList.remove('hl-diver-account');account.textContent='H'}return}
   dashboard.hidden=false;
   const data=window.HydrolandProfileData||{},profile=data.profile||null,credentials=Array.isArray(data.credentials)?data.credentials:[],equipment=Array.isArray(data.equipment)?data.equipment:[];
   const next=JSON.stringify([profile,credentials,equipment,data.diverProfile]);if(snapshot===next)return;snapshot=next;
   const account=document.getElementById('profile-open'),name=displayName(profile);if(account){account.classList.add('hl-diver-account');uiLocale.setHTML(account, uiLocale.html`<span class="hl-diver-initial" aria-hidden="true">${esc(Array.from(String(name))[0])}</span><span class="hl-diver-account-copy"><b>${uiLocale.messageHTML(name)}</b><small>هواة الغوص</small></span>${icon('arrow')}`)}
   const verified=credentials.filter(item=>['VERIFIED','DOCUMENT_VERIFIED'].includes(item?.verificationStatus)),activeEquipment=equipment.filter(item=>item?.status==='ACTIVE'),medical=medicalState(data.diverProfile?.medicalFitnessStatus);
   const readiness=[['heart','اللياقة الطبية',medical],['certificate','الشهادات',verified.length?['ok',uiLocale.message('{0} موثقة',[verified.length]),'تم التحقق من شهاداتك']:['review','لا توجد موثقة','أضف شهادتك للتحقق']],['tanks','المعدات',activeEquipment.length?['ok',uiLocale.message('{0} نشطة',[activeEquipment.length]),'معداتك المسجلة']:['review','غير مكتمل','أكمل سجل معداتك']],['cloud','الطقس والبحر',['review','غير محدد','حسب موقع الرحلة']]];
   uiLocale.setHTML(dashboard, uiLocale.html`<header class="hl-diver-head"><div><small>YOUR NEXT ADVENTURE AWAITS</small><h1>مرحبًا بك مجددًا<br><span>${uiLocale.messageHTML(displayName(profile))}</span></h1><p>استعد لاكتشاف أعماق البحر الأحمر<br>رحلات مميزة .. تجارب آمنة .. مجتمع واحد.</p><button type="button" class="primary-button" data-diver-route="trips">${icon('compass')}استكشف الرحلات القادمة ${icon('arrow')}</button></div><div class="hl-diver-utility"><button type="button" class="icon-button" data-diver-notifications aria-label="فتح الإشعارات">${icon('bell')}</button><button type="button" class="icon-button" data-diver-messages aria-label="فتح الرسائل الداخلية">${icon('mail')}</button></div></header>
   <div class="hl-diver-overview">${[['water','سجل الغوص','—','من سجل الغوص','logbook'],['certificate','الشهادات الموثقة',verified.length,'من حسابك','certs'],['tanks','المعدات النشطة',activeEquipment.length,'معداتك الشخصية','diver-equipment-list'],['heart','اللياقة الطبية',medical[1],'من ملف الغواص','diver-profile']].map(([art,label,value,copy,action])=>uiLocale.html`<button type="button" class="hl-diver-metric" data-metric-art="${art}" data-hl-action="${action}">${icon(art)}<div><small>${uiLocale.label(label)}</small><strong>${uiLocale.label(value)}</strong><span>${uiLocale.label(copy)}</span></div><i class="hl-metric-arrow" aria-hidden="true">${icon('arrow')}</i></button>`).join('')}</div>
   <section class="hl-diver-actions hl-panel" aria-label="خدمات الغواص"><header class="hl-diver-section-head"><h2>الإجراءات السريعة</h2></header><div class="hl-diver-action-grid">${[['boat','الرحلات والحجوزات','اختر مغامرتك القادمة','data-diver-route="trips"'],['water','سجل الغوص','وثّق لحظاتك تحت الماء','data-hl-action="logbook"'],['user','بيانات الغواص','ملفك الطبي والطوارئ','data-hl-action="diver-profile"'],['tanks','معدات الغواص','جاهز لكل رحلة','data-hl-action="diver-equipment-list"'],['certificate','الشهادات','إنجازاتك في مكان واحد','data-hl-action="certs"'],['bag','المتجر والتأجير','اكتشف معداتك القادمة','data-diver-route="store"']].map(([art,label,copy,attrs],index)=>uiLocale.html`<button type="button" ${attrs} data-art="${index}"><span class="hl-action-art">${icon(art)}</span><b>${uiLocale.label(label)}</b><small>${uiLocale.label(copy)}</small><span class="hl-action-link">اكتشف المزيد ${icon('arrow')}</span></button>`).join('')}</div></section>
   <section class="hl-diver-readiness"><header><h2>${icon('shield')}جاهزيتك للغوص</h2><p>راجع بياناتك قبل رحلتك القادمة</p><button type="button" data-diver-route="safety">مركز السلامة</button></header><div class="hl-diver-ready-list">${readiness.map(([art,label,state])=>uiLocale.html`<article class="hl-diver-ready-row"><div>${icon(art)}<b>${uiLocale.label(label)}</b></div><strong class="hl-readiness-${state[0]}">${icon(state[0]==='ok'?'check':'shield')}${uiLocale.messageHTML(typeof state[1]==='string'?uiLocale.message(state[1]):state[1])}</strong><small>${uiLocale.label(state[2])}</small></article>`).join('')}</div><small class="hl-diver-foot">تلخص هذه المؤشرات ملفك؛ قرار تشغيل الرحلة يصدر بعد مراجعة السلامة.</small></section>`);
   window.HydrolandI18n?.bindNavigation();
 }
 dashboard.addEventListener('click',event=>{if(event.target.closest('[data-diver-notifications]')){window.HydrolandAccountCenter?.openNotifications?.();return}if(event.target.closest('[data-diver-messages]')){window.HydrolandMessages?.open?.();return}const route=event.target.closest('[data-diver-route]')?.dataset.diverRoute;if(!route)return;const target=document.getElementById(route);window.HydrolandWorkspaceUI?.show?.(target);history.replaceState(null,'','#'+route);target?.scrollIntoView({behavior: residualScrollBehavior(),block:'start'})});
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>queueMicrotask(render));
 window.HydrolandDiverDashboard={refresh:render};render();
})();
