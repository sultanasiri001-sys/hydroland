(()=>{
 const store=document.getElementById('store');if(!store)return;
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const toggle=document.createElement('button');toggle.type='button';toggle.hidden=true;toggle.dataset.storeManage='';toggle.textContent='إدارة عروض المركز';toggle.setAttribute('aria-expanded','false');
 store.querySelector('.section-heading').append(toggle);
 const panel=document.createElement('section');panel.className='hl-store-provider';panel.hidden=true;panel.setAttribute('aria-label','إدارة عروض المركز');store.querySelector('.section-heading').after(panel);
 const style=document.createElement('style');style.textContent='#store .section-heading{flex-wrap:wrap}.hl-store-provider{padding:1rem;border:1px solid #27c4df;border-radius:1rem;margin:1rem 0}.hl-store-provider form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:.8rem;padding:1rem 0}.hl-store-provider label{display:flex;flex-direction:column;gap:.35rem}.hl-store-provider input,.hl-store-provider textarea,.hl-store-provider select{width:100%;min-width:0;padding:.6rem;border:1px solid #6195ae;border-radius:.4rem;background:#08253a;color:#fff;font:inherit}.hl-store-provider button,.hl-store-provider summary{cursor:pointer;padding:.6rem}.hl-store-provider article{padding:1rem 0;border-top:1px solid #6195ae}.hl-store-provider [role=alert]{color:#ffd29a}';document.head.append(style);
 let version=0;
 const clear=()=>{version++;panel.replaceChildren();panel.hidden=true;toggle.hidden=!eligible();toggle.setAttribute('aria-expanded','false')};
 const live=(v,session)=>v===version&&eligible()&&session===auth()?.getSessionVersion?.()&&!panel.hidden;
 const authorize=async(v,session)=>{
   if(!live(v,session))return false;
   const ok=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>live(v,session)});
   if(!ok||!live(v,session)){if(v===version)clear();return false}return true;
 };
 const request=async(path,options={})=>{const response=await auth().authorizedFetch(path,options),data=await response.json().catch(()=>null);if(!response.ok)throw new Error(Array.isArray(data?.message)?data.message.join('، '):data?.message||'تعذر تنفيذ الإجراء.');return data};
 const time=value=>value?new Date(new Date(value).getTime()+3*3600000).toISOString().slice(0,16):'';
 const input=(name,label,value='',attrs='')=>`<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
 function editor(type,row=null){
   const course=type==='courses',title=course?'دورة':'سلعة أو خدمة';
   const fields=course?
     input('title','عنوان الدورة',row?.title,'required maxlength="240"')+input('courseCode','رمز البرنامج التدريبي',row?.courseCode,'required maxlength="80"')+input('locationName','الموقع',row?.locationName,'required maxlength="240"')+input('startsAt','البداية — توقيت الرياض',time(row?.startsAt),'type="datetime-local" required')+input('endsAt','النهاية — توقيت الرياض',time(row?.endsAt),'type="datetime-local" required')+input('capacity','عدد المقاعد',row?.capacity,'type="number" min="1" max="2147483647" step="1" required'):
     input('nameAr','اسم العرض',row?.nameAr,'required maxlength="240"')+input('sku','رمز العرض الفريد',row?.sku,'required maxlength="80"')+`<label>نوع العرض<select name="kind"><option value="GOODS">سلعة</option><option value="SERVICE" ${row?.kind==='SERVICE'?'selected':''}>خدمة</option></select></label>`+input('stockQuantity','المخزون أو عدد وحدات الخدمة المتاحة',row?.stockQuantity,'type="number" min="0" max="2147483647" step="1" required');
   return `<details><summary>${row?'تعديل العرض':'إضافة '+title}</summary><form data-offer-form data-type="${type}" data-id="${esc(row?.id||'')}" data-revision="${esc(row?.updatedAt||'')}" data-request-id="${row?'':crypto.randomUUID()}">${fields}${input('price','السعر بالريال',row?(row.priceMinor/100).toFixed(2):'','type="number" min="0" max="21474836.47" step="0.01" required')}<label>الوصف وشروط العرض<textarea name="description" maxlength="4000">${esc(row?.description||'')}</textarea></label><label>حالة العرض<select name="status">${[['DRAFT','مسودة'],['ACTIVE','منشور'],['INACTIVE','متوقف']].map(([value,label])=>`<option value="${value}" ${row?.status===value?'selected':''}>${label}</option>`).join('')}</select></label><button type="submit">حفظ العرض</button><p data-offer-feedback role="status"></p></form></details>`;
 }
 function rowHtml(type,row){
   const used=type==='courses'?row._count?.enrollments:row._count?.items;
   return `<article data-managed-offer="${esc(row.id)}" data-type="${type}" data-revision="${esc(row.updatedAt)}"><h4>${esc(row.title||row.nameAr)}</h4><p>${esc(({DRAFT:'مسودة',ACTIVE:'منشور',INACTIVE:'متوقف'})[row.status]||row.status)} · ${type==='courses'?'دورة':row.kind==='SERVICE'?'خدمة':'سلعة'}</p>${editor(type,row)}<button type="button" data-offer-status="${row.status==='ACTIVE'?'INACTIVE':'ACTIVE'}">${row.status==='ACTIVE'?'إيقاف العرض':'نشر العرض'}</button>${row.status!=='ACTIVE'&&!used?'<button type="button" data-offer-delete>حذف العرض</button>':'<small>أوقف العرض لإزالته من المتجر. تُحفظ العروض المرتبطة بطلبات أو تسجيلات.</small>'}<p data-offer-action-feedback role="status"></p></article>`;
 }
 async function open(notice=''){
   if(!eligible()){clear();return}
   panel.hidden=false;toggle.setAttribute('aria-expanded','true');const v=++version,session=auth().getSessionVersion?.();panel.innerHTML='<p>جارٍ تحميل عروض المركز...</p>';
   try{
     if(!(await authorize(v,session)))return;
     const data=await request('/store/provider/catalog');if(!live(v,session))return;
     if(!data?.organization||!Array.isArray(data.products)||!Array.isArray(data.courses))throw new Error('استجابة العروض غير مكتملة.');
     panel.innerHTML=`<h3>عروض ${esc(data.organization.displayName)}</h3><p>العروض المنشورة تظهر في المتجر للجميع. إيقاف العرض يمنع الطلبات الجديدة ويحفظ الطلبات والتسجيلات السابقة.</p>${notice?`<p role="status">${esc(notice)}</p>`:''}<button type="button" data-offer-refresh>تحديث العروض</button><button type="button" data-offer-trips>إدارة الرحلات والحجوزات</button>${editor('products')}${editor('courses')}<div data-managed-offers>${data.products.map(row=>rowHtml('products',row)).join('')}${data.courses.map(row=>rowHtml('courses',row)).join('')}${!data.products.length&&!data.courses.length?'<p>لا توجد عروض للمركز بعد.</p>':''}</div>`;
   }catch(error){if(live(v,session))panel.innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-offer-refresh>إعادة المحاولة</button>`}
 }
 async function save(form){
   if(form.dataset.busy)return;
   const values=Object.fromEntries(new FormData(form)),feedback=form.querySelector('[data-offer-feedback]');let body;
   try{
     if(!/^\d+(\.\d{1,2})?$/.test(values.price))throw new Error('أدخل السعر بمنزلتين عشريتين كحد أقصى.');
     const [whole,fraction='']=values.price.split('.'),priceMinor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
     body={description:values.description,priceMinor,status:values.status,...(form.dataset.id?{expectedUpdatedAt:form.dataset.revision}:{requestId:form.dataset.requestId})};
     if(form.dataset.type==='courses')Object.assign(body,{title:values.title,courseCode:values.courseCode,locationName:values.locationName,startsAt:new Date(values.startsAt+':00+03:00').toISOString(),endsAt:new Date(values.endsAt+':00+03:00').toISOString(),capacity:Number(values.capacity)});
     else Object.assign(body,{nameAr:values.nameAr,sku:values.sku,kind:values.kind,stockQuantity:Number(values.stockQuantity)});
   }catch(error){feedback.textContent=error.message||'تحقق من بيانات العرض.';return}
   const v=version,session=auth()?.getSessionVersion?.(),button=form.querySelector('[type=submit]');form.dataset.busy='true';button.disabled=true;feedback.textContent='جارٍ حفظ العرض...';
   try{
     if(!(await authorize(v,session)))return;
     await request('/store/provider/'+form.dataset.type+(form.dataset.id?'/'+encodeURIComponent(form.dataset.id):''),{method:form.dataset.id?'PATCH':'POST',body:JSON.stringify(body)});
     if(!live(v,session))return;
     void window.HydrolandStore?.reloadProducts?.();await open('تم حفظ العرض.');
   }catch(error){if(live(v,session))feedback.textContent=error.message}
   finally{delete form.dataset.busy;button.disabled=false}
 }
 async function act(button){
   const row=button.closest('[data-managed-offer]');if(!row||button.disabled)return;
   const remove=button.hasAttribute('data-offer-delete'),status=button.dataset.offerStatus;
   if(!window.confirm(remove?'حذف هذا العرض نهائيًا؟':'تغيير حالة العرض؟ تبقى الطلبات والتسجيلات السابقة محفوظة.'))return;
   const v=version,session=auth()?.getSessionVersion?.(),feedback=row.querySelector('[data-offer-action-feedback]');button.disabled=true;
   try{
     if(!(await authorize(v,session)))return;
     await request('/store/provider/'+row.dataset.type+'/'+encodeURIComponent(row.dataset.managedOffer)+(remove?'':'/status'),{method:remove?'DELETE':'PATCH',body:JSON.stringify({expectedUpdatedAt:row.dataset.revision,...(!remove?{status}:{})})});
     if(!live(v,session))return;
     void window.HydrolandStore?.reloadProducts?.();await open(remove?'تم حذف العرض.':'تم تحديث حالة العرض.');
   }catch(error){if(live(v,session))feedback.textContent=error.message}
   finally{button.disabled=false}
 }
 toggle.addEventListener('click',()=>panel.hidden?void open():clear());
 panel.addEventListener('submit',event=>{const form=event.target.closest('[data-offer-form]');if(form){event.preventDefault();void save(form)}});
 panel.addEventListener('click',event=>{if(event.target.closest('[data-offer-refresh]'))void open();else if(event.target.closest('[data-offer-trips]'))void window.HydrolandCenterOperations?.open?.();else{const button=event.target.closest('[data-offer-status],[data-offer-delete]');if(button)void act(button)}});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{toggle.hidden=!eligible();if(!eligible())clear()});
 toggle.hidden=!eligible();window.HydrolandStoreProvider=Object.freeze({open});
})();
