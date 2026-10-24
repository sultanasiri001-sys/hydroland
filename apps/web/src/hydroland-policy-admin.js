(()=>{
  const host=document.getElementById('role-console');if(!host||document.getElementById('hl-policy-control-center'))return;
  const panel=document.createElement('section');panel.id='hl-policy-control-center';panel.className='hl-policy-center';panel.hidden=true;
  panel.innerHTML='<header><div><small>مركز القيادة · الإدارة الرئيسية</small><h3>ضوابط الرحلات والتدريب</h3><p>تشغيل الضابط يجعل استيفاءه مطلوبًا، وإيقافه يجعله اختياريًا في النطاق الموضح. تسري التغييرات على المنصة فور حفظها.</p><p>الإيقاف لا يمنح تصريح تشغيل أو شهادة أو إثبات حضور أو دفع. صلاحيات الحسابات وقرارات التأجيل الصريحة تبقى نافذة.</p></div><button type="button" data-policy-refresh>تحديث الحالات</button></header><p data-policy-feedback role="status" aria-live="polite"></p><div class="hl-policy-summary"></div><div class="hl-policy-groups"></div>';
  host.insertAdjacentElement('afterend',panel);
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labels={ENABLED:'مفعّل — ON',DISABLED:'موقوف — OFF',REVIEW:'تحت المراجعة — الإعداد السابق'};
  const feedback=panel.querySelector('[data-policy-feedback]'),groups=panel.querySelector('.hl-policy-groups'),summary=panel.querySelector('.hl-policy-summary'),refresh=panel.querySelector('[data-policy-refresh]');
  let version=0,rules=null,busy=false;
  const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
  const valid=rule=>rule&&typeof rule.id==='string'&&typeof rule.labelAr==='string'&&typeof rule.group==='string'&&Object.hasOwn(labels,rule.state)&&/^[a-f0-9]{64}$/.test(rule.revision);
  function lock(){refresh.disabled=busy;panel.querySelectorAll('[data-policy-state]').forEach(button=>{const rule=rules?.find(rule=>rule.id===button.closest('[data-control-id]')?.dataset.controlId);button.disabled=busy||!rule||rule.state===button.dataset.policyState;});panel.querySelectorAll('textarea').forEach(input=>input.disabled=busy);}
  function render(){
    if(!rules){summary.textContent='الحالة غير معروفة';groups.replaceChildren();lock();return;}
    summary.innerHTML=Object.entries(labels).map(([state,label])=>'<span class="'+state.toLowerCase()+'">'+rules.filter(rule=>rule.state===state).length+' '+esc(label)+'</span>').join('');
    groups.innerHTML=[...new Set(rules.map(rule=>rule.group))].map(group=>'<section class="hl-policy-group"><h4>'+esc(group)+'</h4>'+rules.filter(rule=>rule.group===group).map(rule=>'<article class="hl-policy-rule" data-control-id="'+esc(rule.id)+'"><div><b>'+esc(rule.labelAr)+'</b><p>'+esc(rule.description)+'</p><p data-control-status>'+esc(labels[rule.state])+'</p></div><form class="hl-policy-form"><label>سبب تغيير '+esc(rule.labelAr)+'<textarea name="reason" required minlength="10" maxlength="500" rows="2" autocomplete="off" placeholder="اكتب سبب التغيير (10 أحرف على الأقل)"></textarea></label><div class="hl-policy-actions">'+['ENABLED','DISABLED'].map(state=>'<button type="submit" data-policy-state="'+state+'" aria-pressed="'+(rule.state===state)+'" class="'+(rule.state===state?'active':'')+'">'+(state==='ENABLED'?'تشغيل — ON':'إيقاف — OFF')+'</button>').join('')+'</div></form></article>').join('')+'</section>').join('');lock();
  }
  function clear(){version++;rules=null;busy=false;panel.hidden=true;feedback.textContent='';render();}
  async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false;}return true;}
  async function load(){
    if(!eligible()){clear();return;}
    const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;rules=null;busy=true;feedback.textContent='جارٍ قراءة الحالات…';render();
    try{
      if(!await authorize(v,session))return;
      const response=await auth().authorizedFetch('/admin/operational-controls'),rows=await response.json().catch(()=>null);
      if(!current(v,session))return;
      if(!response.ok||!Array.isArray(rows)||!rows.length||!rows.every(valid))throw new Error('UNAVAILABLE');
      rules=rows;feedback.textContent='الحالات الحالية محفوظة. اختر الضابط واكتب سبب التغيير ثم اضغط تشغيل أو إيقاف.';
    }catch{if(current(v,session)){rules=null;feedback.textContent='تعذر قراءة الحالات. أعد التحديث قبل تغيير أي ضابط.';}}
    finally{if(current(v,session)){busy=false;render();}}
  }
  panel.addEventListener('submit',async event=>{
    const form=event.target.closest('.hl-policy-form');if(!form)return;event.preventDefault();
    const id=form.closest('[data-control-id]').dataset.controlId,rule=rules?.find(row=>row.id===id),state=event.submitter?.dataset.policyState,reason=form.elements.reason.value.trim();
    if(busy||!eligible()||!rule||!['ENABLED','DISABLED'].includes(state)||state===rule.state)return;
    if(reason.length<10||reason.length>500){feedback.textContent='اكتب سببًا من 10 إلى 500 حرف.';return;}
    const v=++version,session=auth()?.getSessionVersion?.();busy=true;feedback.textContent='جارٍ حفظ '+rule.labelAr+'…';lock();
    try{
      if(!await authorize(v,session))return;
      const response=await auth().authorizedFetch('/admin/operational-controls/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({state,reason,expectedRevision:rule.revision})});
      const saved=await response.json().catch(()=>null);if(!current(v,session))return;
      if(!response.ok||!valid(saved)||saved.id!==id||saved.state!==state)throw new Error(response.status===409?'STALE':'SAVE_FAILED');
      rules=rules.map(row=>row.id===id?saved:row);feedback.textContent='تم حفظ «'+saved.labelAr+'»: '+labels[saved.state]+'، وتسجيل المسؤول والسبب في سجل التدقيق.';
      document.dispatchEvent(new CustomEvent('hydroland:operational-controls-changed',{detail:{id,state}}));
      void Promise.allSettled([window.HydrolandBookingSafetyControl?.reload?.(),window.HydrolandBookings?.reload?.(),window.HydrolandStore?.reloadProducts?.()]);
      window.dispatchEvent(new CustomEvent('hydroland:weather-gate-changed'));
    }catch(error){if(current(v,session)){rules=null;feedback.textContent=error.message==='STALE'?'تغير الإعداد بواسطة مسؤول آخر. حدّث الحالات قبل المحاولة مجددًا.':'تعذر تأكيد الحفظ. حدّث الحالات لمعرفة النتيجة قبل المحاولة مجددًا.';}}
    finally{if(current(v,session)){busy=false;render();}}
  });
  refresh.addEventListener('click',()=>void load());
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear();});
  document.addEventListener('hydroland:auth-changed',()=>{clear();if(eligible())void load();});
  document.addEventListener('hydroland:booking-safety-policy-changed',()=>{if(eligible()&&!busy)void load();});
  window.addEventListener('hydroland:weather-gate-changed',event=>{if(event.detail&&eligible()&&!busy)void load();});
  window.HydrolandPolicyAdmin=Object.freeze({reload:load});
  if(eligible())void load();
})();
