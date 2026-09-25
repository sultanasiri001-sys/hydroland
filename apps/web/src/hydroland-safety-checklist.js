(()=>{
  const box=document.querySelector('.hl-safety-review');if(!box||document.getElementById('hl-safety-checklist-form'))return;
  const checklist=[
    ['diver_credentials','صلاحية شهادات الغواصين'],
    ['equipment_ready','فحص معدات الغوص'],
    ['oxygen_first_aid','توفر الأكسجين والإسعافات'],
    ['boat_fuel','فحص القارب والوقود'],
    ['weather_review','مراجعة الطقس والبحر'],
    ['emergency_plan','تأكيد خطة الطوارئ']
  ];
  const form=document.createElement('form');form.id='hl-safety-checklist-form';form.className='hl-safety-checklist-form';form.innerHTML='<h4>إنشاء قائمة فحص قبل الرحلة</h4><p>يُرسل الفحص للمراجعة، ولا يصبح قرار التشغيل النهائي إلا بعد اعتماد المراجع المخوّل.</p><div data-safety-check-items></div><label>ملاحظات التشغيل<textarea name="notes" maxlength="2000" placeholder="أي ملاحظات أو إجراءات مطلوبة"></textarea></label><button type="submit">إرسال قائمة الفحص للمراجعة</button><small data-safety-checklist-state></small>';
  const items=form.querySelector('[data-safety-check-items]');
  checklist.forEach(([key,label])=>{const labelEl=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.name=key;input.checked=false;labelEl.append(input,document.createTextNode(' '+label));items.appendChild(labelEl)});
  const controls=box.querySelector('.hl-safety-review__controls');controls?.insertAdjacentElement('afterend',form);
  const setState=text=>{const node=form.querySelector('[data-safety-checklist-state]');if(node)node.textContent=text||''};
  const openRole=role=>{form.hidden=role!=='admin'};
  async function submit(event){
    event.preventDefault();const tripId=box.querySelector('[data-safety-trip]')?.value;
    if(!tripId){setState('اختر رحلة أولًا');return}
    const data=new FormData(form),itemsBody={};checklist.forEach(([key])=>{itemsBody[key]=data.get(key)==='on'});
    try{
      setState('جارٍ حفظ قائمة الفحص...');
      const response=await window.HydrolandAuth.authorizedFetch('/trips/'+encodeURIComponent(tripId)+'/safety',{method:'POST',body:JSON.stringify({items:itemsBody,notes:String(data.get('notes')||'').trim()||undefined})});
      const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||('HTTP '+response.status));
      const label=body.decision==='DEFERRED'?'تم تسجيل فشل في الفحص وإحالة الرحلة للمراجعة':'تم إرسال قائمة الفحص للمراجعة';
      setState(label);document.querySelector('[data-safety-load]')?.click();document.dispatchEvent(new CustomEvent('hydroland:safety-checklist-created',{detail:{tripId,checklist:body}}));
    }catch(error){setState(error instanceof Error?error.message:'تعذر حفظ قائمة الفحص')}
  }
  form.addEventListener('submit',submit);
  document.addEventListener('hydroland:role-changed',event=>openRole(event.detail?.role));
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.())form.hidden=true});
  openRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver');
  window.HydrolandSafetyChecklist={submit};
})();