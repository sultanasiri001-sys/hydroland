(()=>{
  const section=document.getElementById('store');if(!section)return;
  const grid=section.querySelector('.product-grid');
  const toast=m=>{const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const cart=new Map();
  const catalog={products:[],trips:[],status:'loading',filter:'all',typeFilter:'all'};
  const money=(v,c='SAR')=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:c}).format(v/100);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.HydrolandAuth;
  const idempotencyKey=()=>`store-${Date.now()}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
  const panel=document.createElement('div');panel.className='hl-store-cart';panel.innerHTML='<strong>السلة</strong><span class="hl-store-summary">السلة فارغة</span><button type="button" class="hl-store-checkout" disabled>إنشاء الطلب</button><small class="hl-store-payment-note">الدفع الإلكتروني غير متاح حاليًا. إنشاء الطلب لا يخصم أي مبلغ.</small><button type="button" class="hl-store-orders">طلباتي</button><div class="hl-store-orders-list" hidden></div>';section.appendChild(panel);
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
  const addToCart=id=>{
    const product=catalog.products.find(item=>item.id===id);if(!product)return false;
    const quantity=cart.get(id)?.quantity||0;
    if(quantity>=product.stockQuantity){toast('لا يمكن تجاوز المخزون المتاح');return false}
    cart.set(id,{...product,quantity:quantity+1});renderCart();toast('تمت إضافة المنتج إلى السلة');return true;
  };
  const catalogControls=document.createElement('div');catalogControls.className='hl-store-catalog-controls';catalogControls.setAttribute('role','group');catalogControls.setAttribute('aria-label','تصنيف عروض المتجر');catalogControls.innerHTML='<button type="button" data-store-type-filter="all" aria-pressed="true">الكل</button><button type="button" data-store-type-filter="products" aria-pressed="false">السلع</button><button type="button" data-store-type-filter="trips" aria-pressed="false">الرحلات</button>';grid.insertAdjacentElement('beforebegin',catalogControls);
  catalogControls.querySelectorAll('[data-store-type-filter]').forEach(button=>button.addEventListener('click',()=>{catalog.typeFilter=button.dataset.storeTypeFilter;catalogControls.querySelectorAll('[data-store-type-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderProducts()}));
  const tripDate=trip=>{const value=new Date(trip.startsAt);return Number.isNaN(value.getTime())?'الموعد يحدده المركز':value.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'})};
  const renderProducts=()=>{
    const products=catalog.typeFilter==='trips'?[]:catalog.products.filter(product=>catalog.filter==='all'||(catalog.filter==='available'?product.stockQuantity>0:product.stockQuantity<1));
    const trips=catalog.typeFilter==='products'?[]:catalog.trips;
    if(!products.length&&!trips.length){grid.innerHTML='<article class="hl-public-empty"><span>'+(!catalog.products.length&&!catalog.trips.length?'لا توجد عروض متاحة حاليًا.':'لا توجد عروض مطابقة لهذا الاختيار.')+'</span></article>';return}
    const productCards=products.map(p=>'<article data-public-product="'+esc(p.id)+'"><div class="product-art"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 22h28l4 32H14l4-32Z"/><path d="M24 26V18a8 8 0 0 1 16 0v8M25 37h14M25 44h9"/></svg><span class="hl-product-image-state">صورة المنتج غير متاحة</span></div><small>سلعة · '+esc(p.sku)+'</small><h3>'+esc(p.nameAr)+'</h3><strong>'+money(p.priceMinor,p.currency)+'</strong><small>المتوفر: '+Number(p.stockQuantity)+'</small><div class="hl-public-card-actions"><a data-public-detail="product" href="#product/'+encodeURIComponent(p.id)+'">تفاصيل المنتج</a><button type="button" data-store-add="'+esc(p.id)+'" '+(p.stockQuantity<1?'disabled':'')+'>'+(p.stockQuantity<1?'نفد المخزون':'أضف للسلة')+'</button></div></article>').join('');
    const tripCards=trips.map(trip=>'<article data-store-trip="'+esc(trip.id)+'" data-public-service="trip"><div class="product-art"><span class="hl-product-image-state">رحلة غوص</span></div><small>رحلة · '+(String(trip.type||'').toUpperCase().includes('SHORE')?'غوص من الشاطئ':'رحلة بحرية')+'</small><h3>'+esc(trip.title)+'</h3><small>'+esc(trip.location?.locationName||trip.siteName||trip.meetingPoint||'الموقع يحدده المركز')+'</small><small>'+esc(tripDate(trip))+'</small><small>المتاح '+Number(trip.remainingSeats??trip.capacity??0)+' من '+Number(trip.capacity||0)+' مقعد</small><strong>'+esc(window.HydrolandBookings?.formatPrice?.(trip.price)||'السعر حسب بيانات الرحلة')+'</strong><div class="hl-public-card-actions"><a data-public-detail="trip" href="#trip/'+encodeURIComponent(trip.id)+'">تفاصيل الرحلة</a><button type="button" data-book="'+esc(trip.title)+'" data-trip-id="'+esc(trip.id)+'">احجز الرحلة</button></div></article>').join('');
    grid.innerHTML=productCards+tripCards;
    grid.querySelectorAll('[data-store-add]').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.storeAdd)));
    window.HydrolandBookingAvailability?.refresh?.();
  };
  const loadProducts=async()=>{
    catalog.status='loading';grid.innerHTML='<article class="hl-public-empty"><span>جارٍ تحميل عروض المتجر...</span></article>';
    try{
      const base=auth()?.apiBase||'https://hydroland.onrender.com/api/v1';
      const [productResult,tripResult]=await Promise.allSettled([
        fetch(base+'/store/products').then(async response=>{if(!response.ok)throw new Error('PRODUCTS_UNAVAILABLE');const rows=await response.json();if(!Array.isArray(rows))throw new Error('INVALID_PRODUCTS');return rows}),
        fetch(base+'/trips').then(async response=>{if(!response.ok)throw new Error('TRIPS_UNAVAILABLE');const rows=await response.json();if(!Array.isArray(rows))throw new Error('INVALID_TRIPS');return rows})
      ]);
      if(productResult.status!=='fulfilled')throw productResult.reason;
      catalog.products=productResult.value.filter(product=>product&&product.id&&product.nameAr);
      catalog.trips=tripResult.status==='fulfilled'?tripResult.value.filter(trip=>trip&&trip.id&&trip.title):[];
      catalog.status='ready';renderProducts();
    }catch{catalog.products=[];catalog.trips=[];catalog.status='error';grid.innerHTML='<article class="hl-public-empty"><span>تعذر تحميل عروض المتجر من الخادم حاليًا.</span><button type="button" class="hl-store-retry">إعادة المحاولة</button></article>';grid.querySelector('.hl-store-retry')?.addEventListener('click',loadProducts)}
    finally{document.dispatchEvent(new CustomEvent('hydroland:public-products-updated'))}
  };
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
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الطلب');document.getElementById('visitor-auth-cta')?.click();return}
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
  window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders,getCart:()=>[...cart.values()],getProducts:()=>[...catalog.products],getPublicStatus:()=>catalog.status,addToCart,setFilter:filter=>{catalog.filter=['all','available','unavailable'].includes(filter)?filter:'all';if(catalog.status==='ready')renderProducts()}};
})();
