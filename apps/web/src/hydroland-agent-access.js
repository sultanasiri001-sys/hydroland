(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("agent-access", {
  "بانتظار موافقتك": "Awaiting your approval",
  "نُفذ آليًا؛ بانتظار التحقق": "Executed automatically; awaiting verification",
  "تم التحقق": "Verified",
  "اختبار غير ناجح": "Test unsuccessful",
  "تم الرجوع؛ بانتظار التحقق": "Rolled back; awaiting verification",
  "خطر مقبول؛ مراجعة مجدولة": "Risk accepted; review scheduled",
  "مقفل": "Closed",
  "ملغى": "Cancelled",
  "تعذر إكمال الإجراء.": "Could not complete the action.",
  "اختر": "Select",
  "تعذر قراءة المراجع.": "Could not read references.",
  "راجع توصية وكيل الأمن السيبراني وحدد العملية المقيدة. لا ينفذ النظام إلا بعد اعتمادك الصريح. التغيير المتاح هنا هو إيقاف وكيل الأمن السيبراني؛ تنتهي مهامه النشطة ويظل الطابور محفوظًا.": "Review the cybersecurity agent's recommendation and select the restricted operation. Execution requires your explicit approval. The available change here is to stop the cybersecurity agent; active tasks end and the queue is retained.",
  "توصية أمنية جديدة": "New security recommendation",
  "نوع العملية": "Operation type",
  "تعليق حساب المنصة أو إعادة تفعيله": "Suspend or reactivate a platform account",
  "إيقاف وكيل الأمن ضمن طلب تغيير": "Stop the security agent through a change request",
  "احتواء حادث عالٍ أو حرج يمس وكيل الأمن": "Contain a high or critical incident affecting the security agent",
  "قبول خطر تقني مع تحديد موعد مراجعته": "Accept a technical risk with a review date",
  "مستند الطلب": "Request document",
  "موعد مراجعة الخطر": "Risk review date",
  "توصية وكيل الأمن السيبراني المكتملة": "Completed cybersecurity-agent recommendation",
  "سبب المراجعة": "Review reason",
  "تنتهي الموافقة خلال": "Approval expires in",
  "مراجعة التوصية": "Review recommendation",
  "الوكيل:": "Agent:",
  "مرجع الخطر:": "Risk reference:",
  "الحساب:": "Account:",
  "احتواء الحادث بإيقاف الوكيل وحفظ المهام في الطابور": "Contain the incident by stopping the agent and retaining queued tasks",
  "إيقاف الوكيل مع حفظ المهام الموجودة في الطابور": "Stop the agent and retain queued tasks",
  "قبول موثق من المالك حتى المراجعة الدورية": "Documented owner acceptance until periodic review",
  "الإجراء المحدد:": "Specified action:",
  "تعليق الحساب وإبطال جلساته": "Suspend the account and revoke its sessions",
  "إعادة تفعيل الحساب مع طلب دخول جديد": "Reactivate the account and require a new sign-in",
  "موعد مراجعة الخطر:": "Risk review date:",
  "تنتهي الموافقة:": "Approval expires:",
  "تسجيل نجاح التحقق المستقل": "Record successful independent verification",
  "أوافق على الإجراء المحدد ونفّذه الآن": "I approve the specified action; execute it now",
  "تسجيل عدم نجاح الاختبار": "Record an unsuccessful test",
  "أوافق على الرجوع للحالة السابقة": "I approve restoring the previous state",
  "إقفال الطلب المتحقق": "Close verified request",
  "إلغاء الطلب": "Cancel request",
  "الإجراء": "Action",
  "محضر التحقق المعتمد": "Approved verification record",
  "سبب القرار ونتيجة المراجعة": "Decision reason and review outcome",
  "راجعت النطاق والتوصية والأثر المحدد": "I have reviewed the scope, recommendation and specified impact",
  "تأكيد الإجراء": "Confirm action",
  "تنفيذ توصيات الأمن": "Execute security recommendations",
  "إغلاق": "Close",
  "جارٍ تحميل توصياتك…": "Loading your recommendations…",
  "الوكيل: ": "Agent: ",
  "مرجع الخطر: ": "Risk reference: ",
  "الحساب: ": "Account: ",
  "الإجراء المحدد: ": "Specified action: ",
  "{0} · {1}": "{0} · {1}",
  "موعد مراجعة الخطر: {0}": "Risk review date: {0}",
  "تنتهي الموافقة: {0}": "Approval expires: {0}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


 const auth=()=>window.HydrolandAuth;
 const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)uiLocale.setMessage(e, text);return e;};
 let dialog,body,epoch=0,busy=false,createId,createFingerprint,createExpiry;
 const states={PROPOSED:'بانتظار موافقتك',EXECUTED:'نُفذ آليًا؛ بانتظار التحقق',VERIFIED:'تم التحقق',TEST_FAILED:'اختبار غير ناجح',ROLLED_BACK:'تم الرجوع؛ بانتظار التحقق',RISK_ACCEPTED:'خطر مقبول؛ مراجعة مجدولة',CLOSED:'مقفل',REVOKED:'ملغى'};
 const current=(v,s)=>v===epoch&&s===auth()?.getSessionVersion?.()&&dialog?.open&&auth()?.isAuthenticated?.();
 function clear(){epoch++;busy=false;createId=createFingerprint=createExpiry=null;if(dialog){dialog.close();body.replaceChildren();}}
 async function request(path,options,v,s){const r=await auth().authorizedFetch('/technology/agent-access'+path,options),data=await r.json().catch(()=>null);if([401,403].includes(r.status)){if(v===epoch)clear();return null;}if(!r.ok)throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر إكمال الإجراء.')));return current(v,s)?data:null;}
 const post=(path,value,v,s)=>request(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)},v,s);
 async function operation(fn){if(busy||!dialog?.open)return;const v=++epoch,s=auth()?.getSessionVersion?.();busy=true;body.querySelectorAll('fieldset,button').forEach(e=>e.disabled=true);try{await fn(v,s);}catch(e){if(current(v,s))uiLocale.setMessage(body.querySelector('[role=status]'), localErrorMessage(e));}finally{if(v===epoch){busy=false;body.querySelectorAll('fieldset,button').forEach(e=>e.disabled=false);}}}
 function select(form,label,name,items){const wrap=make('label', label),e=make('select');e.name=name;e.required=true;e.appendChild((option=>{uiLocale.setMessage(option, uiLocale.message('اختر'));return option;})(new Option('', '')));for(const i of items)e.appendChild((option=>{uiLocale.setMessage(option, i.label);return option;})(new Option('', i.id)));wrap.appendChild(e);form.appendChild(wrap);return e;}
 function input(form,label,name,type='text'){const wrap=make('label', label),e=make('input');e.name=name;e.type=type;e.required=true;wrap.appendChild(e);form.appendChild(wrap);return e;}
 async function load(v,s){
  const refs=await request('/references',{},v,s);if(!refs)return;const list=await request('',{},v,s);if(!list)return;
  if(!Array.isArray(refs.documents)||!Array.isArray(refs.changes)||!Array.isArray(refs.incidents)||!Array.isArray(refs.risks)||!Array.isArray(refs.tasks)||!Array.isArray(list.items))throw localError(uiLocale.message('تعذر قراءة المراجع.'));
  body.replaceChildren();const feedback=make('p');feedback.setAttribute('role','status');body.append(feedback,make('p', uiLocale.message('راجع توصية وكيل الأمن السيبراني وحدد العملية المقيدة. لا ينفذ النظام إلا بعد اعتمادك الصريح. التغيير المتاح هنا هو إيقاف وكيل الأمن السيبراني؛ تنتهي مهامه النشطة ويظل الطابور محفوظًا.')));
  const form=make('form'),fields=make('fieldset');fields.appendChild(make('legend', uiLocale.message('توصية أمنية جديدة')));form.appendChild(fields);
  const op=select(fields, uiLocale.message('نوع العملية'), 'operation', [{id:'ACCOUNT_STATUS',label:uiLocale.message('تعليق حساب المنصة أو إعادة تفعيله')},{id:'PAUSE_CYBER_SECURITY',label:uiLocale.message('إيقاف وكيل الأمن ضمن طلب تغيير')},{id:'CONTAIN_CYBER_INCIDENT',label:uiLocale.message('احتواء حادث عالٍ أو حرج يمس وكيل الأمن')},{id:'ACCEPT_SECURITY_RISK',label:uiLocale.message('قبول خطر تقني مع تحديد موعد مراجعته')}]);const doc=select(fields, uiLocale.message('مستند الطلب'), 'document', []);const reviewAt=input(fields, uiLocale.message('موعد مراجعة الخطر'), 'riskReviewAt', 'datetime-local');reviewAt.value=new Date(Date.now()+14*86400000).toISOString().slice(0,16);const refreshDocs=()=>{const items=op.value==='PAUSE_CYBER_SECURITY'?refs.changes:op.value==='CONTAIN_CYBER_INCIDENT'?refs.incidents:op.value==='ACCEPT_SECURITY_RISK'?refs.risks:refs.documents;doc.replaceChildren((option=>{uiLocale.setMessage(option, uiLocale.message('اختر'));return option;})(new Option('', '')));for(const item of items)doc.appendChild((option=>{uiLocale.setMessage(option, item.label);return option;})(new Option('', item.id)));reviewAt.parentElement.hidden=op.value!=='ACCEPT_SECURITY_RISK';reviewAt.required=op.value==='ACCEPT_SECURITY_RISK';};op.addEventListener('change',refreshDocs);refreshDocs();select(fields, uiLocale.message('توصية وكيل الأمن السيبراني المكتملة'), 'task', refs.tasks);const reason=input(fields, uiLocale.message('سبب المراجعة'), 'reason');reason.minLength=3;reason.maxLength=1000;const expiry=input(fields, uiLocale.message('تنتهي الموافقة خلال'), 'hours', 'number');expiry.min='1';expiry.max='168';expiry.value='24';const create=make('button', uiLocale.message('مراجعة التوصية'));create.type='submit';fields.appendChild(create);body.appendChild(form);
  form.addEventListener('submit',event=>{event.preventDefault();void operation(async(v,s)=>{const riskDate=op.value==='ACCEPT_SECURITY_RISK'?new Date(reviewAt.value).toISOString():null,fingerprint=JSON.stringify([op.value,doc.value,form.elements.task.value,reason.value,expiry.value,riskDate]);if(fingerprint!==createFingerprint){createFingerprint=fingerprint;createId=crypto.randomUUID();createExpiry=new Date(Date.now()+Number(expiry.value)*3600000).toISOString();}const result=await post('',{requestId:createId,operation:op.value,documentId:doc.value,taskId:form.elements.task.value,reason:reason.value,expiresAt:createExpiry,...(riskDate?{riskReviewAt:riskDate}:{})},v,s);if(result)await load(v,s);});});
  for(const row of list.items){const card=make('section');card.dataset.agentCase=row.id;const target=row.targetKind==='AGENT_RUNTIME'?uiLocale.t('الوكيل: ')+row.targetLabel:row.targetKind==='SECURITY_RISK'?uiLocale.t('مرجع الخطر: ')+row.targetId+' · '+row.targetLabel:uiLocale.t('الحساب: ')+row.targetLabel;const effect=row.targetKind==='AGENT_RUNTIME'?(row.operation==='CONTAIN_CYBER_INCIDENT'?uiLocale.t('احتواء الحادث بإيقاف الوكيل وحفظ المهام في الطابور'):uiLocale.t('إيقاف الوكيل مع حفظ المهام الموجودة في الطابور')):row.targetKind==='SECURITY_RISK'?uiLocale.t('قبول موثق من المالك حتى المراجعة الدورية'):uiLocale.t('الإجراء المحدد: ')+(row.status==='SUSPENDED'?uiLocale.t('تعليق الحساب وإبطال جلساته'):uiLocale.t('إعادة تفعيل الحساب مع طلب دخول جديد'));const details=[make('h3', uiLocale.message("{0} · {1}", [row.source.reference, (value=>value===undefined?value:uiLocale.message(value))(states[row.state])])),make('p', target),make('p', effect)];if(row.riskReviewAt)details.push(make('p', uiLocale.message("موعد مراجعة الخطر: {0}", [new Date(row.riskReviewAt).toLocaleString('ar-SA')])));details.push(make('p', uiLocale.message("تنتهي الموافقة: {0}", [new Date(row.expiresAt).toLocaleString('ar-SA')])),make('p', row.recommendation));card.append(...details);
   const choices=row.state==='PROPOSED'?['APPROVE_EXECUTE','REVOKE']:['EXECUTED','ROLLED_BACK'].includes(row.state)?['VERIFY','FAIL_TEST',...(row.state==='EXECUTED'?['ROLLBACK']:[]),'REVOKE']:row.state==='TEST_FAILED'?['ROLLBACK','REVOKE']:row.state==='VERIFIED'?['CLOSE','ROLLBACK','REVOKE']:[];
   const labels={VERIFY:'تسجيل نجاح التحقق المستقل',APPROVE_EXECUTE:'أوافق على الإجراء المحدد ونفّذه الآن',FAIL_TEST:'تسجيل عدم نجاح الاختبار',ROLLBACK:'أوافق على الرجوع للحالة السابقة',CLOSE:'إقفال الطلب المتحقق',REVOKE:'إلغاء الطلب'};
   if(choices.length){const actionForm=make('form'),set=make('fieldset');actionForm.appendChild(set);select(set, uiLocale.message('الإجراء'), 'action', choices.map(id=>({id,label:uiLocale.message(labels[id])})));const sourceProofs=row.targetKind==='AGENT_RUNTIME'?(row.operation==='CONTAIN_CYBER_INCIDENT'?(refs.incidentProofs||[]):(refs.changeProofs||[])):(refs.proofs||[]),sourceProofReference=row.source.caseReference||row.source.reference;const proof=select(set, uiLocale.message('محضر التحقق المعتمد'), 'proof', sourceProofs.filter(p=>p.reference===sourceProofReference));const refreshProof=()=>{proof.parentElement.hidden=actionForm.elements.action.value!=='VERIFY';proof.required=!proof.parentElement.hidden;};actionForm.elements.action.addEventListener('change',refreshProof);refreshProof();const note=input(set, uiLocale.message('سبب القرار ونتيجة المراجعة'), 'reason');note.minLength=3;note.maxLength=1000;input(set, uiLocale.message('راجعت النطاق والتوصية والأثر المحدد'), 'confirmed', 'checkbox');const save=make('button', uiLocale.message('تأكيد الإجراء'));save.type='submit';set.appendChild(save);card.appendChild(actionForm);actionForm.addEventListener('submit',event=>{event.preventDefault();void operation(async(v,s)=>{const result=await post('/'+encodeURIComponent(row.id)+'/actions/'+actionForm.elements.action.value,{expectedRevision:row.revision,confirmed:actionForm.elements.confirmed.checked,reason:note.value,...(actionForm.elements.action.value==='VERIFY'?{documentId:proof.value}:{})},v,s);if(result)await load(v,s);});});}
   body.appendChild(card);
  }
 }
 async function open(){if(!auth()?.isAuthenticated?.())return;if(!dialog){const style=make('style');uiLocale.setMessage(style, '#hl-agent-access{box-sizing:border-box;width:min(800px,calc(100vw - 24px));max-height:88vh;padding:20px;background:#071f31;color:#edf7fb;border:1px solid #51748a;border-radius:16px}#hl-agent-access::backdrop{background:#00121aca}#hl-agent-access section{border-top:1px solid #51748a;padding-top:12px}#hl-agent-access form,#hl-agent-access fieldset,#hl-agent-access label{display:grid;gap:10px;min-width:0}#hl-agent-access input,#hl-agent-access select{box-sizing:border-box;width:100%;max-width:100%;padding:8px}#hl-agent-access input[type=checkbox]{width:auto;justify-self:start}#hl-agent-access p{overflow-wrap:anywhere;white-space:pre-wrap}#hl-agent-access [hidden]{display:none!important}');document.head.appendChild(style);dialog=make('dialog');dialog.id='hl-agent-access';uiLocale.setAttribute(dialog, "aria-label", 'تنفيذ توصيات الأمن');const close=make('button', uiLocale.message('إغلاق'));close.type='button';close.addEventListener('click',clear);body=make('div');dialog.append(make('h2', uiLocale.message('تنفيذ توصيات الأمن')),close,body);document.body.appendChild(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});}clear();const message=make('p', uiLocale.message('جارٍ تحميل توصياتك…'));message.setAttribute('role','status');body.appendChild(message);dialog.showModal();await operation(load);}
 function bind(){const list=document.querySelector('.profile-list');if(!list)return;const allowed=auth()?.isAuthenticated?.()&&window.HydrolandProfileData?.profile?.roles?.some(r=>r.role==='ADMIN'&&r.status==='ACTIVE');let b=list.querySelector('[data-agent-access]');if(!b){b=make('button', uiLocale.message('تنفيذ توصيات الأمن'));b.type='button';b.dataset.agentAccess='';b.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open();});list.appendChild(b);}b.hidden=!allowed;}
 for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(event,()=>{clear();bind();});document.addEventListener('hydroland:auth-changed',()=>{if(!auth()?.isAuthenticated?.())clear();bind();});document.addEventListener('hydroland:profile-data-ready',bind);new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});bind();window.HydrolandAgentAccess={open,clear};
})();
