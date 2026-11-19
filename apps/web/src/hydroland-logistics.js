(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("logistics", {
  "الشحن والاستلام والفواتير": "Shipping, receiving and invoices",
  "بانتظار الربط التشغيلي": "Awaiting operational connection",
  "شحنات في الطريق": "Shipments in transit",
  "استلامات اليوم": "Today's receipts",
  "فواتير للمراجعة": "Invoices for review",
  "تحديثات مخزون معلقة": "Pending inventory updates",
  "تتبع الشحنات والاستلام": "Track shipments and receipts",
  "لا توجد شحنات فعلية محملة": "No live shipments loaded",
  "تظهر بيانات أوامر الشراء والاستلام من النظام بعد الربط.": "Purchase order and receiving data will appear after the system is connected.",
  "قيد الربط": "Connection pending",
  "تسجيل استلام · قيد الربط": "Record receipt · Connection pending",
  "فحص جودة · قيد الربط": "Quality check · Connection pending",
  "تحديث المخزون · قيد الربط": "Update inventory · Connection pending",
  "ملاحظة مورد · قيد الربط": "Supplier note · Connection pending",
  "الفواتير والمطابقة": "Invoices and matching",
  "لا توجد فواتير فعلية محملة": "No live invoices loaded",
  "لا تعرض الواجهة مبالغ أو موردين افتراضيين.": "The interface does not display fictitious amounts or suppliers.",
  "المطابقة الثلاثية · قيد الربط": "Three-way matching · Connection pending",
  "اعتماد للدفع · قيد الربط": "Approve for payment · Connection pending"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};
const anchor=document.querySelector('.membership-suite')||document.querySelector('.membership')||document.querySelector('main');if(!anchor)return;const wrap=document.createElement('section');wrap.className='hl-logistics';uiLocale.setHTML(wrap, uiLocale.html`<header class="hl-logistics-head"><div><small>LOGISTICS · RECEIVING · FINANCE</small><h3>الشحن والاستلام والفواتير</h3></div><span class="hl-logistics-status">بانتظار الربط التشغيلي</span></header><div class="hl-logistics-grid"><article class="hl-logistics-kpi"><small>شحنات في الطريق</small><b>—</b></article><article class="hl-logistics-kpi"><small>استلامات اليوم</small><b>—</b></article><article class="hl-logistics-kpi"><small>فواتير للمراجعة</small><b>—</b></article><article class="hl-logistics-kpi"><small>تحديثات مخزون معلقة</small><b>—</b></article></div><div class="hl-logistics-body"><section class="hl-logistics-panel"><h4>تتبع الشحنات والاستلام</h4><div class="hl-shipment"><strong>لا توجد شحنات فعلية محملة</strong><small>تظهر بيانات أوامر الشراء والاستلام من النظام بعد الربط.</small><span class="hl-pill review">قيد الربط</span><b>—</b></div><div class="hl-logistics-actions"><button disabled>تسجيل استلام · قيد الربط</button><button disabled>فحص جودة · قيد الربط</button><button disabled>تحديث المخزون · قيد الربط</button><button disabled>ملاحظة مورد · قيد الربط</button></div></section><section class="hl-logistics-panel"><h4>الفواتير والمطابقة</h4><div class="hl-invoice"><span><strong>لا توجد فواتير فعلية محملة</strong><small>لا تعرض الواجهة مبالغ أو موردين افتراضيين.</small></span><b>—</b></div><div class="hl-logistics-actions"><button disabled>المطابقة الثلاثية · قيد الربط</button><button disabled>اعتماد للدفع · قيد الربط</button></div></section></div>`);anchor.insertAdjacentElement('afterend',wrap);})();