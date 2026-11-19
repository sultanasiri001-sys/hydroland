/* Current canonical HR facts, distinct from document approval and commencement evidence. */
(() => {
  'use strict';
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("hr-source", {
  "مسودة": "Draft",
  "مقدم": "Submitted",
  "مراجعة الموارد البشرية": "HR review",
  "بانتظار اعتماد التعيين": "Awaiting appointment approval",
  "معتمد": "Approved",
  "مرفوض": "Rejected",
  "ملغى": "Cancelled",
  "نافذ": "Effective",
  "مقفل": "Closed",
  "بانتظار الاعتماد": "Awaiting approval",
  "نشط": "Active",
  "في إجازة": "On leave",
  "موقوف": "Stopped",
  "منتهٍ": "Ended",
  "مغلق وظيفيًا": "Employment closed",
  "تعذر التحقق من نطاق قائمة طلبات التعيين.": "Could not verify appointment-request list scope.",
  "تعذر التحقق من نطاق نتيجة فحص السجل.": "Could not verify record-check result scope.",
  "فحص مراجع المدخلات غير المحفوظة": "Check references from unsaved entries",
  "فحص مراجع النسخة المحفوظة": "Check saved-version references",
  "وقت القراءة:": "Read time:",
  "نتيجة السجل غير متسقة.": "Record result is inconsistent.",
  "أدخل معرف سجل الموظف ومعرف طلب التعيين المحفوظين.": "Enter the saved employee-record and appointment-request IDs.",
  "لم يُعثر على طلب تعيين يطابق مرجع الموظف داخل هذه الجهة.": "No appointment request matching the employee reference was found in this organization.",
  "لم تتطابق بيانات السجل مع المراجع المطلوبة.": "Record data does not match the requested references.",
  "تطابق المراجع": "Reference match",
  "طلب تعيين مرتبط بسجل الموظف المحدد": "Appointment request linked to the selected employee record",
  "مرجع الموظف": "Employee reference",
  "مرجع طلب التعيين": "Appointment request reference",
  "حالة طلب التعيين": "Appointment request status",
  "حالة الموظف": "Employee status",
  "الإدارة": "Department",
  "الوظيفة": "Position",
  "لم تربط وظيفة": "No position linked",
  "مرجع صاحب قرار الاعتماد": "Approval decision-maker reference",
  "مسجل في طلب التعيين": "Recorded in appointment request",
  "غير مسجل": "Not recorded",
  "موعد السريان المسجل": "Recorded effective date",
  "لم يحدد": "Not specified",
  "الإدارة أو الوظيفة المرتبطة غير مفعّلة حاليًا.": "The linked department or position is currently disabled.",
  "قراءة لمرجع التعيين وحالته الحالية. إثبات المباشرة وتنفيذ الصلاحيات يُراجعان في سجلاتهما المختصة.": "Readout of the appointment reference and current status. Commencement evidence and permission execution are reviewed in their respective records."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if(window.HydrolandHrSource)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={DRAFT:'مسودة',SUBMITTED:'مقدم',HR_REVIEW:'مراجعة الموارد البشرية',APPROVAL_REQUIRED:'بانتظار اعتماد التعيين',APPROVED:'معتمد',REJECTED:'مرفوض',CANCELLED:'ملغى',EFFECTIVE:'نافذ',CLOSED:'مقفل',PENDING_APPROVAL:'بانتظار الاعتماد',ACTIVE:'نشط',ON_LEAVE:'في إجازة',SUSPENDED:'موقوف',TERMINATED:'منتهٍ',OFFBOARDED:'مغلق وظيفيًا'};
  const supports=t=>t?.department==='HR'&&['HR-APPOINTMENT-RECORD','HR-COMMENCEMENT'].includes(t.code);
  function validateCandidates(r,org){
    const id=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
    if(!r||r.schemaVersion!==1||r.policy!=='HR_APPOINTMENT_REFERENCE_CHECK_V1'||r.organizationId!==org||r.readOnly!==true||!Array.isArray(r.items)||r.items.length>50||typeof r.hasMore!=='boolean'||r.hasMore&&!id(r.nextCursor)||!r.hasMore&&r.nextCursor!==null||r.items.some(x=>!x||!id(x.appointmentId)||!id(x.employmentId)||typeof x.name!=='string'||typeof x.departmentName!=='string'||x.positionTitle!==null&&typeof x.positionTitle!=='string'||!Object.hasOwn(states,x.appointmentStatus)||!Object.hasOwn(states,x.employmentStatus))||new Set(r.items.map(x=>x.appointmentId)).size!==r.items.length)throw localError(uiLocale.message('تعذر التحقق من نطاق قائمة طلبات التعيين.'));
  }
  function format(r,x){
    if(!r||r.schemaVersion!==1||r.policy!=='HR_APPOINTMENT_REFERENCE_CHECK_V1'||r.organizationId!==x.organizationId||r.templateId!==x.templateId||r.templateVersion!==x.templateVersion||r.templateCode!==x.templateCode||r.kind!==x.kind||r.documentId!==x.documentId||r.documentVersion!==x.documentVersion||r.readOnly!==true||r.operationalClosureVerified!==false||r.commencementEstablished!==false||!['MATCHED','INVALID_REFERENCES','SOURCE_UNAVAILABLE'].includes(r.match)||typeof r.observedAt!=='string'||!Number.isFinite(Date.parse(r.observedAt)))throw localError(uiLocale.message('تعذر التحقق من نطاق نتيجة فحص السجل.'));
    const label=x.kind==='UNSAVED_REFERENCE_PREVIEW'?'فحص مراجع المدخلات غير المحفوظة':'فحص مراجع النسخة المحفوظة';
    const lines=[uiLocale.html`<strong>${uiLocale.messageHTML(uiLocale.message(label))}</strong>`,uiLocale.html`<p>وقت القراءة: ${esc(new Date(r.observedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}))}</p>`];
    if(r.match!=='MATCHED'){
      if(r.source!==null)throw localError(uiLocale.message('نتيجة السجل غير متسقة.'));
      lines.push(uiLocale.html`<p>${uiLocale.messageHTML((r.match==='INVALID_REFERENCES' ? uiLocale.message('أدخل معرف سجل الموظف ومعرف طلب التعيين المحفوظين.') : uiLocale.message('لم يُعثر على طلب تعيين يطابق مرجع الموظف داخل هذه الجهة.')))}</p>`);
    }else{
      const s=r.source;
      if(!s||typeof s.employmentId!=='string'||typeof s.appointmentId!=='string'||x.employeeReference&&s.employmentId.toLowerCase()!==x.employeeReference.toLowerCase()||x.appointmentReference&&s.appointmentId.toLowerCase()!==x.appointmentReference.toLowerCase()||!Object.hasOwn(states,s.employmentStatus)||!Object.hasOwn(states,s.appointmentStatus)||typeof s.decisionApproverPresent!=='boolean'||!s.department||typeof s.department.nameAr!=='string'||typeof s.department.active!=='boolean'||s.position!==null&&(!s.position||typeof s.position.titleAr!=='string'||typeof s.position.active!=='boolean'))throw localError(uiLocale.message('لم تتطابق بيانات السجل مع المراجع المطلوبة.'));
      const facts=[[uiLocale.message('تطابق المراجع'), uiLocale.message('طلب تعيين مرتبط بسجل الموظف المحدد')],[uiLocale.message('مرجع الموظف'), s.employmentId],[uiLocale.message('مرجع طلب التعيين'), s.appointmentId],[uiLocale.message('حالة طلب التعيين'), (value=>value===undefined?value:uiLocale.message(value))(states[s.appointmentStatus])],[uiLocale.message('حالة الموظف'), (value=>value===undefined?value:uiLocale.message(value))(states[s.employmentStatus])],[uiLocale.message('الإدارة'), s.department.nameAr],[uiLocale.message('الوظيفة'), (s.position?.titleAr || uiLocale.message('لم تربط وظيفة'))],[uiLocale.message('مرجع صاحب قرار الاعتماد'), (s.decisionApproverPresent ? uiLocale.message('مسجل في طلب التعيين') : uiLocale.message('غير مسجل'))],[uiLocale.message('موعد السريان المسجل'), (s.scheduledEffectiveAt || uiLocale.message('لم يحدد'))]];
      lines.push(uiLocale.html`<dl>${facts.map(([k,v])=>uiLocale.html`<dt>${uiLocale.messageHTML(k)}</dt><dd>${uiLocale.messageHTML(v)}</dd>`).join('')}</dl>`);
      if(!s.department.active||s.position&&!s.position.active)lines.push(uiLocale.html`<p>الإدارة أو الوظيفة المرتبطة غير مفعّلة حاليًا.</p>`);
    }
    lines.push(uiLocale.html`<p>قراءة لمرجع التعيين وحالته الحالية. إثبات المباشرة وتنفيذ الصلاحيات يُراجعان في سجلاتهما المختصة.</p>`);
    return lines.join('');
  }
  window.HydrolandHrSource={authoredErrorMessage:error=>authoredErrors.get(error),supports,format,validateCandidates,stateLabel:s=>states[s]||s,stateMessage:s=>Object.hasOwn(states,s)?uiLocale.message(states[s]):s};
})();
