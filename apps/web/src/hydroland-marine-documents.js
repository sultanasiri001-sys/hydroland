(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("marine-documents", {
  "MARINE BROKERAGE DOCUMENTS · الوساطة البحرية": "MARINE BROKERAGE DOCUMENTS",
  "الوثائق والتراخيص البحرية": "Marine documents and licenses",
  "إدارة وثائق التسجيل ورخصة الملاحة والسلامة والصيانة. ترفع الملفات إلى تخزين خاص وتُتاح للمصرح لهم فقط.": "Manage registration, navigation, safety and maintenance documents. Files are uploaded to private storage and are available only to authorized users.",
  "بانتظار تدقيق المركز": "Awaiting center review",
  "بانتظار الإدارة العليا": "Awaiting platform decision",
  "معلق": "On hold",
  "مُعاد للتعديل": "Returned for correction",
  "مرفوض": "Rejected",
  "معتمد": "Approved",
  "المركز الذي يتبع له القارب": "Affiliated dive center",
  "اختر المركز": "Select a center",
  "تحديد مركز التدقيق": "Set reviewing center",
  "الموافقة والإرسال للإدارة العليا": "Approve and forward to the platform",
  "إعادة للتعديل": "Return for correction",
  "تعليق": "Place on hold",
  "سبب القرار أو التعديل المطلوب": "Decision reason or required correction",
  "تدقيق مستندات القوارب التابعة للمركز": "Review affiliated boat documents",
  "تعديل المستند وإعادة إرساله للمركز": "Correct and resubmit to the center",
  "استكمال المرفق": "Attach the missing file",
  "الملف البديل": "Replacement file",
  "سبب القرار مطلوب": "Enter a reason for this decision",
  "تعذر حفظ مركز القارب": "Could not save the reviewing center",
  "تحديث": "Refresh",
  "تسجيل القارب": "Boat registration",
  "رخصة الملاحة": "Navigation license",
  "رخصة تشغيل القارب": "Boat operating license",
  "شهادة السلامة": "Safety certificate",
  "الفحص والصيانة الدورية": "Periodic inspection and maintenance",
  "رخصة الاتصالات البحرية": "Marine communications license",
  "بدون انتهاء": "No expiry",
  "إضافة قارب / أصل بحري": "Add a boat / marine asset",
  "الجهة": "Organization",
  "الاسم": "Name",
  "النوع": "Type",
  "رقم التسجيل": "Registration number",
  "سعة الركاب": "Passenger capacity",
  "حفظ الأصل البحري": "Save marine asset",
  "الأصول والوثائق": "Assets and documents",
  "نوع الوثيقة": "Document type",
  "الرقم المرجعي": "Reference number",
  "تاريخ الانتهاء": "Expiry date",
  "ملف الوثيقة (PDF/JPG/PNG حتى 10 ميجابايت)": "Document file (PDF/JPG/PNG up to 10 MB)",
  "رفع وإرسال للمراجعة": "Upload and submit for review",
  "بدون رقم": "No number",
  "بدون مرجع": "No reference",
  "عرض الملف": "View file",
  "لا توجد وثائق مسجلة.": "No documents recorded.",
  "لا توجد أصول بحرية مرتبطة بعضويتك بعد.": "No marine assets are linked to your membership yet.",
  "مراجعة وثائق الأصول البحرية": "Review marine asset documents",
  "اعتماد": "Approve",
  "رفض": "Reject",
  "أصل بحري": "Marine asset",
  "\">عرض الملف": "\">View file",
  "لا توجد وثائق بحرية بانتظار المراجعة.": "No marine documents awaiting review.",
  "تعذر تحميل البيانات البحرية": "Could not load marine data",
  "تعذر حفظ الأصل البحري": "Could not save the marine asset",
  "اختر ملفًا صالحًا لا يتجاوز 10 ميجابايت": "Select a valid file no larger than 10 MB",
  "الملفات المدعومة PDF وJPG وPNG": "Supported files: PDF, JPG and PNG",
  "تعذر قراءة الملف": "Could not read the file",
  "تعذر رفع الوثيقة": "Could not upload the document",
  "تعذر فتح الملف": "Could not open the file",
  "تعذر تنفيذ القرار": "Could not carry out the decision",
  "الوثائق والتراخيص": "Documents and licenses"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Read live preference per action; missing media support must not animate.
  const residualScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  if(document.getElementById('hl-marine-documents'))return;
  const host=document.getElementById('role-console');if(!host)return;
  const panel=document.createElement('section');panel.id='hl-marine-documents';panel.hidden=true;uiLocale.setHTML(panel, uiLocale.html`<style>
  #hl-marine-documents{margin:1rem 0;padding:1rem;border:1px solid rgba(120,191,224,.18);border-radius:20px;background:rgba(3,25,39,.92);color:#eaf5fa}#hl-marine-documents[hidden]{display:none}.hl-marine-head,.hl-marine-row,.hl-marine-actions{display:flex;gap:.65rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.hl-marine-grid{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(320px,1.25fr);gap:1rem}.hl-marine-card,.hl-marine-asset{border:1px solid rgba(120,191,224,.14);border-radius:16px;padding:.85rem;background:rgba(255,255,255,.025)}.hl-marine-form{display:grid;gap:.55rem}.hl-marine-form label{display:grid;gap:.25rem;font-weight:700}.hl-marine-form input,.hl-marine-form select{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.2);border-radius:10px;background:#0b293c;color:#fff;padding:.6rem}.hl-marine-actions{justify-content:flex-start;margin-top:.6rem}#hl-marine-documents button{border:1px solid rgba(120,191,224,.22);border-radius:10px;background:#12364b;color:#fff;padding:.55rem .75rem;font-weight:800;cursor:pointer}#hl-marine-documents button.primary{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}.hl-marine-doc{display:flex;gap:.5rem;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:1px solid rgba(120,191,224,.1)}.hl-marine-note{color:#9cb7c7}.hl-marine-state{font-size:.78rem;padding:.2rem .45rem;border-radius:999px;background:rgba(229,180,95,.14);color:#f3d496}@media(max-width:760px){.hl-marine-grid{grid-template-columns:1fr}}</style>
  <header class="hl-marine-head"><div><small>MARINE BROKERAGE DOCUMENTS · الوساطة البحرية</small><h3>الوثائق والتراخيص البحرية</h3><p class="hl-marine-note">إدارة وثائق التسجيل ورخصة الملاحة والسلامة والصيانة. ترفع الملفات إلى تخزين خاص وتُتاح للمصرح لهم فقط.</p></div><button type="button" data-marine-refresh>تحديث</button></header><div data-marine-content></div>`);
  host.insertAdjacentElement('afterend',panel);
  const content=panel.querySelector('[data-marine-content]');
  const state={role:'diver',memberships:[],assets:[],pending:[],centers:[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=async(path,options={})=>{const response=await window.HydrolandAuth.authorizedFetch(path,options);const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||`HTTP ${response.status}`);return body};
  const docName=t=>({REGISTRATION:'تسجيل القارب',NAVIGATION_LICENSE:'رخصة الملاحة',OPERATING_LICENSE:'رخصة تشغيل القارب',SAFETY_CERTIFICATE:'شهادة السلامة',PERIODIC_INSPECTION:'الفحص والصيانة الدورية',COMMUNICATIONS_LICENSE:'رخصة الاتصالات البحرية'}[t]||t);
  const fmtDate=v=>v?new Date(v).toLocaleDateString('ar-SA'):uiLocale.t('بدون انتهاء');
  const statusNames={PENDING:'بانتظار تدقيق المركز',PLATFORM_PENDING:'بانتظار الإدارة العليا',ON_HOLD:'معلق',RETURNED:'مُعاد للتعديل',VERIFIED:'معتمد',REJECTED:'مرفوض'};
  function centerPicker(asset){
    const membership=state.memberships.find(m=>m.organization.id===asset.organizationId);
    if(asset.reviewCenterId||membership?.organization.kind!=='MARINE_OPERATOR'||membership.role!=='OWNER')return '';
    return uiLocale.html`<form class="hl-marine-form" data-center-binding><label>المركز الذي يتبع له القارب<select required name="centerId"><option value="">اختر المركز</option>${state.centers.map(center=>uiLocale.html`<option value="${esc(center.id)}">${esc(center.displayName)}</option>`).join('')}</select></label><button>تحديد مركز التدقيق</button></form>`;
  }
  function correctionForm(d){
    if(d.status!=='RETURNED'&&(d.status!=='PENDING'||d.hasFile))return '';
    return uiLocale.html`<details><summary>${uiLocale.label(d.status==='RETURNED'?'تعديل المستند وإعادة إرساله للمركز':'استكمال المرفق')}</summary>
      <form class="hl-marine-form" data-correct-doc="${esc(d.id)}" data-revision="${esc(d.reviewRevision)}">
      <label>الرقم المرجعي<input name="referenceNumber" maxlength="120" value="${esc(d.referenceNumber)}"></label>
      <label>تاريخ الانتهاء<input type="date" name="expiresAt" value="${esc((d.expiresAt||'').slice(0,10))}"></label>
      <label>الملف البديل<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" ${d.hasFile?'':'required'}></label>
      <button type="submit">رفع وإرسال للمراجعة</button></form></details>`;
  }
  function renderBoat(){const orgOptions=state.memberships.map(m=>uiLocale.html`<option value="${esc(m.organization.id)}">${esc(m.organization.displayName)}</option>`).join('');uiLocale.setHTML(content, uiLocale.html`<div class="hl-marine-grid"><form class="hl-marine-card hl-marine-form" data-marine-asset-form><h4>إضافة قارب / أصل بحري</h4><label>الجهة<select name="organizationId" required>${orgOptions}</select></label><label>الاسم<input name="name" required maxlength="120"></label><label>النوع<select name="assetType"><option>DIVE_BOAT</option><option>YACHT</option><option>RIB</option><option>SUPPORT_VESSEL</option><option>OTHER</option></select></label><label>رقم التسجيل<input name="registrationNumber" maxlength="80"></label><label>سعة الركاب<input name="passengerCapacity" type="number" min="1"></label><button class="primary" type="submit" ${orgOptions?'':'disabled'}>حفظ الأصل البحري</button></form><section class="hl-marine-card"><h4>الأصول والوثائق</h4><div data-marine-assets>${state.assets.length?state.assets.map(asset=>uiLocale.html`<article class="hl-marine-asset" data-marine-asset="${esc(asset.id)}"><div class="hl-marine-row"><div><strong>${esc(asset.name)}</strong><small> · ${esc(asset.assetType)} · ${esc(asset.registrationNumber||uiLocale.t('بدون رقم'))}</small></div><span class="hl-marine-state">${esc(asset.status)}</span></div><div>${(asset.documents||[]).length?(asset.documents||[]).map(d=>uiLocale.html`<div class="hl-marine-doc"><span>${uiLocale.label(docName(d.documentType))} · ${esc(d.referenceNumber||uiLocale.t('بدون مرجع'))} · ${esc(fmtDate(d.expiresAt))}${d.originalName?' · '+esc(d.originalName):''}</span><span><b class="hl-marine-state">${uiLocale.label(statusNames[d.status]||d.status)}</b>${d.reviewNote?uiLocale.html`<p>${esc(d.reviewNote)}</p>`: ''} ${d.hasFile?uiLocale.html`<button type="button" data-marine-doc-access="${esc(d.id)}" data-marine-asset-id="${esc(asset.id)}">عرض الملف</button>`:''}</span></div>${correctionForm(d)}`).join(''):uiLocale.html`<p class="hl-marine-note">لا توجد وثائق مسجلة.</p>`}</div>${centerPicker(asset)}<form class="hl-marine-form" data-marine-doc-form style="margin-top:.7rem"><label>نوع الوثيقة<select name="documentType"><option value="REGISTRATION">تسجيل القارب</option><option value="NAVIGATION_LICENSE">رخصة الملاحة</option><option value="OPERATING_LICENSE">رخصة تشغيل القارب</option><option value="SAFETY_CERTIFICATE">شهادة السلامة</option><option value="PERIODIC_INSPECTION">الفحص والصيانة الدورية</option><option value="COMMUNICATIONS_LICENSE">رخصة الاتصالات البحرية</option></select></label><label>الرقم المرجعي<input name="referenceNumber" maxlength="120"></label><label>تاريخ الانتهاء<input name="expiresAt" type="date"></label><label>ملف الوثيقة (PDF/JPG/PNG حتى 10 ميجابايت)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required></label><button type="submit">رفع وإرسال للمراجعة</button></form></article>`).join(''):uiLocale.html`<p class="hl-marine-note">لا توجد أصول بحرية مرتبطة بعضويتك بعد.</p>`}</div></section></div>`)}
  let generation=0;
  function reviewPanel(center){
    const choices=center?[['FORWARD','الموافقة والإرسال للإدارة العليا'],['RETURNED','إعادة للتعديل']]:[['VERIFIED','اعتماد'],['RETURNED','إعادة للتعديل'],['ON_HOLD','تعليق'],['REJECTED','رفض']];
    return uiLocale.html`<section class="hl-marine-card"><h4>${uiLocale.label(center?'تدقيق مستندات القوارب التابعة للمركز':'مراجعة وثائق الأصول البحرية')}</h4>
      ${state.pending.length?state.pending.map(d=>uiLocale.html`<article class="hl-marine-asset" data-marine-doc="${esc(d.id)}">
        <strong>${esc(d.marineAsset.name)} · ${esc(d.marineAsset.registrationNumber)}</strong>
        <p>${uiLocale.label(docName(d.documentType))} · ${esc(d.referenceNumber)} · ${esc(fmtDate(d.expiresAt))}</p>
        <p>${uiLocale.label(statusNames[d.status]||d.status)} ${esc(d.reviewNote)}</p>
        ${d.hasFile?uiLocale.html`<button type="button" data-marine-review-access="${esc(d.id)}">عرض الملف</button>`:''}
        <label>سبب القرار أو التعديل المطلوب<textarea data-review-note maxlength="1000"></textarea></label>
        <div class="hl-marine-actions">${choices.filter(([choice])=>choice!=='ON_HOLD'||d.status!=='ON_HOLD').map(([choice,label])=>uiLocale.html`<button type="button" data-marine-decision="${choice}" ${(!d.hasFile&&['VERIFIED','FORWARD'].includes(choice))||!/^[a-f0-9]{64}$/.test(d.reviewRevision||'')?'disabled':''}>${uiLocale.label(label)}</button>`).join('')}</div></article>`).join(''):uiLocale.html`<p>لا توجد وثائق بحرية بانتظار المراجعة.</p>`}</section>`;
  }
  async function refresh(){
    const view=++generation,role=state.role;
    const current=()=>view===generation&&role===state.role&&window.HydrolandAuth?.isAuthenticated?.();
    if(!current()){clearView();return}
    try{
      if(role==='boat'||role==='center'){
        const [memberships,assets,centers,pending]=await Promise.all([request('/organizations/mine'),request('/marine-operations/assets/mine'),
          request('/marine-operations/review-centers'),role==='center'?request('/marine-operations/center/documents/pending'):[]]);
        if(!current())return;
        state.memberships=(Array.isArray(memberships)?memberships:[]).filter(x=>x.status==='ACTIVE'&&['DIVE_CENTER','MARINE_OPERATOR'].includes(x.organization?.kind));
        state.assets=assets;state.centers=centers;state.pending=pending;renderBoat();
        if(role==='center')uiLocale.insertHTML(content,'afterbegin',reviewPanel(true));
      }else if(role==='admin'){
        const pending=await request('/marine-operations/admin/documents/pending');
        if(!current())return;state.pending=pending;uiLocale.setHTML(content,reviewPanel(false));
      }
    }catch(error){if(current())uiLocale.setText(content,error.message)}
  }
  function open(role){clearView();state.role=role;panel.hidden=false;refresh();panel.scrollIntoView({behavior:residualScrollBehavior(),block:'start'})}
  panel.querySelector('[data-marine-refresh]').addEventListener('click',refresh);
  async function attachment(file){
    if(!(file instanceof File)||!file.size||file.size>10_000_000)throw new Error(uiLocale.t('اختر ملفًا صالحًا لا يتجاوز 10 ميجابايت'));
    if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error(uiLocale.t('الملفات المدعومة PDF وJPG وPNG'));
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error(uiLocale.t('تعذر قراءة الملف')));reader.readAsDataURL(file)});
    return {originalName:file.name,mimeType:file.type,base64};
  }
  content.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target,view=generation,button=form.querySelector('button'),fields=new FormData(form);
    const asset=form.closest('[data-marine-asset]'),root=asset&&'/marine-operations/assets/'+encodeURIComponent(asset.dataset.marineAsset);
    button.disabled=true;
    try{
      if(form.matches('[data-marine-asset-form]')){
        const data=Object.fromEntries(fields);if(data.passengerCapacity)data.passengerCapacity=Number(data.passengerCapacity);else delete data.passengerCapacity;
        await request('/marine-operations/assets',{method:'POST',body:JSON.stringify(data)});
        document.dispatchEvent(new CustomEvent('hydroland:marine-assets-changed'));
      }else if(form.matches('[data-center-binding]')){
        await request(root+'/review-center',{method:'POST',body:JSON.stringify({centerId:fields.get('centerId')})});
      }else{
        const correction=form.hasAttribute('data-correct-doc');
        const data={referenceNumber:String(fields.get('referenceNumber')||'').trim(),expiresAt:String(fields.get('expiresAt')||'')};
        if(correction)data.expectedRevision=form.dataset.revision;else data.documentType=fields.get('documentType');
        const file=fields.get('file');if(!correction||file?.size)Object.assign(data,await attachment(file));
        if(view!==generation)return;
        await request(root+'/documents'+(correction?'/'+encodeURIComponent(form.dataset.correctDoc):''),{method:correction?'PATCH':'POST',body:JSON.stringify(data)});
      }
      if(view===generation)await refresh();
    }catch(error){if(view===generation)alert(error.message)}finally{button.disabled=false}
  });
  content.addEventListener('click',async event=>{
    const button=event.target.closest('[data-marine-doc-access],[data-marine-review-access],[data-marine-decision]');if(!button)return;
    const view=generation,queue='/marine-operations/'+(state.role==='center'?'center':'admin')+'/documents/';
    const card=button.closest('[data-marine-doc]');button.disabled=true;
    try{
      if(button.dataset.marineDecision){
        const outcome=button.dataset.marineDecision,note=card.querySelector('[data-review-note]').value.trim();
        if(['REJECTED','ON_HOLD','RETURNED'].includes(outcome)&&!note)throw new Error(uiLocale.t('سبب القرار مطلوب'));
        const doc=state.pending.find(d=>d.id===card.dataset.marineDoc);
        await request(queue+encodeURIComponent(doc.id)+'/decision',{method:'POST',body:JSON.stringify({outcome,expectedRevision:doc.reviewRevision,...(note?{note}:{})})});
        if(view===generation)await refresh();
      }else{
        const path=button.dataset.marineReviewAccess?queue+encodeURIComponent(button.dataset.marineReviewAccess)+'/access':
          '/marine-operations/assets/'+encodeURIComponent(button.dataset.marineAssetId)+'/documents/'+encodeURIComponent(button.dataset.marineDocAccess)+'/access';
        const access=await request(path);if(view===generation)window.open(access.url,'_blank','noopener,noreferrer');
      }
    }catch(error){if(view===generation)alert(error.message)}finally{button.disabled=false}
  });
  const connect=root=>root.querySelectorAll?.('button').forEach(button=>{if((button.dataset.actionLabel||button.dataset.portalLabel||button.textContent||'').trim()!=='الوثائق والتراخيص'||button.dataset.hlMarineConnected)return;button.dataset.hlMarineConnected='1';button.disabled=false;button.removeAttribute('aria-disabled');button.title='';button.addEventListener('click',()=>open('boat'))});
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)connect(node)})));observer.observe(document.body,{childList:true,subtree:true});
  function clearView(){generation++;panel.hidden=true;state.assets=[];state.memberships=[];state.centers=[];state.pending=[];content.replaceChildren()}
  document.addEventListener('hydroland:role-changed',event=>{state.role=event.detail?.role;clearView()});
  document.addEventListener('hydroland:session-cleared',clearView);
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())clearView()});
  const initial=window.HydrolandPortalAccess?.getCurrentRole?.();if(initial==='boat'||initial==='admin')open(initial);
  window.HydrolandMarineDocuments={open,refresh};
})();
