(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("booking-safety-control", {
  "اشتراط اعتماد السلامة للحجز": "Require safety approval for booking",
  "يسري هذا الإعداد على جميع رحلات المنصة. إيقاف الاشتراط يسمح بالحجز دون اعتماد السلامة، ولا يمنح تصريح تشغيل. يظل قرار تأجيل الرحلة وشروط الطقس وبقية المتطلبات سارية.": "This setting applies to all platform trips. Disabling the requirement allows booking without safety approval; it does not grant operating permission. Trip postponement decisions, weather conditions and other requirements still apply.",
  "الحالة غير معروفة": "Status unknown",
  "تحديث حالة اشتراط السلامة": "Refresh the safety requirement status",
  "سبب تغيير اشتراط السلامة": "Reason for changing the safety requirement",
  "تفعيل اشتراط السلامة": "Enable the safety requirement",
  "إيقاف اشتراط السلامة": "Disable the safety requirement",
  "مفعّل — اعتماد السلامة مطلوب قبل الحجز": "Enabled — safety approval is required before booking",
  "موقوف — اعتماد السلامة اختياري للحجز": "Disabled — safety approval is optional for booking",
  "تحت المراجعة — الحجز يسجل الحاجة إلى مراجعة السلامة": "Under review — bookings record the need for a safety review",
  "الحالة الحالية: ": "Current status: ",
  "غير معروفة": "Unknown",
  "جارٍ قراءة الحالة…": "Reading status…",
  "لم يتم تغيير الإعداد. يتطلب أي تغيير سببًا ويُسجّل في سجل التدقيق.": "The setting has not changed. Every change requires a reason and is recorded in the audit log.",
  "تعذر قراءة الحالة. أعد التحديث قبل تغيير الإعداد.": "Could not read the status. Refresh before changing the setting.",
  "اكتب سببًا واضحًا من 10 أحرف على الأقل.": "Enter a clear reason of at least 10 characters.",
  "جارٍ حفظ الإعداد…": "Saving the setting…",
  "تم حفظ الإعداد وتسجيل التغيير في سجل التدقيق.": "Setting saved and change recorded in the audit log.",
  "تعذر تأكيد الحفظ. حدّث الحالة لمعرفة النتيجة قبل المحاولة مجددًا.": "Could not confirm the save. Refresh the status to check the result before trying again.",
  "الحالة الحالية: {0}": "Current status: {0}",
  "الحالة الحالية:": "Current status:"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const host=document.querySelector('.hl-trip-admin');
  if(!host||host.querySelector('[data-booking-safety-control]'))return;
  const panel=document.createElement('section');
  panel.className='hl-booking-safety-control';panel.dataset.bookingSafetyControl='';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<h3>اشتراط اعتماد السلامة للحجز</h3><p>يسري هذا الإعداد على جميع رحلات المنصة. إيقاف الاشتراط يسمح بالحجز دون اعتماد السلامة، ولا يمنح تصريح تشغيل. يظل قرار تأجيل الرحلة وشروط الطقس وبقية المتطلبات سارية.</p><p data-safety-policy-state role="status">الحالة غير معروفة</p><button type="button" data-safety-policy-refresh>تحديث حالة اشتراط السلامة</button><form data-safety-policy-form><label>سبب تغيير اشتراط السلامة<input name="reason" required minlength="10" maxlength="500" autocomplete="off"></label><button type="submit" data-safety-policy-state="ENABLED" disabled>تفعيل اشتراط السلامة</button><button type="submit" data-safety-policy-state="DISABLED" disabled>إيقاف اشتراط السلامة</button></form><p data-safety-policy-feedback role="status"></p>`);
  host.querySelector('[data-trip-admin-form]').before(panel);
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
  const form=panel.querySelector('form'),state=panel.querySelector('[data-safety-policy-state]:not(button)'),feedback=panel.querySelector('[data-safety-policy-feedback]'),refresh=panel.querySelector('[data-safety-policy-refresh]');
  const labels={ENABLED:'مفعّل — اعتماد السلامة مطلوب قبل الحجز',DISABLED:'موقوف — اعتماد السلامة اختياري للحجز',REVIEW:'تحت المراجعة — الحجز يسجل الحاجة إلى مراجعة السلامة'};
  let version=0,known=null,busy=false;
  const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
  function render(){uiLocale.setText(state, ...["الحالة الحالية: {0}", [uiLocale.message(labels[known]||'غير معروفة')]]);form.querySelectorAll('button').forEach(button=>button.disabled=busy||!known||button.dataset.safetyPolicyState===known);refresh.disabled=busy;}
  function clear(){version++;known=null;busy=false;panel.hidden=true;form.reset();feedback.textContent='';render();}
  const valid=rule=>rule?.category==='BOOKING'&&rule?.ruleKey==='SAFETY_APPROVAL'&&Object.hasOwn(labels,rule.state);
  async function load(){
    if(!eligible()){clear();return;}
    const v=++version,session=auth()?.getSessionVersion?.();panel.hidden=false;known=null;busy=true;uiLocale.setText(feedback, ...['جارٍ قراءة الحالة…']);render();
    try{
      const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});
      if(!allowed||!current(v,session)){if(v===version)clear();return;}
      const response=await auth().authorizedFetch('/admin/policies?category=BOOKING'),rows=await response.json().catch(()=>null);
      if(!current(v,session))return;
      const rule=Array.isArray(rows)?rows.find(row=>row.ruleKey==='SAFETY_APPROVAL'):null;
      if(!response.ok||!valid(rule))throw new Error('UNAVAILABLE');
      known=rule.state;uiLocale.setText(feedback, ...['لم يتم تغيير الإعداد. يتطلب أي تغيير سببًا ويُسجّل في سجل التدقيق.']);
    }catch{if(current(v,session))uiLocale.setText(feedback, ...['تعذر قراءة الحالة. أعد التحديث قبل تغيير الإعداد.']);}
    finally{if(current(v,session)){busy=false;render();}}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();const next=event.submitter?.dataset.safetyPolicyState,reason=form.elements.reason.value.trim();
    if(busy||!known||!eligible()||!['ENABLED','DISABLED'].includes(next)||next===known)return;
    if(reason.length<10){uiLocale.setText(feedback, ...['اكتب سببًا واضحًا من 10 أحرف على الأقل.']);return;}
    const v=++version,session=auth()?.getSessionVersion?.();busy=true;uiLocale.setText(feedback, ...['جارٍ حفظ الإعداد…']);render();
    try{
      const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});
      if(!allowed||!current(v,session)){if(v===version)clear();return;}
      const response=await auth().authorizedFetch('/admin/policies/BOOKING/SAFETY_APPROVAL/state',{method:'PATCH',body:JSON.stringify({state:next,reason})});
      const rule=await response.json().catch(()=>null);if(!current(v,session))return;
      if(!response.ok||!valid(rule)||rule.state!==next)throw new Error('SAVE_FAILED');
      known=rule.state;form.reset();uiLocale.setText(feedback, ...['تم حفظ الإعداد وتسجيل التغيير في سجل التدقيق.']);
      document.dispatchEvent(new CustomEvent('hydroland:booking-safety-policy-changed'));
      void Promise.allSettled([window.HydrolandBookings?.reload?.(),window.HydrolandStore?.reloadProducts?.()]);
    }catch{if(current(v,session)){known=null;uiLocale.setText(feedback, ...['تعذر تأكيد الحفظ. حدّث الحالة لمعرفة النتيجة قبل المحاولة مجددًا.']);}}
    finally{if(current(v,session)){busy=false;render();}}
  });
  refresh.addEventListener('click',()=>void load());
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear();});
  document.addEventListener('hydroland:auth-changed',()=>{clear();if(eligible())void load();});
  window.HydrolandBookingSafetyControl=Object.freeze({reload:load});
  if(eligible())void load();
})();
