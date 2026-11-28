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
  const api = async (path, body, namespace='/privacy/grievances') => {
    const response = await window.HydrolandAuth.authorizedFetch(namespace+path,
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
    function retentionControls(version) {
      const section=element('section'),body=element('div');
      section.dataset.retentionActivation='';
      const inspect=button(localized('إدارة نفاذ مدد الاحتفاظ','Manage retention effective date'),async()=>{
        if(inspect.disabled)return;
        inspect.disabled=true;
        try {
          const data=await api('',undefined,'/privacy/retention-activation');
          if(active!==dialog || revision!==version || !section.isConnected)return;
          body.replaceChildren();
          if(!data.canActivate)return;
          body.append(element('p',localized('تبدأ مدد الاحتفاظ عند اكتمال العمل التقني وتثبيت قرار النفاذ المعتمد. يبقى الحذف مرتبطًا بقرار كل سجل وموانع الاحتفاظ الخاصة به.',
            'Retention periods become effective after technical completion and an approved effective-date decision. Erasure still requires each record’s disposition and retention checks.')));
          if(data.effectiveFrom) {
            const date=new Date(data.effectiveFrom).toLocaleString(document.documentElement.lang||'ar');
            body.append(element('p',localized('تاريخ النفاذ المعتمد: ','Approved effective date: ')+date));
          } else {
            const sources=Array.isArray(data.sources)?data.sources:[];
            if(sources.length) {
              const choices=select(sources.map((item,index)=>({...item,key:String(index)})),'key',item=>item.label);
              const confirm=element('input');confirm.type='checkbox';confirm.required=true;
              body.append(form([
                label(localized('قرار نفاذ مدد الاحتفاظ','Retention effective-date decision'),choices),
                label(localized('أؤكد اكتمال العمل التقني ومطابقة قرار النفاذ المختار.','I confirm technical completion and the selected effective-date decision.'),confirm)
              ],localized('تثبيت قرار النفاذ','Record effective-date decision'),async()=>{
                const selected=choices.value===''?null:sources[Number(choices.value)];
                if(!selected || !confirm.checked)throw Error(localized('اختر القرار وأكد مراجعتك.','Select the decision and confirm your review.'));
                await api('',{source:selected.source},'/privacy/retention-activation');
              }));
            } else body.append(element('p',localized('لا يوجد قرار نفاذ معتمد متاح. جهّز مستنده وأكمل مراجعته المستقلة في المستندات.',
              'There is no approved effective-date decision available. Prepare its document and complete its independent review in Documents.')));
          }
          if(!data.templatesReady)body.append(form([],localized('تجهيز نماذج الاحتفاظ والتصرف','Prepare retention and disposition templates'),
            ()=>api('',{confirmed:true},'/privacy/retention-templates')));
          const dispositions=(Array.isArray(data.dispositionSources)?data.dispositionSources:[]).filter(item=>!item.authorized);
          if(dispositions.length) {
            const choices=select(dispositions.map((item,index)=>({...item,key:String(index)})),'key',item=>item.label);
            const confirm=element('input');confirm.type='checkbox';confirm.required=true;
            body.append(element('h3',localized('اعتماد ربط قرار التصرف','Authorize a disposition')),
              element('p',localized('ربط القرار يتيح مراجعته مع الطلب المطابق. تنفيذ الحذف خطوة مستقلة تخضع لموانع الاحتفاظ والتجميد.',
                'Binding a decision makes it available for its matching request. Erasure is a separate action subject to retention restrictions and holds.')),
              form([
                label(localized('قرار التصرف بعد المراجعة المستقلة','Independently reviewed disposition'),choices),
                label(localized('أؤكد ربط القرار المعتمد بالسجل المحدد بعد المراجعة المستقلة.','I confirm binding the independently reviewed decision to its specified record.'),confirm)
              ],localized('ربط قرار التصرف','Bind disposition decision'),async()=>{
                const selected=choices.value===''?null:dispositions[Number(choices.value)];
                if(!selected || !confirm.checked)throw Error(localized('اختر القرار وأكد مراجعتك.','Select the decision and confirm your review.'));
                await api('',{source:selected.source},'/privacy/retention-dispositions');
              }));
          }
        } catch(error) {if(active===dialog && revision===version)status.textContent=error.message;}
        finally {if(inspect.isConnected)inspect.disabled=false;}
      });
      section.append(inspect,body);content.append(section);
    }
    function erasureControls(section,row,version) {
      const box=element('div'), body=element('div');
      box.dataset.erasureControls='';
      const inspect=button(localized('قرارات الحذف والتجميد','Erasure decisions and holds'),async()=>{
        if(inspect.disabled)return;
        inspect.disabled=true;
        try {
          const data=await api('/'+encodeURIComponent(row.id)+'/erasure-options');
          if(active!==dialog || revision!==version || !box.isConnected)return;
          body.replaceChildren();
          const canRecordHold=row.canCenter || row.canDepartment;
          body.append(element('p',localized('يرتبط التنفيذ بالسجل المحدد وقرار التصرف المعتمد. يُمنع عند وجود تجميد أو التزام احتفاظ قائم.',
            'Execution is bound to the selected record and its approved disposition. Active holds and retention obligations prevent erasure.')));
          const sources=Array.isArray(data.sources)?data.sources:[], holds=Array.isArray(data.holds)?data.holds:[];
          if(!canRecordHold)body.append(element('p',localized('الطلب مغلق. يمكن رفع التجميد بعد تأكيد مراجعين مخولين.',
            'This request is closed. Holds may be released after two authorized reviewers confirm.')));
          else if(!data.enabled)body.append(element('p',localized('تنفيذ الحذف غير مفعّل. يمكن مراجعة الطلب وتسجيل التجميد.',
            'Erasure is not enabled. You can review the request and record a hold.')));
          if(canRecordHold && !sources.length)body.append(element('p',localized('لا يوجد قرار تصرف معتمد مطابق لهذا الطلب. أكمل مراجعة المستند قبل التنفيذ.',
            'There is no matching approved disposition for this request. Complete the document review before execution.')));
          if(canRecordHold && data.enabled && sources.length) {
            const choices=select(sources.map((item,index)=>({...item,key:String(index)})),'key',item=>item.label);
            const confirm=element('input');confirm.type='checkbox';confirm.required=true;
            let operationId=crypto.randomUUID();
            choices.addEventListener('change',()=>{operationId=crypto.randomUUID();confirm.checked=false;});
            body.append(form([
              label(localized('قرار التصرف المعتمد','Approved disposition'),choices),
              label(localized('أؤكد تنفيذ الحذف المحدد في القرار بعد مراجعة موانع الاحتفاظ.','I confirm the erasure specified by this decision after reviewing retention restrictions.'),confirm)
            ],localized('تنفيذ الحذف المعتمد','Execute approved erasure'),async()=>{
              const selected=choices.value===''?null:sources[Number(choices.value)];
              if(!selected || !confirm.checked)throw Error(localized('اختر القرار وأكد مراجعتك.','Select the decision and confirm your review.'));
              const result=await api('/'+encodeURIComponent(row.id)+'/erasure',{operationId,source:selected.source});
              if(result.executed!==true || result.externalReceiptSaved!==true)throw Error(localized('لم يكتمل إثبات التنفيذ. حدّث الطلب قبل تسجيل النتيجة.','Execution evidence is incomplete. Refresh the request before recording its outcome.'));
            }));
          }
          if(canRecordHold) {
            const reason=textarea();reason.minLength=5;reason.maxLength=1000;
            const domain=element('input');domain.type='checkbox';
            body.append(form([
              label(localized('سبب تجميد الحذف','Reason for the erasure hold'),reason),
              label(localized('يشمل جميع سجلات العضو في نطاق هذا الطلب','Apply to all of this member’s records in this request domain'),domain)
            ],localized('تسجيل تجميد','Record hold'),()=>api('/'+encodeURIComponent(row.id)+'/retention-holds',{reason:reason.value,entireDomain:domain.checked})));
          }
          for(const hold of holds) {
            const item=element('div');
            item.append(element('p',hold.reason));
            if(hold.releasePending && !hold.canConfirmRelease) {
              item.append(element('p',localized('طلب رفع التجميد ينتظر تأكيد مراجع آخر.','The release request is awaiting another reviewer’s confirmation.')));
            } else {
              const releaseReason=textarea();releaseReason.minLength=5;releaseReason.maxLength=1000;
              item.append(form([label(localized('سبب رفع التجميد','Reason for releasing the hold'),releaseReason)],
                hold.releasePending?localized('تأكيد رفع التجميد','Confirm hold release'):localized('طلب رفع التجميد','Request hold release'),
                ()=>api('/'+encodeURIComponent(row.id)+'/retention-holds/'+encodeURIComponent(hold.id)+'/release',{reason:releaseReason.value})));
            }
            body.append(item);
          }
        } catch(error) {if(active===dialog && revision===version)status.textContent=error.message;}
        finally {if(inspect.isConnected)inspect.disabled=false;}
      });
      box.append(inspect,body);section.append(box);
    }
    async function load(message='') {
      const version=++revision;
      status.textContent=localized('جارٍ التحميل…','Loading…');
      try {
        const data=await api('?page='+page);
        if(active!==dialog || revision!==version) return;
        content.replaceChildren();
        if(data.canActivateRetention===true)retentionControls(version);
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
          if(row.requestKind==='ERASURE' && ((!row.hasExecutionProof && (row.canCenter || row.canDepartment)) || row.canManageHolds===true))
            erasureControls(section,row,version);
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
