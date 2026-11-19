/* Explicit one-version review assignments. The owner's library remains private. */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("document-reviews", {
  "نسخة المستند المكلّف بالمراجعة": "Document version assigned for review",
  "مراجعات المستندات": "Document reviews",
  "إغلاق": "Close",
  "إعادة قراءة الحالة": "Read status again",
  "فتح PDF في نافذة مستقلة": "Open PDF in a separate window",
  "تغير سياق المراجعة.": "Review context changed.",
  "انتهت الجلسة أو صلاحية هذا التكليف.": "Session or assignment authority expired.",
  "تعذر إكمال الإجراء؛ أعد قراءة الحالة.": "Could not complete the action. Read status again.",
  "تعذر التحقق من نسخة المستند.": "Could not verify the document version.",
  "استجابة المراجعة خارج النطاق.": "Review response is outside scope.",
  "· النسخة": "· Revision",
  "مسودة": "Draft",
  "بانتظار الاعتماد": "Awaiting approval",
  "معتمد": "Approved",
  "موقّع": "Signed",
  "مؤرشف": "Archived",
  "التكليف المحفوظ": "Saved assignment",
  "الحالة:": "Status:",
  "· نسخة المستند": "· Document version",
  "· الانتهاء": "· Expiry",
  "المعتمد:": "Approver:",
  "· الموقّع:": "· Signer:",
  "نشط — يخضع لفحص الصلاحية والانتهاء عند كل وصول": "Active — authority and expiry checked on every access",
  "ملغى": "Cancelled",
  "أعيد للمعالجة": "Returned for remediation",
  "امتنع الموقّع": "Signer declined",
  "الاعتماد السابق محفوظ": "Previous approval retained",
  "سبب إلغاء التكليف": "Reason for revoking the assignment",
  "أؤكد إلغاء الوصول والقرارات اللاحقة لهذا التكليف، مع حفظ الأدلة السابقة.": "I confirm revoking subsequent access and decisions for this assignment while retaining previous evidence.",
  "إلغاء التكليف": "Revoke assignment",
  "لا يوجد تكليف محفوظ لهذا المستند.": "No saved assignment for this document.",
  "التكليف الجديد متاح للنسخة المرسلة للاعتماد أو لتكليف موقّع لنسخة معتمدة.": "A new assignment is available for a version submitted for approval, or to assign a signer to an approved version.",
  "ألغِ التكليف الحالي صراحةً قبل اختيار حسابات أو مدة جديدة.": "Explicitly revoke the current assignment before selecting new accounts or a new duration.",
  "الموقّع المستقل": "Independent signer",
  "اختر الموظف الفعلي": "Select the actual employee",
  "مدة التكليف": "Assignment duration",
  "24 ساعة": "24 hours",
  "48 ساعة": "48 hours",
  "72 ساعة": "72 hours",
  "7 أيام": "7 days",
  "سبب التكليف وحدود المراجعة": "Assignment reason and review boundaries",
  "معاينة الأشخاص والنطاق والمدة": "Preview people, scope and duration",
  "تكليف موقّع مستقل مع حفظ الاعتماد السابق": "Assign an independent signer while retaining prior approval",
  "اختيار المراجع/المعتمد والموقّع المستقلين": "Select independent reviewer/approver and signer",
  "لا يوجد موظف نشط مؤهل في إدارة هذا المستند حاليًا. استكمل إجراءات الموظفين والعضوية والتحقق من الحساب أولًا؛ لا تمنح عضوية مركز خارجي صلاحية المراجعة الداخلية.": "No qualified active employee is currently available in this document's department. Complete employee, membership and account-verification procedures first. External-center membership does not grant internal review authority.",
  "المراجع/المعتمد": "Reviewer/approver",
  "مرجع حساب المعتمد الحالي:": "Current approver account reference:",
  "؛ يبقى الاعتماد محفوظًا.": "; prior approval is retained.",
  "القائمة تعرض أول 50 سجلًا؛ استكمل تحديد الموظفين من إدارة شؤون الموظفين عند الحاجة.": "The list shows the first 50 records. Complete employee selection in personnel management when needed.",
  "جارٍ قراءة النسخة والموظفين المؤهلين دون منح صلاحية…": "Reading the version and qualified employees without granting authority…",
  "قائمة الموظفين غير متسقة.": "Employee list is inconsistent.",
  "سجل التكليف غير متسق.": "Assignment record is inconsistent.",
  "راجع النسخة والحسابات. لا يمنح فتح هذه الشاشة صلاحية لأي شخص.": "Review the version and accounts. Opening this view does not grant anyone authority.",
  "جارٍ قراءة المستندات المكلّفة لحسابك…": "Reading documents assigned to your account…",
  "قائمة التكليفات غير متسقة.": "Assignment list is inconsistent.",
  "التكليف:": "Assignment:",
  "مراجعة النسخة المكلّفة": "Review assigned version",
  "مراجعة واعتماد": "Review and approval",
  "توقيع مستقل": "Independent signature",
  "لا توجد مستندات متاحة لك بتكليف فعّال حاليًا.": "No documents are currently available through an active assignment.",
  "تحميل المزيد": "Load more",
  "المعروض خاص بالتكليفات الفعّالة لحسابك؛ لا يفتح مكتبة الجهة أو ملفات الموظفين الأخرى.": "Only active assignments for your account are shown. This does not open the organization's library or other employee files.",
  "جارٍ التحقق من التكليف والنسخة والصلاحية الحالية…": "Checking the assignment, version and current authority…",
  "نسخة المراجعة غير متسقة.": "Review version is inconsistent.",
  "اعتماد النسخة": "Approve version",
  "إعادة للمعالجة": "Return for remediation",
  "تسجيل توقيع النسخة": "Record version signature",
  "الامتناع عن التوقيع": "Decline to sign",
  "دورك:": "Your role:",
  "عرض PDF للنسخة": "View version PDF",
  "الإجراء": "Action",
  "اختر الإجراء": "Select action",
  "ملاحظة المراجعة وأسباب الإجراء": "Review note and action reasons",
  "راجعت النسخة": "I have reviewed version",
  "المعروضة وأؤكد تسجيل الإجراء المختار بهويتي وصلاحيتي الفعلية.": "shown and confirm recording the selected action under my actual identity and authority.",
  "تسجيل الإجراء على هذه النسخة": "Record action on this version",
  "لا يوجد إجراء قرار متاح في الحالة الحالية. توقيع النسخة يتاح للموقّع بعد اعتمادها من المراجع المستقل.": "No decision action is currently available. Signing becomes available to the signer after the independent reviewer approves the version.",
  "راجع كامل المحتوى والنسخة قبل اختيار الإجراء.": "Review the full content and version before selecting an action.",
  "اختر شخصين مستقلين وحدد سبب التكليف.": "Select two independent people and specify the assignment reason.",
  "خطة التكليف غير متسقة.": "Assignment plan is inconsistent.",
  "راجع نطاق الوصول قبل التأكيد": "Review access scope before confirmation",
  "المراجع/المعتمد:": "Reviewer/approver:",
  "الموقّع:": "Signer:",
  "ينتهي:": "Expires:",
  "بتوقيت الرياض": "Riyadh time",
  "الصلاحية لقراءة هذه النسخة وطباعتها، ثم الإجراء المحدد لكل شخص فقط.": "Authority is limited to reading/printing this version and each person's specified action.",
  "راجعت هوية الحسابين والنسخة والمدة وأوافق على إتاحة هذه النسخة لهما ضمن التكليف المعروض.": "I have reviewed both account identities, version and duration and agree to provide this version within the displayed assignment.",
  "تفعيل التكليف المحدد": "Activate specified assignment",
  "المعاينة لم تمنح صلاحية؛ يلزم تأكيد مستقل.": "The preview did not grant authority. Separate confirmation is required.",
  "سُجل الإجراء. أعد قراءة الحالة لعرض أحدث نسخة وصلاحية.": "Action recorded. Read status again for the latest version and authority.",
  "جارٍ تسجيل الإجراء…": "Recording action…",
  "تعذر التحقق من نتيجة الحفظ.": "Could not verify the saved result.",
  "اضغط «إعادة قراءة الحالة».": "Select “Read status again”.",
  "تعذر تأكيد النتيجة؛ أعد قراءة الحالة قبل أي محاولة أخرى.": "Could not confirm the result. Read status again before retrying.",
  "حُفظ التكليف المحدد. لم تُمنح عضوية أو صلاحية إدارية عامة.": "Specified assignment saved. No membership or general administrative authority was granted.",
  "أُلغي التكليف؛ الأدلة السابقة محفوظة.": "Assignment revoked. Previous evidence is retained.",
  "أدخل سبب الإلغاء وأكّد أثره على الوصول اللاحق.": "Enter the revocation reason and confirm its effect on future access.",
  "تعذر فتح PDF؛ أعد قراءة النسخة والصلاحية.": "Could not open the PDF. Read the version and authority again.",
  "ملف PDF غير صالح.": "Invalid PDF file.",
  "PDF للنسخة المحفوظة؛ لا يُسجل قرارًا بمجرد عرضه.": "PDF of the saved version. Viewing it does not record a decision.",
  "مراجعات المستندات المكلّفة": "Assigned document reviews",
  "{0} اضغط «إعادة قراءة الحالة».": "{0} Select “Read status again”.",
  "تعذر تأكيد النتيجة؛ أعد قراءة الحالة قبل أي محاولة أخرى. {0}": "Could not confirm the result. Read status again before retrying. {0}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if (window.HydrolandDocumentReviews) return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.HydrolandAuth,policy='EXPLICIT_DOCUMENT_REVIEW_V1';
  const dialog=document.createElement('dialog');dialog.id='hl-document-reviews';dialog.setAttribute('aria-labelledby','hdr-title');
  uiLocale.setHTML(dialog, uiLocale.html`<header><h2 id="hdr-title">مراجعات المستندات</h2><button type="button" data-hdr-close>إغلاق</button></header><p data-hdr-notice></p><p role="status" aria-live="polite" data-hdr-status></p><button type="button" data-hdr-reload>إعادة قراءة الحالة</button><main data-hdr-body></main><section data-hdr-pdf hidden><a data-hdr-pdf-link target="_blank" rel="noopener noreferrer">فتح PDF في نافذة مستقلة</a><iframe data-hdr-pdf-frame title="نسخة المستند المكلّف بالمراجعة" referrerpolicy="no-referrer"></iframe></section>`);
  const style=document.createElement('style');uiLocale.setMessage(style, '#hl-document-reviews{width:min(900px,94vw);max-height:92vh;overflow:auto;box-sizing:border-box;border:1px solid #28647f;border-radius:14px;padding:22px;background:#f3f7fa;color:#143147;font:15px/1.8 Arial,sans-serif}#hl-document-reviews::backdrop{background:#071e30bb}#hl-document-reviews *{box-sizing:border-box;overflow-wrap:anywhere}#hl-document-reviews header{display:flex;justify-content:space-between;align-items:center;gap:15px;border-bottom:3px solid #168eaf}#hl-document-reviews h2,#hl-document-reviews h3{margin:8px 0}#hl-document-reviews button{padding:10px 14px;border:1px solid #aac5d3;background:#12354d;color:white;border-radius:7px;cursor:pointer}#hl-document-reviews button:disabled{opacity:.45;cursor:not-allowed}#hl-document-reviews label{display:grid;gap:6px;margin:12px 0}#hl-document-reviews select,#hl-document-reviews textarea{width:100%;padding:10px;border:1px solid #aac5d3;border-radius:6px;background:white;color:#143147;font:inherit}#hl-document-reviews .hdr-check{display:flex;gap:10px;align-items:flex-start}#hl-document-reviews [type=checkbox]{margin-top:6px;flex-shrink:0}#hl-document-reviews article,#hl-document-reviews dl,#hl-document-reviews fieldset{border:1px solid #c2d8e2;border-radius:8px;padding:15px;margin:12px 0;background:white}#hl-document-reviews dt{font-weight:700}#hl-document-reviews dd{margin:3px 0 14px;white-space:pre-wrap}#hl-document-reviews [data-hdr-notice]{background:#fff4d7;padding:12px;border-inline-start:4px solid #ba8a29}#hl-document-reviews iframe{width:100%;height:65vh;border:1px solid #aac5d3}#hl-document-reviews .hdr-actions{display:flex;gap:10px;flex-wrap:wrap}@media(max-width:600px){#hl-document-reviews{padding:14px}#hl-document-reviews h2{font-size:20px}}');
  document.head.appendChild(style);document.body.appendChild(dialog);
  const $=q=>dialog.querySelector(q),s={generation:0,mode:'',org:'',id:'',session:null,busy:false,uncertain:false,data:null,plan:null,input:null,pdf:null,controller:null,cursor:null};
  const context=()=>({generation:s.generation,session:s.session,org:s.org,id:s.id,mode:s.mode});
  const current=c=>dialog.open&&auth()?.isAuthenticated?.()&&c.generation===s.generation&&c.session===auth()?.getSessionVersion?.()&&c.org===s.org&&c.id===s.id&&c.mode===s.mode;
  const note=t=>{uiLocale.setMessage($('[data-hdr-status]'), t);};
  const base=c=>`/document-reviews/organizations/${encodeURIComponent(c.org)}/documents/${encodeURIComponent(c.id)}`;
  const date=v=>new Date(v).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'});
  function releasePdf(){if(s.pdf)URL.revokeObjectURL(s.pdf);s.pdf=null;$('[data-hdr-pdf]').hidden=true;$('[data-hdr-pdf-frame]').removeAttribute('src');$('[data-hdr-pdf-link]').removeAttribute('href');}
  function clear(){s.generation++;s.controller?.abort();s.controller=null;s.data=s.plan=s.input=null;s.busy=s.uncertain=false;s.cursor=null;releasePdf();$('[data-hdr-body]').replaceChildren();uiLocale.setMessage($('[data-hdr-notice]'), '');note('');if(dialog.open)dialog.close();}
  async function request(c,path,options={}){
    if(!current(c))throw localError(uiLocale.message('تغير سياق المراجعة.'));
    const controller=new AbortController();s.controller=controller;const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const r=await auth().authorizedFetch(path,{cache:'no-store',...options,signal:controller.signal}),b=await r.json().catch(()=>null);
      if(!current(c))return null;
      if([401,403].includes(r.status)){clear();throw localError(uiLocale.message('انتهت الجلسة أو صلاحية هذا التكليف.'));}
      if(!r.ok)throw localError((Array.isArray(b?.message) ? b.message.join('، ') : (b?.message || uiLocale.message('تعذر إكمال الإجراء؛ أعد قراءة الحالة.'))));
      return b;
    }finally{clearTimeout(timeout);if(s.controller===controller)s.controller=null;}
  }
  function validateSource(source,c){if(!source||source.id!==c.id||source.organizationId!==c.org||!Number.isSafeInteger(source.version)||source.version<1||typeof source.referenceNumber!=='string'||typeof source.titleAr!=='string'||!['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED'].includes(source.status))throw localError(uiLocale.message('تعذر التحقق من نسخة المستند.'));}
  function validateScope(r,c){if(!r||r.schemaVersion!==1||r.policy!==policy||r.organizationId!==c.org||r.documentId!==c.id)throw localError(uiLocale.message('استجابة المراجعة خارج النطاق.'));validateSource(r.source,c);}
  function controls(){
    $('[data-hdr-reload]').disabled=s.busy;
    dialog.querySelectorAll('[data-hdr-mutating],[type=checkbox]').forEach(e=>e.disabled=s.busy||s.uncertain);
    const plan=$('[data-hdr-apply]'),consent=$('[data-hdr-grant-confirm]');if(plan)plan.disabled=s.busy||s.uncertain||!s.plan||!consent?.checked;
    const decision=$('[data-hdr-decide]');if(decision)decision.disabled=s.busy||s.uncertain||!$('[data-hdr-decision-confirm]')?.checked||!$('[data-hdr-action]')?.value||($('[data-hdr-note]')?.value.trim().length||0)<3;
  }
  const summary=d=>uiLocale.html`<h3>${esc(d.titleAr)}</h3><p>${esc(d.referenceNumber)} · النسخة ${d.version} · ${esc(d.department)} · ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))({DRAFT:'مسودة',PENDING_APPROVAL:'بانتظار الاعتماد',APPROVED:'معتمد',SIGNED:'موقّع',ARCHIVED:'مؤرشف'}[d.status]))}</p>`;
  function renderOwner(){
    const r=s.data,g=r.current,candidates=r.candidates;
    uiLocale.setHTML($('[data-hdr-body]'), summary(r.source)+(g?uiLocale.html`<article><h3>التكليف المحفوظ</h3><p>الحالة: ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))({ACTIVE:'نشط — يخضع لفحص الصلاحية والانتهاء عند كل وصول',REVOKED:'ملغى',RETURNED:'أعيد للمعالجة',DECLINED:'امتنع الموقّع'}[g.state]))} · نسخة المستند ${g.documentVersion} · الانتهاء ${esc(date(g.expiresAt))}</p><p>المعتمد: ${uiLocale.messageHTML(((g.reviewer?.accountId || r.source.approvedByAccountId) || uiLocale.message('الاعتماد السابق محفوظ')))} · الموقّع: ${esc(g.signer.accountId)}</p>${g.state==='ACTIVE'?uiLocale.html`<label>سبب إلغاء التكليف<textarea rows="2" maxlength="2000" data-hdr-revoke-note></textarea></label><label class="hdr-check"><input type="checkbox" data-hdr-revoke-confirm> أؤكد إلغاء الوصول والقرارات اللاحقة لهذا التكليف، مع حفظ الأدلة السابقة.</label><button type="button" data-hdr-revoke data-hdr-mutating>إلغاء التكليف</button>`:''}</article>`:uiLocale.html`<p>لا يوجد تكليف محفوظ لهذا المستند.</p>`)+
      (!r.canAssign?uiLocale.html`<p>التكليف الجديد متاح للنسخة المرسلة للاعتماد أو لتكليف موقّع لنسخة معتمدة.</p>`:r.requiresRevoke?uiLocale.html`<p>ألغِ التكليف الحالي صراحةً قبل اختيار حسابات أو مدة جديدة.</p>`:uiLocale.html`<form data-hdr-owner-form><fieldset><legend>${uiLocale.messageHTML((r.source.status==='APPROVED' ? uiLocale.message('تكليف موقّع مستقل مع حفظ الاعتماد السابق') : uiLocale.message('اختيار المراجع/المعتمد والموقّع المستقلين')))}</legend>${candidates.length?'':uiLocale.html`<p>لا يوجد موظف نشط مؤهل في إدارة هذا المستند حاليًا. استكمل إجراءات الموظفين والعضوية والتحقق من الحساب أولًا؛ لا تمنح عضوية مركز خارجي صلاحية المراجعة الداخلية.</p>`}
      ${r.source.status==='PENDING_APPROVAL'?uiLocale.html`<label>المراجع/المعتمد<select data-hdr-reviewer data-hdr-mutating required><option value="">اختر الموظف الفعلي</option>${candidates.filter(p=>p.canReview).map(p=>uiLocale.html`<option value="${esc(p.accountId)}">${esc(p.name)} · ${esc(p.email)} · ${esc(p.jobTitle)}</option>`).join('')}</select></label>`:uiLocale.html`<p>مرجع حساب المعتمد الحالي: ${esc(r.source.approvedByAccountId)}؛ يبقى الاعتماد محفوظًا.</p>`}
      <label>الموقّع المستقل<select data-hdr-signer data-hdr-mutating required><option value="">اختر الموظف الفعلي</option>${candidates.filter(p=>p.canSign).map(p=>uiLocale.html`<option value="${esc(p.accountId)}">${esc(p.name)} · ${esc(p.email)} · ${esc(p.jobTitle)}</option>`).join('')}</select></label>
      <label>مدة التكليف<select data-hdr-hours data-hdr-mutating><option value="24">24 ساعة</option><option value="48">48 ساعة</option><option value="72">72 ساعة</option><option value="168">7 أيام</option></select></label>
      <label>سبب التكليف وحدود المراجعة<textarea data-hdr-reason data-hdr-mutating rows="3" minlength="3" maxlength="2000" required></textarea></label><button type="submit" data-hdr-preview data-hdr-mutating>معاينة الأشخاص والنطاق والمدة</button></fieldset></form><section data-hdr-plan></section>`));
    if(r.hasMoreCandidates)uiLocale.insertHTML($('[data-hdr-body]'), 'beforeend', uiLocale.html`<p>القائمة تعرض أول 50 سجلًا؛ استكمل تحديد الموظفين من إدارة شؤون الموظفين عند الحاجة.</p>`);
    controls();
  }
  async function loadOwner(){
    const c=context();s.busy=true;s.plan=s.input=null;controls();note(uiLocale.message('جارٍ قراءة النسخة والموظفين المؤهلين دون منح صلاحية…'));
    try{const r=await request(c,base(c)+'/assignment');if(!current(c)||!r)return;validateScope(r,c);if(!Array.isArray(r.candidates)||r.candidates.length>50||typeof r.canAssign!=='boolean'||typeof r.requiresRevoke!=='boolean'||r.candidates.some(p=>!p||typeof p.accountId!=='string'||typeof p.name!=='string'||typeof p.email!=='string'||typeof p.jobTitle!=='string'||typeof p.canReview!=='boolean'||typeof p.canSign!=='boolean'))throw localError(uiLocale.message('قائمة الموظفين غير متسقة.'));
      if(r.current&&(r.current.policy!==policy||r.current.organizationId!==c.org||r.current.documentId!==c.id||!r.current.signer||typeof r.current.revision!=='string'||!['ACTIVE','REVOKED','RETURNED','DECLINED'].includes(r.current.state)))throw localError(uiLocale.message('سجل التكليف غير متسق.'));
      s.data=r;s.uncertain=false;uiLocale.setMessage($('[data-hdr-notice]'), r.notice);renderOwner();note(uiLocale.message('راجع النسخة والحسابات. لا يمنح فتح هذه الشاشة صلاحية لأي شخص.'));
    }catch(e){if(current(c)){s.data=null;$('[data-hdr-body]').replaceChildren();note(localErrorMessage(e));}}finally{if(current(c)){s.busy=false;controls();}}
  }
  async function loadInbox(append=false){
    const c=context();s.busy=true;controls();note(uiLocale.message('جارٍ قراءة المستندات المكلّفة لحسابك…'));
    try{const r=await request(c,'/document-reviews/inbox'+(append&&s.cursor?'?cursor='+encodeURIComponent(s.cursor):''));if(!current(c)||!r)return;
      if(r.schemaVersion!==1||r.policy!==policy||!Array.isArray(r.items)||r.items.length>20||r.items.some(x=>!x||typeof x.id!=='string'||typeof x.organizationId!=='string'||typeof x.titleAr!=='string'||typeof x.referenceNumber!=='string'||!Number.isSafeInteger(x.version)||!['REVIEWER','SIGNER'].includes(x.role))||(r.nextCursor!==null&&typeof r.nextCursor!=='string'))throw localError(uiLocale.message('قائمة التكليفات غير متسقة.'));
      const items=append?[...(s.data?.items||[]),...r.items.filter(x=>!s.data?.items?.some(y=>y.id===x.id&&y.organizationId===x.organizationId))]:r.items;s.data={items};s.cursor=r.nextCursor;s.uncertain=false;uiLocale.setMessage($('[data-hdr-notice]'), r.notice);
      uiLocale.setHTML($('[data-hdr-body]'), items.length?items.map((d,i)=>uiLocale.html`<article>${summary(d)}<p>التكليف: ${uiLocale.messageHTML((d.role==='REVIEWER' ? uiLocale.message('مراجعة واعتماد') : uiLocale.message('توقيع مستقل')))} · الانتهاء ${esc(date(d.expiresAt))}</p><button type="button" data-hdr-open="${i}">مراجعة النسخة المكلّفة</button></article>`).join(''):uiLocale.html`<p>لا توجد مستندات متاحة لك بتكليف فعّال حاليًا.</p>`);
      if(s.cursor)uiLocale.insertHTML($('[data-hdr-body]'), 'beforeend', uiLocale.html`<button type="button" data-hdr-more>تحميل المزيد</button>`);note(uiLocale.message('المعروض خاص بالتكليفات الفعّالة لحسابك؛ لا يفتح مكتبة الجهة أو ملفات الموظفين الأخرى.'));
    }catch(e){if(current(c)){s.data=null;$('[data-hdr-body]').replaceChildren();note(localErrorMessage(e));}}finally{if(current(c)){s.busy=false;controls();}}
  }
  async function loadDetail(){
    const c=context();s.busy=true;controls();releasePdf();note(uiLocale.message('جارٍ التحقق من التكليف والنسخة والصلاحية الحالية…'));
    try{const r=await request(c,base(c)+'/view');if(!current(c)||!r)return;validateScope(r,c);
      if(!['REVIEWER','SIGNER'].includes(r.role)||typeof r.reviewHash!=='string'||!/^[a-f0-9]{64}$/.test(r.reviewHash)||!Array.isArray(r.fields)||r.fields.length>100||r.fields.some(f=>!f||typeof f.key!=='string'||typeof f.labelAr!=='string')||!r.actorActions||['approve','return','sign','decline'].some(k=>typeof r.actorActions[k]!=='boolean'))throw localError(uiLocale.message('نسخة المراجعة غير متسقة.'));
      s.data=r;s.uncertain=false;uiLocale.setMessage($('[data-hdr-notice]'), r.notice);
      const actions=Object.entries({APPROVE:['approve','اعتماد النسخة'],RETURN:['return','إعادة للمعالجة'],SIGN:['sign','تسجيل توقيع النسخة'],DECLINE:['decline','الامتناع عن التوقيع']}).filter(([,v])=>r.actorActions[v[0]]);
      uiLocale.setHTML($('[data-hdr-body]'), summary(r.source)+uiLocale.html`<p>دورك: ${uiLocale.messageHTML((r.role==='REVIEWER' ? uiLocale.message('المراجع/المعتمد') : uiLocale.message('الموقّع المستقل')))} · الانتهاء ${esc(date(r.expiresAt))}</p><button type="button" data-hdr-print>عرض PDF للنسخة</button><dl>${r.fields.map(f=>uiLocale.html`<dt>${esc(f.labelAr)}</dt><dd>${esc(typeof f.value==='object'&&f.value!==null?JSON.stringify(f.value):f.value)}</dd>`).join('')}</dl>`+
      (actions.length?uiLocale.html`<form data-hdr-decision-form><label>الإجراء<select data-hdr-action data-hdr-mutating><option value="">اختر الإجراء</option>${actions.map(([key,v])=>uiLocale.html`<option value="${key}">${v[1]}</option>`).join('')}</select></label><label>ملاحظة المراجعة وأسباب الإجراء<textarea rows="4" data-hdr-note data-hdr-mutating maxlength="2000" required></textarea></label><label class="hdr-check"><input type="checkbox" data-hdr-decision-confirm> راجعت النسخة ${r.source.version} المعروضة وأؤكد تسجيل الإجراء المختار بهويتي وصلاحيتي الفعلية.</label><button type="submit" data-hdr-decide disabled>تسجيل الإجراء على هذه النسخة</button></form>`:uiLocale.html`<p>لا يوجد إجراء قرار متاح في الحالة الحالية. توقيع النسخة يتاح للموقّع بعد اعتمادها من المراجع المستقل.</p>`));note(uiLocale.message('راجع كامل المحتوى والنسخة قبل اختيار الإجراء.'));
    }catch(e){if(current(c)){s.data=null;$('[data-hdr-body]').replaceChildren();note(localErrorMessage(e));}}finally{if(current(c)){s.busy=false;controls();}}
  }
  async function open(mode,org='',id=''){
    if(!auth()?.isAuthenticated?.())return;clear();s.mode=mode;s.org=org;s.id=id;s.session=auth().getSessionVersion?.();dialog.showModal();
    if(mode==='OWNER')await loadOwner();else if(mode==='DETAIL')await loadDetail();else await loadInbox();
  }
  $('[data-hdr-body]').addEventListener('input',e=>{if(e.target.matches('[data-hdr-grant-confirm],[data-hdr-decision-confirm],[data-hdr-revoke-confirm]')){controls();return;}if(s.mode==='OWNER'){s.plan=s.input=null;$('[data-hdr-plan]')?.replaceChildren();}const c=$('[data-hdr-decision-confirm]');if(c)c.checked=false;controls();});
  $('[data-hdr-body]').addEventListener('change',e=>{if(e.target.matches('[data-hdr-grant-confirm],[data-hdr-decision-confirm],[data-hdr-revoke-confirm]'))controls();else if(s.mode==='OWNER'){s.plan=s.input=null;$('[data-hdr-plan]')?.replaceChildren();controls();}else{const c=$('[data-hdr-decision-confirm]');if(c)c.checked=false;controls();}});
  $('[data-hdr-body]').addEventListener('submit',async e=>{
    e.preventDefault();if(s.busy||s.uncertain)return;const c=context();
    if(e.target.matches('[data-hdr-owner-form]')){
      const reviewer=$('[data-hdr-reviewer]')?.value||s.data.source.approvedByAccountId,signer=$('[data-hdr-signer]').value,reason=$('[data-hdr-reason]').value.trim(),hours=Number($('[data-hdr-hours]').value);
      if(!reviewer||!signer||reviewer===signer||reason.length<3||![24,48,72,168].includes(hours)){note(uiLocale.message('اختر شخصين مستقلين وحدد سبب التكليف.'));return;}
      const input={reviewerAccountId:reviewer,signerAccountId:signer,expectedDocumentVersion:s.data.source.version,expiresAt:new Date(Date.now()+hours*3600000).toISOString(),reason};s.busy=true;controls();
      try{const r=await request(c,base(c)+'/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});if(!current(c)||!r)return;validateScope(r,c);if(!/^[a-f0-9]{64}$/.test(r.planHash)||r.source.version!==input.expectedDocumentVersion||r.signer?.accountId!==signer||(r.reviewer?.accountId||r.retainedApprovalAccountId)!==reviewer||r.expiresAt!==input.expiresAt)throw localError(uiLocale.message('خطة التكليف غير متسقة.'));s.plan=r;s.input=input;
        uiLocale.setHTML($('[data-hdr-plan]'), uiLocale.html`<article><h3>راجع نطاق الوصول قبل التأكيد</h3>${summary(r.source)}<p>المراجع/المعتمد: ${uiLocale.messageHTML((r.reviewer ? `${r.reviewer.name} · ${r.reviewer.email}` : uiLocale.message('الاعتماد السابق محفوظ')))}</p><p>الموقّع: ${esc(r.signer.name)} · ${esc(r.signer.email)}</p><p>ينتهي: ${esc(date(r.expiresAt))} بتوقيت الرياض</p><p>الصلاحية لقراءة هذه النسخة وطباعتها، ثم الإجراء المحدد لكل شخص فقط.</p><label class="hdr-check"><input type="checkbox" data-hdr-grant-confirm> راجعت هوية الحسابين والنسخة والمدة وأوافق على إتاحة هذه النسخة لهما ضمن التكليف المعروض.</label><button type="button" data-hdr-apply disabled>تفعيل التكليف المحدد</button></article>`);note(uiLocale.message('المعاينة لم تمنح صلاحية؛ يلزم تأكيد مستقل.'));
      }catch(error){if(current(c)){s.plan=s.input=null;note(localErrorMessage(error));}}finally{if(current(c)){s.busy=false;controls();}}
    }else if(e.target.matches('[data-hdr-decision-form]')){
      if(!$('[data-hdr-decision-confirm]')?.checked||!s.data?.reviewHash)return;
      const body={action:$('[data-hdr-action]').value,expectedVersion:s.data.source.version,reviewHash:s.data.reviewHash,note:$('[data-hdr-note]').value.trim(),confirmed:true};if(!body.action||body.note.length<3)return;
      await write(c, base(c)+'/decisions', body, uiLocale.message('سُجل الإجراء. أعد قراءة الحالة لعرض أحدث نسخة وصلاحية.'));
    }
  });
  async function write(c,path,body,message){
    s.busy=true;controls();note(uiLocale.message('جارٍ تسجيل الإجراء…'));
    try{const r=await request(c,path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!current(c)||!r)return;if(r.schemaVersion!==1||r.organizationId!==c.org||r.documentId!==c.id)throw localError(uiLocale.message('تعذر التحقق من نتيجة الحفظ.'));s.uncertain=true;s.plan=s.input=null;releasePdf();$('[data-hdr-body]').replaceChildren();note(uiLocale.message("{0} اضغط «إعادة قراءة الحالة».", [message]));document.dispatchEvent(new CustomEvent('hydroland:document-review-changed',{detail:{organizationId:c.org,documentId:c.id}}));}
    catch(e){if(current(c)){s.uncertain=true;s.plan=s.input=null;releasePdf();dialog.querySelectorAll('[type=checkbox]').forEach(e=>e.checked=false);$('[data-hdr-plan]')?.replaceChildren();note(uiLocale.message("تعذر تأكيد النتيجة؛ أعد قراءة الحالة قبل أي محاولة أخرى. {0}", [localErrorMessage(e)]));}}
    finally{if(current(c)){s.busy=false;controls();}}
  }
  $('[data-hdr-body]').addEventListener('click',async e=>{
    const c=context();if(s.busy)return;
    if(e.target.closest('[data-hdr-more]')){await loadInbox(true);return;}
    const item=e.target.closest('[data-hdr-open]');if(item){const d=s.data?.items?.[Number(item.dataset.hdrOpen)];if(d)await open('DETAIL',d.organizationId,d.id);return;}
    if(e.target.closest('[data-hdr-apply]')){if(!s.uncertain&&s.plan&&s.input&&$('[data-hdr-grant-confirm]')?.checked)await write(c, base(c)+'/assignment', {...s.input,expectedPlanHash:s.plan.planHash,confirmed:true}, uiLocale.message('حُفظ التكليف المحدد. لم تُمنح عضوية أو صلاحية إدارية عامة.'));return;}
    if(e.target.closest('[data-hdr-revoke]')){const reason=$('[data-hdr-revoke-note]')?.value.trim();if(!s.uncertain&&reason?.length>=3&&$('[data-hdr-revoke-confirm]')?.checked)await write(c, base(c)+'/revoke', {expectedRevision:s.data.current.revision,reason,confirmed:true}, uiLocale.message('أُلغي التكليف؛ الأدلة السابقة محفوظة.'));else note(uiLocale.message('أدخل سبب الإلغاء وأكّد أثره على الوصول اللاحق.'));return;}
    if(e.target.closest('[data-hdr-print]')){
      s.busy=true;controls();releasePdf();const controller=new AbortController();s.controller=controller;const timeout=setTimeout(()=>controller.abort(),30000);
      try{const r=await auth().authorizedFetch(base(c)+'/pdf',{cache:'no-store',signal:controller.signal});if(!current(c))return;if([401,403].includes(r.status)){clear();return;}if(!r.ok||!r.headers.get('content-type')?.includes('application/pdf'))throw localError(uiLocale.message('تعذر فتح PDF؛ أعد قراءة النسخة والصلاحية.'));const b=await r.blob();if(!current(c))return;if(b.size>20000000||await b.slice(0,5).text()!=='%PDF-')throw localError(uiLocale.message('ملف PDF غير صالح.'));if(!current(c))return;s.pdf=URL.createObjectURL(b);$('[data-hdr-pdf-link]').href=s.pdf;$('[data-hdr-pdf-frame]').src=s.pdf;$('[data-hdr-pdf]').hidden=false;note(uiLocale.message('PDF للنسخة المحفوظة؛ لا يُسجل قرارًا بمجرد عرضه.'));}catch(error){if(current(c))note(localErrorMessage(error));}finally{clearTimeout(timeout);if(s.controller===controller)s.controller=null;if(current(c)){s.busy=false;controls();}}
    }
  });
  $('[data-hdr-close]').addEventListener('click',clear);dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});
  $('[data-hdr-reload]').addEventListener('click',()=>{if(s.busy)return;s.generation++;s.uncertain=false;s.plan=s.input=null;releasePdf();if(s.mode==='OWNER')void loadOwner();else if(s.mode==='DETAIL')void loadDetail();else void loadInbox();});
  const entry=document.createElement('button');entry.type='button';entry.dataset.hlInternalReviewInbox='';uiLocale.setMessage(entry, uiLocale.message('مراجعات المستندات المكلّفة'));entry.hidden=true;
  document.querySelector('#profile-dialog .profile-list')?.appendChild(entry);
  function visibility(){const roles=window.HydrolandProfileData?.profile?.roles||[];entry.hidden=!auth()?.isAuthenticated?.()||!roles.some(r=>typeof r==='string'?['STAFF','ADMIN'].includes(r):r?.status==='ACTIVE'&&['STAFF','ADMIN'].includes(r.role));}
  entry.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open('INBOX');});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,()=>{clear();visibility();});
  document.addEventListener('hydroland:profile-data-ready',visibility);visibility();
  document.addEventListener('change',e=>{if(s.mode==='OWNER'&&e.target.matches?.('[data-doc-org]'))clear();});
  window.HydrolandDocumentReviews={openOwner:({organizationId,documentId})=>open('OWNER',organizationId,documentId),openInbox:()=>open('INBOX'),clear};
})();
