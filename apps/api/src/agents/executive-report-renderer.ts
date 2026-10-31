// Render only the verified bundle: prose generation must not recalculate facts.
export interface VerifiedExecutiveReport {
  cycleId:string;createdAt:string;brief:string;
  entries:Array<{agentKey:string;departmentName:string;officeStatus:string;result:string|null;
    findings:string[];evidenceGaps:string[];riskLevel:string;ownerEscalationRequired:boolean}>;
}
const labels:Record<string,string>={
  READY_FOR_OWNER:'توصية المكتب جاهزة لقرار المالك',
  CORRECTION_REQUIRED:'يلزم تصحيح أو استكمال أدلة',
  EVIDENCE_REQUIRED:'أدلة المراجعة غير مكتملة',
  OWNER_ESCALATION_REQUIRED:'يلزم قرار المالك',
  REVIEW_STOPPED:'المراجعة متوقفة',
  INTEGRITY_REVIEW_REQUIRED:'تعذر التحقق من روابط المراجعة',
  DIRECTOR_OUTPUT_UNAVAILABLE:'تقرير المدير غير متاح',
};
const literal=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\\`*_{}\[\]()#+.!|~-]/g,'\\$&');
const quote=(text:string)=>literal(text).split(/\r?\n/).map(line=>'> '+line).join('\n');

export function renderVerifiedExecutiveReport(bundle:VerifiedExecutiveReport):string {
  if(bundle.entries.length!==14||new Set(bundle.entries.map(e=>e.agentKey)).size!==14||
    bundle.entries.some(e=>!Object.prototype.hasOwnProperty.call(labels,e.officeStatus)))throw new Error('VERIFIED_REPORT_STRUCTURE_INVALID');
  const counts=new Map<string,number>();
  for(const entry of bundle.entries)counts.set(entry.officeStatus,(counts.get(entry.officeStatus)||0)+1);
  const lines=[
    '# تقرير الإدارات من السجلات المراجعة',
    'مرجع الدورة: '+literal(bundle.cycleId),
    'تاريخ إنشاء سجل التقرير: '+literal(bundle.createdAt),
    'هذه صياغة مباشرة للمصادر المحفوظة، وليست قياسًا جديدًا أو مراجعة مستقلة أو اعتمادًا من المالك.',
    'موجز الدورة:\n'+quote(bundle.brief),
    '## حالات الإدارات',
    'إجمالي الإدارات: '+bundle.entries.length,
    ...[...counts].map(([status,count])=>status+': '+count+' — '+labels[status]),
    'READY_FOR_OWNER توصية جاهزة لقرار المالك؛ لا تثبت أداء الإدارة أو اكتمال بياناتها. CORRECTION_REQUIRED لا يعني وحده غياب تقرير المدير.',
  ];
  for(const entry of bundle.entries){
    lines.push('## '+literal(entry.departmentName),'الحالة: '+entry.officeStatus+' — '+labels[entry.officeStatus]);
    if(entry.result!==null)lines.push('نص المدير المحفوظ:\n'+quote(entry.result));
    else lines.push(entry.officeStatus==='DIRECTOR_OUTPUT_UNAVAILABLE'?'تقرير المدير غير متاح.':'نص المدير محجوب عن العرض النهائي لحين استكمال المراجعة؛ لا يعني ذلك أن التقرير الأصلي مفقود.');
    lines.push('ملاحظات المكتب:',...(entry.findings.length?entry.findings.map(x=>'- '+literal(x)):['- لا توجد ملاحظات مسجلة.']));
    lines.push('الأدلة الناقصة:',...(entry.evidenceGaps.length?entry.evidenceGaps.map(x=>'- '+literal(x)):['- لا توجد فجوات مسجلة؛ لا يعد ذلك إثباتًا لاكتمال البيانات.']));
    lines.push('مستوى المخاطر المسجل: '+literal(entry.riskLevel),'يتطلب تصعيدًا للمالك: '+(entry.ownerEscalationRequired?'نعم':'لا'));
  }
  lines.push('قرار المالك مطلوب بصورة مستقلة. هذا التقرير لا يمنح إذنًا لتنفيذ أعمال أو إرسال خارجي.');
  return lines.join('\n\n');
}
