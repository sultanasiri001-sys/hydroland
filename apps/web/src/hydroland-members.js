(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("members", {
  "العضويات والشهادات وسجل الغوص": "Memberships, certificates and dive log",
  "بيانات الحساب من النظام": "Account data from the system",
  "بطاقة العضوية الرقمية": "Digital membership card",
  "الحساب: —": "Account: —",
  "الحالة: —": "Status: —",
  "بانتظار بيانات الحساب": "Awaiting account data",
  "QR · قيد الربط": "QR · Connection pending",
  "البطاقة · قيد الربط": "Card · Connection pending",
  "المشاركة · قيد الربط": "Sharing · Connection pending",
  "الشهادات والتراخيص": "Certificates and licenses",
  "بانتظار بيانات الشهادات": "Awaiting certificate data",
  "تظهر الشهادات الفعلية بعد تسجيل الدخول.": "Actual certificates appear after sign-in.",
  "إضافة شهادة": "Add certificate",
  "طلب التحقق": "Request verification",
  "سجل الغوص الرقمي": "Digital dive log",
  "إضافة غوصة": "Add dive",
  "تصدير السجل": "Export log",
  "نظام الترقيات": "Progression",
  "تظهر متطلبات وحالة الترقية فقط بعد ربطها ببيانات موثقة من النظام.": "Progression requirements and status appear only after they are linked to verified system data.",
  "متطلبات الترقية · قيد الربط": "Progression requirements · Connection pending",
  "تعذر قراءة الملف": "Could not read the file",
  "المسموح PDF أو JPEG أو PNG": "PDF, JPEG or PNG only",
  "حجم الملف يجب ألا يتجاوز 10MB": "The file must be no larger than 10 MB",
  "تم رفع مستند الشهادة بأمان": "Certificate document uploaded securely",
  "سجّل الدخول أولًا": "Sign in first",
  "تعذر رفع المستند": "Could not upload the document",
  "تعذر إنشاء رابط المستند": "Could not create the document link",
  "تعذر فتح المستند": "Could not open the document",
  "تم إرسال الشهادة للتحقق": "Certificate submitted for verification",
  "تعذر إرسال الشهادة للتحقق": "Could not submit the certificate for verification",
  "{0} مستند · {1}": "{0} documents · {1}",
  "مستند محفوظ": "Saved document",
  "لا يوجد مستند مرفق": "No document attached",
  "إرفاق مستند آخر": "Attach another document",
  "إرفاق مستند": "Attach document",
  "إرسال للتحقق": "Submit for verification",
  "عرض المستند": "View document"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const anchor=document.querySelector('.membership-suite')||document.querySelector('.membership')||document.querySelector('.role-console');if(!anchor||document.querySelector('.hl-members'))return;
  const section=document.createElement('section');section.className='hl-members';uiLocale.setHTML(section, uiLocale.html`<header class="hl-members-head"><div><small>HYDROLAND IDENTITY & MEMBERSHIP</small><h3>العضويات والشهادات وسجل الغوص</h3></div><span>بيانات الحساب من النظام</span></header><div class="hl-member-grid"><article class="hl-pass"><div class="hl-pass-card"><div><span class="hl-rank">HYDROLAND MEMBER</span><h4>بطاقة العضوية الرقمية</h4><p>الحساب: —</p><p>الحالة: —</p><div class="hl-role-statuses"><span>بانتظار بيانات الحساب</span></div></div></div><div class="hl-member-actions"><button disabled>QR · قيد الربط</button><button disabled>البطاقة · قيد الربط</button><button disabled>المشاركة · قيد الربط</button></div></article><article class="hl-certificates"><h4>الشهادات والتراخيص</h4><article><div><b>بانتظار بيانات الشهادات</b><small>تظهر الشهادات الفعلية بعد تسجيل الدخول.</small></div><span class="hl-status review">—</span></article><div class="hl-member-actions"><button data-member-action="credential-add">إضافة شهادة</button><button data-member-action="credential-submit">طلب التحقق</button></div></article><article class="hl-log"><h4>سجل الغوص الرقمي</h4><div class="hl-member-actions"><button data-member-action="log">إضافة غوصة</button><button data-member-action="log-export">تصدير السجل</button></div></article></div><div class="hl-upgrade"><div><strong>نظام الترقيات</strong><small>تظهر متطلبات وحالة الترقية فقط بعد ربطها ببيانات موثقة من النظام.</small></div><button disabled>متطلبات الترقية · قيد الربط</button></div>`);anchor.insertAdjacentElement('afterend',section);

  const style=document.createElement('style');style.textContent=`.hl-credential-doc-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.6rem}.hl-credential-doc-actions button{border:1px solid rgba(120,191,224,.2);border-radius:10px;padding:.48rem .7rem;background:rgba(255,255,255,.045);color:#eaf7fb;font:inherit;font-weight:800}.hl-credential-doc-actions button:disabled{opacity:.55}.hl-credential-doc-meta{display:block;margin-top:.35rem;color:#9fbccc}`;document.head.appendChild(style);
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');clearTimeout(window.__hlCredentialToast);window.__hlCredentialToast=setTimeout(()=>t.classList.remove('visible'),2400)};
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');const response=await client(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||`HTTP_${response.status}`);return body};
  const readBase64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||''),comma=value.indexOf(',');comma<0?reject(localError(uiLocale.message('تعذر قراءة الملف'))):resolve(value.slice(comma+1))};reader.onerror=()=>reject(localError(uiLocale.message('تعذر قراءة الملف')));reader.readAsDataURL(file)});
  const latestDocument=credential=>[...(credential?.documents||[])].filter(doc=>doc?.status!=='ARCHIVED').sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0];

  async function uploadDocument(credential,file,button){
    if(!file)return;
    if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){toast(uiLocale.message('المسموح PDF أو JPEG أو PNG'));return}
    if(file.size<1||file.size>10_000_000){toast(uiLocale.message('حجم الملف يجب ألا يتجاوز 10MB'));return}
    button.disabled=true;
    try{const base64=await readBase64(file);await request(`/credentials/${encodeURIComponent(credential.id)}/documents`,{method:'POST',body:JSON.stringify({originalName:file.name,mimeType:file.type,base64})});toast(uiLocale.message('تم رفع مستند الشهادة بأمان'));await window.HydrolandProfile?.load?.()}
    catch(error){toast(error?.message==='AUTH_REQUIRED'?uiLocale.message('سجّل الدخول أولًا'):(localErrorMessage(error) || uiLocale.message('تعذر رفع المستند')))}
    finally{button.disabled=false}
  }

  async function openDocument(credential,document,button){
    button.disabled=true;
    try{const access=await request(`/credentials/${encodeURIComponent(credential.id)}/documents/${encodeURIComponent(document.id)}/access`);if(!access?.url)throw localError(uiLocale.message('تعذر إنشاء رابط المستند'));window.open(access.url,'_blank','noopener,noreferrer')}
    catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر فتح المستند')))}
    finally{button.disabled=false}
  }

  async function submitCredential(credential,button){
    button.disabled=true;
    try{await request(`/credentials/${encodeURIComponent(credential.id)}/submit`,{method:'POST'});toast(uiLocale.message('تم إرسال الشهادة للتحقق'));await window.HydrolandProfile?.load?.()}
    catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر إرسال الشهادة للتحقق')))}
    finally{button.disabled=false}
  }

  function enhanceCredentials(){
    const host=section.querySelector('.hl-certificates'),credentials=window.HydrolandProfileData?.credentials||[];
    if(!host||!Array.isArray(credentials)||!credentials.length)return;
    const articles=[...host.children].filter(node=>node.tagName==='ARTICLE');
    credentials.forEach((credential,index)=>{
      const article=articles[index];if(!article||article.dataset.hlCredentialDocs===credential.id)return;
      article.dataset.hlCredentialDocs=credential.id;
      article.querySelector('.hl-credential-doc-actions')?.remove();article.querySelector('.hl-credential-doc-meta')?.remove();
      const documents=(credential.documents||[]).filter(doc=>doc?.status!=='ARCHIVED'),latest=latestDocument(credential);
      const meta=document.createElement('small');meta.className='hl-credential-doc-meta';uiLocale.setText(meta, ...(documents.length?["{0} مستند · {1}", [documents.length, latest?.originalName||uiLocale.t('مستند محفوظ')]]:['لا يوجد مستند مرفق']));article.appendChild(meta);
      const actions=document.createElement('div');actions.className='hl-credential-doc-actions';
      if(credential.verificationStatus==='UNVERIFIED'){
        const upload=document.createElement('button');upload.type='button';uiLocale.setText(upload, ...[documents.length?'إرفاق مستند آخر':'إرفاق مستند']);
        const input=document.createElement('input');input.type='file';input.hidden=true;input.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';input.addEventListener('change',()=>{const file=input.files?.[0];void uploadDocument(credential,file,upload);input.value=''});upload.addEventListener('click',()=>input.click());actions.append(upload,input);
        if(documents.length){const submit=document.createElement('button');submit.type='button';uiLocale.setText(submit, ...['إرسال للتحقق']);submit.addEventListener('click',()=>void submitCredential(credential,submit));actions.appendChild(submit)}
      }
      if(latest){const open=document.createElement('button');open.type='button';uiLocale.setText(open, ...['عرض المستند']);open.addEventListener('click',()=>void openDocument(credential,latest,open));actions.appendChild(open)}
      if(actions.childNodes.length)article.appendChild(actions);
    });
  }

  const certHost=section.querySelector('.hl-certificates');if(certHost)new MutationObserver(()=>queueMicrotask(enhanceCredentials)).observe(certHost,{childList:true});
  document.addEventListener('hydroland:auth-changed',()=>setTimeout(enhanceCredentials,0));setTimeout(enhanceCredentials,650);
})();

// Connect the membership controls only when their fail-closed runtime is ready.
void import('./hydroland-membership-pass.js').catch(() => {});
