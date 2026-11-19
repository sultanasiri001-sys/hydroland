(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("finance", {
  "المالية والمدفوعات والقيود": "Finance, payments and entries",
  "يتطلب تسجيل الدخول": "Sign-in required",
  "مدفوعاتي": "My payments",
  "من النظام الفعلي": "From the live system",
  "إجمالي المدفوعات": "Total payments",
  "حسب السجلات المتاحة": "Based on available records",
  "الحسابات المالية": "Financial accounts",
  "للمشرف": "Administrator access",
  "القيود المالية": "Financial entries",
  "المدفوعات": "Payments",
  "سجّل الدخول لعرض البيانات": "Sign in to view data",
  "لا توجد بيانات تجريبية": "No sample data",
  "تحديث": "Refresh",
  "الإدارة المالية": "Financial administration",
  "صلاحيات الإدارة مطلوبة": "Administrator permissions required",
  "أدخل معرّف المنظمة لتحميل الحسابات والقيود": "Enter the organization identifier to load accounts and entries",
  "تحميل": "Load",
  "خدمة المصادقة غير متاحة": "Authentication service unavailable",
  "سجّل الدخول لعرض المالية": "Sign in to view finance",
  "لا توجد مدفوعات مسجلة": "No payments recorded",
  "النتيجة من الخادم": "Result from the server",
  "متصل بالنظام المالي": "Connected to the financial system",
  "تعذر تحميل البيانات المالية": "Could not load financial data",
  "سجّل الدخول بحساب إداري": "Sign in with an administrator account",
  "صلاحية الإدارة المالية مطلوبة": "Financial administration permission required",
  "تم تحميل بيانات الإدارة المالية": "Financial administration data loaded",
  "تعذر تحميل بيانات الإدارة المالية": "Could not load financial administration data"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};
const anchor=document.getElementById('role-console')||document.querySelector('.membership')||document.querySelector('main');if(!anchor||document.querySelector('.hl-finance'))return;
const section=document.createElement('section');section.className='hl-finance';
uiLocale.setHTML(section, uiLocale.html`<header class="hl-finance-head"><div><small>HYDROLAND FINANCE</small><h3>المالية والمدفوعات والقيود</h3></div><span data-finance-state>يتطلب تسجيل الدخول</span></header><div class="hl-finance-kpis"><article class="hl-finance-kpi"><small>مدفوعاتي</small><b data-finance-payments>—</b><span>من النظام الفعلي</span></article><article class="hl-finance-kpi"><small>إجمالي المدفوعات</small><b data-finance-total>—</b><span>حسب السجلات المتاحة</span></article><article class="hl-finance-kpi"><small>الحسابات المالية</small><b data-finance-accounts>—</b><span>للمشرف</span></article><article class="hl-finance-kpi"><small>القيود المالية</small><b data-finance-entries>—</b><span>للمشرف</span></article></div><div class="hl-finance-grid"><section class="hl-finance-panel"><h4>المدفوعات</h4><div data-finance-payment-list class="hl-finance-row"><strong>سجّل الدخول لعرض البيانات</strong><small>لا توجد بيانات تجريبية</small><span>—</span><em class="hl-finance-status review">—</em></div><div class="hl-finance-actions"><button data-finance-refresh>تحديث</button></div></section><section class="hl-finance-panel"><h4>الإدارة المالية</h4><div data-finance-admin class="hl-finance-row"><strong>صلاحيات الإدارة مطلوبة</strong><small>أدخل معرّف المنظمة لتحميل الحسابات والقيود</small><input data-finance-org placeholder="Organization ID" autocomplete="off"><button data-finance-load-admin>تحميل</button></div></section></div>`);
anchor.insertAdjacentElement('afterend',section);
const auth=window.HydrolandAuth;const state=section.querySelector('[data-finance-state]');const esc=(v)=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(minor,currency='SAR')=>Number.isFinite(Number(minor))?`${(Number(minor)/100).toFixed(2)} ${esc(currency)}`:'—';
async function loadMine(){if(!auth?.authorizedFetch){uiLocale.setMessage(state, uiLocale.message('خدمة المصادقة غير متاحة'));return}if(!auth?.isAuthenticated?.()){uiLocale.setMessage(state, uiLocale.message('سجّل الدخول لعرض المالية'));section.querySelector('[data-finance-payments]').textContent='—';section.querySelector('[data-finance-total]').textContent='—';uiLocale.setHTML(section.querySelector('[data-finance-payment-list]'), uiLocale.html`<strong>سجّل الدخول لعرض البيانات</strong><small>لا توجد بيانات تجريبية</small><span>—</span>`);return}try{const r=await auth.authorizedFetch('/finance/mine/payments');if(!r.ok)throw localError(r.status===401?'AUTH':'LOAD');const rows=await r.json();section.querySelector('[data-finance-payments]').textContent=Array.isArray(rows)?rows.length:'—';const total=Array.isArray(rows)?rows.reduce((s,p)=>s+(Number(p.amountMinor)||0),0):NaN;section.querySelector('[data-finance-total]').textContent=money(total,rows?.[0]?.currency||'SAR');const list=section.querySelector('[data-finance-payment-list]');uiLocale.setHTML(list, Array.isArray(rows)&&rows.length?rows.slice(0,8).map(p=>uiLocale.html`<div><strong>${money(p.amountMinor,p.currency)}</strong><small>${esc(p.status)}</small><span>${esc(p.invoice?.number||'—')}</span></div>`).join(''):uiLocale.html`<strong>لا توجد مدفوعات مسجلة</strong><small>النتيجة من الخادم</small><span>—</span>`);uiLocale.setMessage(state, uiLocale.message('متصل بالنظام المالي'))}catch(e){uiLocale.setMessage(state, (e.message==='AUTH'?uiLocale.message('سجّل الدخول لعرض المالية'):uiLocale.message('تعذر تحميل البيانات المالية')))}}
async function loadAdmin(){const org=section.querySelector('[data-finance-org]').value.trim();if(!org)return;if(!auth?.isAuthenticated?.()){uiLocale.setMessage(state, uiLocale.message('سجّل الدخول بحساب إداري'));return}try{const [a,e]=await Promise.all([auth.authorizedFetch(`/finance/admin/organizations/${encodeURIComponent(org)}/accounts`),auth.authorizedFetch(`/finance/admin/organizations/${encodeURIComponent(org)}/entries`)]);if(a.status===403||e.status===403){uiLocale.setMessage(state, uiLocale.message('صلاحية الإدارة المالية مطلوبة'));return}if(!a.ok||!e.ok)throw new Error();const accounts=await a.json(),entries=await e.json();section.querySelector('[data-finance-accounts]').textContent=Array.isArray(accounts)?accounts.length:'—';section.querySelector('[data-finance-entries]').textContent=Array.isArray(entries)?entries.length:'—';uiLocale.setMessage(state, uiLocale.message('تم تحميل بيانات الإدارة المالية'))}catch{uiLocale.setMessage(state, uiLocale.message('تعذر تحميل بيانات الإدارة المالية'))}}
section.querySelector('[data-finance-refresh]').addEventListener('click',loadMine);section.querySelector('[data-finance-load-admin]').addEventListener('click',loadAdmin);document.addEventListener('hydroland:auth-changed',loadMine);loadMine();})();