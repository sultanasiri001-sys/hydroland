(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("marine-readiness", {
  "MARINE READINESS · الوساطة البحرية": "MARINE READINESS",
  "الصيانة والجاهزية التشغيلية": "Maintenance and operating readiness",
  "لا يُفعّل الأصل البحري إلا بعد التحقق الإداري من الوثائق والصيانة. ربط مورد التقويم يُظهر كتنبيه تشغيلي منفصل.": "A marine asset is activated only after administrative verification of its documents and maintenance. Calendar resource linkage appears as a separate operational notice.",
  "تحديث": "Refresh",
  "بدون موعد": "No scheduled date",
  "أصل بحري": "Marine asset",
  "تعذر قراءة نسخة صالحة للتصحيح.": "Could not read a valid version for correction.",
  "تصحيح رقم التسجيل": "Correct registration number",
  "الرقم الحالي: ": "Current number: ",
  "غير مسجل": "Not recorded",
  " · وثائق متحققة ستعاد للمراجعة: ": " · Verified documents returning for review: ",
  "آخر تصحيح محفوظ: ": "Latest saved correction: ",
  "التصحيح لا يفعّل الأصل ولا يعتمد وثيقة.": "A correction does not activate the asset or approve a document.",
  "رقم التسجيل الصحيح": "Correct registration number",
  "سبب تصحيح رقم التسجيل": "Reason for correcting the registration number",
  "راجعت رقم التسجيل والوثائق التي ستعاد للمراجعة": "I reviewed the registration number and the documents returning for review",
  "حفظ تصحيح رقم التسجيل": "Save registration number correction",
  "إلغاء التصحيح": "Cancel correction",
  "إعادة قراءة رقم التسجيل": "Read registration number again",
  "نتيجة الحفظ غير مؤكدة؛ أعد قراءة السجل.": "Save outcome is uncertain. Read the record again.",
  "تم حفظ تصحيح رقم التسجيل إلى ": "Registration number correction saved as ",
  " · وثائق أعيدت للمراجعة: ": " · Documents returned for review: ",
  "تعذر تأكيد الحفظ": "Could not confirm the save",
  " أعد القراءة قبل حفظ جديد.": " Read the record again before another save.",
  "آخر فحص للجاهزية": "Latest readiness check",
  "لم يُفحص": "Not checked",
  "فحص الجاهزية": "Check readiness",
  "الصيانة": "Maintenance",
  "لا توجد أعمال صيانة مسجلة.": "No maintenance jobs recorded.",
  "صيانة": "Maintenance",
  "إتمام الصيانة": "Complete maintenance",
  "إضافة عمل صيانة": "Add maintenance job",
  "نوع العمل": "Job type",
  "الموعد المستهدف": "Target date",
  "ملاحظات": "Notes",
  "حفظ عمل الصيانة": "Save maintenance job",
  "لا توجد أصول بحرية مرتبطة بعضويتك بعد.": "No marine assets are linked to your membership yet.",
  "لا توجد أصول بحرية للمراجعة.": "No marine assets to review.",
  "الوثائق: ": "Documents: ",
  "الصيانة: ": "Maintenance: ",
  "لا توجد سجلات": "No records",
  "آخر جاهزية: ": "Latest readiness: ",
  "تفعيل الأصل": "Activate asset",
  "تعليق": "Suspend",
  "إخراج من الخدمة": "Retire from service",
  "جارٍ تحميل بيانات الجاهزية البحرية…": "Loading marine readiness data…",
  "تعذر قراءة بيانات الجاهزية البحرية.": "Could not read marine readiness data.",
  "تعذر تحميل بيانات الجاهزية البحرية": "Could not load marine readiness data",
  "تعذر حفظ عمل الصيانة": "Could not save the maintenance job",
  "تعذر قراءة التسجيل": "Could not read the registration",
  "تعذر تنفيذ الإجراء": "Could not complete the action",
  "فحص القارب": "Check boat",
  "تم حفظ تصحيح رقم التسجيل إلى {0} · {1} · وثائق أعيدت للمراجعة: {2}": "Registration number correction saved as {0} · {1} · Documents returned for review: {2}",
  "{0} أعد القراءة قبل حفظ جديد.": "{0} Read the record again before another save.",
  "الوثائق: {0}": "Documents: {0}",
  "الصيانة: {0}": "Maintenance: {0}",
  "آخر جاهزية: {0}{1}": "Latest readiness: {0}{1}",
  "الرقم الحالي:": "Current number:",
  "· وثائق متحققة ستعاد للمراجعة:": "· Verified documents returning for review:",
  "آخر تصحيح محفوظ:": "Latest saved correction:",
  "تم حفظ تصحيح رقم التسجيل إلى": "Registration number correction saved as",
  "· وثائق أعيدت للمراجعة:": "· Documents returned for review:",
  "أعد القراءة قبل حفظ جديد.": "Read the record again before another save.",
  "الوثائق:": "Documents:",
  "الصيانة:": "Maintenance:",
  "آخر جاهزية:": "Latest readiness:"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  // Read live preference per action; missing media support must not animate.
  const residualScrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===false?'smooth':'instant';
  if(document.getElementById('hl-marine-readiness'))return;
  const host=document.getElementById('role-console');if(!host)return;
  const panel=document.createElement('section');panel.id='hl-marine-readiness';panel.hidden=true;
  const css=document.createElement('style');css.textContent='#hl-marine-readiness{margin:1rem 0;padding:1rem;border:1px solid rgba(120,191,224,.18);border-radius:20px;background:rgba(3,25,39,.92);color:#eaf5fa}#hl-marine-readiness[hidden]{display:none}.hl-mr-head,.hl-mr-row,.hl-mr-actions{display:flex;gap:.65rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.hl-mr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:.85rem}.hl-mr-card{border:1px solid rgba(120,191,224,.14);border-radius:16px;padding:.85rem;background:rgba(255,255,255,.025)}.hl-mr-card h4,.hl-mr-card h5{margin:.1rem 0 .55rem}.hl-mr-card p{margin:.35rem 0}.hl-mr-form{display:grid;gap:.5rem;margin-top:.75rem}.hl-mr-form label{display:grid;gap:.25rem;font-weight:700}.hl-mr-form input,.hl-mr-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.2);border-radius:10px;background:#0b293c;color:#fff;padding:.6rem}.hl-mr-form input[type=checkbox]{width:auto}.hl-mr-form textarea{min-height:62px;resize:vertical}.hl-mr-list{display:grid;gap:.45rem}.hl-mr-record{padding:.55rem;border-top:1px solid rgba(120,191,224,.1)}.hl-mr-note{color:#9cb7c7}.hl-mr-state{font-size:.78rem;padding:.2rem .45rem;border-radius:999px;background:rgba(229,180,95,.14);color:#f3d496}.hl-mr-state.ready{background:rgba(96,208,159,.15);color:#9ee5bd}.hl-mr-state.not-ready{background:rgba(236,117,117,.16);color:#ffb4b4}#hl-marine-readiness button{border:1px solid rgba(120,191,224,.22);border-radius:10px;background:#12364b;color:#fff;padding:.55rem .75rem;font-weight:800;cursor:pointer}#hl-marine-readiness button.primary{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}#hl-marine-readiness button.danger{background:#58262c}@media(max-width:760px){#hl-marine-readiness{padding:.75rem}}';
  panel.appendChild(css);
  const header=document.createElement('header');header.className='hl-mr-head';uiLocale.setHTML(header, uiLocale.html`<div><small>MARINE READINESS · الوساطة البحرية</small><h3>الصيانة والجاهزية التشغيلية</h3><p class="hl-mr-note">لا يُفعّل الأصل البحري إلا بعد التحقق الإداري من الوثائق والصيانة. ربط مورد التقويم يُظهر كتنبيه تشغيلي منفصل.</p></div>`);
  const refreshButton=document.createElement('button');refreshButton.type='button';uiLocale.setText(refreshButton, ...['تحديث']);refreshButton.dataset.marineReadinessRefresh='1';header.appendChild(refreshButton);panel.appendChild(header);
  const content=document.createElement('div');content.dataset.marineReadinessContent='1';panel.appendChild(content);
  const registrationStatus=document.createElement('p');registrationStatus.setAttribute('role','status');registrationStatus.dataset.marineRegistrationStatus='1';panel.insertBefore(registrationStatus,content);
  const anchor=document.getElementById('hl-marine-documents')||host;anchor.insertAdjacentElement('afterend',panel);
  const state={role:'diver',generation:0,load:0};
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const eligible=role=>['boat','admin'].includes(role)&&auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()===role&&access()?.roleAllowed?.(role);
  const context=()=>({role:state.role,generation:state.generation,session:auth()?.getSessionVersion?.()});
  const alive=c=>c.generation===state.generation&&c.role===state.role&&c.session===auth()?.getSessionVersion?.()&&auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()===c.role;
  const current=c=>alive(c)&&eligible(c.role);
  const close=()=>{state.generation++;state.load++;state.role='diver';content.replaceChildren();registrationStatus.textContent='';panel.hidden=true;refreshButton.disabled=false;content.removeAttribute('aria-busy')};
  const stale=()=>Object.assign(new Error('Marine workspace changed.'),{stale:true});
  const authorize=async c=>{
    if(!alive(c))throw stale();
    const allowed=typeof access()?.authorizeRole==='function'&&await access().authorizeRole(c.role,{sessionVersion:c.session,isCurrent:()=>alive(c)});
    if(!allowed||!current(c)){if(alive(c))close();throw stale()}
  };
  const request=async(c,path,options={})=>{
    if(!current(c))throw stale();
    const response=await auth().authorizedFetch(path,options),body=await response.json().catch(()=>null);
    if(!current(c))throw stale();
    if(!response.ok){if([401,403].includes(response.status)){close();throw stale()}throw new Error(body?.message||('HTTP '+response.status))}
    return body;
  };
  const date=value=>value?new Date(value).toLocaleDateString('ar-SA'):uiLocale.t('بدون موعد');
  const statusClass=value=>String(value||'').toLowerCase().replace(/_/g,'-');
  const assetLabel=asset=>(asset.name||uiLocale.t('أصل بحري'))+' · '+(asset.registrationNumber||asset.assetType||'');
  const clear=()=>content.replaceChildren();
  const note=text=>{const p=document.createElement('p');p.className='hl-mr-note';uiLocale.setMessage(p, text);return p};
  const badge=value=>{const b=document.createElement('b');b.className='hl-mr-state '+statusClass(value);uiLocale.setMessage(b, value||'—');return b};
  async function openRegistration(c,assetId,card){
    const load=state.load,valid=()=>current(c)&&load===state.load&&card.isConnected;
    card.querySelector('[data-marine-registration-editor]')?.remove();
    await authorize(c);if(!valid())return;
    const data=await request(c,'/marine-operations/admin/assets/'+encodeURIComponent(assetId)+'/registration');
    if(!valid())return;
    if(!data||data.id!==assetId||data.status!=='DRAFT'||data.canCorrect!==true||typeof data.revision!=='string'||!/^[a-f0-9]{64}$/.test(data.revision)
      ||!(data.registrationNumber===null||typeof data.registrationNumber==='string')||!Number.isSafeInteger(data.verifiedDocumentCount)||data.verifiedDocumentCount<0)throw localError(uiLocale.message('تعذر قراءة نسخة صالحة للتصحيح.'));
    const form=document.createElement('form');form.className='hl-mr-form';form.dataset.marineRegistrationEditor=assetId;
    const title=document.createElement('h5');uiLocale.setText(title, ...['تصحيح رقم التسجيل']);form.appendChild(title);
    form.appendChild(note(uiLocale.t('الرقم الحالي: ')+(data.registrationNumber||uiLocale.t('غير مسجل'))+uiLocale.t(' · وثائق متحققة ستعاد للمراجعة: ')+data.verifiedDocumentCount));
    if(data.latestCorrectionReference)form.appendChild(note(uiLocale.t('آخر تصحيح محفوظ: ')+data.latestCorrectionReference));
    form.appendChild(note(typeof data.notice==='string'?data.notice:uiLocale.message('التصحيح لا يفعّل الأصل ولا يعتمد وثيقة.')));
    const label=document.createElement('label');uiLocale.setText(label, ...['رقم التسجيل الصحيح']);const number=document.createElement('input');number.name='registrationNumber';number.required=true;number.maxLength=80;label.appendChild(number);form.appendChild(label);
    const reasonLabel=document.createElement('label');uiLocale.setText(reasonLabel, ...['سبب تصحيح رقم التسجيل']);const reason=document.createElement('textarea');reason.name='reason';reason.required=true;reason.minLength=10;reason.maxLength=1000;reasonLabel.appendChild(reason);form.appendChild(reasonLabel);
    const confirmLabel=document.createElement('label');const confirm=document.createElement('input');confirm.type='checkbox';confirm.name='confirmed';confirmLabel.append(confirm,document.createTextNode(uiLocale.t('راجعت رقم التسجيل والوثائق التي ستعاد للمراجعة')));form.appendChild(confirmLabel);
    const submit=button(uiLocale.message('حفظ تصحيح رقم التسجيل'), 'primary');submit.type='submit';submit.disabled=true;
    const cancel=button(uiLocale.message('إلغاء التصحيح'));cancel.addEventListener('click',()=>form.remove());
    const error=document.createElement('p');error.setAttribute('role','alert');
    const reread=button(uiLocale.message('إعادة قراءة رقم التسجيل'));reread.hidden=true;
    reread.addEventListener('click',async()=>{reread.disabled=true;try{await openRegistration(c,assetId,card)}catch(e){if(!e.stale&&valid()){uiLocale.setMessage(error, localErrorMessage(e));reread.disabled=false}}});
    let busy=false,uncertain=false;
    const enable=()=>{submit.disabled=busy||uncertain||!confirm.checked||!number.value.trim()||number.value.trim()===data.registrationNumber||reason.value.trim().length<10};
    form.addEventListener('input',enable);form.addEventListener('change',enable);
    form.append(submit,cancel,error,reread);card.appendChild(form);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||uncertain||submit.disabled||!valid())return;
      busy=true;enable();cancel.disabled=true;
      try{
        await authorize(c);if(!valid())return;
        const result=await request(c,'/marine-operations/admin/assets/'+encodeURIComponent(assetId)+'/registration',{method:'POST',body:JSON.stringify({registrationNumber:number.value,reason:reason.value,expectedRevision:data.revision,confirmed:confirm.checked})});
        if(!valid())return;
        if(!result||result.marineAssetId!==assetId||typeof result.registrationNumber!=='string'||typeof result.reference!=='string'||!result.reference.startsWith('MRC-')||result.activated!==false)throw localError(uiLocale.message('نتيجة الحفظ غير مؤكدة؛ أعد قراءة السجل.'));
        await refresh();if(current(c)){uiLocale.setText(registrationStatus, ...["تم حفظ تصحيح رقم التسجيل إلى {0} · {1} · وثائق أعيدت للمراجعة: {2}", [result.registrationNumber, result.reference, result.documentsReturnedForReview]]);document.dispatchEvent(new CustomEvent('hydroland:marine-assets-changed'));}
      }catch(e){if(!e.stale&&valid()){uncertain=true;uiLocale.setText(error, ...["{0} أعد القراءة قبل حفظ جديد.", [e instanceof Error?e.message:uiLocale.t('تعذر تأكيد الحفظ')]]);reread.hidden=false;cancel.disabled=false;}}
      finally{busy=false;if(valid())enable();}
    });
  }
  const button=(text,kind)=>{const b=document.createElement('button');b.type='button';uiLocale.setMessage(b, text);if(kind)b.className=kind;return b};
  const renderReadiness=(asset,hostEl)=>{
    const readiness=asset.readiness&&asset.readiness[0];
    const block=document.createElement('section');block.className='hl-mr-record';
    const row=document.createElement('div');row.className='hl-mr-row';const title=document.createElement('strong');uiLocale.setText(title, ...['آخر فحص للجاهزية']);row.append(title,badge((readiness?.status || uiLocale.message('لم يُفحص'))));block.appendChild(row);
    if(readiness?.reasonCodes?.length){const reasons=document.createElement('p');reasons.className='hl-mr-note';reasons.textContent=readiness.reasonCodes.join(' · ');block.appendChild(reasons)}
    const check=button(uiLocale.message('فحص الجاهزية'), 'primary');check.dataset.marineReadinessCheck=asset.id;block.appendChild(check);hostEl.appendChild(block);
  };
  const renderMaintenance=(asset,hostEl)=>{
    const section=document.createElement('section');section.className='hl-mr-record';const title=document.createElement('h5');uiLocale.setText(title, ...['الصيانة']);section.appendChild(title);
    const list=document.createElement('div');list.className='hl-mr-list';const records=asset.maintenance||[];
    if(!records.length)list.appendChild(note(uiLocale.message('لا توجد أعمال صيانة مسجلة.')));
    records.forEach(record=>{const row=document.createElement('div');row.className='hl-mr-record';const top=document.createElement('div');top.className='hl-mr-row';const text=document.createElement('strong');text.textContent=(record.maintenanceType||uiLocale.t('صيانة'))+' · '+date(record.dueAt);top.append(text,badge(record.status));row.appendChild(top);if(record.notes){const details=document.createElement('p');details.className='hl-mr-note';details.textContent=record.notes;row.appendChild(details)}if(record.status!=='COMPLETED'){const done=button(uiLocale.message('إتمام الصيانة'));done.dataset.marineMaintenanceComplete=record.id;done.dataset.marineAssetId=asset.id;row.appendChild(done)}list.appendChild(row)});section.appendChild(list);
    const form=document.createElement('form');form.className='hl-mr-form';form.dataset.marineMaintenance=asset.id;const heading=document.createElement('strong');uiLocale.setText(heading, ...['إضافة عمل صيانة']);form.appendChild(heading);
    const typeLabel=document.createElement('label');uiLocale.setText(typeLabel, ...['نوع العمل']);const type=document.createElement('input');type.name='maintenanceType';type.required=true;type.maxLength=120;typeLabel.appendChild(type);form.appendChild(typeLabel);
    const dueLabel=document.createElement('label');uiLocale.setText(dueLabel, ...['الموعد المستهدف']);const due=document.createElement('input');due.name='dueAt';due.type='date';dueLabel.appendChild(due);form.appendChild(dueLabel);
    const notesLabel=document.createElement('label');uiLocale.setText(notesLabel, ...['ملاحظات']);const notes=document.createElement('textarea');notes.name='notes';notes.maxLength=2000;notesLabel.appendChild(notes);form.appendChild(notesLabel);
    const submit=document.createElement('button');submit.className='primary';submit.type='submit';uiLocale.setText(submit, ...['حفظ عمل الصيانة']);form.appendChild(submit);section.appendChild(form);hostEl.appendChild(section);
  };
  const renderBoat=assets=>{clear();const grid=document.createElement('div');grid.className='hl-mr-grid';if(!assets.length)grid.appendChild(note(uiLocale.message('لا توجد أصول بحرية مرتبطة بعضويتك بعد.')));assets.forEach(asset=>{const card=document.createElement('article');card.className='hl-mr-card';card.dataset.marineReadinessAsset=asset.id;const row=document.createElement('div');row.className='hl-mr-row';const title=document.createElement('h4');title.textContent=assetLabel(asset);row.append(title,badge(asset.status));card.appendChild(row);renderReadiness(asset,card);renderMaintenance(asset,card);grid.appendChild(card)});content.appendChild(grid)};
  const renderAdmin=assets=>{clear();const grid=document.createElement('div');grid.className='hl-mr-grid';if(!assets.length)grid.appendChild(note(uiLocale.message('لا توجد أصول بحرية للمراجعة.')));assets.forEach(asset=>{const card=document.createElement('article');card.className='hl-mr-card';card.dataset.marineReadinessReview=asset.id;const row=document.createElement('div');row.className='hl-mr-row';const title=document.createElement('h4');title.textContent=assetLabel(asset);row.append(title,badge(asset.status));card.appendChild(row);const documents=document.createElement('p');documents.className='hl-mr-note';uiLocale.setText(documents, ...["الوثائق: {0}", [(asset.documents||[]).map(doc=>doc.documentType+' '+doc.status).join(' · ')]]);card.appendChild(documents);const maintenance=document.createElement('p');maintenance.className='hl-mr-note';uiLocale.setText(maintenance, ...["الصيانة: {0}", [(asset.maintenance||[]).length?(asset.maintenance||[]).map(record=>record.maintenanceType+' '+record.status).join(' · '):uiLocale.t('لا توجد سجلات')]]);card.appendChild(maintenance);const latest=asset.readiness&&asset.readiness[0];if(latest){const readiness=document.createElement('p');readiness.className='hl-mr-note';uiLocale.setText(readiness, ...["آخر جاهزية: {0}{1}", [latest.status, latest.reasonCodes?.length?' · '+latest.reasonCodes.join(' · '):'']]);card.appendChild(readiness)}const actions=document.createElement('div');actions.className='hl-mr-actions';if(asset.status!=='ACTIVE'){const active=button(uiLocale.message('تفعيل الأصل'), 'primary');active.dataset.marineAssetStatus='ACTIVE';active.dataset.marineAssetId=asset.id;actions.appendChild(active)}if(asset.status!=='SUSPENDED'){const suspend=button(uiLocale.message('تعليق'));suspend.dataset.marineAssetStatus='SUSPENDED';suspend.dataset.marineAssetId=asset.id;actions.appendChild(suspend)}if(asset.status!=='OUT_OF_SERVICE'){const offline=button(uiLocale.message('إخراج من الخدمة'), 'danger');offline.dataset.marineAssetStatus='OUT_OF_SERVICE';offline.dataset.marineAssetId=asset.id;actions.appendChild(offline)}if(asset.status==='DRAFT'){const correct=button(uiLocale.message('تصحيح رقم التسجيل'));correct.dataset.marineRegistrationOpen=asset.id;actions.appendChild(correct)}card.appendChild(actions);grid.appendChild(card)});content.appendChild(grid)};
  async function refresh(){
    if(!eligible(state.role)){close();return}
    const c=context(),load=++state.load;clear();content.appendChild(note(uiLocale.message('جارٍ تحميل بيانات الجاهزية البحرية…')));content.setAttribute('aria-busy','true');refreshButton.disabled=true;
    try{
      await authorize(c);if(load!==state.load)throw stale();
      const assets=await request(c,c.role==='boat'?'/marine-operations/assets/mine':'/marine-operations/admin/assets/review');
      if(load!==state.load||!current(c))throw stale();
      if(!Array.isArray(assets))throw localError(uiLocale.message('تعذر قراءة بيانات الجاهزية البحرية.'));
      c.role==='boat'?renderBoat(assets):renderAdmin(assets);
    }catch(error){if(!error.stale&&current(c)&&load===state.load){clear();content.appendChild(note(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل بيانات الجاهزية البحرية')))}}
    finally{if(current(c)&&load===state.load){content.removeAttribute('aria-busy');refreshButton.disabled=false}}
  }
  function open(role,focus=false){if(!eligible(role)){close();return}if(state.role!==role){close();state.role=role}panel.hidden=false;void refresh();if(focus)panel.scrollIntoView({behavior: residualScrollBehavior(),block:'start'})}
  refreshButton.addEventListener('click',()=>void refresh());
  content.addEventListener('submit',async event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement)||!form.matches('[data-marine-maintenance]'))return;event.preventDefault();
    const c=context();if(c.role!=='boat'||!current(c))return;
    const assetId=form.dataset.marineMaintenance,data=Object.fromEntries(new FormData(form).entries()),submit=form.querySelector('[type="submit"]');if(!data.dueAt)delete data.dueAt;if(submit?.disabled)return;if(submit)submit.disabled=true;
    try{await authorize(c);await request(c,'/marine-operations/assets/'+encodeURIComponent(assetId)+'/maintenance',{method:'POST',body:JSON.stringify(data)});if(current(c)){await refresh();document.dispatchEvent(new CustomEvent('hydroland:marine-assets-changed'))}}
    catch(error){if(!error.stale&&current(c))alert(error instanceof Error?error.message:uiLocale.t('تعذر حفظ عمل الصيانة'))}
    finally{if(current(c)&&submit?.isConnected)submit.disabled=false}
  });
  content.addEventListener('click',async event=>{
    const target=event.target instanceof Element?event.target.closest('button'):null;if(!target||target.type==='submit')return;
    const c=context();if(!current(c))return;
    if(c.role==='admin'&&target.dataset.marineRegistrationOpen){target.disabled=true;try{await openRegistration(c,target.dataset.marineRegistrationOpen,target.closest('[data-marine-readiness-review]'))}catch(error){if(!error.stale&&current(c))uiLocale.setMessage(registrationStatus, error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر قراءة التسجيل'))}finally{if(current(c)&&target.isConnected)target.disabled=false}return}
    let path,body='{}';
    if(c.role==='boat'&&target.dataset.marineReadinessCheck)path='/marine-operations/assets/'+encodeURIComponent(target.dataset.marineReadinessCheck)+'/readiness';
    else if(c.role==='boat'&&target.dataset.marineMaintenanceComplete)path='/marine-operations/assets/'+encodeURIComponent(target.dataset.marineAssetId)+'/maintenance/'+encodeURIComponent(target.dataset.marineMaintenanceComplete)+'/complete';
    else if(c.role==='admin'&&target.dataset.marineAssetStatus){path='/marine-operations/admin/assets/'+encodeURIComponent(target.dataset.marineAssetId)+'/status';body=JSON.stringify({status:target.dataset.marineAssetStatus})}
    if(!path)return;target.disabled=true;
    try{await authorize(c);await request(c,path,{method:'POST',body});if(current(c)){await refresh();if(c.role==='boat'&&target.dataset.marineMaintenanceComplete)document.dispatchEvent(new CustomEvent('hydroland:marine-assets-changed'))}}
    catch(error){if(!error.stale&&current(c))alert(error instanceof Error?error.message:uiLocale.t('تعذر تنفيذ الإجراء'))}
    finally{if(current(c)&&target.isConnected)target.disabled=false}
  });
  const connect=root=>root.querySelectorAll?.('button').forEach(control=>{const label=(control.dataset.actionLabel||control.dataset.portalLabel||control.textContent||'').trim();if(label!=='فحص القارب'||control.dataset.hlMarineReadinessConnected)return;control.dataset.hlMarineReadinessConnected='1';control.disabled=false;control.removeAttribute('aria-disabled');control.title='';control.addEventListener('click',()=>open('boat',true))});
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)connect(node)})));observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('hydroland:role-changed',event=>{const role=event.detail?.role;close();if(eligible(role))open(role)});
  document.addEventListener('hydroland:auth-changed',()=>{const role=access()?.getCurrentRole?.();close();if(eligible(role))open(role)});
  document.addEventListener('hydroland:profile-data-ready',()=>{if(!eligible(state.role))close()});
  const initial=window.HydrolandPortalAccess?.getCurrentRole?.();if(initial==='boat'||initial==='admin')open(initial);
  window.HydrolandMarineReadiness={open,refresh};
})();
