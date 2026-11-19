(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("equipment-rentals", {
  "تعذر تنفيذ الطلب ({0})": "Could not complete the request ({0})",
  "الحجز:": "Booking:",
  "النوع": "Type",
  "سجّل الدخول لإدارة التأجير": "Sign in to manage rentals",
  "{0} ر.س": "SAR {0}",
  "تأجير المعدات والفواتير": "Equipment rentals and invoices",
  "الدفع يؤكد الحجز فقط؛ صرف المعدات يتم من المستودع بمسح كل قطعة.": "Payment confirms the reservation only. Equipment is checked out from the warehouse by scanning each item.",
  "فاتورة تأجير جديدة": "New rental invoice",
  "أنشئ فاتورة لبدء التأجير.": "Create an invoice to start a rental.",
  "فاتورة تأجير معدات": "Equipment rental invoice",
  "رقم حساب الغواص": "Diver account number",
  "رقم واتساب - اختياري": "WhatsApp number — optional",
  "موعد إرجاع المعدات": "Equipment return deadline",
  "أكواد المعدات": "Equipment codes",
  "HYD-... افصل بين القطع بفاصلة": "HYD-... Separate items with a comma",
  "الأنواع": "Types",
  "المقاسات": "Sizes",
  "الأسعار بالريال": "Prices in SAR",
  "حجز وإنشاء الفاتورة": "Reserve and create invoice",
  "الدفع:": "Payment:",
  "الإرجاع:": "Return:",
  "تأكيد الدفع": "Confirm payment",
  "إرسال داخل التطبيق": "Send in the app",
  "تجهيز واتساب": "Prepare WhatsApp sharing",
  "طباعة / PDF": "Print / PDF",
  "المقاس:": "Size:",
  "أدخل كود معدة واحدًا على الأقل": "Enter at least one equipment code",
  "حدد موعد إرجاع المعدات": "Set the equipment return deadline",
  "موعد الإرجاع يجب أن يكون في المستقبل": "The return deadline must be in the future",
  "تم إنشاء الحجز والفاتورة": "Reservation and invoice created",
  "تعذر إنشاء فاتورة التأجير": "Could not create the rental invoice",
  "تم تأكيد الدفع؛ المعدات الآن بانتظار مسح التسليم في المستودع": "Payment confirmed. Equipment awaits warehouse handover scanning",
  "تعذر تأكيد الدفع": "Could not confirm payment",
  "تم تجهيز مشاركة واتساب؛ مزود واتساب غير مربوط بعد": "WhatsApp sharing prepared. The WhatsApp provider is not connected yet",
  "تم إرسال الفاتورة داخل التطبيق": "Invoice sent in the app",
  "تعذر مشاركة الفاتورة": "Could not share the invoice",
  "اسمح بالنوافذ المنبثقة": "Allow pop-up windows",
  "موعد الإرجاع:": "Return deadline:",
  "رقم الأصل": "Asset number",
  "المعدة": "Equipment",
  "المقاس": "Size",
  "السعر": "Price",
  "الإجمالي:": "Total:"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  const inventory=document.querySelector('.hl-inventory');if(!inventory)return;
  const auth=()=>window.HydrolandAuth;
  const toast=document.getElementById('toast');const notify=m=>{if(!toast)return;uiLocale.setMessage(toast, m);toast.classList.add('visible');clearTimeout(window.__hlRentalToast);window.__hlRentalToast=setTimeout(()=>toast.classList.remove('visible'),2400)};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw localError('سجّل الدخول لإدارة التأجير');const response=await client(path,options);const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||uiLocale.format("تعذر تنفيذ الطلب ({0})", [response.status]));return body};
  const money=h=>uiLocale.format("{0} ر.س", [((Number(h)||0)/100).toFixed(2)]);const date=v=>v?new Date(v).toLocaleString('ar-SA'):'—';
  const panel=document.createElement('section');panel.className='hl-rentals';uiLocale.setHTML(panel, uiLocale.html`<div class="hl-inventory-section-head"><div><small>EQUIPMENT RENTALS</small><h3>تأجير المعدات والفواتير</h3><p>الدفع يؤكد الحجز فقط؛ صرف المعدات يتم من المستودع بمسح كل قطعة.</p></div><button type="button" id="hl-rental-new">فاتورة تأجير جديدة</button></div><div id="hl-rental-current" class="hl-rental-current"><p class="hl-inventory-empty">أنشئ فاتورة لبدء التأجير.</p></div>`);inventory.appendChild(panel);
  const dialog=document.createElement('dialog');dialog.className='hl-barcode-dialog';uiLocale.setHTML(dialog, uiLocale.html`<form method="dialog" class="hl-barcode-dialog-card"><header><div><small>RENTAL INVOICE</small><h3>فاتورة تأجير معدات</h3></div><button value="cancel">×</button></header><label>رقم حساب الغواص<input id="hl-renter-account" placeholder="Account ID"></label><label>رقم واتساب - اختياري<input id="hl-renter-phone" placeholder="9665xxxxxxxx"></label><label>موعد إرجاع المعدات<input id="hl-rental-due" type="datetime-local" required></label><label>أكواد المعدات<input id="hl-rental-codes" placeholder="HYD-... افصل بين القطع بفاصلة"></label><label>الأنواع<input id="hl-rental-types" placeholder="BCD, Wetsuit, Regulator"></label><label>المقاسات<input id="hl-rental-sizes" placeholder="M, L, 42"></label><label>الأسعار بالريال<input id="hl-rental-prices" placeholder="50, 35, 60"></label><div class="hl-dialog-actions"><button type="button" id="hl-rental-create">حجز وإنشاء الفاتورة</button></div></form>`);document.body.appendChild(dialog);
  let current=null;
  const render=rental=>{current=rental;const holder=panel.querySelector('#hl-rental-current');uiLocale.setHTML(holder, uiLocale.html`<article class="hl-rental-invoice"><header><div><small>INVOICE</small><h4>${esc(rental.invoiceNumber)}</h4></div><strong>${money(rental.totalHalala)}</strong></header><div class="hl-rental-status"><span>الحجز: ${esc(rental.status)}</span><span>الدفع: ${esc(rental.paymentStatus)}</span><span>الإرجاع: ${esc(date(rental.dueAt))}</span></div><div class="hl-rental-lines">${(rental.items||[]).map(item=>uiLocale.html`<div><b>${esc(item.equipmentNameSnapshot)}</b><span>${esc(item.assetCodeSnapshot)}</span><span>${esc(item.equipmentType||'—')}</span><span>المقاس: ${esc(item.size||'—')}</span><span>Serial: ${esc(item.serialNumberSnapshot||'—')}</span><strong>${money(item.unitPriceHalala)}</strong></div>`).join('')}</div><div class="hl-passport-actions"><button type="button" id="hl-rental-paid">تأكيد الدفع</button><button type="button" id="hl-rental-share-app">إرسال داخل التطبيق</button><button type="button" id="hl-rental-share-wa">تجهيز واتساب</button><button type="button" id="hl-rental-print">طباعة / PDF</button></div></article>`);holder.querySelector('#hl-rental-paid').disabled=rental.paymentStatus==='PAID';holder.querySelector('#hl-rental-paid').addEventListener('click',markPaid);holder.querySelector('#hl-rental-share-app').addEventListener('click',()=>share('IN_APP'));holder.querySelector('#hl-rental-share-wa').addEventListener('click',()=>share('WHATSAPP'));holder.querySelector('#hl-rental-print').addEventListener('click',printInvoice)};
  const create=async()=>{const split=id=>dialog.querySelector(id).value.split(',').map(v=>v.trim()).filter(Boolean),codes=split('#hl-rental-codes'),types=split('#hl-rental-types'),sizes=split('#hl-rental-sizes'),prices=split('#hl-rental-prices'),dueValue=dialog.querySelector('#hl-rental-due').value;if(!codes.length){notify(uiLocale.message('أدخل كود معدة واحدًا على الأقل'));return}if(!dueValue){notify(uiLocale.message('حدد موعد إرجاع المعدات'));return}const dueDate=new Date(dueValue);if(Number.isNaN(dueDate.getTime())||dueDate.getTime()<=Date.now()){notify(uiLocale.message('موعد الإرجاع يجب أن يكون في المستقبل'));return}try{const items=[];for(let i=0;i<codes.length;i++){const equipment=await request(`/trips/admin/equipment/lookup?code=${encodeURIComponent(codes[i])}`);items.push({resourceId:equipment.resourceId,equipmentType:types[i]||null,size:sizes[i]||null,unitPriceSar:Number(prices[i]||0)});}const rental=await request('/trips/equipment-rentals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({renterAccountId:dialog.querySelector('#hl-renter-account').value.trim(),whatsappPhone:dialog.querySelector('#hl-renter-phone').value.trim()||null,dueAt:dueDate.toISOString(),items})});dialog.close();render(rental);notify(uiLocale.message('تم إنشاء الحجز والفاتورة'))}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر إنشاء فاتورة التأجير'))}};
  const markPaid=async()=>{if(!current)return;try{const result=await request(`/trips/admin/equipment-rentals/${encodeURIComponent(current.id)}/payment-confirmation`,{method:'POST'});current={...current,paymentStatus:result.paymentStatus,status:result.status};render(current);notify(uiLocale.message('تم تأكيد الدفع؛ المعدات الآن بانتظار مسح التسليم في المستودع'))}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تأكيد الدفع'))}};
  const share=async channel=>{if(!current)return;try{const result=await request(`/trips/equipment-rentals/${encodeURIComponent(current.id)}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel})});notify((result.status==='PROVIDER_NOT_CONNECTED'?uiLocale.message('تم تجهيز مشاركة واتساب؛ مزود واتساب غير مربوط بعد'):uiLocale.message('تم إرسال الفاتورة داخل التطبيق')))}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر مشاركة الفاتورة'))}};
  const printInvoice=()=>{if(!current)return;const popup=window.open('','_blank','width=850,height=900');if(!popup){notify(uiLocale.message('اسمح بالنوافذ المنبثقة'));return}const rows=(current.items||[]).map(item=>uiLocale.html`<tr><td>${esc(item.assetCodeSnapshot)}</td><td>${esc(item.equipmentNameSnapshot)}</td><td>${esc(item.equipmentType||'—')}</td><td>${esc(item.size||'—')}</td><td>${esc(item.serialNumberSnapshot||'—')}</td><td>${money(item.unitPriceHalala)}</td></tr>`).join('');popup.document.write(uiLocale.html`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${esc(current.invoiceNumber)}</title><style>body{font-family:Arial;padding:28px;color:#122}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #ccc;padding:8px}.total{text-align:left;font-size:20px;font-weight:bold;margin-top:18px}</style></head><body><h1>HYDROLAND</h1><h2>فاتورة تأجير معدات</h2><p>${esc(current.invoiceNumber)}</p><p>موعد الإرجاع: ${esc(date(current.dueAt))}</p><table><thead><tr><th>رقم الأصل</th><th>المعدة</th><th>النوع</th><th>المقاس</th><th>Serial</th><th>السعر</th></tr></thead><tbody>${rows}</tbody></table><div class="total">الإجمالي: ${money(current.totalHalala)}</div><script>window.onload=()=>window.print()</script></body></html>`);popup.document.close()};
  panel.querySelector('#hl-rental-new').addEventListener('click',()=>{dialog.showModal();dialog.querySelector('#hl-renter-account').focus()});dialog.querySelector('#hl-rental-create').addEventListener('click',create);
})();
