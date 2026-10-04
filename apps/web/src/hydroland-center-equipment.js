(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');
   host.className='hl-center-equipment';host.id='hl-center-equipment';host.hidden=true;
   host.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>المعدات والمخزون</h2><p>الأصول المنسوبة للمركز وحالتها التشغيلية فقط.</p></div></header><form data-equipment-lookup><input name="code" required autocomplete="off" placeholder="QR / Barcode / Asset / Serial"><button>بحث</button><button type="button" data-center-equipment-retry>عرض جميع المعدات</button></form><div data-center-equipment aria-live="polite"></div>';
   // Every recreated workspace owns its listeners; never bind only the first instance.
   host.querySelector('[data-equipment-lookup]').addEventListener('submit',lookup);
   host.addEventListener('click',onClick);
   section=host;document.getElementById('main')?.append(host);return host;
 }
 const statuses={AVAILABLE:'متاحة',CHECKED_OUT:'معارة / خارج المستودع',MAINTENANCE:'تحت الصيانة',QUARANTINED:'محجوزة للفحص',RETIRED:'مستبعدة من الخدمة'};
 const movements={CHECK_IN:'إرجاع',CHECK_OUT:'إعارة / خروج',TRANSFER:'نقل',MAINTENANCE:'صيانة',QUARANTINE:'حجز للفحص',RELEASE:'إتاحة',RETIRE:'استبعاد من الخدمة'};
 const date=value=>{const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(parsed):'غير مسجل'};
 const actions=row=>row.active===false||row.stockStatus==='RETIRED'?[]:row.stockStatus==='AVAILABLE'?['CHECK_OUT','MAINTENANCE','QUARANTINE']:row.stockStatus==='CHECKED_OUT'?['CHECK_IN','MAINTENANCE','QUARANTINE']:['MAINTENANCE','QUARANTINED'].includes(row.stockStatus)?['RELEASE']:[];
 const card=row=>`<article class="hl-course" data-center-equipment-id="${esc(row.resourceId)}"><div class="hl-course-top"><div><b>${esc(row.resourceName||'معدة')}</b><small>${esc(row.assetCode||'—')}${row.serialNumber?' · الرقم التسلسلي: '+esc(row.serialNumber):''}</small></div><span>${esc(statuses[row.stockStatus]||'حالة غير معروفة')}${row.active===false?' · غير مفعلة':''}</span></div><small>الموقع: ${esc(row.location||'غير محدد')} · رمز الصنف: ${esc(row.sku||'—')}</small><div class="hl-member-actions">${actions(row).map(type=>`<button type="button" data-move="${type}">${movements[type]}</button>`).join('')}</div><div data-equipment-error></div><button type="button" data-equipment-history-button>سجل الحركة</button><div data-equipment-history></div></article>`;
 async function authorize(host,version,session){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
   const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
 }
 async function open(){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-equipment]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل معدات المركز...</p>';
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/equipment'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية إدارة معدات هذا المركز.':rows?.message||'تعذر تحميل المعدات');
     if(!Array.isArray(rows))throw new Error('استجابة معدات المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=rows.length?rows.map(card).join(''):'<p>لا توجد معدات منسوبة لهذا المركز حاليًا.</p>';
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل المعدات')}</p><button type="button" data-center-equipment-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function lookup(event){
   event.preventDefault();
   // currentTarget is reset after event dispatch, so capture form data before awaiting.
   const form=event.currentTarget,host=form.closest('#hl-center-equipment');
   const code=String(new FormData(form).get('code')||'').trim();if(!code||!host||!eligible())return;
   const version=++viewVersion,session=auth().getSessionVersion?.(),list=host.querySelector('[data-center-equipment]');
   if(!(await authorize(host,version,session)))return;
   list.setAttribute('aria-busy','true');
   try{
     const response=await auth().authorizedFetch('/center/me/equipment/lookup/'+encodeURIComponent(code)),row=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw new Error(row?.message||'لم يتم العثور على الأصل');
     if(!row?.resourceId)throw new Error('استجابة الأصل غير مكتملة.');
     list.innerHTML=card(row);
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر البحث')}</p>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function onClick(event){
   const host=event.currentTarget;
   if(event.target.closest?.('[data-center-equipment-retry]')){void open();return}
   const article=event.target.closest?.('[data-center-equipment-id]');if(!article||!host.contains(article))return;
   const button=event.target.closest?.('[data-equipment-history-button],[data-move]');if(!button||button.disabled)return;
   const id=article.dataset.centerEquipmentId,version=viewVersion,session=auth()?.getSessionVersion?.();
   const live=()=>current(host,version,session)&&article.isConnected;
   article.querySelector('[data-equipment-error]').replaceChildren();
   button.disabled=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     if(button.hasAttribute('data-equipment-history-button')){
       const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(id)+'/history'),rows=await response.json().catch(()=>null);
       if(!live())return;
       if(!response.ok)throw new Error(rows?.message||'تعذر تحميل سجل الحركة');
       if(!Array.isArray(rows))throw new Error('استجابة سجل الحركة غير مكتملة.');
       article.querySelector('[data-equipment-history]').innerHTML=rows.length?rows.map(row=>`<div class="hl-member-row"><b>${esc(movements[row.movementType]||'حركة غير معروفة')}</b><span>من: ${esc(row.fromLocation||'غير محدد')} · إلى: ${esc(row.toLocation||'غير محدد')}</span><small>${esc(date(row.occurredAt))} · توقيت الرياض</small>${row.notes?`<p>${esc(row.notes)}</p>`:''}</div>`).join(''):'<p>لا توجد حركات مسجلة.</p>';
     }else{
       const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(id)+'/move',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movementType:button.dataset.move})}),body=await response.json().catch(()=>null);
       if(!live())return;
       if(!response.ok)throw new Error(body?.message||'تعذر تحديث حالة الأصل');
       await open();
     }
   }catch(error){
     if(live()){
       const message=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تنفيذ إجراء المعدة')}</p>`;
       if(button.hasAttribute('data-equipment-history-button'))article.querySelector('[data-equipment-history]').innerHTML=message;
       else article.querySelector('[data-equipment-error]').innerHTML=message;
     }
   }finally{button.disabled=false}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterEquipment=Object.freeze({open});
})();
