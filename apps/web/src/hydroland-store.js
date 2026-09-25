(()=>{
  const section=document.getElementById('store');if(!section)return;
  const grid=section.querySelector('.product-grid');
  const toast=m=>{const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const cart=new Map();
  const money=(v,c='SAR')=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:c}).format(v/100);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.HydrolandAuth;
  const idempotencyKey=()=>`store-${Date.now()}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
  const panel=document.createElement('div');panel.className='hl-store-cart';panel.innerHTML='<strong>السلة</strong><span class="hl-store-summary">السلة فارغة</span><button type="button" class="hl-store-checkout" disabled>إنشاء الطلب وسجل الدفع</button><small class="hl-store-payment-note">يتم إنشاء سجل دفع آمن فقط؛ التحصيل المالي الفعلي يتطلب تفعيل مزود الدفع.</small><button type="button" class="hl-store-orders">طلباتي</button><div class="hl-store-orders-list" hidden></div>';section.appendChild(panel);
  const summary=panel.querySelector('.hl-store-summary'),checkout=panel.querySelector('.hl-store-checkout'),orders=panel.querySelector('.hl-store-orders-list');
  const renderCart=()=>{let n=0,total=0;for(const x of cart.values()){n+=x.quantity;total+=x.priceMinor*x.quantity}summary.textContent=n?(n+' منتج · '+money(total)):'السلة فارغة';checkout.disabled=!n};
  const parse=async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(body.message)?body.message.join('، '):body.message||`HTTP ${r.status}`);return body};
  const loadPayments=async()=>{const r=await auth().authorizedFetch('/store/payments/mine');const data=await parse(r);return Array.isArray(data)?data:[]};
  const paymentForOrder=(payments,orderId)=>payments.find(payment=>payment.orderId===orderId)||null;
  const createPaymentRecord=async(orderId,key=idempotencyKey())=>{
    try{
      const r=await auth().authorizedFetch(`/store/orders/${encodeURIComponent(orderId)}/payment`,{method:'POST',body:JSON.stringify({idempotencyKey:key})});
      return{payment:await parse(r),recovered:false};
    }catch(error){
      try{const payments=await loadPayments(),existing=paymentForOrder(payments,orderId);if(existing)return{payment:existing,recovered:true}}catch{}
      throw error;
    }
  };
  const paymentStatusText=payment=>payment?`سجل الدفع: ${payment.status} · ${payment.provider||'NOT_SELECTED'}${payment.financialActionExecuted?'':' · لا يوجد تحصيل مالي منفذ'}`:'لا يوجد سجل دفع';
  const loadProducts=async()=>{grid.innerHTML='<article><span>جارٍ تحميل المنتجات...</span></article>';try{const base=auth()?.apiBase||'https://hydroland.onrender.com/api/v1';const r=await fetch(base+'/store/products');const products=await r.json();if(!r.ok||!Array.isArray(products))throw new Error();if(!products.length){grid.innerHTML='<article><span>لا توجد منتجات متاحة حاليًا.</span></article>';return}grid.innerHTML=products.map(p=>'<article><div class="product-art">◉</div><small>'+esc(p.sku)+'</small><span>'+esc(p.nameAr)+'</span><strong>'+money(p.priceMinor,p.currency)+'</strong><small>المتوفر: '+p.stockQuantity+'</small><button type="button" data-store-add="'+esc(p.id)+'" '+(p.stockQuantity<1?'disabled':'')+'>'+(p.stockQuantity<1?'نفد المخزون':'أضف للسلة')+'</button></article>').join('');grid.querySelectorAll('[data-store-add]').forEach(btn=>btn.addEventListener('click',()=>{const p=products.find(x=>x.id===btn.dataset.storeAdd);if(!p)return;const q=cart.get(p.id)?.quantity||0;if(q>=p.stockQuantity){toast('لا يمكن تجاوز المخزون المتاح');return}cart.set(p.id,{...p,quantity:q+1});renderCart()}))}catch{grid.innerHTML='<article><span>تعذر تحميل المتجر من الخادم حاليًا.</span><button type="button" class="hl-store-retry">إعادة المحاولة</button></article>';grid.querySelector('.hl-store-retry')?.addEventListener('click',loadProducts)}};
  const loadOrders=async()=>{
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول لعرض طلباتك');return}
    orders.hidden=false;orders.textContent='جارٍ تحميل الطلبات...';
    try{
      const [orderResponse,payments]=await Promise.all([auth().authorizedFetch('/store/orders/mine'),loadPayments()]);
      const data=await parse(orderResponse);if(!Array.isArray(data))throw new Error('تعذر تحميل الطلبات');
      orders.innerHTML=data.length?data.map(o=>{const payment=paymentForOrder(payments,o.id),eligible=['CREATED','CONFIRMED'].includes(o.status)&&!payment;return `<article data-store-order="${esc(o.id)}"><b>${esc(o.status)}</b><span>${money(o.totalMinor,o.currency)}</span><small>${new Date(o.createdAt).toLocaleString('ar-SA')}</small><small data-store-payment-state>${esc(paymentStatusText(payment))}</small>${eligible?'<button type="button" data-store-payment-retry>إنشاء سجل الدفع</button>':''}</article>`}).join(''):'لا توجد طلبات حتى الآن.';
      orders.querySelectorAll('[data-store-payment-retry]').forEach(button=>button.addEventListener('click',async()=>{const article=button.closest('[data-store-order]'),orderId=article?.dataset.storeOrder,status=article?.querySelector('[data-store-payment-state]');if(!orderId)return;button.disabled=true;if(status)status.textContent='جارٍ إنشاء سجل الدفع...';try{const {payment}=await createPaymentRecord(orderId);if(status)status.textContent=paymentStatusText(payment);button.remove();toast('تم إنشاء سجل الدفع للطلب؛ مزود الدفع لم يُفعّل بعد.')}catch(error){if(status)status.textContent='تعذر إنشاء سجل الدفع';toast(error.message||'تعذر إنشاء سجل الدفع')}finally{button.disabled=false}}));
    }catch{orders.textContent='تعذر تحميل الطلبات.'}
  };
  checkout.addEventListener('click',async()=>{
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الطلب');document.querySelector('.hl-login')?.classList.remove('hidden');return}
    checkout.disabled=true;
    let order=null;
    try{
      const r=await auth().authorizedFetch('/store/orders',{method:'POST',body:JSON.stringify({items:[...cart.values()].map(x=>({productId:x.id,quantity:x.quantity}))})});
      order=await parse(r);
      cart.clear();renderCart();await loadProducts();
      try{
        const {payment,recovered}=await createPaymentRecord(order.id);
        toast(recovered?'تم إنشاء الطلب واستعادة سجل الدفع الموجود · مزود الدفع غير مفعّل':'تم إنشاء الطلب وسجل الدفع · مزود الدفع غير مفعّل');
        window.dispatchEvent(new CustomEvent('hydroland:store-checkout-created',{detail:{order,payment}}));
      }catch(error){
        toast('تم إنشاء الطلب وحفظ المخزون، لكن تعذر إنشاء سجل الدفع. افتح «طلباتي» لاستكماله.');
        window.dispatchEvent(new CustomEvent('hydroland:store-order-created',{detail:{order,paymentError:error?.message||'PAYMENT_RECORD_FAILED'}}));
      }
    }catch(error){toast(error.message||'تعذر إنشاء الطلب')}
    finally{renderCart()}
  });
  panel.querySelector('.hl-store-orders').addEventListener('click',loadOrders);
  loadProducts();
  window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders,getCart:()=>[...cart.values()]};
})();