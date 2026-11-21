(() => {
  const localized = (ar, en) => document.documentElement.lang?.startsWith('en') ? en : ar;
  const element = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, action) => {
    const node = element('button', label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const label = (text, input) => {
    const node = element('label',text);
    node.append(input);
    return node;
  };
  const states = {
    CENTER_PENDING: ['عند المركز','With the center'], CENTER_HANDLING: ['المركز يعالج الطلب','Center is handling the request'],
    DEPARTMENT_PENDING: ['عند الإدارة المختصة','With the department'], RESOLVED: ['تمت المعالجة','Resolved']
  };
  const api = async (path, body) => {
    const response = await window.HydrolandAuth.authorizedFetch('/privacy/grievances'+path,
      body === undefined ? {} : {method:'POST', headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw Error(data.message || localized('تعذّر تنفيذ الطلب','Request failed'));
    return data;
  };
  let active;
  function open() {
    if (active) return;
    const dialog = element('dialog');
    active = dialog;
    dialog.id = 'hl-privacy-grievances';
    dialog.className = 'hl-profile-editor';
    const header = element('header');
    const title = element('h2', localized('تظلّم على البيانات الشخصية','Personal data grievances'));
    title.id = 'hl-privacy-title';
    dialog.setAttribute('aria-labelledby',title.id);
    header.append(title,button(localized('إغلاق','Close'),()=>dialog.close()));
    const status = element('p');
    status.setAttribute('role','status');
    const content = element('div');
    dialog.append(header,status,content);
    document.body.append(dialog);
    dialog.addEventListener('close',()=>{ if (active===dialog) active=null; dialog.remove(); },{once:true});
    dialog.showModal();
    let page = 1;
    let revision = 0;
    const textarea = () => {
      const input = element('textarea'); input.required=true; input.maxLength=3000; return input;
    };
    const form = (fields,caption,handler) => {
      const node = element('form'), submit=element('button',caption);
      submit.type='submit';
      node.append(...fields,submit);
      node.addEventListener('submit',async event=>{
        event.preventDefault();
        if (submit.disabled) return;
        submit.disabled=true;
        try { await handler(); if (active===dialog) await load(localized('تم حفظ الإجراء.','Saved.')); }
        catch(error) { if(active===dialog) status.textContent=error.message; }
        finally { submit.disabled=false; }
      });
      return node;
    };
    const select = (items,id,name) => {
      const node=element('select'); node.required=true;
      node.add(new Option(localized('اختر','Select'),''));
      for(const item of items) node.add(new Option(name(item),item[id]));
      return node;
    };
    async function load(message='') {
      const version=++revision;
      status.textContent=localized('جارٍ التحميل…','Loading…');
      try {
        const data=await api('?page='+page);
        if(active!==dialog || revision!==version) return;
        content.replaceChildren();
        if(data.centers.length) {
          const centers=select(data.centers,'id',x=>x.displayName),topics=select(data.topics,'domain',x=>localized(x.ar,x.en)),description=textarea();
          const key=crypto.randomUUID();
          content.append(element('h3',localized('تقديم تظلّم','File a grievance')),form([
            label(localized('المركز','Center'),centers),label(localized('موضوع البيانات','Data topic'),topics),
            label(localized('وصف الطلب','Describe the request'),description)
          ],localized('إرسال للمركز','Send to center'),()=>api('',{centerId:centers.value,topic:topics.value,description:description.value,requestKey:key})));
        } else content.append(element('p',localized('يتطلب تقديم طلب ارتباطًا بمركز غوص.','A linked dive center is required to file a request.')));
        content.append(element('h3',localized('متابعة الطلبات','Track requests')));
        if(!data.items.length) content.append(element('p',localized('لا توجد طلبات.','No requests.')));
        for(const row of data.items) {
          const section=element('section');
          section.append(element('h4',row.organization.displayName),element('p',row.description),element('p',localized(...states[row.state])));
          const date=new Date(row.dueAt).toLocaleString(document.documentElement.lang||'ar');
          section.append(element('p',localized('نهاية مهلة المركز','Center deadline')+' · '+date));
          if(row.personalDataRequestId) section.append(element('p',localized('رقم طلب البيانات','Data request number')+' · '+row.personalDataRequestId));
          if(row.firstOutcome) section.append(element('p',localized('القرار الأول','Initial decision')+' · '+row.firstOutcome));
          if(row.appealReason) section.append(element('p',localized('سبب التظلم','Appeal reason')+' · '+row.appealReason));
          if(row.canAppeal) {
            const reason=textarea();
            section.append(form([label(localized('سبب التظلم على القرار','Reason for appealing the decision'),reason)],
              localized('إحالة التظلم للإدارة المختصة','Submit appeal to the department'),
              ()=>api('/'+encodeURIComponent(row.id)+'/appeal',{reason:reason.value})));
          }
          if(row.centerAction) section.append(element('p',row.centerAction));
          if(row.outcome) section.append(element('p',localized('نتيجة المعالجة','Outcome')+' · '+row.outcome));
          const act=(action,fields)=>api('/'+encodeURIComponent(row.id)+'/actions',{action,...fields});
          if(row.canCenter || row.canDepartment) {
            const result=textarea(),fields=[label(localized('النتيجة التي ستصل للمشترك والمركز','Outcome for the member and center'),result)];
            const choice=element('select');
            if(row.personalDataRequestId) {
              choice.required=true;
              choice.add(new Option(localized('حدد نتيجة القرار','Select a decision'),''));
              if(row.hasExecutionProof) choice.add(new Option(localized('تم التنفيذ بإثبات مرتبط','Applied with linked evidence'),'APPLIED'));
              choice.add(new Option(localized('تأجيل التنفيذ','Defer'),'DEFERRED'));
              choice.add(new Option(localized('رفض الطلب','Refuse'),'REFUSED'));
              fields.unshift(label(localized('قرار طلب البيانات','Data request decision'),choice));
            }
            const disposition=()=>row.personalDataRequestId?{disposition:choice.value}:{};
            if(row.canDepartment) {
              const report=textarea();
              fields.push(label(localized('تقرير داخلي للإدارة العليا','Internal report for executive management'),report));
              section.append(form(fields,localized('رفع التقرير وإبلاغ الطرفين','File report and notify both parties'),()=>act('DEPARTMENT_RESOLVE',{message:result.value,report:report.value,...disposition()})));
            } else {
              if(row.state==='CENTER_PENDING') {
                const work=textarea();
                section.append(form([label(localized('الإجراء الذي اتخذه المركز','Action taken by the center'),work)],localized('تسجيل الإجراء','Record action'),()=>act('CENTER_HANDLE',{message:work.value})));
              }
              section.append(form(fields,localized('إنهاء المعالجة وإبلاغ الطرفين','Resolve and notify both parties'),()=>act('CENTER_RESOLVE',{message:result.value,...disposition()})));
            }
          }
          content.append(section);
        }
        if(page>1) content.append(button(localized('السابق','Previous'),()=>{page--; void load();}));
        if(data.more) content.append(button(localized('التالي','Next'),()=>{page++; void load();}));
        status.textContent=message;
      } catch (error) { if(active===dialog && revision===version) status.textContent=error.message; }
    }
    void load();
  }
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-privacy-grievances]')) open();});
  document.addEventListener('hydroland:session-cleared',()=>active?.close());
})();
