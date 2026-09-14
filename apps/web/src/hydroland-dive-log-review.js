(()=>{
  const root=document.getElementById('role-console');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-dive-review';panel.hidden=true;
  panel.innerHTML='<div class="hl-trip-admin__head"><div><span class="eyebrow">DIVE LOG REVIEW</span><h3>مراجعة سجلات الغوص</h3></div><span data-dive-review-state>بانتظار الاتصال</span></div><div data-dive-review-list></div>';
  root.insertAdjacentElement('afterend',panel);
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'http://localhost:3001/api/v1';
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setState=t=>{const e=panel.querySelector('[data-dive-review-state]');if(e)e.textContent=t};
  const render=items=>{const host=panel.querySelector('[data-dive-review-list]');host.innerHTML=items.length?items.map(x=>`<article class="hl-log-item"><div><b>${esc(x.siteName)}</b><small>${esc(x.account?.person?.firstName||'')} ${esc(x.account?.person?.lastName||'')} · ${new Date(x.diveDate).toLocaleDateString('ar-SA')} · ${x.maxDepthM}م · ${x.durationMin} دقيقة</small></div><div><button data-review-id="${x.id}" data-status="VERIFIED">توثيق</button><button data-review-id="${x.id}" data-status="REJECTED">رفض</button></div></article>`).join(''):'<small>لا توجد سجلات معلقة.</small>';host.querySelectorAll('[data-review-id]').forEach(b=>b.onclick=()=>decide(b.dataset.reviewId,b.dataset.status));};
  async function load(){if(!token()){setState('يتطلب حسابًا مخولًا بالمراجعة');return}try{setState('جارٍ التحميل');const r=await fetch(api()+'/dive-logs/review',{headers:headers()});if(!r.ok)throw new Error();render(await r.json());setState('متصل بالخادم')}catch{setState('تعذر تحميل السجلات أو لا توجد صلاحية')}}
  async function decide(id,status){const reason=status==='REJECTED'?window.prompt('سبب الرفض - اختياري')||'':undefined;try{setState('جارٍ حفظ القرار');const r=await fetch(api()+'/dive-logs/review/'+encodeURIComponent(id),{method:'PATCH',headers:headers(),body:JSON.stringify({status,reason})});if(!r.ok)throw new Error();await load();window.HydrolandDiveLogs?.reload?.();setState(status==='VERIFIED'?'تم توثيق السجل':'تم رفض السجل')}catch{setState('تعذر حفظ القرار')}}
  document.addEventListener('hydroland:role-changed',e=>{const active=['admin','instructor'].includes(e.detail?.role);panel.hidden=!active;if(active)load()});
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
})();
