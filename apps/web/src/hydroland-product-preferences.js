(()=>{
  const messages={'مفضلتي':'My favorites','حفظ في المفضلة':'Save to favorites','إزالة من المفضلة':'Remove from favorites',
    'نبّهني عند التوفر':'Notify me when available','إلغاء تنبيه التوفر':'Cancel stock alert',
    'تعذر حفظ اختيارك.':'Could not save your selection.','حُفظ اختيارك.':'Your selection was saved.','سجّل الدخول لحفظ اختياراتك.':'Sign in to save your choices.',
    'تعذر تحميل المفضلة.':'Could not load your favorites.'};
  const locale=window.HydrolandI18n?.createScope('product-preferences',messages);
  const t=key=>locale?.t(key)??key, auth=()=>window.HydrolandAuth;
  const preferences=new Map();
  let listOnly=false,revision=0,session=null,ready=false,request=null,redraw=()=>{},toggle;
  const signed=()=>Boolean(auth()?.isAuthenticated?.());
  const token=()=>auth()?.getSessionVersion?.();
  function say(message){
    const toast=document.getElementById('toast');if(!toast)return;
    toast.textContent=t(message);toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),2400);
  }
  function reset(){
    revision++;session=null;ready=false;request=null;preferences.clear();listOnly=false;
    if(toggle)toggle.setAttribute('aria-pressed','false');
    redraw();
  }
  function ensure(){
    if(!signed())return Promise.resolve(false);
    if(session!==token()){reset();session=token()}
    if(ready)return Promise.resolve(true);
    if(request)return request;
    const gen=revision,v=token();
    request=(async()=>{
      try {
        const res=await auth().authorizedFetch('/store/preferences/mine'),rows=await res.json();
        if(!signed()||gen!==revision||token()!==v)return false;
        if(!res.ok||!Array.isArray(rows))throw Error();
        preferences.clear();for(const row of rows)preferences.set(row.productId,row);
        ready=true;redraw();return true;
      }catch{return false}
      finally{if(gen===revision)request=null}
    })();
    return request;
  }
  function login(){say('سجّل الدخول لحفظ اختياراتك.');document.getElementById('visitor-auth-cta')?.click()}
  function mount(controls,render){
    redraw=render;toggle=document.createElement('button');toggle.type='button';toggle.dataset.storeFavorites='';toggle.textContent=t('مفضلتي');toggle.setAttribute('aria-pressed','false');controls.append(toggle);
    toggle.onclick=async()=>{if(!signed())return login();if(!await ensure()){say('تعذر تحميل المفضلة.');return}listOnly=!listOnly;toggle.setAttribute('aria-pressed',String(listOnly));redraw()};
    document.addEventListener('hydroland:session-cleared',reset);
    document.addEventListener('hydroland:auth-changed',()=>{if(!signed())reset();else void ensure()});
    if(signed())queueMicrotask(ensure);
  }
  function renderControls(card,product){
    const dest=card.querySelector('.hl-public-card-actions');if(!dest)return;
    const row=preferences.get(product.id);
    for(const [kind,field,on,off] of [['favorite','favorite','حفظ في المفضلة','إزالة من المفضلة'],['stock-alert','stockAlert','نبّهني عند التوفر','إلغاء تنبيه التوفر']]){
      if(kind==='stock-alert'&&product.stockQuantity>0&&!row?.stockAlert)continue;
      const btn=document.createElement('button');btn.type='button';btn.dataset.productPreference=kind;
      btn.textContent=t(row?.[field]?off:on);btn.setAttribute('aria-pressed',String(Boolean(row?.[field])));
      btn.onclick=async()=>{
        if(!signed())return login();
        btn.disabled=true;
        if(!await ensure()){say('تعذر تحميل المفضلة.');btn.disabled=false;return}
        const gen=revision,v=token(), enabled=!preferences.get(product.id)?.[field];
        try{
          const res=await auth().authorizedFetch('/store/preferences/'+encodeURIComponent(product.id)+'/'+kind,{method:'PUT',body:JSON.stringify({enabled})});
          const saved=await res.json();
          if(gen!==revision||token()!==v||!signed())return;
          if(!res.ok||saved.productId!==product.id)throw Error();
          if(saved.favorite||saved.stockAlert)preferences.set(product.id,saved);else preferences.delete(product.id);
          say('حُفظ اختيارك.');redraw();
        }catch{if(gen===revision)say('تعذر حفظ اختيارك.')}
        finally{btn.disabled=false}
      };dest.append(btn);
    }
  }
  window.HydrolandProductPreferences={mount,renderControls,allows:id=>!listOnly||Boolean(preferences.get(id)?.favorite),only:()=>listOnly};
})();
