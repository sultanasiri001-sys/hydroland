(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-equipment", {
  "غير مسجل": "Not recorded",
  "إلغاء": "Cancel",
  "إعادة المحاولة": "Try again",
  "حالة غير معروفة": "Unknown status",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "بحث": "Search",
  "غير معروف": "Unknown",
  "المعدات والمخزون": "Equipment and inventory",
  "الأصول المنسوبة للمركز وحالتها التشغيلية فقط.": "Assets assigned to the center and their operational status only.",
  "إضافة معدة": "Add equipment",
  "اسم المعدة": "Equipment name",
  "الرقم التسلسلي": "Serial number",
  "رمز الصنف": "Item code",
  "موقع التخزين": "Storage location",
  "تسجيل المعدة لا يعني اجتياز الفحص. تظهر نتائج الفحص المسجلة في بطاقة المعدة.": "Registering equipment does not mean it has passed inspection. Recorded inspection results appear on its card.",
  "حفظ المعدة": "Save equipment",
  "رمز المعدة أو الرقم التسلسلي": "Equipment code or serial number",
  "عرض جميع المعدات": "View all equipment",
  "متاحة": "Available",
  "معارة / خارج المستودع": "On loan / checked out",
  "تحت الصيانة": "Under maintenance",
  "محجوزة للفحص": "Held for inspection",
  "مستبعدة من الخدمة": "Retired from service",
  "إرجاع": "Return",
  "إعارة / خروج": "Loan / check out",
  "نقل": "Transfer",
  "صيانة": "Maintenance",
  "حجز للفحص": "Hold for inspection",
  "إتاحة": "Make available",
  "استبعاد من الخدمة": "Retire from service",
  "الموقع:": "Location:",
  "· رمز الصنف:": "· Item code:",
  "سجل الحركة": "Movement history",
  "الفحص والصيانة": "Inspection and maintenance",
  "معدة": "Equipment",
  "· الرقم التسلسلي:": "· Serial number:",
  "· غير مفعلة": "· Inactive",
  "غير محدد": "Not specified",
  "تسجيل فحص وصيانة": "Record inspection and maintenance",
  "يسجل الفحص بتاريخ اليوم، وتُحجز المعدة للمراجعة. اعتماد الاجتياز من صلاحيات المراجع.": "The inspection is recorded with today's date and the equipment is held for review. Only an authorized reviewer can approve a pass.",
  "نتيجة الفحص": "Inspection result",
  "بانتظار المراجعة والاعتماد": "Awaiting review and approval",
  "غير صالحة للاستخدام": "Unfit for use",
  "انتهاء صلاحية الصيانة (اختياري)": "Maintenance expiry date (optional)",
  "تفاصيل الفحص والصيانة واسم الفني": "Inspection and maintenance details and technician name",
  "حفظ الفحص": "Save inspection",
  "جارٍ حفظ الحركة...": "Saving movement...",
  "تعذر حفظ الحركة. أعد المحاولة.": "Could not save the movement. Try again.",
  "تم حفظ حركة المعدة. يمكنك مراجعة التفاصيل في سجل الحركة.": "Equipment movement saved. Review the details in its movement history.",
  "تعذر حفظ الحركة.": "Could not save the movement.",
  "جارٍ حفظ الفحص...": "Saving inspection...",
  "تعذر حفظ الفحص. أعد المحاولة.": "Could not save the inspection. Try again.",
  "تم حفظ الفحص وحجز المعدة للمراجعة. يمكنك عرض النتيجة من الفحص والصيانة.": "Inspection saved and equipment held for review. View the result under Inspection and maintenance.",
  "تعذر حفظ الفحص.": "Could not save the inspection.",
  "جارٍ تحميل معدات المركز...": "Loading center equipment...",
  "لا تملك صلاحية إدارة معدات هذا المركز.": "You do not have permission to manage this center's equipment.",
  "تعذر تحميل المعدات": "Could not load equipment",
  "استجابة معدات المركز غير مكتملة. أعد المحاولة.": "The center equipment response is incomplete. Try again.",
  "لا توجد معدات منسوبة لهذا المركز حاليًا.": "No equipment is currently assigned to this center.",
  "جارٍ حفظ المعدة...": "Saving equipment...",
  "تعذر حفظ المعدة. أعد المحاولة.": "Could not save the equipment. Try again.",
  "تم حفظ المعدة. رمز الأصل:": "Equipment saved. Asset code:",
  "لم يتم العثور على الأصل": "Asset not found",
  "استجابة الأصل غير مكتملة.": "The asset response is incomplete.",
  "تعذر البحث": "Search failed",
  "تعذر تحميل سجل الحركة": "Could not load movement history",
  "استجابة سجل الحركة غير مكتملة.": "The movement history response is incomplete.",
  "من:": "From:",
  "· إلى:": "· To:",
  "· توقيت الرياض": "· Riyadh time",
  "حركة غير معروفة": "Unknown movement",
  "الرحلة:": "Trip:",
  "رحلة مرتبطة": "Linked trip",
  "لا توجد حركات مسجلة.": "No movements recorded.",
  "جارٍ تحميل الفحوص...": "Loading inspections...",
  "تعذر تحميل الفحوص.": "Could not load inspections.",
  "المواعيد بتوقيت الرياض. اعتماد اجتياز الفحص من صلاحيات المراجع.": "Dates are shown in Riyadh time. Only an authorized reviewer can approve an inspection pass.",
  "إخراج المعدة ممنوع حسب سياسة الفحص والصيانة.": "Equipment check-out is blocked by the inspection and maintenance policy.",
  "المعدة تتطلب مراجعة حسب السياسة.": "The equipment requires review under the policy.",
  "لا يوجد منع حالي حسب السياسة؛ هذا لا يستبدل الفحص الفني.": "The policy currently allows use. This does not replace a technical inspection.",
  "الصيانة:": "Maintenance:",
  "موعد الانتهاء غير مسجل": "Expiry date not recorded",
  "انتهت مدة الصيانة": "Maintenance validity has expired",
  "ضمن مدة الصيانة المسجلة": "Within the recorded maintenance validity period",
  "الفحص:": "Inspection:",
  "انتهاء صلاحية الصيانة:": "Maintenance expiry:",
  "اجتاز الفحص": "Passed inspection",
  "لم يجتز الفحص": "Failed inspection",
  "يتطلب مراجعة": "Review required",
  "لم يُسجل فحص لهذه المعدة بعد.": "No inspection has been recorded for this equipment yet.",
  "تعذر تحميل رحلات المركز. أعد الضغط على الحركة للمحاولة.": "Could not load center trips. Select the movement again to retry.",
  "الموقع الجديد": "New location",
  "الرحلة المرتبطة (اختياري)": "Linked trip (optional)",
  "بدون ربط برحلة": "No linked trip",
  "ملاحظات الحركة": "Movement notes",
  "حفظ الحركة": "Save movement",
  "(اختياري)": "(optional)",
  "تعذر تنفيذ إجراء المعدة": "Could not complete the equipment action",
  "جارٍ البحث عن المعدة…": "Searching for equipment…",
  " · الرقم التسلسلي: {0}": " · Serial number: {0}",
  " · غير مفعلة": " · Inactive",
  "مطالبات ضرر التأجير": "Rental damage claims",
  "تم حفظ المعدة. رمز الأصل: {0}": "Equipment saved. Asset code: {0}"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

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
   uiLocale.setHTML(host, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2>المعدات والمخزون</h2><p>الأصول المنسوبة للمركز وحالتها التشغيلية فقط.</p></div></header><details data-equipment-create-panel><summary>إضافة معدة</summary><form data-equipment-create><fieldset><label>اسم المعدة<input name="name" required minlength="2" maxlength="240"></label><label>الرقم التسلسلي<input name="serialNumber" maxlength="120"></label><label>رمز الصنف<input name="sku" maxlength="120"></label><label>موقع التخزين<input name="location" maxlength="240"></label><p>تسجيل المعدة لا يعني اجتياز الفحص. تظهر نتائج الفحص المسجلة في بطاقة المعدة.</p><button type="submit">حفظ المعدة</button></fieldset><p data-equipment-create-message role="status"></p></form></details><form data-equipment-lookup><input name="code" aria-label="رمز المعدة أو الرقم التسلسلي" required autocomplete="off" placeholder="QR / Barcode / Asset / Serial"><button>بحث</button><button type="button" data-center-equipment-retry>عرض جميع المعدات</button></form><p data-equipment-feedback role="status"></p><div data-center-equipment aria-live="polite"></div>`);
   // Every recreated workspace owns its listeners; never bind only the first instance.
   host.querySelector('[data-equipment-lookup]').addEventListener('submit',lookup);
   host.querySelector('[data-equipment-create]').addEventListener('submit',createEquipment);
   const claims=document.createElement('details');
   const heading=document.createElement('summary');uiLocale.setText(heading,'مطالبات ضرر التأجير');
   const damageList=document.createElement('div');claims.append(heading,damageList);host.append(claims);
   claims.addEventListener('toggle',async()=>{if(!claims.open||!eligible()){damageList.replaceChildren();return;}const view=await import('./hydroland-rental-damage.mjs');if(claims.open&&eligible()&&claims.isConnected)await view.centerClaims(damageList);});
   host.addEventListener('click',onClick);
   host.addEventListener('submit',event=>{if(event.target.matches('[data-equipment-inspection-form]'))void saveInspection(event);if(event.target.matches('[data-equipment-move-form]'))void saveMovement(event)});
   section=host;document.getElementById('main')?.append(host);return host;
 }
 const statuses={AVAILABLE:'متاحة',CHECKED_OUT:'معارة / خارج المستودع',MAINTENANCE:'تحت الصيانة',QUARANTINED:'محجوزة للفحص',RETIRED:'مستبعدة من الخدمة'};
 const movements={CHECK_IN:'إرجاع',CHECK_OUT:'إعارة / خروج',TRANSFER:'نقل',MAINTENANCE:'صيانة',QUARANTINE:'حجز للفحص',RELEASE:'إتاحة',RETIRE:'استبعاد من الخدمة'};
 const date=value=>{const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(parsed):uiLocale.t('غير مسجل')};
 const actions=row=>row.active===false||row.stockStatus==='RETIRED'?[]:row.stockStatus==='AVAILABLE'?['CHECK_OUT','TRANSFER','MAINTENANCE','QUARANTINE']:row.stockStatus==='CHECKED_OUT'?['CHECK_IN','TRANSFER','MAINTENANCE','QUARANTINE']:['MAINTENANCE','QUARANTINED'].includes(row.stockStatus)?['RELEASE','TRANSFER']:[];
 const card=row=>uiLocale.html`<article class="hl-course" data-center-equipment-id="${esc(row.resourceId)}" data-equipment-revision="${esc(row.updatedAt||'')}"><div class="hl-course-top"><div><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('معدة')))(row.resourceName)}</b><small>${esc(row.assetCode||'—')}${(row.serialNumber?uiLocale.label(" · الرقم التسلسلي: {0}", [row.serialNumber]):'')}</small></div><span>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(statuses[row.stockStatus]) || uiLocale.message('حالة غير معروفة')))}${uiLocale.messageHTML((row.active===false?uiLocale.message(' · غير مفعلة'):''))}</span></div><small>الموقع: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير محدد')))(row.location)} · رمز الصنف: ${esc(row.sku||'—')}</small><div class="hl-member-actions">${actions(row).map(type=>uiLocale.html`<button type="button" data-move="${type}">${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(movements[type]))}</button>`).join('')}</div><div data-equipment-error></div><div data-equipment-move-editor></div><button type="button" data-equipment-history-button>سجل الحركة</button><div data-equipment-history></div><button type="button" data-equipment-inspection-button>الفحص والصيانة</button><div data-equipment-inspection></div>${(row.active!==false&&row.stockStatus!=="RETIRED"?inspectionForm():"")}</article>`;
 const inspectionForm=()=>uiLocale.html`<details><summary>تسجيل فحص وصيانة</summary><form data-equipment-inspection-form><fieldset><p>يسجل الفحص بتاريخ اليوم، وتُحجز المعدة للمراجعة. اعتماد الاجتياز من صلاحيات المراجع.</p><label>نتيجة الفحص<select name="status" required><option value="REVIEW">بانتظار المراجعة والاعتماد</option><option value="FAIL">غير صالحة للاستخدام</option></select></label><label>انتهاء صلاحية الصيانة (اختياري)<input type="date" name="serviceExpiresAt"></label><label>تفاصيل الفحص والصيانة واسم الفني<textarea name="notes" required maxlength="2000" rows="3"></textarea></label><button type="submit">حفظ الفحص</button></fieldset><p data-inspection-message role="status"></p></form></details>`;
 async function saveMovement(event){
   event.preventDefault();const form=event.target,article=form.closest('[data-center-equipment-id]'),host=form.closest('#hl-center-equipment');if(!article||!host||!eligible()||form.dataset.busy)return;
   const values=Object.fromEntries(new FormData(form));form.dataset.requestId ||= crypto.randomUUID();
   const payload={...values,movementType:form.dataset.movementType,requestId:form.dataset.requestId,...(article.dataset.equipmentRevision?{expectedUpdatedAt:article.dataset.equipmentRevision}:{})};
   const version=viewVersion,session=auth()?.getSessionVersion?.(),live=()=>current(host,version,session)&&form.isConnected,message=form.querySelector('[data-movement-message]');
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ الحركة...'));
   try{
    if(!(await authorize(host,version,session))||!live())return;
    const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(article.dataset.centerEquipmentId)+'/move',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
    if(!live())return;if(!response.ok)throw (value=>value?new Error(value):localError('تعذر حفظ الحركة. أعد المحاولة.'))(body?.message);
    await open();if(host===section&&host.isConnected)uiLocale.setMessage(host.querySelector('[data-equipment-feedback]'), uiLocale.message('تم حفظ حركة المعدة. يمكنك مراجعة التفاصيل في سجل الحركة.'));
   }catch(error){if(live())setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ الحركة.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function saveInspection(event){
   event.preventDefault();const form=event.target,host=form.closest('#hl-center-equipment'),article=form.closest('[data-center-equipment-id]');if(!host||!article||!eligible()||form.dataset.busy)return;
   const values=Object.fromEntries(new FormData(form));form.dataset.requestId ||= crypto.randomUUID();
   let expiry=null;if(values.serviceExpiresAt){const date=new Date(values.serviceExpiresAt+'T23:59:59+03:00');if(!Number.isFinite(date.getTime()))return;expiry=date.toISOString()}
   const payload={status:values.status,notes:values.notes,serviceExpiresAt:expiry,requestId:form.dataset.requestId},version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-inspection-message]');
   const live=()=>current(host,version,session)&&article.isConnected;
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ الفحص...'));
   try{
    if(!(await authorize(host,version,session))||!live())return;
    const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(article.dataset.centerEquipmentId)+'/inspection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
    if(!live())return;if(!response.ok||!body?.id)throw (value=>value?new Error(value):localError('تعذر حفظ الفحص. أعد المحاولة.'))(body?.message);
    await open();if(host===section&&host.isConnected){const saved=host.querySelector('[data-equipment-feedback]');uiLocale.setMessage(saved, uiLocale.message('تم حفظ الفحص وحجز المعدة للمراجعة. يمكنك عرض النتيجة من الفحص والصيانة.'));}
   }catch(error){if(live())setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ الفحص.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 }
 async function authorize(host,version,session){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
   const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
 }
 async function open(){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-equipment]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل معدات المركز...</p>`);
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/equipment'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية إدارة معدات هذا المركز.'):(value=>value?new Error(value):localError('تعذر تحميل المعدات'))(rows?.message));
     if(!Array.isArray(rows))throw localError('استجابة معدات المركز غير مكتملة. أعد المحاولة.');
     uiLocale.setHTML(list, rows.length?rows.map(card).join(''):uiLocale.html`<p>لا توجد معدات منسوبة لهذا المركز حاليًا.</p>`);
   }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل المعدات')}</p><button type="button" data-center-equipment-retry>إعادة المحاولة</button>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function createEquipment(event){
   event.preventDefault();const form=event.currentTarget,host=form.closest('#hl-center-equipment');if(!host||!eligible()||form.dataset.busy)return;
   const values=Object.fromEntries(new FormData(form));form.dataset.requestId ||= crypto.randomUUID();
   const payload={...values,requestId:form.dataset.requestId},version=viewVersion,session=auth()?.getSessionVersion?.(),message=form.querySelector('[data-equipment-create-message]');
   form.dataset.busy='true';form.querySelector('fieldset').disabled=true;uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ المعدة...'));
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/equipment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok||!body?.resourceId)throw (value=>value?new Error(value):localError('تعذر حفظ المعدة. أعد المحاولة.'))(body?.message);
     form.reset();delete form.dataset.requestId;uiLocale.setText(message, "تم حفظ المعدة. رمز الأصل: {0}", [body.assetCode]);await open();
   }catch(error){if(current(host,version,session))setLocalErrorText(message, (error instanceof Error?error:undefined), 'تعذر حفظ المعدة. أعد المحاولة.')}
   finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
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
     if(!response.ok)throw (value=>value?new Error(value):localError('لم يتم العثور على الأصل'))(row?.message);
     if(!row?.resourceId)throw localError('استجابة الأصل غير مكتملة.');
     uiLocale.setHTML(list, card(row));
   }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر البحث')}</p>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function onClick(event){
   const host=event.currentTarget;
   if(event.target.closest?.('[data-center-equipment-retry]')){void open();return}
   const article=event.target.closest?.('[data-center-equipment-id]');if(!article||!host.contains(article))return;
   if(event.target.closest?.('[data-movement-cancel]')){if(!article.querySelector('[data-equipment-move-form]')?.dataset.busy)article.querySelector('[data-equipment-move-editor]').replaceChildren();return}
   const button=event.target.closest?.('[data-equipment-history-button],[data-equipment-inspection-button],[data-move]');if(!button||button.disabled)return;
   if(button.hasAttribute('data-move')&&article.querySelector('[data-equipment-move-form]')?.dataset.busy)return;
   const id=article.dataset.centerEquipmentId,version=viewVersion,session=auth()?.getSessionVersion?.();
   const live=()=>current(host,version,session)&&article.isConnected;
   article.querySelector('[data-equipment-error]').replaceChildren();
   button.disabled=true;
   try{
     if(!(await authorize(host,version,session))||!live())return;
     if(button.hasAttribute('data-equipment-history-button')){
       const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(id)+'/history'),rows=await response.json().catch(()=>null);
       if(!live())return;
       if(!response.ok)throw (value=>value?new Error(value):localError('تعذر تحميل سجل الحركة'))(rows?.message);
       if(!Array.isArray(rows))throw localError('استجابة سجل الحركة غير مكتملة.');
       uiLocale.setHTML(article.querySelector('[data-equipment-history]'), rows.length?rows.map(row=>uiLocale.html`<div class="hl-member-row"><b>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(movements[row.movementType]) || uiLocale.message('حركة غير معروفة')))}</b><span>من: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير محدد')))(row.fromLocation)} · إلى: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير محدد')))(row.toLocation)}</span><small>${esc(date(row.occurredAt))} · توقيت الرياض</small>${(row.tripId?uiLocale.html`<p>الرحلة: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة مرتبطة')))(row.tripTitle)}</p>`:'')}${(row.notes?uiLocale.html`<p>${esc(row.notes)}</p>`:'')}</div>`).join(''):uiLocale.html`<p>لا توجد حركات مسجلة.</p>`);
     }else if(button.hasAttribute('data-equipment-inspection-button')){
       const box=article.querySelector('[data-equipment-inspection]');uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل الفحوص...</p>`);
       const response=await auth().authorizedFetch('/center/me/equipment/'+encodeURIComponent(id)+'/inspection'),body=await response.json().catch(()=>null);
       if(!live())return;
       if(!response.ok||!Array.isArray(body?.history))throw (value=>value?new Error(value):localError('تعذر تحميل الفحوص.'))(body?.message);
       const latest=body.history[0],expired=latest?.serviceExpiresAt&&new Date(latest.serviceExpiresAt)<=new Date();
       uiLocale.setHTML(box, uiLocale.html`<p>${uiLocale.messageHTML((body.blocked?uiLocale.message('إخراج المعدة ممنوع حسب سياسة الفحص والصيانة.'):(body.reviewRequired?uiLocale.message('المعدة تتطلب مراجعة حسب السياسة.'):uiLocale.message('لا يوجد منع حالي حسب السياسة؛ هذا لا يستبدل الفحص الفني.'))))}</p>${(latest?uiLocale.html`<p>الصيانة: ${uiLocale.messageHTML((!latest.serviceExpiresAt?uiLocale.message('موعد الانتهاء غير مسجل'):(expired?uiLocale.message('انتهت مدة الصيانة'):uiLocale.message('ضمن مدة الصيانة المسجلة'))))}</p>`:'')}${(body.history.length?body.history.map(row=>uiLocale.html`<div class="hl-member-row"><b>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(({PASS:'اجتاز الفحص',FAIL:'لم يجتز الفحص',REVIEW:'يتطلب مراجعة'})[row.status]) || uiLocale.message('غير معروف')))}</b><p>الفحص: ${esc(date(row.inspectedAt))}</p><p>انتهاء صلاحية الصيانة: ${esc(date(row.serviceExpiresAt))}</p>${(row.notes?uiLocale.html`<p>${esc(row.notes)}</p>`:'')}</div>`).join(''):uiLocale.html`<p>لم يُسجل فحص لهذه المعدة بعد.</p>`)}<small>المواعيد بتوقيت الرياض. اعتماد اجتياز الفحص من صلاحيات المراجع.</small>`);
     }else{
       const response=await auth().authorizedFetch('/center/me/trips'),trips=await response.json().catch(()=>null);
       if(!live())return;if(!response.ok||!Array.isArray(trips))throw localError('تعذر تحميل رحلات المركز. أعد الضغط على الحركة للمحاولة.');
       const type=button.dataset.move,options=trips.filter(row=>['DRAFT','OPEN','CLOSED'].includes(row.status));
       uiLocale.setHTML(article.querySelector('[data-equipment-move-editor]'), uiLocale.html`<form data-equipment-move-form data-movement-type="${esc(type)}"><fieldset><h3>${uiLocale.messageHTML((value=>value?uiLocale.message(value):value)(movements[type]))}</h3><label>الموقع الجديد ${uiLocale.messageHTML((type==='TRANSFER'?'':uiLocale.message('(اختياري)')))}<input name="toLocation" maxlength="240" ${type==='TRANSFER'?'required':''}></label><label>الرحلة المرتبطة (اختياري)<select name="tripId"><option value="">بدون ربط برحلة</option>${options.map(row=>uiLocale.html`<option value="${esc(row.id)}">${esc(row.title)} · ${esc(date(row.startsAt))}</option>`).join('')}</select></label><label>ملاحظات الحركة<textarea name="notes" maxlength="2000" rows="3"></textarea></label><button type="submit">حفظ الحركة</button><button type="button" data-movement-cancel>إلغاء</button></fieldset><p data-movement-message role="status"></p></form>`);
       article.querySelector('[data-equipment-move-form] input').focus();
     }
   }catch(error){
     if(live()){
       const message=uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تنفيذ إجراء المعدة')}</p>`;
       if(button.hasAttribute('data-equipment-inspection-button'))uiLocale.setHTML(article.querySelector('[data-equipment-inspection]'), message);
       else if(button.hasAttribute('data-equipment-history-button'))uiLocale.setHTML(article.querySelector('[data-equipment-history]'), message);
       else uiLocale.setHTML(article.querySelector('[data-equipment-error]'), message);
     }
   }finally{button.disabled=false}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 const search=code=>{
   if(typeof code!=='string'||!code.trim()||code.trim().length>120)return;
   if(!eligible()){clear();return}
   const host=ensure(),form=host.querySelector('[data-equipment-lookup]');
   form.querySelector('[name=code]').value=code.trim();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);
   uiLocale.setMessage(host.querySelector('[data-center-equipment]'), uiLocale.message('جارٍ البحث عن المعدة…'));
   return lookup({preventDefault(){},currentTarget:form});
 };
 window.HydrolandCenterEquipment=Object.freeze({open,search});
})();
