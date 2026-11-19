(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("crew-assignments", {
  "رحلاتي القادمة": "My upcoming trips",
  "بانتظار الاتصال": "Awaiting connection",
  "تم القبول": "Accepted",
  "تم الرفض": "Declined",
  "تم الاستبدال": "Replaced",
  "بانتظار ردك": "Awaiting your response",
  "لا توجد مهام رحلة حالياً.": "No trip assignments at present.",
  "رحلة HYDROLAND": "HYDROLAND trip",
  "حتى {0}": "Until {0}",
  "قبول المهمة": "Accept assignment",
  "رفض المهمة": "Decline assignment",
  "يتطلب تسجيل الدخول": "Sign-in required",
  "جارٍ تحميل المهام": "Loading assignments",
  "متصل بالخادم": "Connected to server",
  "تعذر تحميل مهام الرحلات": "Could not load trip assignments",
  "جارٍ قبول المهمة": "Accepting assignment",
  "جارٍ رفض المهمة": "Declining assignment",
  "تعذر تحديث المهمة": "Could not update the assignment",
  "تم قبول المهمة": "Assignment accepted",
  "تم رفض المهمة وإعادة الإسناد عند توفر بديل": "Assignment declined; reassignment will follow when a replacement is available"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const root=document.getElementById('role-console')||document.querySelector('main');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-crew-assignments';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<div class="hl-trip-admin__head"><div><span class="eyebrow">MY CREW ASSIGNMENTS</span><h3>رحلاتي القادمة</h3></div><span data-crew-state>بانتظار الاتصال</span></div><div data-crew-list></div>`);
  root.insertAdjacentElement('afterend',panel);
  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const state=t=>{const e=panel.querySelector('[data-crew-state]');if(e)uiLocale.setMessage(e, t)};
  const fmt=d=>new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
  const statusLabel=s=>s==='ACCEPTED'?'تم القبول':s==='REJECTED'?'تم الرفض':s==='REASSIGNED'?'تم الاستبدال':'بانتظار ردك';
  function render(rows){
    const host=panel.querySelector('[data-crew-list]');host.textContent='';
    if(!rows.length){const p=document.createElement('p');uiLocale.setText(p, ...['لا توجد مهام رحلة حالياً.']);host.appendChild(p);return;}
    rows.forEach(item=>{
      const card=document.createElement('article');card.className='hl-crew-assignment-card';
      const head=document.createElement('div');const title=document.createElement('strong');title.textContent=item.tripTitle||uiLocale.t('رحلة HYDROLAND');const meta=document.createElement('small');meta.textContent=[item.role,item.startsAt?fmt(item.startsAt):'',item.endsAt?`حتى ${fmt(item.endsAt)}`:''].filter(Boolean).join(' · ');head.append(title,meta);
      const badge=document.createElement('span');badge.className='hl-status';uiLocale.setText(badge, ...[statusLabel(item.status)]);
      const actions=document.createElement('div');actions.className='hl-member-actions';
      if(item.status==='PENDING'){
        const accept=document.createElement('button');accept.type='button';accept.className='btn btn-primary';uiLocale.setText(accept, ...['قبول المهمة']);accept.onclick=()=>respond(item.id,'ACCEPTED',accept);
        const reject=document.createElement('button');reject.type='button';reject.className='btn';uiLocale.setText(reject, ...['رفض المهمة']);reject.onclick=()=>respond(item.id,'REJECTED',reject);
        actions.append(accept,reject);
      }
      card.append(head,badge,actions);host.appendChild(card);
    });
  }
  async function load(){
    if(!token()){state(uiLocale.message('يتطلب تسجيل الدخول'));return}
    try{state(uiLocale.message('جارٍ تحميل المهام'));const r=await fetch(`${api()}/trips/crew/assignments/mine`,{headers:headers()});const rows=await r.json().catch(()=>[]);if(!r.ok)throw new Error();render(Array.isArray(rows)?rows:[]);state(uiLocale.message('متصل بالخادم'));}catch{state(uiLocale.message('تعذر تحميل مهام الرحلات'))}
  }
  async function respond(id,response,button){
    try{
      button.disabled=true;state(response==='ACCEPTED'?uiLocale.message('جارٍ قبول المهمة'):uiLocale.message('جارٍ رفض المهمة'));
      const r=await fetch(`${api()}/trips/crew/assignments/${id}/respond`,{method:'PATCH',headers:headers(),body:JSON.stringify({response})});
      const body=await r.json().catch(()=>null);if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر تحديث المهمة'));
      await load();
      const detail={...body,response};
      window.dispatchEvent(new CustomEvent('hydroland:crew-assignment-changed',{detail}));
      document.dispatchEvent(new CustomEvent('hydroland:crew-assignment-updated',{detail}));
      state(response==='ACCEPTED'?uiLocale.message('تم قبول المهمة'):uiLocale.message('تم رفض المهمة وإعادة الإسناد عند توفر بديل'));
    }catch(error){button.disabled=false;state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحديث المهمة'))}
  }
  const setVisible=role=>{const active=['instructor','boat','admin','center'].includes(role);panel.hidden=!active;if(active)load()};
  document.addEventListener('hydroland:role-changed',e=>setVisible(e.detail?.role));
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
  window.addEventListener('hydroland:booking-confirmed',()=>{if(!panel.hidden)load()});
  window.HydrolandCrewAssignments={reload:load};
})();