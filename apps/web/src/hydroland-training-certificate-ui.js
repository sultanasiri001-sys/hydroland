(()=>{
  const locale=window.HydrolandI18n?.createScope('training-certificate-result',{
    'النتيجة الداخلية':'Internal result','لم تصدر شهادة داخلية':'No internal certificate issued',
    'بانتظار المراجعة':'Awaiting review','معتمد':'Approved','مرفوض':'Rejected','ملغى':'Revoked',
    'رقم الشهادة الداخلية:':'Internal certificate number:','تاريخ الإصدار:':'Issued on:',
    'شهادة الجهة الخارجية':'External agency certificate','غير مربوط':'Not connected','غير متحقق':'Not verified',
    'النتيجة الداخلية لا تمنح شهادة من جهة خارجية أو صلاحية تشغيل.':'An internal result does not grant an external agency certificate or operational authority.',
    'جاهزية النتيجة الداخلية':'Internal result readiness','المتطلبات الحالية مستوفاة.':'Current prerequisites are met.',
    'تحتاج المتطلبات الحالية إلى مراجعة قبل التوصية أو الاعتماد.':'Current prerequisites need review before recommendation or approval.',
    'خطة المهارات أو توقيعاتها غير مكتملة.':'The skills plan or its signatures are incomplete.',
    'سجل التدريب والتسجيل لم يكتملَا بعد.':'The training record and enrollment are not yet complete.',
    'يلزم ربط إصدار برنامج التدريب.':'A training program version must be linked.',
    'ربط البرنامج لا يطابق أصل التسجيل الحالي.':'The program binding does not match the current enrollment source.',
    'اعتماد إصدار برنامج التدريب غير نافذ.':'The training program version approval is not current.',
    'تأهيل المدرب المطلوب لهذا البرنامج غير مثبت.':'The instructor qualification required by this program is not established.',
    'أدلة معايير البرنامج غير مكتملة أو تحتاج مراجعة.':'Program standards evidence is incomplete or needs review.',
    'يلزم مصدر معتمد لسياسة التدرج في الغوص.':'An approved dive progression policy source is required.',
    'متطلبات التدرج في الغوص غير مستوفاة.':'Dive progression requirements are not met.',
    'دليل الغوص يحتاج مراجعة.':'Dive evidence needs review.',
    'أهلية المشاركة وموافقتها الحالية تحتاجان مراجعة.':'Current participation eligibility and consent need review.',
    'تحصيل الدورة الأصلي يحتاج تحققًا.':'The original course collection needs verification.',
    'دليل الإتمام يحتاج مراجعة من المصدر.':'Completion evidence needs review against its source.',
    'طلب إعادة النظر':'Reconsideration request','بانتظار حسم إعادة النظر':'Reconsideration decision pending',
    'أعيد فتح التوصية للمراجعة':'Recommendation reopened for review','حُفظ القرار السابق':'Previous decision retained',
    'سبب الطلب:':'Request reason:','قرار إعادة النظر:':'Reconsideration decision:',
    'طلب إعادة نظر في القرار الداخلي':'Request reconsideration of the internal decision',
    'سبب إعادة النظر':'Reason for reconsideration','إرسال طلب إعادة النظر':'Submit reconsideration request',
    'قرار إعادة النظر في الشهادة':'Certificate reconsideration decision','اختر القرار':'Choose a decision',
    'إعادة فتح التوصية':'Reopen recommendation','الإبقاء على قرار الرفض':'Retain rejection decision',
    'ملاحظات إعادة النظر':'Reconsideration notes','راجعت الطلب والسجل بصفتي مراجعًا مستقلًا':'I reviewed the request and record as an independent reviewer',
    'حفظ قرار إعادة النظر':'Save reconsideration decision',
    'إعادة فتح التوصية لا تعتمد الشهادة؛ يلزم قرار اعتماد جديد بعد فحص المتطلبات الحالية.':'Reopening a recommendation does not approve the certificate. A new approval decision must check current prerequisites.',
    'سحب الشهادة الداخلية':'Revoke internal certificate','سبب السحب':'Reason for revocation',
    'راجعت السجل وأؤكد سحب الشهادة الداخلية مع حفظ تاريخها':'I reviewed the record and confirm revocation of the internal certificate while preserving its history',
    'حفظ سحب الشهادة الداخلية':'Save internal certificate revocation',
    'تاريخ الشهادة والقرارات':'Certificate and decision history','توصية المدرب':'Instructor recommendation',
    'قرار الشهادة الداخلية':'Internal certificate decision','حسم إعادة النظر':'Reconsideration decision',
    'إجراء على الشهادة الداخلية':'Internal certificate action','القرار السابق المحفوظ':'Preserved previous decision',
    'يعرض هذا القسم أحدث الأحداث المتاحة؛ السجل الأصلي محفوظ.':'This section shows the latest available events. The original history is retained.',
    'تحديث حالة الشهادات':'Refresh certificate status',
    'تعذر معرفة نتيجة الحفظ. أعد إرسال الطلب نفسه للتحقق من نتيجته.':'The save outcome is unknown. Resend the same request to confirm its result.',
    'إعادة إرسال الطلب نفسه':'Resend the same request'
  });
  if(!locale)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusLabels={RECOMMENDED:'بانتظار المراجعة',APPROVED:'معتمد',REJECTED:'مرفوض',REVOKED:'ملغى',REOPEN:'إعادة فتح التوصية',DISMISS:'الإبقاء على قرار الرفض'};
  const reasons={
    TRAINING_PLAN_INCOMPLETE:'خطة المهارات أو توقيعاتها غير مكتملة.',TRAINING_RECORD_NOT_COMPLETED:'سجل التدريب والتسجيل لم يكتملَا بعد.',
    STANDARD_SELECTION_REQUIRED:'يلزم ربط إصدار برنامج التدريب.',STANDARD_BINDING_MISMATCH:'ربط البرنامج لا يطابق أصل التسجيل الحالي.',
    TRAINING_STANDARD_NOT_APPROVED:'اعتماد إصدار برنامج التدريب غير نافذ.',AGENCY_INSTRUCTOR_CREDENTIAL_REQUIRED:'تأهيل المدرب المطلوب لهذا البرنامج غير مثبت.',
    TRAINING_STANDARD_EVIDENCE_REQUIRED:'أدلة معايير البرنامج غير مكتملة أو تحتاج مراجعة.',DIVE_PROGRESSION_POLICY_REQUIRED:'يلزم مصدر معتمد لسياسة التدرج في الغوص.',
    TRAINING_DIVE_PROGRESSION_REQUIRED:'متطلبات التدرج في الغوص غير مستوفاة.',DIVE_EVIDENCE_INVALID:'دليل الغوص يحتاج مراجعة.',
    PARTICIPATION_NOT_CLEARED:'أهلية المشاركة وموافقتها الحالية تحتاجان مراجعة.',COURSE_COLLECTION_REQUIRED:'تحصيل الدورة الأصلي يحتاج تحققًا.',
    COMPLETION_EVIDENCE_REVIEW_REQUIRED:'دليل الإتمام يحتاج مراجعة من المصدر.'
  };
  const date=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(window.HydrolandI18n.getLocale(),{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(new Date(value)):'—';
  const time=value=>locale.html`<time datetime="${esc(value)}">${esc(date(value))}</time>`;
  const ready=value=>value?.scope==='INTERNAL_COMPLETION'&&value.externalCertificationGranted===false&&value.ready===true&&Array.isArray(value.reasonCodes)&&value.reasonCodes.length===0;
  function readiness(value){
    const codes=Array.isArray(value?.reasonCodes)?[...new Set(value.reasonCodes)]:[];
    return locale.html`<section class="hl-certificate-readiness" data-certificate-readiness="${ready(value)?'READY':'BLOCKED'}"><h4>جاهزية النتيجة الداخلية</h4><p>${locale.label(ready(value)?'المتطلبات الحالية مستوفاة.':'تحتاج المتطلبات الحالية إلى مراجعة قبل التوصية أو الاعتماد.')}</p>${codes.length?locale.html`<ul>${codes.map(code=>locale.html`<li data-readiness-reason="${esc(code)}">${locale.label(reasons[code]||'دليل الإتمام يحتاج مراجعة من المصدر.')}</li>`).join('')}</ul>`:''}</section>`;
  }
  function result(row){
    const internal=row?.internalResult?.scope==='HYDROLAND_INTERNAL'&&row.internalResult.officialIssuance===false?row.internalResult:null,external=row?.externalCertification;
    const disconnected=external?.status==='NOT_CONNECTED'&&external.officialIssuance===false&&external.operationalAuthority===false&&['provider','program','edition','certificateNumber','verifiedAt'].every(key=>external[key]===null);
    return locale.html`<div class="hl-certificate-boundary"><section data-certificate-internal><h4>النتيجة الداخلية</h4><p>${locale.label(internal?(statusLabels[internal.status]||'غير متحقق'):'لم تصدر شهادة داخلية')}</p>${internal?.certificateNumber?locale.html`<p>رقم الشهادة الداخلية: <bdi>${esc(internal.certificateNumber)}</bdi></p>`:''}${internal?.issuedAt?locale.html`<p>تاريخ الإصدار: ${time(internal.issuedAt)}</p>`:''}</section><section data-certificate-external><h4>شهادة الجهة الخارجية</h4><p>${locale.label(disconnected?'غير مربوط':'غير متحقق')}</p><small>النتيجة الداخلية لا تمنح شهادة من جهة خارجية أو صلاحية تشغيل.</small></section></div>`;
  }
  function history(row){
    const items=Array.isArray(row?.history)?row.history:[],actions={'training.certificate_recommended':'توصية المدرب','training.certificate_decided':'قرار الشهادة الداخلية','training.certificate_reconsideration_requested':'طلب إعادة النظر','training.certificate_reconsideration_decided':'حسم إعادة النظر','training.certificate_revoked':'سحب الشهادة الداخلية'};
    if(!items.length&&!row?.historyTruncated)return '';
    return locale.html`<details data-certificate-history><summary>تاريخ الشهادة والقرارات</summary><ol>${items.map(item=>locale.html`<li><b>${locale.label(actions[item.action]||'إجراء على الشهادة الداخلية')}</b> · ${time(item.occurredAt)}${item.outcome?locale.html`<p>${locale.label(statusLabels[item.outcome]||item.outcome)}</p>`:''}${item.reason?locale.html`<p>${esc(item.reason)}</p>`:''}${item.previousDecision?locale.html`<section><h5>القرار السابق المحفوظ</h5><p>${locale.label(statusLabels[item.previousDecision.status]||item.previousDecision.status)} · ${time(item.previousDecision.reviewedAt)}</p><p>${esc(item.previousDecision.reviewReason)}</p>${item.previousDecision.certificateNumber?locale.html`<p>رقم الشهادة الداخلية: <bdi>${esc(item.previousDecision.certificateNumber)}</bdi></p>`:''}</section>`:''}</li>`).join('')}</ol>${row.historyTruncated?locale.html`<p>يعرض هذا القسم أحدث الأحداث المتاحة؛ السجل الأصلي محفوظ.</p>`:''}</details>`;
  }
  function reconsideration(row){
    const value=row?.reconsideration;if(!value)return '';
    const labels={PENDING:'بانتظار حسم إعادة النظر',REOPENED:'أعيد فتح التوصية للمراجعة',DISMISSED:'حُفظ القرار السابق'};
    return locale.html`<section data-certificate-reconsideration><h4>طلب إعادة النظر</h4><p>${locale.label(labels[value.status]||'غير متحقق')} · ${time(value.requestedAt)}</p><p>سبب الطلب: ${esc(value.reason)}</p>${value.decisionReason?locale.html`<p>قرار إعادة النظر: ${esc(value.decisionReason)} · ${time(value.decidedAt)}</p>`:''}</section>`;
  }
  function requestForm(row){
    return row?.canRequestReconsideration===true?locale.html`<details><summary>طلب إعادة نظر في القرار الداخلي</summary><form data-certificate-lifecycle="reconsideration" data-certificate-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>سبب إعادة النظر<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><button type="submit">إرسال طلب إعادة النظر</button></fieldset><p data-certificate-feedback role="status"></p></form></details>`:'';
  }
  function adminForms(row){
    return (row.canDecideReconsideration===true?locale.html`<form data-certificate-lifecycle="reconsideration-decision" data-certificate-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><h4>قرار إعادة النظر في الشهادة</h4><p>إعادة فتح التوصية لا تعتمد الشهادة؛ يلزم قرار اعتماد جديد بعد فحص المتطلبات الحالية.</p><label>قرار إعادة النظر في الشهادة<select name="outcome" required><option value="">اختر القرار</option><option value="REOPEN">إعادة فتح التوصية</option><option value="DISMISS">الإبقاء على قرار الرفض</option></select></label><label>ملاحظات إعادة النظر<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت الطلب والسجل بصفتي مراجعًا مستقلًا</label><button type="submit">حفظ قرار إعادة النظر</button></fieldset><p data-certificate-feedback role="status"></p></form>`:'')+(row.canRevoke===true?locale.html`<details><summary>سحب الشهادة الداخلية</summary><form data-certificate-lifecycle="revoke" data-certificate-id="${esc(row.id)}" data-revision="${esc(row.updatedAt)}"><fieldset><label>سبب السحب<textarea name="reason" required minlength="5" maxlength="1000"></textarea></label><label><input type="checkbox" name="reviewed" required>راجعت السجل وأؤكد سحب الشهادة الداخلية مع حفظ تاريخها</label><button type="submit">حفظ سحب الشهادة الداخلية</button></fieldset><p data-certificate-feedback role="status"></p></form></details>`:'');
  }
  const commands=new WeakMap();
  function command(form){
    const values=new FormData(form),action=form.dataset.certificateLifecycle;
    const body={expectedUpdatedAt:form.dataset.revision,reason:String(values.get('reason')||'').trim()};
    if(action!=='reconsideration')body.reviewed=values.get('reviewed')==='on';
    if(action==='reconsideration-decision')body.outcome=values.get('outcome');
    if(body.reason.length<5||body.reason.length>1000||!Number.isFinite(Date.parse(body.expectedUpdatedAt))||(action!=='reconsideration'&&!body.reviewed)||(action==='reconsideration-decision'&&!['REOPEN','DISMISS'].includes(body.outcome)))return null;
    const fingerprint=JSON.stringify(body),previous=commands.get(form);
    if(previous?.fingerprint===fingerprint)return previous.body;
    const value={requestId:crypto.randomUUID(),...body};commands.set(form,{fingerprint,body:value});return value;
  }
  function uncertain(form){
    form.dataset.uncertain='true';form.querySelector('fieldset').disabled=true;
    locale.setHTML(form.querySelector('[data-certificate-feedback]'),locale.html`<span>تعذر معرفة نتيجة الحفظ. أعد إرسال الطلب نفسه للتحقق من نتيجته.</span> <button type="button" data-certificate-retry>إعادة إرسال الطلب نفسه</button>`);
  }
  document.addEventListener('hydroland:locale-changed',()=>{for(const node of document.querySelectorAll('[data-certificate-internal] time,[data-certificate-history] time,[data-certificate-reconsideration] time'))node.textContent=date(node.dateTime)});
  window.HydrolandTrainingCertificateUI=Object.freeze({ready,readiness,result,history,reconsideration,requestForm,adminForms,command,uncertain,retryBody:form=>commands.get(form)?.body});
})();
