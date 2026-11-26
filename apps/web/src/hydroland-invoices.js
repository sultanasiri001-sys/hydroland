(()=>{
  const ui=window.HydrolandI18n.createScope('invoices',{
    'فواتيري':'My invoices','المشتريات':'Purchases','المبيعات':'Sales','الكل':'All','إغلاق':'Close',
    'خدمة مدرب مستقل':'Independent instructor service','دورة تدريبية':'Training course','تأجير معدات':'Equipment rental','مطالبة تأجير':'Rental claim',
    'حجز رحلة':'Trip booking','طلب متجر':'Store order','شراء':'Purchase','بيع':'Sale',
    'طباعة فاتورة المركز':'Print center invoice', 'رقم الفاتورة':'Invoice number','تحميل الفاتورة PDF':'Download invoice PDF',
    'بانتظار فاتورة البائع':'Awaiting the seller’s invoice','نسخة PDF غير مرفقة':'PDF not attached',
    'فاتورة ملغاة':'Voided invoice','ملف الفاتورة الأصلي':'Original invoice PDF','ربط الفاتورة':'Attach invoice',
    'لا توجد فواتير في هذا العرض.':'No invoices in this view.','تحميل المزيد':'Load more',
    'جارٍ التحميل…':'Loading…','تعذّر تحميل الفواتير.':'Could not load invoices.',
    'تعذّر تحميل الملف.':'Could not download the file.','تعذّر ربط الملف.':'Could not attach the file.',
    'سجل الفواتير':'Invoice register','إعادة المحاولة':'Retry','رقم العملية':'Transaction reference',
    'مراجعة أصل فاتورة المركز':'Review center invoice original','اعتماد أصل فاتورة المركز':'Approve center invoice original',
    'أصل فاتورة المركز معتمد':'Center invoice original approved','بانتظار اعتماد أصل فاتورة المركز':'Awaiting center invoice original approval',
    'بيانات البائع':'Seller details','بيانات المشتري':'Buyer details','رقم التسجيل':'Registration number','العنوان':'Address',
    'غير متوفر':'Not available','المبلغ':'Amount','مرجع قيد التحصيل':'Collection ledger reference',
    'تاريخ ووقت إصدار الفاتورة الأصلية (بتوقيت السعودية)':'Original invoice issue date and time (Saudi time)',
    'تاريخ إصدار الأصل':'Original issue date','افتح أصل PDF وتحقق من بياناته قبل الاعتماد.':'Open the original PDF and verify its details before approval.',
    'أؤكد مطابقة أصل PDF لبيانات البائع والمشتري ورقم الفاتورة والمبلغ والعملة وتاريخ الإصدار.':'I confirm that the original PDF matches the seller, buyer, invoice number, amount, currency and issue date.',
    'تعذرت مراجعة أصل الفاتورة.':'Could not review the invoice original.','تعذر اعتماد أصل الفاتورة.':'Could not approve the invoice original.',
    'تعذر التحقق من بيانات المراجعة.':'Could not verify the review details.',
    'أعد فتح المراجعة للتحقق من أحدث بيانات الفاتورة.':'Open the review again to check the latest invoice details.'
  });
  const labels={INSTRUCTOR_SERVICE:'خدمة مدرب مستقل',TRAINING_ENROLLMENT:'دورة تدريبية',TRIP_PAYMENT:'حجز رحلة',STORE_ORDER:'طلب متجر',
    EQUIPMENT_RENTAL:'تأجير معدات',RENTAL_DAMAGE:'مطالبة تأجير'};
  const auth=()=>window.HydrolandAuth;
  const dialog=document.createElement('dialog');
  dialog.id='hl-invoices-dialog';
  document.body.append(dialog);
  const element=(tag,parent,source)=>{
    const node=document.createElement(tag);
    if(source)ui.setText(node,source);
    parent.append(node);
    return node;
  };
  const button=(parent,source,click)=>{
    const node=element('button',parent,source);node.type='button';node.addEventListener('click',click);return node;
  };
  const heading=element('header',dialog);
  element('h2',heading,'فواتيري').id='hl-invoices-title';
  dialog.setAttribute('aria-labelledby','hl-invoices-title');
  button(heading,'إغلاق',()=>dialog.close());
  const filters=element('nav',dialog);
  ui.setAttribute(filters,'aria-label','سجل الفواتير');
  const list=element('section',dialog);
  let version=0,view='all',source=null;
  function request(path,options){return auth().authorizedFetch('/account/invoices'+path,options);}
  const sourcePath=row=>'/'+encodeURIComponent(row.sourceType)+'/'+encodeURIComponent(row.sourceId)+'/document';
  function finalization(row,article,stillHere){
    if(row.sourceType!=='TRIP_PAYMENT'||row.isSale!==true||
      !(row.canFinalize===true||['DRAFT','FINALIZED'].includes(row.finalizationStatus)))return;
    const section=element('section',article);section.dataset.invoiceFinalization='';
    element('p',section,row.finalizationStatus==='FINALIZED'?'أصل فاتورة المركز معتمد':'بانتظار اعتماد أصل فاتورة المركز');
    const content=element('div',section),status=element('p',section);status.setAttribute('role','status');status.dataset.finalizationStatus='';
    const path='/TRIP_PAYMENT/'+encodeURIComponent(row.sourceId)+'/finalization';
    let revision=0;
    const review=button(section,'مراجعة أصل فاتورة المركز',async()=>{
      const attempt=++revision,current=()=>stillHere()&&attempt===revision;
      review.disabled=true;content.replaceChildren();ui.setText(status,'جارٍ التحميل…');
      try{
        const response=await request(path);
        if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(typeof error?.message==='string'?error.message:'');}
        const data=await response.json();if(!current())return;
        if(!data||!['DRAFT','FINALIZED'].includes(data.status)||!Array.isArray(data.blockers)||
          !data.seller||!data.buyer||!Number.isSafeInteger(data.amountMinor)||data.amountMinor<0||data.currency!=='SAR')throw new Error(ui.t('تعذر التحقق من بيانات المراجعة.'));
        status.textContent='';
        const field=(parent,label,value)=>{const line=element('p',parent);element('span',line,label);line.append(document.createTextNode(': '));element('bdi',line).textContent=typeof value==='string'&&value?value:ui.t('غير متوفر');};
        for(const [label,party] of [['بيانات البائع',data.seller],['بيانات المشتري',data.buyer]]){
          const group=element('section',content);element('h4',group,label);
          element('p',group).textContent=typeof party.name==='string'?party.name:ui.t('غير متوفر');
          field(group,'رقم التسجيل',party.registrationNumber);field(group,'العنوان',party.address);
        }
        field(content,'رقم الفاتورة',data.number);
        field(content,'المبلغ',new Intl.NumberFormat(document.documentElement.lang==='en'?'en-GB':'ar-SA',{style:'currency',currency:data.currency}).format(data.amountMinor/100));
        field(content,'مرجع قيد التحصيل',data.collectionFinanceEntryId);
        if(data.status==='FINALIZED'){
          element('p',content,'أصل فاتورة المركز معتمد');
          const issued=new Date(data.issuedAt);
          if(data.issuedAt&&Number.isFinite(issued.getTime()))field(content,'تاريخ إصدار الأصل',new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(issued));
          return;
        }
        if(data.blockers.length){const blockers=element('ul',content);for(const reason of data.blockers)if(typeof reason==='string')element('li',blockers).textContent=reason;return;}
        if(data.canFinalize!==true)return;
        if(row.hasDocument!==true||!data.number||!data.collectionFinanceEntryId||
          !/^[a-f0-9]{64}$/i.test(data.documentSha256||'')||!/^[a-f0-9]{64}$/i.test(data.expectedEvidenceHash||''))throw new Error(ui.t('تعذر التحقق من بيانات المراجعة.'));
        element('p',content,'افتح أصل PDF وتحقق من بياناته قبل الاعتماد.');
        const form=element('form',content);form.dataset.invoiceFinalizationForm='';
        const dateLabel=element('label',form);element('span',dateLabel,'تاريخ ووقت إصدار الفاتورة الأصلية (بتوقيت السعودية)');
        const issuedAt=element('input',dateLabel);issuedAt.type='datetime-local';issuedAt.step='1';issuedAt.name='issuedAt';issuedAt.required=true;
        const confirmLabel=element('label',form),confirmed=element('input',confirmLabel);confirmed.type='checkbox';confirmed.name='originalInvoiceVerified';confirmed.required=true;
        element('span',confirmLabel,'أؤكد مطابقة أصل PDF لبيانات البائع والمشتري ورقم الفاتورة والمبلغ والعملة وتاريخ الإصدار.');
        const submit=element('button',form,'اعتماد أصل فاتورة المركز');submit.type='submit';submit.disabled=true;
        const enable=()=>{submit.disabled=!(issuedAt.value&&confirmed.checked);};issuedAt.addEventListener('input',enable);confirmed.addEventListener('change',enable);
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(submit.disabled||!current()||!form.reportValidity())return;
          const originalIssueDate=new Date(issuedAt.value+'+03:00');
          if(!Number.isFinite(originalIssueDate.getTime()))return;
          submit.disabled=true;review.disabled=true;issuedAt.disabled=true;confirmed.disabled=true;status.textContent='';
          try{
            const result=await request(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({issuedAt:originalIssueDate.toISOString(),expectedEvidenceHash:data.expectedEvidenceHash,originalInvoiceVerified:true})});
            const receipt=await result.json().catch(()=>null);
            if(!result.ok)throw new Error(typeof receipt?.message==='string'?receipt.message:'');
            if(!receipt||receipt.status!=='FINALIZED'||!receipt.finalizationId)throw new Error('');
            if(current())await load();
          }catch(error){if(current()){status.textContent=(error.message||ui.t('تعذر اعتماد أصل الفاتورة.'))+' '+ui.t('أعد فتح المراجعة للتحقق من أحدث بيانات الفاتورة.');}}
          finally{if(current())review.disabled=false;}
        });
      }catch(error){if(current()){content.replaceChildren();status.textContent=error.message||ui.t('تعذرت مراجعة أصل الفاتورة.');}}
      finally{if(current())review.disabled=false;}
    });
  }
  function card(row,current){
    const article=element('article',list);
    const stillHere=()=>current()&&article.isConnected;
    element('h3',article,labels[row.sourceType]);
    if(row.sellerName)element('p',article).textContent=row.sellerName;
    const locale=document.documentElement.lang==='en'?'en-GB':'ar-SA';
    const amount=new Intl.NumberFormat(locale,{style:'currency',currency:row.currency}).format(row.amountMinor/100);
    const date=new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(row.occurredAt));
    element('p',article).textContent=amount+' · '+date;
    const meta=element('p',article);
    if(row.isPurchase)element('span',meta,'شراء');
    if(row.isSale)element('span',meta,'بيع');
    const reference=element('small',article);
    element('span',reference,'رقم العملية');element('bdi',reference).textContent=row.sourceId;
    if(row.number){const id=element('p',article);element('span',id,'رقم الفاتورة');element('bdi',id).textContent=row.number;}
    if(row.nativeStatus==='VOID')element('p',article,'فاتورة ملغاة');
    if(row.hasDocument){
      if(row.canPrint && window.HydrolandPortalAccess?.getCurrentRole()==='center'){
        button(article,'طباعة فاتورة المركز',async()=>{
          const preview=window.open('about:blank','_blank');
          if(!preview){ui.setText(message,'تعذّر تحميل الملف.');return;}
          preview.opener=null;
          try{
            const response=await request(sourcePath(row));
            if(!response.ok || !stillHere())throw new Error();
            const url=URL.createObjectURL(await response.blob());
            const doc=preview.document;
            doc.title=row.sellerName+' · '+row.number;
            doc.documentElement.lang=document.documentElement.lang||'ar';
            doc.documentElement.dir=document.documentElement.dir||'rtl';
            const print=doc.createElement('button');
            print.type='button';print.textContent=ui.t('طباعة فاتورة المركز');
            const frame=doc.createElement('iframe');
            frame.title=doc.title;frame.style.cssText='width:100%;height:90vh;border:0;display:block';
            const printOriginal=()=>{frame.contentWindow.focus();frame.contentWindow.print();};
            print.addEventListener('click',printOriginal);frame.addEventListener('load',printOriginal,{once:true});
            frame.src=url;doc.body.replaceChildren(print,frame);
            preview.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
          }catch{preview.close();if(stillHere())ui.setText(message,'تعذّر تحميل الملف.');}
        });
      }
      const download=button(article,'تحميل الفاتورة PDF',async()=>{
        download.disabled=true;
        try{
          const response=await request(sourcePath(row));
          if(!response.ok)throw new Error();
          const blob=await response.blob();if(!stillHere())return;
          const url=URL.createObjectURL(blob),link=document.createElement('a');
          link.href=url;link.download='invoice-'+row.sourceId+'.pdf';document.body.append(link);link.click();link.remove();
          setTimeout(()=>URL.revokeObjectURL(url),60000);
        }catch{if(stillHere())ui.setText(message,'تعذّر تحميل الملف.');}
        finally{download.disabled=false;}
      });
    }else if(row.nativeStatus!=='VOID'){
      element('p',article,row.number?'نسخة PDF غير مرفقة':'بانتظار فاتورة البائع');
      if(row.canAttach){
        const form=element('form',article);
        const nLabel=element('label',form);element('span',nLabel,'رقم الفاتورة');
        const number=element('input',nLabel);number.required=true;number.maxLength=100;
        number.value=row.number||'';number.readOnly=Boolean(row.number);
        const fileLabel=element('label',form);element('span',fileLabel,'ملف الفاتورة الأصلي');
        const file=element('input',fileLabel);file.type='file';file.accept='application/pdf';file.required=true;
        const submit=element('button',form,'ربط الفاتورة');submit.type='submit';
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(submit.disabled||!stillHere())return;submit.disabled=true;
          try{
            const data=new FormData();data.set('number',number.value);data.set('document',file.files[0]);
            const response=await request(sourcePath(row),{method:'POST',body:data});
            if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.message||'');}
            if(stillHere())await load();
          }catch(error){if(stillHere()){if(error.message)message.textContent=error.message;else ui.setText(message,'تعذّر ربط الملف.');}}
          finally{submit.disabled=false;}
        });
      }
    }
    const message=element('p',article);message.setAttribute('role','status');
    finalization(row,article,stillHere);
  }
  async function load(offset=0){
    const revision=++version,session=auth().getSessionVersion();
    const current=()=>dialog.open&&version===revision&&session===auth().getSessionVersion();
    if(!offset)list.replaceChildren();
    // Existing cards must remain usable after an additional page is appended.
    const activeCard=()=>dialog.open&&session===auth().getSessionVersion();
    const status=element('p',list,'جارٍ التحميل…');status.setAttribute('role','status');
    const query=new URLSearchParams({view,offset:String(offset),...source});
    try{
      const response=await request('?'+query);
      if(!response.ok)throw new Error();
      const page=await response.json();if(!current())return;
      status.remove();
      if(!page.items.length&&!offset)element('p',list,'لا توجد فواتير في هذا العرض.');
      for(const row of page.items)card(row,activeCard);
      if(page.nextOffset!==null){const more=button(list,'تحميل المزيد',()=>{more.remove();load(page.nextOffset);});}
    }catch{if(current()){ui.setText(status,'تعذّر تحميل الفواتير.');button(status,'إعادة المحاولة',()=>{status.remove();load(offset);});}}
  }
  for(const [value,title] of Object.entries({all:'الكل',purchases:'المشتريات',sales:'المبيعات'})){
    const item=button(filters,title,()=>{view=value;showSelection();load();});item.dataset.view=value;
  }
  function showSelection(){
    for(const item of filters.children)item.setAttribute('aria-pressed',String(item.dataset.view===view));
  }
  function open(sourceType,sourceId){
    if(!auth()?.isAuthenticated()){document.getElementById('visitor-auth-cta')?.click();return;}
    source=sourceType&&sourceId?{sourceType,sourceId}:null;view='all';
    filters.hidden=Boolean(source);showSelection();
    if(!dialog.open)dialog.showModal();load();
  }
  // Email links carry only an opaque invoice key. The API authorizes the signed-in buyer on each read.
  let requestedLogin=false;
  function openNoticeLink(){
    const params=new URLSearchParams(location.hash.slice(1));
    const notice=params.get('notice');
    if(notice!=='invoice'&&notice!=='booking')return;
    const type=params.get('sourceType'),id=params.get('sourceId');
    if(notice==='invoice'&&(!Object.hasOwn(labels,type)||!id||id.length>200))return;
    if(!auth()?.isAuthenticated()){
      const signIn=document.getElementById('visitor-auth-cta');
      if(signIn&&!requestedLogin){requestedLogin=true;signIn.click();}
      return;
    }
    if(notice==='booking'&&!window.HydrolandAccountCenter)return;
    history.replaceState(history.state,'',location.pathname+location.search);
    if(notice==='invoice')open(type,id);
    else window.HydrolandAccountCenter.openNotifications();
  }
  document.addEventListener('hydroland:auth-changed',openNoticeLink);
  window.addEventListener('hashchange',()=>{requestedLogin=false;openNoticeLink();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openNoticeLink,{once:true});
  else queueMicrotask(openNoticeLink);
  function clear(){version++;list.replaceChildren();}
  dialog.addEventListener('close',clear);
  document.addEventListener('hydroland:session-cleared',()=>{if(dialog.open)dialog.close();clear();});
  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-account-invoices]');
    if(trigger){event.preventDefault();open(trigger.dataset.invoiceType,trigger.dataset.invoiceSource);}
  });
})();
