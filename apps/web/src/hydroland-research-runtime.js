/* API-first desk research: explicit previews, actor-bound reviews, no external execution. */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("research-runtime", {
  "مقترح داخلي": "Internal proposal",
  "قيد مراجعة المقترح": "Proposal under review",
  "مقترح مراجع — لم يبدأ": "Proposal reviewed — not started",
  "بحث داخلي جارٍ": "Internal research in progress",
  "قيد مراجعة النتيجة": "Outcome under review",
  "نتيجة مراجعة — بانتظار قرار المالك": "Outcome reviewed — awaiting owner decision",
  "اكتمل سجل البحث الداخلي فقط": "Internal research record completed only",
  "سجل بحث مؤرشف": "Research record archived",
  "مقترح مرفوض": "Proposal rejected",
  "ملغى": "Cancelled",
  "بدء البحث المكتبي الداخلي": "Start internal desk research",
  "إكمال سجل البحث الداخلي": "Complete internal research record",
  "أرشفة السجل": "Archive record",
  "إلغاء السجل": "Cancel record",
  "هذا مسار بحث مكتبي داخلي فقط؛ لا يصرّح بتنفيذ خارجي أو صرف أو نشر، ولا يقفل الإدارة أو يمنح اعتمادًا قانونيًا أو تشغيليًا.": "This is an internal desk-research workflow only. It does not authorize external execution, disbursement or publication, close a department, or grant legal or operational approval.",
  "البحث المكتبي الداخلي": "Internal desk research",
  "إغلاق البحث": "Close research",
  "العودة للقائمة": "Back to list",
  "إعادة قراءة الحالة": "Read status again",
  "تعذر تأكيد الطلب أو تغيرت النسخة/الصلاحية. أعد قراءة الحالة قبل أي محاولة.": "Could not confirm the request, or the version/authority changed. Read status again before retrying.",
  "استجابة البحث غير مكتملة أو خارج النطاق؛ لا يمكن عرضها كنجاح. أعد القراءة.": "Research response is incomplete or outside scope and cannot be shown as successful. Read again.",
  "جارٍ قراءة الحالة الحالية والتحقق من صلاحية الحساب…": "Reading current status and checking account authority…",
  "تمت قراءة الحالة. لا يسجل العرض أو المعاينة أي اعتماد.": "Status read. Viewing or previewing does not record approval.",
  "إعداد مقترح داخلي جديد": "Prepare new internal proposal",
  "لا توجد سجلات متاحة في هذه الصفحة. لا يُنشئ النظام موظفًا أو تكليفًا بديلًا تلقائيًا.": "No records are available on this page. The system does not automatically create a substitute employee or assignment.",
  "· الإصدار": "· Version",
  "مراجعة مقترح": "Proposal review",
  "مراجعة نتيجة": "Outcome review",
  "· ينتهي التكليف": "· Assignment expires",
  "قراءة": "Read",
  "الصفحة الأقدم": "Older page",
  "العنوان": "Title",
  "السؤال / النتيجة": "Question / outcome",
  "المنهج": "Method",
  "الحدود والقيود": "Boundaries and limitations",
  "مراجع المستندات المحفوظة": "Saved document references",
  "لم تسجل مراجع لهذا المقترح.": "No references recorded for this proposal.",
  "المقترح المحدد": "Selected proposal",
  "النتيجة المحددة": "Selected outcome",
  "حالة المستند المصدر:": "Source document status:",
  "المقترح المحفوظ": "Saved proposal",
  "النتيجة المحفوظة": "Saved outcome",
  "تنبيه: تغير مصدر محفوظ. لا يمكن استخدام المراجعة القديمة؛ يلزم إصدار ومراجعة جديدان.": "Notice: a saved source changed. The old review cannot be reused; a new version and review are required.",
  "تاريخ السجل والمراجعات": "Record and review history",
  "الإصدار": "Version",
  "هذا ملخص آخر 50 سجلًا؛ التاريخ الأقدم محفوظ في الخادم.": "This summarizes the latest 50 records. Earlier history is retained on the server.",
  "إلغاء تكليف المراجعة الحالي": "Revoke current review assignment",
  "أؤكد إلغاء الوصول والقرار لهذا التكليف مع حفظ التاريخ.": "I confirm revoking access and decisions for this assignment while retaining history.",
  "إعداد إصدار مقترح جديد": "Prepare new proposal version",
  "إعداد نتيجة / إعادة عمل النتيجة": "Prepare or rework outcome",
  "إعداد تكليف مراجعة المقترح": "Prepare proposal-review assignment",
  "إعداد تكليف مراجعة النتيجة": "Prepare outcome-review assignment",
  "تأكيد الإجراء المحدد": "Confirm specified action",
  "اقرأ المعاينة ثم ضع علامة التأكيد المستقل.": "Read the preview, then select the separate confirmation.",
  "جارٍ تسجيل الإجراء المحدد…": "Recording specified action…",
  "حُفظ الإجراء. ليس تصريح تنفيذ خارجي أو إقفال إدارة. أعد قراءة الحالة قبل أي إجراء آخر.": "Action saved. This is not external-execution authorization or department closure. Read status again before another action.",
  "لم تتأكد نتيجة الحفظ. لا تُعد التأكيد تلقائيًا؛ أعد القراءة للتحقق.": "Save result unconfirmed. Do not repeat confirmation automatically; read again to verify.",
  "إعداد مقترح مكتبي داخلي": "Prepare internal desk-research proposal",
  "إعداد نتيجة داخلية": "Prepare internal outcome",
  "الإصدار الجديد يعيد مراجعة المقترح ويفصل النتيجة والمراجعات السابقة عن الإصدار الحالي، مع بقاء التاريخ محفوظًا.": "A new version requires proposal review again and separates the previous outcome/reviews from the current version, retaining history.",
  "عنوان البحث": "Research title",
  "سؤال البحث / النتيجة": "Research question / outcome",
  "المنهج المستخدم": "Method used",
  "المستندات المحفوظة: معرّف المستند @ الإصدار، كل مرجع في سطر": "Saved documents: document ID @ version, one reference per line",
  "سبب الإصدار الجديد": "Reason for new version",
  "معاينة المحتوى قبل الحفظ": "Preview content before saving",
  "النتيجة تتطلب مرجعًا محفوظًا واحدًا على الأقل.": "An outcome requires at least one saved reference.",
  "معاينة محلية فقط — يتحقق الخادم من المصادر عند الحفظ": "Local preview only — the server verifies sources when saving",
  "المحتوى": "Content",
  "الحدود": "Boundaries",
  "راجعت المحتوى والمراجع وأؤكد حفظ سجل داخلي فقط.": "I have reviewed content and references and confirm saving an internal record only.",
  "سبب": "Reason for",
  "معاينة": "Preview",
  "راجعت أثر هذا الانتقال وأؤكد أنه يخص السجل الداخلي فقط.": "I have reviewed this transition's effect and confirm it applies only to the internal record.",
  "· الحالة التالية:": "· Next status:",
  "تكليف موظف فعلي مستقل لمراجعة": "Assign an actual independent employee to review",
  "المقترح": "Proposal",
  "النتيجة": "Outcome",
  "القائمة لا تنشئ موظفين أو صلاحيات. لا يمكن تكليف منشئ المحتوى أو أحد مؤلفي المستندات المصدرية.": "The list does not create employees or permissions. The content creator or an author of a source document cannot be assigned.",
  "الموظف المستقل": "Independent employee",
  "اختر موظفًا مؤهلًا": "Select a qualified employee",
  "مدة الوصول للمراجعة": "Review access duration",
  "24 ساعة": "24 hours",
  "48 ساعة": "48 hours",
  "7 أيام": "7 days",
  "سبب التكليف وحدود المراجعة": "Assignment reason and review boundaries",
  "قراءة الموظفين المؤهلين": "Read qualified employees",
  "اختر موظفًا من": "Select an employee from",
  "حسابًا مؤهلًا قرئ.": "qualified accounts read.",
  "لا يوجد موظف مؤهل في الصفحة الحالية؛ لا يمكن اختراع مراجع.": "No qualified employee on the current page. A reviewer cannot be invented.",
  "معاينة التكليف والحقول المسموح قراءتها": "Preview assignment and readable fields",
  "معاينة فقط — لم يمنح الوصول بعد": "Preview only — access not yet granted",
  "· حتى": "· Until",
  "قراءة هذه النسخة والمستندات المدرجة وتسجيل قرار واحد، دون صلاحية عامة.": "Read this version and listed documents, and record one decision, without general authority.",
  "راجعت استقلال الموظف والمراجع والمدة وأؤكد التكليف المحدد.": "I have reviewed employee independence, references and duration and confirm the specified assignment.",
  "انتهاء الوصول:": "Access expires:",
  "· القرار من حسابك الفعلي وحده.": "· The decision must come from your actual account only.",
  "قراري بعد مراجعة المحتوى": "My decision after reviewing content",
  "اختر القرار": "Select decision",
  "قبول المراجعة الداخلية": "Accept internal review",
  "إعادة للمعالجة": "Return for remediation",
  "رفض": "Reject",
  "سبب القرار وملاحظات المراجعة": "Decision reason and review notes",
  "معاينة قراري": "Preview my decision",
  "راجعت النسخة والأدلة بنفسي وأؤكد قراري المستقل، لا نيابة عن موظف آخر.": "I have personally reviewed the version and evidence and confirm my independent decision, not on another employee's behalf.",
  "سجلات البحث الداخلي (للمالك)": "Internal research records (owner)",
  "مراجعات البحث المكلّفة": "Assigned research reviews",
  "{0} · الإصدار {1}": "{0} · Version {1}",
  "{0} · ينتهي التكليف {1}": "{0} · Assignment expires {1}",
  "قراءة {0}": "Read {0}",
  "{0} · الإصدار {1} · {2}": "{0} · Version {1} · {2}",
  "{0} · {1} · الإصدار {2}": "{0} · {1} · Version {2}",
  "حالة المستند المصدر: {0}": "Source document status: {0}",
  "الإصدار {0} · {1} · {2}": "Version {0} · {1} · {2}",
  "لم تتأكد نتيجة الحفظ. لا تُعد التأكيد تلقائيًا؛ أعد القراءة للتحقق. ": "Save result unconfirmed. Do not repeat confirmation automatically; read again to verify. ",
  "{0}: {1}": "{0}: {1}",
  "سبب {0}": "Reason for {0}",
  "معاينة {0}": "Preview {0}",
  "{0} · الحالة التالية: {1}": "{0} · Next status: {1}",
  "تكليف موظف فعلي مستقل لمراجعة {0}": "Assign an actual independent employee to review {0}",
  "اختر موظفًا من {0} حسابًا مؤهلًا قرئ.": "Select an employee from {0} qualified accounts read.",
  "{0} · حتى {1}": "{0} · Until {1}",
  "انتهاء الوصول: {0} · القرار من حسابك الفعلي وحده.": "Access expires: {0} · The decision must come from your actual account only."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? window.HydrolandResearchContract?.authoredErrorMessage?.(error) ?? error?.message;


  if(window.HydrolandResearchRuntime)return;
  const C=window.HydrolandResearchContract;if(!C)return;
  const auth=()=>window.HydrolandAuth,root='/admin/research-initiatives';
  const labels={PROPOSED:'مقترح داخلي',PROPOSAL_REVIEW:'قيد مراجعة المقترح',APPROVED:'مقترح مراجع — لم يبدأ',ACTIVE:'بحث داخلي جارٍ',RESULT_REVIEW:'قيد مراجعة النتيجة',VERIFIED:'نتيجة مراجعة — بانتظار قرار المالك',COMPLETED:'اكتمل سجل البحث الداخلي فقط',ARCHIVED:'سجل بحث مؤرشف',REJECTED:'مقترح مرفوض',CANCELLED:'ملغى'};
  const actions={START:'بدء البحث المكتبي الداخلي',COMPLETE:'إكمال سجل البحث الداخلي',ARCHIVE:'أرشفة السجل',CANCEL:'إلغاء السجل'};
  const notice='هذا مسار بحث مكتبي داخلي فقط؛ لا يصرّح بتنفيذ خارجي أو صرف أو نشر، ولا يقفل الإدارة أو يمنح اعتمادًا قانونيًا أو تشغيليًا.';
  const style=document.createElement('link');style.rel='stylesheet';style.href='./hydroland-research-runtime.css';document.head.appendChild(style);
  const dialog=document.createElement('dialog');dialog.id='hl-research-runtime';dialog.setAttribute('aria-labelledby','hl-research-title');
  uiLocale.setHTML(dialog, uiLocale.html`<header><h2 id="hl-research-title">البحث المكتبي الداخلي</h2><button type="button" data-research-close>إغلاق البحث</button></header><p data-research-notice></p><p role="status" aria-live="polite" data-research-status></p><nav class="hl-research-actions"><button type="button" data-research-list>العودة للقائمة</button><button type="button" data-research-reload>إعادة قراءة الحالة</button></nav><main data-research-body></main>`);
  document.body.appendChild(dialog);
  const $=q=>dialog.querySelector(q),body=$('[data-research-body]');
  const s={generation:0,session:null,actor:null,organization:null,owner:false,mode:'LIST',id:null,busy:false,uncertain:false,data:null,cursor:null,controllers:new Set()};
  const node=(tag,value,parent)=>{const n=document.createElement(tag);if(value!==undefined)uiLocale.setMessage(n, value);parent?.appendChild(n);return n;};
  const button=(label,parent,run)=>{const b=node('button', label, parent);b.type='button';b.dataset.researchAction='';b.addEventListener('click',()=>{if(!s.busy&&!s.uncertain)void run();});return b;};
  const note=t=>{uiLocale.setMessage($('[data-research-status]'), t);};
  const context=()=>({generation:s.generation,session:s.session,mode:s.mode,id:s.id,owner:s.owner,organization:s.organization});
  const current=c=>dialog.open&&auth()?.isAuthenticated?.()&&c.generation===s.generation&&c.session===auth()?.getSessionVersion?.()&&c.mode===s.mode&&c.id===s.id&&c.owner===s.owner;
  function controls(){dialog.querySelectorAll('[data-research-action],form input,form textarea,form select,form button').forEach(n=>n.disabled=s.busy||s.uncertain);$('[data-research-reload]').disabled=s.busy;$('[data-research-list]').disabled=s.busy;}
  function clear(){s.generation++;for(const c of s.controllers)c.abort();s.controllers.clear();s.actor=null;s.organization=null;s.data=null;s.cursor=null;s.busy=s.uncertain=false;body.replaceChildren();note('');uiLocale.setMessage($('[data-research-notice]'), '');if(dialog.open)dialog.close();}
  function invalidate(message){body.replaceChildren();s.data=null;s.uncertain=true;note(message);controls();}
  async function raw(c,path,options={}){
    const controller=new AbortController();s.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),30000);
    try{const response=await auth().authorizedFetch(path,{cache:'no-store',...options,signal:controller.signal}),data=await response.json().catch(()=>null);if(!current(c))return null;if([401,403].includes(response.status)){clear();return null;}if(!response.ok)throw localError(uiLocale.message('تعذر تأكيد الطلب أو تغيرت النسخة/الصلاحية. أعد قراءة الحالة قبل أي محاولة.'));return data;}
    finally{clearTimeout(timer);s.controllers.delete(controller);}
  }
  async function request(c,path,options){
    if(!current(c))return null;
    const me=await raw(c,'/me');if(!current(c))return null;if(!me){clear();return null;}
    const roles=me.roleAssignments;if(me.status!=='ACTIVE'||!C.id(me.id)||!Array.isArray(roles)||!roles.some(r=>r?.status==='ACTIVE'&&(c.owner?r.role==='ADMIN':['STAFF','ADMIN'].includes(r.role)))||s.actor&&s.actor!==me.id){clear();return null;}
    s.actor=me.id;return raw(c,path,options);
  }
  const post=(c,path,input)=>request(c,path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const assert=(ok)=>{if(!ok)throw localError(uiLocale.message('استجابة البحث غير مكتملة أو خارج النطاق؛ لا يمكن عرضها كنجاح. أعد القراءة.'));};
  function scopeReset(mode,id=null){s.generation++;for(const c of s.controllers)c.abort();s.controllers.clear();s.mode=mode;s.id=id;s.data=null;s.cursor=null;s.busy=s.uncertain=false;body.replaceChildren();note('');controls();}
  async function open(owner){clear();if(!auth()?.isAuthenticated?.())return;s.owner=owner;s.session=auth().getSessionVersion();s.mode='LIST';s.id=null;uiLocale.setMessage($('[data-research-notice]'), uiLocale.message(notice));dialog.showModal();await load();}
  async function navigate(mode,id=null){scopeReset(mode,id);await load();}
  async function load(before=null){
    const c=context();s.busy=true;s.uncertain=false;body.replaceChildren();s.data=null;controls();note(uiLocale.message('جارٍ قراءة الحالة الحالية والتحقق من صلاحية الحساب…'));
    try{
      let value;
      if(s.mode==='LIST'){
        value=await request(c,(s.owner?root:'/research-reviews/inbox')+(before?'?before='+encodeURIComponent(before):''));if(!current(c))return;
        assert(s.owner?C.ownerList(value):C.inbox(value));if(s.owner)s.organization=value.organizationId;s.data=value;s.cursor=value.nextCursor;renderList(value);
      }else{
        value=await request(c,s.owner?root+'/'+s.id:'/research-reviews/'+s.id);if(!current(c))return;
        assert(s.owner?C.detail(value,s.id)&&value.organizationId===s.organization:C.review(value,s.id));s.data=value;if(s.owner)renderOwner(value);else renderReview(value);
      }
      note(uiLocale.message('تمت قراءة الحالة. لا يسجل العرض أو المعاينة أي اعتماد.'));
    }catch(e){if(current(c))invalidate(e.message);}
    finally{if(current(c)){s.busy=false;controls();}}
  }
  function renderList(value){
    if(s.owner)button(uiLocale.message('إعداد مقترح داخلي جديد'), body, ()=>{s.generation++;s.mode='CREATE';s.id=null;s.data=null;body.replaceChildren();sectionEditor(null,'PROPOSAL');});
    if(!value.items.length)node('p', uiLocale.message('لا توجد سجلات متاحة في هذه الصفحة. لا يُنشئ النظام موظفًا أو تكليفًا بديلًا تلقائيًا.'), body);
    for(const item of value.items){const article=node('article', undefined, body);node('h3', item.title, article);node('p', (s.owner ? uiLocale.message("{0} · الإصدار {1}", [(value=>value===undefined?value:uiLocale.message(value))(labels[item.status]), item.revision]) : uiLocale.message("{0} · ينتهي التكليف {1}", [(item.phase==='PROPOSAL' ? uiLocale.message('مراجعة مقترح') : uiLocale.message('مراجعة نتيجة')), new Date(item.expiresAt).toLocaleString('ar-SA')])), article);button(uiLocale.message("قراءة {0}", [item.title]), article, ()=>navigate('DETAIL',item.id));}
    if(value.nextCursor)button(uiLocale.message('الصفحة الأقدم'), body, ()=>load(value.nextCursor));
  }
  function renderSection(section,parent,title){node('h3', title, parent);for(const [key,label] of [['title','العنوان'],['summary','السؤال / النتيجة'],['method','المنهج'],['limitations','الحدود والقيود']]){node('strong', uiLocale.message(label), parent);node('pre', section[key], parent);}node('strong', uiLocale.message('مراجع المستندات المحفوظة'), parent);for(const e of section.evidence)node('p', uiLocale.message("{0} · الإصدار {1} · {2}", [e.referenceNumber, e.version, e.contentHash]), parent);if(!section.evidence.length)node('p', uiLocale.message('لم تسجل مراجع لهذا المقترح.'), parent);}
  function renderSource(source,parent){renderSection(source.proposal, parent, uiLocale.message('المقترح المحدد'));if(source.result)renderSection(source.result, parent, uiLocale.message('النتيجة المحددة'));for(const e of source.evidence){const article=node('article', undefined, parent);node('h4', uiLocale.message("{0} · {1} · الإصدار {2}", [e.titleAr, e.referenceNumber, e.version]), article);node('p', uiLocale.message("حالة المستند المصدر: {0}", [e.status]), article);for(const f of e.fields){node('strong', f.labelAr, article);node('pre', (typeof f.value==='object' ? JSON.stringify(f.value) : String(f.value??'')), article);}}}
  function renderOwner(value){
    const row=value.record;node('h3', row.content.proposal.title, body);node('p', uiLocale.message("{0} · الإصدار {1}", [(value=>value===undefined?value:uiLocale.message(value))(labels[row.status]), row.revision]), body);node('p', value.notice, body);renderSection(row.content.proposal, body, uiLocale.message('المقترح المحفوظ'));if(row.content.result)renderSection(row.content.result, body, uiLocale.message('النتيجة المحفوظة'));
    if(!value.sourceCurrent.proposal||value.sourceCurrent.result===false)node('p', uiLocale.message('تنبيه: تغير مصدر محفوظ. لا يمكن استخدام المراجعة القديمة؛ يلزم إصدار ومراجعة جديدان.'), body);
    const history=node('details', undefined, body);node('summary', uiLocale.message('تاريخ السجل والمراجعات'), history);for(const h of value.history)node('p', uiLocale.message("الإصدار {0} · {1} · {2}", [h.revision, h.action, new Date(h.createdAt).toLocaleString('ar-SA')]), history);for(const r of value.reviews)node('p', r.phase+' · '+r.state+' · '+r.reviewerAccountId+(r.decisionNote?' · '+r.decisionNote:''), history);if(value.hasMoreHistory||value.hasMoreReviews)node('p', uiLocale.message('هذا ملخص آخر 50 سجلًا؛ التاريخ الأقدم محفوظ في الخادم.'), history);
    const pending=value.reviews.find(r=>r.state==='ACTIVE'),terminal=['COMPLETED','ARCHIVED','CANCELLED'].includes(row.status),area=node('section', undefined, body);
    if(pending&&['PROPOSAL_REVIEW','RESULT_REVIEW'].includes(row.status)){actionForm(area, uiLocale.message('إلغاء تكليف المراجعة الحالي'), uiLocale.message('أؤكد إلغاء الوصول والقرار لهذا التكليف مع حفظ التاريخ.'), async reason=>({path:root+'/'+row.id+'/review/revoke',input:{expectedRevision:row.revision,expectedReviewId:pending.id,reason,confirmed:true},validate:r=>C.detail(r,row.id)&&r.record.revision===row.revision+1&&r.record.status===(pending.phase==='PROPOSAL'?'PROPOSED':'ACTIVE')&&r.reviews.some(v=>v.id===pending.id&&v.state==='REVOKED')}));return;}
    if(!terminal){button(uiLocale.message('إعداد إصدار مقترح جديد'), area, ()=>{body.replaceChildren();sectionEditor(value,'PROPOSAL');});if(['ACTIVE','VERIFIED'].includes(row.status))button(uiLocale.message('إعداد نتيجة / إعادة عمل النتيجة'), area, ()=>{body.replaceChildren();sectionEditor(value,'RESULT');});}
    if(row.status==='PROPOSED'&&value.sourceCurrent.proposal)button(uiLocale.message('إعداد تكليف مراجعة المقترح'), area, ()=>assignmentForm(value,'PROPOSAL'));
    if(row.status==='ACTIVE'&&row.content.result&&value.sourceCurrent.proposal&&value.sourceCurrent.result)button(uiLocale.message('إعداد تكليف مراجعة النتيجة'), area, ()=>assignmentForm(value,'RESULT'));
    const action=row.status==='APPROVED'?'START':row.status==='VERIFIED'?'COMPLETE':row.status==='COMPLETED'?'ARCHIVE':null;
    if(action)transitionForm(area,value,action);if(!terminal)transitionForm(area,value,'CANCEL');
  }
  function field(form,label,name,value='',options={}){const l=node('label', label, form),input=node(options.select?'select':options.type==='text'?'input':'textarea', undefined, l);input.name=name;if(options.select)for(const [v,t] of options.select){const option=node('option', t, input);option.value=v;}else{input.value=value;if(options.type)input.type=options.type;}input.required=options.required!==false;if(options.min)input.minLength=options.min;if(options.max)input.maxLength=options.max;return input;}
  function consent(parent,label){const l=node('label', undefined, parent);l.className='hl-research-check';const check=node('input', undefined, l);check.type='checkbox';node('span', label, l);return check;}
  function planArea(form){const area=node('section', undefined, form);area.dataset.researchPreview='';area.editVersion=0;const changed=event=>{if(!area.contains(event.target)){area.editVersion++;area.replaceChildren();}};form.addEventListener('input',changed);form.addEventListener('change',changed);return area;}
  function confirm(area,label,run){const ack=consent(area,label),b=button(uiLocale.message('تأكيد الإجراء المحدد'), area, async()=>{if(ack.checked)await run();else note(uiLocale.message('اقرأ المعاينة ثم ضع علامة التأكيد المستقل.'));});b.dataset.researchConfirm='';}
  async function write(path,input,validate){const c=context();if(s.busy||s.uncertain)return;s.busy=true;controls();note(uiLocale.message('جارٍ تسجيل الإجراء المحدد…'));
    try{const response=await post(c,path,input);if(!current(c))return;assert(response&&(!c.owner||response.organizationId===c.organization)&&validate(response));body.replaceChildren();s.data=null;s.uncertain=true;note(uiLocale.message('حُفظ الإجراء. ليس تصريح تنفيذ خارجي أو إقفال إدارة. أعد قراءة الحالة قبل أي إجراء آخر.'));}
    catch(e){if(current(c))invalidate(uiLocale.t('لم تتأكد نتيجة الحفظ. لا تُعد التأكيد تلقائيًا؛ أعد القراءة للتحقق. ')+e.message);}
    finally{if(current(c)){s.busy=false;controls();}}
  }
  function sectionEditor(value,phase){
    const row=value?.record,initial=(phase==='PROPOSAL'?row?.content.proposal:row?.content.result)||{},form=node('form', undefined, body);node('h3', (phase==='PROPOSAL' ? uiLocale.message('إعداد مقترح مكتبي داخلي') : uiLocale.message('إعداد نتيجة داخلية')), form);node('p', (row&&phase==='PROPOSAL' ? uiLocale.message('الإصدار الجديد يعيد مراجعة المقترح ويفصل النتيجة والمراجعات السابقة عن الإصدار الحالي، مع بقاء التاريخ محفوظًا.') : uiLocale.message(notice)), form);
    const inputs={};for(const [key,label,min,max] of [['title','عنوان البحث',5,200],['summary','سؤال البحث / النتيجة',20,4000],['method','المنهج المستخدم',10,2000],['limitations','الحدود والقيود',10,2000]])inputs[key]=field(form, uiLocale.message(label), key, initial[key]||'', {min,max,type:key==='title'?'text':undefined});
    const refs=field(form, uiLocale.message('المستندات المحفوظة: معرّف المستند @ الإصدار، كل مرجع في سطر'), 'evidence', (initial.evidence||[]).map(e=>e.documentId+' @ '+e.version).join('\n'), {required:phase==='RESULT',max:1000});
    const reason=row?field(form, uiLocale.message('سبب الإصدار الجديد'), 'reason', '', {min:3,max:2000}):null,preview=node('button', uiLocale.message('معاينة المحتوى قبل الحفظ'), form);preview.type='submit';preview.dataset.researchAction='';const area=planArea(form),requestKey=crypto.randomUUID();
    form.addEventListener('submit',event=>{event.preventDefault();if(s.busy||s.uncertain)return;try{const section=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value.trim()]));section.evidence=C.evidence(refs.value);if(phase==='RESULT'&&!section.evidence.length)throw localError(uiLocale.message('النتيجة تتطلب مرجعًا محفوظًا واحدًا على الأقل.'));area.replaceChildren();node('h4', uiLocale.message('معاينة محلية فقط — يتحقق الخادم من المصادر عند الحفظ'), area);for(const [key,label] of [['title','العنوان'],['summary','المحتوى'],['method','المنهج'],['limitations','الحدود']])node('p', uiLocale.message("{0}: {1}", [uiLocale.message(label), section[key]]), area);for(const e of section.evidence)node('p', e.documentId+' @ '+e.version, area);
      const input=row?{expectedRevision:row.revision,phase,section,reason:reason.value.trim(),confirmed:true}:{requestKey,proposal:section,confirmed:true};confirm(area, uiLocale.message('راجعت المحتوى والمراجع وأؤكد حفظ سجل داخلي فقط.'), ()=>write(row?root+'/'+row.id+'/revise':root,input,r=>C.detail(r,row?.id)&&r.record.revision===(row?row.revision+1:1)&&r.record.status===(phase==='PROPOSAL'?'PROPOSED':'ACTIVE')&&(phase!=='PROPOSAL'||r.record.content.result===null)&&(!row||phase!=='RESULT'||C.sectionMatches(r.record.content.proposal,row.content.proposal))&&C.sectionMatches(r.record.content[phase==='PROPOSAL'?'proposal':'result'],section)));
    }catch(e){area.replaceChildren();note(localErrorMessage(e));}});
  }
  function actionForm(parent,label,ackLabel,make){const form=node('form', undefined, parent);node('h4', label, form);const reason=field(form, uiLocale.message("سبب {0}", [label]), 'reason', '', {min:3,max:2000}),preview=node('button', uiLocale.message("معاينة {0}", [label]), form);preview.type='submit';preview.dataset.researchAction='';const area=planArea(form);form.addEventListener('submit',async event=>{event.preventDefault();if(s.busy||s.uncertain)return;const c=context(),editVersion=area.editVersion;try{const plan=await make(reason.value.trim(), c, area);if(!plan||!current(c)||area.editVersion!==editVersion)return;area.replaceChildren();node('p', label+' · '+reason.value.trim(), area);if(plan.render)plan.render(area);confirm(area, ackLabel, ()=>write(plan.path,plan.input,plan.validate));}catch(e){if(current(c))invalidate(e.message);}});return form;}
  function transitionForm(parent,value,action){const row=value.record;actionForm(parent, (value=>value===undefined?value:uiLocale.message(value))(actions[action]), uiLocale.message('راجعت أثر هذا الانتقال وأؤكد أنه يخص السجل الداخلي فقط.'), async(reason,c)=>{s.busy=true;controls();try{const input={expectedRevision:row.revision,action,reason},plan=await post(c,root+'/'+row.id+'/transitions/preview',input);if(!current(c))return null;assert(C.transition(plan,row,input));return {path:root+'/'+row.id+'/transitions',input:{...input,expectedPlanHash:plan.expectedPlanHash,confirmed:true},validate:r=>C.detail(r,row.id)&&r.record.revision===row.revision+1&&r.record.status===plan.targetStatus,render:area=>node('p', uiLocale.message("{0} · الحالة التالية: {1}", [plan.notice, (value=>value===undefined?value:uiLocale.message(value))(labels[plan.targetStatus])]), area)};}finally{if(current(c)){s.busy=false;controls();}}});}
  async function assignmentForm(value,phase){
    body.replaceChildren();const row=value.record,c=context(),form=node('form', undefined, body);node('h3', uiLocale.message("تكليف موظف فعلي مستقل لمراجعة {0}", [(phase==='PROPOSAL' ? uiLocale.message('المقترح') : uiLocale.message('النتيجة'))]), form);node('p', uiLocale.message('القائمة لا تنشئ موظفين أو صلاحيات. لا يمكن تكليف منشئ المحتوى أو أحد مؤلفي المستندات المصدرية.'), form);
    const reviewer=field(form, uiLocale.message('الموظف المستقل'), 'reviewer', '', {select:[['',uiLocale.message('اختر موظفًا مؤهلًا')]]}),hours=field(form, uiLocale.message('مدة الوصول للمراجعة'), 'hours', '', {select:[['24',uiLocale.message('24 ساعة')],['48',uiLocale.message('48 ساعة')],['168',uiLocale.message('7 أيام')]]}),reason=field(form, uiLocale.message('سبب التكليف وحدود المراجعة'), 'reason', '', {min:3,max:2000}),candidateStatus=node('p', '', form);let cursor=null,seen=new Set();
    const more=button(uiLocale.message('قراءة الموظفين المؤهلين'), form, ()=>loadCandidates());
    async function loadCandidates(){s.busy=true;controls();try{const page=await request(c,root+'/'+row.id+'/review/candidates'+(cursor?'?before='+encodeURIComponent(cursor):''));if(!current(c))return;assert(C.candidates(page,row));for(const candidate of page.candidates){if(seen.has(candidate.accountId))continue;seen.add(candidate.accountId);const option=node('option', candidate.name+' · '+candidate.jobTitle, reviewer);option.value=candidate.accountId;}cursor=page.nextCursor;more.hidden=!cursor;uiLocale.setMessage(candidateStatus, (seen.size ? uiLocale.message("اختر موظفًا من {0} حسابًا مؤهلًا قرئ.", [seen.size]) : uiLocale.message('لا يوجد موظف مؤهل في الصفحة الحالية؛ لا يمكن اختراع مراجع.')));}catch(e){if(current(c))invalidate(e.message);}finally{if(current(c)){s.busy=false;controls();}}}
    const preview=node('button', uiLocale.message('معاينة التكليف والحقول المسموح قراءتها'), form);preview.type='submit';preview.dataset.researchAction='';const area=planArea(form);
    form.addEventListener('submit',async event=>{event.preventDefault();if(s.busy||s.uncertain||!seen.has(reviewer.value))return;const input={expectedRevision:row.revision,phase,reviewerAccountId:reviewer.value,expiresAt:new Date(Date.now()+Number(hours.value)*3600000).toISOString(),reason:reason.value.trim()},editVersion=area.editVersion;s.busy=true;controls();area.replaceChildren();try{const plan=await post(c,root+'/'+row.id+'/review/preview',input);if(!current(c)||area.editVersion!==editVersion)return;assert(C.assignment(plan,row,input));node('h4', uiLocale.message('معاينة فقط — لم يمنح الوصول بعد'), area);node('p', uiLocale.message("{0} · حتى {1}", [plan.reviewer.name, new Date(plan.expiresAt).toLocaleString('ar-SA')]), area);node('p', uiLocale.message('قراءة هذه النسخة والمستندات المدرجة وتسجيل قرار واحد، دون صلاحية عامة.'), area);renderSource(plan.source,area);confirm(area, uiLocale.message('راجعت استقلال الموظف والمراجع والمدة وأؤكد التكليف المحدد.'), ()=>write(root+'/'+row.id+'/review/assign',{...input,expectedPlanHash:plan.expectedPlanHash,confirmed:true},r=>C.detail(r,row.id)&&r.record.revision===row.revision+1&&r.record.status===(phase==='PROPOSAL'?'PROPOSAL_REVIEW':'RESULT_REVIEW')&&r.reviews.some(v=>v.state==='ACTIVE'&&v.phase===phase&&v.assignedRevision===row.revision+1&&v.reviewerAccountId===input.reviewerAccountId&&v.expiresAt===input.expiresAt)));}catch(e){if(current(c))invalidate(e.message);}finally{if(current(c)){s.busy=false;controls();}}});
    await loadCandidates();
  }
  function renderReview(value){renderSource(value.source,body);node('p', uiLocale.message("انتهاء الوصول: {0} · القرار من حسابك الفعلي وحده.", [new Date(value.expiresAt).toLocaleString('ar-SA')]), body);const form=node('form', undefined, body),choice=field(form, uiLocale.message('قراري بعد مراجعة المحتوى'), 'decision', '', {select:[['',uiLocale.message('اختر القرار')],['APPROVE',uiLocale.message('قبول المراجعة الداخلية')],['RETURN',uiLocale.message('إعادة للمعالجة')],['REJECT',uiLocale.message('رفض')]]}),reason=field(form, uiLocale.message('سبب القرار وملاحظات المراجعة'), 'note', '', {min:3,max:2000}),preview=node('button', uiLocale.message('معاينة قراري'), form);preview.type='submit';preview.dataset.researchAction='';const area=planArea(form);form.addEventListener('submit',event=>{event.preventDefault();if(s.busy||s.uncertain||!['APPROVE','RETURN','REJECT'].includes(choice.value))return;area.replaceChildren();const input={expectedRevision:value.expectedRevision,reviewHash:value.reviewHash,decision:choice.value,note:reason.value.trim(),confirmed:true};node('p', choice.selectedOptions[0].textContent+' · '+input.note, area);confirm(area, uiLocale.message('راجعت النسخة والأدلة بنفسي وأؤكد قراري المستقل، لا نيابة عن موظف آخر.'), ()=>write('/research-reviews/'+value.reviewId+'/decisions',input,r=>C.decision(r,value,s.actor,input)));});}
  $('[data-research-close]').addEventListener('click',clear);dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
  $('[data-research-reload]').addEventListener('click',()=>{if(s.busy)return;if(s.mode==='CREATE')void navigate('LIST');else{const mode=s.mode,id=s.id;scopeReset(mode,id);void load();}});
  $('[data-research-list]').addEventListener('click',()=>{if(!s.busy)void navigate('LIST');});
  const ownerEntry=node('button', uiLocale.message('سجلات البحث الداخلي (للمالك)'), document.querySelector('#profile-dialog .profile-list')),reviewEntry=node('button', uiLocale.message('مراجعات البحث المكلّفة'), document.querySelector('#profile-dialog .profile-list'));ownerEntry.type=reviewEntry.type='button';ownerEntry.dataset.researchOwnerEntry='';reviewEntry.dataset.researchInboxEntry='';
  function visibility(){const roles=window.HydrolandProfileData?.profile?.roles||[],has=role=>roles.some(r=>typeof r==='string'?r===role:r?.role===role&&r.status==='ACTIVE');ownerEntry.hidden=!auth()?.isAuthenticated?.()||!has('ADMIN');reviewEntry.hidden=!auth()?.isAuthenticated?.()||!has('STAFF')&&!has('ADMIN');}
  ownerEntry.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open(true);});reviewEntry.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open(false);});
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(event,()=>{clear();visibility();});
  document.addEventListener('hydroland:workspace-selected',clear);document.addEventListener('hydroland:profile-data-ready',()=>{const profile=window.HydrolandProfileData?.profile,roles=profile?.roles||[],has=role=>roles.some(r=>typeof r==='string'?r===role:r?.role===role&&r.status==='ACTIVE');if(dialog.open&&(!profile||profile.status!=='ACTIVE'||!C.id(profile.id)||s.actor&&profile.id!==s.actor||!(s.owner?has('ADMIN'):has('STAFF')||has('ADMIN'))))clear();visibility();});window.addEventListener('popstate',clear);visibility();
  window.HydrolandResearchRuntime={openOwner:()=>open(true),openInbox:()=>open(false),clear};
})();
