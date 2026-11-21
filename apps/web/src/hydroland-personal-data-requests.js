(() => {
  const t = (ar, en) => document.documentElement.lang.startsWith('en') ? en : ar;
  const node = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const kinds = {CORRECTION:['تصحيح','Correction'], ERASURE:['حذف','Erasure']};
  const domains = {ACCOUNT:['ملف الحساب','Account profile'], BOOKINGS:['حجوزاتي الشخصية','My personal bookings'],
    PAYMENTS:['مدفوعات رحلاتي','My trip payments'], SENT_MESSAGES:['رسائلي المرسلة','My sent messages']};
  function select(options) {
    const input = node('select');
    for (const [value, words] of Object.entries(options)) {
      const option = node('option',t(...words)); option.value=value; input.append(option);
    }
    return input;
  }
  function label(title, field) {
    const wrapped = node('label',title); wrapped.append(field); return wrapped;
  }
  function button(title, action) {
    const el=node('button',title); el.type='button'; el.addEventListener('click',action); return el;
  }
  let active;
  function open() {
    const auth = window.HydrolandAuth;
    if (active || !auth?.isAuthenticated()) return;
    const version = auth.getSessionVersion();
    const dialog = node('dialog');
    const current = () => active === dialog && dialog.open && version === auth.getSessionVersion();
    dialog.id='hl-personal-data-requests'; dialog.className='hl-profile-editor';
    const header=node('header'), title=node('h2',t('طلبات تصحيح بياناتي أو حذفها','My correction and erasure requests'));
    title.id='hl-personal-data-title'; dialog.setAttribute('aria-labelledby',title.id);
    header.append(title,button(t('إغلاق','Close'),()=>dialog.close()));
    const form=node('form'),kind=select(kinds),domain=select(domains),ref=node('input'),details=node('textarea');
    const center=node('select'), centerField=label(t('المركز الذي سيستلم تفاصيل الطلب','Center that will receive the request details'),center);
    centerField.hidden=true;
    ref.maxLength=200; details.maxLength=1000;
    const refLabel=label(t('مرجع السجل من تنزيل بياناتي (اختياري)','Record ID from my data download (optional)'),ref);
    const sync=()=>{refLabel.hidden=domain.value==='ACCOUNT'; details.required=kind.value==='CORRECTION';};
    domain.addEventListener('change',sync); kind.addEventListener('change',sync); sync();
    const submit=node('button',t('تقديم الطلب','Submit request')); submit.type='submit'; submit.disabled=true;
    const status=node('p'); status.setAttribute('role','status');
    form.append(label(t('نوع الطلب','Request type'),kind),label(t('نطاق البيانات','Data scope'),domain),centerField,refLabel,
      label(t('التصحيح المطلوب أو تفاصيل طلب الحذف','Correction needed or erasure details'),details),
      node('p',t('اكتفِ بوصف السجل والتغيير المطلوب. تجنّب إدخال بيانات طبية أو أرقام هوية أو دفع.',
        'Describe the record and requested change. Omit medical information, ID numbers and payment details.')),submit);
    const history=node('section');
    dialog.append(header,form,status,node('h3',t('طلباتي','My requests')),history);
    document.body.append(dialog); active=dialog;
    const onAuthChanged = () => { if(version!==auth.getSessionVersion() && dialog.open) dialog.close(); };
    document.addEventListener('hydroland:auth-changed',onAuthChanged);
    dialog.addEventListener('close',()=>{
      document.removeEventListener('hydroland:auth-changed',onAuthChanged);
      if(active===dialog) active=null;
      dialog.remove();
    },{once:true});
    dialog.showModal();
    let page=1, loadId=0, pending;
    async function request(path, body) {
      const res=await auth.authorizedFetch('/me/data-requests'+path,body === undefined ? {} :
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!res.ok) {
        if(res.status===404) throw Error(t('مرجع السجل غير متاح في بيانات حسابك.','This record is unavailable in your account.'));
        throw Error(t('تعذّر تنفيذ الطلب. حاول مجددًا.','Could not complete the request. Please retry.'));
      }
      return res.json();
    }
    async function loadCenters() {
      try {
        const centers=await request('/centers');
        if (!current()) return;
        center.replaceChildren();
        if (centers.length>1) center.add(new Option(t('اختر مركزك','Select your center'),''));
        for (const item of centers) center.add(new Option(item.displayName,item.id));
        centerField.hidden=centers.length===0; center.required=centers.length>0;
        submit.disabled=false; status.replaceChildren();
      } catch {
        if(current()) status.replaceChildren(node('span',t('تعذّر تحميل مراكزك.','Could not load your centers.')),button(t('إعادة المحاولة','Retry'),loadCenters));
      }
    }
    async function load() {
      const attempt=++loadId;
      try {
        const data=await request('?page='+page);
        if (!current() || attempt!==loadId) return;
        history.replaceChildren();
        for (const item of data.items) {
          const entry=node('article');
          entry.append(node('h4',t(...kinds[item.kind])+' · '+t(...domains[item.domain])),
            node('p',({RECEIVED:t('تم استلام الطلب','Request received'),DECISION_RECORDED:t('صدر القرار الأول','Initial decision recorded'),APPEAL_PENDING:t('التظلم لدى الإدارة','Appeal under review'),APPEAL_DECIDED:t('صدر قرار التظلم','Appeal decision recorded')})[item.status] || item.status),
            node('p',new Date(item.createdAt).toLocaleString(document.documentElement.lang)),
            node('p',t('رقم الطلب','Request number')+' '+item.id));
          if (item.recordRef) entry.append(node('p',item.recordRef));
          if (item.details) entry.append(node('p',item.details));
          const dispositions={APPLIED:t('نُفذ التصحيح','Correction applied'),DEFERRED:t('أُجّل التنفيذ','Deferred'),REFUSED:t('رُفض الطلب','Refused')};
          if (dispositions[item.decisionDisposition]) entry.append(node('p',dispositions[item.decisionDisposition]));
          if (item.executionAuditId) entry.append(node('p',t('سُجّل تنفيذ التصحيح في الملف.','The profile correction was recorded.')));
          if (item.kind==='CORRECTION' && item.domain==='ACCOUNT' && !item.executionAuditId && ['RECEIVED','APPEAL_PENDING'].includes(item.status)) {
            const edit=node('form'), field=select({firstName:['الاسم الأول','First name'],lastName:['اسم العائلة','Last name'],
              phone:['الهاتف','Phone'],headline:['المسمى المهني','Professional headline'],bio:['النبذة','Biography'],regionCode:['المنطقة','Region']});
            const value=node('input'); value.required=true; value.maxLength=80;
            const limit=()=>{value.maxLength=({firstName:80,lastName:80,phone:40,headline:120,bio:5000,regionCode:80})[field.value];};
            field.addEventListener('change',limit);
            const save=node('button',t('تطبيق التصحيح على ملفي','Apply correction to my profile'));save.type='submit';
            edit.append(label(t('حقل الملف','Profile field'),field),label(t('القيمة الصحيحة','Correct value'),value),save);
            edit.addEventListener('submit',async event=>{
              event.preventDefault(); if(save.disabled || !current())return;
              save.disabled=true;
              try {
                await request('/'+encodeURIComponent(item.id)+'/profile-correction',{[field.value]:value.value});
                if(current()) {status.textContent=t('حُفظ التصحيح في ملفك وربط بطلبك.','Correction saved and linked to your request.'); await load();}
              } catch (error) {if(current()){status.textContent=error.message;await load();}}
              finally {save.disabled=false;}
            });
            entry.append(edit);
          }
          history.append(entry);
        }
        if(!data.items.length) history.append(node('p',t('لا توجد طلبات في هذه الصفحة.','No requests on this page.')));
        if(page>1) history.append(button(t('السابق','Previous'),()=>{page--;void load();}));
        if(data.more) history.append(button(t('التالي','Next'),()=>{page++;void load();}));
      } catch {
        if(current() && attempt===loadId) history.replaceChildren(node('p',t('تعذّر تحميل الطلبات.','Could not load requests.')),
          button(t('إعادة المحاولة','Retry'),load));
      }
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(submit.disabled || !current()) return;
      const data={...(center.value ? {centerId:center.value} : {}),kind:kind.value,domain:domain.value,recordRef:refLabel.hidden ? null : ref.value.trim() || null,details:details.value.trim()};
      const fingerprint=JSON.stringify(data);
      if(pending?.fingerprint!==fingerprint) pending={fingerprint,key:crypto.randomUUID()};
      const controls=[kind,domain,center,ref,details,submit];
      for(const control of controls) control.disabled=true;
      try {
        const receipt=await request('',{...data,requestKey:pending.key});
        if(!current()) return;
        status.textContent=t('تم استلام طلبك برقم','Your request was received with number')+' '+receipt.id;
        pending=null; form.reset(); sync(); page=1; await load();
      } catch(error) { if(current()) status.textContent=error.message; }
      finally { if(current()) for(const control of controls) control.disabled=false; }
    });
    void loadCenters(); void load();
  }
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-personal-data-requests]')) open();});
  document.addEventListener('hydroland:session-cleared',()=>active?.close());
})();
