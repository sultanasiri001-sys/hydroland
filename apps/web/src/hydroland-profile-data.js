(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("profile-data", {
  "يمكن تنزيل سجلات الرحلات الشخصية في صفحات تضم حتى ١٠٠ سجل.": "Download personal trip records in pages of up to 100 records.",
  "تنزيل رسائلي المرسلة": "Download my sent messages",
  "تنزيل الصفحة التالية من الرسائل": "Download the next page of sent messages",
  "يتضمن التنزيل نصوصك ومدد رسائلك الصوتية في المحادثات التي تشارك فيها حاليًا.": "Includes your texts and voice message durations in conversations you currently belong to.",
  "تعذر تنزيل السجلات. حاول مرة أخرى.": "Could not download records. Try again.",
  "تنزيل حجوزاتي الشخصية": "Download my personal bookings",
  "تنزيل مدفوعات رحلاتي": "Download my trip payments",
  "جارٍ إعداد صفحة السجلات…": "Preparing this page of records\u2026",
  "تنزيل الصفحة التالية من الحجوزات": "Download the next page of bookings",
  "تنزيل الصفحة التالية من المدفوعات": "Download the next page of payments",
  "تم تنزيل الصفحة. تتوفر صفحة أخرى.": "Page downloaded. Another page is available.",
  "اكتمل تنزيل السجلات المطلوبة.": "Finished downloading the requested records.",
  "تعذر تنزيل سجلات الرحلات. حاول مرة أخرى.": "Could not download trip records. Try again.",
  "عضو HYDROLAND": "HYDROLAND member",
  "موثقة": "Verified",
  "وثائق موثقة": "Verified documents",
  "قيد التحقق": "Verification pending",
  "غير موثقة": "Unverified",
  "مرفوضة": "Rejected",
  "منتهية": "Expired",
  "غير محدد": "Not specified",
  "هواة الغوص": "Divers",
  "محترفي الغوص": "Dive professionals",
  "مركز غوص": "Dive center",
  "الوساطة البحرية": "Marine brokerage",
  "موظف": "Employee",
  "جهة": "Organization",
  "إدارة": "Administration",
  "مراجع": "Reviewer",
  "ACCOUNT SETTINGS · إعدادات الحساب": "ACCOUNT SETTINGS",
  "تعديل الملف الشخصي": "Edit profile",
  "إغلاق": "Close",
  "الاسم الأول": "First name",
  "اسم العائلة": "Last name",
  "الصفة أو المستوى": "Role or level",
  "المنطقة": "Region",
  "بيانات العضوية المستخدمة في العقود": "Membership details used in contracts",
  "اختر الشهادات المسجلة في حسابك. تستخدم العقود بياناتها بعد التحقق وصلاحية المدة؛ لا تنقل الملفات أو التفاصيل الطبية.": "Choose certificates recorded in your account. Contracts use their details after verification and validity checks; files and medical details are not transferred.",
  "شهادة الترخيص الوطني": "National license certificate",
  "شهادة التأهيل / الرتبة الأساسية": "Qualification / primary rank certificate",
  "مرجع أدلة أهلية العمل واللياقة": "Work eligibility and fitness evidence reference",
  "مرجع الملف أو المستند فقط، دون أرقام هوية أو تفاصيل طبية": "File or document reference only; no identity numbers or medical details",
  "تنزيل بيانات الحساب يتضمن الملف الشخصي والملف المهني والأدوار. سجلات الحجوزات والمدفوعات والرسائل غير مشمولة.": "The account data download includes your personal profile, professional profile and roles. Booking, payment and message records are not included.",
  "تنزيل بيانات الحساب": "Download account data",
  "إلغاء": "Cancel",
  "حفظ التغييرات": "Save changes",
  "الاسم الأول مطلوب": "First name is required",
  "جارٍ حفظ البيانات...": "Saving details...",
  "تم الحفظ": "Saved",
  "تعذر حفظ البيانات. تحقق من الاتصال وحاول مرة أخرى.": "Could not save details. Check your connection and try again.",
  "جارٍ تحميل بيانات الغواص...": "Loading diver profile...",
  "تعذر تحميل بيانات الغواص. أعد المحاولة قبل تعديل البيانات.": "Could not load diver profile. Try again before editing.",
  "DIVER PROFILE · ملف الغواص": "DIVER PROFILE",
  "بيانات الغواص والطوارئ": "Diver and emergency details",
  "الجوال الأساسي": "Primary mobile number",
  "الجنسية": "Nationality",
  "اسم جهة اتصال الطوارئ": "Emergency contact name",
  "جوال الطوارئ": "Emergency mobile number",
  "صلة القرابة": "Relationship",
  "فصيلة الدم": "Blood group",
  "حالة اللياقة الطبية": "Medical fitness status",
  "لائق": "Fit",
  "تحتاج مراجعة": "Review needed",
  "غير لائق": "Unfit",
  "انتهاء الفحص الطبي": "Medical examination expiry",
  "إعادة المحاولة": "Retry",
  "حفظ بيانات الغواص": "Save diver details",
  "أدخل اسم جهة اتصال الطوارئ ورقمها معًا، أو اتركهما فارغين.": "Enter both the emergency contact name and number, or leave both blank.",
  "جارٍ الحفظ...": "Saving...",
  "تم حفظ بيانات الغواص": "Diver details saved",
  "سجل الدخول أولًا": "Sign in first",
  "تعذر حفظ بيانات الغواص. تحقق من البيانات والاتصال وحاول مرة أخرى.": "Could not save diver details. Check the details and connection, then try again.",
  "DIVER EQUIPMENT · معدات الغواص": "DIVER EQUIPMENT",
  "إضافة معدة شخصية": "Add personal equipment",
  "نوع المعدة": "Equipment type",
  "الملكية": "Ownership",
  "مملوكة": "Owned",
  "مستأجرة": "Rented",
  "العلامة التجارية": "Brand",
  "الموديل": "Model",
  "الرقم التسلسلي": "Serial number",
  "المقاس": "Size",
  "موعد الصيانة": "Maintenance date",
  "حفظ المعدة": "Save equipment",
  "نوع المعدة مطلوب": "Equipment type is required",
  "تم تحديث المعدة": "Equipment updated",
  "تمت إضافة المعدة": "Equipment added",
  "تعذر حفظ المعدة": "Could not save equipment",
  "المعدات المسجلة": "Recorded equipment",
  "إضافة معدة": "Add equipment",
  "تعديل المعدة": "Edit equipment",
  "تم تحديث حالة المعدة": "Equipment status updated",
  "تعذر تحديث المعدة": "Could not update equipment",
  "لا توجد معدات مسجلة.": "No equipment recorded.",
  " · محظورة بالسياسة": " · Blocked by policy",
  " · تحتاج مراجعة": " · Review needed",
  "· الصيانة:": "· Maintenance:",
  "الحالة": "Status",
  "نشطة": "Active",
  "غير نشطة": "Inactive",
  "مراجعة": "Review",
  "تعديل": "Edit",
  "بدون تفاصيل": "No details",
  "جارٍ إعداد نسخة بيانات الحساب...": "Preparing account data copy...",
  "تم تنزيل بيانات الحساب": "Account data downloaded",
  "تعذر تنزيل بيانات الحساب. حاول مرة أخرى.": "Could not download account data. Try again.",
  "اختر شهادة من مستنداتي": "Choose a certificate from my documents",
  "✓ حساب نشط": "✓ Active account",
  "حالة غير محددة": "Status not specified",
  "الحساب: {0}": "Account: {0}",
  "الحالة: {0}": "Status: {0}",
  "نشط": "Active",
  "قيد المراجعة": "Under review",
  "لا توجد أدوار مفعلة": "No active roles",
  "بدون تاريخ انتهاء": "No expiry date",
  "مستند": "Document",
  "إرفاق رخصة أو شهادة (PDF أو JPG أو PNG، حتى 10 ميجابايت)": "Attach a license or certificate (PDF, JPG or PNG, up to 10 MB)",
  "إرسال للتحقق": "Submit for verification",
  "تظلّم على بياناتي ومتابعة الطلبات": "Personal data grievances and follow-up",
  "عرض المستند": "View document",
  "مرفوع": "Uploaded",
  "لا توجد شهادات محفوظة": "No saved certificates",
  "يمكن إضافة شهادة من زر إضافة شهادة.": "Use Add certificate to add one.",
  "فارغ": "Empty",
  "تعذر تحميل بيانات الغواص والمعدات": "Could not load diver profile and equipment",
  "تعذر تحميل بيانات الحساب من الخادم": "Could not load account details from the server",
  "تم حفظ بيانات الحساب": "Account details saved",
  "تعذر حفظ بيانات الحساب": "Could not save account details",
  "CREDENTIAL · الشهادات": "CREDENTIALS",
  "إضافة شهادة": "Add certificate",
  "الجهة المانحة": "Issuing organization",
  "اسم الشهادة": "Certificate name",
  "رقم الشهادة": "Certificate number",
  "تاريخ الإصدار": "Issue date",
  "تاريخ الانتهاء": "Expiry date",
  "حفظ الشهادة": "Save certificate",
  "الجهة المانحة واسم الشهادة مطلوبان": "Issuing organization and certificate name are required",
  "جارٍ حفظ الشهادة...": "Saving certificate...",
  "تمت إضافة الشهادة": "Certificate added",
  "تعذر حفظ الشهادة": "Could not save certificate",
  "سجل الدخول أولًا لإضافة شهادة": "Sign in before adding a certificate",
  "طلب التحقق": "Request verification",
  "أرفق مستند الشهادة أولًا قبل طلب التحقق": "Attach the certificate document before requesting verification",
  "لا توجد شهادة جاهزة للإرسال للتحقق": "No certificate is ready to submit for verification",
  "تم إرسال الشهادة للتحقق": "Certificate submitted for verification",
  "تعذر إرسال الشهادة للتحقق": "Could not submit the certificate for verification",
  "حجم الملف يجب أن يكون أقل من 10 ميجابايت": "The file must be smaller than 10 MB",
  "الملفات المدعومة PDF وJPG وPNG": "Supported files: PDF, JPG and PNG",
  "جارٍ رفع المستند إلى التخزين الخاص...": "Uploading document to private storage...",
  "تعذر قراءة الملف": "Could not read the file",
  "تم رفع المستند بأمان": "Document uploaded securely",
  "تعذر رفع المستند": "Could not upload the document",
  "تعذر فتح المستند": "Could not open the document",
  "سجل الدخول أولًا لعرض الشهادات": "Sign in to view certificates",
  "تعذر فتح قسم الشهادات": "Could not open the certificates section",
  "سجل الدخول أولًا لفتح بيانات الحساب": "Sign in to open account details",
  "جارٍ تحميل بيانات الحساب...": "Loading account details...",
  "· محظورة بالسياسة": "· Blocked by policy",
  "· تحتاج مراجعة": "· Review needed"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  // Respect live motion preference without changing shortcut authorization or routing.
  const shortcutScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  const auth=()=>window.HydrolandAuth;
  const esc=value=>window.HydrolandUI.esc(value);
  let loadVersion=0,latestLoad=null;const loadPromises=new Map();
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const request=async(path,options={})=>{
    const client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');
    const response=await client(path,options);const body=await response.json().catch(()=>null);
    if(!response.ok){if(response.status===401)throw new Error('AUTH_REQUIRED');throw new Error(body?.message||`HTTP_${response.status}`)}
    return body;
  };
  const text=(v,fallback='—')=>v===null||v===undefined||v===''?fallback:String(v);
  const displayName=profile=>{const first=profile?.person?.firstName||'';const last=profile?.person?.lastName||'';const name=`${first} ${last}`.trim();return name&&name!=='Pending Profile'?name:uiLocale.t('عضو HYDROLAND')};
  const credentialLabel=status=>({VERIFIED:'موثقة',DOCUMENT_VERIFIED:'وثائق موثقة',PENDING:'قيد التحقق',UNVERIFIED:'غير موثقة',REJECTED:'مرفوضة',EXPIRED:'منتهية'})[status]||status||'غير محدد';
  const roleLabel=role=>({DIVER:'هواة الغوص',INSTRUCTOR:'محترفي الغوص',DIVE_CENTER:'مركز غوص',BOAT_OWNER:'الوساطة البحرية',STAFF:'موظف',ORGANIZATION:'جهة',ADMIN:'إدارة',REVIEWER:'مراجع'})[role]||role;
  const normalizeProfile=profile=>({...profile,roles:Array.isArray(profile?.roleAssignments)?profile.roleAssignments:Array.isArray(profile?.roles)?profile.roles:[]});
  const ensureProfileEditor=()=>{let dialog=document.getElementById('hl-profile-editor');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='hl-profile-editor';dialog.className='hl-profile-editor';uiLocale.setHTML(dialog, uiLocale.html`<form method="dialog"><header><div><small>ACCOUNT SETTINGS · إعدادات الحساب</small><h2>تعديل الملف الشخصي</h2></div><button type="button" data-profile-close aria-label="إغلاق">×</button></header><div class="hl-profile-editor-grid"><label>الاسم الأول<input name="firstName" autocomplete="given-name" maxlength="80" required></label><label>اسم العائلة<input name="lastName" autocomplete="family-name" maxlength="80"></label><label>الصفة أو المستوى<input name="headline" maxlength="120"></label><label>المنطقة<input name="regionCode" maxlength="80"></label></div><fieldset><legend>بيانات العضوية المستخدمة في العقود</legend><p>اختر الشهادات المسجلة في حسابك. تستخدم العقود بياناتها بعد التحقق وصلاحية المدة؛ لا تنقل الملفات أو التفاصيل الطبية.</p><div class="hl-profile-editor-grid"><label>شهادة الترخيص الوطني<select name="nationalLicenseCredentialId"></select></label><label>شهادة التأهيل / الرتبة الأساسية<select name="qualificationCredentialId"></select></label><label>مرجع أدلة أهلية العمل واللياقة<textarea name="eligibilityEvidenceReference" maxlength="500" placeholder="مرجع الملف أو المستند فقط، دون أرقام هوية أو تفاصيل طبية"></textarea></label></div></fieldset><p>تنزيل بيانات الحساب يتضمن الملف الشخصي والملف المهني والأدوار. سجلات الحجوزات والمدفوعات والرسائل غير مشمولة.</p><button type="button" data-privacy-grievances>تظلّم على بياناتي ومتابعة الطلبات</button><button type="button" data-profile-export>تنزيل بيانات الحساب</button><p>يمكن تنزيل سجلات الرحلات الشخصية في صفحات تضم حتى ١٠٠ سجل.</p><button type="button" data-trip-export="BOOKINGS">تنزيل حجوزاتي الشخصية</button><button type="button" data-trip-export="PAYMENTS">تنزيل مدفوعات رحلاتي</button><p>يتضمن التنزيل نصوصك ومدد رسائلك الصوتية في المحادثات التي تشارك فيها حاليًا.</p><button type="button" data-trip-export="SENT_MESSAGES">تنزيل رسائلي المرسلة</button><p class="hl-profile-editor-status" role="status" aria-live="polite"></p><footer><button type="button" data-profile-cancel>إلغاء</button><button type="submit" class="primary-button">حفظ التغييرات</button></footer></form>`);const form=dialog.querySelector('form'),close=()=>dialog.close();dialog.querySelector('[data-profile-close]').addEventListener('click',close);dialog.querySelector('[data-profile-cancel]').addEventListener('click',close);dialog.querySelector('[data-profile-export]').addEventListener('click',()=>void downloadAccount(dialog));for(const button of dialog.querySelectorAll('[data-trip-export]'))button.addEventListener('click',()=>void downloadRecordPage(dialog,button));dialog.addEventListener('click',event=>{if(event.target===dialog)close()});form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form),firstName=String(data.get('firstName')||'').trim(),submit=form.querySelector('[type="submit"]'),status=form.querySelector('.hl-profile-editor-status');if(!firstName){uiLocale.setText(status, ...['الاسم الأول مطلوب']);form.elements.firstName.focus({preventScroll:true});return}submit.disabled=true;uiLocale.setText(status, ...['جارٍ حفظ البيانات...']);try{await saveProfile({firstName,lastName:String(data.get('lastName')||'').trim(),headline:String(data.get('headline')||'').trim(),regionCode:String(data.get('regionCode')||'').trim(),nationalLicenseCredentialId:String(data.get('nationalLicenseCredentialId')||'')||null,qualificationCredentialId:String(data.get('qualificationCredentialId')||'')||null,eligibilityEvidenceReference:String(data.get('eligibilityEvidenceReference')||'').trim()||null});uiLocale.setText(status, ...['تم الحفظ']);close()}catch{uiLocale.setText(status, ...['تعذر حفظ البيانات. تحقق من الاتصال وحاول مرة أخرى.'])}finally{submit.disabled=false}});document.body.appendChild(dialog);return dialog};
  let diverEditorVersion=0;
  const populateDiverEditor=async dialog=>{
    const form=dialog.querySelector('form'),grid=form.querySelector('.hl-profile-editor-grid'),status=form.querySelector('.hl-profile-editor-status'),submit=form.querySelector('[type="submit"]'),retry=form.querySelector('[data-diver-retry]');
    const version=++diverEditorVersion,sessionVersion=auth().getSessionVersion();
    const current=()=>version===diverEditorVersion&&sessionVersion===auth()?.getSessionVersion()&&auth()?.isAuthenticated?.()&&dialog.isConnected&&dialog.open;
    form.dataset.profileReady='0';form.setAttribute('aria-busy','true');grid.hidden=true;submit.disabled=true;retry.hidden=true;uiLocale.setText(status, ...['جارٍ تحميل بيانات الغواص...']);
    if(window.HydrolandProfileData?.diverProfileAvailable!==true)await load();
    if(!current())return;
    form.removeAttribute('aria-busy');
    if(window.HydrolandProfileData?.diverProfileAvailable!==true){
      uiLocale.setText(status, ...['تعذر تحميل بيانات الغواص. أعد المحاولة قبل تعديل البيانات.']);retry.hidden=false;return;
    }
    const p=window.HydrolandProfileData.diverProfile||{};
    ['primaryPhone','nationality','emergencyName','emergencyPhone','emergencyRelation','bloodType','medicalFitnessStatus'].forEach(k=>{form.elements[k].value=p[k]||(k==='medicalFitnessStatus'?'UNKNOWN':'')});
    form.elements.medicalClearanceExpiresAt.value=p.medicalClearanceExpiresAt?String(p.medicalClearanceExpiresAt).slice(0,10):'';
    grid.querySelectorAll('input,select').forEach(input=>{input.disabled=false});
    grid.hidden=false;form.dataset.profileReady='1';submit.disabled=false;status.textContent='';
  };
  const ensureDiverEditor=()=>{
    let dialog=document.getElementById('hl-diver-editor');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='hl-diver-editor';dialog.className='hl-profile-editor';
    uiLocale.setHTML(dialog, uiLocale.html`<form><header><div><small>DIVER PROFILE · ملف الغواص</small><h2>بيانات الغواص والطوارئ</h2></div><button type="button" data-diver-close aria-label="إغلاق">×</button></header><div class="hl-profile-editor-grid"><label>الجوال الأساسي<input name="primaryPhone" type="tel" maxlength="30"></label><label>الجنسية<input name="nationality" maxlength="80"></label><label>اسم جهة اتصال الطوارئ<input name="emergencyName" maxlength="120"></label><label>جوال الطوارئ<input name="emergencyPhone" type="tel" maxlength="30"></label><label>صلة القرابة<input name="emergencyRelation" maxlength="80"></label><label>فصيلة الدم<input name="bloodType" maxlength="10"></label><label>حالة اللياقة الطبية<select name="medicalFitnessStatus"><option value="UNKNOWN">غير محدد</option><option value="FIT">لائق</option><option value="REVIEW">تحتاج مراجعة</option><option value="UNFIT">غير لائق</option></select></label><label>انتهاء الفحص الطبي<input name="medicalClearanceExpiresAt" type="date"></label></div><p class="hl-profile-editor-status" role="status" aria-live="polite"></p><button type="button" data-diver-retry hidden>إعادة المحاولة</button><footer><button type="button" data-diver-cancel>إلغاء</button><button type="submit" class="primary-button">حفظ بيانات الغواص</button></footer></form>`);
    const form=dialog.querySelector('form'),close=()=>dialog.close();
    dialog.querySelector('[data-diver-close]').addEventListener('click',close);
    dialog.querySelector('[data-diver-cancel]').addEventListener('click',close);
    dialog.querySelector('[data-diver-retry]').addEventListener('click',()=>populateDiverEditor(dialog));
    dialog.addEventListener('close',()=>{if(dialog.open)return;diverEditorVersion++;form.dataset.profileReady='0'});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.profileReady!=='1')return;
      const d=new FormData(form),status=form.querySelector('.hl-profile-editor-status'),submit=form.querySelector('[type="submit"]');
      const body={primaryPhone:String(d.get('primaryPhone')||'').trim()||null,nationality:String(d.get('nationality')||'').trim()||null,emergencyName:String(d.get('emergencyName')||'').trim()||null,emergencyPhone:String(d.get('emergencyPhone')||'').trim()||null,emergencyRelation:String(d.get('emergencyRelation')||'').trim()||null,bloodType:String(d.get('bloodType')||'').trim()||null,medicalFitnessStatus:String(d.get('medicalFitnessStatus')||'UNKNOWN'),medicalClearanceExpiresAt:String(d.get('medicalClearanceExpiresAt')||'')||null};
      if(Boolean(body.emergencyName)!==Boolean(body.emergencyPhone)){
        uiLocale.setText(status, ...['أدخل اسم جهة اتصال الطوارئ ورقمها معًا، أو اتركهما فارغين.']);
        form.elements[body.emergencyName?'emergencyPhone':'emergencyName'].focus({preventScroll:true});return;
      }
      const version=diverEditorVersion,sessionVersion=auth().getSessionVersion();
      const current=()=>version===diverEditorVersion&&sessionVersion===auth()?.getSessionVersion()&&dialog.isConnected&&dialog.open;
      form.dataset.profileReady='0';form.setAttribute('aria-busy','true');submit.disabled=true;
      form.querySelectorAll('input,select').forEach(input=>{input.disabled=true});uiLocale.setText(status, ...['جارٍ الحفظ...']);
      try{
        await request('/me/diver-profile',{method:'PATCH',body:JSON.stringify(body)});
        if(!current())return;
        toast(uiLocale.message('تم حفظ بيانات الغواص'));close();await load();
      }catch(error){
        if(current())uiLocale.setText(status, ...[error.message==='AUTH_REQUIRED'?'سجل الدخول أولًا':'تعذر حفظ بيانات الغواص. تحقق من البيانات والاتصال وحاول مرة أخرى.']);
      }finally{
        if(current()){form.dataset.profileReady='1';form.removeAttribute('aria-busy');submit.disabled=false;form.querySelectorAll('input,select').forEach(input=>{input.disabled=false})}
      }
    });
    document.body.appendChild(dialog);return dialog;
  };
  const openDiverEditor=()=>{const dialog=ensureDiverEditor();window.HydrolandUI.openDialog(dialog);void populateDiverEditor(dialog)};
  const ensureEquipmentEditor=()=>{let dialog=document.getElementById('hl-equipment-editor');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='hl-equipment-editor';dialog.className='hl-profile-editor';uiLocale.setHTML(dialog, uiLocale.html`<form><header><div><small>DIVER EQUIPMENT · معدات الغواص</small><h2>إضافة معدة شخصية</h2></div><button type="button" data-equipment-close aria-label="إغلاق">×</button></header><div class="hl-profile-editor-grid"><label>نوع المعدة<input name="category" maxlength="80" required placeholder="BCD / REGULATOR / COMPUTER"></label><label>الملكية<select name="ownership"><option value="OWNED">مملوكة</option><option value="RENTED">مستأجرة</option></select></label><label>العلامة التجارية<input name="brand" maxlength="80"></label><label>الموديل<input name="model" maxlength="80"></label><label>الرقم التسلسلي<input name="serialNumber" maxlength="120"></label><label>المقاس<input name="size" maxlength="40"></label><label>موعد الصيانة<input name="serviceDueAt" type="date"></label></div><p class="hl-profile-editor-status" role="status"></p><footer><button type="button" data-equipment-cancel>إلغاء</button><button type="submit" class="primary-button">حفظ المعدة</button></footer></form>`);const form=dialog.querySelector('form'),close=()=>dialog.close();dialog.querySelector('[data-equipment-close]').addEventListener('click',close);dialog.querySelector('[data-equipment-cancel]').addEventListener('click',close);form.addEventListener('submit',async event=>{event.preventDefault();const d=new FormData(form),status=form.querySelector('.hl-profile-editor-status'),submit=form.querySelector('[type="submit"]'),body={category:String(d.get('category')||'').trim(),ownership:String(d.get('ownership')||'OWNED'),brand:String(d.get('brand')||'').trim()||undefined,model:String(d.get('model')||'').trim()||undefined,serialNumber:String(d.get('serialNumber')||'').trim()||undefined,size:String(d.get('size')||'').trim()||undefined,serviceDueAt:String(d.get('serviceDueAt')||'')||null};if(!body.category){uiLocale.setText(status, ...['نوع المعدة مطلوب']);return}submit.disabled=true;uiLocale.setText(status, ...['جارٍ الحفظ...']);try{const equipmentId=form.dataset.equipmentId;if(equipmentId){delete body.category;await request('/me/diver-profile/equipment/'+encodeURIComponent(equipmentId),{method:'PATCH',body:JSON.stringify(body)});toast(uiLocale.message('تم تحديث المعدة'))}else{await request('/me/diver-profile/equipment',{method:'POST',body:JSON.stringify(body)});toast(uiLocale.message('تمت إضافة المعدة'))}form.reset();delete form.dataset.equipmentId;form.elements.category.disabled=false;uiLocale.setText(dialog.querySelector('h2'), ...['إضافة معدة شخصية']);close();await load()}catch(error){uiLocale.setMessage(status, localErrorMessage(error)||uiLocale.message('تعذر حفظ المعدة'))}finally{submit.disabled=false}});document.body.appendChild(dialog);return dialog};
  const openEquipmentEditor=()=>{if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا'));return}const dialog=ensureEquipmentEditor(),form=dialog.querySelector('form');form.reset();delete form.dataset.equipmentId;form.elements.category.disabled=false;uiLocale.setText(dialog.querySelector('h2'), ...['إضافة معدة شخصية']);window.HydrolandUI.openDialog(dialog)};
  const ensureEquipmentList=()=>{let dialog=document.getElementById('hl-equipment-list');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='hl-equipment-list';dialog.className='hl-profile-editor';uiLocale.setHTML(dialog, uiLocale.html`<section><header><div><small>DIVER EQUIPMENT · معدات الغواص</small><h2>المعدات المسجلة</h2></div><button type="button" data-equipment-list-close aria-label="إغلاق">×</button></header><div data-equipment-list-body></div><footer><button type="button" data-equipment-add>إضافة معدة</button><button type="button" data-equipment-list-done>إغلاق</button></footer></section>`);const close=()=>dialog.close();dialog.querySelector('[data-equipment-list-close]').addEventListener('click',close);dialog.querySelector('[data-equipment-list-done]').addEventListener('click',close);dialog.querySelector('[data-equipment-add]').addEventListener('click',()=>{close();openEquipmentEditor()});dialog.addEventListener('click',event=>{const btn=event.target.closest?.('[data-equipment-edit]');if(!btn)return;const item=(window.HydrolandProfileData?.equipment||[]).find(x=>x.id===btn.dataset.equipmentEdit);if(!item)return;close();const editor=ensureEquipmentEditor(),form=editor.querySelector('form');form.dataset.equipmentId=item.id;form.elements.category.value=item.category||'';form.elements.category.disabled=true;form.elements.ownership.value=item.ownership||'OWNED';form.elements.brand.value=item.brand||'';form.elements.model.value=item.model||'';form.elements.serialNumber.value=item.serialNumber||'';form.elements.size.value=item.size||'';form.elements.serviceDueAt.value=item.serviceDueAt?String(item.serviceDueAt).slice(0,10):'';uiLocale.setText(editor.querySelector('h2'), ...['تعديل المعدة']);window.HydrolandUI.openDialog(editor)});dialog.addEventListener('change',async event=>{const select=event.target.closest?.('[data-equipment-status]');if(!select)return;const id=select.dataset.equipmentStatus,previous=select.dataset.previous;select.disabled=true;try{await request('/me/diver-profile/equipment/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:select.value})});toast(uiLocale.message('تم تحديث حالة المعدة'));await load();renderEquipmentList(dialog)}catch(error){select.value=previous;toast((localErrorMessage(error) || uiLocale.message('تعذر تحديث المعدة')))}finally{select.disabled=false}});document.body.appendChild(dialog);return dialog};
  const renderEquipmentList=dialog=>{const body=dialog.querySelector('[data-equipment-list-body]'),items=window.HydrolandProfileData?.equipment||[];uiLocale.setHTML(body, '');if(!items.length){uiLocale.setHTML(body, uiLocale.html`<p>لا توجد معدات مسجلة.</p>`);return}items.forEach(item=>{const row=document.createElement('article');row.className='hl-equipment-row';const due=item.serviceDueAt?new Date(item.serviceDueAt).toLocaleDateString('ar-SA'):uiLocale.t('غير محدد'),blocked=item.policyReview?.blocked?uiLocale.t(' · محظورة بالسياسة'):'',review=item.policyReview?.required?uiLocale.t(' · تحتاج مراجعة'):'';uiLocale.setHTML(row, uiLocale.html`<div><b>${esc(text(item.category))}</b><small>${esc([item.brand,item.model,item.serialNumber].filter(Boolean).join(' · ')||uiLocale.t('بدون تفاصيل'))} · الصيانة: ${due}${blocked}${review}</small></div><label>الحالة<select data-equipment-status="${esc(item.id)}" data-previous="${esc(item.status)}"><option value="ACTIVE">نشطة</option><option value="INACTIVE">غير نشطة</option><option value="REVIEW">مراجعة</option></select></label><button type="button" data-equipment-edit="${esc(item.id)}">تعديل</button>`);row.querySelector('select').value=item.status;body.appendChild(row)})};
  const openEquipmentList=()=>{if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا'));return}const dialog=ensureEquipmentList();renderEquipmentList(dialog);window.HydrolandUI.openDialog(dialog)};
  function saveExport(data, filename) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const exportLabels = {
    BOOKINGS: ['تنزيل حجوزاتي الشخصية','تنزيل الصفحة التالية من الحجوزات'],
    PAYMENTS: ['تنزيل مدفوعات رحلاتي','تنزيل الصفحة التالية من المدفوعات'],
    SENT_MESSAGES: ['تنزيل رسائلي المرسلة','تنزيل الصفحة التالية من الرسائل'],
  };
  async function downloadRecordPage(dialog,button) {
    const status=dialog.querySelector('.hl-profile-editor-status'), session=auth()?.getSessionVersion(), view=dialog.dataset.exportView;
    const current=()=>auth()?.isAuthenticated?.()&&auth().getSessionVersion()===session&&dialog.isConnected&&dialog.open&&dialog.dataset.exportView===view;
    if(!current()){uiLocale.setText(status, 'سجل الدخول أولًا');return}
    const domain=button.dataset.tripExport, after=button.dataset.after||'', page=Number(button.dataset.page||1);
    button.disabled=true;uiLocale.setText(status, 'جارٍ إعداد صفحة السجلات…');
    try {
      const sentMessages=domain==='SENT_MESSAGES';
      const path=sentMessages?'/me/data-export/sent-messages':'/me/data-export/trip-records';
      const schema=sentMessages?'PERSONAL_SENT_MESSAGES_V1':'PERSONAL_TRIP_RECORDS_V1';
      const data=await request(path,{method:'POST',body:JSON.stringify(sentMessages?{after}:{domain,after})});
      if(!current())return;
      if(data?.schemaVersion!==schema||data.completePlatformExport!==false||data.accountId!==window.HydrolandProfileData?.profile?.id||data.domain!==domain||!Array.isArray(data.records)||
        !(data.nextCursor===null||(typeof data.nextCursor==='string'&&data.nextCursor.length>0&&data.nextCursor!==after)))throw Error('INVALID_EXPORT');
      const prefix=sentMessages?'hydroland-sent-messages':'hydroland-trip-'+domain.toLowerCase();
      saveExport(data,prefix+'-'+page+'.json');
      if(data.nextCursor){
        button.dataset.after=data.nextCursor;button.dataset.page=String(page+1);
        uiLocale.setText(button, exportLabels[domain][1]);
      }else{button.dataset.done='true'}
      uiLocale.setText(status, data.nextCursor?'تم تنزيل الصفحة. تتوفر صفحة أخرى.':'اكتمل تنزيل السجلات المطلوبة.');
    }catch{if(current())uiLocale.setText(status, 'تعذر تنزيل السجلات. حاول مرة أخرى.')}
    finally{if(current())button.disabled=button.dataset.done==='true'}
  }
  const downloadAccount=async dialog=>{
    const button=dialog.querySelector('[data-profile-export]'),status=dialog.querySelector('.hl-profile-editor-status');
    if(!auth()?.isAuthenticated?.()){uiLocale.setText(status, ...['سجل الدخول أولًا']);return}
    const sessionVersion=auth().getSessionVersion();
    const current=()=>auth()?.isAuthenticated?.()&&auth().getSessionVersion()===sessionVersion&&dialog.isConnected&&dialog.open;
    button.disabled=true;uiLocale.setText(status, ...['جارٍ إعداد نسخة بيانات الحساب...']);
    try{
      const data=await request('/me/data-export',{method:'POST',body:'{}'});
      if(!current())return;
      if(data?.schemaVersion!=='ACCOUNT_PROFILE_EXPORT_V1'||data?.completePlatformExport!==false||data?.data?.id!==window.HydrolandProfileData?.profile?.id)throw new Error('INVALID_ACCOUNT_EXPORT');
      saveExport(data,'hydroland-account-profile.json');
      uiLocale.setText(status, ...['تم تنزيل بيانات الحساب']);
    }catch(error){if(current())uiLocale.setText(status, ...[error.message==='AUTH_REQUIRED'?'سجل الدخول أولًا':'تعذر تنزيل بيانات الحساب. حاول مرة أخرى.'])}
    finally{if(current())button.disabled=false}
  };
  const openProfileEditor=profile=>{const dialog=ensureProfileEditor(),form=dialog.querySelector('form');form.elements.firstName.value=profile?.person?.firstName==='Pending'?'':profile?.person?.firstName||'';form.elements.lastName.value=profile?.person?.lastName==='Profile'?'':profile?.person?.lastName||'';form.elements.headline.value=profile?.person?.professional?.headline||'';form.elements.regionCode.value=profile?.person?.professional?.regionCode||'';const source=profile?.person?.professional||{};for(const key of ['nationalLicenseCredentialId','qualificationCredentialId']){const select=form.elements[key];uiLocale.setHTML(select, uiLocale.html`<option value="">اختر شهادة من مستنداتي</option>${(window.HydrolandProfileData?.credentials||[]).map(c=>uiLocale.html`<option value="${esc(c.id)}">${esc(c.issuer)} - ${esc(c.title)}</option>`).join('')}`);select.value=source[key]||''}form.elements.eligibilityEvidenceReference.value=source.eligibilityEvidenceReference||'';form.querySelector('.hl-profile-editor-status').textContent='';form.querySelector('[data-profile-export]').disabled=false;
  dialog.dataset.exportView=String(Number(dialog.dataset.exportView||0)+1);
    for(const button of dialog.querySelectorAll('[data-trip-export]')){
      delete button.dataset.after;delete button.dataset.page;delete button.dataset.done;button.disabled=false;
      uiLocale.setText(button, exportLabels[button.dataset.tripExport][0]);
    }
    window.HydrolandUI.openDialog(dialog);form.elements.firstName.focus({preventScroll:true})};

  function renderProfile(profile,credentials=[]){
    const dash=document.querySelector('.hl-profile-dashboard');
    if(dash){
      const name=displayName(profile);const pro=profile?.person?.professional;const avatar=dash.querySelector('.hl-profile-avatar');if(avatar)avatar.textContent=name.trim().charAt(0)||'H';
      const h3=dash.querySelector('h3');if(h3)h3.textContent=name;
      const p=dash.querySelector('header p');if(p)p.textContent=[pro?.headline,pro?.regionCode].filter(Boolean).join(' · ')||text(profile?.email);
      const verified=dash.querySelector('.hl-verified');if(verified){const active=profile?.status==='ACTIVE';verified.textContent=active?uiLocale.t('✓ حساب نشط'):text(profile?.status,uiLocale.t('حالة غير محددة'));verified.classList.toggle('pending',!active)}
      const stats=dash.querySelectorAll('.hl-profile-stats strong');if(stats[0])stats[0].textContent='—';if(stats[1])stats[1].textContent=String(credentials.length);if(stats[2])stats[2].textContent=String((profile?.roles||[]).filter(r=>r.status==='ACTIVE').length);
    }
    const member=document.querySelector('.hl-pass-card');if(member){const paragraphs=member.querySelectorAll('p');if(paragraphs[0])uiLocale.setText(paragraphs[0], ...["الحساب: {0}", [text(profile?.email)]]);if(paragraphs[1])uiLocale.setText(paragraphs[1], ...["الحالة: {0}", [text(profile?.status)]]);let roles=member.querySelector('.hl-role-statuses');if(!roles){roles=document.createElement('div');roles.className='hl-role-statuses';member.appendChild(roles)}uiLocale.setHTML(roles, (profile?.roles||[]).map(r=>uiLocale.html`<span>${uiLocale.label(roleLabel(r.role))} · ${esc(r.status==='ACTIVE'?uiLocale.t('نشط'):r.status==='PENDING_REVIEW'?uiLocale.t('قيد المراجعة'):r.status)}</span>`).join('')||uiLocale.html`<span>لا توجد أدوار مفعلة</span>`)}
    const certHost=document.querySelector('.hl-certificates');if(certHost){certHost.querySelectorAll(':scope > article').forEach(n=>n.remove());const action=certHost.querySelector('.hl-member-actions');credentials.forEach(c=>{const article=document.createElement('article');const exp=c.expiresAt?new Date(c.expiresAt).toLocaleDateString('ar-SA'):uiLocale.t('بدون تاريخ انتهاء');const docs=Array.isArray(c.documents)?c.documents:[];article.dataset.credentialId=c.id;uiLocale.setHTML(article, uiLocale.html`<div><b>${esc(text(c.title))}</b><small>${esc(text(c.issuer))} · ${exp}</small></div><span class="hl-status ${['VERIFIED','DOCUMENT_VERIFIED'].includes(c.verificationStatus)?'ok':'review'}">${uiLocale.label(credentialLabel(c.verificationStatus))}</span><span class="hl-status review">${docs.length} مستند</span><div class="hl-credential-documents">${docs.map(d=>uiLocale.html`<div><span>${esc(d.originalName||uiLocale.t('مستند'))}</span> <span class="hl-status review">${esc(d.status||uiLocale.t('مرفوع'))}</span> <button type="button" data-credential-open="${esc(d.id)}" data-credential-id="${esc(c.id)}">عرض المستند</button></div>`).join('')}<label>إرفاق رخصة أو شهادة (PDF أو JPG أو PNG، حتى 10 ميجابايت)<input type="file" data-credential-upload="${esc(c.id)}" accept="application/pdf,image/jpeg,image/png" ${c.verificationStatus==='UNVERIFIED'?'':'disabled'}></label><button type="button" data-credential-submit="${esc(c.id)}" ${docs.length&&c.verificationStatus==='UNVERIFIED'?'':'disabled'}>إرسال للتحقق</button><p data-credential-feedback role="status"></p></div>`);certHost.insertBefore(article,action)});if(!credentials.length){const article=document.createElement('article');uiLocale.setHTML(article, uiLocale.html`<div><b>لا توجد شهادات محفوظة</b><small>يمكن إضافة شهادة من زر إضافة شهادة.</small></div><span class="hl-status review">فارغ</span>`);certHost.insertBefore(article,action)}}
  }
  async function load(){
    if(!auth()?.isAuthenticated?.()){window.HydrolandProfileData=undefined;return;}
    const version=++loadVersion,sessionVersion=auth().getSessionVersion();
    const currentSession=()=>sessionVersion===auth()?.getSessionVersion()&&auth()?.isAuthenticated?.();
    // A superseded caller must wait for the replacement to publish its result.
    // Otherwise a retry can inspect stale availability while a background load is pending.
    const replacement=()=>{if(!currentSession())return;for(let next=version+1;next<=loadVersion;next++){const entry=loadPromises.get(next);if(entry?.sessionVersion===sessionVersion)return entry.promise}};
    const promise=(async()=>{
      try{
        const [profile,credentials,diverResult]=await Promise.all([
          request('/me'),request('/credentials'),
          request('/me/diver-profile').then(data=>({ok:true,data})).catch(error=>({ok:false,error}))
        ]);
        if(!currentSession())return;
        if(version!==loadVersion)return replacement();
        const normalizedProfile=normalizeProfile(profile);
        renderProfile(normalizedProfile,Array.isArray(credentials)?credentials:[]);
        const diver=diverResult.ok?diverResult.data:null;
        window.HydrolandProfileData={profile:normalizedProfile,credentials,diverProfile:diver?.profile||null,equipment:Array.isArray(diver?.equipment)?diver.equipment:[],diverProfileAvailable:diverResult.ok};
        document.dispatchEvent(new CustomEvent('hydroland:profile-data-ready'));
        if(!diverResult.ok&&diverResult.error?.message!=='AUTH_REQUIRED')toast(uiLocale.message('تعذر تحميل بيانات الغواص والمعدات'));
        bindCredentialActions();
        return window.HydrolandProfileData;
      }catch(error){
        if(!currentSession())return;
        if(version!==loadVersion)return replacement();
        if(error.message!=='AUTH_REQUIRED'&&error.message!=='AUTH_CANCELLED')toast(uiLocale.message('تعذر تحميل بيانات الحساب من الخادم'));
      }
    })();
    const entry={version,sessionVersion,promise};latestLoad=entry;loadPromises.set(version,entry);
    promise.finally(()=>{if(loadPromises.get(version)?.promise===promise)loadPromises.delete(version)});
    return promise;
  }
  async function saveProfile(input){try{const updated=await request('/me',{method:'PATCH',body:JSON.stringify(input)});toast(uiLocale.message('تم حفظ بيانات الحساب'));await load();return updated}catch(error){toast(error.message==='AUTH_REQUIRED'?uiLocale.message('سجل الدخول أولًا'):uiLocale.message('تعذر حفظ بيانات الحساب'));throw error}}
  const ensureCredentialDialog=()=>{let dialog=document.getElementById('hl-credential-editor');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='hl-credential-editor';dialog.className='hl-profile-editor';uiLocale.setHTML(dialog, uiLocale.html`<form><header><div><small>CREDENTIAL · الشهادات</small><h2>إضافة شهادة</h2></div><button type="button" data-credential-close aria-label="إغلاق">×</button></header><div class="hl-profile-editor-grid"><label>الجهة المانحة<input name="issuer" maxlength="120" required></label><label>اسم الشهادة<input name="title" maxlength="160" required></label><label>رقم الشهادة<input name="credentialNumber" maxlength="120"></label><label>تاريخ الإصدار<input name="issuedAt" type="date"></label><label>تاريخ الانتهاء<input name="expiresAt" type="date"></label></div><p class="hl-profile-editor-status" role="status" aria-live="polite"></p><footer><button type="button" data-credential-cancel>إلغاء</button><button type="submit" class="primary-button">حفظ الشهادة</button></footer></form>`);const form=dialog.querySelector('form'),close=()=>dialog.close();dialog.querySelector('[data-credential-close]').addEventListener('click',close);dialog.querySelector('[data-credential-cancel]').addEventListener('click',close);form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form),status=form.querySelector('.hl-profile-editor-status'),submit=form.querySelector('[type="submit"]'),body={issuer:String(data.get('issuer')||'').trim(),title:String(data.get('title')||'').trim(),credentialNumber:String(data.get('credentialNumber')||'').trim()||undefined,issuedAt:String(data.get('issuedAt')||'')||undefined,expiresAt:String(data.get('expiresAt')||'')||undefined};if(!body.issuer||!body.title){uiLocale.setText(status, ...['الجهة المانحة واسم الشهادة مطلوبان']);return}submit.disabled=true;uiLocale.setText(status, ...['جارٍ حفظ الشهادة...']);try{await request('/credentials',{method:'POST',body:JSON.stringify(body)});form.reset();close();toast(uiLocale.message('تمت إضافة الشهادة'));await load()}catch(error){uiLocale.setText(status, ...[error.message==='AUTH_REQUIRED'?'سجل الدخول أولًا':'تعذر حفظ الشهادة'])}finally{submit.disabled=false}});document.body.appendChild(dialog);return dialog};
  const bindCredentialActions=()=>{const actions=document.querySelector('.hl-certificates .hl-member-actions');if(!actions)return;const buttons=actions.querySelectorAll('button'),add=buttons[0],submit=buttons[1];if(add&&!add.dataset.hlCredentialBound){add.disabled=false;uiLocale.setText(add, ...['إضافة شهادة']);add.dataset.hlCredentialBound='1';add.addEventListener('click',()=>{if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا لإضافة شهادة'));return}window.HydrolandUI.openDialog(ensureCredentialDialog())})}if(submit&&!submit.dataset.hlCredentialBound){submit.disabled=false;uiLocale.setText(submit, ...['طلب التحقق']);submit.dataset.hlCredentialBound='1';submit.addEventListener('click',async()=>{if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا'));return}const credentials=window.HydrolandProfileData?.credentials||[];const candidate=credentials.find(c=>c.verificationStatus==='UNVERIFIED'&&Array.isArray(c.documents)&&c.documents.length>0);if(!candidate){const missingDocument=credentials.some(c=>c.verificationStatus==='UNVERIFIED'&&(!Array.isArray(c.documents)||c.documents.length===0));toast(missingDocument?uiLocale.message('أرفق مستند الشهادة أولًا قبل طلب التحقق'):uiLocale.message('لا توجد شهادة جاهزة للإرسال للتحقق'));return}submit.disabled=true;try{await request(`/credentials/${encodeURIComponent(candidate.id)}/submit`,{method:'POST'});toast(uiLocale.message('تم إرسال الشهادة للتحقق'));await load()}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر إرسال الشهادة للتحقق')))}finally{submit.disabled=false}})}};
  document.addEventListener('change',async event=>{const input=event.target.closest?.('[data-credential-upload]');if(!input||!input.closest('.hl-certificates')||!input.files?.length)return;const file=input.files[0],feedback=input.closest('.hl-credential-documents')?.querySelector('[data-credential-feedback]');if(file.size<1||file.size>10*1024*1024){if(feedback)uiLocale.setText(feedback, ...['حجم الملف يجب أن يكون أقل من 10 ميجابايت']);input.value='';return}if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){if(feedback)uiLocale.setText(feedback, ...['الملفات المدعومة PDF وJPG وPNG']);input.value='';return}input.disabled=true;if(feedback)uiLocale.setText(feedback, ...['جارٍ رفع المستند إلى التخزين الخاص...']);try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(localError(uiLocale.message('تعذر قراءة الملف')));reader.readAsDataURL(file)});await request('/credentials/'+encodeURIComponent(input.dataset.credentialUpload)+'/documents',{method:'POST',body:JSON.stringify({originalName:file.name,mimeType:file.type,base64})});toast(uiLocale.message('تم رفع المستند بأمان'));await load()}catch(error){if(feedback)uiLocale.setMessage(feedback, localErrorMessage(error)||uiLocale.message('تعذر رفع المستند'))}finally{input.disabled=false;input.value=''}});
  document.addEventListener('click',async event=>{if(!event.target.closest?.('.hl-certificates'))return;const submitButton=event.target.closest?.('[data-credential-submit]');if(submitButton){submitButton.disabled=true;try{await request('/credentials/'+encodeURIComponent(submitButton.dataset.credentialSubmit)+'/submit',{method:'POST'});toast(uiLocale.message('تم إرسال الشهادة للتحقق'));await load()}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر إرسال الشهادة للتحقق')));submitButton.disabled=false}return}const button=event.target.closest?.('[data-credential-open]');if(!button)return;button.disabled=true;try{const access=await request('/credentials/'+encodeURIComponent(button.dataset.credentialId)+'/documents/'+encodeURIComponent(button.dataset.credentialOpen)+'/access');const tab=window.open('about:blank','_blank','noopener,noreferrer');if(tab){tab.opener=null;tab.location=access.url}else window.location.assign(access.url)}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر فتح المستند')))}finally{button.disabled=false}});
  document.addEventListener('click',event=>{const btn=event.target.closest?.('[data-hl-action="certs"]');if(!btn)return;event.preventDefault();if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا لعرض الشهادات'));return}const host=document.querySelector('.hl-certificates');if(host){document.getElementById('profile-dialog')?.close();window.HydrolandWorkspaceUI?.show?.(host);host.scrollIntoView({behavior:shortcutScrollBehavior(),block:'start'});return}toast(uiLocale.message('تعذر فتح قسم الشهادات'))});
  document.addEventListener('click',event=>{const btn=event.target.closest?.('[data-hl-action="diver-equipment-list"]');if(!btn)return;event.preventDefault();openEquipmentList()});
  document.addEventListener('click',event=>{const btn=event.target.closest?.('[data-hl-action="diver-equipment"]');if(!btn)return;event.preventDefault();openEquipmentEditor()});
  document.addEventListener('click',event=>{const btn=event.target.closest?.('[data-hl-action="diver-profile"]');if(!btn)return;event.preventDefault();if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا'));return}openDiverEditor()});
  document.addEventListener('click',async event=>{const btn=event.target.closest?.('[data-hl-action="settings"]');if(!btn)return;event.preventDefault();if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجل الدخول أولًا لفتح بيانات الحساب'));return}let current=window.HydrolandProfileData?.profile;if(!current){toast(uiLocale.message('جارٍ تحميل بيانات الحساب...'));await load();current=window.HydrolandProfileData?.profile;if(!current)return}openProfileEditor(current)});
  document.addEventListener('hydroland:session-cleared',()=>{const editor=document.getElementById('hl-profile-editor');if(editor){editor.querySelector('form')?.reset();editor.querySelectorAll('select').forEach(select=>select.replaceChildren());editor.querySelector('.hl-profile-editor-status').textContent='';editor.querySelector('[data-profile-export]').disabled=false;if(editor.open)editor.close()}loadVersion++;latestLoad=null;loadPromises.clear();window.HydrolandProfileData=undefined;renderProfile({},[])});
  document.addEventListener('hydroland:session-refreshed',()=>void load());
  document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.())window.HydrolandProfileData=undefined;load()});setTimeout(load,500);window.HydrolandProfile={load,saveProfile,edit:()=>{if(auth()?.isAuthenticated?.()&&window.HydrolandProfileData?.profile)openProfileEditor(window.HydrolandProfileData.profile)}};
})();
