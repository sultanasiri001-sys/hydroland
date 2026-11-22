(() => {
  const locale=window.HydrolandI18n?.createScope('loyalty-offers',{
    'عروض النقاط':'Points offers','عرض تكلفة الاستبدال':'View redemption price','نقاطك المستخدمة':'Points to use',
    'قيمة النقاط':'Points value','المبلغ المطلوب':'Amount due','أكّد الاستبدال':'Confirm redemption','كمّل نقاطك':'Complete your points',
    'إلغاء الحجز':'Cancel reservation','بانتظار تأكيد التحصيل':'Awaiting payment confirmation',
    'تم الاستبدال':'Redeemed','تعذرت العملية. أعد تحميل العرض.':'Could not complete the action. Reload the offer.',
    'متابعة الحجز':'Continue reservation'
  });
  const t=value=>locale?.t(value)||value;
  function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function button(label){const b=node('button',t(label));b.type='button';return b;}
  const money=value=>new Intl.NumberFormat(document.documentElement.lang||'ar-SA',{style:'currency',currency:'SAR'}).format(value/100);

  async function render(host,centerId,active) {
    const auth=window.HydrolandAuth;
    if(!auth?.isAuthenticated?.())return;
    const version=auth.getSessionVersion?.();
    const current=()=>active()&&host.isConnected&&auth.isAuthenticated()&&auth.getSessionVersion?.()===version;
    async function request(path,body) {
      if(!current())throw Error();
      const options=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
      const r=await auth.authorizedFetch('/rewards/'+path,options);
      if(!r.ok||!current())throw Error();
      return r.json();
    }
    let offers;
    try{offers=await request('centers/'+encodeURIComponent(centerId)+'/offers');}catch{return;}
    if(!current()||!offers.length)return;
    const panel=node('section');panel.append(node('h3',t('عروض النقاط')));host.append(panel);
    for(const offer of offers){
      const item=node('article'),details=node('div'),open=button('عرض تكلفة الاستبدال');
      item.append(node('h4',offer.title),open,details);panel.append(item);
      const base='offers/'+encodeURIComponent(offer.id);
      let busy=false,requestKey;
      async function act(work){
        if(busy||!current())return;
        busy=true;
        item.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{await work();}catch{if(current())details.replaceChildren(node('p',t('تعذرت العملية. أعد تحميل العرض.')));}
        finally{busy=false;if(current())item.querySelectorAll('button').forEach(b=>b.disabled=false);}
      }
      function resume(hold) {
        if(!current())return;
        details.replaceChildren();
        if(hold.status==='AWAITING_PAYMENT'){details.append(node('p',t('بانتظار تأكيد التحصيل')));return;}
        const go=button('متابعة الحجز'),cancel=button('إلغاء الحجز');
        details.append(go,cancel);
        go.onclick=()=>act(()=>submit(hold));
        cancel.onclick=()=>act(async()=>{await request('reservations/'+encodeURIComponent(hold.id)+'/cancel',{});requestKey=null;details.replaceChildren();});
      }
      async function submit(hold) {
        const path='reservations/'+encodeURIComponent(hold.id);
        await request(path+(hold.topUpMinor?'/payment':'/complete'),{});
        if(current())details.replaceChildren(node('p',t(hold.topUpMinor?'بانتظار تأكيد التحصيل':'تم الاستبدال')));
        requestKey=null;
      }
      open.onclick=()=>act(async()=>{
        const pending=await request(base+'/pending');
        if(pending.length){resume(pending[0]);return;}
        const q=await request(base+'/quote');if(!current())return;
        const info=node('dl');
        for(const [label,value] of [['نقاطك المستخدمة',q.heldPoints],['قيمة النقاط',money(q.heldPoints)],['المبلغ المطلوب',money(q.cashDueMinor)]])
          info.append(node('dt',t(label)),node('dd',String(value)));
        const confirm=button(q.topUpMinor?'كمّل نقاطك':'أكّد الاستبدال');details.replaceChildren(info,confirm);
        confirm.onclick=()=>act(async()=>{
          requestKey??=crypto.randomUUID();
          const hold=await request(base+'/reservations',{requestKey,points:q.heldPoints,cashDueMinor:q.cashDueMinor});
          if(hold.status==='HELD')await submit(hold);
          else if(hold.status==='COMPLETED')details.replaceChildren(node('p',t('تم الاستبدال')));
          else resume(hold);
        });
      });
    }
  }
  window.HydrolandLoyaltyOffers={render};
})();
