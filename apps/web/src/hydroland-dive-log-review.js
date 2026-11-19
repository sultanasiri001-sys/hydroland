(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("dive-log-review", {
  "مراجعة سجلات الغوص": "Review dive logs",
  "بانتظار الاتصال": "Awaiting connection",
  "م ·": "m ·",
  "دقيقة": "min",
  "توثيق": "Verify",
  "رفض": "Reject",
  "لا توجد سجلات معلقة.": "No pending logs.",
  "يتطلب حسابًا مخولًا بالمراجعة": "An authorized reviewer account is required",
  "جارٍ التحميل": "Loading",
  "متصل بالخادم": "Connected to server",
  "تعذر تحميل السجلات أو لا توجد صلاحية": "Could not load logs, or access is not permitted",
  "سبب الرفض - اختياري": "Rejection reason — optional",
  "جارٍ حفظ القرار": "Saving decision",
  "تم توثيق السجل": "Log verified",
  "تم رفض السجل": "Log rejected",
  "تعذر حفظ القرار": "Could not save the decision"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const root=document.getElementById('role-console');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-dive-review';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<div class="hl-trip-admin__head"><div><span class="eyebrow">DIVE LOG REVIEW</span><h3>مراجعة سجلات الغوص</h3></div><span data-dive-review-state>بانتظار الاتصال</span></div><div data-dive-review-list></div>`);
  root.insertAdjacentElement('afterend',panel);
  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setState=t=>{const e=panel.querySelector('[data-dive-review-state]');if(e)uiLocale.setMessage(e, t)};
  const render=items=>{const host=panel.querySelector('[data-dive-review-list]');uiLocale.setHTML(host, items.length?items.map(x=>uiLocale.html`<article class="hl-log-item"><div><b>${esc(x.siteName)}</b><small>${esc(x.account?.person?.firstName||'')} ${esc(x.account?.person?.lastName||'')} · ${new Date(x.diveDate).toLocaleDateString('ar-SA')} · ${x.maxDepthM}م · ${x.durationMin} دقيقة</small></div><div><button data-review-id="${x.id}" data-status="VERIFIED">توثيق</button><button data-review-id="${x.id}" data-status="REJECTED">رفض</button></div></article>`).join(''):uiLocale.html`<small>لا توجد سجلات معلقة.</small>`);host.querySelectorAll('[data-review-id]').forEach(b=>b.onclick=()=>decide(b.dataset.reviewId,b.dataset.status));};
  async function load(){if(!token()){setState(uiLocale.message('يتطلب حسابًا مخولًا بالمراجعة'));return}try{setState(uiLocale.message('جارٍ التحميل'));const r=await fetch(api()+'/dive-logs/review',{headers:headers()});if(!r.ok)throw new Error();render(await r.json());setState(uiLocale.message('متصل بالخادم'))}catch{setState(uiLocale.message('تعذر تحميل السجلات أو لا توجد صلاحية'))}}
  async function decide(id,status){const reason=status==='REJECTED'?window.prompt(uiLocale.t('سبب الرفض - اختياري'))||'':undefined;try{setState(uiLocale.message('جارٍ حفظ القرار'));const r=await fetch(api()+'/dive-logs/review/'+encodeURIComponent(id),{method:'PATCH',headers:headers(),body:JSON.stringify({status,reason})});if(!r.ok)throw new Error();await load();window.HydrolandDiveLogs?.reload?.();setState(status==='VERIFIED'?uiLocale.message('تم توثيق السجل'):uiLocale.message('تم رفض السجل'))}catch{setState(uiLocale.message('تعذر حفظ القرار'))}}
  document.addEventListener('hydroland:role-changed',e=>{const active=['admin','instructor'].includes(e.detail?.role);panel.hidden=!active;if(active)load()});
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
})();
