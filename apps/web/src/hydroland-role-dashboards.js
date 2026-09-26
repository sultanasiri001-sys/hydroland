(()=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='./hydroland-role-dashboards.css';document.head.appendChild(css);
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
      k:'DIVE CENTER · مركز الغوص',t:'لوحة مركز الغوص',s:'تشغيل الحجوزات والرحلات والمعدات ومحترفي الغوص والتقارير والملف التجاري.',icon:'◉',
      m:[['—','حجوزات جديدة'],['—','رحلات اليوم'],['—','جاهزية المعدات'],['—','مراجعات سلامة']],
      nav:['الرئيسية','إدارة الحجوزات','الرحلات','المعدات والمخزون','محترفي الغوص','العملاء','التقارير','الملف التجاري'],
      a:[['إدارة الحجوزات','trips','▣'],['إدارة الرحلات','trips','⌖'],['المخزون والمعدات','store','◫'],['الطاقم والمدربين','trips','♟'],['تقارير السلامة','safety','⬡'],['التقارير المالية','finance','◈']],
      q:[['الحجوزات المؤكدة','من النظام'],['رحلات اليوم','من النظام'],['فحوص المعدات','من النظام']],
      spotlight:['تشغيل اليوم','الحجوزات والرحلات وحالة الجاهزية تظهر من بيانات التشغيل المتصلة.'],
      lower:[['المعدات والمخزون','التوفر والصيانة والاستئجار'],['محترفو الغوص','المدربين والجداول والتكليفات'],['الملف التجاري','الوثائق والتراخيص والتقييمات']]
    },
    boat:{
      k:'MARINE BROKERAGE · الوساطة البحرية',t:'لوحة الوساطة البحرية',s:'إدارة القوارب والرحلات والحجوزات والصيانة والطاقم والتراخيص والخدمات الفنية.',icon:'⛵',
      m:[['—','قوارب نشطة'],['—','رحلات مجدولة'],['—','فحوص صيانة'],['—','حجوزات مؤكدة']],
      nav:['الرئيسية','إدارة القوارب','الرحلات والحجوزات','الطاقم','الجدولة والتقويم','الصيانة والمعدات','السلامة واللوائح','الطقس وحالة البحر','المستندات والتراخيص','المالية والفواتير','التقييمات','التسويق والعروض','التقارير'],
      a:[['إدارة القوارب','trips','⛵'],['إنشاء رحلة','trips','⌖'],['إدارة الحجوزات','trips','▣'],['إدارة الطاقم','trips','♟'],['سجل الصيانة','store','⌁'],['السلامة واللوائح','safety','⬡'],['حالة البحر والطقس','marine-intelligence','☀'],['المستندات والتراخيص','community','◇'],['المالية والفواتير','finance','◈'],['التسويق والعروض','community','★']],
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
      k:'HYDROLAND CONTROL TOWER · الإدارة',t:'مركز القيادة والإدارة',s:'لوحة موحدة لإدارة المستخدمين والاعتمادات والرحلات والسلامة والمالية والتكاملات.',icon:'H',
      m:[['—','طلبات اعتماد'],['—','رحلات مفتوحة'],['—','مراجعات امتثال'],['—','حالة النظام']],
      nav:['مركز القيادة','المستخدمون','الموافقات والطلبات','مراكز الغوص','محترفي الغوص','الوساطة البحرية','الشركات والجهات الحكومية','الرحلات والحجوزات','المعدات والمستودعات','السلامة والامتثال','المالية والفواتير','التقارير والإحصائيات','الذكاء الاصطناعي','إدارة المحتوى','الإشعارات والرسائل','الإعدادات'],
      a:[['الاعتمادات','admin','✓'],['إدارة المستخدمين','admin','♟'],['الرحلات والحجوزات','trips','⌖'],['المعدات والمستودعات','store','▣'],['مركز الحوادث','safety','⬡'],['الطقس وحالة البحر','marine-intelligence','☀'],['المالية والفواتير','finance','◈'],['التكاملات','admin','⇄'],['التقارير والإحصائيات','admin','▥'],['إدارة المحتوى','community','★']],
      q:[['طلبات اعتماد المراكز','من النظام'],['طلبات محترفي الغوص','من النظام'],['مراجعات السلامة','من النظام']],
      spotlight:['مركز القيادة','المؤشرات والخرائط والتنبيهات تعتمد على البيانات الفعلية ولا تعرض أرقامًا تجريبية.'],
      lower:[['مركز السلامة والطوارئ','الحوادث وحالة الرحلات'],['التكاملات الحكومية','حالة الربط والاعتمادات الخارجية'],['الذكاء الاصطناعي','الوكلاء والموافقات البشرية']]
    }
  };

  function clearDashboard(){document.querySelector('.hl-role-dashboard')?.remove()}
  const ensureWeatherAdmin=()=>{if(document.querySelector('script[data-hl-weather-admin]'))return;const script=document.createElement('script');script.src='./hydroland-weather-admin.js';script.dataset.hlWeatherAdmin='1';document.body.appendChild(script)};
  const denyRoleAction=()=>{clearDashboard();const exit=document.getElementById('exit-role');if(exit)exit.click();else window.HydrolandPortalAccess?.clearProtectedPortal?.();return false};
  const authorizeRoleAction=async role=>{const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;if(!auth?.isAuthenticated?.()||!access?.roleAllowed?.(role))return denyRoleAction();if(typeof access.refreshPortalAccess!=='function')return denyRoleAction();await access.refreshPortalAccess();if(window.HydrolandPortalFreshness?.enforce?.()===false)return false;if(!auth.isAuthenticated()||!access.roleAllowed(role))return denyRoleAction();return true};
  const targetFor=id=>id==='finance'?document.querySelector('.hl-finance'):id==='admin'?document.querySelector('.hl-admin'):id==='documents'?document.getElementById('hl-documents'):document.getElementById(id);
  const connectControl=(node,role,id,label)=>{const target=targetFor(id);if(!target){node.disabled=true;node.setAttribute('aria-disabled','true');node.title='قيد الربط بالخدمة';node.setAttribute('aria-label',label+' · قيد الربط بالخدمة');return false}node.dataset.hlConnected='1';node.removeAttribute('aria-disabled');node.addEventListener('click',async event=>{event.preventDefault();if(!(await authorizeRoleAction(role)))return;if(id==='documents')window.HydrolandDocuments?.open?.();target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(id==='documents'?'hl-documents':id))});return true};

  function render(role){
    clearDashboard();
    if(role==='diver'||!window.HydrolandAuth?.isAuthenticated?.()||!window.HydrolandPortalAccess?.roleAllowed?.(role))return;
    const c=configs[role];if(!c)return;if(role==='admin')ensureWeatherAdmin();
    const d=document.createElement('section');d.className='hl-role-dashboard';d.dataset.role=role;
    d.innerHTML=`
      <div class="hl-portal-shell">
        <aside class="hl-portal-nav" aria-label="${c.t}">
          <div class="hl-portal-brand"><span class="hl-portal-mark">${c.icon}</span><div><b>HYDROLAND</b><small>${c.k}</small></div></div>
          <nav>${c.nav.map((item,index)=>`<button type="button" class="hl-portal-nav-item${index===0?' active':''}" data-portal-label="${item}"><span>${String(index+1).padStart(2,'0')}</span>${item}</button>`).join('')}</nav>
          <div class="hl-portal-safe"><b>السلامة أولًا</b><small>الصلاحيات والبيانات من النظام الفعلي.</small></div>
        </aside>
        <div class="hl-portal-main">
          <header class="hl-role-head"><div><small>${c.k}</small><h3>${c.t}</h3><p>${c.s}</p></div><span class="hl-live-badge"><i></i>HYDROLAND · LIVE WORKSPACE</span></header>
          <div class="hl-role-grid">${c.m.map(([value,label])=>`<article class="hl-role-tile"><small>${label}</small><b>${value}</b><strong>من النظام</strong></article>`).join('')}</div>
          <section class="hl-portal-spotlight"><div><small>OPERATIONAL VIEW</small><h4>${c.spotlight[0]}</h4><p>${c.spotlight[1]}</p></div><div class="hl-ocean-orb" aria-hidden="true"><span></span><i></i></div></section>
          <section class="hl-command"><header><div><small>QUICK ACTIONS</small><h4>الإجراءات الرئيسية</h4></div><span>واجهة معتمدة · صلاحيات محمية</span></header><div class="hl-command-grid">${c.a.map(([label,target,icon])=>`<button type="button" data-route="${target}" data-action-label="${label}"><i>${icon}</i><span>${label}</span><small>فتح الخدمة</small></button>`).join('')}</div></section>
          <div class="hl-portal-lower">
            <section class="hl-queue"><header><small>WORK QUEUE</small><h4>قائمة التشغيل</h4></header>${c.q.map(([label,state])=>`<p><span>${label}</span><b>${state}</b></p>`).join('')}</section>
            <section class="hl-insight-cards">${c.lower.map(([title,desc])=>`<article><span>HYDROLAND</span><h4>${title}</h4><p>${desc}</p><button type="button" data-secondary-label="${title}">عرض التفاصيل ←</button></article>`).join('')}</section>
          </div>
        </div>
      </div>`;
    consoleEl.insertAdjacentElement('afterend',d);

    d.querySelectorAll('[data-route]').forEach(node=>{const id=node.dataset.route,label=node.dataset.actionLabel||node.textContent.trim();connectControl(node,role,id,label)});
    d.querySelectorAll('[data-secondary-label]').forEach(node=>{const label=node.dataset.secondaryLabel;const routeMap={'المواد التدريبية':'training','سجل الحضور':'training','الملف المهني':'community','المعدات والمخزون':'store','محترفو الغوص':'training','الملف التجاري':'community','الخدمات الفنية':'store','قطع الغيار':'store','الربط مع المراكز':'community','التوقيع الإلكتروني':'documents','تقارير السلامة':'safety','إدارة المشاركين':'community','مركز السلامة والطوارئ':'safety','التكاملات الحكومية':'admin','الذكاء الاصطناعي':'admin'};const id=routeMap[label];if(!id){node.disabled=true;node.setAttribute('aria-disabled','true');return}connectControl(node,role,id,label)});
    d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>node.addEventListener('click',async()=>{if(index===0){d.scrollIntoView({behavior:'smooth',block:'start'});return}if(!(await authorizeRoleAction(role)))return;const label=node.dataset.portalLabel;const maps={'إدارة الدورات':'training','الطلاب':'training','الجدول الزمني':'training','التقييمات':'community','الشهادات':'community','الإيرادات':'finance','إدارة الحجوزات':'trips','الرحلات':'trips','المعدات والمخزون':'store','محترفي الغوص':'training','العملاء':'community','التقارير':'admin','الملف التجاري':'community','إدارة القوارب':'trips','الرحلات والحجوزات':'trips','الطاقم':'trips','الجدولة والتقويم':'trips','الصيانة والمعدات':'store','السلامة واللوائح':'safety','الطقس وحالة البحر':'marine-intelligence','المستندات والتراخيص':'community','المالية والفواتير':'finance','التقييمات':'community','التسويق والعروض':'community','طلبات الخدمات':'trips','الحجوزات والعقود':'community','المشاركون':'community','المستندات والتصاريح':'documents','السلامة والامتثال':'safety','الفواتير':'finance','المستخدمون':'admin','الموافقات والطلبات':'admin','مراكز الغوص':'admin','الوساطة البحرية':'admin','الشركات والجهات الحكومية':'admin','المعدات والمستودعات':'store','التقارير والإحصائيات':'admin','الذكاء الاصطناعي':'admin','إدارة المحتوى':'community','الإشعارات والرسائل':'community','الإعدادات':'admin'};const id=maps[label],target=targetFor(id);if(target){d.querySelectorAll('.hl-portal-nav-item').forEach(x=>x.classList.remove('active'));node.classList.add('active');if(id==='documents')window.HydrolandDocuments?.open?.();target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+(id==='documents'?'hl-documents':id))}else{node.disabled=true;node.setAttribute('aria-disabled','true');node.title='قيد الربط بالخدمة'}}));
  }

  const applyRole=role=>{const next=role||'diver';if(next==='diver'){clearDashboard();return}render(next)};
  document.addEventListener('hydroland:role-changed',event=>applyRole(event.detail?.role));
  document.getElementById('exit-role')?.addEventListener('click',clearDashboard);
  document.addEventListener('hydroland:portal-cleared',clearDashboard);
  document.addEventListener('hydroland:auth-changed',()=>{const role=window.HydrolandPortalAccess?.getCurrentRole?.()||'diver';if(!window.HydrolandAuth?.isAuthenticated?.()||role==='diver'||!window.HydrolandPortalAccess?.roleAllowed?.(role)){clearDashboard();return}applyRole(role)});
  queueMicrotask(()=>applyRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'));
  const taskScript=document.createElement('script');taskScript.src='./hydroland-role-task-routing.js';document.body.appendChild(taskScript);
})();
