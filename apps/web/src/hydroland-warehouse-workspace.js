(() => {
  const auth = () => window.HydrolandAuth;
  const profile = document.querySelector('#profile-dialog .profile-list');
  if (!profile) return;
  const ui = window.HydrolandI18n.createScope('warehouse-workspace', {
    'المستودع والعهد':'Warehouse and custody','تحويل بين المستودعات':'Warehouse transfer','إرجاع عهدة':'Return custody',
    'الموقع المستلم':'Destination location','مرجع الصرف':'Issue reference','تأكيد استلام التحويل أو المرتجع':'Confirm movement receipt',
    'دفعات المخزون':'Stock lots','سجلات تأهيل الموردين':'Supplier qualification records','مرجع التأهيل':'Qualification reference','الكمية المعادة':'Returned quantity',
    'عهدي':'My custody','مرجع قرار تأهيل المورد':'Supplier acceptance decision reference','إغلاق':'Close','طلب شراء':'Purchase request','محضر جرد':'Stock count',
    'طلب صرف':'Issue request','استلام توريد':'Receive delivery','المرجع':'Reference','مرجع أمر الشراء':'Purchase order reference',
    'مرجع المورد':'Supplier reference','معرّف الصنف':'Item ID','الكمية':'Quantity','تكلفة الوحدة بالهللة':'Unit cost in halalas',
    'مرجع الدفعة':'Lot reference','العدد الفعلي':'Physical count','سبب الجرد':'Count reason','حساب المستلم':'Custodian account ID',
    'مرجع بند الشراء':'Purchase line reference','معرّف الموقع':'Location ID','حفظ':'Save','الطلبات الأخيرة':'Recent requests',
    'مراجعة':'Review','اعتماد':'Approve','تنفيذ الصرف':'Post issue','عهد بانتظار إقراري':'Custody awaiting my acknowledgment',
    'إقرار الاستلام':'Acknowledge receipt','لا توجد طلبات':'No requests','تعذّر إكمال الإجراء':'Operation failed',
    'دفعات الاستلام الأخيرة':'Recent stock receipts','الرصيد الحالي':'Current balance','ممثل المشتريات':'Procurement representative','رقم حساب الموظف':'Employee account ID','تكليف':'Assign','إلغاء التكليف':'Revoke assignment',
    'توصية المشتريات':'Procurement recommendation','مسوغات التوصية':'Recommendation grounds','مسوغات القرار':'Decision grounds',
    'اختر القرار':'Select a decision','موافقة':'Approve','رفض':'Decline','مرفوض':'Declined','بانتظار توصية المشتريات':'Awaiting procurement recommendation',
    'قرار الإدارة العليا':'Executive decision','تسجيل التوصية':'Record recommendation','تسجيل القرار':'Record decision','تحديث':'Refresh','تفاصيل الطلب':'Request details','العدد الدفتري':'Book quantity','فرق الجرد':'Count difference',
    'بانتظار المراجعة':'Awaiting review','بانتظار الاعتماد':'Awaiting approval','معتمد':'Approved','تم الحفظ':'Saved'
  });
  const dialog = document.createElement('dialog');
  document.body.append(dialog);
  function add(parent, tag, label) {
    const node = document.createElement(tag); parent.append(node);
    if (label) ui.setText(node,label);
    return node;
  }
  function button(parent, label, action) {
    const b = add(parent,'button',label); b.type='button'; b.addEventListener('click',action); return b;
  }
  const heading = add(dialog,'h2','المستودع والعهد'); heading.id='warehouse-workspace-title';
  dialog.setAttribute('aria-labelledby',heading.id);
  button(dialog,'إغلاق',()=>dialog.close());
  const status = add(dialog,'p'); status.setAttribute('role','status');
  const content = add(dialog,'section');
  const launch = button(profile,'المستودع والعهد',()=>{document.getElementById('profile-dialog')?.close();dialog.showModal();void refresh();});
  launch.hidden=true;
  let generation=0, busy=false;
  function clear() {
    generation++; busy=false; launch.hidden=true; status.replaceChildren();content.replaceChildren();
    if(dialog.open) dialog.close();
  }
  async function api(path, body) {
    const options=body===undefined?{}:{method:'POST',body:JSON.stringify(body)};
    const response=await auth().authorizedFetch('/warehouse/'+path,options);
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(typeof data?.message==='string'?data.message:ui.t('تعذّر إكمال الإجراء'));
    return data;
  }
  async function refresh(notice='') {
    if(!auth()?.isAuthenticated?.()) return;
    const token=++generation, session=auth().getSessionVersion();
    try {
      const data=await api('workspace');
      if(!data?.organizationId || !Array.isArray(data.requests) || !Array.isArray(data.lots) || !Array.isArray(data.custody)) throw new Error(ui.t('تعذّر إكمال الإجراء'));
      if(token!==generation||session!==auth().getSessionVersion()) return;
      launch.hidden=false;
      if(dialog.open){render(data); if(notice) ui.setText(status,notice); else status.replaceChildren();}
    } catch(error) {
      if(token!==generation) return;
      launch.hidden=true; content.replaceChildren(); status.textContent=error.message;
    }
  }
  async function post(path,body) {
    if(busy) return;
    const token=generation;busy=true;content.inert=true;
    try { await api(path,body); if(token===generation) await refresh('تم الحفظ'); }
    catch(error) {if(token===generation)status.textContent=error.message;}
    finally {busy=false;content.inert=false;}
  }
  const labels={supplierRef:'مرجع المورد',supplierAcceptanceRef:'مرجع قرار تأهيل المورد',issueId:'مرجع الصرف',destinationId:'الموقع المستلم',purchaseReference:'مرجع أمر الشراء',supplierId:'مرجع التأهيل',itemId:'معرّف الصنف',quantity:'الكمية',
    unitCostMinor:'تكلفة الوحدة بالهللة',lotId:'مرجع الدفعة',counted:'العدد الفعلي',reason:'سبب الجرد',
    custodianId:'حساب المستلم',lineId:'مرجع بند الشراء',locationId:'معرّف الموقع',expected:'العدد الدفتري'};
  const numbers=new Set(['quantity','counted','unitCostMinor']);
  function form(title,path,fields) {
    const group=add(content,'details');add(group,'summary',title);
    const panel=add(group,'form'),id=crypto.randomUUID();
    for(const key of fields){
      const label=add(panel,'label');add(label,'span',labels[key]);const input=add(label,'input');
      input.name=key;input.required=true;
      if(numbers.has(key)){input.type='number';input.min=key==='quantity'?'1':'0';input.max='2147483647';input.step='1';}
    }
    add(panel,'button','حفظ').type='submit';
    panel.addEventListener('submit',e=>{
      e.preventDefault();const data=Object.fromEntries(new FormData(panel));
      for(const key of fields) if(numbers.has(key)) data[key]=Number(data[key]);
      void post(path+'/'+id,data);
    });
  }
  function value(parent,label,v) {
    const p=add(parent,'p');add(p,'span',label);p.append(' · ',String(v));
  }
  function opinionForm(group,row,stage) {
    const panel=add(group,'form');
    const title=stage==='recommend'?'توصية المشتريات':'قرار الإدارة العليا';
    const select=add(add(panel,'label',title),'select');
    select.required=true;const placeholder=add(select,'option','اختر القرار');placeholder.value='';placeholder.disabled=true;placeholder.selected=true;
    for(const [key,label] of [['APPROVE','موافقة'],['DECLINE','رفض']]) add(select,'option',label).value=key;
    const note=add(add(panel,'label',stage==='recommend'?'مسوغات التوصية':'مسوغات القرار'),'textarea');
    note.required=true;note.minLength=3;note.maxLength=1000;
    add(panel,'button',stage==='recommend'?'تسجيل التوصية':'تسجيل القرار').type='submit';
    panel.addEventListener('submit',event=>{
      event.preventDefault();
      void post('requests/'+encodeURIComponent(row.id)+'/'+stage,{digest:stage==='finalize'?row.finalDigest:row.digest,decision:select.value,note:note.value});
    });
  }

  function render(data) {
    content.replaceChildren();
    if(data.executive){
      const group=add(content,'details');add(group,'summary','ممثل المشتريات');
      const panel=add(group,'form'),account=add(add(panel,'label','رقم حساب الموظف'),'input');
      account.required=true;account.maxLength=128;
      const assign=add(panel,'button','تكليف'), revoke=add(panel,'button','إلغاء التكليف');
      assign.type=revoke.type='submit';
      panel.addEventListener('submit',e=>{e.preventDefault();void post('procurement-representatives/'+encodeURIComponent(account.value.trim()),{active:e.submitter===assign});});
    }
    if(data.inventory){
      if(data.suppliers?.length){
        const docs=add(content,'details');add(docs,'summary','سجلات تأهيل الموردين');
        for(const supplier of data.suppliers)add(docs,'p').textContent=supplier.referenceNumber+' · '+supplier.id;
      }
      form('تحويل بين المستودعات','transfers',['lotId','destinationId','quantity']);
      form('طلب شراء','purchase-requests',['purchaseReference','supplierId','itemId','quantity','unitCostMinor']);
      form('استلام توريد','receipts',['lineId','locationId','quantity']);
      form('محضر جرد','counts',['lotId','counted','reason']);
      form('طلب صرف','issue-requests',['lotId','custodianId','quantity']);
    }
    add(content,'h3','الطلبات الأخيرة');
    if(!data.requests.length)add(content,'p','لا توجد طلبات');
    const kinds={TRANSFER:'تحويل بين المستودعات',RETURN:'إرجاع عهدة',PURCHASE:'طلب شراء',COUNT:'محضر جرد',ISSUE:'طلب صرف'};
    for(const row of data.requests){
      const group=add(content,'details'),summary=add(group,'summary');
      add(summary,'span',kinds[row.kind]);summary.append(' · ',row.id,' · ');
      add(summary,'span',row.finalizedAt?(row.finalDecision==='APPROVE'?'معتمد':'مرفوض'):row.recommendedAt?'بانتظار الاعتماد':row.reviewedAt?'بانتظار توصية المشتريات':'بانتظار المراجعة');
      for(const [key,label] of Object.entries(labels)) if(row.details[key]!==undefined)value(group,label,row.details[key]);
      if(row.kind==='COUNT')value(group,'فرق الجرد',row.details.counted-row.details.expected);
      const path='requests/'+encodeURIComponent(row.id)+'/';
      if(row.review)button(group,'مراجعة',()=>post(path+'review',{digest:row.digest}));
      if(row.recommendedAt){
        const rec=add(group,'p');add(rec,'span','توصية المشتريات');rec.append(' · ');add(rec,'span',row.recommendation==='APPROVE'?'موافقة':'رفض');
        value(group,'مسوغات التوصية',row.recommendationNote);
      }
      if(row.finalizedAt)value(group,'مسوغات القرار',row.finalNote);
      if(row.recommend)opinionForm(group,row,'recommend');
      if(row.finalize)opinionForm(group,row,'finalize');
      if(data.inventory&&row.finalDecision==='APPROVE'&&!row.postedAt&&['TRANSFER','RETURN'].includes(row.kind))
        button(group,'تأكيد استلام التحويل أو المرتجع',()=>post('movements/'+encodeURIComponent(row.id)+'/receive',{}));
      if(data.inventory&&row.finalDecision==='APPROVE'&&row.kind==='ISSUE')button(group,'تنفيذ الصرف',()=>post('issue-requests/'+encodeURIComponent(row.id)+'/post',{}));
    }
    if(data.lots.length){
      add(content,'h3','دفعات المخزون');
      for(const lot of data.lots){
        const group=add(content,'details');add(group,'summary').textContent=lot.lotId;
        value(group,'مرجع أمر الشراء',lot.purchaseReference);value(group,'معرّف الصنف',lot.itemId);
        value(group,'معرّف الموقع',lot.locationId);value(group,'الكمية',lot.received);
        value(group,'الرصيد الحالي',lot.onHand);value(group,'تكلفة الوحدة بالهللة',lot.unitCostMinor);
      }
    }
    const custody=[...data.custody,...(data.held || [])];
    if(custody.length)add(content,'h3','عهدي');
    if(custody.some(r=>r.acknowledgedAt && r.returned<r.quantity))form('إرجاع عهدة','returns',['issueId','quantity']);
    for(const r of custody){
      const section=add(content,'section');value(section,'مرجع الصرف',r.requestId);value(section,'مرجع الدفعة',r.lotId);value(section,'الكمية',r.quantity);
      if(r.returned)value(section,'الكمية المعادة',r.returned);
      if(!r.acknowledgedAt)button(section,'إقرار الاستلام',()=>post('custody/'+encodeURIComponent(data.organizationId)+'/'+encodeURIComponent(r.requestId)+'/acknowledge',{}));
    }
    button(content,'تحديث',()=>refresh());
  }
  dialog.addEventListener('close',()=>{generation++;content.replaceChildren();status.replaceChildren();});
  for(const name of ['session-cleared','portal-cleared','role-changed'])document.addEventListener('hydroland:'+name,clear);
  for(const name of ['auth-changed','profile-data-ready','role-changed'])document.addEventListener('hydroland:'+name,()=>{clear();void refresh();});
  void refresh();
})();
