(()=>{
  if(window.HydrolandWorkspaceUI)return;

  const roleModules={
    '.hl-finance':['diver','instructor','center','boat','organization','admin'],
    '.hl-training':['diver','instructor','center','admin'],
    '.hl-members':['diver','instructor','center','boat','organization','admin'],
    '.hl-logistics':['center','boat','admin'],
    '.hl-procurement':['center','boat','admin'],
    '.hl-safety-center':['center','boat','organization','admin'],
    '.hl-safety-review':['center','boat','organization','admin'],
    '.hl-safety-incidents':['center','boat','organization','admin'],
    '.hl-weather-admin':['center','boat','admin'],
    '.hl-booking-admin':['center','boat','admin'],
    '.hl-calendar-admin':['center','boat','admin'],
    '.hl-crew-assignments':['boat','admin'],
    '.hl-dive-review':['instructor','center','admin'],
    '.hl-documents':['center','boat','organization','admin'],
    '#hl-marine-documents':['boat','admin'],
    '#hl-marine-readiness':['center','boat','admin'],
    '.hl-organizations':['center','boat','organization','admin'],
    '.hl-admin':['admin'],
    '.hl-theme-admin':['admin'],
    '.hl-trip-admin':['center','boat','admin'],
    '.hl-store-admin':['center','admin'],
    '.hl-policy-center':['admin']
  };
  const policyEntries=Object.entries(roleModules);
  const auth=()=>Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const currentRole=()=>auth()?(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'):'visitor';
  const setWorkspace=()=>{
    const isAuthed=auth(),role=currentRole(),body=document.body;
    body.dataset.hlWorkspaceRole=role;
    body.classList.toggle('hl-authenticated-workspace',isAuthed);
    body.classList.toggle('hl-managed-workspace',isAuthed&&role!=='diver');
    body.classList.toggle('hl-diver-workspace',isAuthed&&role==='diver');
    for(const [selector,roles] of policyEntries){
      document.querySelectorAll(selector).forEach(node=>node.classList.toggle('hl-workspace-hidden',!isAuthed||!roles.includes(role)));
    }
    const home=document.querySelector('#navigation > a[href="#home"]');
    if(home){
      const label=home.querySelector('span:last-child');
      const target=isAuthed&&role==='diver'?'#hl-diver-dashboard':'#home';
      home.setAttribute('href',target);
      if(label)label.textContent=isAuthed&&role==='diver'?'لوحة الغواص':'الرئيسية';
      home.classList.toggle('active',location.hash===target||(!location.hash&&target==='#home'));
    }
  };
  const queued=()=>queueMicrotask(setWorkspace);
  for(const eventName of ['hydroland:auth-changed','hydroland:role-changed','hydroland:guest-mode','hydroland:profile-data-ready'])document.addEventListener(eventName,queued);
  const moduleObserver=new MutationObserver(records=>{
    const relevant=records.some(record=>[...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE&&(
      policyEntries.some(([selector])=>node.matches(selector)||node.querySelector(selector))
    )));
    if(relevant)queued();
  });
  moduleObserver.observe(document.body,{childList:true,subtree:true});
  window.HydrolandWorkspaceUI={refresh:setWorkspace,getRole:currentRole};
  setWorkspace();
})();
