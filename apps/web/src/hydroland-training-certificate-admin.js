(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("training-certificate-admin", {
  "مراجعة شهادات التدريب": "Review training certificates",
  "راجع سجل المهارات والجلسات، ثم سجّل قرارًا مستقلًا عن المدرب والمتدرب.": "Review skills and sessions, then record a decision independently of the instructor and student.",
  "حالة طلب الشهادة": "Certificate request status",
  "بانتظار المراجعة": "Awaiting review",
  "معتمد": "Approved",
  "مرفوض": "Rejected",
  "ملغى": "Revoked",
  "تحديث طلبات التدريب": "Refresh training requests",
  "الصفحة التالية": "Next page",
  "متقن": "Mastered",
  "قيد التقييم": "Under assessment",
  "يحتاج مراجعة": "Review needed",
  "لم يبدأ": "Not started",
  "مكتمل": "Completed",
  "ملغي": "Cancelled",
  "قيد التنفيذ": "In progress",
  "الحضور مفتوح": "Attendance open",
  "مجدول": "Scheduled",
  "· المدرب:": "· Instructor:",
  "تقدم الدورة:": "Course progress:",
  "% · التوصية:": "% · Recommendation:",
  "عرض سجل المهارات والجلسات": "View skills and sessions",
  "الجلسات": "Sessions",
  "توقيع موثق: ": "Verified signature: ",
  "لا يوجد توقيع موثق": "No verified signature",
  "لا توجد مهارات موثقة.": "No documented skills.",
  "لا توجد جلسات.": "No sessions.",
  "رقم الشهادة الداخلية:": "Internal certificate number:",
  "ملاحظات القرار:": "Decision notes:",
  "قرار شهادة التدريب": "Training certificate decision",
  "اختر القرار": "Choose a decision",
  "اعتماد وإصدار شهادة داخلية": "Approve and issue internal certificate",
  "رفض التوصية": "Reject recommendation",
  "ملاحظات قرار شهادة التدريب": "Training certificate decision notes",
  "راجعت سجل المهارات والجلسات، وأنا مراجع مستقل": "I reviewed skills and sessions and am an independent reviewer",
  "حفظ قرار شهادة التدريب": "Save training certificate decision",
  "هذا الطلب محفوظ للعرض فقط.": "This request is retained for viewing only.",
  "جارٍ تحميل طلبات شهادات التدريب…": "Loading training certificate requests…",
  "تعذر تحميل طلبات شهادات التدريب.": "Could not load training certificate requests.",
  "{0} طلب — {1}": "{0} requests — {1}",
  "لا توجد طلبات شهادات تدريب في هذه الحالة.": "No training certificate requests in this status.",
  "اختر القرار، واكتب ملاحظاته، وأكد مراجعة السجل.": "Choose a decision, enter its notes and confirm that you reviewed the record.",
  "تعذر حفظ قرار الشهادة.": "Could not save the certificate decision.",
  "تعذر حفظ القرار.": "Could not save the decision.",
  "توقيع موثق:": "Verified signature:"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const host=document.querySelector('.hl-admin > .hl-admin__grid');if(!host)return;
 const panel=document.createElement('article');panel.className='hl-admin__panel hl-training-certificate-review';panel.hidden=true;
 uiLocale.setHTML(panel, uiLocale.html`<h3>مراجعة شهادات التدريب</h3><p>راجع سجل المهارات والجلسات، ثم سجّل قرارًا مستقلًا عن المدرب والمتدرب.</p><div class="hl-training-certificate-filters"><label>حالة طلب الشهادة<select data-training-certificate-filter aria-label="حالة طلب الشهادة"><option value="RECOMMENDED">بانتظار المراجعة</option><option value="APPROVED">معتمد</option><option value="REJECTED">مرفوض</option><option value="REVOKED">ملغى</option></select></label><button type="button" data-training-certificate-refresh>تحديث طلبات التدريب</button></div><p data-training-certificate-state role="status"></p><div data-training-certificate-list></div><button type="button" data-training-certificate-next hidden>الصفحة التالية</button>`);
 host.append(panel);
 const list=panel.querySelector('[data-training-certificate-list]'),status=panel.querySelector('[data-training-certificate-state]'),filter=panel.querySelector('[data-training-certificate-filter]'),next=panel.querySelector('[data-training-certificate-next]');
 const labels={RECOMMENDED:'بانتظار المراجعة',APPROVED:'معتمد',REJECTED:'مرفوض',REVOKED:'ملغى'},skillLabels={COMPETENT:'متقن',IN_PROGRESS:'قيد التقييم',NEEDS_REVIEW:'يحتاج مراجعة',NOT_STARTED:'لم يبدأ'},sessionLabels={COMPLETED:'مكتمل',CANCELLED:'ملغي',IN_PROGRESS:'قيد التنفيذ',CHECK_IN_OPEN:'الحضور مفتوح',SCHEDULED:'مجدول'};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>value?new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value)):'—';
 let version=0,cursor=null;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('admin')&&access()?.getCurrentRole?.()==='admin');
 const current=(v,session)=>v===version&&session===auth()?.getSessionVersion?.()&&eligible();
 const clear=()=>{version++;cursor=null;list.textContent='';status.textContent='';next.hidden=true;panel.hidden=true};
 async function authorize(v,session){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:()=>v===version});if(!allowed||!current(v,session)){if(v===version)clear();return false}return true}
 function render(row){
  const record=row.record,stages=Array.isArray(record?.stages)?record.stages:[],sessions=Array.isArray(record?.sessions)?record.sessions:[];
  return uiLocale.html`<section class="hl-admin__credential-card" data-training-certificate="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><header><div><strong>${esc(row.courseCode)}</strong><small>${esc(row.student?.displayName)} · المدرب: ${esc(row.instructor?.displayName)} · ${esc(row.centerName)}</small></div><span>${uiLocale.label(labels[row.status]||row.status)}</span></header><p>تقدم الدورة: ${Number(record?.progressPercent||0)}% · التوصية: ${esc(date(row.recommendedAt))}</p><details><summary>عرض سجل المهارات والجلسات</summary>${stages.map(stage=>uiLocale.html`<section><h4>${esc(stage.stageType)}</h4><ul>${stage.skills.map(skill=>uiLocale.html`<li>${esc(skill.skillCode)} · ${esc(skill.name)} · ${uiLocale.label(skillLabels[skill.status]||skill.status)} · ${skill.signed?uiLocale.t('توقيع موثق: ')+esc(date(skill.signedOffAt)):uiLocale.t('لا يوجد توقيع موثق')}</li>`).join('')}</ul></section>`).join('')||uiLocale.html`<p>لا توجد مهارات موثقة.</p>`}<h4>الجلسات</h4><ul>${sessions.map(session=>uiLocale.html`<li>${esc(date(session.startsAt))} · ${uiLocale.label(sessionLabels[session.status]||session.status)}</li>`).join('')||uiLocale.html`<li>لا توجد جلسات.</li>`}</ul></details>${(row.reviewReasons||[]).length?uiLocale.html`<ul>${row.reviewReasons.map(reason=>uiLocale.html`<li>${esc(reason)}</li>`).join('')}</ul>`:''}${row.certificateNumber?uiLocale.html`<p>رقم الشهادة الداخلية: ${esc(row.certificateNumber)}</p>`:''}${row.reviewReason?uiLocale.html`<p>ملاحظات القرار: ${esc(row.reviewReason)}</p>`:''}${row.canReview?uiLocale.html`<form data-training-certificate-decision><fieldset><label>قرار شهادة التدريب<select name="outcome" aria-label="قرار شهادة التدريب" required><option value="">اختر القرار</option><option value="APPROVED" ${row.canApprove?'':'disabled'}>اعتماد وإصدار شهادة داخلية</option><option value="REJECTED">رفض التوصية</option></select></label><label>ملاحظات قرار شهادة التدريب<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label class="hl-training-certificate-confirm"><input type="checkbox" name="reviewed" required>راجعت سجل المهارات والجلسات، وأنا مراجع مستقل</label><button type="submit">حفظ قرار شهادة التدريب</button></fieldset><p data-training-certificate-feedback role="status"></p></form>`:uiLocale.html`<p>هذا الطلب محفوظ للعرض فقط.</p>`}</section>`;
 }
 async function load(pageCursor=null){
  if(!eligible()){clear();return}const v=++version,session=auth()?.getSessionVersion?.(),selected=filter.value;panel.hidden=false;list.textContent='';next.hidden=true;uiLocale.setText(status, ...['جارٍ تحميل طلبات شهادات التدريب…']);
  try{
   if(!await authorize(v,session))return;
   const response=await auth().authorizedFetch('/training/certificates?status='+encodeURIComponent(selected)+(pageCursor?'&cursor='+encodeURIComponent(pageCursor):'')),data=await response.json().catch(()=>null);
   if(!current(v,session))return;if(!response.ok||!Array.isArray(data?.items))throw localError(data?.message||uiLocale.message('تعذر تحميل طلبات شهادات التدريب.'));
   cursor=data.nextCursor||null;next.hidden=!cursor;uiLocale.setHTML(list, data.items.map(render).join(''));uiLocale.setText(status, ...(data.items.length?["{0} طلب — {1}", [data.items.length, uiLocale.t(labels[selected])]]:['لا توجد طلبات شهادات تدريب في هذه الحالة.']));
  }catch(error){if(current(v,session))uiLocale.setMessage(status, localErrorMessage(error)||uiLocale.message('تعذر تحميل طلبات شهادات التدريب.'))}
 }
 panel.addEventListener('change',event=>{if(event.target===filter)void load()});
 panel.addEventListener('click',event=>{if(event.target.closest('[data-training-certificate-refresh]'))void load();if(event.target.closest('[data-training-certificate-next]')&&cursor)void load(cursor)});
 panel.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-training-certificate-decision]');if(!form)return;event.preventDefault();if(form.dataset.busy)return;
  const v=version,session=auth()?.getSessionVersion?.(),card=form.closest('[data-training-certificate]'),fields=new FormData(form),feedback=form.querySelector('[data-training-certificate-feedback]');
  const body={outcome:fields.get('outcome'),reason:String(fields.get('reason')||'').trim(),reviewed:fields.get('reviewed')==='on',expectedUpdatedAt:card.dataset.revision};
  if(!body.reviewed||!['APPROVED','REJECTED'].includes(body.outcome)||body.reason.length<5){uiLocale.setText(feedback, ...['اختر القرار، واكتب ملاحظاته، وأكد مراجعة السجل.']);return}
  form.dataset.busy='true';form.querySelector('fieldset').disabled=true;
  try{
   if(!await authorize(v,session)||!form.isConnected)return;
   const response=await auth().authorizedFetch('/training/certificates/'+encodeURIComponent(card.dataset.trainingCertificate)+'/decision',{method:'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
   if(!current(v,session)||!form.isConnected)return;if(!response.ok)throw localError(data?.message||uiLocale.message('تعذر حفظ قرار الشهادة.'));await load();
  }catch(error){if(current(v,session)&&form.isConnected)uiLocale.setMessage(feedback, localErrorMessage(error)||uiLocale.message('تعذر حفظ القرار.'))}
  finally{delete form.dataset.busy;form.querySelector('fieldset').disabled=false}
 });
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 document.addEventListener('hydroland:role-changed',()=>{if(eligible())void load();else clear()});
 document.addEventListener('hydroland:auth-changed',()=>{if(!eligible())clear()});
 window.HydrolandTrainingCertificateAdmin=Object.freeze({reload:load});if(eligible())void load();else clear();
})();
