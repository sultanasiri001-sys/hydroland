(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("service-images", {
  "الرحلة": "Trip",
  "الدورة": "Course",
  "العرض أو المعدة": "Offer or equipment",
  "المعدة": "Equipment",
  "صورة ": "Image for ",
  " — إضافة أو استبدال أو حذف": " — add, replace or delete",
  "تعذر حفظ الصورة.": "Could not save the image.",
  " الحالية": " current image",
  "اختر صورة JPEG أو PNG أو WebP، بحد أقصى 5 ميجابايت. تُحفظ الصورة عند اختيارها.": "Choose a JPEG, PNG or WebP image up to 5 MB. It is saved when selected.",
  "استبدال الصورة": "Replace image",
  "إضافة صورة": "Add image",
  "حذف الصورة": "Delete image",
  "تحديث الصورة": "Refresh image",
  "حذف صورة ": "Delete the image for ",
  "؟ تبقى بيانات الخدمة محفوظة.": "? Service details will remain saved.",
  "اختر صورة JPEG أو PNG أو WebP بحجم لا يتجاوز 5 ميجابايت.": "Choose a JPEG, PNG or WebP image no larger than 5 MB.",
  "جارٍ حفظ الصورة...": "Saving image...",
  "تعذر قراءة الملف.": "Could not read the file.",
  "تم حذف الصورة.": "Image deleted.",
  "تم حفظ الصورة.": "Image saved.",
  "جارٍ تحميل الصورة...": "Loading image...",
  "إعادة المحاولة": "Retry",
  "صورة {0}": "Image for {0}",
  "صورة {0} — إضافة أو استبدال أو حذف": "Image for {0} — add, replace or delete",
  "صورة {0} الحالية": "Current image for {0}",
  "صورة": "Image for",
  "— إضافة أو استبدال أو حذف": "— add, replace or delete",
  "الحالية": "current image",
  "حذف صورة": "Delete the image for"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const labels={trip:'الرحلة',course:'الدورة',product:'العرض أو المعدة',equipment:'المعدة'};
 const path=(kind,id)=>'/service-images/'+encodeURIComponent(kind)+'/'+encodeURIComponent(id);
 const publicUrl=(kind,id)=>(auth()?.apiBase||window.HYDROLAND_API_BASE||'https://hydroland.onrender.com/api/v1')+path(kind,id)+'/content';
 const style=document.createElement('style');style.textContent='.hl-image-editor{margin:1rem 0;padding:.8rem;border:1px solid #6195ae;border-radius:.6rem}.hl-image-editor summary{cursor:pointer}.hl-image-editor img{display:block;max-width:100%;width:280px;max-height:220px;object-fit:contain;margin:.8rem 0}.hl-image-editor input{max-width:100%;margin:.5rem 0}.hl-image-editor button{margin:.4rem}.hl-service-image-host{position:relative;overflow:hidden}.hl-service-image-host>img.hl-service-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2}.hl-service-image-host.hl-has-service-image>*:not(.hl-service-image){visibility:hidden}.hl-service-image-host.hl-has-service-image::before,.hl-service-image-host.hl-has-service-image::after{display:none!important}.hl-service-image[hidden]{display:none!important}';document.head.append(style);
 const editors=new Set(),publicImages=new Set(),seen=new WeakSet();
 function showPublic(host,kind,id,title){
  if(!host||!id)return;
  host.classList.add('hl-service-image-host');const img=document.createElement('img');img.className='hl-service-image';uiLocale.setAttribute(img, "alt", ...["صورة {0}", [title||uiLocale.message(labels[kind])]]);img.decoding='async';img.hidden=true;
  img.addEventListener('load',()=>{img.hidden=false;host.classList.add('hl-has-service-image');host.removeAttribute('aria-hidden');host.removeAttribute('role');host.removeAttribute('aria-label')});
  img.addEventListener('error',()=>{img.hidden=true;host.classList.remove('hl-has-service-image')});
  img.src=publicUrl(kind,id);host.append(img);publicImages.add({host,img,kind,id});
 }
 function refresh(kind,id){for(const item of publicImages){if(!item.host.isConnected){publicImages.delete(item);continue}if(item.kind===kind&&item.id===id){item.img.hidden=true;item.host.classList.remove('hl-has-service-image');item.img.src=publicUrl(kind,id)+'?v='+Date.now()}}}
 function editor(host,kind,id){
  const box=document.createElement('details');box.className='hl-image-editor';box.dataset.serviceImageEditor=kind;
  const summary=document.createElement('summary');uiLocale.setText(summary, ...["صورة {0} — إضافة أو استبدال أو حذف", [uiLocale.message(labels[kind])]]);box.append(summary);
  const area=document.createElement('div');box.append(area);host.append(box);
  let loaded=false,busy=false,revision=null,session=null,generation=0;
  const live=token=>token===generation&&box.isConnected&&eligible()&&session===auth()?.getSessionVersion?.();
  const authorize=async token=>{if(!live(token))return false;const ok=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>live(token)});if(!ok||!live(token)){if(token===generation){generation++;loaded=false;area.replaceChildren();box.open=false;access()?.clearProtectedPortal?.()}return false}return true};
  const request=async(options={})=>{const response=await auth().authorizedFetch(path(kind,id),options),data=await response.json().catch(()=>null);if(!response.ok){if([401,403].includes(response.status))access()?.clearProtectedPortal?.();throw localError(data?.message||uiLocale.message('تعذر حفظ الصورة.'));}return data};
  function render(data){
   revision=data.revision;area.replaceChildren();
   const preview=document.createElement('img');uiLocale.setAttribute(preview, "alt", ...["صورة {0} الحالية", [uiLocale.message(labels[kind])]]);preview.hidden=!data.image;if(data.image)preview.src=data.image;area.append(preview);
   const help=document.createElement('p');uiLocale.setText(help, ...['اختر صورة JPEG أو PNG أو WebP، بحد أقصى 5 ميجابايت. تُحفظ الصورة عند اختيارها.']);area.append(help);
   const label=document.createElement('label');uiLocale.setText(label, ...[data.image?'استبدال الصورة':'إضافة صورة']);const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';label.append(input);area.append(label);
   const remove=document.createElement('button');remove.type='button';uiLocale.setText(remove, ...['حذف الصورة']);remove.hidden=!data.image;area.append(remove);
   const reload=document.createElement('button');reload.type='button';uiLocale.setText(reload, ...['تحديث الصورة']);area.append(reload);
   const feedback=document.createElement('p');feedback.setAttribute('role','status');area.append(feedback);
   async function change(file,deleting=false){
    if(busy)return;if(deleting&&!window.confirm(uiLocale.t('حذف صورة ')+uiLocale.t(labels[kind])+uiLocale.t('؟ تبقى بيانات الخدمة محفوظة.')))return;
    if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5_000_000||!file.size)){uiLocale.setText(feedback, ...['اختر صورة JPEG أو PNG أو WebP بحجم لا يتجاوز 5 ميجابايت.']);input.value='';return}
    busy=true;input.disabled=remove.disabled=reload.disabled=true;uiLocale.setText(feedback, ...['جارٍ حفظ الصورة...']);const token=generation;
    try{
     if(!(await authorize(token)))return;
     const body={expectedRevision:revision};
     if(file){body.base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(localError(uiLocale.message('تعذر قراءة الملف.')));reader.readAsDataURL(file)});}
     if(!live(token))return;
     const data=await request({method:deleting?'DELETE':'PUT',body:JSON.stringify(body)});if(!live(token))return;
     render(data);uiLocale.setText(area.querySelector('[role=status]'), ...[deleting?'تم حذف الصورة.':'تم حفظ الصورة.']);refresh(kind,id);
    }catch(error){if(live(token))uiLocale.setMessage(feedback, localErrorMessage(error))}
    finally{busy=false;input.value='';input.disabled=remove.disabled=reload.disabled=false}
   }
   input.addEventListener('change',()=>{if(input.files?.[0])void change(input.files[0])});remove.addEventListener('click',()=>void change(null,true));reload.addEventListener('click',()=>void load());
  }
  async function load(){
   if(busy||!eligible())return;loaded=false;session=auth()?.getSessionVersion?.();const token=++generation;uiLocale.setText(area, ...['جارٍ تحميل الصورة...']);
   try{if(!(await authorize(token)))return;const data=await request();if(!live(token))return;render(data);loaded=true}
   catch(error){if(live(token)){uiLocale.setMessage(area, localErrorMessage(error));const retry=document.createElement('button');retry.type='button';uiLocale.setText(retry, ...['إعادة المحاولة']);retry.onclick=()=>void load();area.append(retry)}}
  }
  box.addEventListener('toggle',()=>{if(box.open&&!loaded)void load()});
  const state={box,clear:()=>{generation++;loaded=false;session=null;area.replaceChildren();box.open=false;}};editors.add(state);
 }
 const selector='[data-managed-offer],[data-center-trip],[data-center-equipment-id],[data-public-product],[data-store-trip],[data-store-course],[data-public-trip]';
 function scan(root){
  if(!(root instanceof Element))return;const nodes=[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const node of nodes){if(seen.has(node))continue;seen.add(node);
   if(node.dataset.managedOffer)editor(node,node.dataset.type==='courses'?'course':'product',node.dataset.managedOffer);
   else if(node.dataset.centerTrip)editor(node,'trip',node.dataset.centerTrip);
   else if(node.dataset.centerEquipmentId)editor(node,'equipment',node.dataset.centerEquipmentId);
   else{const kind=node.hasAttribute('data-store-course')?'course':node.hasAttribute('data-public-product')?'product':'trip';const id=node.dataset.storeCourse||node.dataset.publicProduct||node.dataset.storeTrip||node.querySelector('[data-trip-id]')?.dataset.tripId;showPublic(node.querySelector('.product-art,.trip-image'),kind,id,node.querySelector('h3,h4')?.textContent)}
  }
 }
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node);for(const item of publicImages)if(!item.host.isConnected)publicImages.delete(item);for(const item of editors)if(!item.box.isConnected){item.clear();editors.delete(item)}}).observe(document.body,{childList:true,subtree:true});scan(document.body);
 for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(event,()=>{for(const item of editors)item.clear()});
 window.HydrolandServiceImages=Object.freeze({showPublic});
})();
