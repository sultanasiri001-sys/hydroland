(()=>{
  const scripts=['hydroland-inventory.js','hydroland-inventory-value.js','hydroland-equipment-rentals.js','hydroland-stocktake.js','hydroland-rental-admin.js'];
  let loading=null,loaded=false;
  const loadScript=src=>new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(script=>script.getAttribute('src')===`./${src}`||script.src.endsWith(`/${src}`));
    if(existing){if(existing.dataset.hlLoaded==='1')return resolve();existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error(`Failed to load ${src}`)),{once:true});return;}
    const script=document.createElement('script');script.src=`./${src}`;script.dataset.hlEquipmentAdmin='1';script.onload=()=>{script.dataset.hlLoaded='1';resolve()};script.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.appendChild(script);
  });
  const closeDialogs=()=>document.querySelectorAll('.hl-barcode-dialog[open]').forEach(dialog=>dialog.close());
  const hide=()=>{document.querySelector('.hl-inventory')?.setAttribute('hidden','');closeDialogs()};
  const position=()=>{const inventory=document.querySelector('.hl-inventory'),host=document.getElementById('role-console');if(inventory&&host){host.insertAdjacentElement('afterend',inventory);inventory.removeAttribute('hidden')}};
  const refresh=()=>{document.querySelector('.hl-inventory [data-inventory-action="refresh"]')?.click();document.querySelector('#hl-rental-refresh')?.click()};
  const ensureLoaded=async()=>{
    if(loaded){position();refresh();return;}
    if(loading)return loading;
    loading=(async()=>{for(const src of scripts)await loadScript(src);loaded=true;position();refresh()})().finally(()=>{loading=null});
    return loading;
  };
  document.addEventListener('hydroland:role-changed',event=>{
    if(event.detail?.role==='admin')void ensureLoaded().catch(error=>{console.error('Equipment admin bootstrap failed',error);document.dispatchEvent(new CustomEvent('hydroland:bootstrap-error',{detail:{message:error.message}}))});
    else hide();
  });
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())hide()});
  window.HydrolandEquipmentAdmin={open:ensureLoaded,hide};
})();
