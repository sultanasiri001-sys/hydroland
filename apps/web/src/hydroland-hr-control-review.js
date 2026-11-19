(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("hr-control-review", {
  "صفحات طلبات الضوابط": "Control request pages",
  "ضوابط الموارد البشرية · المراجع والأدلة": "HR controls · References and evidence",
  "تهيئة ضوابط اعتماد الموارد البشرية": "Configure HR approval controls",
  "تحديث الضوابط": "Refresh controls",
  "أدخل مراجع المتطلبات ونسخها وأدلتها المعتمدة من الحوكمة القانونية. الحفظ ينشئ طلبًا فقط؛ المراجعة ثم الاعتماد بحسابين مستقلين يسبقان التفعيل. الضابط النافذ يبقى ساريًا أثناء مراجعة التعديل.": "Enter requirement references, versions and evidence approved by legal governance. Saving creates a request only. Review and approval by two independent accounts precede activation. An effective control remains valid while a change is reviewed.",
  "مراجعة المالك المؤقتة": "Temporary owner review",
  "للاختبار والتهيئة، يمكن لمالك هيدرولاند تنفيذ مراحل مراجعة القوالب وضوابط الموارد البشرية من حسابه لمدة محددة لا تتجاوز 24 ساعة، مع تسجيل القرارات. لا تُضاف أدوار أو تعيينات، ولا يسمح هذا الوضع باعتماد الموظف لتعيينه أو بتوقيع العقود بدل أطرافها. تبقى المراجع والأدلة واجبة. المراجعة القانونية لقوالب الموظفين تتطلب مختصًا مستقلاً، ولا يتيحها هذا الوضع. انتهاء المدة لا يسحب قالبًا أو ضابطًا سبق اعتماده.": "For testing and setup, the Hydroland owner can perform template and HR-control review stages from their account for a specified period of up to 24 hours, with decisions recorded. No roles or appointments are added. This mode does not permit self-approval of employment or signing contracts on behalf of the parties. References and evidence remain mandatory. Employee-template legal review requires an independent specialist and is unavailable in this mode. Expiry does not withdraw a previously approved template or control.",
  "مدة مراجعة المالك المؤقتة": "Temporary owner-review duration",
  "ساعة واحدة": "One hour",
  "أربع ساعات": "Four hours",
  "24 ساعة": "24 hours",
  "سبب تغيير صلاحية المراجعة المؤقتة": "Reason for changing temporary review authority",
  "أقر بتغيير شرط فصل المراجعات مؤقتًا لحساب المالك فقط في القوالب وضوابط الموارد البشرية": "I acknowledge temporarily changing review separation for the owner's account only, for templates and HR controls",
  "تفعيل مراجعة المالك مؤقتًا": "Enable temporary owner review",
  "إيقاف مراجعة المالك المؤقتة": "Disable temporary owner review",
  "طلب ضبط المراجع والأدلة": "Reference and evidence configuration request",
  "رمز ضابط الموارد البشرية": "HR control code",
  "اسم الضابط": "Control name",
  "مرجع المتطلب المعتمد": "Approved requirement reference",
  "نسخة المتطلب": "Requirement version",
  "مرجع اعتماد الحوكمة القانونية": "Legal-governance approval reference",
  "مراجع الأدلة، مرجع واحد في كل سطر": "Evidence references, one per line",
  "سبب طلب ضبط المراجع": "Reason for reference-configuration request",
  "راجعت المراجع والأدلة ومرجع اعتماد الحوكمة القانونية وأطلب مراجعتها المستقلة": "I have reviewed references, evidence and legal-governance approval and request independent review",
  "حفظ طلب الضابط دون تفعيل": "Save control request without activation",
  "طلبات مراجعة الضوابط": "Control review requests",
  "طلبات ضوابط أحدث": "Newer control requests",
  "طلبات ضوابط أقدم": "Older control requests",
  "بانتظار مراجعة مستقلة": "Awaiting independent review",
  "بانتظار اعتماد مستقل": "Awaiting independent approval",
  "ضابط معتمد ومفعّل": "Control approved and enabled",
  "طلب مرفوض": "Request rejected",
  "تغيرت نسخة الضابط؛ راجع المراجع والأدلة ثم أكد الطلب.": "Control version changed. Review references and evidence, then confirm the request.",
  "تعذر إكمال إجراء الضابط.": "Could not complete the control action.",
  "استجابة صلاحية المراجعة المؤقتة غير مكتملة.": "Temporary review-authority response is incomplete.",
  "مفعّلة حتى": "Enabled until",
  "بتوقيت السعودية. تنتهي تلقائيًا ويعود فصل المراجعات للقرارات التالية.": "Saudi time. It expires automatically, and review separation resumes for subsequent decisions.",
  "غير مفعّلة؛ تسري المراجعات المستقلة المعتادة.": "Disabled. Normal independent reviews apply.",
  "مرجع المتطلب:": "Requirement reference:",
  "· النسخة:": "· Version:",
  "مفعّل": "Enabled",
  "قيد المراجعة": "Under review",
  "غير مفعّل": "Disabled",
  "غير متاح": "Unavailable",
  "غير متاحة": "Unavailable",
  "لا توجد ضوابط موارد بشرية محفوظة.": "No saved HR controls.",
  "حفظ مراجعة الضابط": "Save control review",
  "اعتماد الضابط وتفعيله": "Approve and enable control",
  "رفض طلب الضابط": "Reject control request",
  "· مرجع المتطلب:": "· Requirement reference:",
  "مرجع اعتماد الحوكمة القانونية:": "Legal-governance approval reference:",
  "مراجع الأدلة:": "Evidence references:",
  "سبب الطلب:": "Request reason:",
  "حالة غير متاحة": "Status unavailable",
  "سجلت مرحلة بصلاحية المالك المؤقتة، تنتهي في": "A stage was recorded using temporary owner authority, expiring on",
  "ملاحظة المراجع:": "Reviewer note:",
  "ملاحظة القرار:": "Decision note:",
  "سبب قرار الضابط": "Reason for control decision",
  "راجعت المراجع والأدلة واعتماد الحوكمة القانونية واستقلال الأطراف وأثر تفعيل الضابط على اعتماد الموارد البشرية": "I have reviewed references, evidence, legal-governance approval, party independence and the control's effect on HR approval",
  "المراجعة والاعتماد متاحان للأطراف المستقلة المخولة بحسب حالة الطلب.": "Review and approval are available to independent authorized parties according to request status.",
  "لا توجد طلبات مراجعة للضوابط.": "No control review requests.",
  "جارٍ تحميل مراجع الضوابط…": "Loading control references…",
  "استجابة مراجع الضوابط غير مكتملة.": "Control-reference response is incomplete.",
  "وقت قراءة الضوابط:": "Control read time:",
  "تعذر تحميل الضوابط.": "Could not load controls.",
  "جارٍ حفظ طلب الضابط…": "Saving control request…",
  "تعذر تأكيد الحفظ؛ حدّث الضوابط للتحقق.": "Could not confirm saving. Refresh controls to verify.",
  "تعذر حفظ طلب الضابط.": "Could not save control request.",
  "جارٍ حفظ تغيير الصلاحية المؤقتة…": "Saving temporary-authority change…",
  "تعذر تأكيد الإعداد؛ حدّث الضوابط للتحقق.": "Could not confirm the setting. Refresh controls to verify.",
  "فُعّلت مراجعة المالك مؤقتًا. لم تعتمد قوالب أو ضوابط ولم تتغير صلاحيات موظفين.": "Temporary owner review enabled. No templates or controls were approved, and employee permissions were unchanged.",
  "أوقفت مراجعة المالك المؤقتة. لا يمكن إعادة استخدام مراجعات الاستثناء غير المعتمدة.": "Temporary owner review disabled. Unapproved exception reviews cannot be reused.",
  "تعذر حفظ تغيير الصلاحية.": "Could not save authority change.",
  "حُفظ طلب الضابط دون تفعيل؛ يلزم مراجع ومعتمد مستقلان.": "Control request saved without activation. Independent reviewer and approver required.",
  "تم اعتماد الضابط وتفعيل مراجع الضبط وتسجيل القرار.": "Control approved, reference controls enabled and decision recorded.",
  "حُفظ قرار مراجعة الضابط دون تفعيل تلقائي.": "Control review decision saved without automatic activation.",
  "مفعّلة حتى {0} بتوقيت السعودية. تنتهي تلقائيًا ويعود فصل المراجعات للقرارات التالية.": "Enabled until {0} Saudi time. It expires automatically, and review separation resumes for subsequent decisions.",
  "وقت قراءة الضوابط: {0}": "Control read time: {0}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


 const mount=()=>{
 const host=document.getElementById('hl-admin-employees');if(!host)return false;if(window.HydrolandHrControlReview)return true;
 const box=document.createElement('details');box.dataset.hrControlReview='';box.className='hl-staff-controls';
 uiLocale.setHTML(box, uiLocale.html`<summary>ضوابط الموارد البشرية · المراجع والأدلة</summary><section><header><h4>تهيئة ضوابط اعتماد الموارد البشرية</h4><button type="button" data-hr-control-refresh>تحديث الضوابط</button></header><p>أدخل مراجع المتطلبات ونسخها وأدلتها المعتمدة من الحوكمة القانونية. الحفظ ينشئ طلبًا فقط؛ المراجعة ثم الاعتماد بحسابين مستقلين يسبقان التفعيل. الضابط النافذ يبقى ساريًا أثناء مراجعة التعديل.</p><p role="status" data-hr-control-feedback></p><section data-owner-review-panel hidden><h4>مراجعة المالك المؤقتة</h4><p>للاختبار والتهيئة، يمكن لمالك هيدرولاند تنفيذ مراحل مراجعة القوالب وضوابط الموارد البشرية من حسابه لمدة محددة لا تتجاوز 24 ساعة، مع تسجيل القرارات. لا تُضاف أدوار أو تعيينات، ولا يسمح هذا الوضع باعتماد الموظف لتعيينه أو بتوقيع العقود بدل أطرافها. تبقى المراجع والأدلة واجبة. المراجعة القانونية لقوالب الموظفين تتطلب مختصًا مستقلاً، ولا يتيحها هذا الوضع. انتهاء المدة لا يسحب قالبًا أو ضابطًا سبق اعتماده.</p><p data-owner-review-status></p><form data-owner-review-change><fieldset><label>مدة مراجعة المالك المؤقتة<select name="durationMinutes"><option value="60">ساعة واحدة</option><option value="240">أربع ساعات</option><option value="1440">24 ساعة</option></select></label><label>سبب تغيير صلاحية المراجعة المؤقتة<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>أقر بتغيير شرط فصل المراجعات مؤقتًا لحساب المالك فقط في القوالب وضوابط الموارد البشرية</label><button type="submit" name="action" value="ENABLE">تفعيل مراجعة المالك مؤقتًا</button><button type="submit" name="action" value="DISABLE">إيقاف مراجعة المالك المؤقتة</button></fieldset><p role="status" data-owner-review-message></p></form></section><div data-hr-control-active></div><h4>طلب ضبط المراجع والأدلة</h4><form data-hr-control-request><fieldset><div class="hl-staff-grid"><label>رمز ضابط الموارد البشرية<input name="ruleKey" required maxlength="100" placeholder="HR-LAB-EMP-001" autocomplete="off"></label><label>اسم الضابط<input name="labelAr" required maxlength="160" autocomplete="off"></label><label>مرجع المتطلب المعتمد<input name="regulatoryRequirementId" required maxlength="200" autocomplete="off"></label><label>نسخة المتطلب<input name="regulatoryVersion" required maxlength="100" autocomplete="off"></label><label>مرجع اعتماد الحوكمة القانونية<input name="legalApprovalReference" required maxlength="200" autocomplete="off"></label></div><label>مراجع الأدلة، مرجع واحد في كل سطر<textarea name="evidenceIds" required rows="3" maxlength="4020"></textarea></label><label>سبب طلب ضبط المراجع<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>راجعت المراجع والأدلة ومرجع اعتماد الحوكمة القانونية وأطلب مراجعتها المستقلة</label><button type="submit">حفظ طلب الضابط دون تفعيل</button></fieldset><p role="status" data-hr-control-message></p></form><h4>طلبات مراجعة الضوابط</h4><div data-hr-control-proposals></div><nav aria-label="صفحات طلبات الضوابط"><button type="button" data-hr-control-previous>طلبات ضوابط أحدث</button><button type="button" data-hr-control-next>طلبات ضوابط أقدم</button></nav></section>`);
 host.querySelector('[data-staff-readiness]').after(box);
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.getCurrentRole?.()==='admin'&&access()?.roleAllowed?.('admin')&&!host.hidden&&box.open);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const form=box.querySelector('[data-hr-control-request]'),feedback=box.querySelector('[data-hr-control-feedback]'),active=box.querySelector('[data-hr-control-active]'),proposals=box.querySelector('[data-hr-control-proposals]');
 const labels={PROPOSED:'بانتظار مراجعة مستقلة',REVIEWED:'بانتظار اعتماد مستقل',APPLIED:'ضابط معتمد ومفعّل',REJECTED:'طلب مرفوض'};
 const ownerPanel=box.querySelector('[data-owner-review-panel]'),ownerForm=box.querySelector('[data-owner-review-change]');
 let version=0,busy=false,controls=[],cursor=null,nextCursor=null,history=[],ownerMode=null;
 const current=(v,s)=>v===version&&s===auth()?.getSessionVersion?.()&&eligible();
 function lock(){box.querySelectorAll('fieldset,button').forEach(e=>e.disabled=busy);box.querySelector('[data-hr-control-previous]').disabled=busy||!history.length;box.querySelector('[data-hr-control-next]').disabled=busy||!nextCursor;ownerForm.querySelector('[value=ENABLE]').disabled=busy||!ownerMode?.canManage||ownerMode.active;ownerForm.querySelector('[value=DISABLE]').disabled=busy||!ownerMode?.active;}
 function syncTarget(){const key=form.elements.ruleKey.value.trim().toUpperCase(),base=controls.find(c=>c.ruleKey===key)?.revision||'';if(form.dataset.targetKey!==key||form.dataset.baseRevision!==base){if(form.dataset.targetKey===key&&form.dataset.baseRevision!==undefined)uiLocale.setMessage(form.querySelector('[data-hr-control-message]'), uiLocale.message('تغيرت نسخة الضابط؛ راجع المراجع والأدلة ثم أكد الطلب.'));form.elements.reviewed.checked=false;delete form.dataset.requestId;}form.dataset.targetKey=key;form.dataset.baseRevision=base;}
 function clear(){version++;busy=false;ownerMode=null;ownerPanel.hidden=true;ownerForm.reset();delete ownerForm.dataset.revision;uiLocale.setMessage(box.querySelector('[data-owner-review-status]'), '');uiLocale.setMessage(box.querySelector('[data-owner-review-message]'), '');controls=[];cursor=nextCursor=null;history=[];active.replaceChildren();proposals.replaceChildren();uiLocale.setMessage(feedback, '');form.reset();for(const key of ['requestId','targetKey','baseRevision'])delete form.dataset[key];uiLocale.setMessage(form.querySelector('[data-hr-control-message]'), '');box.open=false;}
 async function authorize(v,s){const ok=await access()?.authorizeRole?.('admin',{sessionVersion:s,isCurrent:()=>v===version&&!host.hidden&&box.open});if(!ok||!current(v,s)){if(v===version)clear();return false;}return true;}
 async function body(response,v,s){const data=await response.json().catch(()=>null);if(response.status===403&&current(v,s))await authorize(v,s);if(!response.ok)throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر إكمال إجراء الضابط.')));return data;}
 function renderOwner(status){
  if(status?.canManage!==true){ownerMode=null;ownerPanel.hidden=true;ownerForm.reset();delete ownerForm.dataset.revision;return;}
  if(typeof status.active!=='boolean'||status.revision!==null&&(typeof status.revision!=='string'||!/^[0-9a-f-]{36}$/i.test(status.revision))||status.active&&!Number.isFinite(Date.parse(status.expiresAt))){ownerMode=null;ownerPanel.hidden=true;ownerForm.reset();throw localError(uiLocale.message('استجابة صلاحية المراجعة المؤقتة غير مكتملة.'));}
  const revision=status.revision||'NONE';if(ownerForm.dataset.revision!==undefined&&ownerForm.dataset.revision!==revision)ownerForm.elements.reviewed.checked=false;
  ownerForm.dataset.revision=revision;ownerMode=status;ownerPanel.hidden=false;uiLocale.setMessage(box.querySelector('[data-owner-review-status]'), (status.active ? uiLocale.message("مفعّلة حتى {0} بتوقيت السعودية. تنتهي تلقائيًا ويعود فصل المراجعات للقرارات التالية.", [new Date(status.expiresAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})]) : uiLocale.message('غير مفعّلة؛ تسري المراجعات المستقلة المعتادة.')));
 }
 function render(data){renderOwner(data.temporaryOwnerReview);
  const drafts=new Map([...proposals.querySelectorAll('form')].map(f=>[f.dataset.id,{reason:f.elements.reason.value,reviewed:f.elements.reviewed.checked,revision:f.dataset.revision}]));
  controls=data.controls;syncTarget();nextCursor=data.nextCursor||null;
  uiLocale.setHTML(active, controls.length?controls.map(c=>uiLocale.html`<article><h5>${esc(c.labelAr)}</h5><p>${esc(c.ruleKey)} · ${uiLocale.messageHTML((c.state==='ENABLED' ? uiLocale.message('مفعّل') : (c.state==='REVIEW' ? uiLocale.message('قيد المراجعة') : uiLocale.message('غير مفعّل'))))}</p><p>مرجع المتطلب: ${uiLocale.messageHTML((c.regulatoryRequirementId || uiLocale.message('غير متاح')))} · النسخة: ${uiLocale.messageHTML((c.regulatoryVersion || uiLocale.message('غير متاحة')))}</p></article>`).join(''):uiLocale.html`<p>لا توجد ضوابط موارد بشرية محفوظة.</p>`);
  uiLocale.setHTML(proposals, data.items.length?data.items.map(p=>{const c=p.control||{},actions=[];if(p.canReview===true)actions.push(['REVIEW','حفظ مراجعة الضابط']);if(p.canApprove===true)actions.push(['APPROVE','اعتماد الضابط وتفعيله']);if(p.canReject===true)actions.push(['REJECT','رفض طلب الضابط']);return uiLocale.html`<article data-hr-control-proposal="${esc(p.id)}"><h5>${esc(c.labelAr)}</h5><strong>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(labels[p.status]) || uiLocale.message('حالة غير متاحة')))}</strong><p>${esc(c.ruleKey)} · مرجع المتطلب: ${esc(c.regulatoryRequirementId)} · النسخة: ${esc(c.regulatoryVersion)}</p><p>مرجع اعتماد الحوكمة القانونية: ${esc(c.legalApprovalReference)}</p><p>مراجع الأدلة: ${uiLocale.messageHTML((Array.isArray(c.evidenceIds) ? c.evidenceIds.join('، ') : uiLocale.message('غير متاحة')))}</p><p>سبب الطلب: ${esc(p.reason)}</p>${p.temporaryOwnerReview?uiLocale.html`<p>سجلت مرحلة بصلاحية المالك المؤقتة، تنتهي في ${esc(new Date(p.temporaryOwnerReview.expiresAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}))}.</p>`:''}${p.reviewReason?uiLocale.html`<p>ملاحظة المراجع: ${esc(p.reviewReason)}</p>`:""}${p.decisionReason?uiLocale.html`<p>ملاحظة القرار: ${esc(p.decisionReason)}</p>`:""}${actions.length?uiLocale.html`<form data-hr-control-decision data-id="${esc(p.id)}" data-revision="${esc(p.revision)}"><fieldset><label>سبب قرار الضابط<textarea name="reason" required minlength="5" maxlength="1000" rows="2"></textarea></label><label class="hl-staff-ack"><input type="checkbox" name="reviewed" required>راجعت المراجع والأدلة واعتماد الحوكمة القانونية واستقلال الأطراف وأثر تفعيل الضابط على اعتماد الموارد البشرية</label><div class="hl-staff-actions">${actions.map(([action,label])=>uiLocale.html`<button type="submit" name="action" value="${action}">${label}</button>`).join('')}</div></fieldset><p role="status" data-hr-control-message></p></form>`:uiLocale.html`<p>المراجعة والاعتماد متاحان للأطراف المستقلة المخولة بحسب حالة الطلب.</p>`}</article>`;}).join(''):uiLocale.html`<p>لا توجد طلبات مراجعة للضوابط.</p>`);
  for(const f of proposals.querySelectorAll('form')){const draft=drafts.get(f.dataset.id);if(draft){f.elements.reason.value=draft.reason;f.elements.reviewed.checked=draft.revision===f.dataset.revision&&draft.reviewed;}}
 }
 async function load(){if(!eligible())return;const v=++version,s=auth()?.getSessionVersion?.();busy=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ تحميل مراجع الضوابط…'));lock();try{if(!await authorize(v,s))return;const response=await auth().authorizedFetch('/admin/employees/compliance-controls'+(cursor?'?cursor='+encodeURIComponent(cursor):'')),data=await body(response,v,s);if(!current(v,s))return;if(!Array.isArray(data?.controls)||!Array.isArray(data?.items)||!Number.isFinite(Date.parse(data.observedAt)))throw localError(uiLocale.message('استجابة مراجع الضوابط غير مكتملة.'));render(data);uiLocale.setMessage(feedback, uiLocale.message("وقت قراءة الضوابط: {0}", [new Date(data.observedAt).toLocaleString('ar-SA')]));}catch(error){if(current(v,s)){nextCursor=null;uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تحميل الضوابط.')));}}finally{if(current(v,s)){busy=false;lock();}}}
 async function mutate(target,path,payload,success){const v=version,s=auth()?.getSessionVersion?.(),message=target.querySelector('[data-hr-control-message]');busy=true;lock();uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ طلب الضابط…'));try{if(!await authorize(v,s)||!target.isConnected)return;const response=await auth().authorizedFetch(path,{method:'POST',body:JSON.stringify(payload)}),data=await body(response,v,s);if(!current(v,s)||!target.isConnected)return;const expectedId=target===form?payload.requestId:target.dataset.id,expectedStatus={REVIEW:'REVIEWED',APPROVE:'APPLIED',REJECT:'REJECTED'}[payload.action];if(data?.id!==expectedId||!Object.hasOwn(labels,data.status)||expectedStatus&&data.status!==expectedStatus)throw localError(uiLocale.message('تعذر تأكيد الحفظ؛ حدّث الضوابط للتحقق.'));target.reset();delete target.dataset.requestId;uiLocale.setMessage(message, '');cursor=null;history=[];const refreshVersion=version+1;await load();if(version===refreshVersion&&eligible()){uiLocale.setMessage(feedback, success);if(payload.action==='APPROVE')void window.HydrolandAdminEmployees?.reload?.();}}catch(error){if(current(v,s)&&target.isConnected)uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر حفظ طلب الضابط.')));}finally{if(current(v,s)){busy=false;lock();}}}
 async function changeOwnerMode(action,reason,reviewed){
  if(!ownerMode?.canManage||!['ENABLE','DISABLE'].includes(action))return;
  const v=version,s=auth()?.getSessionVersion?.(),message=box.querySelector('[data-owner-review-message]'),payload={action,expectedRevision:ownerMode.revision,reason,reviewed,...(action==='ENABLE'?{durationMinutes:Number(ownerForm.elements.durationMinutes.value)}:{})};
  busy=true;lock();uiLocale.setMessage(message, uiLocale.message('جارٍ حفظ تغيير الصلاحية المؤقتة…'));
  try{if(!await authorize(v,s)||!ownerForm.isConnected)return;const response=await auth().authorizedFetch('/admin/employees/temporary-owner-review',{method:'POST',body:JSON.stringify(payload)}),data=await body(response,v,s);if(!current(v,s))return;
   if(data?.canManage!==true||data.active!==(action==='ENABLE')||typeof data.revision!=='string')throw localError(uiLocale.message('تعذر تأكيد الإعداد؛ حدّث الضوابط للتحقق.'));
   ownerForm.reset();uiLocale.setMessage(message, '');const next=version+1;await load();if(version===next&&eligible())uiLocale.setMessage(feedback, (action==='ENABLE' ? uiLocale.message('فُعّلت مراجعة المالك مؤقتًا. لم تعتمد قوالب أو ضوابط ولم تتغير صلاحيات موظفين.') : uiLocale.message('أوقفت مراجعة المالك المؤقتة. لا يمكن إعادة استخدام مراجعات الاستثناء غير المعتمدة.')));
  }catch(error){if(current(v,s))uiLocale.setMessage(message, (localErrorMessage(error) || uiLocale.message('تعذر حفظ تغيير الصلاحية.')));}finally{if(current(v,s)){busy=false;lock();}}
 }
 box.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();if(busy||!eligible())return;const target=event.target,values=Object.fromEntries(new FormData(target)),reason=String(values.reason||'').trim(),reviewed=values.reviewed==='on';if(reason.length<5||!reviewed)return;
  if(target===ownerForm){void changeOwnerMode(event.submitter?.value,reason,reviewed);return;}
  if(target===form){const control={ruleKey:values.ruleKey,labelAr:values.labelAr,regulatoryRequirementId:values.regulatoryRequirementId,regulatoryVersion:values.regulatoryVersion,legalApprovalReference:values.legalApprovalReference,evidenceIds:String(values.evidenceIds||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean)};const payload={requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID()),control,baseRevision:form.dataset.baseRevision||null,reason,reviewed};void mutate(form, '/admin/employees/compliance-controls', payload, uiLocale.message('حُفظ طلب الضابط دون تفعيل؛ يلزم مراجع ومعتمد مستقلان.'));return;}
  if(target.matches('[data-hr-control-decision]')){const action=event.submitter?.value;if(['REVIEW','APPROVE','REJECT'].includes(action))void mutate(target, '/admin/employees/compliance-controls/'+encodeURIComponent(target.dataset.id)+'/decision', {action,expectedRevision:target.dataset.revision,reason,reviewed}, (action==='APPROVE' ? uiLocale.message('تم اعتماد الضابط وتفعيل مراجع الضبط وتسجيل القرار.') : uiLocale.message('حُفظ قرار مراجعة الضابط دون تفعيل تلقائي.')));}
 });
 form.addEventListener('input',event=>{delete form.dataset.requestId;if(event.target===form.elements.ruleKey)syncTarget();});form.addEventListener('change',()=>delete form.dataset.requestId);
 box.querySelector('[data-hr-control-refresh]').addEventListener('click',()=>void load());box.querySelector('[data-hr-control-next]').addEventListener('click',()=>{if(busy||!nextCursor)return;history.push(cursor);cursor=nextCursor;void load();});box.querySelector('[data-hr-control-previous]').addEventListener('click',()=>{if(busy||!history.length)return;cursor=history.pop();void load();});
 box.addEventListener('toggle',()=>{if(box.open)void load();else clear();});
 document.addEventListener('hydroland:workspace-selected',event=>{if(event.detail?.target!==host)clear();});for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(event,clear);document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear();});
 window.HydrolandHrControlReview=Object.freeze({reload:load});
 return true;
 };
 if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
