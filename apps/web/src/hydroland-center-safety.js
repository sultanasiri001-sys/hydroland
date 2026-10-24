(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,listVersion=0,detailVersion=0,composeVersion=0,draft=null,tripPage=1,tripQuery='';
 let filters={q:'',decision:'ALL',status:'ALL',severity:'ALL',checklistPage:1,incidentPage:1};
 const defaults=()=>({q:'',decision:'ALL',status:'ALL',severity:'ALL',checklistPage:1,incidentPage:1});
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={ALLOWED:'معتمد',REVIEW_REQUIRED:'بانتظار المراجعة',DEFERRED:'مؤجل',OPEN:'مفتوح',UNDER_REVIEW:'قيد المراجعة',RESOLVED:'تمت المعالجة',CLOSED:'مغلق',LOW:'منخفضة',MEDIUM:'متوسطة',HIGH:'عالية',CRITICAL:'حرجة',DRAFT:'غير منشورة',COMPLETED:'مكتملة',CANCELLED:'ملغاة'};
 const label=value=>labels[value]||'تحتاج مراجعة';
 const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}):'—';
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{listVersion++;detailVersion++;composeVersion++;section?.remove();section=null;draft=null;filters=defaults()};
 const current=(host,session,extra=()=>true)=>host===section&&host.isConnected&&session===auth()?.getSessionVersion?.()&&eligible()&&extra();
 async function authorize(host,session,extra=()=>true){
   const alive=()=>host===section&&host.isConnected&&session===auth()?.getSessionVersion?.()&&extra();
   if(typeof access()?.authorizeRole!=='function'){if(alive())clear();return false}
   const ok=await access().authorizeRole('center',{sessionVersion:session,isCurrent:alive});
   if(!ok||!current(host,session,extra)){if(alive())clear();return false}return true;
 }
 async function request(path,options){
   const response=await auth().authorizedFetch('/center/me/safety'+path,options),data=await response.json().catch(()=>null);
   if(!response.ok){const error=new Error(response.status===403?'لا تملك صلاحية سلامة هذا المركز.':data?.message||'تعذر تحميل بيانات السلامة.');error.status=response.status;throw error}return data;
 }
 function denied(error){
   if(error.status!==403||!section)return false;
   listVersion++;detailVersion++;composeVersion++;draft=null;
   section.querySelector('[data-safety-compose]').replaceChildren();section.querySelector('section[data-safety-detail]').replaceChildren();
   section.querySelector('[data-center-safety]').removeAttribute('aria-busy');
   section.querySelector('[data-center-safety]').innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-center-safety-retry>إعادة المحاولة</button>`;return true;
 }
 const select=(name,title,values)=>`<label><span id="hl-center-safety-${name}-label">${title}</span><select name="${name}" aria-labelledby="hl-center-safety-${name}-label"><option value="ALL">الكل</option>${values.map(v=>`<option value="${v}">${label(v)}</option>`).join('')}</select></label>`;
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-safety';host.id='hl-center-safety';host.hidden=true;
   host.innerHTML=`<header><small>DIVE CENTER · مركز الغوص</small><h2>السلامة</h2><p>فحوص رحلات المركز وبلاغاتها ومتابعة نتائج المراجعة. الاعتماد وإغلاق البلاغات لدى الجهة المخولة.</p></header><div class="hl-safety-actions"><button type="button" data-safety-new="checklist">تسجيل فحص رحلة</button><button type="button" data-safety-new="incident">تسجيل بلاغ سلامة</button><button type="button" data-safety-refresh>تحديث السجلات</button></div><form data-safety-search><label>الرحلة أو عنوان البلاغ<input type="search" name="q" maxlength="120"></label>${select('decision','قرار الفحص',['REVIEW_REQUIRED','DEFERRED','ALLOWED'])}${select('status','حالة البلاغ',['OPEN','UNDER_REVIEW','RESOLVED','CLOSED'])}${select('severity','خطورة البلاغ',['LOW','MEDIUM','HIGH','CRITICAL'])}<button type="submit">بحث</button><button type="button" data-safety-reset>مسح البحث</button></form><section data-safety-compose aria-live="polite"></section><div data-center-safety aria-live="polite"></div><section data-safety-detail aria-live="polite"></section>`;
   host.addEventListener('submit',event=>{const form=event.target;if(form.matches('[data-safety-search]')){event.preventDefault();const data=new FormData(form);filters={...defaults(),q:String(data.get('q')||'').trim(),decision:data.get('decision'),status:data.get('status'),severity:data.get('severity')};void loadList()}else if(form.matches('[data-safety-trip-search]')){event.preventDefault();tripQuery=String(new FormData(form).get('q')||'').trim();tripPage=1;void loadTrips()}else if(form.matches('[data-safety-submit]')){event.preventDefault();void save(form)}});
   host.addEventListener('click',event=>{
     const b=event.target.closest?.('button');if(!b||b.disabled)return;
     if(b.hasAttribute('data-center-safety-retry')||b.hasAttribute('data-safety-refresh'))void loadList();
     else if(b.hasAttribute('data-safety-reset')){filters=defaults();host.querySelector('[data-safety-search]').reset();void loadList()}
     else if(b.hasAttribute('data-safety-page')){filters[b.dataset.safetyPage]=Number(b.dataset.page);void loadList()}
     else if(b.hasAttribute('data-safety-detail'))void detail(b.dataset.kind,b.dataset.id);
     else if(b.hasAttribute('data-safety-detail-close')){detailVersion++;host.querySelector('section[data-safety-detail]').replaceChildren()}
     else if(b.hasAttribute('data-safety-new')){draft={kind:b.dataset.safetyNew};tripPage=1;tripQuery='';void loadTrips()}
     else if(b.hasAttribute('data-safety-cancel')){composeVersion++;draft=null;host.querySelector('[data-safety-compose]').replaceChildren()}
     else if(b.hasAttribute('data-safety-trip-page')){tripPage=Number(b.dataset.safetyTripPage);void loadTrips()}
     else if(b.hasAttribute('data-safety-trips-retry'))void loadTrips();
     else if(b.hasAttribute('data-safety-trip-select'))void selectTrip(b.dataset.safetyTripSelect);
     else if(b.hasAttribute('data-safety-trip-refresh'))void selectTrip(draft?.trip?.id,true);
   });
   section=host;document.getElementById('main')?.append(host);return host;
 }
 const pager=(data,key)=>data?.totalPages>1?`<nav class="hl-safety-pager" aria-label="${key==='checklistPage'?'صفحات الفحوص':'صفحات البلاغات'}"><button type="button" data-safety-page="${key}" data-page="${data.page-1}" ${data.page===1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-safety-page="${key}" data-page="${data.page+1}" ${data.page===data.totalPages?'disabled':''}>التالي</button></nav>`:'';
 async function open(){if(!eligible()){clear();return}const host=ensure();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);await loadList()}
 async function loadList(){
   if(!eligible()){clear();return}const host=ensure(),session=auth().getSessionVersion?.(),v=++listVersion,list=host.querySelector('[data-center-safety]'),active=()=>current(host,session,()=>v===listVersion);
   detailVersion++;host.querySelector('section[data-safety-detail]').replaceChildren();list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل سجلات السلامة…</p>';
   try{
     if(!await authorize(host,session,()=>v===listVersion))return;
     const params=new URLSearchParams();for(const [key,value] of Object.entries(filters))if(value!==defaults()[key])params.set(key,String(value));
     const data=await request(params.size?'?'+params:'');if(!active())return;
     if(!Array.isArray(data?.checklists)||!Array.isArray(data?.incidents))throw new Error('استجابة سجلات السلامة غير مكتملة. أعد المحاولة.');
     for(const name of ['checklistPagination','incidentPagination'])if(data[name]&&(!Number.isSafeInteger(data[name].total)||data[name].total<0||!Number.isSafeInteger(data[name].page)||data[name].page<1||!Number.isSafeInteger(data[name].totalPages)||data[name].totalPages<data[name].page))throw new Error('استجابة صفحات السلامة غير مكتملة.');
     if(data.checklistPagination)filters.checklistPage=data.checklistPagination.page;if(data.incidentPagination)filters.incidentPage=data.incidentPagination.page;
     list.innerHTML=`<h3>قوائم الفحص</h3><p>${data.checklistPagination?'الفحوص المطابقة: '+data.checklistPagination.total:'الفحوص المعروضة: '+data.checklists.length}</p>`+
       (data.checklists.length?data.checklists.map(row=>`<article class="hl-course" data-center-checklist="${esc(row.id)}"><div class="hl-course-top"><b>${esc(row.trip?.title||'رحلة المركز')}</b><span>${label(row.decision)}</span></div><small>آخر تحديث: ${esc(date(row.decidedAt||row.updatedAt))} — توقيت الرياض</small>${row.notes?`<p>${esc(row.notes)}</p>`:''}<button type="button" data-safety-detail data-kind="checklist" data-id="${esc(row.id)}">تفاصيل الفحص</button></article>`).join(''):'<p>لا توجد قوائم فحص مطابقة.</p>')+pager(data.checklistPagination,'checklistPage')+
       `<h3>البلاغات</h3><p>${data.incidentPagination?'البلاغات المطابقة: '+data.incidentPagination.total:'البلاغات المعروضة: '+data.incidents.length}</p>`+
       (data.incidents.length?data.incidents.map(row=>`<article class="hl-course" data-center-incident="${esc(row.id)}"><div class="hl-course-top"><b>${esc(row.title)}</b><span>${label(row.severity)} · ${label(row.status)}</span></div><small>${esc(row.trip?.title||'رحلة المركز')} · ${esc(row.locationName||'')} · ${esc(date(row.createdAt))}</small><button type="button" data-safety-detail data-kind="incident" data-id="${esc(row.id)}">تفاصيل البلاغ</button></article>`).join(''):'<p>لا توجد بلاغات مطابقة.</p>')+pager(data.incidentPagination,'incidentPage');
   }catch(error){if(active()&&!denied(error))list.innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-center-safety-retry>إعادة المحاولة</button>`}
   finally{if(active())list.removeAttribute('aria-busy')}
 }
 async function detail(kind,id){
   const host=section,session=auth()?.getSessionVersion?.(),v=++detailVersion,box=host?.querySelector('section[data-safety-detail]'),active=()=>current(host,session,()=>v===detailVersion);if(!box)return;
   box.innerHTML='<p>جارٍ تحميل التفاصيل…</p>';
   try{
     if(!await authorize(host,session,()=>v===detailVersion))return;
     const data=await request('/'+(kind==='checklist'?'checklists':'incidents')+'/'+encodeURIComponent(id));if(!active())return;if(data?.id!==id)throw new Error('تفاصيل السلامة غير مكتملة.');
     const rows=kind==='checklist'?(Array.isArray(data.checklistItems)?data.checklistItems:[]).map(item=>`<li>${esc(item.label)}: ${data.items?.[item.key]===true?'مستوفى':data.items?.[item.key]===false?'غير مستوفى':'غير موثق'}</li>`).join(''):'';
     box.innerHTML=`<header><h3>${kind==='checklist'?'تفاصيل الفحص':'تفاصيل البلاغ'}</h3><button type="button" data-safety-detail-close>إغلاق التفاصيل</button></header><p>${esc(data.trip?.title)} · ${label(kind==='checklist'?data.decision:data.status)}</p><p>رقم السجل: ${esc(data.id)} · ${esc(date(data.createdAt))}</p>`+(kind==='checklist'?`<ul>${rows}</ul><p>${esc(data.notes||'لا توجد ملاحظات.')}</p><p>تاريخ القرار: ${esc(date(data.decidedAt))}</p>`:`<h4>${esc(data.title)}</h4><p>الخطورة: ${label(data.severity)} · ${esc(data.locationName||'')}</p><p>${data.descriptionVisible?esc(data.description):'التفاصيل الخاصة متاحة للمبلّغ والجهة المخولة بالمراجعة.'}</p><p>تاريخ المعالجة: ${esc(date(data.resolvedAt))}</p>`);box.scrollIntoView({block:'nearest'});
   }catch(error){if(active()&&!denied(error))box.innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-safety-detail data-kind="${kind}" data-id="${esc(id)}">إعادة تحميل التفاصيل</button>`}
 }
 async function loadTrips(){
   if(!draft)return;const host=section,session=auth().getSessionVersion?.(),v=++composeVersion,box=host.querySelector('[data-safety-compose]'),kind=draft.kind,active=()=>current(host,session,()=>v===composeVersion);
   box.innerHTML=`<header><h3>${kind==='checklist'?'تسجيل فحص رحلة':'تسجيل بلاغ سلامة'}</h3><button type="button" data-safety-cancel>إلغاء</button></header><form data-safety-trip-search><label>ابحث عن رحلة المركز<input type="search" name="q" maxlength="120" value="${esc(tripQuery)}"></label><button type="submit">بحث الرحلات</button></form><div data-safety-trip-list>جارٍ تحميل الرحلات…</div>`;
   try{
     if(!await authorize(host,session,()=>v===composeVersion))return;
     const data=await request('/trips?'+new URLSearchParams({q:tripQuery,page:String(tripPage)}));if(!active())return;
     if(!Array.isArray(data?.items)||!Number.isSafeInteger(data.page)||data.page<1||!Number.isSafeInteger(data.totalPages)||data.totalPages<data.page)throw new Error('قائمة الرحلات غير مكتملة.');
     tripPage=data.page;box.querySelector('[data-safety-trip-list]').innerHTML=(data.items.length?data.items.map(t=>`<article class="hl-course"><b>${esc(t.title)}</b><p>${esc(date(t.startsAt))} · ${label(t.status)}</p><button type="button" data-safety-trip-select="${esc(t.id)}">اختيار الرحلة</button></article>`).join(''):'<p>لا توجد رحلات مطابقة.</p>')+(data.totalPages>1?`<nav class="hl-safety-pager" aria-label="صفحات رحلات السلامة"><button type="button" data-safety-trip-page="${data.page-1}" ${data.page===1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-safety-trip-page="${data.page+1}" ${data.page===data.totalPages?'disabled':''}>التالي</button></nav>`:'');
   }catch(error){if(active()&&!denied(error))box.querySelector('[data-safety-trip-list]').innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-safety-trips-retry>إعادة تحميل الرحلات</button>`}
 }
 async function selectTrip(id,preserve=false){
   if(!draft||!id)return;const host=section,session=auth().getSessionVersion?.(),v=++composeVersion,kind=draft.kind,box=host.querySelector('[data-safety-compose]'),oldForm=box.querySelector('[data-safety-submit]'),values=preserve&&oldForm?new FormData(oldForm):null,active=()=>current(host,session,()=>v===composeVersion);
   const feedback=box.querySelector('[data-safety-feedback]');if(feedback)feedback.textContent='جارٍ تحديث بيانات الرحلة…';
   try{
     if(!await authorize(host,session,()=>v===composeVersion))return;
     const data=await request('/trips/'+encodeURIComponent(id));if(!active())return;
     if(data?.trip?.id!==id||typeof data.stateToken!=='string'||typeof data.incidentStateToken!=='string'||!Array.isArray(data.checklistItems))throw new Error('بيانات الرحلة غير مكتملة.');
     draft={kind,trip:data.trip,stateToken:kind==='checklist'?data.stateToken:data.incidentStateToken,requestId:crypto.randomUUID()};
     box.innerHTML=`<header><h3>${kind==='checklist'?'تسجيل فحص رحلة':'تسجيل بلاغ سلامة'} · ${esc(data.trip.title)}</h3><button type="button" data-safety-cancel>إلغاء</button></header>`;
     if(kind==='checklist'&&!data.canAssess){box.innerHTML+='<p role="alert">الرحلة بدأت أو أُغلقت، ولا يمكن تسجيل فحص قبل الرحلة.</p>';return}
     box.innerHTML+=`<form data-safety-submit><p>${kind==='checklist'?'تُحفظ جميع البنود للمراجعة. البنود غير المستوفاة تؤجل قرار التشغيل، ولا تمنح هذه الخطوة موافقة تشغيل.':'يُسجَّل البلاغ داخل المنصة للمراجعة. في الطوارئ تواصل مباشرة مع الجهة المختصة؛ هذا النموذج لا يرسل نداء استغاثة خارجيًا.'}</p>`+(kind==='checklist'?`<fieldset><legend>بنود الفحص</legend>${data.checklistItems.map(item=>`<label class="hl-safety-check"><input type="checkbox" name="${esc(item.key)}" ${values?.has(item.key)?'checked':''}>${esc(item.label)}</label>`).join('')}</fieldset><label>ملاحظات الفحص<textarea name="notes" maxlength="2000">${esc(values?.get('notes')||'')}</textarea></label>`:`<label>عنوان البلاغ<input name="title" minlength="3" maxlength="160" required value="${esc(values?.get('title')||'')}"></label><label><span id="hl-center-incident-severity-label">خطورة البلاغ الجديد</span><select name="severity" aria-labelledby="hl-center-incident-severity-label">${['LOW','MEDIUM','HIGH','CRITICAL'].map(value=>`<option value="${value}" ${values?.get('severity')===value?'selected':''}>${label(value)}</option>`).join('')}</select></label><label>وصف البلاغ<textarea name="description" minlength="3" maxlength="5000" required>${esc(values?.get('description')||'')}</textarea></label><label>الموقع<input name="locationName" maxlength="160" value="${esc(values?.get('locationName')||'')}"></label>`)+`<button type="submit">${kind==='checklist'?'حفظ الفحص وإرساله للمراجعة':'حفظ البلاغ'}</button><p data-safety-feedback role="status"></p></form>`;
     box.scrollIntoView({block:'nearest'});
   }catch(error){if(active()&&!denied(error)){if(feedback)feedback.textContent=error.message;else box.innerHTML=`<p role="alert">${esc(error.message)}</p><button type="button" data-safety-trips-retry>إعادة اختيار الرحلة</button><button type="button" data-safety-cancel>إلغاء</button>`}}
 }
 async function save(form){
   if(!draft||form.dataset.busy)return;
   const host=section,session=auth().getSessionVersion?.(),v=composeVersion,selected=draft,box=host.querySelector('[data-safety-compose]'),feedback=form.querySelector('[data-safety-feedback]'),active=()=>current(host,session,()=>v===composeVersion&&draft===selected&&form.isConnected);
   const values=new FormData(form),body={requestId:selected.requestId,expectedState:selected.stateToken};
   if(selected.kind==='checklist'){body.items={};form.querySelectorAll('input[type=checkbox]').forEach(input=>body.items[input.name]=values.has(input.name));body.notes=String(values.get('notes')||'').trim()}
   else for(const key of ['title','severity','description','locationName'])body[key]=String(values.get(key)||'').trim();
   form.dataset.busy='true';box.querySelectorAll('button,input,select,textarea').forEach(node=>node.disabled=true);feedback.textContent='جارٍ الحفظ…';
   try{
     if(!await authorize(host,session,()=>v===composeVersion))return;
     const data=await request('/trips/'+encodeURIComponent(selected.trip.id)+'/'+(selected.kind==='checklist'?'checklists':'incidents'),{method:'POST',body:JSON.stringify(body)});if(!active())return;
     if(typeof data?.id!=='string'||data.tripId!==selected.trip.id||(selected.kind==='checklist'?!['REVIEW_REQUIRED','DEFERRED'].includes(data.decision):data.status!=='OPEN'))throw new Error('لم يصل تأكيد الحفظ. أعد المحاولة بالطلب نفسه.');
     const message=selected.kind==='checklist'?(data.decision==='DEFERRED'?'تم حفظ الفحص بحالة مؤجل لوجود بنود غير مستوفاة.':'تم حفظ الفحص وإرساله للمراجعة.'):'تم حفظ البلاغ داخل المنصة للمراجعة.';
     draft=null;composeVersion++;box.innerHTML=`<p role="status">${message}</p>`;await loadList();if(current(host,session))await detail(selected.kind,data.id);
   }catch(error){if(active()&&!denied(error)){feedback.textContent=error.message;if(error.status===409){form.dataset.stale='true';feedback.innerHTML+=` <button type="button" data-safety-trip-refresh>تحديث بيانات الرحلة</button>`}}}
   finally{delete form.dataset.busy;if(active()){box.querySelectorAll('button,input,select,textarea').forEach(node=>node.disabled=false);if(form.dataset.stale)form.querySelector('[type=submit]').disabled=true}}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterSafety=Object.freeze({open});
})();
