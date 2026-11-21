(() => {
  const labels = {
    'لوحة خصومات المركز':'Center discount dashboard','يعرض أحدث ٢٠٠ طلب في الفترة المحددة، ويحسب قيمة بنود مركزك فقط.':'Shows the latest 200 matching orders and the value of your center’s items only.','نفد المخزون':'Out of stock',
    'نوع العرض':'Offer type','حساب سعر العرض':'Calculate sale price','طريقة الحساب':'Calculation method','نسبة مئوية':'Percentage','مبلغ الخصم':'Discount amount','قيمة الخصم':'Discount value','استخدام السعر المحسوب':'Use calculated price','أدخل السعر الأساسي وخصمًا أقل منه.':'Enter a regular price and a smaller discount.','سعر البيع المحسوب':'Calculated sale price',
    'تقارير المتجر':'Store reports','تصدير المنتجات':'Export products','تحديث تقرير الطلبات':'Refresh order report','تصدير الطلبات المعروضة':'Export displayed orders','من تاريخ':'From date','إلى تاريخ':'To date','العملة':'Currency','الحالة':'Status','بداية الخصم':'Sale start','نهاية الخصم':'Sale end','يعرض أحدث ٢٠٠ طلب. المبالغ هي قيمة الطلبات حسب حالتها.':'Includes the most recent 200 orders. Amounts are order values by status.','لا توجد طلبات للفترة المحددة.':'No orders in this date range.','تعذر تحميل التقرير.':'Could not load the report.','طلبات':'Orders','رقم الطلب':'Order number','تاريخ الطلب':'Order date','قيمة الطلب':'Order value','البحث في المنتجات والخدمات':'Search products and services','كل التصنيفات':'All categories','كل العلامات التجارية':'All brands','السعر من الأقل':'Price ascending','السعر من الأعلى':'Price descending','ترتيب المتجر':'Store order','المنتجات المخفضة فقط':'Discounted products only',
    'رمز مجموعة المقاسات':'Variant group code','المقاس':'Size','اللون':'Color','الباركود':'Barcode','التصنيف':'Category','العلامة التجارية':'Brand',
    'سعر البيع بعد الخصم':'Sale price','بداية الخصم بتوقيت الرياض':'Sale starts, Riyadh time','نهاية الخصم بتوقيت الرياض':'Sale ends, Riyadh time',
    'اترك سعر الخصم فارغًا للبيع بالسعر الأساسي.':'Leave the sale price empty to use the regular price.',
    'استخدم رمز المجموعة نفسه لكل المقاسات والألوان، ورقم منتج مستقلًا لكل خيار.':'Use the same group code for all sizes and colors, and a unique SKU for each option.',
    'السعر قبل الخصم':'Regular price','السعر الحالي':'Current price','اختر المقاس أو اللون':'Choose a size or color','لوحة الخصومات':'Discount dashboard',
    'جميع المنتجات':'All products','خصم سارٍ':'On sale','مجدول':'Scheduled','منتهي':'Ended','بدون خصم':'No discount','بحث بالاسم أو رقم المنتج':'Search by name or SKU',
    'الوصف':'Description','رقم المنتج':'SKU','حفظ التغييرات':'Save changes','إضافة مقاس أو لون':'Add a size or color','تعذر حفظ بيانات المنتج':'Could not save product details',
    'لم تطابق أي منتجات هذا البحث.':'No products matched your search.','اسم المنتج':'Product name','إلغاء التعديل':'Cancel editing','تحرير':'Edit',
    'تغير السعر. أفرغ السلة وراجع الأسعار المحدثة.':'Prices changed. Clear the cart and review the updated prices.','إفراغ السلة':'Clear cart',
    'خيارات المنتج':'Product options','السعر الأساسي':'Base price','المخزون':'Stock','رمز المجموعة مطلوب لربط المقاسات.':'A shared group code links sizes.',
    'رمز المنتج مستخدم. اختر رمزًا آخر.':'Choose a unique SKU.','أدخل سعر خصم أقل من السعر الأساسي.':'Enter a sale price below the regular price.',
    'السعر':'Price','الخصومات':'Discounts','تعديل الخصم':'Edit discount','ر.س':'SAR','حفظ الخصم':'Save discount',
  };
  const locale = window.HydrolandI18n?.createScope('product-catalog', labels);
  const t = key => locale?.t(key) ?? key;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields = [['family','رمز مجموعة المقاسات'],['size','المقاس'],['color','اللون'],['barcode','الباركود'],['category','التصنيف'],['brand','العلامة التجارية']];
  const riyadhTime = value => value ? new Date(Date.parse(value)+10800000).toISOString().slice(0,16) : '';
  function input(name,label,value,attrs='') {
    return '<label>'+esc(t(label))+'<input name="'+name+'" '+attrs+' value="'+esc(value)+'"></label>';
  }
  function discountFields(data={},currency='SAR') {
    return input('catalogSale','سعر البيع بعد الخصم',data.salePriceMinor == null ? '' : (data.salePriceMinor/100).toFixed(2),'type="number" step=".01" min=".01"')+
      '<div data-discount-calculator><button type="button" data-show-calc aria-expanded="false">'+esc(t('حساب سعر العرض'))+'</button><div data-calc-panel hidden>'+
      '<label>'+esc(t('طريقة الحساب'))+'<select data-calc-mode><option value="percent">'+esc(t('نسبة مئوية'))+'</option><option value="amount">'+esc(t('مبلغ الخصم'))+' · '+esc(currency)+'</option></select></label>'+
      '<label>'+esc(t('قيمة الخصم'))+'<input data-calc-value type="number" step=".01" min=".01"></label>'+
      '<button type="button" data-calc-price>'+esc(t('استخدام السعر المحسوب'))+'</button><output aria-live="polite"></output></div></div>'+
      '<small>'+esc(currency)+' · '+esc(t('اترك سعر الخصم فارغًا للبيع بالسعر الأساسي.'))+'</small>'+
      input('catalogStarts','بداية الخصم بتوقيت الرياض',riyadhTime(data.startsAt),'type="datetime-local"')+
      input('catalogEnds','نهاية الخصم بتوقيت الرياض',riyadhTime(data.endsAt),'type="datetime-local"');
  }
  document.addEventListener('click',event=>{
    const toggle=event.target.closest?.('[data-show-calc]');
    if(toggle){const panel=toggle.parentElement.querySelector('[data-calc-panel]');panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));return}
    const button=event.target.closest?.('[data-calc-price]');if(!button)return;
    const form=button.closest('form'),area=button.closest('[data-discount-calculator]');
    if(!form||!area)return;
    const baseValue=form.elements.namedItem('price')?.value;
    const discountValue=area.querySelector('[data-calc-value]').value;
    const percent=area.querySelector('[data-calc-mode]').value==='percent';
    const output=area.querySelector('output');
    const decimal=value=>typeof value==='string' && /^\d+(\.\d{1,2})?$/.test(value);
    const base=Math.round(Number(baseValue)*100),discount=Math.round(Number(discountValue)*100);
    const sale=percent ? base-Math.round(base*discount/10000) : base-discount;
    if(!decimal(baseValue)||!decimal(discountValue)||!Number.isSafeInteger(base)||base>2147483647||
       !Number.isSafeInteger(discount)||discount<=0||!Number.isSafeInteger(sale)||sale<=0||sale>=base){
      output.textContent=t('أدخل السعر الأساسي وخصمًا أقل منه.');return;
    }
    form.elements.namedItem('catalogSale').value=(sale/100).toFixed(2);
    output.textContent=t('سعر البيع المحسوب')+' · '+(sale/100).toFixed(2);
  });
  function editor(data={},currency='SAR') {
    return '<fieldset class="hl-catalog-fields"><legend>'+esc(t('خيارات المنتج'))+'</legend>'+
      fields.map(([name,label])=>input('catalog_'+name,label,data[name] || '','maxlength="100"')).join('')+
      '<small>'+esc(t('استخدم رمز المجموعة نفسه لكل المقاسات والألوان، ورقم منتج مستقلًا لكل خيار.'))+'</small></fieldset>'+
      '<fieldset class="hl-catalog-fields"><legend>'+esc(t('الخصومات'))+'</legend>'+discountFields(data,currency)+'</fieldset>';
  }
  function read(form,prior={},base) {
    const value = name => String(form.elements.namedItem(name)?.value ?? '').trim();
    const sale = value('catalogSale');
    const result = {...(prior || {})};
    for (const [key] of fields) if(form.elements.namedItem('catalog_'+key)) result[key]=value('catalog_'+key);
    result.salePriceMinor = sale === '' ? null : Math.round(Number(sale)*100);
    if (sale && (!Number.isSafeInteger(result.salePriceMinor) || result.salePriceMinor <= 0 || result.salePriceMinor >= base)) throw Error(t('أدخل سعر خصم أقل من السعر الأساسي.'));
    const date = name => sale && value(name) ? new Date(value(name)+':00+03:00').toISOString() : null;
    result.startsAt=date('catalogStarts'); result.endsAt=date('catalogEnds');
    return result;
  }
  function status(row) {
    const data=row.catalogDetails,now=Date.now();
    if(data?.salePriceMinor == null) return 'بدون خصم';
    if (data.startsAt && Date.parse(data.startsAt)>now) return 'مجدول';
    if (data.endsAt && Date.parse(data.endsAt)<=now) return 'منتهي';
    return 'خصم سارٍ';
  }
  function group(row) {
    return JSON.stringify([row.organizationId??null,row.kind??'GOODS',row.currency,row.catalogDetails?.family || row.sku || row.id]);
  }
  const option = row => [row.catalogDetails?.size,row.catalogDetails?.color].filter(Boolean).join(' / ') || row.sku;
  const csvCell = value => {
    const s=String(value??'');
    const literal=(/^[\s\uFEFF]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) ? "'"+s : s;
    return '"'+literal.replace(/"/g,'""')+'"';
  };
  function downloadCsv(name,rows) {
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const sheetPrice=n=>Number.isSafeInteger(n)?(n/100).toFixed(2):'';
  function productExport(rows) {
    downloadCsv('hydroland-products.csv',[[t('رقم المنتج'),t('اسم المنتج'),t('الوصف'),t('التصنيف'),t('العلامة التجارية'),t('رمز مجموعة المقاسات'),t('المقاس'),t('اللون'),t('الباركود'),t('السعر الأساسي'),t('سعر البيع بعد الخصم'),t('العملة'),t('المخزون'),t('الحالة'),t('بداية الخصم'),t('نهاية الخصم'),t('نوع العرض')],...rows.map(row=>{
      const d=row.catalogDetails||{};
      return [row.sku,row.nameAr,row.description,d.category,d.brand,d.family,d.size,d.color,d.barcode,sheetPrice(row.priceMinor),sheetPrice(d.salePriceMinor),row.currency,row.stockQuantity,row.status,d.startsAt,d.endsAt,row.kind||'GOODS'];
    })]);
  }
  function addReports(section,getProducts,api,active,provider) {
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=t('تقارير المتجر');details.append(summary);
    const output=document.createElement('div');
    const dateInput=(label)=>{const wrapper=document.createElement('label');wrapper.append(t(label));const field=document.createElement('input');field.type='date';wrapper.append(field);details.append(wrapper);return field};
    const from=dateInput('من تاريخ'),to=dateInput('إلى تاريخ');
    const makeButton=(key,fn)=>{const button=document.createElement('button');button.type='button';button.textContent=t(key);button.onclick=fn;details.append(button);return button};
    let orders=[],loaded=false,version=0;
    const filtered=()=>orders.filter(row=>{
      if(!row.createdAt)return false;
      const day=new Date(Date.parse(row.createdAt)+10800000).toISOString().slice(0,10);
      return (!from.value || day>=from.value) && (!to.value || day<=to.value);
    });
    const show=()=>{
      output.replaceChildren();if(!active()||!loaded)return;
      const rows=filtered(),groups=new Map();
      for(const row of rows){
        const key=JSON.stringify([row.currency,row.status]);
        const item=groups.get(key) || {count:0,sum:0,currency:row.currency,status:row.status};
        item.count++; item.sum+=row.totalMinor;groups.set(key,item);
      }
      const note=document.createElement('p');note.textContent=t(provider?'يعرض أحدث ٢٠٠ طلب في الفترة المحددة، ويحسب قيمة بنود مركزك فقط.':'يعرض أحدث ٢٠٠ طلب. المبالغ هي قيمة الطلبات حسب حالتها.');output.append(note);
      for(const g of groups.values()){
        const line=document.createElement('p');line.textContent=[g.status,g.count+' '+t('طلبات'),new Intl.NumberFormat('ar-SA',{style:'currency',currency:g.currency}).format(g.sum/100)].join(' · ');output.append(line);
      }
      if(!rows.length){const empty=document.createElement('p');empty.textContent=t('لا توجد طلبات للفترة المحددة.');output.append(empty)}
    };
    makeButton('تصدير المنتجات',()=>{if(active())productExport(getProducts())});
    const refresh=makeButton('تحديث تقرير الطلبات',async()=>{
      const current=++version;refresh.disabled=true;
      try{
        const range=new URLSearchParams();if(from.value)range.set('from',from.value);if(to.value)range.set('to',to.value);
        const endpoint=provider?'/store/provider/reports/orders'+(range.size?'?'+range:''):'/store/admin/orders';
        const response=await api(endpoint);const rows=await response.json();
        if(!active()||current!==version)return;
        if(!response.ok || !Array.isArray(rows))throw Error();
        orders=rows;loaded=true;show();exportOrders.disabled=false;
      }catch{if(active()&&current===version){orders=[];loaded=false;exportOrders.disabled=true;output.textContent=t('تعذر تحميل التقرير.')}}
      finally{if(current===version)refresh.disabled=false}
    });
    const exportOrders=makeButton('تصدير الطلبات المعروضة',()=>{
      if(!active()||!loaded)return;
      downloadCsv('hydroland-orders.csv',[[t('رقم الطلب'),t('تاريخ الطلب'),t('الحالة'),t('قيمة الطلب'),t('العملة')],...filtered().map(o=>[o.id,o.createdAt,o.status,sheetPrice(o.totalMinor),o.currency])]);
    });
    exportOrders.disabled=true;const updateRange=()=>{if(!provider){show();return}version++;orders=[];loaded=false;exportOrders.disabled=true;refresh.disabled=false;output.replaceChildren()};from.onchange=updateRange;to.onchange=updateRange;details.append(output);section.append(details);
    return ()=>{version++;orders=[];loaded=false;details.open=false;exportOrders.disabled=true;refresh.disabled=false;output.replaceChildren();from.value='';to.value=''};
  }
  function mount(box,api,reload,notify,options={}) {
    const provider=options.role==='provider',active=options.active||(()=>!box.hidden);
    const section=document.createElement('section');
    section.className='hl-catalog-dashboard';
    section.innerHTML='<h3>'+esc(t(provider?'لوحة خصومات المركز':'لوحة الخصومات'))+'</h3><label>'+esc(t('بحث بالاسم أو رقم المنتج'))+'<input type="search" data-catalog-search></label><select aria-label="'+esc(t('الخصومات'))+'" data-catalog-filter>'+['جميع المنتجات','خصم سارٍ','مجدول','منتهي','بدون خصم'].map(x=>'<option value="'+esc(x)+'">'+esc(t(x))+'</option>').join('')+'</select><div data-catalog-results></div><div data-catalog-edit></div>';
    const anchor=box.querySelector(provider?'[data-managed-offers]':'[data-store-admin-list]');anchor.before(section);
    const counts=document.createElement('p');counts.dataset.discountCounts='';section.querySelector('h3').after(counts);
    const results=section.querySelector('[data-catalog-results]'),area=section.querySelector('[data-catalog-edit]');
    const search=section.querySelector('input'),filter=section.querySelector('select');
    let products=[];
    const resetImport=provider?null:window.HydrolandCatalogImport?.mount(section,'admin',reload);
    const resetReports=addReports(section,()=>products,api,active,provider);
    function render() {
      const summary={'خصم سارٍ':0,'مجدول':0,'منتهي':0,'بدون خصم':0};
      for(const product of products)summary[status(product)]++;
      summary['نفد المخزون']=products.filter(p=>p.stockQuantity===0).length;
      counts.textContent=Object.entries(summary).map(([label,total])=>t(label)+' '+total).join(' · ');
      const term=search.value.trim().toLocaleLowerCase();
      const rows=products.filter(p=>[p.nameAr,p.sku,p.catalogDetails?.barcode,p.catalogDetails?.category,p.catalogDetails?.brand].some(x=>String(x||'').toLocaleLowerCase().includes(term))
        && (filter.selectedIndex===0 || status(p)===filter.value));
      results.innerHTML=rows.map(p=>'<article><b>'+esc(p.nameAr)+'</b> <small>'+esc(p.sku)+' · '+esc(t(status(p)))+'</small> <button type="button" data-catalog-id="'+esc(p.id)+'">'+esc(t('تحرير'))+'</button> <button type="button" data-variant="'+esc(p.id)+'">'+esc(t('إضافة مقاس أو لون'))+'</button></article>').join('') || '<p>'+esc(t('لم تطابق أي منتجات هذا البحث.'))+'</p>';
    }
    search.addEventListener('input',render);filter.addEventListener('change',render);
    results.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      const clone=Boolean(button.dataset.variant);
      const requestId=clone&&provider?crypto.randomUUID():null;
      const row=products.find(p=>p.id===(button.dataset.variant||button.dataset.catalogId));if(!row)return;
      const data={...row.catalogDetails,family:row.catalogDetails?.family||row.sku};
      if(clone){data.size='';data.color='';data.barcode=''}
      area.innerHTML='<form data-catalog-product>'+input('sku','رقم المنتج',clone?'':row.sku,'required maxlength="80"')+
        input('nameAr','اسم المنتج',row.nameAr,'required maxlength="240"')+'<label>'+esc(t('الوصف'))+'<textarea name="description" maxlength="4000">'+esc(row.description)+'</textarea></label>'+
        input('price','السعر الأساسي',(row.priceMinor/100).toFixed(2),'type="number" required min="0" step=".01"')+
        input('stockQuantity','المخزون',clone?0:row.stockQuantity,'type="number" required min="0" step="1"')+
        editor(data,row.currency)+'<button type="submit">'+esc(t('حفظ التغييرات'))+'</button> <button type="button" data-cancel-edit>'+esc(t('إلغاء التعديل'))+'</button><p role="status"></p></form>';
      const form=area.querySelector('form');form.querySelector('input').focus();
      form.querySelector('[data-cancel-edit]').onclick=()=>area.replaceChildren();
      form.onsubmit=async event=>{
        event.preventDefault();const submit=form.querySelector('[type=submit]');if(submit.disabled||!active())return;
        const values=Object.fromEntries(new FormData(form)),priceMinor=Math.round(Number(values.price)*100);
        submit.disabled=true;
        try {
          const payload={nameAr:values.nameAr,sku:values.sku,description:values.description,priceMinor,stockQuantity:Number(values.stockQuantity),
            catalogDetails:read(form,data,priceMinor),...(provider?{kind:row.kind,status:clone?'DRAFT':row.status}:{}),
            ...(clone?(provider?{requestId}:{variantOf:row.id,status:'DRAFT'}):{expectedUpdatedAt:row.updatedAt})};
          const resp=await api((provider?'/store/provider/products':'/store/admin/products')+(clone?'':'/'+encodeURIComponent(row.id)),{method:clone?'POST':'PATCH',body:JSON.stringify(payload)});
          if(!resp.ok){const info=await resp.json().catch(()=>({}));throw Error(info.message||t('تعذر حفظ بيانات المنتج'))}
          if(active()){area.replaceChildren();await reload();void window.HydrolandStore?.reloadProducts?.()}
        } catch(error){form.querySelector('[role=status]').textContent=error.message||t('تعذر حفظ بيانات المنتج')}
        finally{submit.disabled=false}
      };
    });
    return {update(rows){products=rows;render()},clear(){products=[];counts.textContent='';resetReports();resetImport?.();area.replaceChildren();results.replaceChildren();search.value='';filter.selectedIndex=0}};
  }
  const styles=document.createElement('style');
  styles.textContent='.hl-catalog-dashboard{margin:1.5rem 0;padding:1rem;border:1px solid #4b8394;border-radius:.8rem}.hl-catalog-dashboard article{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.65rem 0;border-bottom:1px solid #486571}.hl-catalog-dashboard form,.hl-catalog-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:.8rem}.hl-catalog-fields{grid-column:1/-1;border:1px solid #507385;border-radius:.5rem;padding:.8rem;min-width:0}.hl-catalog-fields small{grid-column:1/-1}.hl-catalog-dashboard label,.hl-catalog-fields label{display:grid;gap:.3rem}.hl-catalog-dashboard input,.hl-catalog-dashboard textarea,.hl-catalog-fields input{width:100%;min-width:0;box-sizing:border-box}.hl-catalog-dashboard form{margin-top:1rem}.hl-catalog-dashboard button,.hl-catalog-dashboard select{min-height:2.5rem}.hl-catalog-options{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0}.hl-catalog-options a{padding:.3rem .6rem;border:1px solid currentColor;border-radius:.4rem}.hl-catalog-options [aria-current=true]{font-weight:800;text-decoration:underline}';
  document.head.append(styles);
  window.HydrolandProductCatalog={mount,t,esc,editor,discountFields,read,status,group,option,input,productExport};
})();
