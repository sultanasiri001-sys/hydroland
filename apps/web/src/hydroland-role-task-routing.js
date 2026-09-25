(()=>{
  const routes={
    'إدارة الطلاب وتقييم المهارات':{section:'training'},
    'جلسات التدريب':{section:'training'},
    'إصدار الشهادات بعد الاعتماد':{section:'training'},
    'متابعة الحجوزات والرحلات':{section:'trips'},
    'الطاقم والمعدات والوسائط البحرية':{section:'store'},
    'الامتثال والمالية والتقارير':{selector:'.hl-finance',hash:'finance'},
    'إدارة الرحلات والتقويم':{section:'trips'},
    'فحص القارب والوثائق والتراخيص':{action:()=>window.HydrolandMarineDocuments?.open?.()},
    'جاهزية الطاقم والسلامة':{section:'safety'},
    'طلبات الخدمات البحرية':{section:'trips'},
    'العقود والتوقيع الإلكتروني':{action:()=>window.HydrolandDocuments?.open?.()},
    'تقارير السلامة والالتزام':{section:'safety'},
    'طابور الاعتمادات والمستخدمين':{selector:'.hl-admin',hash:'admin'},
    'مركز السلامة والحوادث':{section:'safety'},
    'المالية والتكاملات وتدقيق النظام':{selector:'.hl-admin',hash:'admin'}
  };
  const clean=node=>String(node?.childNodes?.length?Array.from(node.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(''):node?.textContent||'').trim();
  const authorizeCurrentRole=async()=>{
    const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
    const role=access?.getCurrentRole?.()||'diver';
    if(role==='diver'||!auth?.isAuthenticated?.()||!access?.roleAllowed?.(role))return false;
    if(typeof access.refreshPortalAccess!=='function')return false;
    await access.refreshPortalAccess();
    if(window.HydrolandPortalFreshness?.enforce?.()===false)return false;
    return Boolean(auth.isAuthenticated()&&access.roleAllowed(role));
  };
  const navigate=config=>{
    if(config.action){config.action();return true}
    const target=config.section?document.getElementById(config.section):document.querySelector(config.selector);
    if(!target)return false;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    const hash=config.hash||config.section;
    if(hash)history.replaceState(null,'','#'+hash);
    return true;
  };
  const connect=()=>{
    document.querySelectorAll('#role-console-tasks button').forEach(button=>{
      if(button.dataset.hlRoleTaskConnected==='1')return;
      const label=clean(button),config=routes[label];
      if(!config)return;
      button.disabled=false;
      button.removeAttribute('aria-disabled');
      button.dataset.hlRoleTaskConnected='1';
      const state=button.querySelector('b');
      if(state)state.textContent='فتح ←';
      button.onclick=async()=>{
        if(!(await authorizeCurrentRole()))return;
        if(navigate(config))return;
        button.disabled=true;
        button.dataset.hlRoleTaskConnected='0';
        if(state)state.textContent='غير متاح';
      };
    });
  };
  document.addEventListener('hydroland:role-changed',()=>queueMicrotask(connect));
  const root=document.getElementById('role-console-tasks');
  if(root)new MutationObserver(()=>queueMicrotask(connect)).observe(root,{childList:true});
  connect();
  window.HydrolandRoleTasks={refresh:connect};
  const freshnessScript=document.createElement('script');
  freshnessScript.src='./hydroland-portal-access-freshness.js';
  document.body.appendChild(freshnessScript);
})();