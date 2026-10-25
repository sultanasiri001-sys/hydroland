/* Current canonical HR facts, distinct from document approval and commencement evidence. */
(() => {
  'use strict';
  if(window.HydrolandHrSource)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={DRAFT:'مسودة',SUBMITTED:'مقدم',HR_REVIEW:'مراجعة الموارد البشرية',APPROVAL_REQUIRED:'بانتظار اعتماد التعيين',APPROVED:'معتمد',REJECTED:'مرفوض',CANCELLED:'ملغى',EFFECTIVE:'نافذ',CLOSED:'مقفل',PENDING_APPROVAL:'بانتظار الاعتماد',ACTIVE:'نشط',ON_LEAVE:'في إجازة',SUSPENDED:'موقوف',TERMINATED:'منتهٍ',OFFBOARDED:'مغلق وظيفيًا'};
  const supports=t=>t?.department==='HR'&&['HR-APPOINTMENT-RECORD','HR-COMMENCEMENT'].includes(t.code);
  function validateCandidates(r,org){
    const id=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
    if(!r||r.schemaVersion!==1||r.policy!=='HR_APPOINTMENT_REFERENCE_CHECK_V1'||r.organizationId!==org||r.readOnly!==true||!Array.isArray(r.items)||r.items.length>50||typeof r.hasMore!=='boolean'||r.hasMore&&!id(r.nextCursor)||!r.hasMore&&r.nextCursor!==null||r.items.some(x=>!x||!id(x.appointmentId)||!id(x.employmentId)||typeof x.name!=='string'||typeof x.departmentName!=='string'||x.positionTitle!==null&&typeof x.positionTitle!=='string'||!Object.hasOwn(states,x.appointmentStatus)||!Object.hasOwn(states,x.employmentStatus))||new Set(r.items.map(x=>x.appointmentId)).size!==r.items.length)throw new Error('تعذر التحقق من نطاق قائمة طلبات التعيين.');
  }
  function format(r,x){
    if(!r||r.schemaVersion!==1||r.policy!=='HR_APPOINTMENT_REFERENCE_CHECK_V1'||r.organizationId!==x.organizationId||r.templateId!==x.templateId||r.templateVersion!==x.templateVersion||r.templateCode!==x.templateCode||r.kind!==x.kind||r.documentId!==x.documentId||r.documentVersion!==x.documentVersion||r.readOnly!==true||r.operationalClosureVerified!==false||r.commencementEstablished!==false||!['MATCHED','INVALID_REFERENCES','SOURCE_UNAVAILABLE'].includes(r.match)||typeof r.observedAt!=='string'||!Number.isFinite(Date.parse(r.observedAt)))throw new Error('تعذر التحقق من نطاق نتيجة فحص السجل.');
    const label=x.kind==='UNSAVED_REFERENCE_PREVIEW'?'فحص مراجع المدخلات غير المحفوظة':'فحص مراجع النسخة المحفوظة';
    const lines=[`<strong>${label}</strong>`,`<p>وقت القراءة: ${esc(new Date(r.observedAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}))}</p>`];
    if(r.match!=='MATCHED'){
      if(r.source!==null)throw new Error('نتيجة السجل غير متسقة.');
      lines.push(`<p>${r.match==='INVALID_REFERENCES'?'أدخل معرف سجل الموظف ومعرف طلب التعيين المحفوظين.':'لم يُعثر على طلب تعيين يطابق مرجع الموظف داخل هذه الجهة.'}</p>`);
    }else{
      const s=r.source;
      if(!s||typeof s.employmentId!=='string'||typeof s.appointmentId!=='string'||x.employeeReference&&s.employmentId.toLowerCase()!==x.employeeReference.toLowerCase()||x.appointmentReference&&s.appointmentId.toLowerCase()!==x.appointmentReference.toLowerCase()||!Object.hasOwn(states,s.employmentStatus)||!Object.hasOwn(states,s.appointmentStatus)||typeof s.decisionApproverPresent!=='boolean'||!s.department||typeof s.department.nameAr!=='string'||typeof s.department.active!=='boolean'||s.position!==null&&(!s.position||typeof s.position.titleAr!=='string'||typeof s.position.active!=='boolean'))throw new Error('لم تتطابق بيانات السجل مع المراجع المطلوبة.');
      const facts=[['تطابق المراجع','طلب تعيين مرتبط بسجل الموظف المحدد'],['مرجع الموظف',s.employmentId],['مرجع طلب التعيين',s.appointmentId],['حالة طلب التعيين',states[s.appointmentStatus]],['حالة الموظف',states[s.employmentStatus]],['الإدارة',s.department.nameAr],['الوظيفة',s.position?.titleAr||'لم تربط وظيفة'],['مرجع صاحب قرار الاعتماد',s.decisionApproverPresent?'مسجل في طلب التعيين':'غير مسجل'],['موعد السريان المسجل',s.scheduledEffectiveAt||'لم يحدد']];
      lines.push(`<dl>${facts.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`);
      if(!s.department.active||s.position&&!s.position.active)lines.push('<p>الإدارة أو الوظيفة المرتبطة غير مفعّلة حاليًا.</p>');
    }
    lines.push('<p>قراءة لمرجع التعيين وحالته الحالية. إثبات المباشرة وتنفيذ الصلاحيات يُراجعان في سجلاتهما المختصة.</p>');
    return lines.join('');
  }
  window.HydrolandHrSource={supports,format,validateCandidates,stateLabel:s=>states[s]||s};
})();
