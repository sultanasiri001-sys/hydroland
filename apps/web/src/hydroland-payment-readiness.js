(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("payment-readiness", {
  "موقوف": "Suspended",
  "مكتمل": "Complete",
  "غير معروف": "Unknown",
  "غير محدد": "Not specified",
  "غير متاح": "Unavailable",
  "جاهزية الدفع والتسوية": "Payment and settlement readiness",
  "تحديث حالة الربط": "Refresh connection status",
  "يعرض هذا الفحص اكتمال الإعدادات فقط. إثبات عمل الدفع يحتاج عملية اختبار معتمدة لدى المزود. التسوية للقراءة والمطابقة.": "This check shows configuration completeness only. Payment operation must be proven by an approved provider test transaction. Settlement access is for reading and matching.",
  "مزود الدفع": "Payment provider",
  "تفعيل الربط": "Enable connection",
  "اختيار مزود الدفع": "Choose payment provider",
  "بيانات اعتماد المزود": "Provider credentials",
  "التحقق من إشعارات الدفع": "Verify payment notifications",
  "عنوان المنصة للعودة من الدفع": "Platform return address after payment",
  "مطابقة التسويات": "Settlement reconciliation",
  "اختيار مزود التسوية": "Choose settlement provider",
  "لم يُحدد": "Not selected",
  "اختبار": "Test",
  "مُعدّ": "Configured",
  "تم التحقق من الإعداد": "Configuration verified",
  "مفعّل للإنتاج": "Production enabled",
  "متأثر بعطل": "Affected by an outage",
  "إعدادات الإنتاج مكتملة": "Production configuration complete",
  "إعدادات الاختبار مكتملة": "Test configuration complete",
  "غير جاهز للتشغيل": "Not ready to operate",
  "حالة الربط:": "Connection status:",
  "المزود:": "Provider:",
  "ناقص": "Missing",
  "وقت الفحص:": "Check time:",
  "— الرياض": "— Riyadh",
  "جارٍ فحص الإعدادات…": "Checking configuration…",
  "جارٍ الفحص…": "Checking…",
  "يلزم حساب إدارة مخوّل لعرض حالة الربط.": "An authorized administrator account is required to view connection status.",
  "تعذر قراءة حالة الربط. أعد المحاولة.": "Could not read connection status. Try again.",
  "تعذر إكمال بعض الفحوصات؛ لا تعتبرها جاهزة.": "Some checks could not be completed. Do not treat them as ready.",
  "تم تحديث حالة إعدادات الدفع والتسوية.": "Payment and settlement configuration status refreshed.",
  "تعذر التحقق من الصلاحية. أعد المحاولة.": "Could not verify permission. Try again.",
  "حالة الربط: {0}": "Connection status: {0}",
  "المزود: {0}": "Provider: {0}",
  "{0}: {1}": "{0}: {1}",
  "وقت الفحص: {0}": "Check time: {0}",
  "{0} — الرياض": "{0} — Riyadh"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  const host=document.querySelector('.hl-admin > .hl-admin__grid');
  if(!host||host.querySelector('[data-payment-readiness]'))return;
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const panel=document.createElement('article');
  panel.className='hl-admin__panel hl-admin__credential-panel';panel.dataset.paymentReadiness='';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<div class="hl-admin__panel-title"><h3>جاهزية الدفع والتسوية</h3><button type="button" class="btn" data-readiness-refresh>تحديث حالة الربط</button></div><p>يعرض هذا الفحص اكتمال الإعدادات فقط. إثبات عمل الدفع يحتاج عملية اختبار معتمدة لدى المزود. التسوية للقراءة والمطابقة.</p><p data-readiness-state role="status"></p><div data-readiness-list class="hl-admin__queue"></div>`);
  host.append(panel);
  const list=panel.querySelector('[data-readiness-list]'),state=panel.querySelector('[data-readiness-state]');
  const definitions=[
    {path:'payment',key:'PAYMENT_PSP',title:'مزود الدفع',checks:{lifecycleOperational:'تفعيل الربط',providerConfigured:'اختيار مزود الدفع',credentialsConfigured:'بيانات اعتماد المزود',webhookConfigured:'التحقق من إشعارات الدفع',publicWebOriginConfigured:'عنوان المنصة للعودة من الدفع'}},
    {path:'settlement',key:'BANKING_SETTLEMENT',title:'مطابقة التسويات',checks:{lifecycleOperational:'تفعيل الربط',providerConfigured:'اختيار مزود التسوية',credentialsConfigured:'بيانات اعتماد المزود'}},
  ];
  const statuses={NOT_SELECTED:'لم يُحدد',SANDBOX:'اختبار',CONFIGURED:'مُعدّ',VERIFIED:'تم التحقق من الإعداد',PRODUCTION_ENABLED:'مفعّل للإنتاج',DEGRADED:'متأثر بعطل',DISABLED:'موقوف'};
  let version=0;
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
  const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
  const clear=()=>{version++;list.replaceChildren();state.textContent='';panel.hidden=true;};
  const text=(tag,value)=>{const node=document.createElement(tag);uiLocale.setMessage(node, value);return node;};
  function render(card,definition,data){
    if(data?.integration!==definition.key||!Object.hasOwn(statuses,data?.status)||typeof data?.productionReady!=='boolean'||typeof data?.sandboxReady!=='boolean'||!data?.checks||Object.keys(definition.checks).some(key=>typeof data.checks[key]!=='boolean'))throw new Error('INVALID_READINESS');
    const complete=Object.keys(definition.checks).every(key=>data.checks[key]);
    const readiness=complete&&data.productionReady&&data.status==='PRODUCTION_ENABLED'?'إعدادات الإنتاج مكتملة':complete&&data.sandboxReady&&data.status==='SANDBOX'?'إعدادات الاختبار مكتملة':'غير جاهز للتشغيل';
    card.append(text('strong', uiLocale.message(readiness)),text('p', uiLocale.message("حالة الربط: {0}", [(value=>value?uiLocale.message(value):value)(statuses[data.status])])),text('p', uiLocale.message("المزود: {0}", [(data.provider==='MOYASAR'?'Moyasar':(data.provider==='UNCONFIGURED'?uiLocale.message('غير محدد'):uiLocale.message('غير معروف')))])));
    const checks=document.createElement('ul');
    for(const [key,label] of Object.entries(definition.checks))checks.append(text('li', uiLocale.message("{0}: {1}", [uiLocale.message(label), (data.checks[key]?uiLocale.message('مكتمل'):uiLocale.message('ناقص'))])));
    card.append(checks);
    const stamp=typeof data.timestamp==='string'?new Date(data.timestamp):null;
    card.append(text('small', uiLocale.message("وقت الفحص: {0}", [(stamp&&Number.isFinite(stamp.getTime())?uiLocale.message("{0} — الرياض", [stamp.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})]):uiLocale.message('غير متاح'))])));
  }
  async function load(){
    if(!eligible()){clear();return;}
    const v=++version,session=auth()?.getSessionVersion?.();
    panel.hidden=false;list.replaceChildren();uiLocale.setMessage(state, uiLocale.message('جارٍ فحص الإعدادات…'));
    try{
      const authorized=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});
      if(!authorized||!current(v,session)){if(v===version)clear();return;}
      const cards=definitions.map(definition=>{const card=document.createElement('section');card.className='hl-admin__credential-card';card.dataset.readinessKind=definition.path;card.append(text('h4', uiLocale.message(definition.title)),text('p', uiLocale.message('جارٍ الفحص…')));list.append(card);return card;});
      let failed=0;
      await Promise.all(definitions.map(async(definition,index)=>{
        const card=cards[index];
        try{
          const response=await auth().authorizedFetch('/health/integrations/'+definition.path,{method:'GET'});
          const data=await response.json().catch(()=>null);
          if(!current(v,session))return;
          card.replaceChildren(text('h4', uiLocale.message(definition.title)));
          if(!response.ok)throw localError(response.status===403?'FORBIDDEN':'READINESS_FAILED');
          render(card,definition,data);
        }catch(error){
          if(!current(v,session))return;
          failed++;card.replaceChildren(text('h4', uiLocale.message(definition.title)),text('p', (error?.message==='FORBIDDEN'?uiLocale.message('يلزم حساب إدارة مخوّل لعرض حالة الربط.'):uiLocale.message('تعذر قراءة حالة الربط. أعد المحاولة.'))));
        }
      }));
      if(current(v,session))uiLocale.setMessage(state, (failed?uiLocale.message('تعذر إكمال بعض الفحوصات؛ لا تعتبرها جاهزة.'):uiLocale.message('تم تحديث حالة إعدادات الدفع والتسوية.')));
    }catch{if(current(v,session)){list.replaceChildren();uiLocale.setMessage(state, uiLocale.message('تعذر التحقق من الصلاحية. أعد المحاولة.'));}}
  }
  panel.querySelector('[data-readiness-refresh]').addEventListener('click',()=>void load());
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
  document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear();});
  document.addEventListener('hydroland:auth-changed',()=>{clear();if(eligible())void load();});
  window.HydrolandPaymentReadiness=Object.freeze({reload:load});
  if(eligible())void load();
})();
