(() => {
  const locale=window.HydrolandI18n?.createScope('merchant-stock',{
    'مخزون الفروع والمستودعات':'Branch and warehouse stock','موقع جديد':'New stock location','اسم الموقع':'Location name','رمز الموقع':'Location code',
    'الفرع':'Branch','موقع مستقل':'Independent location','حفظ الموقع':'Save location','حركة مخزون':'Stock transfer','الصنف':'Item',
    'من موقع':'From location','إلى موقع':'To location','المتاح للبيع في المتجر':'Available for online sale','الكمية':'Quantity',
    'نقل الكمية':'Transfer stock','رصيد الصنف':'Item balance','إجمالي الوحدات':'Total units','آخر الحركات':'Recent transfers',
    'تم حفظ الموقع':'Location saved','تم تسجيل حركة المخزون':'Stock transfer recorded','إعادة المحاولة':'Try again','اختر موقعًا':'Choose a location',
    'تعذر تحميل المخزون':'Could not load inventory','ابحث بالاسم أو رقم الصنف':'Search by name or SKU','لا توجد حركات بعد':'No transfers yet',
    'تُنقل الوحدات بين الأرصدة. يستطيع العميل شراء الكمية المتاحة في المتجر.':'Transfers move units between balances. Customers can buy the quantity available for online sale.',
  });
  const t=key=>locale?.t(key)??key;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
  function label(parent,text,input){const node=el('label',t(text));node.append(input);parent.append(node);return input}
  function select(parent,text,entries){
    const field=label(parent,text,el('select'));for(const [value,caption] of entries)field.add(new Option(caption,value));return field;
  }
  function submit(parent,text){const button=el('button',t(text));button.type='submit';parent.append(button);return button}
  function mount(panel,request,active,onTransfer){
    const section=el('details'),summary=el('summary',t('مخزون الفروع والمستودعات')),body=el('div');
    section.dataset.merchantInventory='';section.append(summary,body);panel.append(section);
    let version=0,loaded=false;
    const live=v=>v===version && active() && section.isConnected;
    async function load(message=''){
      const v=++version;
      try{
        const data=await request('/store/provider/inventory');if(!live(v))return;
        if(!['locations','units','products','movements'].every(k=>Array.isArray(data?.[k])))throw Error(t('تعذر تحميل المخزون'));
        loaded=true;body.replaceChildren();
        const feedback=el('p',message);feedback.setAttribute('role','status');body.append(feedback,el('p',t('تُنقل الوحدات بين الأرصدة. يستطيع العميل شراء الكمية المتاحة في المتجر.')));
        const places=new Map([['ONLINE',t('المتاح للبيع في المتجر')],...data.locations.map(l=>[l.id,l.title+' · '+l.code])]);
        function bind(form,button,path,read,notice){
          let key='',fingerprint='';
          form.onsubmit=async event=>{
            event.preventDefault();if(!live(v)||button.disabled)return;
            const payload=read(),hash=JSON.stringify(payload);
            if(hash!==fingerprint){key=crypto.randomUUID();fingerprint=hash}
            button.disabled=true;
            try{
              await request('/store/provider/inventory/'+path,{method:'POST',body:JSON.stringify({requestId:key,...payload})});
              if(live(v)){
                if(path==='transfers'){void window.HydrolandStore?.reloadProducts?.();await onTransfer();return}
                await load(t(notice));
              }
            }catch(error){if(live(v))feedback.textContent=error.message}
            finally{button.disabled=false}
          };
        }
        const loc=el('form');loc.append(el('h4',t('موقع جديد')));body.append(loc);
        const title=label(loc,'اسم الموقع',el('input')),code=label(loc,'رمز الموقع',el('input'));
        title.required=true;title.maxLength=160;code.required=true;code.maxLength=40;
        const branch=select(loc,'الفرع',[['',t('موقع مستقل')],...data.units.map(u=>[u.id,u.nameAr+' · '+u.code])]);
        bind(loc,submit(loc,'حفظ الموقع'),'locations',()=>({title:title.value,code:code.value,orgUnitId:branch.value||null}),'تم حفظ الموقع');

        const move=el('form');move.dataset.stockTransfer='';move.append(el('h4',t('حركة مخزون')));body.append(move);
        const search=label(move,'ابحث بالاسم أو رقم الصنف',el('input'));search.type='search';
        const item=select(move,'الصنف',[]);item.required=true;
        const balance=el('div');balance.setAttribute('aria-live','polite');move.append(balance);
        function drawBalance(){
          balance.replaceChildren();const product=data.products.find(p=>p.id===item.value);if(!product)return;
          balance.append(el('h5',t('رصيد الصنف')));
          const entries=[['ONLINE',product.stockQuantity],...product.locationStock.map(s=>[s.locationId,s.quantity])];
          for(const [site,n] of entries)balance.append(el('p',(places.get(site)||site)+' · '+n));
          balance.append(el('strong',t('إجمالي الوحدات')+' · '+entries.reduce((sum,r)=>sum+r[1],0)));
        }
        function searchProducts(){const old=item.value,needle=search.value.trim().toLowerCase();item.replaceChildren();
          for(const p of data.products.filter(p=>(p.nameAr+' '+p.sku).toLowerCase().includes(needle)))item.add(new Option(p.nameAr+' · '+p.sku,p.id));
          if([...item.options].some(o=>o.value===old))item.value=old;drawBalance();
        }
        searchProducts();search.oninput=searchProducts;item.onchange=drawBalance;
        const source=select(move,'من موقع',[...places]),target=select(move,'إلى موقع',[['',t('اختر موقعًا')],...places]);
        target.required=true;const qty=label(move,'الكمية',el('input'));qty.type='number';qty.min='1';qty.max='2147483647';qty.step='1';qty.required=true;
        bind(move,submit(move,'نقل الكمية'),'transfers',()=>({productId:item.value,sourceKey:source.value,destinationKey:target.value,quantity:Number(qty.value)}),'تم تسجيل حركة المخزون');
        const history=el('details');history.append(el('summary',t('آخر الحركات')));const names=new Map(data.products.map(p=>[p.id,p.sku]));
        for(const m of data.movements)history.append(el('p',[names.get(m.productId)||m.productId,places.get(m.sourceKey),places.get(m.destinationKey),m.quantity,new Date(m.movedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})].join(' · ')));
        if(!data.movements.length)history.append(el('p',t('لا توجد حركات بعد')));body.append(history);
      }catch(error){if(live(v)){const retry=el('button',t('إعادة المحاولة'));retry.type='button';retry.onclick=()=>load();body.replaceChildren(el('p',error.message),retry)}}
    }
    section.ontoggle=()=>{if(section.open&&!loaded)void load()};
    return section;
  }
  window.HydrolandStoreInventory=Object.freeze({mount});
})();
