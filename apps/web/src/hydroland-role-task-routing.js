(()=>{
  if(window.HydrolandRoleTasks)return;
  const routes={
    'إدارة الطلاب وتقييم المهارات':{section:'training'},
    'جلسات التدريب':{section:'training'},
    'إصدار الشهادات بعد الاعتماد':{section:'training'},
    'متابعة الحجوزات والرحلات':{section:'trips'},
    'الطاقم والمعدات والقوارب':{section:'store'},
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
    if(role==='diver'||!auth?.isAuthenticated?.()||typeof access?.authorizeRole!=='function')return false;
    return access.authorizeRole(role,{sessionVersion:auth.getSessionVersion?.()});
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
  // The admin dashboard has no generic documents route in its configured menu.
  // Add explicit entry points without changing backend membership/owner checks.
  let documentEntryGeneration=0;
  const connectAdminDocuments=()=>{
    const dashboard=document.querySelector('.hl-role-dashboard[data-role="admin"]');
    if(!dashboard)return;
    const access=window.HydrolandPortalAccess,auth=window.HydrolandAuth;
    const available=Boolean(auth?.isAuthenticated?.()&&access?.getCurrentRole?.()==='admin'&&access?.roleAllowed?.('admin')&&typeof window.HydrolandDocuments?.open==='function'&&document.getElementById('hl-documents'));
    for(const [position,host] of [['sidebar',dashboard.querySelector('.hl-portal-safe')],['quick',dashboard.querySelector('.hl-command-grid')]]){
      if(!host)continue;
      let button=host.querySelector('[data-admin-documents-entry]');
      if(!button){
        button=document.createElement('button');button.type='button';
        button.dataset.adminDocumentsEntry=position;
        if(position==='sidebar')button.className='hl-portal-switch';
        button.textContent='المستندات والنماذج';
        button.addEventListener('click',async()=>{
          const auth=window.HydrolandAuth,access=window.HydrolandPortalAccess;
          const session=auth?.getSessionVersion?.(),generation=documentEntryGeneration;
          const current=()=>dashboard.isConnected&&generation===documentEntryGeneration&&auth?.isAuthenticated?.()&&auth.getSessionVersion?.()===session&&access?.getCurrentRole?.()==='admin'&&access?.roleAllowed?.('admin');
          if(button.disabled||!current()||typeof access?.authorizeRole!=='function')return;
          button.disabled=true;button.setAttribute('aria-busy','true');
          try{
            if(!await access.authorizeRole('admin',{sessionVersion:session,isCurrent:current})||!current())return;
            const target=document.getElementById('hl-documents'),controller=window.HydrolandDocuments;
            if(!target||typeof controller?.open!=='function')return;
            // A return to an already-open workspace must not reset a typed draft.
            const form=target.querySelector('[data-doc-form]');
            const hasInput=Boolean(form&&([...form.querySelectorAll('[data-doc-fields] input,[data-doc-fields] textarea,[data-doc-fields] select')].some(input=>input.type==='checkbox'?input.checked:Boolean(input.value))||form.querySelector('[data-doc-template]')?.disabled));
            if(target.hidden||!hasInput)controller.open({internal:true});
            window.HydrolandWorkspaceUI?.show?.(target);
            dashboard.classList.remove('hl-portal-nav-open');
            history.replaceState(null,'','#hl-documents');
          }catch{
            if(current())button.title='تعذر التحقق من صلاحية الدخول. أعد المحاولة.';
          }finally{
            button.removeAttribute('aria-busy');
            if(current())button.disabled=false;
          }
        });
        if(position==='sidebar')host.prepend(button);else host.appendChild(button);
      }
      if(button.getAttribute('aria-busy')!=='true')button.disabled=!available;
      if(!available)button.title='المدخل متاح للإدارة بعد تحميل خدمة المستندات.';
      else if(button.title==='المدخل متاح للإدارة بعد تحميل خدمة المستندات.')button.title='';
    }
  };
  const connect=()=>{
    connectAdminDocuments();
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
  for(const event of ['hydroland:role-changed','hydroland:auth-changed','hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,()=>{documentEntryGeneration++;queueMicrotask(connect);});
  document.addEventListener('hydroland:profile-data-ready',()=>queueMicrotask(connect));
  new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('.hl-role-dashboard,#hl-documents')||node.querySelector('.hl-role-dashboard,#hl-documents')))))queueMicrotask(connect);
  }).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  const root=document.getElementById('role-console-tasks');
  if(root)new MutationObserver(()=>queueMicrotask(connect)).observe(root,{childList:true});
  connect();
  window.HydrolandRoleTasks={refresh:connect};
})();