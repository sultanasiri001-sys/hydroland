(()=>{
  const {icon,brand,emblem,esc}=window.HydrolandUI;
  const consoleEl=document.getElementById('role-console');if(!consoleEl)return;

  const configs={
    instructor:{
      k:'DIVE PROFESSIONALS · محترفي الغوص',t:'لوحة محترفي الغوص',s:'إدارة التدريب والطلاب والجدول والشهادات والإيرادات من مساحة واحدة.',icon:'🤿',
      m:[['—','طلاب نشطون'],['—','جلسات اليوم'],['—','شهادات جاهزة'],['—','تقييم المدرب']],
      nav:['الرئيسية','إدارة الدورات','الطلاب','الجدول الزمني','التقييمات','الشهادات','الإيرادات'],
      a:[['إدارة الدورات','training','▱'],['إدارة الطلاب','training','♟'],['جدول التدريب','training','◫'],['تقييم المهارات','training','✓'],['إصدار الشهادات','training','◇'],['الإيرادات','finance','◈']],
      q:[['جلسات التدريب','من النظام'],['الطلاب بانتظار التقييم','من النظام'],['شهادات بانتظار الاعتماد','من النظام']],
      spotlight:['جلسات اليوم','يعرض النظام الجلسات المؤكدة والمواقع والطلاب عند توفر البيانات.'],
      lower:[['المواد التدريبية','إدارة مواد الدورة والتقييمات'],['سجل الحضور','توثيق الحضور والمهارات'],['الملف المهني','الشهادات والاعتمادات والتقييمات']]
    },
    center:{
      k:'DIVE CENTER · مركز الغوص',t:'تشغيل مركز الغوص',s:'تشغيل الحجوزات والرحلات والمعدات ومحترفي الغوص والتقارير والملف التجاري.',icon:'◉',
      m:[['—','حجوزات جديدة'],['—','رحلات اليوم'],['—','جاهزية المعدات'],['—','مراجعات سلامة']],
      nav:['الرئيسية','إدارة الحجوزات','الرحلات','المعدات والمخزون','محترفي الغوص','العملاء','المستندات والتراخيص','التقارير','الملف التجاري'],
      a:[['إدارة الحجوزات','trips','▣'],['إدارة الرحلات','trips','⌖'],['المخزون والمعدات','store','◫'],['الطاقم والمدربين','trips','♟'],['المستندات والتراخيص','documents','◇'],['تقارير السلامة','safety','⬡'],['التقارير المالية','finance','◈']],
      q:[['الحجوزات المؤكدة','من النظام'],['رحلات اليوم','من النظام'],['فحوص المعدات','من النظام']],
      spotlight:['تشغيل اليوم','الحجوزات والرحلات وحالة الجاهزية تظهر من بيانات التشغيل المتصلة.'],
      lower:[['المعدات والمخزون','التوفر والصيانة والاستئجار'],['محترفي الغوص','المدربين والجداول والتكليفات'],['الملف التجاري','الوثائق والتراخيص والتقييمات']]
    },
    boat:{
      k:'MARINE VESSELS · الوسائط البحرية',t:'لوحة الوسائط البحرية',s:'إدارة القوارب والرحلات والحجوزات والصيانة والطاقم والتراخيص والخدمات الفنية.',icon:'⛵',
      m:[['—','قوارب نشطة'],['—','رحلات مجدولة'],['—','فحوص صيانة'],['—','حجوزات مؤكدة']],
      nav:['الرئيسية','إدارة القوارب','الرحلات والحجوزات','الطاقم','الجدولة والتقويم','الصيانة والمعدات','السلامة واللوائح','الطقس وحالة البحر','المستندات والتراخيص','المالية والفواتير','التقييمات','التسويق والعروض','التقارير'],
      a:[['إدارة القوارب','trips','⛵'],['إنشاء رحلة','trips','⌖'],['إدارة الحجوزات','trips','▣'],['إدارة الطاقم','trips','♟'],['سجل الصيانة','store','⌁'],['السلامة واللوائح','safety','⬡'],['حالة البحر والطقس','marine-intelligence','☀'],['المستندات والتراخيص','marine-documents','◇'],['المالية والفواتير','finance','◈'],['التسويق والعروض','community','★']],
      q:[['فحص قبل الإبحار','من النظام'],['الصيانة القادمة','من النظام'],['التراخيص والوثائق','من النظام']],
      spotlight:['حالة الأسطول','يعرض النظام القوارب وحالة الجاهزية والصيانة والرحلات عند توفر البيانات.'],
      lower:[['الخدمات الفنية','فنيون وورش وطلبات صيانة'],['قطع الغيار','مزودون وطلبات قطع الغيار'],['الربط مع المراكز','طلبات الربط واعتماد مركز الغوص']]
    },
    organization:{
      k:'CORPORATE & GOVERNMENT · الشركات والجهات الحكومية',t:'بوابة الشركات والجهات الحكومية',s:'طلبات الخدمات البحرية والعقود والمشاركون والوثائق والاعتمادات والتقارير.',icon:'◆',
      m:[['—','طلبات خدمة'],['—','عقود للمراجعة'],['—','مشاركون'],['—','اعتمادات مطلوبة']],
      nav:['الرئيسية','طلبات الخدمات','الحجوزات والعقود','المشاركون','المستندات والتصاريح','السلامة والامتثال','التقارير','الفواتير'],
      a:[['طلبات الخدمات البحرية','trips','⌖'],['العقود الإلكترونية','documents','◇'],['تصاريح المشاركين','community','♟'],['رفع الوثائق','documents','▣'],['التوقيع الإلكتروني','documents','✎'],['طلب اعتماد الإدارة','documents','✓'],['متابعة الحالة','documents','◌'],['تقارير الالتزام','safety','⬡'],['الفواتير','finance','◈']],
      q:[['العقود','من النظام'],['طلبات الاعتماد','من النظام'],['المستندات المطلوبة','من النظام']],
      spotlight:['مسار الموافقات','كل طلب يمر بحالة واضحة من الإنشاء إلى المراجعة والاعتماد والتوثيق.'],
      lower:[['التوقيع الإلكتروني','متابعة العقود والتوقيعات'],['تقارير السلامة','تقارير الرحلات والمشاركين'],['إدارة المشاركين','القوائم والوثائق والأهلية']]
    },
    admin:{
      k:'HYDROLAND CONTROL TOWER · الإدارة',t:'مركز القيادة والتحكم',s:'لوحة موحدة لإدارة المستخدمين والاعتمادات والرحلات والسلامة والمالية؛ الربط الخارجي مؤجل.',icon:'H',
      m:[['—','طلبات اعتماد'],['—','رحلات مفتوحة'],['—','مراجعات امتثال'],['—','حالة النظام']],
      nav:['مركز القيادة والتحكم','المستخدمون','الموافقات والطلبات','مراكز الغوص','محترفي الغوص','الوسائط البحرية','الشركات والجهات الحكومية','الرحلات والحجوزات','المعدات والمستودعات','السلامة والامتثال','المالية والفواتير','التقارير والإحصائيات','الذكاء الاصطناعي','إدارة المحتوى','الإشعارات والرسائل','الإعدادات'],
      a:[['الاعتمادات','admin','✓'],['إدارة المستخدمين','admin','♟'],['الرحلات والحجوزات','trips','⌖'],['المعدات والمستودعات','store','▣'],['مركز الحوادث','safety','⬡'],['الطقس وحالة البحر','marine-intelligence','☀'],['المالية والفواتير','finance','◈'],['إعدادات المنصة','admin','⚙'],['التقارير والإحصائيات','admin','▥'],['إدارة المحتوى','community','★']],
      q:[['طلبات اعتماد المراكز','من النظام'],['طلبات محترفي الغوص','من النظام'],['مراجعات السلامة','من النظام']],
      spotlight:['مركز القيادة والتحكم','المؤشرات والخرائط والتنبيهات تعتمد على البيانات الفعلية ولا تعرض أرقامًا تجريبية.'],
      lower:[['مركز السلامة والطوارئ','الحوادث وحالة الرحلات'],['الجهات الخارجية · مؤجل','لا يوجد ربط أو إرسال خارجي مفعّل حاليًا'],['الذكاء الاصطناعي','الوكلاء والموافقات البشرية']]
    }
  };

  function clearDashboard(){document.querySelector('.hl-role-dashboard')?.remove()}
  const syncDashboardIdentity=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const person=window.HydrolandProfileData?.profile?.person||{},name=[person.firstName,person.lastName].filter(Boolean).join(' ').trim();d.querySelectorAll('[data-portal-name],[data-center-name]').forEach(node=>{const value=name||'حساب HYDROLAND';if(node.textContent!==value)node.textContent=value});d.querySelectorAll('[data-portal-avatar],[data-center-avatar]').forEach(node=>{const value=(person.firstName||'H').trim().slice(0,1).toUpperCase();if(node.textContent!==value)node.textContent=value})};
  const loadInstructorSummary=async d=>{
    const auth=window.HydrolandAuth;if(!d||d.dataset.role!=='instructor'||!auth?.isAuthenticated?.())return;
    const session=auth.getSessionVersion?.();
    try{
      const response=await auth.authorizedFetch('/training/professional/me');
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.message||'PROFILE_UNAVAILABLE');
      if(!d.isConnected||session!==auth.getSessionVersion?.()||d.dataset.role!=='instructor')return;
      const tiles=d.querySelectorAll('.hl-role-tile b');
      const values=[data?.metrics?.activeStudents??0,data?.metrics?.sessionsToday??0,data?.metrics?.verifiedCredentials??0,data?.metrics?.completedSessions??0];
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      const profile=data?.profile||{};
      const name=profile.displayName||'محترف غوص';
      d.querySelectorAll('[data-portal-name]').forEach(node=>node.textContent=name);
      const spotlight=d.querySelector('.hl-role-spotlight p,.hl-role-spotlight small');
      if(spotlight)spotlight.textContent=[profile.headline,profile.regionCode].filter(Boolean).join(' · ')||'الملف المهني مرتبط ببيانات الحساب والشهادات الموثقة.';
      d.dataset.professionalProfileLoaded='1';
    }catch{
      if(d.isConnected){d.dataset.professionalProfileLoaded='0';d.querySelectorAll('.hl-role-tile b').forEach(node=>node.textContent='—');}
    }
  };
  const ensureWeatherAdmin=()=>{if(document.querySelector('script[data-hl-weather-admin]'))return;const script=document.createElement('script');script.src='./hydroland-weather-admin.js';script.dataset.hlWeatherAdmin='1';document.body.appendChild(script)};
  const denyRoleAction=()=>{clearDashboard();const exit=document.getElementById('exit-role');if(exit)exit.click();else window.HydrolandPortalAccess?.clearProtectedPortal?.();return false};
  const authorizeRoleAction=async role=>{const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;if(!auth?.isAuthenticated?.()||!access?.roleAllowed?.(role))return denyRoleAction();if(typeof access.refreshPortalAccess!=='function')return denyRoleAction();await access.refreshPortalAccess();if(window.HydrolandPortalFreshness?.enforce?.()===false)return false;if(!auth.isAuthenticated()||!access.roleAllowed(role))return denyRoleAction();return true};
  const routeSelectors={finance:'.hl-finance',admin:'.hl-admin',documents:'#hl-documents','marine-documents':'#hl-marine-documents',inventory:'.hl-inventory',training:'.hl-training',crew:'.hl-crew-assignments',organizations:'.hl-organizations',incidents:'#hl-safety-incidents','trip-admin':'.hl-trip-admin','store-admin':'.hl-store-admin',weather:'.hl-weather-admin',procurement:'.hl-procurement',logistics:'.hl-logistics','theme-admin':'.hl-theme-admin'};
  const targetFor=id=>routeSelectors[id]?document.querySelector(routeSelectors[id]):document.getElementById(id);
  const openTarget=(id,role,label)=>{const actualId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id;const target=targetFor(actualId);if(actualId==='documents')window.HydrolandDocuments?.open?.();if(actualId==='marine-documents')window.HydrolandMarineDocuments?.open?.(role);if(actualId==='incidents')window.HydrolandSafetyIncidents?.open?.(role);if(actualId==='training')window.HydrolandTraining?.reload?.(id==='training-schedule'?'instructor-schedule':id==='training-skills'?'instructor-skills':id==='training-certificates'?'instructor-certificates':id==='training-earnings'?'instructor-earnings':role==='instructor'?'instructor':undefined);if(actualId==='hl-marine-readiness')window.HydrolandMarineReadiness?.open?.(role);window.HydrolandWorkspaceUI?.show?.(target)};
  const setTargetAvailability=(node,id,label)=>{if(!node.hasAttribute('data-hl-original-aria-label'))node.dataset.hlOriginalAriaLabel=node.getAttribute('aria-label')||'';const resolvedId=['training-schedule','training-skills'].includes(id)?'training':id,target=targetFor(resolvedId),available=Boolean(target&&!target.classList.contains('hl-workspace-hidden')&&(!target.hidden||['documents','marine-documents','incidents','hl-marine-readiness'].includes(id)));node.disabled=!available;if(available){node.removeAttribute('aria-disabled');node.title='';node.removeAttribute('data-hl-unavailable');if(node.dataset.hlOriginalAriaLabel)node.setAttribute('aria-label',node.dataset.hlOriginalAriaLabel);else node.removeAttribute('aria-label')}else{node.setAttribute('aria-disabled','true');node.title='الخدمة جارٍ تحميلها أو غير متاحة';node.dataset.hlUnavailable='1';node.setAttribute('aria-label',label+' · الخدمة غير متاحة حاليًا')}return available};
  const connectControl=(node,role,id,label)=>{node.dataset.hlRoute=id;node.dataset.hlRole=role;if(!node.dataset.hlConnected){node.dataset.hlConnected='1';node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();const route=node.dataset.hlRoute,activeRole=node.dataset.hlRole;if(!(await authorizeRoleAction(activeRole)))return;const target=targetFor(['training-schedule','training-skills'].includes(route)?'training':route);if(!target){setTargetAvailability(node,route,label);return}openTarget(route,activeRole,label);if(route==='training'&&activeRole==='instructor')return;target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(route==='documents'?'hl-documents':route==='marine-documents'?'hl-marine-documents':route))})}return setTargetAvailability(node,id,label)};
  const portalNavTargets={'إدارة الدورات':'training','الطلاب':'training','الجدول الزمني':'training','التقييمات':'community','الشهادات':'community','الإيرادات':'finance','إدارة الحجوزات':'trips','الرحلات':'trips','المعدات والمخزون':'store','محترفي الغوص':'training','العملاء':'community','التقارير':'admin','الملف التجاري':'community','إدارة القوارب':'trips','الرحلات والحجوزات':'trips','الطاقم':'trips','الجدولة والتقويم':'trips','الصيانة والمعدات':'store','السلامة واللوائح':'safety','الطقس وحالة البحر':'marine-intelligence','المالية والفواتير':'finance','التسويق والعروض':'community','طلبات الخدمات':'trips','الحجوزات والعقود':'community','المشاركون':'community','المستندات والتصاريح':'documents','السلامة والامتثال':'safety','الفواتير':'finance','المستخدمون':'admin','الموافقات والطلبات':'admin','مراكز الغوص':'admin','الوسائط البحرية':'admin','الشركات والجهات الحكومية':'admin','المعدات والمستودعات':'store','التقارير والإحصائيات':'admin','الذكاء الاصطناعي':'admin','إدارة المحتوى':'community','الإشعارات والرسائل':'community','الإعدادات':'admin'};
  const portalNavTarget=(role,label)=>{if(label==='المستندات والتراخيص')return role==='boat'?'marine-documents':'documents';if(label==='الصيانة والمعدات'&&role==='boat')return 'hl-marine-readiness';if(role==='admin'&&label==='الوسائط البحرية')return 'marine-documents';if(['المعدات والمخزون','المعدات والمستودعات'].includes(label))return 'inventory';if(label==='الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';if(label==='الذكاء الاصطناعي'||label==='التسويق والعروض')return null;return portalNavTargets[label]};
  const reconnectDashboard=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const role=d.dataset.role;d.querySelectorAll('[data-hl-route]').forEach(node=>connectControl(node,role,node.dataset.hlRoute,node.dataset.actionLabel||node.dataset.secondaryLabel||node.textContent.trim()));d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>{if(index===0)return;const label=node.dataset.portalLabel,id=portalNavTarget(role,label);if(!id){node.disabled=true;node.title='قيد الربط بالخدمة';node.setAttribute('aria-disabled','true');return}node.dataset.hlNavRoute=id;setTargetAvailability(node,id,label)})};
  let reconnectQueued=false;new MutationObserver(()=>{if(reconnectQueued)return;reconnectQueued=true;queueMicrotask(()=>{reconnectQueued=false;reconnectDashboard()})}).observe(document.body,{childList:true,subtree:true});

  const iconFor=label=>/الرئيسية|القيادة/.test(label)?'home':/سلامة|امتثال|حوادث/.test(label)?'shield':/مستند|وثائق|عقود|تراخيص|تصاريح|توقيع/.test(label)?'file':/مالية|إيراد|فواتير/.test(label)?'chart':/معدات|مخزون|مستودع|غيار/.test(label)?'tanks':/دورات|تدريب|محترفي|المواد/.test(label)?'learn':/شهادات|اعتماد|موافقة/.test(label)?'certificate':/طقس|البحر/.test(label)?'cloud':/قارب|قوارب|رحل|أسطول/.test(label)?'boat':/جدول|جلسات|تقويم/.test(label)?'calendar':/رسائل|إشعارات/.test(label)?'mail':/إعداد|صيانة|فنية/.test(label)?'settings':/مستخدم|طلاب|طاقم|عملاء|مشارك|مركز|جهات/.test(label)?'people':/ذكاء/.test(label)?'bot':/تقارير|تقييم/.test(label)?'chart':'compass';
  const actionRoute=(role,label,fallback)=>{
    if(label==='مركز الحوادث')return 'incidents';if(label==='المخزون والمعدات'||label==='المعدات والمستودعات')return 'inventory';if(label==='إدارة المحتوى')return 'theme-admin';if(label==='إعدادات المنصة')return 'admin';
    if(label==='إدارة الرحلات'||label==='إنشاء رحلة'||(label==='الرحلات والحجوزات'&&role==='admin'))return 'trip-admin';if(label==='الطاقم والمدربين'||label==='إدارة الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='سجل الصيانة')return 'hl-marine-readiness';if(label==='حالة البحر والطقس'||label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';
    if(role==='instructor'&&label==='جدول التدريب')return 'training-schedule';if(role==='instructor'&&label==='تقييم المهارات')return 'training-skills';if(role==='instructor'&&label==='إصدار الشهادات')return 'training-certificates';if(role==='instructor'&&label==='الإيرادات')return 'training-earnings';if(label==='التسويق والعروض')return null;return fallback;
  };
  const highlights=()=>`<div class="hl-center-highlights">${[['shield','سلامة أولًا'],['water','تجارب مميزة'],['settings','تشغيل احترافي'],['boat','رحلات بحرية موثقة']].map(([art,text])=>`<span>${icon(art)}${text}</span>`).join('')}</div>`;
  const panel=(title,art,body,cls='')=>`<section class="hl-panel hl-board-panel ${cls}"><h4 class="hl-panel-title">${icon(art)}${title}</h4>${body}</section>`;
  const rows=items=>`<div class="hl-board-rows">${items.map(([title,state])=>`<div><span>${title}</span><b>${state}</b></div>`).join('')}</div>`;
  const action=(label,route,secondary=false)=>`<button type="button" ${secondary?'data-secondary-label':'data-action-label'}="${label}" ${route?`data-route="${route}"`:'disabled aria-disabled="true" title="قيد الربط بالخدمة"'}>${label}${icon('arrow')}</button>`;
  const safetyPanel=()=>panel('مركز السلامة والامتثال','shield',`<div class="hl-board-safety">${icon('shield')}<strong>السلامة أولًا</strong><span>راجع جاهزية الرحلة قبل الانطلاق</span></div>${rows([['قوائم الفحص','حسب الرحلة'],['قرار التشغيل','من مراجعة السلامة']])}${action('تقارير السلامة','safety')}`,'hl-safety-board');
  const queuePanel=c=>panel(c.spotlight[0],'calendar',`${rows(c.q)}${action('عرض قائمة التشغيل','trips')}`,'hl-queue');
  const documentsPanel=()=>panel('المستندات والتصاريح','file',`${rows([['العقود والتقارير','مراجعة'],['الوثائق الموقعة','عرض الحالة']])}${action('المستندات والتراخيص','documents')}`);
  const adminPanels=()=>`<div class="hl-portal-lower hl-admin-lower">${panel('تكامل النظام','link',`<div class="hl-integration-grid">${[['people','الحسابات'],['file','المستندات'],['boat','الرحلات'],['chart','المالية']].map(([art,title])=>`<span>${icon(art)}${title}</span>`).join('')}</div><div class="hl-insight-cards"><article><h5>الجهات الخارجية · مؤجل</h5><p>لم يُفعّل الربط الخارجي بعد.</p><button type="button" disabled aria-disabled="true">الربط الخارجي مؤجل</button></article></div>`)}${safetyPanel()}${panel('الموافقات والطلبات','certificate',`${rows([['المراكز والمستخدمون','قائمة الاعتمادات'],['الشهادات المهنية','المراجعة والتوثيق'],['طلبات الخدمات','متابعة الحالة']])}${action('فتح الاعتمادات','admin')}`)}</div>${panel('التنبيهات والإشعارات','bell',`<div class="hl-notification-summary"><span>${icon('mail')}رسائل الحساب والتنبيهات التشغيلية</span><button type="button" data-board-notifications>فتح مركز الإشعارات ${icon('arrow')}</button></div>`,'hl-board-notifications')}`;
  const lowerFor=(role,c)=>{
    if(role==='admin')return adminPanels();
    if(role==='organization')return `<div class="hl-portal-lower hl-organization-lower">${panel('الرسائل والإشعارات','mail',`<p>تابع مراسلات الجهة وفريقك</p><button type="button" data-board-messages>فتح الرسائل ${icon('arrow')}</button>`)}${safetyPanel()}${documentsPanel()}${panel('مسار الموافقات','certificate',`<ol class="hl-approval-stages"><li>إنشاء الطلب</li><li>المراجعة والتوقيع</li><li>الاعتماد والتوثيق</li></ol>${action('عرض مسار الموافقات','documents')}`)}</div>`;
    if(role==='center')return `<div class="hl-portal-lower"><div class="hl-board-stack">${panel('حالة المعدات والمخزون','tanks',`${rows([['أسطوانات الغوص','من النظام'],['مستلزمات السلامة','من النظام'],['معدات الغوص','من النظام']])}${action('عرض المخزون','inventory')}`,'hl-center-stock')}${panel('جدول الرحلات والتدريب','calendar',`${rows([['الرحلات القادمة','من الجدول']])}${action('عرض الجدول','trips')}`,'hl-center-schedule')}</div>${safetyPanel()}${queuePanel(c)}</div>`;
    if(role==='boat')return `<div class="hl-portal-lower">${panel('الخدمات الفنية وقطع الغيار','wrench',`${rows([['الصيانة والمعدات','سجل المعدات'],['المشتريات','متابعة الطلبات']])}${action('الخدمات الفنية','inventory',true)}${action('قطع الغيار','procurement',true)}`)}${safetyPanel()}${queuePanel(c)}</div>`;
    return `<div class="hl-portal-lower">${panel('التدريب والتقييم','learn',`${rows([['المواد التدريبية','إدارة الدورات'],['الحضور والمهارات','سجل التدريب']])}${action('المواد التدريبية','training',true)}`)}${panel('الشهادات والملف المهني','certificate',`<p>شهاداتك واعتماداتك وجداول التكليف</p>${action('الملف المهني','community',true)}`)}${queuePanel(c)}</div>`;
  };
  function render(role){
    clearDashboard();
    if(role==='diver'||!window.HydrolandAuth?.isAuthenticated?.()||!window.HydrolandPortalAccess?.roleAllowed?.(role))return;
    const c=configs[role];if(!c)return;if(role==='admin')ensureWeatherAdmin();
    const d=document.createElement('section');d.className='hl-role-dashboard';d.dataset.role=role;
    const center=role==='center',operational=['center','boat','instructor'].includes(role),heroTitle={center:'تشغيل مركز الغوص',admin:'مركز القيادة والإدارة',organization:'بوابة الشركات والجهات الحكومية',instructor:'محترفي الغوص',boat:'الوسائط البحرية'}[role];
    const heroSubtitle={center:'نظم رحلاتك… واصنع تجربة غوص استثنائية',admin:'كل ما تحتاجه لإدارة منظومة هيدرولاند في مكان واحد',organization:'حلول بحرية متكاملة لشراكات طموحة',instructor:'علّم، ألهم… واصنع جيلًا من الغواصين',boat:'أدر أسطولك وخدماتك البحرية بثقة'}[role];
    const actions=c.a.filter(([label])=>!center||label!=='المستندات والتراخيص');
    if(role==='organization')actions.push(['الرحلات والحجوزات','trips']);
    d.innerHTML=`${center?`<header class="hl-center-masthead"><a class="brand" href="#home">${brand()}</a><div class="hl-saudi-mark">${emblem}<span>المملكة العربية السعودية</span></div></header>`:''}<div class="hl-portal-shell">
      <aside class="hl-portal-nav" aria-label="${c.t}">
        ${!center?`<a class="brand" href="#home">${brand()}</a>`:''}
        <section class="hl-portal-member ${center?'hl-center-member':''}"><span class="avatar" ${center?'data-center-avatar':'data-portal-avatar'}>H</span><div><b ${center?'data-center-name':'data-portal-name'}>حساب HYDROLAND</b><small>${c.t}</small></div></section>
        <nav>${c.nav.map((label,index)=>`<button type="button" class="hl-portal-nav-item${index===0?' active':''}" data-portal-label="${label}" ${index===0?'aria-current="page"':''}>${icon(iconFor(label))}<span>${label}</span></button>`).join('')}</nav>
        <div class="hl-portal-safe"><p lang="en" dir="ltr">Explore · Learn<br>Protect · Belong</p><button type="button" class="hl-portal-switch" data-portal-switch>${icon('people')}تبديل الواجهة</button><button type="button" class="hl-portal-switch" data-hl-action="logout">${icon('arrow')}تسجيل الخروج</button></div>
      </aside>
      <div class="hl-portal-main"><header class="hl-portal-topbar"><button type="button" class="icon-button hl-portal-menu" aria-label="فتح قائمة البوابة" aria-expanded="false" data-portal-menu>${icon('menu')}</button><form class="hl-portal-search" role="search"><input aria-label="بحث في المنصة" placeholder="ابحث في هيدرولاند…"><button type="submit" aria-label="بحث">${icon('search')}</button></form><div class="hl-portal-utility"><button type="button" class="icon-button" data-portal-notifications aria-label="فتح الإشعارات">${icon('bell')}</button><button type="button" class="icon-button" data-portal-messages aria-label="فتح الرسائل الداخلية">${icon('mail')}</button><button type="button" class="hl-portal-account" data-portal-profile><span class="avatar" data-portal-avatar>H</span><span data-portal-name>حساب HYDROLAND</span></button></div></header>
      <div class="hl-portal-content"><header class="hl-role-head${center?' hl-center-hero':''}"><div><small>${c.k}</small><h1>${heroTitle}</h1><p>${heroSubtitle}</p>${role!=='admin'?highlights():''}</div></header>
      <div class="hl-role-grid">${c.m.map(([value,label])=>`<article class="hl-role-tile">${icon(iconFor(label))}<div><small>${label}</small><b>${value}</b><span>من النظام</span></div></article>`).join('')}</div>
      <section class="hl-command" aria-label="الإجراءات الرئيسية">${['admin','organization'].includes(role)?'<h2 class="hl-command-title">الخدمات والمهام السريعة</h2>':''}<div class="hl-command-grid ${operational?'hl-picture-actions':''}">${actions.map(([label,target],index)=>{const route=actionRoute(role,label,target);return `<button type="button" ${route?`data-route="${route}"`:'disabled aria-disabled="true" title="قيد الربط بالخدمة"'} data-action-label="${label}" data-art="${index%6}"><span class="hl-action-art">${icon(iconFor(label))}</span><span>${label}</span></button>`}).join('')}</div></section>
      ${lowerFor(role,c)}</div><div class="hl-service-heading" hidden><button type="button" data-portal-home>${icon('home')}الرئيسية</button><span aria-hidden="true">/</span><h1 data-service-title></h1></div></div></div>`;
    document.getElementById('main')?.prepend(d);
    if(role==='admin')d.querySelector('.brand-copy small').textContent='مركز القيادة والإدارة';
    syncDashboardIdentity();
    if(role==='instructor')void loadInstructorSummary(d);

    d.querySelector('[data-board-notifications]')?.addEventListener('click',()=>window.HydrolandAccountCenter?.openNotifications?.());
    d.querySelector('[data-board-messages]')?.addEventListener('click',()=>window.HydrolandMessages?.open?.());
    d.querySelector('[data-portal-profile]')?.addEventListener('click',()=>document.getElementById('profile-dialog')?.showModal());
    d.querySelector('[data-portal-menu]').addEventListener('click',event=>{const open=d.classList.toggle('hl-portal-nav-open');event.currentTarget.setAttribute('aria-expanded',String(open))});
    d.querySelector('[data-portal-home]').addEventListener('click',()=>window.HydrolandWorkspaceUI?.show?.(d));
    d.querySelector('.hl-portal-search').addEventListener('submit',event=>{event.preventDefault();const form=document.getElementById('search-form');form.querySelector('input').value=event.currentTarget.querySelector('input').value;form.requestSubmit()});
    d.querySelectorAll('a.brand').forEach(node=>node.addEventListener('click',event=>{event.preventDefault();window.HydrolandWorkspaceUI?.show?.(d)}));
    d.querySelector('[data-portal-notifications]')?.addEventListener('click',()=>window.HydrolandAccountCenter?.openNotifications?.());
    d.querySelector('[data-portal-messages]')?.addEventListener('click',()=>window.HydrolandMessages?.open?.());
    d.querySelector('[data-portal-switch]')?.addEventListener('click',async()=>{
      const freshness=window.HydrolandPortalFreshness;
      if(freshness?.openRoleSwitcher)await freshness.openRoleSwitcher();
      else document.getElementById('role-dialog')?.showModal();
    });
    d.querySelectorAll('[data-route]').forEach(node=>{const id=node.dataset.route,label=node.dataset.actionLabel||node.textContent.trim();connectControl(node,role,id,label)});
    d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();if(index===0){window.HydrolandWorkspaceUI?.show?.(d);d.classList.remove('hl-portal-nav-open');d.scrollIntoView({behavior:'smooth',block:'start'});return}const id=node.dataset.hlNavRoute;if(!id||!(await authorizeRoleAction(role)))return;const target=targetFor(id);if(!target){setTargetAvailability(node,id,node.dataset.portalLabel);return}d.querySelectorAll('.hl-portal-nav-item').forEach(x=>x.classList.remove('active'));node.classList.add('active');openTarget(id,role);d.classList.remove('hl-portal-nav-open');target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(id==='documents'?'hl-documents':id==='marine-documents'?'hl-marine-documents':id))}));
    reconnectDashboard();
  }

  window.HydrolandRoleDashboards={refreshControls:reconnectDashboard};
  const applyRole=role=>{const next=role||'diver';if(next==='diver'){clearDashboard();return}render(next)};
  document.addEventListener('hydroland:role-changed',event=>applyRole(event.detail?.role));
  document.addEventListener('hydroland:profile-data-ready',()=>syncDashboardIdentity());
  document.getElementById('exit-role')?.addEventListener('click',clearDashboard);
  document.addEventListener('hydroland:portal-cleared',clearDashboard);
  document.addEventListener('hydroland:auth-changed',()=>{const role=window.HydrolandPortalAccess?.getCurrentRole?.()||'diver';if(!window.HydrolandAuth?.isAuthenticated?.()||role==='diver'||!window.HydrolandPortalAccess?.roleAllowed?.(role)){clearDashboard();return}applyRole(role)});
  queueMicrotask(()=>applyRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'));
  const taskScript=document.createElement('script');taskScript.src='./hydroland-role-task-routing.js';document.body.appendChild(taskScript);
})();
