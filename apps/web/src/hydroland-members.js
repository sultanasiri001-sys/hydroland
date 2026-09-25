(()=>{
  const anchor=document.querySelector('.membership-suite')||document.querySelector('.membership')||document.querySelector('.role-console');if(!anchor||document.querySelector('.hl-members'))return;
  const section=document.createElement('section');section.className='hl-members';section.innerHTML=`<header class="hl-members-head"><div><small>HYDROLAND IDENTITY & MEMBERSHIP</small><h3>العضويات والشهادات وسجل الغوص</h3></div><span>بيانات الحساب من النظام</span></header><div class="hl-member-grid"><article class="hl-pass"><div class="hl-pass-card"><div><span class="hl-rank">HYDROLAND MEMBER</span><h4>بطاقة العضوية الرقمية</h4><p>الحساب: —</p><p>الحالة: —</p><div class="hl-role-statuses"><span>بانتظار بيانات الحساب</span></div></div></div><div class="hl-member-actions"><button disabled>QR · قيد الربط</button><button disabled>البطاقة · قيد الربط</button><button disabled>المشاركة · قيد الربط</button></div></article><article class="hl-certificates"><h4>الشهادات والتراخيص</h4><article><div><b>بانتظار بيانات الشهادات</b><small>تظهر الشهادات الفعلية بعد تسجيل الدخول.</small></div><span class="hl-status review">—</span></article><div class="hl-member-actions"><button data-member-action="credential-add">إضافة شهادة</button><button data-member-action="credential-submit">طلب التحقق</button></div></article><article class="hl-log"><h4>سجل الغوص الرقمي</h4><div class="hl-member-actions"><button data-member-action="log">إضافة غوصة</button><button data-member-action="log-export">تصدير السجل</button></div></article></div><div class="hl-upgrade"><div><strong>نظام الترقيات</strong><small>تظهر متطلبات وحالة الترقية فقط بعد ربطها ببيانات موثقة من النظام.</small></div><button disabled>متطلبات الترقية · قيد الربط</button></div>`;anchor.insertAdjacentElement('afterend',section);

  const style=document.createElement('style');style.textContent=`.hl-credential-doc-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.6rem}.hl-credential-doc-actions button{border:1px solid rgba(120,191,224,.2);border-radius:10px;padding:.48rem .7rem;background:rgba(255,255,255,.045);color:#eaf7fb;font:inherit;font-weight:800}.hl-credential-doc-actions button:disabled{opacity:.55}.hl-credential-doc-meta{display:block;margin-top:.35rem;color:#9fbccc}`;document.head.appendChild(style);
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');clearTimeout(window.__hlCredentialToast);window.__hlCredentialToast=setTimeout(()=>t.classList.remove('visible'),2400)};
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');const response=await client(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||`HTTP_${response.status}`);return body};
  const readBase64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||''),comma=value.indexOf(',');comma<0?reject(new Error('تعذر قراءة الملف')):resolve(value.slice(comma+1))};reader.onerror=()=>reject(new Error('تعذر قراءة الملف'));reader.readAsDataURL(file)});
  const latestDocument=credential=>[...(credential?.documents||[])].filter(doc=>doc?.status!=='ARCHIVED').sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0];

  async function uploadDocument(credential,file,button){
    if(!file)return;
    if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){toast('المسموح PDF أو JPEG أو PNG');return}
    if(file.size<1||file.size>10_000_000){toast('حجم الملف يجب ألا يتجاوز 10MB');return}
    button.disabled=true;
    try{const base64=await readBase64(file);await request(`/credentials/${encodeURIComponent(credential.id)}/documents`,{method:'POST',body:JSON.stringify({originalName:file.name,mimeType:file.type,base64})});toast('تم رفع مستند الشهادة بأمان');await window.HydrolandProfile?.load?.()}
    catch(error){toast(error?.message==='AUTH_REQUIRED'?'سجّل الدخول أولًا':error?.message||'تعذر رفع المستند')}
    finally{button.disabled=false}
  }

  async function openDocument(credential,document,button){
    button.disabled=true;
    try{const access=await request(`/credentials/${encodeURIComponent(credential.id)}/documents/${encodeURIComponent(document.id)}/access`);if(!access?.url)throw new Error('تعذر إنشاء رابط المستند');window.open(access.url,'_blank','noopener,noreferrer')}
    catch(error){toast(error?.message||'تعذر فتح المستند')}
    finally{button.disabled=false}
  }

  async function submitCredential(credential,button){
    button.disabled=true;
    try{await request(`/credentials/${encodeURIComponent(credential.id)}/submit`,{method:'POST'});toast('تم إرسال الشهادة للتحقق');await window.HydrolandProfile?.load?.()}
    catch(error){toast(error?.message||'تعذر إرسال الشهادة للتحقق')}
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
      const meta=document.createElement('small');meta.className='hl-credential-doc-meta';meta.textContent=documents.length?`${documents.length} مستند · ${latest?.originalName||'مستند محفوظ'}`:'لا يوجد مستند مرفق';article.appendChild(meta);
      const actions=document.createElement('div');actions.className='hl-credential-doc-actions';
      if(credential.verificationStatus==='UNVERIFIED'){
        const upload=document.createElement('button');upload.type='button';upload.textContent=documents.length?'إرفاق مستند آخر':'إرفاق مستند';
        const input=document.createElement('input');input.type='file';input.hidden=true;input.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';input.addEventListener('change',()=>{const file=input.files?.[0];void uploadDocument(credential,file,upload);input.value=''});upload.addEventListener('click',()=>input.click());actions.append(upload,input);
        if(documents.length){const submit=document.createElement('button');submit.type='button';submit.textContent='إرسال للتحقق';submit.addEventListener('click',()=>void submitCredential(credential,submit));actions.appendChild(submit)}
      }
      if(latest){const open=document.createElement('button');open.type='button';open.textContent='عرض المستند';open.addEventListener('click',()=>void openDocument(credential,latest,open));actions.appendChild(open)}
      if(actions.childNodes.length)article.appendChild(actions);
    });
  }

  const certHost=section.querySelector('.hl-certificates');if(certHost)new MutationObserver(()=>queueMicrotask(enhanceCredentials)).observe(certHost,{childList:true});
  document.addEventListener('hydroland:auth-changed',()=>setTimeout(enhanceCredentials,0));setTimeout(enhanceCredentials,650);
})();