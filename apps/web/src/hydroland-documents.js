(()=>{
  if(document.getElementById('hl-documents'))return;
  const host=document.getElementById('role-console');if(!host)return;
  const style=document.createElement('style');style.textContent=`
  .hl-documents{margin:1rem 0;padding:1rem;border:1px solid rgba(120,191,224,.18);border-radius:20px;background:rgba(3,25,39,.9);color:#eaf5fa}.hl-documents[hidden]{display:none}.hl-doc-head,.hl-doc-toolbar,.hl-doc-actions{display:flex;gap:.7rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.hl-doc-head h3,.hl-doc-card h4{margin:.2rem 0}.hl-doc-head p,.hl-doc-note,.hl-doc-meta{color:#9cb7c7}.hl-doc-toolbar{margin:.8rem 0}.hl-documents select,.hl-documents input,.hl-documents textarea{width:100%;box-sizing:border-box;border:1px solid rgba(120,191,224,.22);border-radius:11px;background:#0b293c;color:#fff;padding:.7rem}.hl-documents label{display:grid;gap:.3rem;font-weight:700}.hl-doc-layout{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(320px,1.2fr);gap:1rem}.hl-doc-card{border:1px solid rgba(120,191,224,.14);border-radius:16px;padding:.9rem;background:rgba(255,255,255,.025)}.hl-doc-fields{display:grid;gap:.65rem}.hl-doc-list{display:grid;gap:.65rem}.hl-doc-item{border:1px solid rgba(120,191,224,.14);border-radius:14px;padding:.8rem}.hl-doc-item header{display:flex;gap:.6rem;justify-content:space-between;align-items:flex-start}.hl-doc-status{font-size:.78rem;padding:.25rem .5rem;border-radius:999px;background:rgba(229,180,95,.14);color:#f3d496}.hl-doc-actions{justify-content:flex-start;margin-top:.65rem}.hl-documents button{border:1px solid rgba(120,191,224,.22);border-radius:10px;background:#12364b;color:#fff;padding:.55rem .75rem;font-weight:800;cursor:pointer}.hl-documents button.primary{border:0;background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131}.hl-documents button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:760px){.hl-doc-layout{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  const panel=document.createElement('section');panel.id='hl-documents';panel.className='hl-documents';panel.hidden=true;panel.innerHTML=`
    <header class="hl-doc-head"><div><small>DOCUMENT CONTROL · إدارة المستندات</small><h3>المستندات والنماذج التشغيلية</h3><p>إنشاء، تعديل، متابعة، اعتماد وتوقيع المستندات حسب صلاحيتك الفعلية في الجهة.</p></div><button type="button" data-doc-refresh>تحديث</button></header>
    <div class="hl-doc-toolbar"><label>الجهة<select data-doc-org></select></label><label>إدارة المستندات<select data-doc-department aria-label="إدارة المستندات"><option value="">كل الإدارات</option></select></label><span class="hl-doc-note" role="status" data-doc-note>اختر جهة لعرض مستنداتها.</span></div>
    <section class="hl-doc-card"><h4>مستندات الإدارات والنواقص</h4><p class="hl-doc-note" data-doc-inventory-scope></p><div data-doc-departments class="hl-doc-departments"></div><label>عرض الأنواع<select data-doc-gap-filter><option value="ALL">كل الأنواع</option><option value="NO_RECORD">بلا مستند محفوظ</option><option value="PENDING">تنتظر الاعتماد</option><option value="SETUP">تحتاج تهيئة أو تصحيح النموذج</option><option value="ARCHIVE_ONLY">نسخ مؤرشفة فقط</option></select></label><div class="hl-doc-actions"><button type="button" data-doc-setup-hr hidden>حفظ نماذج دورة الموارد البشرية الناقصة</button><button type="button" data-doc-hr-contracts hidden>قوالب عقود الموظفين الموجودة</button></div><p class="hl-doc-note" data-doc-hr-guidance hidden>نماذج توثيق للإجراءات وربط مراجعها؛ التعيين والأجور وتعديل العقد وإيقاف الوصول تُنفّذ في مساراتها المختصة. قوالب العقود تُفتح من المكتبة نفسها.</p><div data-doc-inventory></div></section>
    <div class="hl-doc-layout"><form class="hl-doc-card" data-doc-form><h4 data-doc-form-title>إنشاء مستند</h4><label>النموذج<select data-doc-template required></select></label><div class="hl-doc-fields" data-doc-fields></div><div class="hl-doc-actions"><button class="primary" type="submit" data-doc-save>حفظ المسودة</button><button type="button" data-doc-cancel hidden>إلغاء التعديل</button></div></form><section class="hl-doc-card"><h4>مستندات الجهة</h4><div class="hl-doc-list" data-doc-list><p>لم يتم تحميل المستندات بعد.</p></div></section></div>`;
  host.insertAdjacentElement('afterend',panel);
  const extraStyle=document.createElement('style');extraStyle.textContent='.hl-doc-departments{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;margin:.7rem 0}.hl-doc-departments button{text-align:right}.hl-doc-departments small{display:block;color:#b3c9d6}.hl-doc-inventory-table{overflow:auto;margin:.8rem 0}.hl-doc-inventory-table table{width:100%;border-collapse:collapse;min-width:620px}.hl-doc-inventory-table th,.hl-doc-inventory-table td{text-align:right;border-bottom:1px solid #25485b;padding:.6rem}.hl-doc-inventory-table caption{text-align:right;font-weight:700;padding:.5rem}.hl-documents [aria-pressed="true"]{outline:2px solid #e5b45f}';document.head.appendChild(extraStyle);
  const state={memberships:[],orgId:null,member:null,templates:[],documents:[],inventory:null,department:'',typeCode:'',editing:null,generation:0,loading:false,preferInternal:false};
  const session=()=>window.HydrolandAuth?.getSessionVersion?.();
  const context=()=>({generation:state.generation,orgId:state.orgId,session:session()});
  const current=c=>c.generation===state.generation&&c.orgId===state.orgId&&c.session===session()&&Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=async(path,options={})=>{const client=window.HydrolandAuth?.authorizedFetch;if(!client)throw new Error('خدمة المصادقة غير جاهزة');const response=await client(path,options);const type=response.headers.get('content-type')||'';const body=type.includes('application/json')?await response.json().catch(()=>null):null;if(!response.ok)throw new Error(body?.message||`HTTP ${response.status}`);return body};
  const note=message=>{const el=panel.querySelector('[data-doc-note]');if(el)el.textContent=message};
  const statusLabel=s=>({DRAFT:'مسودة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'}[s]||s);
  const canManage=()=>['OWNER','ADMIN'].includes(state.member?.role);
  const canWrite=()=>['OWNER','ADMIN','OPERATOR','INSTRUCTOR','STAFF'].includes(state.member?.role);
  const myAccountId=()=>window.HydrolandProfileData?.profile?.id||null;
  const hash=async payload=>{const bytes=new TextEncoder().encode(JSON.stringify(payload));const digest=await crypto.subtle.digest('SHA-256',bytes);return 'sha256:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
  const fieldInput=(field,value='')=>{const key=esc(field.key),label=esc(field.labelAr||field.labelEn||field.key),required=field.required?' required':'';if(Array.isArray(field.options)&&field.options.length)return `<label>${label}<select name="${key}"${required}>${field.options.map(o=>`<option value="${esc(o)}"${String(o)===String(value)?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`;const type=String(field.type||'TEXT').toUpperCase();if(type==='TEXTAREA'||type==='LONG_TEXT')return `<label>${label}<textarea name="${key}" rows="4"${required}>${esc(value)}</textarea></label>`;const htmlType=type==='DATE'?'date':type==='NUMBER'?'number':'text';return `<label>${label}<input type="${htmlType}" name="${key}" value="${esc(value)}"${required}></label>`};
  const activeTemplate=()=>state.editing?.template||state.templates.find(t=>t.id===panel.querySelector('[data-doc-template]')?.value);
  function renderFields(payload={}){const template=activeTemplate(),box=panel.querySelector('[data-doc-fields]');if(!box)return;box.innerHTML=template?(Array.isArray(template.fields)?template.fields:[]).map(f=>fieldInput(f,payload?.[f.key]??'')).join(''):'<p>لا توجد نماذج نشطة لهذه الجهة.</p>';panel.querySelector('[data-doc-save]').disabled=!template||!canWrite();}
  function resetEditor(){state.editing=null;panel.querySelector('[data-doc-form-title]').textContent='إنشاء مستند';panel.querySelector('[data-doc-template]').disabled=false;panel.querySelector('[data-doc-cancel]').hidden=true;renderFields({})}
  function renderDocuments(){const list=panel.querySelector('[data-doc-list]');if(!list)return;const docs=state.documents.filter(d=>(!state.department||d.department===state.department)&&(!state.typeCode||d.template?.code===state.typeCode));if(!docs.length){list.innerHTML='<p>لا توجد مستندات محفوظة ضمن الاختيار الحالي.</p>';return}const me=myAccountId();list.innerHTML=docs.map(d=>{const admin=canManage(),canApprove=admin&&d.status==='PENDING_APPROVAL'&&d.createdByAccountId!==me,canSign=admin&&d.status==='APPROVED'&&d.createdByAccountId!==me&&d.approvedByAccountId!==me;return `<article class="hl-doc-item" data-document-id="${esc(d.id)}"><header><div><strong>${esc(d.template?.titleAr||d.template?.titleEn||d.referenceNumber)}</strong><div class="hl-doc-meta">${esc(d.referenceNumber)} · الإصدار ${esc(d.version)}</div></div><span class="hl-doc-status">${esc(statusLabel(d.status))}</span></header><div class="hl-doc-actions">${d.status==='DRAFT'&&canWrite()?'<button type="button" data-doc-action="edit">تعديل</button><button type="button" data-doc-action="submit">إرسال للاعتماد</button>':''}${canApprove?'<button type="button" data-doc-action="approve">اعتماد</button>':''}${canSign?'<button type="button" data-doc-action="sign">توقيع</button>':''}${admin&&d.status==='SIGNED'?'<button type="button" data-doc-action="archive">أرشفة</button>':''}<button type="button" data-doc-action="pdf">عرض PDF</button></div></article>`}).join('')}
  const templateStatus=s=>({READY:'نموذج مهيأ',NOT_CONFIGURED:'النموذج غير مهيأ',INACTIVE:'النموذج غير نشط',ACTIVE_VERSION_CONFLICT:'تعارض الإصدارات النشطة',DEPARTMENT_CONFLICT:'تعارض الإدارة'}[s]||s);
  function renderInventory(){
    const inventory=state.inventory,departments=inventory?.departments||[],filter=panel.querySelector('[data-doc-gap-filter]').value;
    const hr=Boolean(inventory?.internalPlatform&&state.department==='HR'&&canManage());for(const selector of ['[data-doc-setup-hr]','[data-doc-hr-contracts]','[data-doc-hr-guidance]'])panel.querySelector(selector).hidden=!hr;
    panel.querySelector('[data-doc-inventory-scope]').textContent=inventory?`${inventory.internalPlatform?`يشمل ${inventory.baselineTemplateCount} نوعًا أساسيًا و${inventory.extensionTemplateCount||0} نموذجًا لاستكمال الموارد البشرية، وأي نماذج إضافية مسجلة.`:'يشمل الأنواع المسجلة لهذه الجهة.'} عدم وجود مستند يحدد فجوة في السجل؛ تحديد وجوبه بحسب الإجراء والحالة يحتاج مراجعة. الحصر الكامل لمستندات الإدارة لم يُعتمد بعد. العقود في مكتبة العقود، والتراخيص في مسارها المختص. وقت القراءة: ${new Date(inventory.observedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})}${inventory.inconsistentRecordCount?' · توجد سجلات بتعارض في الإدارة تحتاج مراجعة.':''}`:'';
    panel.querySelector('[data-doc-departments]').innerHTML=departments.map(d=>`<button type="button" data-doc-department-card="${esc(d.code)}" aria-pressed="${state.department===d.code}"><strong>${esc(d.nameAr)}</strong><small>${d.summary.types} نوع · ${d.summary.noRecord} بلا مستند · ${d.summary.pendingApproval} بانتظار الاعتماد</small></button>`).join('');
    const shown=departments.filter(d=>!state.department||d.code===state.department);
    panel.querySelector('[data-doc-inventory]').innerHTML=shown.map(d=>{
      const items=d.items.filter(t=>filter==='ALL'||filter==='NO_RECORD'&&t.recordStatus==='NO_RECORD'||filter==='PENDING'&&t.counts.PENDING_APPROVAL>0||filter==='SETUP'&&t.templateStatus!=='READY'||filter==='ARCHIVE_ONLY'&&t.recordStatus==='ARCHIVE_ONLY');
      return `<div class="hl-doc-inventory-table"><table><caption>${esc(d.nameAr)}</caption><thead><tr><th>نوع المستند</th><th>تهيئة النموذج</th><th>حالة السجل</th><th>مسودات</th><th>بانتظار الاعتماد</th><th>معتمد / موقّع</th><th>مؤرشف</th><th>الإجراء</th></tr></thead><tbody>${items.map(t=>`<tr data-doc-inventory-code="${esc(t.code)}"><td>${esc(t.titleAr)}<small class="hl-doc-meta"> · ${esc(t.code)}</small></td><td>${esc(templateStatus(t.templateStatus))}</td><td>${t.recordStatus==='NO_RECORD'?'لا يوجد مستند محفوظ':t.recordStatus==='ARCHIVE_ONLY'?'مؤرشف فقط':'مستندات محفوظة'}</td><td>${t.counts.DRAFT}</td><td>${t.counts.PENDING_APPROVAL}</td><td>${t.counts.APPROVED} / ${t.counts.SIGNED}</td><td>${t.counts.ARCHIVED}</td><td>${t.setup&&canManage()?`<button type="button" data-doc-setup="${esc(t.code)}" data-department="${esc(d.code)}">تهيئة النموذج</button>`:''}${t.activeTemplateId&&canWrite()?`<button type="button" data-doc-create-type="${esc(t.code)}" data-department="${esc(d.code)}">إنشاء مستند</button>`:''}${t.total?`<button type="button" data-doc-view-type="${esc(t.code)}" data-department="${esc(d.code)}">عرض المستندات</button>`:''}</td></tr>`).join('')||'<tr><td colspan="8">لا توجد أنواع مطابقة للعرض الحالي.</td></tr>'}</tbody></table></div>`;
    }).join('');
  }
  function renderSelection(){
    const select=panel.querySelector('[data-doc-template]'),prior=select.value;
    const available=new Set((state.inventory?.departments||[]).flatMap(d=>d.items.map(t=>t.activeTemplateId).filter(Boolean)));
    const templates=state.templates.filter(t=>available.has(t.id)&&(!state.department||t.department===state.department));
    select.innerHTML=templates.map(t=>`<option value="${esc(t.id)}">${esc(t.titleAr||t.titleEn||t.code)}</option>`).join('');
    if(templates.some(t=>t.id===prior))select.value=prior;
    resetEditor();renderDocuments();renderInventory();
  }
  function clearData(){state.templates=[];state.documents=[];state.inventory=null;state.member=null;state.editing=null;panel.querySelector('[data-doc-template]').replaceChildren();panel.querySelector('[data-doc-department]').innerHTML='<option value="">كل الإدارات</option>';renderSelection();}
  async function loadOrganization(orgId){
    if(state.orgId!==orgId)state.typeCode='';
    state.generation++;state.loading=true;state.orgId=orgId;const c=context();clearData();
    state.member=state.memberships.find(x=>x.organization?.id===orgId)||null;
    note('جارٍ تحميل مستندات الإدارات وحصر النواقص...');
    try{
      const path=`/documents/organizations/${encodeURIComponent(orgId)}`;
      const [templates,documents,inventory]=await Promise.all([request(`${path}/templates`),request(`${path}/list`),request(`${path}/inventory`)]);
      if(!current(c))return;
      if(!inventory||inventory.organizationId!==orgId||!Array.isArray(inventory.departments))throw new Error('تعذر قراءة حصر المستندات؛ أعد المحاولة.');
      state.templates=Array.isArray(templates)?templates:[];state.documents=Array.isArray(documents)?documents:[];state.inventory=inventory;
      if(!inventory.departments.some(d=>d.code===state.department))state.department='';
      const select=panel.querySelector('[data-doc-department]');select.innerHTML='<option value="">كل الإدارات</option>'+inventory.departments.map(d=>`<option value="${esc(d.code)}">${esc(d.nameAr)}</option>`).join('');select.value=state.department;
      renderSelection();note(`تم تحميل ${state.documents.length} مستند · صلاحيتك: ${state.member?.accessBasis==='PLATFORM_OWNER'?'مالك هيدرولاند الداخلي':state.member?.role||'—'}`);
    }catch(error){if(current(c)){clearData();note(error instanceof Error?error.message:'تعذر تحميل المستندات');}}
    finally{if(current(c))state.loading=false;}
  }
  async function refresh(){
    state.generation++;const c=context();state.loading=true;clearData();
    if(!window.HydrolandAuth?.isAuthenticated?.()){state.memberships=[];panel.hidden=true;return;}
    try{
      const memberships=await request('/documents/workspace');if(!current(c))return;
      state.memberships=(Array.isArray(memberships)?memberships:[]).filter(x=>x.status==='ACTIVE');
      const orgSelect=panel.querySelector('[data-doc-org]');orgSelect.innerHTML=state.memberships.map(x=>`<option value="${esc(x.organization.id)}">${esc(x.organization.displayName)} · ${esc(x.role)}</option>`).join('');
      if(!state.memberships.length){state.orgId=null;state.loading=false;note('لا توجد جهة مستندات متاحة لصلاحيتك الحالية.');return;}
      const internal=state.memberships.find(x=>x.organization.kind==='HYDROLAND_INTERNAL_PLATFORM');
      const wanted=state.preferInternal&&internal?internal.organization.id:state.memberships.some(x=>x.organization.id===state.orgId)?state.orgId:state.memberships[0].organization.id;
      state.preferInternal=false;orgSelect.value=wanted;await loadOrganization(wanted);
    }catch(error){if(current(c)){state.loading=false;note(error instanceof Error?error.message:'تعذر تحميل الجهات');}}
  }
  panel.querySelector('[data-doc-hr-contracts]').addEventListener('click',()=>{if(!canManage()||state.department!=='HR'||!state.inventory?.internalPlatform)return;if(window.HydrolandContractLibrary?.open)window.HydrolandContractLibrary.open();else note('افتح مكتبة عقود هيدرولاند من الملف الشخصي.');});
  panel.querySelector('[data-doc-setup-hr]').addEventListener('click',async()=>{
    if(state.loading||!canManage()||state.department!=='HR'||!state.inventory?.internalPlatform)return;
    const c=context(),button=panel.querySelector('[data-doc-setup-hr]'),items=state.inventory.departments.find(d=>d.code==='HR')?.items.filter(t=>t.setup)||[];
    if(!items.length){note('نماذج الموارد البشرية الموجودة محفوظة؛ لا توجد نماذج جديدة تحتاج تهيئة.');return;}
    state.loading=true;button.disabled=true;let saved=0,failure='';
    try{for(const item of items){if(!current(c)||panel.hidden||state.department!=='HR')return;await request('/documents/templates',{method:'POST',body:JSON.stringify(item.setup)});saved++;if(current(c))note(`تم حفظ ${saved} من ${items.length} نموذج في المكتبة...`);}}
    catch(error){failure=error instanceof Error?error.message:'تعذر استكمال حفظ النماذج';}
    finally{button.disabled=false;if(current(c)){state.loading=false;await loadOrganization(c.orgId);note(failure?`حُفظ ${saved} نموذج؛ ${failure}. يمكن استكمال الأنواع الناقصة من الحالة المحدّثة.`:`تم حفظ ${saved} نموذج في مكتبة المستندات. لا تُنشأ سجلات موظفين أو قرارات تعيين من تهيئة النماذج.`);}}
  });
  function chooseDepartment(code){state.department=code;state.typeCode='';panel.querySelector('[data-doc-department]').value=code;renderSelection();}
  panel.querySelector('[data-doc-department]').addEventListener('change',event=>chooseDepartment(event.target.value));
  panel.querySelector('[data-doc-gap-filter]').addEventListener('change',renderInventory);
  panel.querySelector('[data-doc-departments]').addEventListener('click',event=>{const button=event.target.closest('[data-doc-department-card]');if(button)chooseDepartment(button.dataset.docDepartmentCard);});
  panel.querySelector('[data-doc-inventory]').addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||state.loading)return;
    const dept=state.inventory?.departments.find(d=>d.code===button.dataset.department),code=button.dataset.docSetup||button.dataset.docCreateType||button.dataset.docViewType,item=dept?.items.find(t=>t.code===code);if(!item)return;
    if(button.dataset.docSetup){
      if(!canManage()||!item.setup)return;const c=context();button.disabled=true;
      try{await request('/documents/templates',{method:'POST',body:JSON.stringify(item.setup)});if(!current(c))return;await loadOrganization(c.orgId);if(c.orgId===state.orgId&&c.session===session())note('تمت تهيئة النموذج؛ يمكنك إنشاء المستند الآن.');}
      catch(error){if(current(c))note(error instanceof Error?error.message:'تعذر تهيئة النموذج');}
      finally{button.disabled=false;}return;
    }
    chooseDepartment(dept.code);state.typeCode=button.dataset.docViewType?code:'';renderDocuments();
    if(item.activeTemplateId){panel.querySelector('[data-doc-template]').value=item.activeTemplateId;renderFields({});}
    panel.querySelector(button.dataset.docViewType?'[data-doc-list]':'[data-doc-form]').scrollIntoView({block:'center'});
  });
  panel.querySelector('[data-doc-refresh]')?.addEventListener('click',refresh);
  panel.querySelector('[data-doc-org]')?.addEventListener('change',e=>loadOrganization(e.target.value));
  panel.querySelector('[data-doc-template]')?.addEventListener('change',()=>renderFields({}));
  panel.querySelector('[data-doc-cancel]')?.addEventListener('click',resetEditor);
  panel.querySelector('[data-doc-form]')?.addEventListener('submit',async event=>{
    event.preventDefault();const template=activeTemplate();if(!template||!state.orgId||!canWrite()||state.loading)return;
    const c=context(),editingId=state.editing?.id,payload=Object.fromEntries(new FormData(event.currentTarget).entries()),save=panel.querySelector('[data-doc-save]');save.disabled=true;
    try{
      const contentHash=await hash(payload);if(!current(c))return;
      if(editingId)await request(`/documents/${encodeURIComponent(editingId)}/revise`,{method:'POST',body:JSON.stringify({contentHash,payload})});
      else await request('/documents',{method:'POST',body:JSON.stringify({organizationId:c.orgId,templateId:template.id,department:template.department,contentHash,payload})});
      if(!current(c))return;await loadOrganization(c.orgId);
      if(c.orgId===state.orgId&&c.session===session())note(editingId?'تم حفظ التعديل والإصدار الجديد.':'تم حفظ المستند كمسودة.');
    }catch(error){if(current(c))note(error instanceof Error?error.message:'تعذر حفظ المستند');}
    finally{if(current(c))save.disabled=!activeTemplate()||!canWrite();}
  });
  panel.querySelector('[data-doc-list]')?.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-doc-action]');if(!button||state.loading)return;
    const article=button.closest('[data-document-id]'),id=article?.dataset.documentId,d=state.documents.find(x=>x.id===id);if(!d)return;
    const action=button.dataset.docAction,c=context();button.disabled=true;
    try{
      if(action==='edit'){state.editing=d;const select=panel.querySelector('[data-doc-template]');select.value=d.templateId;select.disabled=true;panel.querySelector('[data-doc-form-title]').textContent='تعديل المسودة';panel.querySelector('[data-doc-cancel]').hidden=false;renderFields(d.payload||{});panel.querySelector('[data-doc-form]').scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='pdf'){const response=await window.HydrolandAuth.authorizedFetch(`/documents/${encodeURIComponent(id)}/pdf`);if(!response.ok)throw new Error(`HTTP ${response.status}`);const blob=await response.blob();if(!current(c))return;const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);return;}
      await request(`/documents/${encodeURIComponent(id)}/${action}`,{method:'POST'});if(!current(c))return;await loadOrganization(c.orgId);
      if(c.orgId===state.orgId&&c.session===session())note(action==='submit'?'تم إرسال المستند للاعتماد.':action==='approve'?'تم اعتماد المستند.':action==='sign'?'تم توقيع المستند.':'تمت أرشفة المستند.');
    }catch(error){if(current(c))note(error instanceof Error?error.message:'تعذر تنفيذ الإجراء');}
    finally{button.disabled=false;}
  });
  const connectDocumentButtons=root=>{root.querySelectorAll?.('button').forEach(button=>{const label=(button.textContent||'').trim();if(!['العقود الإلكترونية','رفع الوثائق','التوقيع الإلكتروني','طلب اعتماد الإدارة','متابعة الحالة'].includes(label)||button.dataset.hlDocumentsConnected)return;button.dataset.hlDocumentsConnected='1';button.disabled=false;button.removeAttribute('aria-disabled');button.title='';button.addEventListener('click',()=>{panel.hidden=false;refresh();panel.scrollIntoView({behavior:'smooth',block:'start'})})})};
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)connectDocumentButtons(node)})));observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('hydroland:role-changed',event=>{if(event.detail?.role==='organization'){panel.hidden=false;refresh()}else panel.hidden=true});
  const clear=()=>{state.generation++;state.orgId=null;state.memberships=[];state.department='';state.typeCode='';state.loading=false;clearData();panel.querySelector('[data-doc-org]').replaceChildren();note('');panel.hidden=true;};
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())clear();else if(!panel.hidden)refresh();});
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
  window.HydrolandDocuments={open:(options={})=>{if(!window.HydrolandAuth?.isAuthenticated?.())return;state.department=options.department||'';state.typeCode='';state.preferInternal=options.internal===true||window.HydrolandPortalAccess?.getCurrentRole?.()==='admin';panel.hidden=false;refresh();},refresh};
})();
