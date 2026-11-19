(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("executive-decisions", {
  "صادر ومكلّف": "Issued and assigned",
  "نتيجة بانتظار الإقفال": "Outcome awaiting closure",
  "مصعّد للمراجعة": "Escalated for review",
  "مقفل": "Closed",
  "متراجع عنه": "Withdrawn",
  "الإدارة العليا والحوكمة": "Senior management and governance",
  "الموارد البشرية": "Human resources",
  "التدريب والشهادات": "Training and certifications",
  "العمليات البحرية": "Marine operations",
  "المخزون والخدمات اللوجستية": "Inventory and logistics",
  "المالية": "Finance",
  "السلامة والامتثال والمخاطر": "Safety, compliance and risk",
  "تجربة العميل": "Customer experience",
  "التسويق والنمو": "Marketing and growth",
  "التقنية والأمن": "Technology and security",
  "المرافق والأصول والصيانة": "Facilities, assets and maintenance",
  "الشؤون الإدارية والوثائق": "Administrative affairs and records",
  "الشؤون القانونية": "Legal affairs",
  "البحوث وذكاء السوق": "Research and market intelligence",
  "القرارات التنفيذية والتكليفات": "Executive decisions and assignments",
  "إغلاق": "Close",
  "إصدار تكليف من مصدر محفوظ ومعتمد وموقّع، ثم تسجيل نتيجته ومراجعته وإقفاله. تُنفذ العمليات الوظيفية والمالية والتشغيلية من مساراتها المختصة.": "Issue an assignment from a saved, approved and signed source, then record, review and close its outcome. Employment, financial and operational actions are performed through their respective workflows.",
  "إعادة قراءة الحالة المحفوظة": "Read saved status again",
  "تغيرت الحالة؛ أعد قراءة النتيجة المحفوظة قبل المحاولة.": "The status changed. Read the saved result before retrying.",
  "تعذر إكمال الإجراء؛ أعد قراءة الحالة.": "Could not complete the action. Read status again.",
  "نتيجة غير متسقة؛ لم يُفعّل الإجراء.": "Inconsistent result. The action was not enabled.",
  "مصدر غير متسق.": "Inconsistent source.",
  "المصدر المحفوظ": "Saved source",
  "حقول المصدر غير مكتملة.": "Source fields are incomplete.",
  "رقم القرار": "Decision number",
  "جهة الاعتماد": "Approving authority",
  "نص القرار": "Decision text",
  "قائمة المكلّفين غير متسقة.": "Assignee list is inconsistent.",
  "اختر الموظف المكلّف": "Select assigned employee",
  "اختر المكلّف والمدة ثم راجع المصدر وأكّد الإصدار.": "Select the assignee and duration, review the source, then confirm issuance.",
  "لا يوجد موظف مؤهل في الإدارة المختارة.": "No qualified employee in the selected department.",
  "جارٍ قراءة الحالة والصلاحيات…": "Reading status and permissions…",
  "قائمة القرارات غير متسقة.": "Decision list is inconsistent.",
  "· ينتهي": "· Expires",
  "فتح القرار": "Open decision",
  "لا توجد تكليفات متاحة لحسابك.": "No assignments are available for your account.",
  "عرض المزيد": "Show more",
  "نطاق إصدار القرار غير متسق.": "Decision-issuance scope is inconsistent.",
  "يوجد قرار محفوظ:": "A saved decision exists:",
  "فتح متابعة القرار": "Open decision tracking",
  "تكليف التنفيذ": "Execution assignment",
  "الإدارة المسؤولة": "Responsible department",
  "الموظف المكلّف": "Assigned employee",
  "نهاية مدة التكليف — حتى 7 أيام، بالتوقيت المحلي": "Assignment end — up to 7 days, local time",
  "توجيه التنفيذ": "Execution direction",
  "راجعت المصدر المستقل والموظف والنطاق والمدة وأؤكد الإصدار.": "I have reviewed the independent source, employee, scope and duration and confirm issuance.",
  "إصدار التكليف وحفظه": "Issue and save assignment",
  "حالة القرار غير متسقة.": "Decision status is inconsistent.",
  "تسجيل نتيجة التنفيذ": "Record execution outcome",
  "تصعيد للمراجعة": "Escalate for review",
  "إقفال القرار بعد مراجعة النتيجة": "Close decision after outcome review",
  "التراجع عن التكليف": "Withdraw assignment",
  "انتهت مدة التكليف.": "Assignment period expired.",
  "تغيرت صلاحية الإصدار؛ يمكن للمالك الحالي التراجع عن التكليف فقط.": "Issuance authority changed. The current owner can only withdraw the assignment.",
  "تغير المصدر؛ التنفيذ والإقفال محجوبان.": "Source changed. Execution and closure are blocked.",
  "دليل النتيجة المحفوظ": "Saved outcome evidence",
  "· الإصدار": "· Version",
  "إجراء على النسخة المحفوظة": "Action on the saved version",
  "الإجراء": "Action",
  "مستند نتيجة معتمد وموقّع": "Approved and signed outcome document",
  "اختر دليل التنفيذ": "Select execution evidence",
  "الملاحظة والسبب": "Note and reason",
  "راجعت الحالة والدليل وأؤكد تسجيل هذا الإجراء من حسابي.": "I have reviewed the status and evidence and confirm recording this action from my account.",
  "تسجيل الإجراء": "Record action",
  "لا يوجد إجراء متاح لحسابك في هذه الحالة.": "No action is available to your account in this status.",
  "سجل الانتقالات المحفوظة": "Saved transition history",
  "المعروض أحدث 50 انتقالًا.": "Showing the latest 50 transitions.",
  "حالة محفوظة؛ راجع التفاصيل قبل أي إجراء.": "Saved status. Review details before any action.",
  "جارٍ حفظ الإجراء…": "Saving the action…",
  "تعذر التحقق من نتيجة الحفظ.": "Could not verify the saved result.",
  "حُفظ الإجراء. أعد قراءة الحالة لعرض النتيجة وأحدث الصلاحيات.": "Action saved. Read status again for the result and latest authority.",
  "لا يُعاد إرسال الطلب تلقائيًا.": "The request is not resent automatically.",
  "اختر دليل نتيجة محفوظًا ومعتمدًا وموقّعًا يخص هذا القرار.": "Select saved, approved and signed outcome evidence for this decision.",
  "القرارات التنفيذية المكلّفة": "Assigned executive decisions",
  "{0} لا يُعاد إرسال الطلب تلقائيًا.": "{0} The request is not resent automatically."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if(window.HydrolandExecutiveDecisions)return;
  const POLICY='SIGNED_EXECUTIVE_FOLLOWUP_V1',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={ISSUED:'صادر ومكلّف',REPORTED:'نتيجة بانتظار الإقفال',ESCALATED:'مصعّد للمراجعة',CLOSED:'مقفل',RETRACTED:'متراجع عنه'};
  const departments={EXECUTIVE_GOVERNANCE:'الإدارة العليا والحوكمة',HR:'الموارد البشرية',TRAINING:'التدريب والشهادات',MARINE_OPERATIONS:'العمليات البحرية',INVENTORY_LOGISTICS:'المخزون والخدمات اللوجستية',FINANCE:'المالية',SAFETY_COMPLIANCE_RISK:'السلامة والامتثال والمخاطر',CUSTOMER_EXPERIENCE:'تجربة العميل',MARKETING_GROWTH:'التسويق والنمو',TECHNOLOGY_CYBERSECURITY:'التقنية والأمن',FACILITIES_ASSETS_MAINTENANCE:'المرافق والأصول والصيانة',ADMIN_AFFAIRS_RECORDS:'الشؤون الإدارية والوثائق',LEGAL_CONTRACTS_INSURANCE:'الشؤون القانونية',RND_MARKET_INTELLIGENCE:'البحوث وذكاء السوق'};
  const auth=()=>window.HydrolandAuth,session=()=>auth()?.getSessionVersion?.();
  const dialog=document.createElement('dialog');dialog.id='hl-executive-decisions';dialog.setAttribute('aria-labelledby','hed-title');
  uiLocale.setHTML(dialog, uiLocale.html`<header><h2 id="hed-title">القرارات التنفيذية والتكليفات</h2><button type="button" data-hed-close>إغلاق</button></header><p>إصدار تكليف من مصدر محفوظ ومعتمد وموقّع، ثم تسجيل نتيجته ومراجعته وإقفاله. تُنفذ العمليات الوظيفية والمالية والتشغيلية من مساراتها المختصة.</p><p data-hed-status role="status" aria-live="polite"></p><button type="button" data-hed-reload>إعادة قراءة الحالة المحفوظة</button><div data-hed-body></div>`);
  const style=document.createElement('style');uiLocale.setMessage(style, '#hl-executive-decisions{box-sizing:border-box;width:min(850px,94vw);max-height:92vh;overflow:auto;border:1px solid #33819d;border-radius:14px;padding:24px;background:#f5f8fa;color:#153247;font:15px/1.8 Arial,sans-serif}#hl-executive-decisions::backdrop{background:#071e30b3}#hl-executive-decisions *{box-sizing:border-box;overflow-wrap:anywhere}#hl-executive-decisions header{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #1297c0}#hl-executive-decisions button{background:#153247;color:white;padding:10px 14px;border:0;border-radius:7px;cursor:pointer}#hl-executive-decisions button:disabled{opacity:.45;cursor:not-allowed}#hl-executive-decisions label{display:grid;gap:6px;margin:14px 0}#hl-executive-decisions input:not([type=checkbox]),#hl-executive-decisions select,#hl-executive-decisions textarea{width:100%;padding:9px;border:1px solid #aac1cd;font:inherit}#hl-executive-decisions article,#hl-executive-decisions dl{padding:12px;background:white;border:1px solid #cfdee6;margin:14px 0}#hl-executive-decisions dt{font-weight:bold}#hl-executive-decisions dd{margin:4px 0 12px;white-space:pre-wrap}#hl-executive-decisions fieldset{min-width:0;border:1px solid #aac1cd}@media(max-width:600px){#hl-executive-decisions{padding:14px}#hl-executive-decisions h2{font-size:20px}}');document.head.appendChild(style);document.body.appendChild(dialog);
  const $=q=>dialog.querySelector(q),s={generation:0,mode:'INBOX',org:'',id:'',session:null,data:null,busy:false,uncertain:false,controller:null,picker:0};
  const ctx=()=>({generation:s.generation,mode:s.mode,org:s.org,id:s.id,session:s.session});
  const current=c=>dialog.open&&c.generation===s.generation&&c.mode===s.mode&&c.org===s.org&&c.id===s.id&&c.session===session()&&auth()?.isAuthenticated?.();
  const message=t=>{uiLocale.setMessage($('[data-hed-status]'), t);};
  function controls(){for(const e of dialog.querySelectorAll('fieldset,button[data-hed-open],button[data-hed-more]'))e.disabled=s.busy||s.uncertain;$('[data-hed-reload]').disabled=s.busy;const issue=$('[data-hed-issue]');if(issue)issue.disabled=s.busy||s.uncertain||!$('[data-hed-confirm]')?.checked||!$('[data-hed-worker]')?.value;const act=$('[data-hed-transition]');if(act)act.disabled=s.busy||s.uncertain||!$('[data-hed-confirm]')?.checked;}
  function clear(){s.generation++;s.picker++;s.controller?.abort();s.controller=null;s.data=null;s.busy=false;s.uncertain=false;$('[data-hed-body]').replaceChildren();message('');if(dialog.open)dialog.close();}
  const root=c=>`/executive-decisions/organizations/${encodeURIComponent(c.org)}/documents/${encodeURIComponent(c.id)}`;
  async function request(c,path,init={}){const controller=new AbortController();s.controller=controller;const timeout=setTimeout(()=>controller.abort(),30000);try{const r=await auth().authorizedFetch(path,{cache:'no-store',...init,signal:controller.signal});const body=await r.json().catch(()=>null);if(!current(c))return null;if([401,403].includes(r.status)){clear();return null;}if(!r.ok)throw localError((r.status===409 ? uiLocale.message('تغيرت الحالة؛ أعد قراءة النتيجة المحفوظة قبل المحاولة.') : uiLocale.message('تعذر إكمال الإجراء؛ أعد قراءة الحالة.')));if(!body||body.policy!==POLICY)throw localError(uiLocale.message('نتيجة غير متسقة؛ لم يُفعّل الإجراء.'));return body;}finally{clearTimeout(timeout);if(s.controller===controller)s.controller=null;}}
  const scoped=(v,c)=>v&&v.organizationId===c.org&&v.documentId===c.id;
  const validCase=(v,c)=>scoped(v,c)&&v.policy===POLICY&&Object.hasOwn(labels,v.state)&&typeof v.revision==='string'&&Number.isInteger(v.sourceVersion)&&v.sourceVersion>0&&typeof v.note==='string'&&Number.isFinite(Date.parse(v.expiresAt));
  const sourceHtml=d=>{if(!d||typeof d.referenceNumber!=='string'||!d.payload||typeof d.payload!=='object')throw localError(uiLocale.message('مصدر غير متسق.'));return uiLocale.html`<h3>المصدر المحفوظ</h3><p>${esc(d.referenceNumber)}</p><dl>${['decisionNo','authority','decision'].map(k=>{if(typeof d.payload[k]!=='string')throw localError(uiLocale.message('حقول المصدر غير مكتملة.'));return uiLocale.html`<dt>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))({decisionNo:'رقم القرار',authority:'جهة الاعتماد',decision:'نص القرار'}[k]))}</dt><dd>${esc(d.payload[k])}</dd>`;}).join('')}</dl>`;};
  async function picker(c){const select=$('[data-hed-worker]'),department=$('[data-hed-department]')?.value,serial=++s.picker;if(!select)return;select.replaceChildren();$('[data-hed-confirm]').checked=false;s.busy=true;controls();try{const r=await request(c,`/executive-decisions/organizations/${encodeURIComponent(c.org)}/candidates?department=${encodeURIComponent(department)}`);if(!current(c)||!r||serial!==s.picker)return;if(r.organizationId!==c.org||r.department!==department||!Array.isArray(r.items)||r.items.length>50||r.items.some(p=>typeof p.accountId!=='string'||typeof p.name!=='string'||typeof p.jobTitle!=='string'||typeof p.bindingHash!=='string'||!/^[a-f0-9]{64}$/.test(p.bindingHash)))throw localError(uiLocale.message('قائمة المكلّفين غير متسقة.'));uiLocale.setHTML(select, uiLocale.html`<option value="">اختر الموظف المكلّف</option>${r.items.map(p=>uiLocale.html`<option value="${esc(p.accountId)}" data-binding="${esc(p.bindingHash)}">${esc(p.name)} — ${esc(p.jobTitle)}</option>`).join('')}`);message((r.items.length ? uiLocale.message('اختر المكلّف والمدة ثم راجع المصدر وأكّد الإصدار.') : uiLocale.message('لا يوجد موظف مؤهل في الإدارة المختارة.')));}catch(e){if(current(c)){select.replaceChildren();message(localErrorMessage(e));}}finally{if(current(c)&&serial===s.picker){s.busy=false;controls();}}}
  async function load(more=false){s.generation++;const c=ctx();s.busy=true;s.uncertain=false;s.controller?.abort();const previous=more?s.data:null;if(!more)$('[data-hed-body]').replaceChildren();controls();message(uiLocale.message('جارٍ قراءة الحالة والصلاحيات…'));
    try{
      if(s.mode==='INBOX'){
        const r=await request(c,'/executive-decisions/inbox'+(more&&previous?.nextCursor?'?cursor='+encodeURIComponent(previous.nextCursor):''));if(!current(c)||!r)return;
        if(!Array.isArray(r.items)||r.items.length>20||r.items.some(x=>typeof x.organizationId!=='string'||typeof x.documentId!=='string'||typeof x.decisionNumber!=='string'||!Object.hasOwn(labels,x.state))||r.nextCursor!==null&&(typeof r.nextCursor!=='string'||r.nextCursor.length>400||!r.nextCursor.startsWith('EXECUTIVE_DECISION:v1:')))throw localError(uiLocale.message('قائمة القرارات غير متسقة.'));
        s.data={...r,items:[...(previous?.items||[]),...r.items]};uiLocale.setHTML($('[data-hed-body]'), s.data.items.map((x,i)=>uiLocale.html`<article><strong>${esc(x.decisionNumber)}</strong><p>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(labels[x.state]))} · ينتهي ${esc(new Date(x.expiresAt).toLocaleString('ar-SA'))}</p><button type="button" data-hed-open="${i}">فتح القرار</button></article>`).join('')||uiLocale.html`<p>لا توجد تكليفات متاحة لحسابك.</p>`);if(r.nextCursor)uiLocale.insertHTML($('[data-hed-body]'), 'beforeend', uiLocale.html`<button type="button" data-hed-more>عرض المزيد</button>`);
      }else if(s.mode==='OWNER'){
        const r=await request(c,root(c)+'/source');if(!current(c)||!r)return;if(!scoped(r,c)||!Number.isInteger(r.sourceVersion)||!/^[a-f0-9]{64}$/.test(r.sourceHash)||!/^[a-f0-9]{64}$/.test(r.ownerBinding)||r.current&&!validCase(r.current,c))throw localError(uiLocale.message('نطاق إصدار القرار غير متسق.'));s.data=r;
        uiLocale.setHTML($('[data-hed-body]'), sourceHtml(r.source)+(r.current?uiLocale.html`<p>يوجد قرار محفوظ: ${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(labels[r.current.state]))}</p><button type="button" data-hed-current>فتح متابعة القرار</button>`:uiLocale.html`<form data-hed-issue-form><fieldset><legend>تكليف التنفيذ</legend><label>الإدارة المسؤولة<select data-hed-department>${Object.entries(departments).map(([k,v])=>uiLocale.html`<option value="${k}">${uiLocale.messageHTML(uiLocale.message(v))}</option>`).join('')}</select></label><label>الموظف المكلّف<select data-hed-worker required></select></label><label>نهاية مدة التكليف — حتى 7 أيام، بالتوقيت المحلي<input data-hed-expiry type="datetime-local" required></label><label>توجيه التنفيذ<textarea data-hed-note maxlength="2000" minlength="3" required rows="3"></textarea></label><label><span><input data-hed-confirm type="checkbox"> راجعت المصدر المستقل والموظف والنطاق والمدة وأؤكد الإصدار.</span></label><button data-hed-issue type="submit" disabled>إصدار التكليف وحفظه</button></fieldset></form>`));
        if(!r.current){const date=new Date(Date.now()+86400000);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());$('[data-hed-expiry]').value=date.toISOString().slice(0,16);s.busy=false;await picker(c);return;}
      }else{
        const r=await request(c,root(c));if(!current(c)||!r)return;if(!scoped(r,c)||!validCase(r.current,c)||typeof r.sourceCurrent!=='boolean'||typeof r.expired!=='boolean'||typeof r.authorityCurrent!=='boolean'||!r.actions||['report','escalate','close','retract'].some(k=>typeof r.actions[k]!=='boolean')||!Array.isArray(r.history)||r.history.length>50||r.history.some(v=>!validCase(v,c))||!Array.isArray(r.results)||r.results.length>20||r.results.some(v=>typeof v.documentId!=='string'||typeof v.referenceNumber!=='string'))throw localError(uiLocale.message('حالة القرار غير متسقة.'));s.data=r;
        const actions=[['REPORT','report','تسجيل نتيجة التنفيذ'],['ESCALATE','escalate','تصعيد للمراجعة'],['CLOSE','close','إقفال القرار بعد مراجعة النتيجة'],['RETRACT','retract','التراجع عن التكليف']].filter(([,k])=>r.actions[k]);
        uiLocale.setHTML($('[data-hed-body]'), sourceHtml(r.source)+uiLocale.html`<p><strong>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(labels[r.current.state]))}</strong> · ينتهي ${esc(new Date(r.current.expiresAt).toLocaleString('ar-SA'))}</p>${r.expired?uiLocale.html`<p>انتهت مدة التكليف.</p>`:''}${!r.authorityCurrent?uiLocale.html`<p>تغيرت صلاحية الإصدار؛ يمكن للمالك الحالي التراجع عن التكليف فقط.</p>`:''}${!r.sourceCurrent?uiLocale.html`<p>تغير المصدر؛ التنفيذ والإقفال محجوبان.</p>`:''}${r.current.result?uiLocale.html`<article><h3>دليل النتيجة المحفوظ</h3><p>${esc(r.current.result.referenceNumber)} · الإصدار ${esc(r.current.result.version)}</p><p>${esc(r.current.result.payload?.evidence)}</p></article>`:''}`+(actions.length?uiLocale.html`<form data-hed-action-form><fieldset><legend>إجراء على النسخة المحفوظة</legend><label>الإجراء<select data-hed-action>${actions.map(([v,,label])=>uiLocale.html`<option value="${v}">${esc(label)}</option>`).join('')}</select></label><label data-hed-result-label>مستند نتيجة معتمد وموقّع<select data-hed-result><option value="">اختر دليل التنفيذ</option>${r.results.map(x=>uiLocale.html`<option value="${esc(x.documentId)}">${esc(x.referenceNumber)}</option>`).join('')}</select></label><label>الملاحظة والسبب<textarea data-hed-note rows="3" maxlength="2000" minlength="3" required></textarea></label><label><span><input data-hed-confirm type="checkbox"> راجعت الحالة والدليل وأؤكد تسجيل هذا الإجراء من حسابي.</span></label><button type="submit" data-hed-transition disabled>تسجيل الإجراء</button></fieldset></form>`:uiLocale.html`<p>لا يوجد إجراء متاح لحسابك في هذه الحالة.</p>`)+uiLocale.html`<h3>سجل الانتقالات المحفوظة</h3>${r.history.map(x=>uiLocale.html`<article><strong>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))(labels[x.state]))}</strong><p>${esc(new Date(x.updatedAt).toLocaleString('ar-SA'))}</p><p>${esc(x.note)}</p></article>`).join('')}${r.hasMoreHistory?uiLocale.html`<p>المعروض أحدث 50 انتقالًا.</p>`:''}`);resultVisibility();
      }
      message(uiLocale.message('حالة محفوظة؛ راجع التفاصيل قبل أي إجراء.'));
    }catch(e){if(current(c)){s.data=null;$('[data-hed-body]').replaceChildren();message(localErrorMessage(e));}}
    finally{if(current(c)){s.busy=false;controls();}}
  }
  function resultVisibility(){const label=$('[data-hed-result-label]');if(label)label.hidden=$('[data-hed-action]')?.value!=='REPORT';}
  async function write(c,path,body){s.busy=true;controls();message(uiLocale.message('جارٍ حفظ الإجراء…'));try{const r=await request(c,path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!current(c)||!r)return;if(!validCase(r,c))throw localError(uiLocale.message('تعذر التحقق من نتيجة الحفظ.'));s.uncertain=true;message(uiLocale.message('حُفظ الإجراء. أعد قراءة الحالة لعرض النتيجة وأحدث الصلاحيات.'));}catch(e){if(current(c)){s.uncertain=true;message(uiLocale.message("{0} لا يُعاد إرسال الطلب تلقائيًا.", [localErrorMessage(e)]));}}finally{if(current(c)){s.busy=false;const confirm=$('[data-hed-confirm]');if(confirm)confirm.checked=false;controls();}}}
  $('[data-hed-body]').addEventListener('submit',async e=>{e.preventDefault();const c=ctx();if(!current(c)||s.busy||s.uncertain||!s.data||!$('[data-hed-confirm]')?.checked)return;const note=$('[data-hed-note]')?.value.trim();if(!note||note.length<3)return;
    if(e.target.matches('[data-hed-issue-form]')){const expiresAt=new Date($('[data-hed-expiry]').value);if(!Number.isFinite(expiresAt.getTime()))return;await write(c,root(c)+'/issue',{expectedVersion:s.data.sourceVersion,sourceHash:s.data.sourceHash,ownerBinding:s.data.ownerBinding,workerBinding:$('[data-hed-worker]').selectedOptions[0]?.dataset.binding,assigneeAccountId:$('[data-hed-worker]').value,department:$('[data-hed-department]').value,expiresAt:expiresAt.toISOString(),note,confirmed:true});}
    else{const action=$('[data-hed-action]').value,resultDocumentId=$('[data-hed-result]').value;if(action==='REPORT'&&!resultDocumentId){message(uiLocale.message('اختر دليل نتيجة محفوظًا ومعتمدًا وموقّعًا يخص هذا القرار.'));return;}await write(c,root(c)+'/transitions',{action,expectedRevision:s.data.current.revision,note,confirmed:true,...(action==='REPORT'?{resultDocumentId}:{})});}
  });
  $('[data-hed-body]').addEventListener('input',e=>{if(!e.target.matches('[data-hed-confirm]')){const c=$('[data-hed-confirm]');if(c)c.checked=false;}controls();});
  $('[data-hed-body]').addEventListener('change',e=>{if(e.target.matches('[data-hed-department]')&&!s.busy)void picker(ctx());resultVisibility();controls();});
  $('[data-hed-body]').addEventListener('click',e=>{if(s.busy)return;const b=e.target.closest('[data-hed-open]');if(b){const item=s.data?.items?.[Number(b.dataset.hedOpen)];if(item)void open('DETAIL',item.organizationId,item.documentId);}else if(e.target.closest('[data-hed-current]'))void open('DETAIL',s.org,s.id);else if(e.target.closest('[data-hed-more]')&&!s.uncertain)void load(true);});
  async function open(mode,org='',id=''){if(!auth()?.isAuthenticated?.())return;clear();s.mode=mode;s.org=org;s.id=id;s.session=session();dialog.showModal();await load();}
  $('[data-hed-reload]').addEventListener('click',()=>{if(!s.busy)void load();});$('[data-hed-close]').addEventListener('click',clear);dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});
  const entry=document.createElement('button');entry.type='button';entry.dataset.hlExecutiveInbox='';uiLocale.setMessage(entry, uiLocale.message('القرارات التنفيذية المكلّفة'));entry.hidden=true;document.querySelector('#profile-dialog .profile-list')?.appendChild(entry);
  function visibility(){const roles=window.HydrolandProfileData?.profile?.roles||[];entry.hidden=!auth()?.isAuthenticated?.()||!roles.some(r=>typeof r==='string'?['STAFF','ADMIN'].includes(r):r?.status==='ACTIVE'&&['STAFF','ADMIN'].includes(r.role));}
  entry.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();void open('INBOX');});for(const name of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed'])document.addEventListener(name,()=>{clear();visibility();});document.addEventListener('hydroland:profile-data-ready',visibility);visibility();
  document.addEventListener('change',e=>{if(s.mode==='OWNER'&&e.target.matches?.('[data-doc-org]'))clear();});
  window.HydrolandExecutiveDecisions={openOwner:({organizationId,documentId})=>open('OWNER',organizationId,documentId),openInbox:()=>open('INBOX'),clear};
})();
