(()=>{
  if(window.HydrolandWorkspaceUI)return;

  const roleModules={
    '.hl-inventory':['admin'],
    '.hl-finance':['diver','instructor','center','boat','organization','admin'],
    '.hl-training':['diver','instructor','center','admin'],
    '.hl-members':['diver','instructor','center','boat','organization','admin'],
    '.hl-logistics':['center','boat','admin'],
    '.hl-procurement':['center','boat','admin'],
    '.hl-safety-center':['center','boat','organization','admin'],
    '.hl-safety-review':['center','boat','organization','admin'],
    '#hl-safety-incidents':['diver','instructor','center','boat','organization','admin'],
    '.hl-weather-admin':['admin'],
    '.hl-booking-admin':['admin'],
    '.hl-calendar-admin':['admin'],
    '.hl-crew-assignments':['instructor','center','boat','admin'],
    '.hl-dive-review':['instructor','center','admin'],
    '.hl-documents':['center','boat','organization','admin'],
    '#hl-marine-documents':['boat','admin'],
    '#hl-marine-readiness':['boat','admin'],
    '.hl-organizations':['center','boat','organization','admin'],
    '.hl-admin':['admin'],
    '.hl-theme-admin':['admin'],
    '.hl-trip-admin':['admin'],
    '.hl-store-admin':['center','admin'],
    '.hl-policy-center':['admin']
  };
  const policyEntries=Object.entries(roleModules);
  const auth=()=>Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const currentRole=()=>auth()?(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver'):'visitor';
  const setWorkspace=()=>{
    const isAuthed=auth(),role=currentRole(),body=document.body;
    body.dataset.hlWorkspaceRole=role;
    body.classList.toggle('hl-visitor-mode',!isAuthed);
    if(isAuthed){delete body.dataset.publicPage;main.querySelectorAll('.hl-public-page-hidden').forEach(node=>node.classList.remove('hl-public-page-hidden'))}
    body.classList.toggle('hl-authenticated-workspace',isAuthed);
    body.classList.toggle('hl-managed-workspace',isAuthed&&role!=='diver');
    body.classList.toggle('hl-diver-workspace',isAuthed&&role==='diver');
    for(const [selector,roles] of policyEntries){
      document.querySelectorAll(selector).forEach(node=>node.classList.toggle('hl-workspace-hidden',!isAuthed||!roles.includes(role)));
    }
    syncNavigation(role);
    const home=document.querySelector('#navigation > a[href="#home"],#navigation > a[href="#hl-diver-dashboard"]');
    if(home){
      const label=home.querySelector('span:last-child');
      const target=isAuthed&&role==='diver'?'#hl-diver-dashboard':'#home';
      home.setAttribute('href',target);
      if(label)label.textContent=isAuthed&&role==='diver'?'لوحة هواة الغوص':'الرئيسية';
      home.classList.toggle('active',location.hash===target||!location.hash||(role==='diver'&&location.hash==='#home'));
    }
  };
  const nav=document.getElementById('navigation'),switcher=document.getElementById('role-switch');
  const publicItems=[...nav.children].filter(node=>node!==switcher);let navRole='visitor';
  const publicIcons={home:'home',explore:'compass',trips:'boat',training:'learn',store:'bag',community:'people',safety:'shield'};
  publicItems.forEach(node=>{const art=publicIcons[node.hash?.slice(1)],holder=node.querySelector('.nav-icon');if(art&&holder)holder.innerHTML=window.HydrolandUI.icon(art)});
  const syncNavigation=role=>{
    const next=role==='diver'?'diver':'visitor';if(navRole===next)return;navRole=next;
    if(next==='visitor'){nav.replaceChildren(...publicItems,switcher);return}
    const {icon}=window.HydrolandUI;
    const fragment=document.createElement('div');
    fragment.innerHTML=[['home','الرئيسية','#hl-diver-dashboard'],['boat','الرحلات والحجوزات','#trips'],['water','سجل الغوص','logbook'],['tanks','المعدات','diver-equipment-list'],['certificate','الشهادات','certs'],['bag','المتجر والتأجير','#store'],['people','المجتمع','#community'],['pin','المواقع','#marine-intelligence'],['learn','التدريب','#training'],['mail','الرسائل','messages'],['help','مركز المساعدة','#hl-support'],['settings','الإعدادات','settings']].map(([art,label,target])=>target.startsWith('#')?`<a class="nav-item" href="${target}"><span class="nav-icon">${icon(art)}</span><span>${label}</span></a>`:`<button type="button" class="nav-item" data-hl-action="${target}"><span class="nav-icon">${icon(art)}</span><span>${label}</span></button>`).join('');nav.replaceChildren(...fragment.children,switcher);
  };
  const main=document.getElementById('main');
  const serviceGroups={'hl-marine-documents':['#hl-marine-documents','#hl-marine-readiness'],training:['#training','.hl-training'],community:['#community','.hl-community','.hl-support','.hl-members'],safety:['#safety','.hl-safety-center','.hl-safety-review','#hl-safety-incidents','#hl-marine-readiness']};
  let selected=null;
  const show=target=>{
    if(!auth()||!target)return false;
    let node=typeof target==='string'?document.getElementById(target):target;if(!node)return false;
    const role=currentRole(),home=node.matches('.hl-role-dashboard,#hl-diver-dashboard,#home');
    main.querySelectorAll('.hl-workspace-selected').forEach(item=>item.classList.remove('hl-workspace-selected'));
    const heading=document.querySelector('.hl-service-heading');
    if(home){selected=null;delete document.body.dataset.hlWorkspaceView;if(heading)heading.hidden=true;history.replaceState(null,'','#'+(role==='diver'?'hl-diver-dashboard':'home'));document.querySelectorAll('.hl-portal-nav-item').forEach((item,index)=>{item.classList.toggle('active',index===0);if(index===0)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:'instant'});return true}
    if(node.classList.contains('hl-workspace-hidden'))return false;
    while(node.parentElement&&node.parentElement!==main)node=node.parentElement;
    if(node.parentElement!==main)return false;
    selected=node;node.classList.add('hl-workspace-selected');document.body.dataset.hlWorkspaceView='service';
    for(const selector of serviceGroups[node.id]||[])document.querySelectorAll(selector).forEach(item=>{if(!item.classList.contains('hl-workspace-hidden'))item.classList.add('hl-workspace-selected')});
    if(heading){heading.hidden=false;heading.querySelector('[data-service-title]').textContent=node.querySelector('h1,h2,h3')?.textContent||'مساحة الخدمة'}
    document.querySelector('.hl-role-dashboard')?.classList.remove('hl-portal-nav-open');document.querySelector('.sidebar')?.classList.remove('open');
    if(!node.hasAttribute('tabindex'))node.tabIndex=-1;node.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});return true;
  };
  const reset=()=>{selected=null;main.querySelectorAll('.hl-workspace-selected').forEach(item=>item.classList.remove('hl-workspace-selected'));delete document.body.dataset.hlWorkspaceView;const heading=document.querySelector('.hl-service-heading');if(heading)heading.hidden=true};
  document.addEventListener('click',event=>{
    if(!auth()||event.defaultPrevented)return;
    const link=event.target.closest('a[href^="#"]');if(!link||!link.closest('#navigation,.mobile-nav'))return;
    const id=link.hash.slice(1),target=document.getElementById(id)||(id==='hl-support'?document.querySelector('.hl-support'):null);if(!target)return;event.preventDefault();show(target);history.replaceState(null,'','#'+id);document.querySelectorAll('.nav-item[href]').forEach(item=>item.classList.toggle('active',item===link));
  });
  const queued=()=>queueMicrotask(()=>{connectServices();setWorkspace();window.HydrolandRoleDashboards?.refreshControls?.()});
  for(const eventName of ['hydroland:auth-changed','hydroland:role-changed','hydroland:guest-mode'])document.addEventListener(eventName,()=>{reset();queued()});
  document.addEventListener('hydroland:profile-data-ready',queued);
  const moduleObserver=new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE&&policyEntries.some(([selector])=>node.matches(selector)||node.querySelector(selector)))))queued();
  });moduleObserver.observe(document.body,{childList:true,subtree:true});
  // Feature controllers retain their API and ownership of loading/authorization.
  const wrappedServices=new WeakSet();
  function connectServices(){
    for(const [name,selector] of [['HydrolandDocuments','#hl-documents'],['HydrolandMarineDocuments','#hl-marine-documents'],['HydrolandSafetyIncidents','#hl-safety-incidents'],['HydrolandMarineReadiness','#hl-marine-readiness']]){
      const service=window[name];if(typeof service?.open!=='function'||wrappedServices.has(service))continue;
      const open=service.open;service.open=(...args)=>{const result=open(...args);show(document.querySelector(selector));return result};wrappedServices.add(service);
    }
  }
  window.HydrolandWorkspaceUI={refresh:setWorkspace,getRole:currentRole,show};connectServices();setWorkspace();
})();
