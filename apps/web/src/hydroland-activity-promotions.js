(()=>{
  const copy={'خصومات الدورات والرحلات والتأجير':'Course, trip and rental promotions','تحديث العروض':'Refresh offers',
    'الدورة':'Course','الرحلة':'Trip','معدة للإيجار':'Rental equipment','عرض التأجير في المتجر':'List rental in the store','السعر الأساسي بالريال':'Regular price in SAR',
    'لا توجد عروض متاحة.':'No offers are available.','تعذر تحميل العروض.':'Could not load offers.','حفظ العرض':'Save offer','حُفظ السعر.':'Price saved.',
    'دون خصم':'No discount','السعر بعد الخصم':'Sale price','بحث عن عرض':'Search offers'};
  const locale=window.HydrolandI18n?.createScope('activity-promotions',copy),t=s=>locale?.t(s)??s;
  function mount(box){
    if(box.querySelector('[data-activity-discount-board]'))return;
    const el=(tag,v)=>{const e=document.createElement(tag);if(v!==undefined)e.textContent=v;return e};
    const details=el('details'),summary=el('summary',t('خصومات الدورات والرحلات والتأجير')),out=el('div'),search=el('input');
    details.dataset.activityDiscountBoard='';search.type='search';search.placeholder=t('بحث عن عرض');search.setAttribute('aria-label',search.placeholder);details.append(summary,search,out);
    const discountBoard=box.querySelector('.hl-catalog-dashboard');(discountBoard||box).append(details);
    let version=0,data=[];
    const auth=()=>window.HydrolandAuth;
    function show(){
      out.replaceChildren();const ui=window.HydrolandProductCatalog;
      for(const row of data.filter(r=>r.title.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()))){
        const item=el('details'),title=el('summary',t({course:'الدورة',trip:'الرحلة',rental:'معدة للإيجار'}[row.type])+' · '+row.title);
        const f=el('form'),base=el('input'),active=el('input'),label=el('label',t('السعر الأساسي بالريال'));base.name='price';base.type='number';base.step='0.01';base.min='0';base.required=true;base.readOnly=row.type!=='rental';base.value=row.baseMinor==null?'':(row.baseMinor/100).toFixed(2);label.append(base);f.append(label);
        if(row.type==='rental'){active.type='checkbox';active.checked=row.published;const pub=el('label',t('عرض التأجير في المتجر'));pub.prepend(active);f.append(pub)}
        const fields=el('fieldset');fields.innerHTML=ui.discountFields(row.sale||{},row.currency);f.append(fields);
        const save=el('button',t('حفظ العرض')),status=el('p');status.setAttribute('role','status');f.append(save,status);item.append(title,f);out.append(item);
        f.onsubmit=async ev=>{ev.preventDefault();if(save.disabled)return;const session=auth()?.getSessionVersion?.(),gen=version;save.disabled=true;
          try{
            const amount=Math.round(Number(base.value)*100),raw=ui.read(f,{},amount);
            const payload={baseMinor:amount,revision:row.revision,sale:{salePriceMinor:raw.salePriceMinor,startsAt:raw.startsAt,endsAt:raw.endsAt},...(row.type==='rental'?{published:active.checked}:{})};
            const r=await auth().authorizedFetch('/store/admin/activity-promotions/'+row.type+'/'+encodeURIComponent(row.id),{method:'PUT',body:JSON.stringify(payload)});
            const d=await r.json();if(!r.ok)throw Error(d.message||t('تعذر تحميل العروض.'));
            if(session===auth()?.getSessionVersion?.()&&gen===version&&details.open&&!box.hidden){await load();void window.HydrolandStore?.reloadProducts?.()}
          }catch(e){if(gen===version&&!box.hidden)status.textContent=e.message}finally{save.disabled=false}
        };
      }
      if(!out.children.length)out.textContent=t('لا توجد عروض متاحة.');
    }
    async function load(){const gen=++version,token=auth()?.getSessionVersion?.();if(!details.open||box.hidden)return;try{
      const r=await auth().authorizedFetch('/store/admin/activity-promotions'),rows=await r.json();
      if(gen!==version||!details.open||box.hidden||auth()?.getSessionVersion?.()!==token)return;
      if(!r.ok||!Array.isArray(rows))throw Error();data=rows;show();
    }catch{if(gen===version&&details.open){data=[];out.textContent=t('تعذر تحميل العروض.')}}}
    search.oninput=show;details.ontoggle=()=>{if(details.open)void load();else{version++;data=[];out.replaceChildren()}};
    document.addEventListener('hydroland:session-cleared',()=>{details.open=false;data=[];version++;out.replaceChildren()});
  }
  window.HydrolandActivityPromotions={mount};
})();
