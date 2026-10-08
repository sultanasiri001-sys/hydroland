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
      m:[['—','حجوزات بانتظار التأكيد'],['—','رحلات اليوم'],['—','أعضاء نشطون'],['—','إجمالي الرحلات']],
      nav:['الرئيسية','إدارة الحجوزات','الرحلات','المعدات والمخزون','محترفي الغوص','العملاء','المستندات والتراخيص','السلامة','التقارير','الملف التجاري'],
      a:[['إدارة الحجوزات','trips','▣'],['إدارة الرحلات','trips','⌖'],['المخزون والمعدات','store','◫'],['الطاقم والمدربين','trips','♟'],['المستندات والتراخيص','documents','◇'],['تقارير السلامة','safety','⬡'],['التقارير المالية','finance','◈']],
      q:[['الحجوزات المؤكدة','من النظام'],['رحلات اليوم','من النظام'],['فحوص المعدات','من النظام']],
      spotlight:['تشغيل اليوم','الحجوزات والرحلات وحالة الجاهزية تظهر من بيانات التشغيل المتصلة.'],
      lower:[['المعدات والمخزون','التوفر والصيانة والاستئجار'],['محترفي الغوص','المدربين والجداول والتكليفات'],['الملف التجاري','الوثائق والتراخيص والتقييمات']]
    },
    boat:{
      k:'MARINE BROKERAGE · الوساطة البحرية',t:'لوحة الوساطة البحرية',s:'إدارة القوارب والرحلات والحجوزات والصيانة والطاقم والتراخيص والخدمات الفنية.',icon:'⛵',
      m:[['—','قوارب نشطة'],['—','رحلات مجدولة'],['—','أعمال صيانة مفتوحة'],['—','حجوزات مؤكدة']],
      nav:['الرئيسية','إدارة القوارب','الرحلات والحجوزات','الطاقم','الجدولة والتقويم','الصيانة والمعدات','السلامة واللوائح','الطقس وحالة البحر','المستندات والتراخيص','المالية والفواتير','التقييمات','التسويق والعروض','التقارير'],
      a:[['إدارة القوارب','trips','⛵'],['إنشاء رحلة','trips','⌖'],['إدارة الحجوزات','trips','▣'],['إدارة الطاقم','trips','♟'],['سجل الصيانة','store','⌁'],['السلامة واللوائح','safety','⬡'],['حالة البحر والطقس','marine-intelligence','☀'],['المستندات والتراخيص','marine-documents','◇'],['المالية والفواتير','finance','◈'],['التسويق والعروض','community','★']],
      q:[['فحص قبل الإبحار','من النظام'],['الصيانة القادمة','من النظام'],['التراخيص والوثائق','من النظام']],
      spotlight:['حالة الأسطول','يعرض النظام القوارب وحالة الجاهزية والصيانة والرحلات عند توفر البيانات.'],
      lower:[['الخدمات الفنية','فنيون وورش وطلبات صيانة'],['قطع الغيار','مزودون وطلبات قطع الغيار'],['الربط مع المراكز','طلبات الربط واعتماد مركز الغوص']]
    },
    organization:{
      k:'CORPORATE & GOVERNMENT · الشركات والجهات الحكومية',t:'بوابة الشركات والجهات الحكومية',s:'إدارة بيانات الجهات والمستندات ومتابعة سجلات المدفوعات المتاحة.',icon:'◆',
      m:[['—','جهات نشطة'],['—','جهات بانتظار المراجعة'],['—','دعوات معلّقة'],['—','مدفوعات الحساب']],
      nav:['الرئيسية','بيانات الجهات','طلبات الخدمات','العقود والمستندات','المشاركون','السلامة والامتثال','التقارير','مدفوعات الحساب','الفواتير المؤسسية'],
      a:[['بيانات الجهات','organizations','◆'],['طلبات الخدمات البحرية','organizations','⌖'],['العقود والمستندات','documents','◇'],['المشاركون',null,'♟'],['رفع الوثائق','documents','▣'],['متابعة اعتماد المستندات','documents','✓'],['السلامة والامتثال',null,'⬡'],['تقارير الالتزام',null,'▥'],['مدفوعات الحساب','finance','◈'],['فواتير الجهة',null,'▤']],
      q:[['طلبات الخدمات','تُدار من صفحة الجهة'],['المشاركون','غير متاح حاليًا'],['فواتير الجهة','غير متاحة حاليًا']],
      spotlight:['مساحة الجهة','إدارة بيانات العضوية ومستندات الجهة، وفتح طلبات خدمة ومتابعتها عبر سجل خدمة العملاء.'],
      lower:[['بيانات الجهات','عرض حالة الجهة والعضوية المرتبطة بحسابك'],['طلبات خدمة الجهات','إنشاء الطلبات والردود ومتابعة حالتها'],['المستندات والعقود','إنشاء المسودات ومتابعة الاعتماد والتوقيع']]
    },
    admin:{
      k:'HYDROLAND CONTROL TOWER · الإدارة',t:'مركز القيادة والتحكم',s:'لوحة موحدة لإدارة المستخدمين والاعتمادات والرحلات والسلامة والمالية؛ الربط الخارجي مؤجل.',icon:'H',
      m:[['—','طلبات اعتماد'],['—','رحلات مفتوحة'],['—','مراجعات امتثال'],['—','حالة النظام']],
      nav:['مركز القيادة والتحكم','المستخدمون','الموافقات والطلبات','مراكز الغوص','محترفي الغوص','الوساطة البحرية','الشركات والجهات الحكومية','الرحلات والحجوزات','المعدات والمستودعات','السلامة والامتثال','المالية والفواتير','التقارير والإحصائيات','الذكاء الاصطناعي','إدارة المحتوى','الإشعارات والرسائل','الإعدادات'],
      a:[['الاعتمادات','admin','✓'],['إدارة المستخدمين','admin','♟'],['الرحلات والحجوزات','trips','⌖'],['المعدات والمستودعات','store','▣'],['مركز الحوادث','safety','⬡'],['الطقس وحالة البحر','marine-intelligence','☀'],['المالية والفواتير','finance','◈'],['إعدادات المنصة','admin','⚙'],['التقارير والإحصائيات','admin','▥'],['إدارة المحتوى','community','★']],
      q:[['طلبات اعتماد المراكز','من النظام'],['طلبات محترفي الغوص','من النظام'],['مراجعات السلامة','من النظام']],
      spotlight:['مركز القيادة والتحكم','المؤشرات والخرائط والتنبيهات تعتمد على البيانات الفعلية ولا تعرض أرقامًا تجريبية.'],
      lower:[['مركز السلامة والطوارئ','الحوادث وحالة الرحلات'],['الجهات الخارجية · مؤجل','لا يوجد ربط أو إرسال خارجي مفعّل حاليًا'],['الذكاء الاصطناعي','الوكلاء والموافقات البشرية']]
    }
  };

  function clearDashboard(){document.querySelector('.hl-role-dashboard')?.remove()}
  const syncDashboardIdentity=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const person=window.HydrolandProfileData?.profile?.person||{},name=[person.firstName,person.lastName].filter(Boolean).join(' ').trim();d.querySelectorAll('[data-portal-name],[data-center-name]').forEach(node=>{if(node.hasAttribute('data-center-name')&&d.dataset.centerScopeLoaded==='1')return;const value=name||'حساب HYDROLAND';if(node.textContent!==value)node.textContent=value});d.querySelectorAll('[data-portal-avatar],[data-center-avatar]').forEach(node=>{const value=(person.firstName||'H').trim().slice(0,1).toUpperCase();if(node.textContent!==value)node.textContent=value})};
  const centerLoads=new WeakMap();
  const marineLoads=new WeakMap();
  const organizationLoads=new WeakMap();
  const loadOrganizationSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='organization'||!d.isConnected)return;
    const version=(organizationLoads.get(d)||0)+1;organizationLoads.set(d,version);
    const session=auth?.getSessionVersion?.(),current=()=>d.isConnected&&organizationLoads.get(d)===version&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated?.()&&access?.getCurrentRole?.()==='organization'&&access?.roleAllowed?.('organization');
    const tiles=d.querySelectorAll('.hl-role-tile b'),status=d.querySelector('[data-organization-home-status]'),refresh=d.querySelector('[data-organization-home-refresh]');
    tiles.forEach(node=>node.textContent='—');status.textContent='جارٍ تحميل بيانات الجهة والمدفوعات…';status.setAttribute('role','status');refresh.disabled=true;
    try{
      if(typeof access?.authorizeRole!=='function'||!await access.authorizeRole('organization',{sessionVersion:session,isCurrent:()=>d.isConnected&&organizationLoads.get(d)===version})||!current())return;
      const [membershipsResult,paymentsResult]=await Promise.allSettled([auth.authorizedFetch('/organizations/mine'),auth.authorizedFetch('/finance/mine/payments')]);
      if(membershipsResult.status==='rejected')throw new Error('تعذر تحميل بيانات الجهات. أعد المحاولة.');
      const membershipsResponse=membershipsResult.value,paymentsResponse=paymentsResult.status==='fulfilled'?paymentsResult.value:null;
      if(!current())return;
      if(!membershipsResponse.ok)throw new Error(membershipsResponse.status===403?'لا تتوفر صلاحية عرض الجهات المرتبطة.':'تعذر تحميل بيانات الجهات. أعد المحاولة.');
      const memberships=await membershipsResponse.json();
      if(!Array.isArray(memberships)||memberships.some(row=>!row||typeof row.status!=='string'||!row.organization||typeof row.organization.status!=='string'))throw new Error('تعذر التحقق من بيانات الجهات. أعد المحاولة.');
      const values=[memberships.filter(row=>row.status==='ACTIVE'&&row.organization.status==='ACTIVE').length,memberships.filter(row=>row.organization.status==='PENDING_REVIEW').length,memberships.filter(row=>row.status==='PENDING').length];
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      let payments='—';if(paymentsResponse?.ok){const rows=await paymentsResponse.json();if(current()&&Array.isArray(rows))payments=String(rows.length)}
      if(!current())return;if(tiles[3])tiles[3].textContent=payments;
      status.textContent='تم تحديث الجهات والمدفوعات من النظام · '+new Date().toLocaleTimeString('ar-SA',{timeZone:'Asia/Riyadh'});
    }catch(error){if(current()){tiles.forEach(node=>node.textContent='—');status.setAttribute('role','alert');status.textContent=error.message||'تعذر تحميل ملخص الجهة. أعد المحاولة.'}}
    finally{if(d.isConnected&&organizationLoads.get(d)===version)refresh.disabled=false}
  };
  const loadMarineSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='boat'||!d.isConnected)return;
    const version=(marineLoads.get(d)||0)+1;marineLoads.set(d,version);
    const session=auth?.getSessionVersion?.(),current=()=>d.isConnected&&marineLoads.get(d)===version&&session===auth?.getSessionVersion?.()&&auth?.isAuthenticated?.()&&access?.getCurrentRole?.()==='boat'&&access?.roleAllowed?.('boat');
    const status=d.querySelector('[data-marine-home-status]'),refresh=d.querySelector('[data-marine-home-refresh]'),tiles=d.querySelectorAll('.hl-role-tile b');
    const reset=()=>tiles.forEach(node=>node.textContent='—');reset();status.textContent='جارٍ تحميل ملخص الوساطة البحرية…';status.setAttribute('role','status');refresh.disabled=true;
    try{
      if(typeof access?.authorizeRole!=='function'||!await access.authorizeRole('boat',{sessionVersion:session,isCurrent:()=>d.isConnected&&marineLoads.get(d)===version})||!current())return;
      const response=await auth.authorizedFetch('/marine-operations/overview/mine'),data=await response.json().catch(()=>null);
      if(!current())return;
      if(!response.ok)throw new Error(response.status===403?'لا تتوفر صلاحية الوساطة البحرية النشطة.':'تعذر تحميل ملخص الوساطة البحرية. أعد المحاولة.');
      const keys=['activeAssets','scheduledTrips','openMaintenance','confirmedBookings'],values=keys.map(key=>data?.metrics?.[key]);
      if(values.some(value=>!Number.isSafeInteger(value)||value<0))throw new Error('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      values.forEach((value,index)=>{if(tiles[index])tiles[index].textContent=String(value)});
      if(typeof data.generatedAt!=='string'||!Number.isFinite(Date.parse(data.generatedAt)))throw new Error('تعذر التحقق من وقت تحديث الملخص. أعد المحاولة.');
      status.textContent='آخر تحديث: '+new Date(data.generatedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})+' · بتوقيت الرياض';
    }catch(error){if(current()){reset();status.setAttribute('role','alert');status.textContent=error.message||'تعذر تحميل الملخص. أعد المحاولة.'}}
    finally{if(d.isConnected&&marineLoads.get(d)===version)refresh.disabled=false}
  };
  const loadCenterSummary=async d=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    if(!d||d.dataset.role!=='center'||!d.isConnected||!auth?.isAuthenticated?.()||access?.getCurrentRole?.()!=='center')return;
    const version=(centerLoads.get(d)||0)+1;centerLoads.set(d,version);
    const session=auth.getSessionVersion?.(),current=()=>d.isConnected&&centerLoads.get(d)===version&&session===auth.getSessionVersion?.()&&auth.isAuthenticated()&&access.getCurrentRole?.()==='center'&&access.roleAllowed?.('center');
    const status=d.querySelector('[data-center-home-status]'),body=d.querySelector('[data-center-home-panels]'),refresh=d.querySelector('[data-center-home-refresh]');
    const reset=()=>{d.dataset.centerScopeLoaded='0';d.querySelectorAll('.hl-role-tile b').forEach(node=>node.textContent='—');d.querySelectorAll('.hl-role-tile span').forEach(node=>node.textContent='بانتظار التحديث');syncDashboardIdentity();body.innerHTML=centerHomePanels(null);connectHomeControls(d)};
    reset();status.textContent='جارٍ تحميل ملخص المركز…';status.setAttribute('role','status');body.setAttribute('aria-busy','true');refresh.disabled=true;
    try{
      if(typeof access.authorizeRole!=='function'||!await access.authorizeRole('center',{sessionVersion:session,isCurrent:()=>d.isConnected&&centerLoads.get(d)===version})||!current())return;
      const response=await auth.authorizedFetch('/center/me/overview'),data=await response.json().catch(()=>null);
      if(!current())return;
      if(!response.ok)throw new Error(response.status===403?'لا تتوفر صلاحية إدارة مركز نشط. راجع الملف التجاري أو أعد المحاولة.':'تعذر تحميل ملخص المركز. أعد المحاولة.');
      const values=['newBookings','tripsToday','activeMembers','totalTrips'].map(key=>data?.metrics?.[key]);
      if(typeof data?.center?.displayName!=='string'||values.some(value=>!Number.isSafeInteger(value)||value<0))throw new Error('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      const complete=data.operations&&data.safety&&data.licenses&&data.equipment&&data.schedule;
      if(complete){
        const counts=[...Object.values(data.operations),...Object.values(data.safety),...Object.values(data.licenses),...(data.equipment.available===false?[]:[data.equipment.total]),data.schedule.trips?.total,data.schedule.training?.total];
        if(counts.some(value=>!Number.isSafeInteger(value)||value<0)||!Array.isArray(data.equipment.groups)||!Array.isArray(data.schedule.trips?.items)||!Array.isArray(data.schedule.training?.items))throw new Error('تعذر التحقق من بيانات الملخص. أعد المحاولة.');
      }
      values.forEach((value,index)=>d.querySelectorAll('.hl-role-tile b')[index].textContent=String(value));
      d.querySelectorAll('.hl-role-tile span').forEach(node=>node.textContent='فتح التفاصيل');
      d.querySelectorAll('[data-center-name]').forEach(node=>node.textContent=data.center.displayName);d.dataset.centerScopeLoaded='1';
      body.innerHTML=centerHomePanels(complete?data:null);connectHomeControls(d);
      status.textContent=complete?'آخر تحديث: '+centerHomeDate(data.generatedAt)+' · بتوقيت الرياض':'المؤشرات محدثة. تفاصيل الملخص غير متاحة؛ أعد التحديث.';
    }catch(error){if(current()){reset();status.setAttribute('role','alert');status.textContent=error.message||'تعذر تحميل ملخص المركز. أعد المحاولة.'}}
    finally{if(d.isConnected&&centerLoads.get(d)===version){body.removeAttribute('aria-busy');refresh.disabled=false;d.hidden=false}}
  };
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
  const authorizeRoleAction=async role=>{const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;if(!auth?.isAuthenticated?.()||typeof access?.authorizeRole!=='function')return denyRoleAction();const allowed=await access.authorizeRole(role,{sessionVersion:auth.getSessionVersion?.()});if(!allowed)return denyRoleAction();return true};
  const routeSelectors={finance:'.hl-finance',admin:'.hl-admin',documents:'#hl-documents','marine-documents':'#hl-marine-documents',inventory:'.hl-inventory',training:'.hl-training',crew:'.hl-crew-assignments',organizations:'.hl-organizations',incidents:'#hl-safety-incidents','trip-admin':'.hl-trip-admin','store-admin':'.hl-store-admin',weather:'.hl-weather-admin',procurement:'.hl-procurement',logistics:'.hl-logistics','theme-admin':'.hl-theme-admin'};
  const targetFor=id=>routeSelectors[id]?document.querySelector(routeSelectors[id]):document.getElementById(id);
  const openTarget=(id,role,label)=>{if(role==='organization'&&id==='organizations'){window.HydrolandOrganizations?.open?.();return}if(role==='boat'&&id==='marine-trips'){window.HydrolandMarineTrips?.open?.();return}if(role==='center'&&id==='center-reports'){window.HydrolandCenterReports?.open?.();return}if(role==='center'&&id==='center-business-profile'){window.HydrolandCenterBusinessProfile?.open?.();return}if(role==='center'&&id==='center-safety'){window.HydrolandCenterSafety?.open?.();return}if(role==='center'&&id==='center-documents'){window.HydrolandCenterDocuments?.open?.();return}if(role==='center'&&id==='center-equipment'){window.HydrolandCenterEquipment?.open?.();return}if(role==='center'&&id==='center-customers'){window.HydrolandCenterCustomers?.open?.();return}if(role==='center'&&id==='center-bookings'){window.HydrolandCenterBookings?.open?.();return}if(role==='center'&&id==='center-operations'){window.HydrolandCenterOperations?.open?.();return}if(role==='center'&&id==='center-team'){window.HydrolandCenterTeam?.open?.(label==='فتح جدول التدريب'?'assignments':['محترفو الغوص','محترفي الغوص'].includes(label)?'professionals':'team');return}const actualId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id;if(id==='professional-profile'){document.getElementById('profile-dialog')?.showModal();return}const target=targetFor(actualId);if(actualId==='documents')window.HydrolandDocuments?.open?.();if(actualId==='marine-documents')window.HydrolandMarineDocuments?.open?.(role);if(actualId==='incidents')window.HydrolandSafetyIncidents?.open?.(role);if(actualId==='training'){const trainingTarget=document.querySelector('.hl-training');window.HydrolandWorkspaceUI?.show?.(trainingTarget);const mode=id==='training-schedule'?'instructor-schedule':id==='training-skills'?'instructor-skills':id==='training-certificates'?'instructor-certificates':id==='training-earnings'?'instructor-earnings':role==='instructor'?'instructor':undefined;Promise.resolve(window.HydrolandTraining?.reload?.(mode)).finally(()=>window.HydrolandWorkspaceUI?.show?.(document.querySelector('.hl-training')));return}if(actualId==='hl-marine-readiness')window.HydrolandMarineReadiness?.open?.(role);window.HydrolandWorkspaceUI?.show?.(target)};
  const setTargetAvailability=(node,id,label,role)=>{if(!node.hasAttribute('data-hl-original-aria-label'))node.dataset.hlOriginalAriaLabel=node.getAttribute('aria-label')||'';const professionalTraining=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id),resolvedId=professionalTraining?'training':id,target=professionalTraining?document.querySelector('.hl-training'):targetFor(resolvedId),available=professionalTraining?Boolean(target&&window.HydrolandPortalAccess?.roleAllowed?.('instructor')):id==='organizations'?Boolean(window.HydrolandOrganizations?.open&&role==='organization'):id==='professional-profile'?Boolean(document.getElementById('profile-dialog')):id==='center-reports'?Boolean(window.HydrolandCenterReports?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-safety'?Boolean(window.HydrolandCenterSafety?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-documents'?Boolean(window.HydrolandCenterDocuments?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-equipment'?Boolean(window.HydrolandCenterEquipment?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-business-profile'?Boolean(window.HydrolandCenterBusinessProfile?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-customers'?Boolean(window.HydrolandCenterCustomers?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-bookings'?Boolean(window.HydrolandCenterBookings?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-operations'?Boolean(window.HydrolandCenterOperations?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='center-team'?Boolean(window.HydrolandCenterTeam?.open&&window.HydrolandPortalAccess?.roleAllowed?.('center')):id==='marine-trips'?Boolean(window.HydrolandMarineTrips?.open&&window.HydrolandPortalAccess?.roleAllowed?.('boat')):Boolean(target&&!target.classList.contains('hl-workspace-hidden')&&(!target.hidden||['documents','marine-documents','incidents','hl-marine-readiness'].includes(id)));node.disabled=!available;if(available){node.removeAttribute('aria-disabled');node.title='';node.removeAttribute('data-hl-unavailable');if(node.dataset.hlOriginalAriaLabel)node.setAttribute('aria-label',node.dataset.hlOriginalAriaLabel);else node.removeAttribute('aria-label')}else{node.setAttribute('aria-disabled','true');node.title='الخدمة جارٍ تحميلها أو غير متاحة';node.dataset.hlUnavailable='1';node.setAttribute('aria-label',label+' · الخدمة غير متاحة حاليًا')}return available};
  const connectControl=(node,role,id,label)=>{node.dataset.hlRoute=id;node.dataset.hlRole=role;if(!node.dataset.hlConnected){node.dataset.hlConnected='1';node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();const route=node.dataset.hlRoute,activeRole=node.dataset.hlRole;if(!(await authorizeRoleAction(activeRole)))return;if(activeRole==='boat'&&route==='marine-trips'){openTarget(route,activeRole,label);return}if(activeRole==='center'&&['center-safety','center-documents','center-equipment','center-customers','center-business-profile','center-operations','center-bookings','center-team','center-reports'].includes(route)){openTarget(route,activeRole,label);return}const controllerRoute=route==='professional-profile'||['training-schedule','training-skills','training-certificates','training-earnings'].includes(route),target=controllerRoute?null:targetFor(route);if(!controllerRoute&&!target){setTargetAvailability(node,route,label);return}openTarget(route,activeRole,label);if(controllerRoute||(route==='training'&&activeRole==='instructor'))return;target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(route==='documents'?'hl-documents':route==='marine-documents'?'hl-marine-documents':route))})}return setTargetAvailability(node,id,label,role)};
  const portalNavTargets={'إدارة الدورات':'training','الطلاب':'training','الجدول الزمني':'training','التقييمات':'community','الشهادات':'community','الإيرادات':'finance','إدارة الحجوزات':'trips','الرحلات':'trips','المعدات والمخزون':'store','محترفي الغوص':'training','العملاء':'community','التقارير':'admin','الملف التجاري':'community','إدارة القوارب':'trips','الرحلات والحجوزات':'trips','الطاقم':'trips','الجدولة والتقويم':'trips','الصيانة والمعدات':'store','السلامة واللوائح':'safety','الطقس وحالة البحر':'marine-intelligence','المالية والفواتير':'finance','التسويق والعروض':'community','طلبات الخدمات':'trips','الحجوزات والعقود':'community','المشاركون':'community','المستندات والتصاريح':'documents','السلامة والامتثال':'safety','الفواتير':'finance','المستخدمون':'admin','الموافقات والطلبات':'admin','مراكز الغوص':'admin','الوساطة البحرية':'admin','الشركات والجهات الحكومية':'admin','المعدات والمستودعات':'store','التقارير والإحصائيات':'admin','الذكاء الاصطناعي':'admin','إدارة المحتوى':'community','الإشعارات والرسائل':'community','الإعدادات':'admin'};
  const portalNavTarget=(role,label)=>{if(role==='organization')return ({'بيانات الجهات':'organizations','العقود والمستندات':'documents','مدفوعات الحساب':'finance'})[label]||null;if(role==='center'&&label==='التقارير')return 'center-reports';if(role==='center'&&label==='الملف التجاري')return 'center-business-profile';if(role==='instructor'&&label==='إدارة الدورات')return 'training';if(role==='instructor'&&label==='الطلاب')return 'training';if(role==='instructor'&&label==='الجدول الزمني')return 'training-schedule';if(role==='instructor'&&label==='التقييمات')return 'training-skills';if(role==='instructor'&&label==='الشهادات')return 'training-certificates';if(role==='instructor'&&label==='الإيرادات')return 'training-earnings';if(role==='center'&&label==='السلامة')return 'center-safety';if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents';if(role==='center'&&label==='المعدات والمخزون')return 'center-equipment';if(role==='center'&&label==='العملاء')return 'center-customers';if(role==='center'&&label==='إدارة الحجوزات')return 'center-bookings';if(role==='center'&&label==='الرحلات')return 'center-operations';if(role==='center'&&label==='محترفي الغوص')return 'center-team';if(role==='boat'&&label==='الرحلات والحجوزات')return 'marine-trips';if(label==='المستندات والتراخيص')return role==='boat'?'marine-documents':'documents';if(label==='الصيانة والمعدات'&&role==='boat')return 'hl-marine-readiness';if(role==='admin'&&label==='الوساطة البحرية')return 'marine-documents';if(['المعدات والمخزون','المعدات والمستودعات'].includes(label))return 'inventory';if(label==='الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';if(label==='الذكاء الاصطناعي'||label==='التسويق والعروض')return null;return portalNavTargets[label]};
  const reconnectDashboard=()=>{const d=document.querySelector('.hl-role-dashboard');if(!d)return;const role=d.dataset.role;d.querySelectorAll('[data-hl-route]').forEach(node=>connectControl(node,role,node.dataset.hlRoute,node.dataset.actionLabel||node.dataset.secondaryLabel||node.textContent.trim()));d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>{if(index===0)return;const label=node.dataset.portalLabel,id=portalNavTarget(role,label);if(!id){node.disabled=true;node.title='قيد الربط بالخدمة';node.setAttribute('aria-disabled','true');return}node.dataset.hlNavRoute=id;setTargetAvailability(node,id,label,role)})};
  let reconnectQueued=false;new MutationObserver(()=>{if(reconnectQueued)return;reconnectQueued=true;queueMicrotask(()=>{reconnectQueued=false;reconnectDashboard()})}).observe(document.body,{childList:true,subtree:true});

  const iconFor=label=>/الرئيسية|القيادة/.test(label)?'home':/سلامة|امتثال|حوادث/.test(label)?'shield':/مستند|وثائق|عقود|تراخيص|تصاريح|توقيع/.test(label)?'file':/مالية|إيراد|فواتير/.test(label)?'chart':/معدات|مخزون|مستودع|غيار/.test(label)?'tanks':/دورات|تدريب|محترفي|المواد/.test(label)?'learn':/شهادات|اعتماد|موافقة/.test(label)?'certificate':/طقس|البحر/.test(label)?'cloud':/قارب|قوارب|رحل|أسطول/.test(label)?'boat':/جدول|جلسات|تقويم/.test(label)?'calendar':/رسائل|إشعارات/.test(label)?'mail':/إعداد|صيانة|فنية/.test(label)?'settings':/مستخدم|طلاب|طاقم|عملاء|مشارك|مركز|جهات/.test(label)?'people':/ذكاء/.test(label)?'bot':/تقارير|تقييم/.test(label)?'chart':'compass';
  const actionRoute=(role,label,fallback)=>{
    if(role==='organization')return ({'بيانات الجهات':'organizations','العقود والمستندات':'documents','العقود الإلكترونية':'documents','رفع الوثائق':'documents','متابعة اعتماد المستندات':'documents','التوقيع الإلكتروني':'documents','مدفوعات الحساب':'finance','فتح مستندات الجهة':'documents','إدارة بيانات الجهات':'organizations','عرض المدفوعات':'finance'})[label]||null;
    if(role==='boat'&&['إنشاء رحلة','إدارة الرحلات','الرحلات والحجوزات'].includes(label))return 'marine-trips';if(role==='center'&&label==='التقارير المالية')return 'center-reports';
    if(role==='center'&&['السلامة','تقارير السلامة'].includes(label))return 'center-safety';if(role==='center'&&label==='المستندات والتراخيص')return 'center-documents';if(role==='center'&&['المعدات والمخزون','المخزون والمعدات','عرض المخزون'].includes(label))return 'center-equipment';if(role==='center'&&label==='العملاء')return 'center-customers';if(role==='center'&&label==='إدارة الحجوزات')return 'center-bookings';if(role==='center'&&['إدارة الرحلات','عرض الجدول','عرض قائمة التشغيل'].includes(label))return 'center-operations';if(role==='center'&&['الطاقم والمدربين','محترفو الغوص','محترفي الغوص'].includes(label))return 'center-team';
    if(label==='مركز الحوادث')return 'incidents';if(label==='المخزون والمعدات'||label==='المعدات والمستودعات')return 'inventory';if(label==='إدارة المحتوى')return 'theme-admin';if(label==='إعدادات المنصة')return 'admin';
    if(label==='إدارة الرحلات'||label==='إنشاء رحلة'||(label==='الرحلات والحجوزات'&&role==='admin'))return 'trip-admin';if(label==='الطاقم والمدربين'||label==='إدارة الطاقم')return 'crew';if(label==='إدارة القوارب')return 'marine-documents';if(label==='سجل الصيانة')return 'hl-marine-readiness';if(label==='حالة البحر والطقس'||label==='الطقس وحالة البحر')return role==='admin'?'weather':'marine-intelligence';
    if(role==='instructor'&&label==='جدول التدريب')return 'training-schedule';if(role==='instructor'&&label==='تقييم المهارات')return 'training-skills';if(role==='instructor'&&label==='إصدار الشهادات')return 'training-certificates';if(role==='instructor'&&label==='الإيرادات')return 'training-earnings';if(role==='instructor'&&label==='الملف المهني')return 'professional-profile';if(label==='التسويق والعروض')return null;return fallback;
  };
  const highlights=()=>`<div class="hl-center-highlights">${[['shield','سلامة أولًا'],['water','تجارب مميزة'],['settings','تشغيل احترافي'],['boat','رحلات بحرية موثقة']].map(([art,text])=>`<span>${icon(art)}${text}</span>`).join('')}</div>`;
  const panel=(title,art,body,cls='')=>`<section class="hl-panel hl-board-panel ${cls}"><h4 class="hl-panel-title">${icon(art)}${title}</h4>${body}</section>`;
  const rows=items=>`<div class="hl-board-rows">${items.map(([title,state])=>`<div><span>${title}</span><b>${state}</b></div>`).join('')}</div>`;
  const action=(label,route,secondary=false)=>`<button type="button" ${secondary?'data-secondary-label':'data-action-label'}="${label}" ${route?`data-route="${route}"`:'disabled aria-disabled="true" title="قيد الربط بالخدمة"'}>${label}${icon('arrow')}</button>`;
  const safetyPanel=()=>panel('مركز السلامة والامتثال','shield',`<div class="hl-board-safety">${icon('shield')}<strong>السلامة أولًا</strong><span>راجع جاهزية الرحلة قبل الانطلاق</span></div>${rows([['قوائم الفحص','حسب الرحلة'],['قرار التشغيل','من مراجعة السلامة']])}${action('تقارير السلامة','safety')}`,'hl-safety-board');
  const queuePanel=c=>panel(c.spotlight[0],'calendar',`${rows(c.q)}${action('عرض قائمة التشغيل','trips')}`,'hl-queue');
  const centerHomeDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'}).format(date):'غير متاح'};
  const connectHomeControls=d=>d.querySelectorAll('[data-center-home-panels] [data-route]').forEach(node=>connectControl(node,'center',actionRoute('center',node.dataset.actionLabel,node.dataset.route),node.dataset.actionLabel));
  const centerHomePanels=data=>{
    const missing='<p class="hl-home-empty">لم تُحمّل بيانات هذا القسم.</p>',empty=text=>`<p class="hl-home-empty">${text}</p>`;
    const state={OPEN:'الحجز مفتوح',CLOSED:'الحجز مغلق',SCHEDULED:'مجدولة',CHECK_IN_OPEN:'الحضور مفتوح',IN_PROGRESS:'جارية'};
    const schedule=(part,kind)=>part.total?`<p>المعروض ${part.items.length} من ${part.total}</p><ul class="hl-home-agenda">${part.items.map(row=>`<li><strong>${esc(kind==='trip'?row.title:row.courseCode)}</strong><small>${esc(centerHomeDate(row.startsAt))}</small><span>${esc(state[row.status]||'غير محددة')}</span></li>`).join('')}</ul>`:empty(kind==='trip'?'لا توجد رحلات قادمة أو جارية.':'لا توجد جلسات تدريب قادمة أو جارية.');
    const stock={AVAILABLE:'متاحة بالمخزون',CHECKED_OUT:'معارة / خارج المستودع',MAINTENANCE:'تحت الصيانة',QUARANTINED:'محجوزة للفحص',RETIRED:'مستبعدة من الخدمة'};
    return panel('تشغيل اليوم والمتابعة','calendar',data?rows([['حجوزات اليوم المؤكدة',data.operations.confirmedBookingsToday],['المقاعد المؤكدة لرحلات اليوم',data.operations.confirmedSeatsToday],['حجوزات بانتظار التأكيد',data.metrics.newBookings],['رحلات مسودة',data.operations.draftTrips]])+action('عرض قائمة التشغيل','center-operations')+action('متابعة الحجوزات','center-bookings'):missing+action('عرض قائمة التشغيل','center-operations'),'hl-queue')
      +panel('جدول الرحلات والتدريب','calendar',data?'<h5>الرحلات القادمة والجارية</h5>'+schedule(data.schedule.trips,'trip')+action('عرض الجدول','center-operations')+'<h5>جلسات التدريب</h5>'+schedule(data.schedule.training,'training')+action('فتح جدول التدريب','center-team'):missing+action('عرض الجدول','center-operations'),'hl-center-schedule')
      +panel('مركز السلامة والامتثال','shield',(data?rows([['بلاغات مفتوحة أو قيد المراجعة',data.safety.openIncidents],['منها بلاغات حرجة',data.safety.criticalIncidents]])+'<p>راجع فحص كل رحلة وقرار السلامة قبل الانطلاق.</p>':missing)+action('تقارير السلامة','center-safety'),'hl-safety-board')
      +panel('حالة المعدات والمخزون','tanks',(data?(data.equipment.available===false?empty('ملخص المخزون غير متاح حاليًا.'):data.equipment.total?rows(data.equipment.groups.map(row=>[(stock[row.status]||'حالة أخرى')+(row.active?'':' · غير مفعلة'),row.count])):empty('لا توجد معدات مسجلة للمركز.')):missing)+'<p>حالة المخزون المسجلة؛ نتائج فحوص الجاهزية داخل بطاقة المعدة.</p>'+action('عرض المخزون','center-equipment'),'hl-center-stock')
      +panel('المستندات والتراخيص','file',(data?(data.licenses.total?rows([['منتهية الصلاحية',data.licenses.expired],['تنتهي خلال 30 يومًا',data.licenses.expiringSoon],['بيانات أو مرفقات ناقصة',data.licenses.incomplete],['بانتظار مراجعة الإدارة',data.licenses.pendingReview]]):empty('لا توجد تراخيص مسجلة للمركز.')):missing)+action('متابعة التراخيص','center-documents'),'hl-center-license-summary');
  };
  const documentsPanel=()=>panel('المستندات والعقود','file',`<p>أنشئ مسودة من نموذج متاح للجهة، ثم تابع الإرسال للاعتماد والتوقيع بحسب دور عضويتك.</p>${action('فتح مستندات الجهة','documents')}`);
  const adminPanels=()=>`<div class="hl-portal-lower hl-admin-lower">${panel('تكامل النظام','link',`<div class="hl-integration-grid">${[['people','الحسابات'],['file','المستندات'],['boat','الرحلات'],['chart','المالية']].map(([art,title])=>`<span>${icon(art)}${title}</span>`).join('')}</div><div class="hl-insight-cards"><article><h5>الجهات الخارجية · مؤجل</h5><p>لم يُفعّل الربط الخارجي بعد.</p><button type="button" disabled aria-disabled="true">الربط الخارجي مؤجل</button></article></div>`)}${safetyPanel()}${panel('الموافقات والطلبات','certificate',`${rows([['المراكز والمستخدمون','قائمة الاعتمادات'],['الشهادات المهنية','المراجعة والتوثيق'],['طلبات الخدمات','متابعة الحالة']])}${action('فتح الاعتمادات','admin')}`)}</div>${panel('التنبيهات والإشعارات','bell',`<div class="hl-notification-summary"><span>${icon('mail')}رسائل الحساب والتنبيهات التشغيلية</span><button type="button" data-board-notifications>فتح مركز الإشعارات ${icon('arrow')}</button></div>`,'hl-board-notifications')}`;
  const lowerFor=(role,c)=>{
    if(role==='admin')return adminPanels();
    if(role==='organization')return `<div class="hl-portal-lower hl-organization-lower">${panel('حالة خدمات الجهة','compass',`<div class="hl-board-rows">${c.q.map(([label,state])=>`<div><span>${label}</span><b>${state}</b></div>`).join('')}</div><p>تُفعّل هذه المسارات عند توفر واجهات مؤسسية مرتبطة بصلاحيات الجهة.</p>`)}${documentsPanel()}${panel('بيانات الجهات','people',`<p>تحقق من حالة التسجيل والعضويات المرتبطة بحسابك.</p>${action('إدارة بيانات الجهات','organizations')}`)}${panel('مدفوعات الحساب','chart',`<p>يعرض هذا القسم سجل المدفوعات المرتبط بحساب المستخدم.</p>${action('عرض المدفوعات','finance')}`)}</div>`;
    if(role==='center')return `<div class="hl-portal-lower hl-center-home-grid" data-center-home-panels>${centerHomePanels(null)}</div>`;
    if(role==='boat')return `<div class="hl-portal-lower">${panel('الخدمات الفنية وقطع الغيار','wrench',`${rows([['الصيانة والمعدات','سجل المعدات'],['المشتريات','متابعة الطلبات']])}${action('الخدمات الفنية','inventory',true)}${action('قطع الغيار','procurement',true)}`)}${safetyPanel()}${queuePanel(c)}</div>`;
    return `<div class="hl-portal-lower">${panel('التدريب والتقييم','learn',`${rows([['المواد التدريبية','إدارة الدورات'],['الحضور والمهارات','سجل التدريب']])}${action('المواد التدريبية','training',true)}`)}${panel('الشهادات والملف المهني','certificate',`<p>شهاداتك واعتماداتك وجداول التكليف</p>${action('الملف المهني','professional-profile',true)}`)}${queuePanel(c)}</div>`;
  };
  function render(role){
    clearDashboard();
    if(role==='diver'||!window.HydrolandAuth?.isAuthenticated?.()||!window.HydrolandPortalAccess?.roleAllowed?.(role))return;
    const c=configs[role];if(!c)return;if(role==='admin')ensureWeatherAdmin();
    const d=document.createElement('section');d.className='hl-role-dashboard';d.dataset.role=role;if(role==='center')d.hidden=true;
    const center=role==='center',operational=['center','boat','instructor'].includes(role),heroTitle={center:'تشغيل مركز الغوص',admin:'مركز القيادة والإدارة',organization:'بوابة الشركات والجهات الحكومية',instructor:'محترفي الغوص',boat:'الوساطة البحرية'}[role];
    const heroSubtitle={center:'نظم رحلاتك… واصنع تجربة غوص استثنائية',admin:'كل ما تحتاجه لإدارة منظومة هيدرولاند في مكان واحد',organization:'إدارة الجهات والوثائق المؤسسية من حسابك',instructor:'علّم، ألهم… واصنع جيلًا من الغواصين',boat:'أدر أسطولك وخدماتك البحرية بثقة'}[role];
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
      ${center?'<div class="hl-center-home-toolbar"><p data-center-home-status role="status">جارٍ تحميل ملخص المركز…</p><button type="button" data-center-home-refresh>تحديث الملخص</button></div>':role==='boat'?'<div class="hl-center-home-toolbar"><p data-marine-home-status role="status">جارٍ تحميل ملخص الوساطة البحرية…</p><button type="button" data-marine-home-refresh>تحديث الملخص</button></div>':role==='organization'?'<div class="hl-center-home-toolbar"><p data-organization-home-status role="status">جارٍ تحميل بيانات الجهة…</p><button type="button" data-organization-home-refresh>تحديث الملخص</button></div>':''}
      <div class="hl-role-grid">${c.m.map(([value,label],index)=>`<${center?'button type="button" data-route="'+['center-bookings','center-operations','center-team','center-operations'][index]+'"':'article'} class="hl-role-tile">${icon(iconFor(label))}<div><small>${label}</small><b>${value}</b><span>${center?'فتح التفاصيل':'من النظام'}</span></div></${center?'button':'article'}>`).join('')}</div>
      <section class="hl-command" aria-label="الإجراءات الرئيسية">${['admin','organization'].includes(role)?'<h2 class="hl-command-title">الخدمات والمهام السريعة</h2>':''}<div class="hl-command-grid ${operational?'hl-picture-actions':''}">${actions.map(([label,target],index)=>{const route=actionRoute(role,label,target);return `<button type="button" ${route?`data-route="${route}"`:'disabled aria-disabled="true" title="قيد الربط بالخدمة"'} data-action-label="${label}" data-art="${index%6}"><span class="hl-action-art">${icon(iconFor(label))}</span><span>${label}</span></button>`}).join('')}</div></section>
      ${lowerFor(role,c)}</div><div class="hl-service-heading" hidden><button type="button" data-portal-home>${icon('home')}الرئيسية</button><span aria-hidden="true">/</span><h1 data-service-title></h1></div></div></div>`;
    document.getElementById('main')?.prepend(d);
    if(role==='admin')d.querySelector('.brand-copy small').textContent='مركز القيادة والإدارة';
    syncDashboardIdentity();
    if(role==='instructor')void loadInstructorSummary(d);
    if(role==='center')void loadCenterSummary(d);
    if(role==='boat')void loadMarineSummary(d);
    if(role==='organization')void loadOrganizationSummary(d);

    d.querySelector('[data-center-home-refresh]')?.addEventListener('click',()=>loadCenterSummary(d));
    d.querySelector('[data-marine-home-refresh]')?.addEventListener('click',()=>loadMarineSummary(d));
    d.querySelector('[data-organization-home-refresh]')?.addEventListener('click',()=>loadOrganizationSummary(d));
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
    d.querySelectorAll('[data-route]').forEach(node=>{const label=node.dataset.actionLabel||node.textContent.trim(),id=actionRoute(role,label,node.dataset.route);if(!id){node.disabled=true;node.setAttribute('aria-disabled','true');return}connectControl(node,role,id,label)});
    d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>node.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();if(index===0){window.HydrolandWorkspaceUI?.show?.(d);d.classList.remove('hl-portal-nav-open');d.scrollIntoView({behavior:'smooth',block:'start'});return}const id=node.dataset.hlNavRoute;if(!id||!(await authorizeRoleAction(role)))return;if((role==='boat'&&id==='marine-trips')||(role==='center'&&['center-safety','center-documents','center-equipment','center-customers','center-business-profile','center-operations','center-bookings','center-team','center-reports'].includes(id))){openTarget(id,role,node.dataset.portalLabel);d.classList.remove('hl-portal-nav-open');return}const resolvedId=['training-schedule','training-skills','training-certificates','training-earnings'].includes(id)?'training':id,target=targetFor(resolvedId);if(!target){setTargetAvailability(node,id,node.dataset.portalLabel);return}d.querySelectorAll('.hl-portal-nav-item').forEach(x=>x.classList.remove('active'));node.classList.add('active');openTarget(id,role);d.classList.remove('hl-portal-nav-open');target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(id==='documents'?'hl-documents':id==='marine-documents'?'hl-marine-documents':id))}));
    reconnectDashboard();
  }

  for(const event of ['hydroland:center-profile-saved','hydroland:center-trips-changed','hydroland:workspace-home'])document.addEventListener(event,()=>loadCenterSummary(document.querySelector('.hl-role-dashboard[data-role="center"]')));
  for(const event of ['hydroland:marine-assets-changed','hydroland:marine-trips-changed','hydroland:workspace-home'])document.addEventListener(event,()=>loadMarineSummary(document.querySelector('.hl-role-dashboard[data-role="boat"]')));
  window.HydrolandRoleDashboards={refreshControls:reconnectDashboard};
  const applyRole=role=>{const next=role||'diver';if(next==='diver'){clearDashboard();return}render(next)};
  document.addEventListener('hydroland:role-changed',event=>applyRole(event.detail?.role));
  document.addEventListener('hydroland:profile-data-ready',()=>syncDashboardIdentity());
  document.getElementById('exit-role')?.addEventListener('click',clearDashboard);
  document.addEventListener('hydroland:portal-cleared',clearDashboard);
  document.addEventListener('hydroland:session-cleared',clearDashboard);
  document.addEventListener('hydroland:auth-changed',()=>{const role=window.HydrolandPortalAccess?.getCurrentRole?.()||'diver';if(!window.HydrolandAuth?.isAuthenticated?.()||role==='diver'||!window.HydrolandPortalAccess?.roleAllowed?.(role)){clearDashboard();return}applyRole(role)});
  queueMicrotask(()=>applyRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'));
  const taskScript=document.createElement('script');taskScript.src='./hydroland-role-task-routing.js';document.body.appendChild(taskScript);
})();
