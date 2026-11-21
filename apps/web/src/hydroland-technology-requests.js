(() => {
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("technology-requests", {
  "تطبيق التغيير المعتمد وتسجيل إيصال التنفيذ": "Apply the approved change and record its receipt",
  "تنفيذ الرجوع المعتمد وتسجيل إيصال الرجوع": "Apply the approved rollback and record its receipt",
  "تفعيل الضابط": "Enable control",
  "إيقاف الضابط": "Disable control",
  "الضابط غير متاح للتغيير": "Control is unavailable for changes",
  "{0} · {1}": "{0} · {1}",
  "{0} · الإصدار المطلوب تغييره {1}": "{0} · Baseline revision {1}",
  "إيصال تنفيذ الضابط {0}": "Control execution receipt {0}",
  "إيصال رجوع الضابط {0}": "Control rollback receipt {0}",
  "طلب وصول": "Access request",
  "طلب تغيير": "Change request",
  "حادث تقني": "Technical incident",
  "خطر تقني": "Technical risk",
  "مسودة": "Draft",
  "بانتظار الاعتماد": "Awaiting approval",
  "معتمد": "Approved",
  "قيد التنفيذ": "In progress",
  "بانتظار اختبار مستقل": "Awaiting independent test",
  "الاختبار غير ناجح": "Test unsuccessful",
  "تم التحقق": "Verified",
  "خطر مقبول بقرار صاحبه": "Risk accepted by its owner",
  "الرجوع مطلوب": "Rollback required",
  "بانتظار اختبار الرجوع": "Awaiting rollback test",
  "مقفل": "Closed",
  "مرفوض": "Rejected",
  "سُحب التكليف": "Assignment revoked",
  "إرسال للاعتماد": "Submit for approval",
  "اعتماد نطاق الطلب": "Approve request scope",
  "رفض الطلب": "Reject request",
  "بدء التكليف": "Start assignment",
  "تسجيل نتيجة التنفيذ": "Record execution outcome",
  "تثبيت نجاح الاختبار المستقل": "Record successful independent test",
  "تسجيل عدم نجاح الاختبار": "Record an unsuccessful test",
  "قبول الخطر وتحديد مراجعته": "Accept risk and set review date",
  "اعتماد الرجوع": "Approve rollback",
  "تسجيل نتيجة الرجوع": "Record rollback outcome",
  "إقفال الطلب": "Close request",
  "سحب التكليف": "Revoke assignment",
  "صلاحية طلبات التقنية غير متاحة أو انتهى التكليف.": "Technical-request authority is unavailable or the assignment expired.",
  "تعذر إكمال إجراء الطلب.": "Could not complete the request action.",
  "تعذر إكمال الإجراء.": "Could not complete the action.",
  "اختر المرجع": "Select reference",
  "تعذر تأكيد قائمة المراجع.": "Could not confirm reference list.",
  "مراجع أخرى": "More references",
  "طلب": "Request",
  "تعذر تأكيد إصدار الطلب.": "Could not confirm request version.",
  "· الإصدار": "· Version",
  "النطاق:": "Scope:",
  "مرجع الطلب:": "Request reference:",
  "انتهاء التكليف:": "Assignment expires:",
  "خطة التنفيذ": "Execution plan",
  "خطة الاختبار": "Test plan",
  "خطة الرجوع": "Rollback plan",
  "مراجعة الخطر:": "Risk review:",
  "سجل الطلب": "Request history",
  "إنشاء الطلب": "Create request",
  "يُعرض أحدث 50 إجراءً؛ الإجراءات الأقدم محفوظة.": "Showing the latest 50 actions. Earlier actions are retained.",
  "اختر محضرًا معتمدًا": "Select an approved record",
  "اختر أثر التنفيذ": "Select execution evidence",
  "تعذر تأكيد قائمة الطلبات.": "Could not confirm request list.",
  "طلبات التقنية والأمن": "Technology and security requests",
  "إغلاق": "Close",
  "اعتمد نطاق الطلب أولًا، ونفذ الإجراء من مساره المختص، ثم اربط محضر النتيجة والاختبار المستقل قبل الإقفال.": "Approve request scope first, perform the action through its workflow, then link the outcome record and independent test before closure.",
  "تحديث الطلبات": "Refresh requests",
  "طلب جديد": "New request",
  "نوع الطلب": "Request type",
  "مستند الطلب في إدارة التقنية": "Request document in the technology department",
  "الموظف المكلف بالتنفيذ": "Employee assigned to execution",
  "عنوان الطلب": "Request title",
  "انتهاء تكليف التنفيذ": "Execution assignment expiry",
  "حفظ مسودة الطلب": "Save request draft",
  "اختر مستند طلب يطابق نطاق الحالة.": "Select a request document matching the case scope.",
  "حُفظت المسودة؛ يلزم إرسالها ثم اعتماد النطاق قبل بدء التنفيذ.": "Draft saved. Submit it and obtain scope approval before execution starts.",
  "قائمة طلبات التقنية": "Technical request list",
  "طلبات أخرى": "More requests",
  "إجراء على الإصدار الحالي": "Action on current version",
  "الإجراء": "Action",
  "محضر الإثبات المعتمد": "Approved evidence record",
  "أثر التنفيذ في مسار الوصول": "Execution evidence from the access workflow",
  "موعد مراجعة الخطر": "Risk review date",
  "سبب الإجراء ونتيجته": "Action reason and outcome",
  "راجعت النطاق والإثبات ونتيجة هذا الإجراء": "I have reviewed the scope, evidence and outcome of this action",
  "حفظ الإجراء": "Save action",
  "حُفظ الإجراء وإصداره في سجل الطلب.": "Action and version saved in request history.",
  "{0} · {1} · {2}": "{0} · {1} · {2}",
  "{0} · الإصدار {1}": "{0} · Version {1}",
  "النطاق: {0}": "Scope: {0}",
  "مرجع الطلب: {0}": "Request reference: {0}",
  "انتهاء التكليف: {0}": "Assignment expires: {0}",
  "{0}: {1}": "{0}: {1}",
  "مراجعة الخطر: {0}": "Risk review: {0}",
  "{0} · الإصدار {1} · {2}": "{0} · Version {1} · {2}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  const kinds={ACCESS:'طلب وصول',CHANGE:'طلب تغيير',INCIDENT:'حادث تقني',RISK:'خطر تقني'};
  const states={DRAFT:'مسودة',SUBMITTED:'بانتظار الاعتماد',APPROVED:'معتمد',IN_PROGRESS:'قيد التنفيذ',EXECUTED:'بانتظار اختبار مستقل',TEST_FAILED:'الاختبار غير ناجح',VERIFIED:'تم التحقق',RISK_ACCEPTED:'خطر مقبول بقرار صاحبه',ROLLBACK_REQUIRED:'الرجوع مطلوب',ROLLED_BACK:'بانتظار اختبار الرجوع',CLOSED:'مقفل',REJECTED:'مرفوض',REVOKED:'سُحب التكليف'};
  const actions={SUBMIT:'إرسال للاعتماد',APPROVE:'اعتماد نطاق الطلب',REJECT:'رفض الطلب',START:'بدء التكليف',RECORD_EXECUTION:'تسجيل نتيجة التنفيذ',PASS_TEST:'تثبيت نجاح الاختبار المستقل',FAIL_TEST:'تسجيل عدم نجاح الاختبار',ACCEPT_RISK:'قبول الخطر وتحديد مراجعته',REQUEST_ROLLBACK:'اعتماد الرجوع',RECORD_ROLLBACK:'تسجيل نتيجة الرجوع',CLOSE:'إقفال الطلب',REVOKE:'سحب التكليف'};
  const proofActions=new Set(['RECORD_EXECUTION','PASS_TEST','RECORD_ROLLBACK','ACCEPT_RISK']);
  let dialog,body,epoch=0,busy=false,current=null,role=null,nextCursor=null,requestId=null,requestContent=null;
  const auth=()=>window.HydrolandAuth;
  const localDate=date=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)uiLocale.setMessage(n, text);return n;};
  const valid=(v,s)=>v===epoch&&s===auth()?.getSessionVersion?.()&&dialog?.open&&auth()?.isAuthenticated?.();
  const el=name=>body.querySelector('[data-tr-'+name+']');
  const feedback=message=>{uiLocale.setMessage(el('feedback'), message);};
  function clear(){epoch++;busy=false;current=role=nextCursor=requestId=requestContent=null;if(dialog){dialog.close();body.replaceChildren();}}
  async function api(path,options={},v=epoch,s=auth()?.getSessionVersion?.()){
    const response=await auth().authorizedFetch('/technology/requests'+path,options),data=await response.json().catch(()=>null);
    if([401,403].includes(response.status)){if(v===epoch)clear();throw localError(uiLocale.message('صلاحية طلبات التقنية غير متاحة أو انتهى التكليف.'));}
    if(!response.ok)throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر إكمال إجراء الطلب.')));return valid(v,s)?data:null;
  }
  function lock(){body?.querySelectorAll('fieldset,button').forEach(x=>x.disabled=busy);}
  async function operation(work){if(busy||!dialog?.open||!auth()?.isAuthenticated?.())return;const v=++epoch,s=auth().getSessionVersion?.();busy=true;lock();try{await work(v,s);}catch(e){if(valid(v,s))feedback((localErrorMessage(e) || uiLocale.message('تعذر إكمال الإجراء.')));}finally{if(v===epoch){busy=false;lock();}}}
  function options(select,items,append=false){if(!append)select.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر المرجع'));return option;})(new Option('', '')));for(const item of items){const option=(option=>{uiLocale.setMessage(option, Object.hasOwn(item,'controlChange') ?
      uiLocale.message("{0} · {1}", [item.label, item.controlChange?controlAction(item.controlChange):uiLocale.message('الضابط غير متاح للتغيير')]) : item.label);
      if(item.controlChange===null)option.disabled=true;return option;})(new Option('', item.id));option.__reference=item;select.appendChild(option);}}
  const chosen=select=>select.selectedOptions[0]?.__reference;
  const controlAction=change=>uiLocale.message(change.state==='ENABLED'?'تفعيل الضابط':'إيقاف الضابط');

  async function references(type,select,{kind,caseId,append=false}={}){
    const v=epoch,s=auth()?.getSessionVersion?.(),cursor=append?select.dataset.cursor:null;
    const query=new URLSearchParams({type,...(kind?{kind}:{}),...(caseId?{caseId}:{}),...(cursor?{cursor}:{})});
    const data=await api('/references?'+query,{},v,s);if(!data)return;
    if(!Array.isArray(data.items)||data.items.length>50||data.items.some(x=>typeof x.id!=='string'||typeof x.label!=='string'))throw localError(uiLocale.message('تعذر تأكيد قائمة المراجع.'));
    options(select,data.items,append);select.dataset.cursor=data.nextCursor||'';const more=select.parentElement.querySelector('[data-more]');if(more)more.hidden=!data.nextCursor;
  }
  function optionField(form,label,name){const l=node('label', label),select=node('select');select.name=name;select.required=true;l.appendChild(select);const more=node('button', uiLocale.message('مراجع أخرى'));more.type='button';more.dataset.more='';more.hidden=true;l.appendChild(more);form.appendChild(l);return select;}
  function field(form,label,name,{type='text',max=2000,required=true}={}){const l=node('label', label),input=node(type==='textarea'?'textarea':'input');input.name=name;if(type!=='textarea')input.type=type;input.required=required;if(type==='text'||type==='textarea')input.maxLength=max;l.appendChild(input);form.appendChild(l);return input;}
  async function loadCreate(){const form=el('create');await references('request',form.elements.document,{kind:form.elements.kind.value});await references('assignee',form.elements.assignee);}
  function rowButton(row){let b=[...el('list').querySelectorAll('[data-case-id]')].find(x=>x.dataset.caseId===row.id);if(!b){b=node('button');b.type='button';b.dataset.caseId=row.id;el('list').appendChild(b);}uiLocale.setMessage(b, uiLocale.message("{0} · {1} · {2}", [((value=>value===undefined?value:uiLocale.message(value))(kinds[row.kind]) || uiLocale.message('طلب')), row.title, ((value=>value===undefined?value:uiLocale.message(value))(states[row.state]) || row.state)]));}
  async function selected(detail){
    if(detail.schemaVersion!==1||detail.policy!=='TECHNOLOGY_REQUEST_V1'||!detail.record||!Object.hasOwn(states,detail.record.state)||!Array.isArray(detail.actions)||detail.actions.some(a=>!Object.hasOwn(actions,a))||!Array.isArray(detail.history))throw localError(uiLocale.message('تعذر تأكيد إصدار الطلب.'));
    current=detail.record;role=detail.role;rowButton(current);const summary=el('summary');summary.replaceChildren(node('h3', current.title),node('p', uiLocale.message("{0} · الإصدار {1}", [(value=>value===undefined?value:uiLocale.message(value))(states[current.state]), current.revision])),node('p', uiLocale.message("النطاق: {0}", [current.scopeReference])),node('p', uiLocale.message("مرجع الطلب: {0}", [current.requestProof.reference])),node('p', uiLocale.message("انتهاء التكليف: {0}", [new Date(current.expiresAt).toLocaleString('ar-SA')])));
    if(current.controlChange){
      summary.appendChild(node('p',uiLocale.message("{0} · الإصدار المطلوب تغييره {1}",[controlAction(current.controlChange),current.controlChange.expectedRevision])));
      if(current.executionAuditId)summary.appendChild(node('p',uiLocale.message("إيصال تنفيذ الضابط {0}",[current.executionAuditId])));
      if(current.rollbackAuditId)summary.appendChild(node('p',uiLocale.message("إيصال رجوع الضابط {0}",[current.rollbackAuditId])));
    }
    for(const [label,key] of [['خطة التنفيذ','executionPlan'],['خطة الاختبار','testPlan'],['خطة الرجوع','rollbackPlan']])summary.appendChild(node('p', uiLocale.message("{0}: {1}", [uiLocale.message(label), current[key]])));
    if(current.riskReviewAt)summary.appendChild(node('p', uiLocale.message("مراجعة الخطر: {0}", [new Date(current.riskReviewAt).toLocaleString('ar-SA')])));
    const form=el('action');form.reset();form.hidden=!detail.actions.length;options(form.elements.action,detail.actions.filter(a=>a!=='ACCEPT_RISK'||current.kind==='RISK').map(id=>({id,label:current.controlChange&&id==='RECORD_EXECUTION'?uiLocale.message('تطبيق التغيير المعتمد وتسجيل إيصال التنفيذ'):
      current.controlChange&&id==='RECORD_ROLLBACK'?uiLocale.message('تنفيذ الرجوع المعتمد وتسجيل إيصال الرجوع'):uiLocale.message(actions[id])})));
    el('history').replaceChildren(node('h4', uiLocale.message('سجل الطلب')));for(const h of detail.history)el('history').appendChild(node('p', uiLocale.message("{0} · الإصدار {1} · {2}", [((value=>value===undefined?value:uiLocale.message(value))(actions[h.action]) || uiLocale.message('إنشاء الطلب')), h.revision, h.reason])));
    if(detail.historyTruncated)el('history').appendChild(node('p', uiLocale.message('يُعرض أحدث 50 إجراءً؛ الإجراءات الأقدم محفوظة.')));await actionFields();
  }
  async function actionFields(){
    if(!current)return;const form=el('action'),a=form.elements.action.value,needs=proofActions.has(a);form.elements.proof.parentElement.hidden=!needs;form.elements.proof.required=needs;form.elements.audit.parentElement.hidden=!(needs&&current.kind==='ACCESS'&&['RECORD_EXECUTION','RECORD_ROLLBACK'].includes(a));form.elements.audit.required=!form.elements.audit.parentElement.hidden;
    form.elements.riskReviewAt.parentElement.hidden=a!=='ACCEPT_RISK';form.elements.riskReviewAt.required=a==='ACCEPT_RISK';form.elements.confirmed.checked=false;form.elements.proof.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر محضرًا معتمدًا'));return option;})(new Option('', '')));form.elements.audit.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر أثر التنفيذ'));return option;})(new Option('', '')));
    if(needs){await references('proof',form.elements.proof,{caseId:current.id});if(form.elements.audit.required)await references('audit',form.elements.audit,{caseId:current.id});}
  }
  async function load(append=false){const data=await api(append?'?cursor='+encodeURIComponent(nextCursor):'');if(!data)return;if(data.schemaVersion!==1||data.policy!=='TECHNOLOGY_REQUEST_V1'||!Array.isArray(data.items)||data.items.length>50)throw localError(uiLocale.message('تعذر تأكيد قائمة الطلبات.'));role=data.role;if(!append)el('list').replaceChildren();for(const row of data.items)rowButton(row);nextCursor=data.nextCursor;el('older').hidden=!nextCursor;el('create').hidden=role!=='OWNER';if(role==='OWNER'&&!append)await loadCreate();}
  function mount(){
    if(dialog)return;const style=node('style');uiLocale.setMessage(style, '#hl-technology-requests{box-sizing:border-box;width:min(860px,calc(100vw - 24px));max-height:88vh;background:#071f31;color:#edf7fb;border:1px solid #31546b;border-radius:18px;padding:20px}#hl-technology-requests::backdrop{background:#00121ac9}#hl-technology-requests [data-tr-body],#hl-technology-requests form,#hl-technology-requests fieldset{display:grid;gap:12px;min-width:0}#hl-technology-requests label{display:grid;gap:5px}#hl-technology-requests input,#hl-technology-requests select,#hl-technology-requests textarea{box-sizing:border-box;width:100%;max-width:100%;background:#102d41;color:#fff;border:1px solid #51748a;border-radius:8px;padding:9px}#hl-technology-requests input[type=checkbox]{width:auto;justify-self:start}#hl-technology-requests button{padding:9px 14px;border:1px solid #6e8796;border-radius:8px;background:#163b51;color:#fff;cursor:pointer}#hl-technology-requests button:disabled{opacity:.55;cursor:wait}#hl-technology-requests [data-tr-list]{display:grid;gap:8px}#hl-technology-requests p{overflow-wrap:anywhere}#hl-technology-requests [hidden]{display:none!important}');document.head.appendChild(style);
    dialog=node('dialog');dialog.id='hl-technology-requests';dialog.setAttribute('aria-labelledby','hl-technology-title');const title=node('h2', uiLocale.message('طلبات التقنية والأمن'));title.id='hl-technology-title';const close=node('button', uiLocale.message('إغلاق'));close.type='button';close.addEventListener('click',clear);body=node('div');body.dataset.trBody='';dialog.append(title,close,body);document.body.appendChild(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});
  }
  function shell(){
    body.replaceChildren();const f=node('p');f.dataset.trFeedback='';f.setAttribute('role','status');body.appendChild(f,node('p', uiLocale.message('اعتمد نطاق الطلب أولًا، ونفذ الإجراء من مساره المختص، ثم اربط محضر النتيجة والاختبار المستقل قبل الإقفال.')));
    const refresh=node('button', uiLocale.message('تحديث الطلبات'));refresh.type='button';refresh.addEventListener('click',()=>operation(()=>load()));body.appendChild(refresh);
    const form=node('form');form.dataset.trCreate='';form.hidden=true;const fields=node('fieldset');fields.appendChild(node('legend', uiLocale.message('طلب جديد')));form.appendChild(fields);
    const kind=optionField(fields, uiLocale.message('نوع الطلب'), 'kind');options(kind,Object.keys(kinds).map(id=>({id,label:uiLocale.message(kinds[id])})));kind.value='CHANGE';const document=optionField(fields, uiLocale.message('مستند الطلب في إدارة التقنية'), 'document'),assignee=optionField(fields, uiLocale.message('الموظف المكلف بالتنفيذ'), 'assignee');
    field(fields, uiLocale.message('عنوان الطلب'), 'title', {max:160});field(fields, uiLocale.message('خطة التنفيذ'), 'executionPlan', {type:'textarea'});field(fields, uiLocale.message('خطة الاختبار'), 'testPlan', {type:'textarea'});field(fields, uiLocale.message('خطة الرجوع'), 'rollbackPlan', {type:'textarea'});const expiry=field(fields, uiLocale.message('انتهاء تكليف التنفيذ'), 'expiresAt', {type:'datetime-local'});expiry.value=localDate(new Date(Date.now()+86400000));const submit=node('button', uiLocale.message('حفظ مسودة الطلب'));submit.type='submit';fields.appendChild(submit);body.appendChild(form);
    kind.addEventListener('change',()=>operation(()=>loadCreate()));document.parentElement.querySelector('[data-more]').addEventListener('click',()=>operation(()=>references('request',document,{kind:kind.value,append:true})));assignee.parentElement.querySelector('[data-more]').addEventListener('click',()=>operation(()=>references('assignee',assignee,{append:true})));
    form.addEventListener('submit',event=>{event.preventDefault();void operation(async(v,s)=>{const source=chosen(document);if(!source||typeof source.scopeReference!=='string')throw localError(uiLocale.message('اختر مستند طلب يطابق نطاق الحالة.'));const content={kind:kind.value,title:form.elements.title.value.trim(),scopeReference:source.scopeReference,executionPlan:form.elements.executionPlan.value.trim(),testPlan:form.elements.testPlan.value.trim(),rollbackPlan:form.elements.rollbackPlan.value.trim(),assigneeAccountId:assignee.value,expiresAt:new Date(expiry.value).toISOString(),requestDocumentId:source.id,requestDocumentVersion:source.version,requestDocumentHash:source.contentHash,...(source.controlChange?{controlChange:{state:source.controlChange.state,expectedRevision:source.controlChange.expectedRevision}}:{}),...(kind.value==='ACCESS'?{targetAccountId:source.targetAccountId,accessAction:source.accessAction}:{})};const signature=JSON.stringify(content);if(signature!==requestContent){requestId=crypto.randomUUID();requestContent=signature;}const result=await api('',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...content,requestKey:requestId})},v,s);if(result){await selected(result);feedback(uiLocale.message('حُفظت المسودة؛ يلزم إرسالها ثم اعتماد النطاق قبل بدء التنفيذ.'));}});});
    const list=node('section');list.dataset.trList='';uiLocale.setAttribute(list, "aria-label", 'قائمة طلبات التقنية');body.appendChild(list);list.addEventListener('click',event=>{const b=event.target.closest('[data-case-id]');if(b)void operation(async(v,s)=>{const d=await api('/'+encodeURIComponent(b.dataset.caseId),{},v,s);if(d)await selected(d);});});const older=node('button', uiLocale.message('طلبات أخرى'));older.type='button';older.dataset.trOlder='';older.hidden=true;older.addEventListener('click',()=>operation(()=>load(true)));body.appendChild(older);const summary=node('section');summary.dataset.trSummary='';body.appendChild(summary);
    const action=node('form');action.dataset.trAction='';action.hidden=true;const af=node('fieldset');af.appendChild(node('legend', uiLocale.message('إجراء على الإصدار الحالي')));action.appendChild(af);const actionSelect=optionField(af, uiLocale.message('الإجراء'), 'action');optionField(af, uiLocale.message('محضر الإثبات المعتمد'), 'proof');optionField(af, uiLocale.message('أثر التنفيذ في مسار الوصول'), 'audit');field(af, uiLocale.message('موعد مراجعة الخطر'), 'riskReviewAt', {type:'datetime-local',required:false});field(af, uiLocale.message('سبب الإجراء ونتيجته'), 'reason', {type:'textarea',max:1000});field(af, uiLocale.message('راجعت النطاق والإثبات ونتيجة هذا الإجراء'), 'confirmed', {type:'checkbox'});const apply=node('button', uiLocale.message('حفظ الإجراء'));apply.type='submit';af.appendChild(apply);body.appendChild(action);actionSelect.addEventListener('change',()=>operation(()=>actionFields()));
    action.elements.proof.parentElement.querySelector('[data-more]').addEventListener('click',()=>operation(()=>references('proof',action.elements.proof,{caseId:current.id,append:true})));action.elements.audit.parentElement.querySelector('[data-more]').addEventListener('click',()=>operation(()=>references('audit',action.elements.audit,{caseId:current.id,append:true})));
    action.addEventListener('submit',event=>{event.preventDefault();if(!current)return;const record=current,choice=actionSelect.value,proof=chosen(action.elements.proof),audit=chosen(action.elements.audit),risk=action.elements.riskReviewAt.value,payload={expectedRevision:record.revision,reason:action.elements.reason.value.trim(),confirmed:action.elements.confirmed.checked,...(proofActions.has(choice)?{proofDocumentId:proof?.id,proofDocumentVersion:proof?.version,proofDocumentHash:proof?.contentHash,...(audit?{executionAuditId:audit.id}:{})}:{}),...(choice==='ACCEPT_RISK'?{riskReviewAt:new Date(risk).toISOString()}:{})};void operation(async(v,s)=>{const d=await api('/'+encodeURIComponent(record.id)+'/actions/'+encodeURIComponent(choice),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)},v,s);if(d){await selected(d);feedback(uiLocale.message('حُفظ الإجراء وإصداره في سجل الطلب.'));}});});const history=node('section');history.dataset.trHistory='';body.appendChild(history);
  }
  async function open(){if(!auth()?.isAuthenticated?.())return;mount();clear();shell();dialog.showModal();await operation(()=>load());}
  function bind(){const list=document.querySelector('.profile-list');if(!list)return;const roles=window.HydrolandProfileData?.profile?.roles||[],allowed=Boolean(auth()?.isAuthenticated?.()&&roles.some(r=>r?.status==='ACTIVE'&&['ADMIN','STAFF'].includes(r.role)));const existing=list.querySelector('[data-technology-requests]');if(existing){existing.hidden=!allowed;return;}const button=node('button', uiLocale.message('طلبات التقنية والأمن'));button.hidden=!allowed;button.type='button';button.dataset.technologyRequests='';button.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open();});list.appendChild(button);}
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(name,()=>{clear();bind();});document.addEventListener('hydroland:profile-data-ready',bind);document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.())clear();bind();});new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});bind();window.HydrolandTechnologyRequests={open,clear};
})();
