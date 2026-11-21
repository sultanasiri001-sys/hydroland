(() => {
  const labels = {
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
      '<small>'+esc(currency)+' · '+esc(t('اترك سعر الخصم فارغًا للبيع بالسعر الأساسي.'))+'</small>'+
      input('catalogStarts','بداية الخصم بتوقيت الرياض',riyadhTime(data.startsAt),'type="datetime-local"')+
      input('catalogEnds','نهاية الخصم بتوقيت الرياض',riyadhTime(data.endsAt),'type="datetime-local"');
  }
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
  function mount(box,api,reload,notify) {
    const section=document.createElement('section');
    section.className='hl-catalog-dashboard';
    section.innerHTML='<h3>'+esc(t('لوحة الخصومات'))+'</h3><label>'+esc(t('بحث بالاسم أو رقم المنتج'))+'<input type="search" data-catalog-search></label><select aria-label="'+esc(t('الخصومات'))+'" data-catalog-filter>'+['جميع المنتجات','خصم سارٍ','مجدول','منتهي','بدون خصم'].map(x=>'<option value="'+esc(x)+'">'+esc(t(x))+'</option>').join('')+'</select><div data-catalog-results></div><div data-catalog-edit></div>';
    box.querySelector('[data-store-admin-list]').before(section);
    const results=section.querySelector('[data-catalog-results]'),area=section.querySelector('[data-catalog-edit]');
    const search=section.querySelector('input'),filter=section.querySelector('select');
    let products=[];
    function render() {
      const term=search.value.trim().toLocaleLowerCase();
      const rows=products.filter(p=>[p.nameAr,p.sku,p.catalogDetails?.barcode,p.catalogDetails?.category,p.catalogDetails?.brand].some(x=>String(x||'').toLocaleLowerCase().includes(term))
        && (filter.selectedIndex===0 || status(p)===filter.value));
      results.innerHTML=rows.map(p=>'<article><b>'+esc(p.nameAr)+'</b> <small>'+esc(p.sku)+' · '+esc(t(status(p)))+'</small> <button type="button" data-catalog-id="'+esc(p.id)+'">'+esc(t('تحرير'))+'</button> <button type="button" data-variant="'+esc(p.id)+'">'+esc(t('إضافة مقاس أو لون'))+'</button></article>').join('') || '<p>'+esc(t('لم تطابق أي منتجات هذا البحث.'))+'</p>';
    }
    search.addEventListener('input',render);filter.addEventListener('change',render);
    results.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      const clone=Boolean(button.dataset.variant);
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
        event.preventDefault();const submit=form.querySelector('[type=submit]');if(submit.disabled)return;
        const values=Object.fromEntries(new FormData(form)),priceMinor=Math.round(Number(values.price)*100);
        submit.disabled=true;
        try {
          const payload={nameAr:values.nameAr,sku:values.sku,description:values.description,priceMinor,stockQuantity:Number(values.stockQuantity),
            catalogDetails:read(form,data,priceMinor),...(clone?{variantOf:row.id,status:'DRAFT'}:{expectedUpdatedAt:row.updatedAt})};
          const resp=await api('/store/admin/products'+(clone?'':'/'+encodeURIComponent(row.id)),{method:clone?'POST':'PATCH',body:JSON.stringify(payload)});
          if(!resp.ok){const info=await resp.json().catch(()=>({}));throw Error(info.message||t('تعذر حفظ بيانات المنتج'))}
          if(!box.hidden){area.replaceChildren();await reload();void window.HydrolandStore?.reloadProducts?.()}
        } catch(error){form.querySelector('[role=status]').textContent=error.message||t('تعذر حفظ بيانات المنتج')}
        finally{submit.disabled=false}
      };
    });
    return {update(rows){products=rows;render()},clear(){products=[];area.replaceChildren();results.replaceChildren();search.value='';filter.selectedIndex=0}};
  }
  const styles=document.createElement('style');
  styles.textContent='.hl-catalog-dashboard{margin:1.5rem 0;padding:1rem;border:1px solid #4b8394;border-radius:.8rem}.hl-catalog-dashboard article{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.65rem 0;border-bottom:1px solid #486571}.hl-catalog-dashboard form,.hl-catalog-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:.8rem}.hl-catalog-fields{grid-column:1/-1;border:1px solid #507385;border-radius:.5rem;padding:.8rem;min-width:0}.hl-catalog-fields small{grid-column:1/-1}.hl-catalog-dashboard label,.hl-catalog-fields label{display:grid;gap:.3rem}.hl-catalog-dashboard input,.hl-catalog-dashboard textarea,.hl-catalog-fields input{width:100%;min-width:0;box-sizing:border-box}.hl-catalog-dashboard form{margin-top:1rem}.hl-catalog-dashboard button,.hl-catalog-dashboard select{min-height:2.5rem}.hl-catalog-options{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0}.hl-catalog-options a{padding:.3rem .6rem;border:1px solid currentColor;border-radius:.4rem}.hl-catalog-options [aria-current=true]{font-weight:800;text-decoration:underline}';
  document.head.append(styles);
  window.HydrolandProductCatalog={mount,t,esc,editor,discountFields,read,status,group,option,input};
})();
