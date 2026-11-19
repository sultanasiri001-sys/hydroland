(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("procurement", {
  "بانتظار الربط التشغيلي": "Awaiting operational connection",
  "قيد الربط": "Connection pending",
  "الموردون والمشتريات والتنبيهات": "Suppliers, purchasing and alerts",
  "تنبيهات المخزون": "Inventory alerts",
  "تظهر من النظام بعد ربط مصدر البيانات.": "Shown from the system after the data source is connected.",
  "الفحوص القادمة": "Upcoming inspections",
  "لا توجد بيانات تجريبية معروضة.": "No sample data is displayed.",
  "الصيانة المستحقة": "Maintenance due",
  "تظهر من سجل المعدات الفعلي.": "Shown from actual equipment records.",
  "الموردون المعتمدون": "Approved suppliers",
  "لا توجد بيانات موردين محملة": "No supplier data loaded",
  "بانتظار واجهة الموردين المعتمدة.": "Awaiting the approved supplier interface.",
  "فتح · قيد الربط": "Open · Connection pending",
  "طلبات الشراء": "Purchase requests",
  "لا توجد أوامر شراء فعلية محملة": "No live purchase orders loaded",
  "لن تعرض الواجهة أوامر أو مبالغ افتراضية.": "The interface will not display fictitious orders or amounts.",
  "متابعة · قيد الربط": "Follow up · Connection pending",
  "إنشاء أو اعتماد أوامر الشراء يتطلب مسار API وصلاحيات تشغيلية فعلية.": "Creating or approving purchase orders requires an API workflow and actual operational authority."
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};
const host=document.querySelector('.membership-suite')||document.querySelector('.membership')||document.getElementById('store')||document.querySelector('main');if(!host)return;const wrap=document.createElement('section');wrap.className='hl-procurement';uiLocale.setHTML(wrap, uiLocale.html`<header class="hl-procurement-head"><div><small>HYDROLAND PROCUREMENT</small><h3>الموردون والمشتريات والتنبيهات</h3></div><span class="hl-procurement-badge">بانتظار الربط التشغيلي</span></header><div class="hl-alert-grid"><article class="hl-alert"><small>تنبيهات المخزون</small><strong>—</strong><small>تظهر من النظام بعد ربط مصدر البيانات.</small></article><article class="hl-alert"><small>الفحوص القادمة</small><strong>—</strong><small>لا توجد بيانات تجريبية معروضة.</small></article><article class="hl-alert"><small>الصيانة المستحقة</small><strong>—</strong><small>تظهر من سجل المعدات الفعلي.</small></article></div><div class="hl-procurement-grid"><section class="hl-panel"><h4>الموردون المعتمدون</h4><div class="hl-supplier"><span><b>لا توجد بيانات موردين محملة</b><small>بانتظار واجهة الموردين المعتمدة.</small></span><span>—</span><span class="hl-status warn">قيد الربط</span><button disabled>فتح · قيد الربط</button></div></section><section class="hl-panel"><h4>طلبات الشراء</h4><div class="hl-po"><span><b>لا توجد أوامر شراء فعلية محملة</b><small>لن تعرض الواجهة أوامر أو مبالغ افتراضية.</small></span><span>—</span><span class="hl-status warn">قيد الربط</span><button disabled>متابعة · قيد الربط</button></div></section></div><footer>إنشاء أو اعتماد أوامر الشراء يتطلب مسار API وصلاحيات تشغيلية فعلية.</footer>`);host.insertAdjacentElement('afterend',wrap);})();