(()=>{
  if(window.HydrolandPortalFreshness)return;
  const access=window.HydrolandPortalAccess;
  const auth=window.HydrolandAuth;
  if(!access||!auth)return;
  const roleSwitch=document.getElementById('role-switch');
  const dialog=document.getElementById('role-dialog');
  let replaySwitch=false,replayRole=false,refreshPromise=null;
  const authenticated=()=>Boolean(auth.isAuthenticated?.());
  const clearCachedRoles=()=>{
    const data=window.HydrolandProfileData,profile=data?.profile;
    if(profile)window.HydrolandProfileData={...data,profile:{...profile,roles:[]}};
  };
  const refreshPortalAccess=async()=>{
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      if(!authenticated()){clearCachedRoles();return false}
      try{
        const response=await auth.authorizedFetch('/me');
        const body=await response.json().catch(()=>null);
        if(!response.ok||!body)throw new Error('ROLE_REFRESH_FAILED');
        const roles=Array.isArray(body.roleAssignments)?body.roleAssignments:Array.isArray(body.roles)?body.roles:[];
        window.HydrolandProfileData={...(window.HydrolandProfileData||{}),profile:{...body,roles}};
        return true;
      }catch{
        clearCachedRoles();
        return false;
      }
    })();
    try{return await refreshPromise}finally{refreshPromise=null}
  };
  const syncRoleOptions=()=>{
    document.querySelectorAll('#role-dialog [data-role]').forEach(button=>{
      const allowed=access.roleAllowed(button.dataset.role);
      button.dataset.hlRoleAllowed=allowed?'1':'0';
      button.setAttribute('aria-disabled',allowed?'false':'true');
      button.disabled=!allowed;
      button.title=allowed?'':'هذا الدور غير نشط على حسابك';
    });
  };
  const enforceCurrentRole=()=>{
    const role=access.getCurrentRole?.()||'diver';
    if(role==='diver'||access.roleAllowed(role))return true;
    const exit=document.getElementById('exit-role');
    if(exit)exit.click();else access.clearProtectedPortal?.();
    return false;
  };
  access.refreshPortalAccess=refreshPortalAccess;
  roleSwitch?.addEventListener('click',async event=>{
    if(replaySwitch)return;
    if(!authenticated()){syncRoleOptions();return}
    event.preventDefault();event.stopImmediatePropagation();
    await refreshPortalAccess();
    enforceCurrentRole();
    syncRoleOptions();
    replaySwitch=true;
    try{roleSwitch.click()}finally{replaySwitch=false}
  },true);
  dialog?.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-role]');
    if(!button||replayRole)return;
    const role=button.dataset.role;
    if(role==='diver'||!authenticated()){syncRoleOptions();return}
    event.preventDefault();event.stopImmediatePropagation();
    await refreshPortalAccess();
    enforceCurrentRole();
    syncRoleOptions();
    if(!access.roleAllowed(role))return;
    replayRole=true;
    try{button.click()}finally{replayRole=false}
  },true);
  document.addEventListener('visibilitychange',async()=>{
    if(document.visibilityState!=='visible'||!authenticated()||(access.getCurrentRole?.()||'diver')==='diver')return;
    await refreshPortalAccess();
    enforceCurrentRole();
    syncRoleOptions();
  });
  document.addEventListener('hydroland:auth-changed',()=>queueMicrotask(syncRoleOptions));
  syncRoleOptions();
  window.HydrolandPortalFreshness={refresh:refreshPortalAccess,sync:syncRoleOptions,enforce:enforceCurrentRole};
})();