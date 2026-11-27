(() => {
  const ui=window.HydrolandI18n.createScope('notification-preferences',{
  "خيارات الإشعارات": "Notification preferences",
  "إغلاق": "Close",
  "تجددت الجلسة. اطلب رمز هاتف جديد عند الحاجة.": "Your session was renewed. Request a new phone code if needed.",
  "تعذر الاتصال. تحقق من الاتصال ثم أعد المحاولة.": "Connection unavailable. Check your connection and try again.",
  "جارٍ تنفيذ الطلب…": "Working…",
  "تغيرت الجلسة أو تعذر تنفيذ الطلب. أعد فتح الخيارات.": "The session changed or the request failed. Reopen preferences.",
  "الحجوزات والفواتير": "Bookings and invoices",
  "تبقى الإشعارات داخل المنصة محفوظة. اختر القنوات الإضافية والأوقات المناسبة لك.": "In-app notices remain available. Choose additional channels and suitable times.",
  "البريد الإلكتروني": "Email",
  "رسالة نصية": "SMS",
  "واتساب": "WhatsApp",
  "تنبيهات التطبيق على جهاز مسجل": "App alerts on a registered device",
  "تأكيد الحجوزات": "Booking confirmations",
  "إصدار الفواتير": "Issued invoices",
  "غير متاحة حاليًا": "Currently unavailable",
  "بدء ساعات الهدوء": "Quiet hours start",
  "نهاية ساعات الهدوء": "Quiet hours end",
  "المنطقة الزمنية": "Time zone",
  "أوافق على خيارات إشعارات الحجوزات والفواتير المحددة.": "I agree to the selected booking and invoice notification options.",
  "تم حفظ خيارات الإشعارات.": "Notification preferences saved.",
  "حفظ الخيارات": "Save preferences",
  "اترك وقتَي الهدوء فارغين لاستقبال الرسائل في أي وقت. تسري هذه الخيارات على القنوات الإضافية والبريد لهذه الأحداث.": "Leave both times empty to receive messages at any time. These options apply to additional channels and email for these events.",
  "هاتف الإشعارات": "Notification phone",
  "الهاتف موثّق: {0}": "Verified phone: {0}",
  "لم يوثّق هاتف للإشعارات بعد.": "No notification phone verified yet.",
  "أؤكد إزالة الهاتف وإيقاف رسائله النصية وواتساب.": "Remove this phone and stop its SMS and WhatsApp notices.",
  "إزالة الهاتف": "Remove phone",
  "أزيل هاتف الإشعارات.": "Notification phone removed.",
  "تأكيد الرمز": "Verify code",
  "رمز الهاتف المكوّن من ستة أرقام": "Six-digit phone code",
  "تم توثيق الهاتف. اختر قنواته ثم احفظ موافقتك.": "Phone verified. Select its channels and save your consent.",
  "طلب رمز جديد": "Request a new code",
  "أطلب إرسال رمز تحقق إلى هذا الهاتف.": "Send a verification code to this phone.",
  "طلب رمز التحقق": "Request verification code",
  "رقم الهاتف بصيغته الدولية": "Phone in international format",
  "طلب الرمز مقبول لدى المزود. أدخل الرمز عند وصوله.": "The provider accepted the code request. Enter the code when it arrives.",
  "توثيق الهاتف غير متاح حاليًا. يمكنك إدارة البريد وساعات الهدوء.": "Phone verification is currently unavailable. You can manage email and quiet hours.",
  "حالة الرسائل الأخيرة": "Recent message status",
  "قبول المزود لا يعني قراءة الرسالة. تأكيد خدمة الهاتف لا يثبت ظهور الإشعار على الجهاز.": "Provider acceptance does not mean the message was read. Phone service confirmation does not prove the alert appeared on the device.",
  "لا توجد محاولات إرسال عبر القنوات الإضافية.": "No send attempts through additional channels.",
  "تأكيد الحجز": "Booking confirmation",
  "إصدار الفاتورة": "Invoice issued",
  "{0} · {1}": "{0} · {1}",
  "مراجعة الإرسال للمسؤول": "Administrator delivery review",
  "إغلاق المراجعة يوثّق قرارك ولا يعيد الإرسال أو يثبت التسليم.": "Closing a review records your decision. It does not resend or confirm delivery.",
  "لا توجد مراجعات مفتوحة.": "No open reviews.",
  "أغلق هذه المراجعة دون إعادة إرسال أو تأكيد للتسليم.": "Close this review without resending or confirming delivery.",
  "مرجع المراجعة: {0}": "Review reference: {0}",
  "إغلاق المراجعة": "Close review",
  "سبب إغلاق المراجعة": "Reason for closing the review",
  "أغلقت المراجعة دون إعادة إرسال.": "Review closed without resending.",
  "جارٍ تحميل الخيارات…": "Loading preferences…",
  "إعادة المحاولة": "Retry",
  "تعذر تحميل الخيارات. أعد المحاولة.": "Unable to load preferences. Try again.",
  "بانتظار الإرسال": "Waiting to send",
  "جارٍ التحقق من محاولة الإرسال": "Checking the send attempt",
  "قبل المزود الرسالة؛ التسليم غير مؤكد": "Provider accepted; delivery unconfirmed",
  "أكد المزود التسليم": "Provider confirmed delivery",
  "أكدت خدمة الهاتف الاستلام؛ عرض الإشعار غير مؤكد": "Phone service accepted; display unconfirmed",
  "توقف الإرسال": "Sending stopped",
  "رفض المزود الرسالة": "Provider rejected the message",
  "تحتاج مراجعة؛ لن يعاد الإرسال تلقائيًا": "Review needed; no automatic resend",
  "تنبيه التطبيق": "App notification",
  "لم تتأكد نتيجة محاولة الإرسال.": "The outcome of the send attempt is unknown.",
  "لم يصل تأكيد مطابق خلال مهلة المتابعة.": "No matching confirmation arrived within the follow-up window.",
  "ارتبط مرجع المزود بأكثر من محاولة.": "The provider reference was associated with more than one attempt.",
  "إيصال المزود لا يطابق محاولة الإرسال.": "The provider receipt does not match the send attempt.",
  "تعذر الحصول على إيصال المزود.": "The provider receipt could not be obtained.",
  "تحقق من الخيارات أو رمز الهاتف ثم أعد المحاولة.": "Check your options or phone code and try again.",
  "تغيرت الجلسة. سجّل الدخول وأعد فتح الخيارات.": "Your session changed. Sign in and reopen preferences.",
  "هذا الإجراء غير متاح الآن أو بلغ حد المحاولات المسموح.": "This action is unavailable or its attempt limit was reached.",
  "تغيرت البيانات. أعد فتح الخيارات لقراءة أحدث نسخة.": "The data changed. Reopen preferences to load the latest version.",
  "القناة غير متاحة أو لم يتأكد الإرسال. انتظر قبل طلب رمز جديد.": "The channel is unavailable or sending could not be confirmed. Wait before requesting a new code.",
  "تعذر تنفيذ الطلب. أعد المحاولة لاحقًا.": "Unable to complete the request. Try again later.",
  "إشعار": "Notice"
});
  const text = (ar,_en,values=[]) => ui.message(ar,values);
  const failure = message => Object.assign(Error(String(message)),{authored:message});
  const node = (tag,value) => { const el=document.createElement(tag);if(value!==undefined)ui.setMessage(el,value);return el; };
  const button = (caption,action) => {const el=node('button',caption);el.type='button';el.addEventListener('click',action);return el;};
  const label = (caption,input) => {const el=node('label',caption);el.append(input);return el;};
  const states={
    PENDING:['بانتظار الإرسال','Waiting to send'],RESERVED:['جارٍ التحقق من محاولة الإرسال','Checking the send attempt'],
    PROVIDER_ACCEPTED:['قبل المزود الرسالة؛ التسليم غير مؤكد','Provider accepted; delivery unconfirmed'],
    PROVIDER_DELIVERED:['أكد المزود التسليم','Provider confirmed delivery'],
    PUSH_SERVICE_CONFIRMED:['أكدت خدمة الهاتف الاستلام؛ عرض الإشعار غير مؤكد','Phone service accepted; display unconfirmed'],
    SUPPRESSED:['توقف الإرسال','Sending stopped'],PROVIDER_REJECTED:['رفض المزود الرسالة','Provider rejected the message'],
    REVIEW_REQUIRED:['تحتاج مراجعة؛ لن يعاد الإرسال تلقائيًا','Review needed; no automatic resend']
  };
  const channels={SMS:['رسالة نصية','SMS'],WHATSAPP:['واتساب','WhatsApp'],PUSH:['تنبيه التطبيق','App notification']};
  const reviewReasons={ATTEMPT_OUTCOME_UNKNOWN:['لم تتأكد نتيجة محاولة الإرسال.','The outcome of the send attempt is unknown.'],RECEIPT_UNCONFIRMED:['لم يصل تأكيد مطابق خلال مهلة المتابعة.','No matching confirmation arrived within the follow-up window.'],PROVIDER_ID_REUSED:['ارتبط مرجع المزود بأكثر من محاولة.','The provider reference was associated with more than one attempt.'],RECEIPT_MISMATCH:['إيصال المزود لا يطابق محاولة الإرسال.','The provider receipt does not match the send attempt.'],RECEIPT_UNAVAILABLE:['تعذر الحصول على إيصال المزود.','The provider receipt could not be obtained.']};
  const authority=()=>{const p=window.HydrolandProfileData?.profile,roles=list=>[...new Set((list||[]).filter(r=>typeof r==='string'||r?.status==='ACTIVE').map(r=>typeof r==='string'?r:r.role))].sort();return JSON.stringify([p?.id,p?.status,roles(p?.roles),roles(p?.roleAssignments)]);};
  let active;
  function open(){
    if(active)return;
    const auth=window.HydrolandAuth;
    if(!auth?.isAuthenticated?.())return;
    const sessionVersion=auth.getSessionVersion(),fingerprint=authority(),abort=new AbortController();
    const dialog=node('dialog');dialog.className='hl-profile-editor hl-notification-preferences';dialog.id='hl-notification-preferences';
    dialog.dir=document.documentElement.dir||'rtl';dialog.setAttribute('aria-labelledby','hl-notification-preferences-title');
    const heading=node('h2',text('خيارات الإشعارات','Notification preferences'));heading.id='hl-notification-preferences-title';
    const header=node('header');header.append(heading,button(text('إغلاق','Close'),()=>dialog.close()));
    const status=node('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const content=node('div');content.className='hl-notification-content';
    dialog.append(header,status,content);document.body.append(dialog);
    let generation=0,sessionEpoch=0,busy=false,challengeId=null,preference;
    const current=()=>active?.dialog===dialog&&dialog.isConnected&&auth.isAuthenticated()&&auth.getSessionVersion()===sessionVersion&&authority()===fingerprint;
    const renewed=()=>text('تجددت الجلسة. اطلب رمز هاتف جديد عند الحاجة.','Your session was renewed. Request a new phone code if needed.');
    const currentNativeSession=()=>{try{return JSON.parse(atob(auth.getAccessToken().split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sid;}catch{return null;}};
    active={dialog,sessionVersion,authority:fingerprint,resetChallenge:()=>{sessionEpoch++;const hadChallenge=Boolean(challengeId);challengeId=null;if(current()&&!busy&&hadChallenge)void load(renewed());}};
    dialog.addEventListener('close',()=>{abort.abort();generation++;challengeId=null;content.replaceChildren();if(active?.dialog===dialog)active=null;dialog.remove();},{once:true});
    dialog.showModal();
    async function request(path,body){
      if(!current())throw Error('AUTH_CANCELLED');
      let response,data;
      try{
        response=await auth.authorizedFetch((path.startsWith('/admin/')?'':'/notifications/delivery')+path,{signal:abort.signal,...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
        data=await response.json();
      }catch{throw failure(text('تعذر الاتصال. تحقق من الاتصال ثم أعد المحاولة.','Connection unavailable. Check your connection and try again.'));}
      if(!current())throw Error('AUTH_CANCELLED');
      if(!response.ok){
        const messages={400:['تحقق من الخيارات أو رمز الهاتف ثم أعد المحاولة.','Check your options or phone code and try again.'],401:['تغيرت الجلسة. سجّل الدخول وأعد فتح الخيارات.','Your session changed. Sign in and reopen preferences.'],403:['هذا الإجراء غير متاح الآن أو بلغ حد المحاولات المسموح.','This action is unavailable or its attempt limit was reached.'],409:['تغيرت البيانات. أعد فتح الخيارات لقراءة أحدث نسخة.','The data changed. Reopen preferences to load the latest version.'],503:['القناة غير متاحة أو لم يتأكد الإرسال. انتظر قبل طلب رمز جديد.','The channel is unavailable or sending could not be confirmed. Wait before requesting a new code.']};
        throw failure(text(...(messages[response.status]||['تعذر تنفيذ الطلب. أعد المحاولة لاحقًا.','Unable to complete the request. Try again later.'])));
      }
      return data;
    }
    async function action(handler,onSuccess){
      if(busy||!current())return;
      busy=true;const version=generation,epoch=sessionEpoch;
      content.querySelectorAll('fieldset').forEach(el=>{el.disabled=true;});
      ui.setMessage(status,text('جارٍ تنفيذ الطلب…','Working…'));
      try{const result=await handler();if(current()&&version===generation)await onSuccess(result);}
      catch(error){if(current()&&version===generation){if(epoch!==sessionEpoch)await load(renewed());else ui.setMessage(status,error.authored||text('تغيرت الجلسة أو تعذر تنفيذ الطلب. أعد فتح الخيارات.','The session changed or the request failed. Reopen preferences.'));}}
      finally{busy=false;if(current()&&version===generation)content.querySelectorAll('fieldset').forEach(el=>{el.disabled=false;});}
    }
    function form(caption,fields,handler){
      const el=node('form'),set=node('fieldset'),submit=node('button',caption);submit.type='submit';set.append(...fields,submit);el.append(set);
      el.addEventListener('submit',event=>{event.preventDefault();if(el.reportValidity())void handler();});return el;
    }
    function check(caption,checked=false){const input=node('input');input.type='checkbox';input.checked=checked;const wrapper=label(caption,input);wrapper.className='hl-notification-check';return {input,wrapper};}
    const timeValue=minute=>minute===null?'':`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
    const minuteValue=value=>value?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
    function renderPreferences(data){
      preference=data;
      const section=node('section');section.append(node('h3',text('الحجوزات والفواتير','Bookings and invoices')),
        node('p',text('تبقى الإشعارات داخل المنصة محفوظة. اختر القنوات الإضافية والأوقات المناسبة لك.','In-app notices remain available. Choose additional channels and suitable times.')));
      const fields={},options=node('div');options.className='hl-notification-options';
      for(const [key,caption] of Object.entries({email:text('البريد الإلكتروني','Email'),sms:text('رسالة نصية','SMS'),whatsapp:text('واتساب','WhatsApp'),push:text('تنبيهات التطبيق على جهاز مسجل','App alerts on a registered device'),bookings:text('تأكيد الحجوزات','Booking confirmations'),invoices:text('إصدار الفواتير','Issued invoices')})){
        const choice=check(caption,data[key]);fields[key]=choice.input;
        if(['sms','whatsapp'].includes(key)&&!data.phoneVerified)choice.input.disabled=true;
        if(['sms','whatsapp','push'].includes(key)&&!data.available?.[key.toUpperCase()]){
          if(!data[key])choice.input.disabled=true;
          choice.wrapper.append(node('small',text('غير متاحة حاليًا','Currently unavailable')));
        }
        options.append(choice.wrapper);
      }
      const start=node('input'),end=node('input'),zone=node('input');start.type=end.type='time';zone.type='text';zone.maxLength=80;zone.required=true;zone.dir='ltr';
      start.value=timeValue(data.quietStart);end.value=timeValue(data.quietEnd);zone.value=data.timeZone;
      const quiet=node('div');quiet.className='hl-notification-quiet';quiet.append(label(text('بدء ساعات الهدوء','Quiet hours start'),start),label(text('نهاية ساعات الهدوء','Quiet hours end'),end),label(text('المنطقة الزمنية','Time zone'),zone));
      const confirmed=check(text('أوافق على خيارات إشعارات الحجوزات والفواتير المحددة.','I agree to the selected booking and invoice notification options.'));confirmed.input.required=true;
      const save=()=>action(()=>request('/preferences',{expectedRevision:data.revision,...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.checked])),quietStart:minuteValue(start.value),quietEnd:minuteValue(end.value),timeZone:zone.value.trim(),confirmed:confirmed.input.checked}),()=>{challengeId=null;return load(text('تم حفظ خيارات الإشعارات.','Notification preferences saved.'));});
      section.append(form(text('حفظ الخيارات','Save preferences'),[options,node('p',text('اترك وقتَي الهدوء فارغين لاستقبال الرسائل في أي وقت. تسري هذه الخيارات على القنوات الإضافية والبريد لهذه الأحداث.','Leave both times empty to receive messages at any time. These options apply to additional channels and email for these events.')),quiet,confirmed.wrapper],save));
      content.append(section);
    }
    function renderPhone(data){
      const section=node('section');section.append(node('h3',text('هاتف الإشعارات','Notification phone')));
      section.append(node('p',data.phoneVerified?text('الهاتف موثّق: {0}','Verified phone: {0}',[data.maskedPhone]):text('لم يوثّق هاتف للإشعارات بعد.','No notification phone verified yet.')));
      if(data.phoneVerified){
        const remove=check(text('أؤكد إزالة الهاتف وإيقاف رسائله النصية وواتساب.','Remove this phone and stop its SMS and WhatsApp notices.'));remove.input.required=true;
        section.append(form(text('إزالة الهاتف','Remove phone'),[remove.wrapper],()=>action(()=>request('/phone/remove',{expectedRevision:preference.revision,confirmed:remove.input.checked}),()=>{challengeId=null;return load(text('أزيل هاتف الإشعارات.','Notification phone removed.'));})));
      }
      if(data.phoneVerificationAvailable){
        if(challengeId){
          const code=node('input');code.type='text';code.inputMode='numeric';code.autocomplete='one-time-code';code.pattern='[0-9]{6}';code.minLength=code.maxLength=6;code.required=true;code.dir='ltr';
          section.append(form(text('تأكيد الرمز','Verify code'),[label(text('رمز الهاتف المكوّن من ستة أرقام','Six-digit phone code'),code)],()=>action(()=>request('/phone/challenges/'+encodeURIComponent(challengeId)+'/verify',{code:code.value,confirmed:true}),()=>{code.value='';challengeId=null;return load(text('تم توثيق الهاتف. اختر قنواته ثم احفظ موافقتك.','Phone verified. Select its channels and save your consent.'));})));
          section.append(button(text('طلب رمز جديد','Request a new code'),()=>{if(busy)return;challengeId=null;void load();}));
        }else{
          const phone=node('input');phone.type='tel';phone.autocomplete='tel';phone.dir='ltr';phone.pattern='\\+[1-9][0-9]{7,14}';phone.maxLength=16;phone.required=true;phone.placeholder='+966…';
          const confirm=check(text('أطلب إرسال رمز تحقق إلى هذا الهاتف.','Send a verification code to this phone.'));confirm.input.required=true;
          section.append(form(text('طلب رمز التحقق','Request verification code'),[label(text('رقم الهاتف بصيغته الدولية','Phone in international format'),phone),confirm.wrapper],()=>{
            const epoch=sessionEpoch;
            return action(()=>request('/phone/challenges',{phone:phone.value.trim(),confirmed:confirm.input.checked}),result=>{
              phone.value='';
              if(epoch!==sessionEpoch&&(!result.sessionId||result.sessionId!==currentNativeSession())){challengeId=null;return load(renewed());}
              challengeId=result.challengeId;return load(text('طلب الرمز مقبول لدى المزود. أدخل الرمز عند وصوله.','The provider accepted the code request. Enter the code when it arrives.'));
            });
          }));
        }
      }else section.append(node('p',text('توثيق الهاتف غير متاح حاليًا. يمكنك إدارة البريد وساعات الهدوء.','Phone verification is currently unavailable. You can manage email and quiet hours.')));
      content.append(section);
    }
    function renderDeliveries(data){
      const section=node('section');section.append(node('h3',text('حالة الرسائل الأخيرة','Recent message status')),
        node('p',text('قبول المزود لا يعني قراءة الرسالة. تأكيد خدمة الهاتف لا يثبت ظهور الإشعار على الجهاز.','Provider acceptance does not mean the message was read. Phone service confirmation does not prove the alert appeared on the device.')));
      if(!data.items?.length)section.append(node('p',text('لا توجد محاولات إرسال عبر القنوات الإضافية.','No send attempts through additional channels.')));
      const list=node('ul');
      for(const row of data.items||[]){
        const item=node('li'),event=row.event==='BOOKING_CONFIRMED'?text('تأكيد الحجز','Booking confirmation'):text('إصدار الفاتورة','Invoice issued');
        item.append(node('strong',text('{0} · {1}','{0} · {1}',[event,text(...(channels[row.channel]||['إشعار','Notice']))])),node('p',text(...(states[row.state]||states.REVIEW_REQUIRED))));
        const when=node('time',new Date(row.createdAt).toLocaleString(document.documentElement.lang||'ar'));when.dateTime=row.createdAt;item.append(when);list.append(item);
      }
      section.append(list);content.append(section);
    }
    function renderReview(data){
      const section=node('section');section.append(node('h3',text('مراجعة الإرسال للمسؤول','Administrator delivery review')),
        node('p',text('إغلاق المراجعة يوثّق قرارك ولا يعيد الإرسال أو يثبت التسليم.','Closing a review records your decision. It does not resend or confirm delivery.')));
      if(!data.items.length)section.append(node('p',text('لا توجد مراجعات مفتوحة.','No open reviews.')));
      for(const row of data.items){
        const reason=node('textarea');reason.required=true;reason.minLength=10;reason.maxLength=1000;
        const confirmed=check(text('أغلق هذه المراجعة دون إعادة إرسال أو تأكيد للتسليم.','Close this review without resending or confirming delivery.'));confirmed.input.required=true;
        const caption=text('{0} · {1}','{0} · {1}',[row.event==='BOOKING_CONFIRMED'?text('تأكيد الحجز','Booking confirmation'):text('إصدار الفاتورة','Invoice issued'),text(...(channels[row.channel]||['إشعار','Notice']))]);
        section.append(node('h4',caption),node('p',text(...(reviewReasons[row.reason]||reviewReasons.ATTEMPT_OUTCOME_UNKNOWN))),node('p',text('مرجع المراجعة: {0}','Review reference: {0}',[row.id])),node('p',new Date(row.createdAt).toLocaleString(document.documentElement.lang||'ar')),
          form(text('إغلاق المراجعة','Close review'),[label(text('سبب إغلاق المراجعة','Reason for closing the review'),reason),confirmed.wrapper],()=>action(()=>request('/admin/customer-channel-deliveries/'+encodeURIComponent(row.id)+'/close',{reason:reason.value.trim(),confirmed:confirmed.input.checked}),()=>load(text('أغلقت المراجعة دون إعادة إرسال.','Review closed without resending.')))));
      }
      content.append(section);
    }
    async function load(message=''){
      const version=++generation;ui.setMessage(status,text('جارٍ تحميل الخيارات…','Loading preferences…'));
      try{
        const [prefs,deliveries]=await Promise.all([request('/preferences'),request('/deliveries')]);
        const review=prefs.canReview?await request('/admin/customer-channel-deliveries'):null;
        if(!current()||version!==generation)return;
        content.replaceChildren();renderPreferences(prefs);renderPhone(prefs);renderDeliveries(deliveries);if(review)renderReview(review);ui.setMessage(status,message);
      }catch(error){
        if(!current()||version!==generation)return;
        content.replaceChildren(button(text('إعادة المحاولة','Retry'),()=>void load()));ui.setMessage(status,error.authored||text('تعذر تحميل الخيارات. أعد المحاولة.','Unable to load preferences. Try again.'));
      }
    }
    void load();
  }
  document.addEventListener('hydroland:locale-changed',()=>{if(active)active.dialog.dir=document.documentElement.dir||'rtl';});
  document.addEventListener('hydroland:profile-data-ready',()=>{if(active&&active.authority!==authority())active.dialog.close();});
  document.addEventListener('hydroland:session-cleared',()=>active?.dialog.close());
  document.addEventListener('hydroland:auth-changed',()=>{if(active&&active.sessionVersion!==window.HydrolandAuth?.getSessionVersion())active.dialog.close();});
  document.addEventListener('hydroland:session-refreshed',()=>active?.resetChallenge());
  window.HydrolandNotificationPreferences={open};
})();
