(()=>{
  const locale=window.HydrolandI18n.createScope('provider-contact',{
    'بيانات التواصل والمستحقات':'Contact and payout details','رقم الجوال':'Mobile number','بريد التواصل':'Contact email',
    'اسم جهة اتصال الطوارئ (اختياري)':'Emergency contact name (optional)','هاتف الطوارئ':'Emergency phone',
    'حساب المستحقات':'Payout account','اسم صاحب الحساب':'Account holder','الآيبان السعودي':'Saudi IBAN',
    'الحساب المحفوظ ينتهي بـ':'Saved account ending in','إضافة حساب بنكي':'Add bank account','تغيير الحساب البنكي':'Change bank account',
    'يستطيع محاسب المركز المرتبط بك الاطلاع على بيانات الحساب لصرف مستحقاتك.':'Your affiliated center’s authorized accountant can view the bank details for payouts.',
    'حفظ':'Save','إغلاق':'Close','جارٍ التحميل…':'Loading…','أعد تحميل البيانات':'Reload details',
    'تعذّر تحميل البيانات.':'Could not load the details.','تعذّر حفظ البيانات.':'Could not save the details.',
    'تم حفظ البيانات.':'Details saved.','تغيّرت البيانات. أعد تحميلها قبل الحفظ.':'Details changed. Reload before saving.',
    'حسابات المستحقات':'Payee bank accounts','إظهار الحساب':'Show account','إخفاء الحساب':'Hide account',
    'لا توجد حسابات مستحقات مسجّلة لهذا المركز.':'No payout accounts registered for this center.'
  });
  const auth=()=>window.HydrolandAuth;
  const access=()=>window.HydrolandPortalAccess;
  const eligible=()=>auth()?.isAuthenticated?.() && ['instructor','boat'].some(role=>access()?.roleAllowed?.(role));
  const node=(tag,key)=>{
    const item=document.createElement(tag);
    if(key)locale.setText(item,key);
    return item;
  };
  function button(parent,key,click){
    const item=node('button',key);item.type='button';item.addEventListener('click',click);parent.append(item);return item;
  }
  function field(parent,name,key,type,value){
    const label=node('label',key),input=node('input');
    input.name=name;input.type=type;input.value=value||'';if(type==='tel'||type==='email'||name==='iban')input.dir='ltr';
    label.append(input);parent.append(label);return input;
  }
  let dialog=null;
  function close(){dialog?.remove();dialog=null;}
  async function open(){
    if(!eligible())return;
    document.querySelector('#profile-dialog')?.close();close();
    const host=node('dialog');dialog=host;host.className='hl-profile-editor';host.id='hl-provider-contact';
    host.setAttribute('aria-labelledby','hl-provider-title');
    const title=node('h2','بيانات التواصل والمستحقات');title.id='hl-provider-title';
    const body=node('div'),status=node('p','جارٍ التحميل…');status.setAttribute('role','status');
    host.append(title,body,status);button(host,'إغلاق',close);host.addEventListener('close',close,{once:true});
    document.body.append(host);host.showModal();
    const session=auth().getSessionVersion();
    const current=()=>host===dialog&&host.isConnected&&eligible()&&session===auth().getSessionVersion();
    try{
      const response=await auth().authorizedFetch('/me/provider-contact',{cache:'no-store'});
      if(!response.ok)throw new Error();
      const contact=await response.json();
      if(!current())return;
      const draw=data=>{
        const form=node('form');body.replaceChildren(form);
        const contactFields=[
          ['phone','رقم الجوال','tel'],['contactEmail','بريد التواصل','email'],
          ['emergencyPhone','هاتف الطوارئ','tel'],['emergencyName','اسم جهة اتصال الطوارئ (اختياري)','text']
        ];
        for(const [name,key,type] of contactFields)field(form,name,key,type,data[name]);
        form.elements.contactEmail.required=true;
        const bank=node('fieldset'),legend=node('legend','حساب المستحقات');bank.append(legend);form.append(bank);
        if(data.lastFour){const mask=node('p','الحساب المحفوظ ينتهي بـ');mask.append(' ',Object.assign(node('bdi'),{textContent:data.lastFour}));bank.append(mask);}
        const editing=node('div');editing.hidden=true;
        const edit=button(bank,data.lastFour?'تغيير الحساب البنكي':'إضافة حساب بنكي',()=>{
          editing.hidden=!editing.hidden;holder.required=iban.required=!editing.hidden;
          if(editing.hidden){holder.value='';iban.value='';}else{holder.value=data.holder||'';holder.focus();}
          edit.setAttribute('aria-expanded',String(!editing.hidden));
        });
        edit.setAttribute('aria-expanded','false');bank.append(editing);
        const holder=field(editing,'holder','اسم صاحب الحساب','text',''),iban=field(editing,'iban','الآيبان السعودي','text','');
        iban.autocomplete='off';iban.maxLength=50;editing.append(node('p','يستطيع محاسب المركز المرتبط بك الاطلاع على بيانات الحساب لصرف مستحقاتك.'));
        const submit=node('button','حفظ');submit.type='submit';form.append(submit);
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(!current()||submit.disabled||!form.reportValidity())return;
          const changes={revision:data.revision};
          for(const [name] of contactFields){const value=form.elements[name].value.trim();if(value!==data[name])changes[name]=value;}
          if(!editing.hidden){changes.iban=iban.value;changes.holder=holder.value;}
          const controls=[...form.elements];controls.forEach(el=>el.disabled=true);status.replaceChildren();
          let conflict=false;
          try{
            const result=await auth().authorizedFetch('/me/provider-contact',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes),cache:'no-store'});
            const saved=await result.json().catch(()=>null);if(!current())return;
            if(!result.ok){
              if(result.status===409){conflict=true;locale.setText(status,'تغيّرت البيانات. أعد تحميلها قبل الحفظ.');button(status,'أعد تحميل البيانات',open);return;}
              if(result.status===400&&typeof saved?.message==='string'){status.textContent=saved.message;return;}
              throw new Error();
            }
            iban.value='';draw(saved);locale.setText(status,'تم حفظ البيانات.');
          }catch{if(current())locale.setText(status,'تعذّر حفظ البيانات.');}
          finally{if(current()&&!conflict)controls.forEach(el=>el.disabled=false);}
        });
      };
      status.replaceChildren();draw(contact);
    }catch{if(current()){locale.setText(status,'تعذّر تحميل البيانات.');button(status,'أعد تحميل البيانات',open);}}
  }
  const entry=button(document.querySelector('#profile-dialog .profile-list'),'بيانات التواصل والمستحقات',open);
  entry.dataset.providerProfile='';const visibility=()=>{entry.hidden=!eligible();};
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed','hydroland:auth-changed'])
    document.addEventListener(event,()=>{close();visibility();});
  document.addEventListener('hydroland:profile-data-ready',visibility);visibility();

  function payees(root,center,isCurrent){
    const details=node('details'),summary=node('summary','حسابات المستحقات'),rows=node('div');
    details.append(summary,rows);root.append(details);
    const path='/finance/centers/'+encodeURIComponent(center)+'/payees';
    let generation=0;
    details.addEventListener('toggle',async()=>{
      const epoch=++generation;
      const live=()=>epoch===generation&&details.isConnected&&details.open&&isCurrent();
      rows.replaceChildren();if(!live())return;
      try{
        const response=await auth().authorizedFetch(path,{cache:'no-store'});if(!response.ok)throw new Error();
        const items=await response.json();if(!live())return;
        if(!items.length){rows.append(node('p','لا توجد حسابات مستحقات مسجّلة لهذا المركز.'));return;}
        for(const item of items){
          const row=node('article'),name=node('strong'),info=node('p');name.textContent=item.name;
          const mask=node('bdi');mask.textContent='•••• '+item.lastFour;row.append(name,' ',mask);
          rows.append(row);
          const action=button(row,'إظهار الحساب',async()=>{
            if(!live()||action.disabled)return;
            if(info.textContent){info.replaceChildren();locale.setText(action,'إظهار الحساب');return;}
            action.disabled=true;
            try{
              const reply=await auth().authorizedFetch(path+'/'+encodeURIComponent(item.id)+'/bank',{method:'POST',cache:'no-store'});
              if(!reply.ok)throw new Error();
              const data=await reply.json();if(!live())return;
              const number=node('bdi');number.textContent=data.iban;info.append(data.holder,' ',number);locale.setText(action,'إخفاء الحساب');
            }catch{if(live())locale.setText(info,'تعذّر تحميل البيانات.');}
            finally{if(live())action.disabled=false;}
          });
          row.append(info);
        }
      }catch{if(live())rows.append(node('p','تعذّر تحميل البيانات.'));}
    });
  }
  window.HydrolandProviderContact={open,payees};
})();
