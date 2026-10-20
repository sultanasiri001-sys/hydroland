(()=>{
  const host=document.querySelector('.hl-admin > .hl-admin__grid');
  if(!host||host.querySelector('[data-payment-readiness]'))return;
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const panel=document.createElement('article');
  panel.className='hl-admin__panel hl-admin__credential-panel';panel.dataset.paymentReadiness='';panel.hidden=true;
  panel.innerHTML='<div class="hl-admin__panel-title"><h3>جاهزية الدفع والتسوية</h3><button type="button" class="btn" data-readiness-refresh>تحديث حالة الربط</button></div><p>يعرض هذا الفحص اكتمال الإعدادات فقط. إثبات عمل الدفع يحتاج عملية اختبار معتمدة لدى المزود. التسوية للقراءة والمطابقة.</p><p data-readiness-state role="status"></p><div data-readiness-list class="hl-admin__queue"></div>';
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
  const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
  function render(card,definition,data){
    if(data?.integration!==definition.key||!Object.hasOwn(statuses,data?.status)||typeof data?.productionReady!=='boolean'||typeof data?.sandboxReady!=='boolean'||!data?.checks||Object.keys(definition.checks).some(key=>typeof data.checks[key]!=='boolean'))throw new Error('INVALID_READINESS');
    const complete=Object.keys(definition.checks).every(key=>data.checks[key]);
    const readiness=complete&&data.productionReady&&data.status==='PRODUCTION_ENABLED'?'إعدادات الإنتاج مكتملة':complete&&data.sandboxReady&&data.status==='SANDBOX'?'إعدادات الاختبار مكتملة':'غير جاهز للتشغيل';
    card.append(text('strong',readiness),text('p','حالة الربط: '+statuses[data.status]),text('p','المزود: '+(data.provider==='MOYASAR'?'Moyasar':data.provider==='UNCONFIGURED'?'غير محدد':'غير معروف')));
    const checks=document.createElement('ul');
    for(const [key,label] of Object.entries(definition.checks))checks.append(text('li',label+': '+(data.checks[key]?'مكتمل':'ناقص')));
    card.append(checks);
    const stamp=typeof data.timestamp==='string'?new Date(data.timestamp):null;
    card.append(text('small','وقت الفحص: '+(stamp&&Number.isFinite(stamp.getTime())?stamp.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})+' — الرياض':'غير متاح')));
  }
  async function load(){
    if(!eligible()){clear();return;}
    const v=++version,session=auth()?.getSessionVersion?.();
    panel.hidden=false;list.replaceChildren();state.textContent='جارٍ فحص الإعدادات…';
    try{
      const authorized=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});
      if(!authorized||!current(v,session)){if(v===version)clear();return;}
      const cards=definitions.map(definition=>{const card=document.createElement('section');card.className='hl-admin__credential-card';card.dataset.readinessKind=definition.path;card.append(text('h4',definition.title),text('p','جارٍ الفحص…'));list.append(card);return card;});
      let failed=0;
      await Promise.all(definitions.map(async(definition,index)=>{
        const card=cards[index];
        try{
          const response=await auth().authorizedFetch('/health/integrations/'+definition.path,{method:'GET'});
          const data=await response.json().catch(()=>null);
          if(!current(v,session))return;
          card.replaceChildren(text('h4',definition.title));
          if(!response.ok)throw new Error(response.status===403?'FORBIDDEN':'READINESS_FAILED');
          render(card,definition,data);
        }catch(error){
          if(!current(v,session))return;
          failed++;card.replaceChildren(text('h4',definition.title),text('p',error?.message==='FORBIDDEN'?'يلزم حساب إدارة مخوّل لعرض حالة الربط.':'تعذر قراءة حالة الربط. أعد المحاولة.'));
        }
      }));
      if(current(v,session))state.textContent=failed?'تعذر إكمال بعض الفحوصات؛ لا تعتبرها جاهزة.':'تم تحديث حالة إعدادات الدفع والتسوية.';
    }catch{if(current(v,session)){list.replaceChildren();state.textContent='تعذر التحقق من الصلاحية. أعد المحاولة.';}}
  }
  panel.querySelector('[data-readiness-refresh]').addEventListener('click',()=>void load());
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(event,clear);
  document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear();});
  document.addEventListener('hydroland:auth-changed',()=>{clear();if(eligible())void load();});
  window.HydrolandPaymentReadiness=Object.freeze({reload:load});
  if(eligible())void load();
})();
