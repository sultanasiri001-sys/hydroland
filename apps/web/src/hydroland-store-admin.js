(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("store-admin", {
  "مؤكد": "Confirmed",
  "ملغي": "Cancelled",
  "مسودة": "Draft",
  "نشط": "Active",
  "مكتمل": "Complete",
  "الحالة": "Status",
  "السعر": "Price",
  "تحديث الحالة": "Refresh status",
  "تعذر تحديث الطلب": "Could not update the request",
  "STORE / الإدارة": "STORE / Administration",
  "إدارة منتجات المتجر": "Manage store products",
  "اسم المنتج بالعربية": "Product name in Arabic",
  "السعر بالريال": "Price in SAR",
  "المخزون": "Stock",
  "غير نشط": "Inactive",
  "إضافة المنتج": "Add product",
  "تحديث المنتجات": "Refresh products",
  "بانتظار البيانات...": "Awaiting data...",
  "جارٍ تحميل المنتجات...": "Loading products...",
  "value=\"DRAFT\">مسودة": "value=\"DRAFT\">Draft",
  "value=\"ACTIVE\">نشط": "value=\"ACTIVE\">Active",
  "value=\"INACTIVE\">غير نشط": "value=\"INACTIVE\">Inactive",
  "حفظ": "Save",
  "لا توجد منتجات بعد.": "No products yet.",
  "تعذر الحفظ": "Could not save",
  "تم تحديث المنتج": "Product updated",
  "تعذر تحديث المنتج": "Could not update the product",
  "تعذر تحميل منتجات الإدارة. تحقق من صلاحية ADMIN.": "Could not load administration products. Check your ADMIN permission.",
  "تعذر إضافة المنتج": "Could not add the product",
  "تمت إضافة المنتج": "Product added",
  "إدارة الطلبات": "Manage orders",
  "تحديث الطلبات": "Refresh orders",
  "جديد": "New",
  "جارٍ تحميل الطلبات...": "Loading orders...",
  "طلب": "Order",
  "لا توجد طلبات حتى الآن.": "No orders yet.",
  "تم تحديث حالة الطلب": "Order status updated",
  "تعذر تحميل الطلبات. تحقق من صلاحية ADMIN.": "Could not load orders. Check your ADMIN permission."
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

 const host=document.getElementById('role-console')||document.querySelector('main');if(!host)return;
 const box=document.createElement('section');box.className='hl-store-admin';box.hidden=true;uiLocale.setHTML(box, uiLocale.html`<div><span class="eyebrow">STORE / الإدارة</span><h2>إدارة منتجات المتجر</h2></div><form data-store-product-form><input name="sku" placeholder="SKU" required><input name="nameAr" placeholder="اسم المنتج بالعربية" required><input name="nameEn" placeholder="English name"><input name="price" type="number" min="0" step="0.01" placeholder="السعر بالريال" required><input name="stockQuantity" type="number" min="0" step="1" placeholder="المخزون" required><select name="status"><option value="DRAFT">مسودة</option><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option></select><button type="submit">إضافة المنتج</button></form><button type="button" data-store-admin-refresh>تحديث المنتجات</button><div data-store-admin-list>بانتظار البيانات...</div>`);host.insertAdjacentElement('afterend',box);
 const list=box.querySelector('[data-store-admin-list]'),form=box.querySelector('form');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const toast=m=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, m);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
 const api=(path,opt={})=>window.HydrolandAuth.authorizedFetch(path,opt);
 async function load(){uiLocale.setMessage(list, uiLocale.message('جارٍ تحميل المنتجات...'));try{const r=await api('/store/admin/products');const data=await r.json();if(!r.ok||!Array.isArray(data))throw new Error();uiLocale.setHTML(list, data.length?data.map(p=>uiLocale.html`<article data-product="${esc(p.id)}"><strong>${esc(p.nameAr)}</strong><small>${esc(p.sku)}</small><label>السعر <input data-field="priceMinor" type="number" min="0" step="1" value="${p.priceMinor}"></label><label>المخزون <input data-field="stockQuantity" type="number" min="0" step="1" value="${p.stockQuantity}"></label><label>الحالة <select data-field="status"><option ${p.status==='DRAFT'?'selected':''} value="DRAFT">مسودة</option><option ${p.status==='ACTIVE'?'selected':''} value="ACTIVE">نشط</option><option ${p.status==='INACTIVE'?'selected':''} value="INACTIVE">غير نشط</option></select></label><button type="button" data-save>حفظ</button></article>`).join(''):uiLocale.t('لا توجد منتجات بعد.'));list.querySelectorAll('[data-save]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('[data-product]');const priceMinor=Number(row.querySelector('[data-field="priceMinor"]').value),stockQuantity=Number(row.querySelector('[data-field="stockQuantity"]').value),status=row.querySelector('[data-field="status"]').value;btn.disabled=true;try{const r=await api('/store/admin/products/'+row.dataset.product,{method:'PATCH',body:JSON.stringify({priceMinor,stockQuantity,status})});if(!r.ok){const b=await r.json().catch(()=>({}));throw (value=>value?new Error(value):localError('تعذر الحفظ'))(b.message)}toast(uiLocale.message('تم تحديث المنتج'));await load()}catch(e){toast(localErrorMessage(e, 'تعذر تحديث المنتج'))}finally{btn.disabled=false}}))}catch{uiLocale.setMessage(list, uiLocale.message('تعذر تحميل منتجات الإدارة. تحقق من صلاحية ADMIN.'))}}
 form.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(form),price=Number(d.get('price')),stockQuantity=Number(d.get('stockQuantity'));const body={sku:String(d.get('sku')||'').trim(),nameAr:String(d.get('nameAr')||'').trim(),nameEn:String(d.get('nameEn')||'').trim()||undefined,priceMinor:Math.round(price*100),stockQuantity,status:String(d.get('status')||'DRAFT')};const submit=form.querySelector('button[type="submit"]');submit.disabled=true;try{const r=await api('/store/admin/products',{method:'POST',body:JSON.stringify(body)});if(!r.ok){const b=await r.json().catch(()=>({}));throw (value=>value?new Error(value):localError('تعذر إضافة المنتج'))(b.message)}form.reset();toast(uiLocale.message('تمت إضافة المنتج'));await load()}catch(err){toast(localErrorMessage(err, 'تعذر إضافة المنتج'))}finally{submit.disabled=false}});
 const orderPanel=document.createElement('div');orderPanel.className='hl-store-orders-admin';uiLocale.setHTML(orderPanel, uiLocale.html`<h3>إدارة الطلبات</h3><button type="button" data-order-refresh>تحديث الطلبات</button><div data-order-list>بانتظار البيانات...</div>`);box.appendChild(orderPanel);
 const orderList=orderPanel.querySelector('[data-order-list]');
 const statusLabel={CREATED:'جديد',CONFIRMED:'مؤكد',CANCELLED:'ملغي',FULFILLED:'مكتمل'};
 const nextStatuses={CREATED:['CONFIRMED','CANCELLED'],CONFIRMED:['FULFILLED','CANCELLED'],CANCELLED:[],FULFILLED:[]};
 async function loadOrders(){uiLocale.setMessage(orderList, uiLocale.message('جارٍ تحميل الطلبات...'));try{const r=await api('/store/admin/orders');const data=await r.json();if(!r.ok||!Array.isArray(data))throw new Error();uiLocale.setHTML(orderList, data.length?data.map(o=>{const customer=[o.account?.person?.firstName,o.account?.person?.lastName].filter(Boolean).join(' ')||o.account?.email||'—';const items=(o.items||[]).map(i=>esc(i.product?.nameAr||i.productId)+' × '+i.quantity).join('، ');const actions=nextStatuses[o.status]||[];return uiLocale.html`<article data-order="${esc(o.id)}"><strong>طلب ${esc(o.id.slice(0,8))}</strong><span>${esc(customer)}</span><small>${items}</small><b>${moneyAdmin(o.totalMinor,o.currency)}</b><em>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(statusLabel[o.status]) || o.status))}</em>${(actions.length?uiLocale.html`<select data-order-status>${actions.map(s=>uiLocale.html`<option value="${s}">${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(statusLabel[s]))}</option>`).join('')}</select><button type="button" data-order-save>تحديث الحالة</button>`:'')}</article>`}).join(''):uiLocale.t('لا توجد طلبات حتى الآن.'));orderList.querySelectorAll('[data-order-save]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('[data-order]'),status=row.querySelector('[data-order-status]').value;btn.disabled=true;try{const r=await api('/store/admin/orders/'+row.dataset.order+'/status',{method:'PATCH',body:JSON.stringify({status})});if(!r.ok){const body=await r.json().catch(()=>({}));throw (value=>value?new Error(value):localError('تعذر تحديث الطلب'))(body.message)}toast(uiLocale.message('تم تحديث حالة الطلب'));await loadOrders();await load()}catch(e){toast(localErrorMessage(e, 'تعذر تحديث الطلب'))}finally{btn.disabled=false}}))}catch{uiLocale.setMessage(orderList, uiLocale.message('تعذر تحميل الطلبات. تحقق من صلاحية ADMIN.'))}}
 const moneyAdmin=(v,c='SAR')=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:c}).format(v/100);
 box.querySelector('[data-store-admin-refresh]').addEventListener('click',()=>{load();loadOrders()});
 orderPanel.querySelector('[data-order-refresh]').addEventListener('click',loadOrders);
 document.addEventListener('hydroland:role-changed',e=>{box.hidden=e.detail?.role!=='admin';if(!box.hidden){load();loadOrders()}});
})();