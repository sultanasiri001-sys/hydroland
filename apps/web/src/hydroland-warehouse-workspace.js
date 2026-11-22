(() => {
  const auth = () => window.HydrolandAuth;
  const profile = document.querySelector('#profile-dialog .profile-list');
  if (!profile) return;
  const ui = window.HydrolandI18n.createScope('warehouse-workspace', {
    'المستودع والعهد':'Warehouse and custody','إغلاق':'Close','طلب شراء':'Purchase request','محضر جرد':'Stock count',
    'طلب صرف':'Issue request','استلام توريد':'Receive delivery','المرجع':'Reference','مرجع أمر الشراء':'Purchase order reference',
    'مرجع المورد':'Supplier reference','معرّف الصنف':'Item ID','الكمية':'Quantity','تكلفة الوحدة بالهللة':'Unit cost in halalas',
    'مرجع الدفعة':'Lot reference','العدد الفعلي':'Physical count','سبب الجرد':'Count reason','حساب المستلم':'Custodian account ID',
    'مرجع بند الشراء':'Purchase line reference','معرّف الموقع':'Location ID','حفظ':'Save','الطلبات الأخيرة':'Recent requests',
    'مراجعة':'Review','اعتماد':'Approve','تنفيذ الصرف':'Post issue','عهد بانتظار إقراري':'Custody awaiting my acknowledgment',
    'إقرار الاستلام':'Acknowledge receipt','لا توجد طلبات':'No requests','تعذّر إكمال الإجراء':'Operation failed',
    'دفعات الاستلام الأخيرة':'Recent stock receipts','الرصيد الحالي':'Current balance','تحديث':'Refresh','تفاصيل الطلب':'Request details','العدد الدفتري':'Book quantity','فرق الجرد':'Count difference',
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
      if(!data?.organizationId || !Array.isArray(data.requests) || !Array.isArray(data.receipts) || !Array.isArray(data.custody)) throw new Error(ui.t('تعذّر إكمال الإجراء'));
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
  const labels={purchaseReference:'مرجع أمر الشراء',supplierId:'مرجع المورد',itemId:'معرّف الصنف',quantity:'الكمية',
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
  function render(data) {
    content.replaceChildren();
    if(data.inventory){
      form('طلب شراء','purchase-requests',['purchaseReference','supplierId','itemId','quantity','unitCostMinor']);
      form('استلام توريد','receipts',['lineId','locationId','quantity']);
      form('محضر جرد','counts',['lotId','counted','reason']);
      form('طلب صرف','issue-requests',['lotId','custodianId','quantity']);
    }
    add(content,'h3','الطلبات الأخيرة');
    if(!data.requests.length)add(content,'p','لا توجد طلبات');
    const kinds={PURCHASE:'طلب شراء',COUNT:'محضر جرد',ISSUE:'طلب صرف'};
    for(const row of data.requests){
      const group=add(content,'details'),summary=add(group,'summary');
      add(summary,'span',kinds[row.kind]);summary.append(' · ',row.id,' · ');
      add(summary,'span',row.finalizedAt?'معتمد':row.reviewedAt?'بانتظار الاعتماد':'بانتظار المراجعة');
      for(const [key,label] of Object.entries(labels)) if(row.details[key]!==undefined)value(group,label,row.details[key]);
      if(row.kind==='COUNT')value(group,'فرق الجرد',row.details.counted-row.details.expected);
      const path='requests/'+encodeURIComponent(row.id)+'/';
      if(row.review)button(group,'مراجعة',()=>post(path+'review',{digest:row.digest}));
      if(row.finalize)button(group,'اعتماد',()=>post(path+'finalize',{digest:row.digest}));
      if(data.inventory&&row.finalizedAt&&row.kind==='ISSUE')button(group,'تنفيذ الصرف',()=>post('issue-requests/'+encodeURIComponent(row.id)+'/post',{}));
    }
    if(data.receipts.length){
      add(content,'h3','دفعات الاستلام الأخيرة');
      for(const receipt of data.receipts){
        const group=add(content,'details');add(group,'summary').textContent=receipt.receiptId;
        value(group,'مرجع بند الشراء',receipt.lineId);value(group,'معرّف الصنف',receipt.lot.itemId);
        value(group,'معرّف الموقع',receipt.lot.locationId);value(group,'الكمية',receipt.lot.received);
        value(group,'الرصيد الحالي',receipt.lot.onHand);value(group,'تكلفة الوحدة بالهللة',receipt.lot.unitCostMinor);
      }
    }
    if(data.custody.length)add(content,'h3','عهد بانتظار إقراري');
    for(const r of data.custody){
      const section=add(content,'section');value(section,'المرجع',r.requestId);value(section,'مرجع الدفعة',r.lotId);value(section,'الكمية',r.quantity);
      button(section,'إقرار الاستلام',()=>post('custody/'+encodeURIComponent(data.organizationId)+'/'+encodeURIComponent(r.requestId)+'/acknowledge',{}));
    }
    button(content,'تحديث',()=>refresh());
  }
  dialog.addEventListener('close',()=>{generation++;content.replaceChildren();status.replaceChildren();});
  for(const name of ['session-cleared','portal-cleared','role-changed'])document.addEventListener('hydroland:'+name,clear);
  for(const name of ['auth-changed','profile-data-ready','role-changed'])document.addEventListener('hydroland:'+name,()=>{clear();void refresh();});
  void refresh();
})();
