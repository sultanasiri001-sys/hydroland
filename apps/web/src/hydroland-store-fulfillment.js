(()=>{
  const dict={'تجهيز الطلبات وتسليمها':'Fulfill store orders','متابعة الشحن والاستلام':'Track delivery or pickup','قيد التجهيز':'Packing','جاهز للاستلام من المركز':'Ready for pickup','سُلّم لشركة الشحن':'Handed to carrier','شركة الشحن':'Carrier','رقم التتبع':'Tracking number','موقع وتعليمات الاستلام':'Pickup location and instructions','حفظ حالة التجهيز':'Save fulfillment status','الكمية':'Quantity','لا توجد طلبات مؤهلة للتجهيز.':'No orders are ready to fulfill.','لم يُسجّل تحديث شحن لهذا البند.':'No update for this item yet.','تعذر تحميل التتبع.':'Tracking details could not be loaded.','إعادة المحاولة':'Try again','طريقة التسليم':'Fulfillment status'};
  const loc=window.HydrolandI18n?.createScope('store-fulfillment',dict),t=k=>loc?.t(k)??k;
  const states={PACKING:'قيد التجهيز',PICKUP_READY:'جاهز للاستلام من المركز',SHIPPED:'سُلّم لشركة الشحن'};
  const el=(name,text)=>{const n=document.createElement(name);if(text!==undefined)n.textContent=text;return n};
  async function fetchData(path,op){const response=await window.HydrolandAuth.authorizedFetch(path,op);const result=await response.json();if(!response.ok)throw Error(result.message||t('تعذر تحميل التتبع.'));return result}
  function detail(host,label,load){
    const d=el('details'),summary=el('summary',t(label)),out=el('div');d.append(summary,out);host.append(d);
    let ver=0;
    const refresh=async()=>{
      const now=++ver,session=window.HydrolandAuth?.getSessionVersion?.();
      const live=()=>d.open&&d.isConnected&&now===ver&&session===window.HydrolandAuth?.getSessionVersion?.()&&!d.closest('[hidden]');
      out.replaceChildren();try{await load(out,live,refresh)}catch(error){if(live()){out.textContent=error.message||t('تعذر تحميل التتبع.');const b=el('button',t('إعادة المحاولة'));b.type='button';b.onclick=refresh;out.append(b)}}
    };
    d.className='hl-fulfillment';d.ontoggle=()=>{if(d.open)void refresh();else{ver++;out.replaceChildren()}};
  }
  function shopper(host,order){
    detail(host,'متابعة الشحن والاستلام',async(out,live)=>{
      const rows=await fetchData('/store/orders/'+encodeURIComponent(order.id)+'/fulfillment');if(!live())return;
      for(const row of rows){const item=order.items?.find(i=>i.id===row.itemId);if(!item)continue;const a=el('article');a.append(el('strong',item.contractSnapshot?.title||item.product?.nameAr||''));const n=row.notice;
        if(n){a.append(el('p',t(states[n.state]||n.state)));if(n.carrier)a.append(el('p',t('شركة الشحن')+' · '+n.carrier));if(n.tracking)a.append(el('p',t('رقم التتبع')+' · '+n.tracking));if(n.pickup)a.append(el('p',n.pickup))}
        else a.append(el('p',t('لم يُسجّل تحديث شحن لهذا البند.')));out.append(a)}
    });
  }
  function merchant(host){
    detail(host,'تجهيز الطلبات وتسليمها',async(out,live,refresh)=>{
      const rows=await fetchData('/store/provider/fulfillment');if(!live())return;
      if(!rows.length){out.append(el('p',t('لا توجد طلبات مؤهلة للتجهيز.')));return}
      for(const row of rows){
        const form=el('form');form.append(el('strong',row.title),el('small',row.orderId+' · '+t('الكمية')+' '+row.remaining));
        const state=el('select');const original=row.notice?.state;
        for(const [key,label] of Object.entries(states))if(!original||original==='PACKING'||key===original)state.add(new Option(t(label),key));state.value=original||'PACKING';const stateLabel=el('label',t('طريقة التسليم'));stateLabel.append(state);form.append(stateLabel);
        const fields={};
        for(const [key,caption,max] of [['carrier','شركة الشحن',100],['tracking','رقم التتبع',140],['pickup','موقع وتعليمات الاستلام',320]]){
          const label=el('label',t(caption)),input=el('input');input.value=row.notice?.[key]||'';input.maxLength=max;label.append(input);form.append(label);fields[key]={label,input};
        }
        function adjust(){for(const [key,{label,input}] of Object.entries(fields)){const needed=key==='pickup'?state.value==='PICKUP_READY':state.value==='SHIPPED';label.hidden=!needed;input.required=needed;input.disabled=!needed}}
        state.onchange=adjust;adjust();const save=el('button',t('حفظ حالة التجهيز')),message=el('p');message.setAttribute('role','status');form.append(save,message);out.append(form);
        let previous='',requestId;
        form.onsubmit=async e=>{e.preventDefault();if(save.disabled||!live())return;const body={revision:row.notice?.revision??0,state:state.value};for(const [key,{input}] of Object.entries(fields))if(!input.disabled)body[key]=input.value;
          const payload=JSON.stringify(body);if(payload!==previous){requestId=crypto.randomUUID();previous=payload}
          save.disabled=true;try{await fetchData('/store/provider/fulfillment/'+encodeURIComponent(row.itemId),{method:'POST',body:JSON.stringify({...body,requestId})});if(live())await refresh()}
          catch(error){if(live())message.textContent=error.message}finally{save.disabled=false}};
      }
    });
  }
  document.addEventListener('hydroland:session-cleared',()=>document.querySelectorAll('.hl-fulfillment').forEach(d=>{d.open=false;d.querySelector('div')?.replaceChildren()}));
  window.HydrolandStoreFulfillment={merchant,shopper};
})();
