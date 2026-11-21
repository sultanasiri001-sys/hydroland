(() => {
  const columns = [
    ['sku','رقم المنتج','SKU'], ['nameAr','اسم المنتج','Product name'], ['description','الوصف','Description'],
    ['category','التصنيف','Category'], ['brand','العلامة التجارية','Brand'], ['family','رمز مجموعة المقاسات','Variant group code'],
    ['size','المقاس','Size'], ['color','اللون','Color'], ['barcode','الباركود','Barcode'], ['price','السعر الأساسي','Base price'],
    ['sale','سعر البيع بعد الخصم','Sale price'], ['currency','العملة','Currency'], ['stock','المخزون','Stock'],
    ['status','الحالة','Status'], ['startsAt','بداية الخصم','Sale start'], ['endsAt','نهاية الخصم','Sale end'], ['kind','نوع العرض','Offer type'],
  ];
  const labels = Object.fromEntries(columns.map(([,ar,en])=>[ar,en]));
  Object.assign(labels, {
    'استيراد المنتجات':'Import products','تنزيل قالب CSV':'Download CSV template','اختر ملف CSV':'Choose a CSV file',
    'الملف يقبل حتى ٢٠٠ صنف. استخدم GOODS للسلعة أو SERVICE للخدمة. سعر البيع بعد الخصم اختياري.':'Import up to 200 items. Set GOODS for merchandise or SERVICE for a service. The sale price is optional.',
    'تطبيق حالات النشر الواردة في الملف':'Apply publication statuses from the file','حفظ المنتجات':'Save products',
    'معاينة المنتجات':'Product preview','تعذرت قراءة الملف. تحقق من الأعمدة والقيم.':'Could not read the file. Check the columns and values.',
    'اختر ملفًا بحد أقصى ٢ ميجابايت.':'Choose a file up to 2 MB.','منتجات جاهزة للاستيراد':'Products ready to import',
    'تم حفظ المنتجات':'Products saved','حفظ كمسودة':'Save as draft','السطر':'Row',
  });
  const ui=window.HydrolandI18n?.createScope('catalog-import',labels);
  const t=key=>ui?.t(key)??key;
  const invalid=()=>new Error(t('تعذرت قراءة الملف. تحقق من الأعمدة والقيم.'));
  function parse(text){
    const rows=[], row=[];
    let field='', quoted=false, closed=false;
    const finish=()=>{row.push(field);field='';closed=false};
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){
        if(c!=='"'){field+=c;continue}
        if(text[i+1]==='"'){field+='"';i++;continue}
        quoted=false;closed=true;continue;
      }
      if(c===','){finish();continue}
      if(c==='\r'||c==='\n'){
        if(c==='\r'&&text[i+1]==='\n')i++;
        finish();if(row.some(x=>x!==''))rows.push(row.slice());row.length=0;
        if(rows.length>201)throw invalid();continue;
      }
      if(closed)throw invalid();
      if(c==='"'){if(field!=='')throw invalid();quoted=true;continue}
      field+=c;
    }
    if(quoted)throw invalid();
    finish();if(row.some(x=>x!==''))rows.push(row);
    return rows;
  }
  const money=value=>{
    if(!/^\d+(\.\d{1,2})?$/.test(value))throw invalid();
    const minor=Math.round(Number(value)*100);
    if(!Number.isSafeInteger(minor)||minor>2147483647)throw invalid();
    return minor;
  };
  function read(text, useStatuses){
    const [header,...data]=parse(text.replace(/^\uFEFF/,''));
    if(!header || !data.length || data.length>200)throw invalid();
    const fields=header.map(h=>columns.find(column=>column.includes(h.trim()))?.[0]);
    if(fields.some(x=>!x)||new Set(fields).size!==fields.length||['sku','nameAr','price','stock','kind'].some(k=>!fields.includes(k)))throw invalid();
    return data.map((row,index)=>{
      try {
        if(row.length!==fields.length)throw invalid();
        const r=Object.fromEntries(fields.map((f,i)=>[f,row[i].trim()]));
        if(!r.nameAr||!r.sku||!['GOODS','SERVICE'].includes(r.kind)||!/^\d+$/.test(r.stock))throw invalid();
        const priceMinor=money(r.price), stockQuantity=Number(r.stock), currency=r.currency||'SAR';
        const salePriceMinor=r.sale?money(r.sale):null;
        const status=useStatuses ? (r.status||'DRAFT') : 'DRAFT';
        if(!Number.isSafeInteger(stockQuantity)||stockQuantity>2147483647||!['DRAFT','ACTIVE','INACTIVE'].includes(status)||!/^[A-Z]{3}$/.test(currency)
          ||(salePriceMinor!==null&&(salePriceMinor<=0||salePriceMinor>=priceMinor)))throw invalid();
        const catalogDetails={salePriceMinor,startsAt:r.startsAt||null,endsAt:r.endsAt||null};
        for(const key of ['family','size','color','category','brand','barcode']) catalogDetails[key]=r[key]||'';
        return {sku:r.sku,nameAr:r.nameAr,description:r.description||'',kind:r.kind,status,currency,priceMinor,stockQuantity,catalogDetails};
      } catch(error){throw Error(t('السطر')+' '+(index+2)+' — '+error.message)}
    });
  }
  function template(){
    const url=URL.createObjectURL(new Blob(['\uFEFF'+columns.map(c=>c[0]).join(',')+'\r\n'],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='hydroland-catalog-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function mount(box,role,reload){
    const details=document.createElement('details'), summary=document.createElement('summary');
    const element=(tag,label)=>{const el=document.createElement(tag);if(label)el.textContent=t(label);details.append(el);return el};
    summary.textContent=t('استيراد المنتجات');details.dataset.catalogImport=role;details.append(summary);box.append(details);
    element('p','الملف يقبل حتى ٢٠٠ صنف. استخدم GOODS للسلعة أو SERVICE للخدمة. سعر البيع بعد الخصم اختياري.');
    const download=element('button','تنزيل قالب CSV');download.type='button';download.onclick=template;
    const picker=element('label','اختر ملف CSV'), file=document.createElement('input');file.type='file';file.accept='.csv,text/csv';picker.append(file);
    const opt=element('label','تطبيق حالات النشر الواردة في الملف'),statuses=document.createElement('input');statuses.type='checkbox';opt.prepend(statuses);
    const preview=element('ul');preview.setAttribute('aria-label',t('معاينة المنتجات'));
    const go=element('button','حفظ المنتجات');go.type='button';go.disabled=true;
    const feedback=element('p');feedback.setAttribute('role','status');
    let intent=0,requestId=null,rows=[],session=null;
    function reset(){
      intent++;rows=[];requestId=null;preview.replaceChildren();feedback.textContent='';go.disabled=true;
      file.value='';statuses.checked=false;file.disabled=false;statuses.disabled=false;details.open=false;
    }
    async function update(){
      const version=++intent;session=window.HydrolandAuth?.getSessionVersion?.();
      requestId=null;rows=[];preview.replaceChildren();feedback.textContent='';go.disabled=true;
      const selected=file.files[0];if(!selected)return;
      try {
        if(selected.size>2*1024*1024)throw Error(t('اختر ملفًا بحد أقصى ٢ ميجابايت.'));
        const text=await selected.text();if(version!==intent)return;
        rows=read(text,statuses.checked);requestId=crypto.randomUUID();
        for(const item of rows.slice(0,8)){
          const li=document.createElement('li');li.textContent=[item.sku,item.nameAr,(item.priceMinor/100).toFixed(2),item.currency,item.status].join(' · ');preview.append(li);
        }
        feedback.textContent=rows.length+' '+t('منتجات جاهزة للاستيراد');go.disabled=false;
      } catch(error){if(version===intent)feedback.textContent=error.message}
    }
    go.onclick=async()=>{
      if(go.disabled||!rows.length||session!==window.HydrolandAuth?.getSessionVersion?.())return;
      go.disabled=true;file.disabled=true;statuses.disabled=true;const version=intent;
      try{
        const response=await window.HydrolandAuth.authorizedFetch('/store/'+role+'/catalog/import',{method:'POST',body:JSON.stringify({rows,requestId})});
        const body=await response.json();if(version!==intent||session!==window.HydrolandAuth?.getSessionVersion?.())return;
        if(!response.ok)throw Error(body.message||t('تعذرت قراءة الملف. تحقق من الأعمدة والقيم.'));
        const count=body.count,previousSession=session;reset();await reload();
        const current=box.querySelector('[data-catalog-import]');
        if(current && !box.hidden && previousSession===window.HydrolandAuth?.getSessionVersion?.()){current.open=true;current.querySelector('[role=status]').textContent=t('تم حفظ المنتجات')+' · '+count}
      }catch(error){if(version===intent){feedback.textContent=error.message;go.disabled=false}}
      finally{if(version===intent){file.disabled=false;statuses.disabled=false}}
    };
    file.onchange=update;statuses.onchange=update;
    return reset;
  }
  window.HydrolandCatalogImport=Object.freeze({mount,read});
})();
