(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("policy-admin", {
  "مركز القيادة · الإدارة الرئيسية": "Command center · Main administration",
  "ضوابط الرحلات والتدريب": "Trip and training controls",
  "تشغيل الضابط يجعل استيفاءه مطلوبًا، وإيقافه يجعله اختياريًا في النطاق الموضح. تسري التغييرات على المنصة فور حفظها.": "Enabling a control makes it mandatory; disabling it makes it optional within the stated scope. Changes apply to the platform immediately after saving.",
  "الإيقاف لا يمنح تصريح تشغيل أو شهادة أو إثبات حضور أو دفع. صلاحيات الحسابات وقرارات التأجيل الصريحة تبقى نافذة.": "Disabling does not grant operating authorization, certification, attendance evidence or payment. Account permissions and explicit postponement decisions remain effective.",
  "تحديث الحالات": "Refresh statuses",
  "مفعّل — ON": "Enabled — ON",
  "موقوف — OFF": "Disabled — OFF",
  "تحت المراجعة — الإعداد السابق": "Under review — previous setting",
  "الحالة غير معروفة": "Unknown status",
  "سبب تغيير": "Reason for changing",
  "اكتب سبب التغيير (10 أحرف على الأقل)": "Enter the reason for change (at least 10 characters)",
  "تشغيل — ON": "Enable — ON",
  "إيقاف — OFF": "Disable — OFF",
  "جارٍ قراءة الحالات…": "Reading statuses…",
  "الحالات الحالية محفوظة. اختر الضابط واكتب سبب التغيير ثم اضغط تشغيل أو إيقاف.": "Current statuses are saved. Select a control, enter the reason, then choose Enable or Disable.",
  "تعذر قراءة الحالات. أعد التحديث قبل تغيير أي ضابط.": "Could not read statuses. Refresh before changing any control.",
  "اكتب سببًا من 10 إلى 500 حرف.": "Enter a reason of 10–500 characters.",
  "جارٍ حفظ": "Saving",
  "تم حفظ «": "Saved “",
  "، وتسجيل المسؤول والسبب في سجل التدقيق.": ", with the responsible person and reason recorded in the audit log.",
  "تغير الإعداد بواسطة مسؤول آخر. حدّث الحالات قبل المحاولة مجددًا.": "Another administrator changed this setting. Refresh statuses before retrying.",
  "تعذر تأكيد الحفظ. حدّث الحالات لمعرفة النتيجة قبل المحاولة مجددًا.": "Could not confirm saving. Refresh statuses to determine the result before retrying.",
  "جارٍ حفظ {0}…": "Saving {0}…",
  "تم حفظ «{0}»: {1}، وتسجيل المسؤول والسبب في سجل التدقيق.": "Saved “{0}”: {1}, with the responsible person and reason recorded in the audit log."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};


  const host=document.getElementById('role-console');if(!host||document.getElementById('hl-policy-control-center'))return;
  const panel=document.createElement('section');panel.id='hl-policy-control-center';panel.className='hl-policy-center';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<header><div><small>مركز القيادة · الإدارة الرئيسية</small><h3>ضوابط الرحلات والتدريب</h3><p>تشغيل الضابط يجعل استيفاءه مطلوبًا، وإيقافه يجعله اختياريًا في النطاق الموضح. تسري التغييرات على المنصة فور حفظها.</p><p>الإيقاف لا يمنح تصريح تشغيل أو شهادة أو إثبات حضور أو دفع. صلاحيات الحسابات وقرارات التأجيل الصريحة تبقى نافذة.</p></div><button type="button" data-policy-refresh>تحديث الحالات</button></header><p data-policy-feedback role="status" aria-live="polite"></p><div class="hl-policy-summary"></div><div class="hl-policy-groups"></div>`);
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
    if(!rules){uiLocale.setMessage(summary, uiLocale.message('الحالة غير معروفة'));groups.replaceChildren();lock();return;}
    uiLocale.setHTML(summary, Object.entries(labels).map(([state,label])=>uiLocale.html`<span class="${state.toLowerCase()}">${rules.filter(rule=>rule.state===state).length} ${uiLocale.messageHTML(uiLocale.message(label))}</span>`).join(''));
    uiLocale.setHTML(groups, [...new Set(rules.map(rule=>rule.group))].map(group=>uiLocale.html`<section class="hl-policy-group"><h4>${esc(group)}</h4>${rules.filter(rule=>rule.group===group).map(rule=>uiLocale.html`<article class="hl-policy-rule" data-control-id="${esc(rule.id)}"><div><b>${esc(rule.labelAr)}</b><p>${esc(rule.description)}</p><p data-control-status>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(labels[rule.state]))}</p></div><form class="hl-policy-form"><label>سبب تغيير ${esc(rule.labelAr)}<textarea name="reason" required minlength="10" maxlength="500" rows="2" autocomplete="off" placeholder="اكتب سبب التغيير (10 أحرف على الأقل)"></textarea></label><div class="hl-policy-actions">${['ENABLED','DISABLED'].map(state=>uiLocale.html`<button type="submit" data-policy-state="${state}" aria-pressed="${rule.state===state}" class="${rule.state===state?'active':''}">${uiLocale.messageHTML((state==='ENABLED' ? uiLocale.message('تشغيل — ON') : uiLocale.message('إيقاف — OFF')))}</button>`).join('')}</div></form></article>`).join('')}</section>`).join(''));lock();
  }
  function clear(){version++;rules=null;busy=false;panel.hidden=true;uiLocale.setMessage(feedback, '');render();}
  async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false;}return true;}
  async function load(){
    if(!eligible()){clear();return;}
    const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;rules=null;busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ قراءة الحالات…'));render();
    try{
      if(!await authorize(v,session))return;
      const response=await auth().authorizedFetch('/admin/operational-controls'),rows=await response.json().catch(()=>null);
      if(!current(v,session))return;
      if(!response.ok||!Array.isArray(rows)||!rows.length||!rows.every(valid))throw new Error('UNAVAILABLE');
      rules=rows;uiLocale.setMessage(feedback, uiLocale.message('الحالات الحالية محفوظة. اختر الضابط واكتب سبب التغيير ثم اضغط تشغيل أو إيقاف.'));
    }catch{if(current(v,session)){rules=null;uiLocale.setMessage(feedback, uiLocale.message('تعذر قراءة الحالات. أعد التحديث قبل تغيير أي ضابط.'));}}
    finally{if(current(v,session)){busy=false;render();}}
  }
  panel.addEventListener('submit',async event=>{
    const form=event.target.closest('.hl-policy-form');if(!form)return;event.preventDefault();
    const id=form.closest('[data-control-id]').dataset.controlId,rule=rules?.find(row=>row.id===id),state=event.submitter?.dataset.policyState,reason=form.elements.reason.value.trim();
    if(busy||!eligible()||!rule||!['ENABLED','DISABLED'].includes(state)||state===rule.state)return;
    if(reason.length<10||reason.length>500){uiLocale.setMessage(feedback, uiLocale.message('اكتب سببًا من 10 إلى 500 حرف.'));return;}
    const v=++version,session=auth()?.getSessionVersion?.();busy=true;uiLocale.setMessage(feedback, uiLocale.message("جارٍ حفظ {0}…", [rule.labelAr]));lock();
    try{
      if(!await authorize(v,session))return;
      const response=await auth().authorizedFetch('/admin/operational-controls/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({state,reason,expectedRevision:rule.revision})});
      const saved=await response.json().catch(()=>null);if(!current(v,session))return;
      if(!response.ok||!valid(saved)||saved.id!==id||saved.state!==state)throw new Error(response.status===409?'STALE':'SAVE_FAILED');
      rules=rules.map(row=>row.id===id?saved:row);uiLocale.setMessage(feedback, uiLocale.message("تم حفظ «{0}»: {1}، وتسجيل المسؤول والسبب في سجل التدقيق.", [saved.labelAr, (value=>value===undefined?value:uiLocale.message(value))(labels[saved.state])]));
      document.dispatchEvent(new CustomEvent('hydroland:operational-controls-changed',{detail:{id,state}}));
      void Promise.allSettled([window.HydrolandBookingSafetyControl?.reload?.(),window.HydrolandBookings?.reload?.(),window.HydrolandStore?.reloadProducts?.()]);
      window.dispatchEvent(new CustomEvent('hydroland:weather-gate-changed'));
    }catch(error){if(current(v,session)){rules=null;uiLocale.setMessage(feedback, (error.message==='STALE' ? uiLocale.message('تغير الإعداد بواسطة مسؤول آخر. حدّث الحالات قبل المحاولة مجددًا.') : uiLocale.message('تعذر تأكيد الحفظ. حدّث الحالات لمعرفة النتيجة قبل المحاولة مجددًا.')));}}
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
