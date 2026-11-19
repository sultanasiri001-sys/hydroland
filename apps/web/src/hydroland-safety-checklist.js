(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("safety-checklist", {
  "صلاحية شهادات الغواصين": "Diver certificate validity",
  "فحص معدات الغوص": "Diving equipment check",
  "توفر الأكسجين والإسعافات": "Oxygen and first aid availability",
  "فحص القارب والوقود": "Boat and fuel check",
  "مراجعة الطقس والبحر": "Weather and sea review",
  "تأكيد خطة الطوارئ": "Emergency plan confirmation",
  "إنشاء قائمة فحص قبل الرحلة": "Create a pre-trip checklist",
  "يُرسل الفحص للمراجعة، ولا يصبح قرار التشغيل النهائي إلا بعد اعتماد المراجع المخوّل.": "The check is submitted for review. It becomes a final operating decision only after approval by an authorized reviewer.",
  "ملاحظات التشغيل": "Operations notes",
  "أي ملاحظات أو إجراءات مطلوبة": "Any notes or required actions",
  "إرسال قائمة الفحص للمراجعة": "Submit checklist for review",
  "اختر رحلة أولًا": "Choose a trip first",
  "جارٍ حفظ قائمة الفحص...": "Saving checklist...",
  "تم تسجيل فشل في الفحص وإحالة الرحلة للمراجعة": "A failed check was recorded and the trip was referred for review",
  "تم إرسال قائمة الفحص للمراجعة": "Checklist submitted for review",
  "تعذر حفظ قائمة الفحص": "Could not save checklist"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const box=document.querySelector('.hl-safety-review');if(!box||document.getElementById('hl-safety-checklist-form'))return;
  const checklist=[
    ['diver_credentials','صلاحية شهادات الغواصين'],
    ['equipment_ready','فحص معدات الغوص'],
    ['oxygen_first_aid','توفر الأكسجين والإسعافات'],
    ['boat_fuel','فحص القارب والوقود'],
    ['weather_review','مراجعة الطقس والبحر'],
    ['emergency_plan','تأكيد خطة الطوارئ']
  ];
  const form=document.createElement('form');form.id='hl-safety-checklist-form';form.className='hl-safety-checklist-form';uiLocale.setHTML(form, uiLocale.html`<h4>إنشاء قائمة فحص قبل الرحلة</h4><p>يُرسل الفحص للمراجعة، ولا يصبح قرار التشغيل النهائي إلا بعد اعتماد المراجع المخوّل.</p><div data-safety-check-items></div><label>ملاحظات التشغيل<textarea name="notes" maxlength="2000" placeholder="أي ملاحظات أو إجراءات مطلوبة"></textarea></label><button type="submit">إرسال قائمة الفحص للمراجعة</button><small data-safety-checklist-state></small>`);
  const items=form.querySelector('[data-safety-check-items]');
  checklist.forEach(([key,label])=>{const labelEl=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.name=key;input.checked=false;const text=document.createElement('span');uiLocale.setText(text,label);labelEl.append(input,text);items.appendChild(labelEl)});
  const controls=box.querySelector('.hl-safety-review__controls');controls?.insertAdjacentElement('afterend',form);
  const setState=text=>{const node=form.querySelector('[data-safety-checklist-state]');if(node)uiLocale.setMessage(node, text||'')};
  const openRole=role=>{form.hidden=role!=='admin'};
  async function submit(event){
    event.preventDefault();const tripId=box.querySelector('[data-safety-trip]')?.value;
    if(!tripId){setState(uiLocale.message('اختر رحلة أولًا'));return}
    const data=new FormData(form),itemsBody={};checklist.forEach(([key])=>{itemsBody[key]=data.get(key)==='on'});
    try{
      setState(uiLocale.message('جارٍ حفظ قائمة الفحص...'));
      const response=await window.HydrolandAuth.authorizedFetch('/trips/'+encodeURIComponent(tripId)+'/safety',{method:'POST',body:JSON.stringify({items:itemsBody,notes:String(data.get('notes')||'').trim()||undefined})});
      const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||('HTTP '+response.status));
      const label=body.decision==='DEFERRED'?'تم تسجيل فشل في الفحص وإحالة الرحلة للمراجعة':'تم إرسال قائمة الفحص للمراجعة';
      setState(uiLocale.message(label));document.querySelector('[data-safety-load]')?.click();document.dispatchEvent(new CustomEvent('hydroland:safety-checklist-created',{detail:{tripId,checklist:body}}));
    }catch(error){setState(error instanceof Error?error.message:uiLocale.message('تعذر حفظ قائمة الفحص'))}
  }
  form.addEventListener('submit',submit);
  document.addEventListener('hydroland:role-changed',event=>openRole(event.detail?.role));
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())form.hidden=true});
  openRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver');
  window.HydrolandSafetyChecklist={submit};
})();