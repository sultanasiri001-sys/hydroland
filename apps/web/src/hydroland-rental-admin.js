(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("rental-admin", {
  "تعذر تنفيذ الطلب ({0})": "Could not complete the request ({0})",
  "نشط": "Active",
  "سجّل الدخول لإدارة التأجير": "Sign in to manage rentals",
  "تحديث": "Refresh",
  "· المتبقي": "· Remaining",
  "تأجير وإرجاع المعدات": "Equipment rentals and returns",
  "الدفع ثم التسليم المتتابع بالباركود، متابعة التأخير والتمديد، ثم الاستلام وإغلاق الإيجار.": "Payment, sequential barcode handover, overdue and extension follow-up, then return receipt and rental closure.",
  "جاهز للتسليم": "Ready for handover",
  "متأخر": "Overdue",
  "طلبات تمديد": "Extension requests",
  "بانتظار الإرجاع": "Awaiting return",
  "تسليم المعدات": "Equipment handover",
  "المطلوب": "Required",
  "· تم": "· Completed",
  "امسح Barcode / QR ثم Enter": "Scan barcode / QR, then press Enter",
  "تسليم القطعة": "Hand over item",
  "الغواص:": "Diver:",
  "موعد الإرجاع": "Return deadline",
  "التسليم": "Handover",
  "المتبقي للإرجاع": "Remaining to return",
  "نية الإرجاع": "Return intent",
  "نعم": "Yes",
  "لا": "No",
  "لا توجد معدات": "No equipment",
  "طلب تمديد حتى": "Extension requested until",
  "موافقة": "Approve",
  "رفض": "Reject",
  "امسح Barcode / QR": "Scan barcode / QR",
  "سليمة": "Undamaged",
  "تحتاج مراجعة": "Needs review",
  "تالفة": "Damaged",
  "موقع الإرجاع": "Return location",
  "استلام القطعة": "Receive item",
  "لا توجد إيجارات تشغيلية حاليًا.": "No operational rentals right now.",
  "تعذر تحميل التأجير": "Could not load rentals",
  "تم اعتماد التمديد": "Extension approved",
  "تم رفض التمديد": "Extension rejected",
  "تعذر تحديث الطلب": "Could not update the request",
  "امسح باركود المعدة أولًا": "Scan the equipment barcode first",
  "هذه القطعة مسلّمة مسبقًا": "This item has already been handed over",
  "اكتمل تسليم جميع المعدات وتفعّل الإيجار": "All equipment handed over and the rental activated",
  "تم تسليم القطعة": "Item handed over",
  "تعذر تسليم المعدة": "Could not hand over the equipment",
  "تم استلام المعدة وتحديث المخزون": "Equipment received and inventory updated",
  "تعذر استلام المعدة": "Could not receive the equipment"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  const inventory=document.querySelector('.hl-inventory');if(!inventory)return;
  const auth=()=>window.HydrolandAuth;
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw localError('سجّل الدخول لإدارة التأجير');const response=await client(path,options);const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||uiLocale.format("تعذر تنفيذ الطلب ({0})", [response.status]));return body};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('ar-SA'):'—';
  const panel=document.createElement('section');panel.className='hl-rental-admin';uiLocale.setHTML(panel, uiLocale.html`<div class="hl-inventory-section-head"><div><small>RENTAL OPERATIONS</small><h3>تأجير وإرجاع المعدات</h3><p>الدفع ثم التسليم المتتابع بالباركود، متابعة التأخير والتمديد، ثم الاستلام وإغلاق الإيجار.</p></div><button type="button" id="hl-rental-refresh">تحديث</button></div><div class="hl-rental-admin-metrics"><article><small>نشط</small><b id="hl-ra-active">0</b></article><article><small>جاهز للتسليم</small><b id="hl-ra-handover">0</b></article><article><small>متأخر</small><b id="hl-ra-overdue">0</b></article><article><small>طلبات تمديد</small><b id="hl-ra-extension">0</b></article><article><small>بانتظار الإرجاع</small><b id="hl-ra-return">0</b></article></div><div id="hl-rental-admin-list"></div>`);inventory.appendChild(panel);
  const notify=m=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, m);t.classList.add('visible');clearTimeout(window.__hlRaToast);window.__hlRaToast=setTimeout(()=>t.classList.remove('visible'),2200)};
  const render=rows=>{const active=rows.filter(r=>r.status==='ACTIVE').length,handover=rows.filter(r=>r.paymentStatus==='PAID'&&r.status==='RESERVED').length,overdue=rows.filter(r=>r.overdue).length,extension=rows.filter(r=>r.extensionStatus==='PENDING').length,returns=rows.filter(r=>r.returnIntentAt&&r.status==='ACTIVE').length;panel.querySelector('#hl-ra-active').textContent=active;panel.querySelector('#hl-ra-handover').textContent=handover;panel.querySelector('#hl-ra-overdue').textContent=overdue;panel.querySelector('#hl-ra-extension').textContent=extension;panel.querySelector('#hl-ra-return').textContent=returns;const list=panel.querySelector('#hl-rental-admin-list');uiLocale.setHTML(list, rows.map(r=>{const all=r.items||[],handed=all.filter(i=>i.handedOverAt).length,pending=Math.max(0,all.length-handed),items=all.map(i=>uiLocale.html`<small>${uiLocale.messageHTML((i.handedOverAt?'✓':'○'))} ${esc(i.assetCodeSnapshot)} · ${esc(i.equipmentNameSnapshot)} · ${esc(i.size||'—')}</small>`).join('');const handoverUi=r.paymentStatus==='PAID'&&r.status==='RESERVED'?uiLocale.html`<div class="hl-rental-handover"><div><b>تسليم المعدات</b><small>المطلوب ${all.length} · تم ${handed} · المتبقي ${pending}</small></div><input data-handover-code autocomplete="off" inputmode="none" placeholder="امسح Barcode / QR ثم Enter"><button data-handover-scan>تسليم القطعة</button></div>`:'';return uiLocale.html`<article class="hl-rental-admin-card" data-rental-id="${esc(r.id)}"><div class="hl-rental-admin-head"><div><b>${esc(r.invoiceNumber)}</b><small>الغواص: ${esc(r.renterAccountId)}</small></div><span class="${r.overdue?'overdue':''}">${(r.overdue?uiLocale.messageHTML(uiLocale.message('متأخر')):(r.paymentStatus==='PAID'&&r.status==='RESERVED'?uiLocale.messageHTML(uiLocale.message('جاهز للتسليم')):esc(r.status)))}</span></div><div class="hl-rental-admin-grid"><div><small>موعد الإرجاع</small><b>${esc(fmt(r.dueAt))}</b></div><div><small>التسليم</small><b>${handed}/${all.length}</b></div><div><small>المتبقي للإرجاع</small><b>${esc(r.pendingReturnCount||0)}</b></div><div><small>نية الإرجاع</small><b>${uiLocale.messageHTML((r.returnIntentAt?uiLocale.message('نعم'):uiLocale.message('لا')))}</b></div></div><div class="hl-rental-admin-items">${items||uiLocale.html`<small>لا توجد معدات</small>`}</div>${handoverUi}${(r.extensionStatus==='PENDING'?uiLocale.html`<div class="hl-rental-extension"><small>طلب تمديد حتى ${esc(fmt(r.extensionRequestedUntil))}</small><button data-ext="APPROVED">موافقة</button><button data-ext="REJECTED">رفض</button></div>`:'')}${(r.status==='ACTIVE'?uiLocale.html`<div class="hl-rental-return"><input data-return-code autocomplete="off" placeholder="امسح Barcode / QR"><select data-return-condition><option value="OK">سليمة</option><option value="REVIEW">تحتاج مراجعة</option><option value="DAMAGED">تالفة</option></select><input data-return-location placeholder="موقع الإرجاع"><button data-return-scan>استلام القطعة</button></div>`:'')}</article>`}).join('')||uiLocale.html`<p class="hl-inventory-empty">لا توجد إيجارات تشغيلية حاليًا.</p>`);bindCards()};
  const load=async()=>{if(!auth()?.isAuthenticated?.()){render([]);return}try{render(await request('/trips/admin/equipment-rentals'))}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تحميل التأجير'))}};
  const bindCards=()=>{panel.querySelectorAll('[data-rental-id]').forEach(card=>{const id=card.dataset.rentalId;card.querySelectorAll('[data-ext]').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await request(`/trips/equipment-rentals/${encodeURIComponent(id)}/extension-review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:btn.dataset.ext})});notify((btn.dataset.ext==='APPROVED'?uiLocale.message('تم اعتماد التمديد'):uiLocale.message('تم رفض التمديد')));await load()}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تحديث الطلب'))}finally{btn.disabled=false}}));const handoverBtn=card.querySelector('[data-handover-scan]'),handoverInput=card.querySelector('[data-handover-code]');const handover=async()=>{const code=handoverInput?.value.trim();if(!code){notify(uiLocale.message('امسح باركود المعدة أولًا'));handoverInput?.focus();return}handoverBtn.disabled=true;try{const result=await request(`/trips/admin/equipment-rentals/${encodeURIComponent(id)}/handover-scan`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});notify((result.result==='ALREADY_HANDED_OVER'?uiLocale.message('هذه القطعة مسلّمة مسبقًا'):(result.pendingHandoverCount===0?uiLocale.message('اكتمل تسليم جميع المعدات وتفعّل الإيجار'):uiLocale.message('تم تسليم القطعة'))));await load();setTimeout(()=>panel.querySelector(`[data-rental-id="${CSS.escape(id)}"] [data-handover-code]`)?.focus(),50)}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تسليم المعدة'));handoverInput?.select()}finally{handoverBtn.disabled=false}};handoverBtn?.addEventListener('click',handover);handoverInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handover()}});const scanBtn=card.querySelector('[data-return-scan]');scanBtn?.addEventListener('click',async()=>{const code=card.querySelector('[data-return-code]').value.trim(),condition=card.querySelector('[data-return-condition]').value,toLocation=card.querySelector('[data-return-location]').value.trim()||null;if(!code){notify(uiLocale.message('امسح باركود المعدة أولًا'));return}scanBtn.disabled=true;try{await request(`/trips/equipment-rentals/${encodeURIComponent(id)}/return-scan`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,condition,toLocation})});notify(uiLocale.message('تم استلام المعدة وتحديث المخزون'));await load()}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر استلام المعدة'))}finally{scanBtn.disabled=false}});card.querySelector('[data-return-code]')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();scanBtn?.click()}})})};
  panel.querySelector('#hl-rental-refresh').addEventListener('click',load);document.addEventListener('hydroland:auth-changed',load);load();
})();