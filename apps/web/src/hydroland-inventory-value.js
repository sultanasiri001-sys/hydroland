(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("inventory-value", {
  "تعذر تنفيذ الطلب ({0})": "Could not complete the request ({0})",
  "معدة": "Equipment",
  "سجّل الدخول لإدارة المخزون": "Sign in to manage inventory",
  "قيمة الأصل": "Asset value",
  "قيمة شراء المعدة": "Equipment purchase value",
  "إغلاق": "Close",
  "اختر معدة من سجل المخزون أولًا.": "Choose equipment from the inventory first.",
  "القيمة بالريال السعودي": "Value in Saudi riyals",
  "مثال: 2500.00": "Example: 2500.00",
  "حفظ القيمة": "Save value",
  "لم يتم": "Not completed",
  "اختر معدة أولًا": "Choose equipment first",
  "تعذر فتح قيمة الأصل": "Could not open asset value",
  "أدخل قيمة صحيحة": "Enter a valid value",
  "تم حفظ قيمة الأصل": "Asset value saved",
  "تعذر حفظ القيمة": "Could not save the value"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  const passport=document.querySelector('.hl-passport');if(!passport)return;
  const actions=passport.querySelector('.hl-passport-actions');if(!actions)return;
  const auth=()=>window.HydrolandAuth;
  const toast=document.getElementById('toast');const notify=m=>{if(!toast)return;uiLocale.setMessage(toast, m);toast.classList.add('visible');clearTimeout(window.__hlValueToast);window.__hlValueToast=setTimeout(()=>toast.classList.remove('visible'),2200)};
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw localError('سجّل الدخول لإدارة المخزون');const response=await client(path,options);const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||uiLocale.format("تعذر تنفيذ الطلب ({0})", [response.status]));return body};
  const button=document.createElement('button');button.type='button';uiLocale.setMessage(button, uiLocale.message('قيمة الأصل'));actions.prepend(button);
  const dialog=document.createElement('dialog');dialog.className='hl-barcode-dialog';uiLocale.setHTML(dialog, uiLocale.html`<form method="dialog" class="hl-barcode-dialog-card"><header><div><small>ASSET VALUE</small><h3>قيمة شراء المعدة</h3></div><button value="cancel" aria-label="إغلاق">×</button></header><p id="hl-value-item">اختر معدة من سجل المخزون أولًا.</p><label>القيمة بالريال السعودي<input id="hl-value-sar" type="number" min="0" step="0.01" placeholder="مثال: 2500.00"></label><div class="hl-dialog-actions"><button type="button" id="hl-value-save">حفظ القيمة</button></div></form>`);document.body.appendChild(dialog);
  let detail=null;
  button.addEventListener('click',async()=>{const asset=document.querySelector('#hl-passport-asset')?.textContent?.trim();if(!asset||asset==='—'||asset.includes('لم يتم')){notify(uiLocale.message('اختر معدة أولًا'));return}try{detail=await request(`/trips/admin/equipment/lookup?code=${encodeURIComponent(asset)}`);dialog.querySelector('#hl-value-item').textContent=`${detail.assetCode} · ${detail.resourceName||uiLocale.t('معدة')}`;dialog.querySelector('#hl-value-sar').value=detail.acquisitionCostHalala==null?'':String(Number(detail.acquisitionCostHalala)/100);dialog.showModal()}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر فتح قيمة الأصل'))}});
  dialog.querySelector('#hl-value-save').addEventListener('click',async()=>{if(!detail)return;const raw=dialog.querySelector('#hl-value-sar').value,value=raw===''?null:Number(raw);if(value!==null&&(!Number.isFinite(value)||value<0)){notify(uiLocale.message('أدخل قيمة صحيحة'));return}try{await request(`/trips/admin/equipment/${encodeURIComponent(detail.resourceId)}/code`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({acquisitionCostSar:value})});dialog.close();notify(uiLocale.message('تم حفظ قيمة الأصل'));document.dispatchEvent(new CustomEvent('hydroland:inventory-value-updated',{detail:{resourceId:detail.resourceId}}))}catch(error){notify(localErrorMessage((error instanceof Error?error:undefined), 'تعذر حفظ القيمة'))}});
})();
