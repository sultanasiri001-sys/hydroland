import { DocumentDepartment, DocumentTemplate } from './document-form.domain';

type OperationalSeed={department:DocumentDepartment;code:string;ar:string;en:string;fields:Array<[string,string,string,boolean]>};
const s:OperationalSeed[]=[
['HR','HR-LEAVE-REQUEST','طلب إجازة','Leave Request',[['employeeNo','رقم الموظف','Employee number',true],['leaveType','نوع الإجازة','Leave type',true],['startDate','تاريخ البداية','Start date',true],['endDate','تاريخ النهاية','End date',true]]],
['HR','HR-PERFORMANCE-REVIEW','تقييم أداء موظف','Employee Performance Review',[['employeeNo','رقم الموظف','Employee number',true],['period','فترة التقييم','Review period',true],['rating','التقييم','Rating',true]]],
['TRAINING','TRN-ENROLLMENT','نموذج تسجيل متدرب','Trainee Enrollment',[['courseCode','رمز الدورة','Course code',true],['traineeId','رقم المتدرب','Trainee ID',true],['instructorId','رقم المدرب','Instructor ID',true]]],
['TRAINING','TRN-ASSESSMENT','تقييم دورة تدريبية','Training Assessment',[['courseCode','رمز الدورة','Course code',true],['traineeId','رقم المتدرب','Trainee ID',true],['score','النتيجة','Score',true]]],
['MARINE_OPERATIONS','MAR-TRIP-CHECKLIST','قائمة فحص الرحلة البحرية','Marine Trip Checklist',[['tripNo','رقم الرحلة','Trip number',true],['vessel','الوسيلة البحرية','Marine vessel',true],['crew','الطاقم','Crew',true],['safetyClearance','تصريح السلامة','Safety clearance',true]]],
['MARINE_OPERATIONS','MAR-DIVE-LOG','سجل غوص','Dive Log',[['diverId','رقم الغواص','Diver ID',true],['site','موقع الغوص','Dive site',true],['depth','العمق','Depth',true],['duration','المدة','Duration',true]]],
['INVENTORY_LOGISTICS','INV-PURCHASE-REQUEST','طلب شراء','Purchase Request',[['requestNo','رقم الطلب','Request number',true],['warehouse','المستودع','Warehouse',true],['items','الأصناف','Items',true]]],
['INVENTORY_LOGISTICS','INV-TRANSFER','تحويل مخزون','Inventory Transfer',[['fromWarehouse','من مستودع','From warehouse',true],['toWarehouse','إلى مستودع','To warehouse',true],['items','الأصناف','Items',true]]],
['FINANCE','FIN-PAYMENT-VOUCHER','سند صرف','Payment Voucher',[['payee','المستفيد','Payee',true],['amount','المبلغ','Amount',true],['costCenter','مركز التكلفة','Cost center',true]]],
['FINANCE','FIN-RECEIPT-VOUCHER','سند قبض','Receipt Voucher',[['payer','الدافع','Payer',true],['amount','المبلغ','Amount',true],['referenceNo','رقم المرجع','Reference number',true]]],
['SAFETY_COMPLIANCE_RISK','SAF-INCIDENT','بلاغ حادث','Incident Report',[['incidentNo','رقم الحادث','Incident number',true],['location','الموقع','Location',true],['severity','درجة الخطورة','Severity',true],['actions','الإجراءات','Actions',true]]],
['SAFETY_COMPLIANCE_RISK','SAF-CAPA','إجراء تصحيحي ووقائي','Corrective & Preventive Action',[['incidentNo','رقم الحادث','Incident number',true],['rootCause','السبب الجذري','Root cause',true],['correctiveAction','الإجراء التصحيحي','Corrective action',true]]],
['CUSTOMER_EXPERIENCE','CEX-COMPLAINT','نموذج شكوى عميل','Customer Complaint',[['caseNo','رقم الحالة','Case number',true],['customerId','رقم العميل','Customer ID',true],['complaint','الشكوى','Complaint',true]]],
['CUSTOMER_EXPERIENCE','CEX-RESOLUTION','إغلاق حالة عميل','Customer Case Resolution',[['caseNo','رقم الحالة','Case number',true],['resolution','المعالجة','Resolution',true],['satisfaction','رضا العميل','Customer satisfaction',false]]],
['MARKETING_GROWTH','MKT-CAMPAIGN-BRIEF','موجز حملة تسويقية','Campaign Brief',[['campaign','الحملة','Campaign',true],['objective','الهدف','Objective',true],['channel','القناة','Channel',true],['budget','الميزانية','Budget',true]]],
['MARKETING_GROWTH','MKT-CONTENT-APPROVAL','اعتماد محتوى','Content Approval',[['contentId','رقم المحتوى','Content ID',true],['channel','القناة','Channel',true],['approvalStatus','حالة الاعتماد','Approval status',true]]],
['TECHNOLOGY_CYBERSECURITY','TEC-ACCESS-REQUEST','طلب صلاحية تقنية','Technical Access Request',[['accountId','رقم الحساب','Account ID',true],['system','النظام','System',true],['accessLevel','مستوى الصلاحية','Access level',true]]],
['TECHNOLOGY_CYBERSECURITY','TEC-SECURITY-INCIDENT','بلاغ حادث أمني','Security Incident',[['eventNo','رقم الحدث','Event number',true],['classification','التصنيف','Classification',true],['affectedSystem','النظام المتأثر','Affected system',true]]],
['FACILITIES_ASSETS_MAINTENANCE','FAC-WORK-ORDER','أمر عمل صيانة','Maintenance Work Order',[['workOrder','أمر العمل','Work order',true],['assetNo','رقم الأصل','Asset number',true],['priority','الأولوية','Priority',true]]],
['FACILITIES_ASSETS_MAINTENANCE','FAC-ASSET-INSPECTION','فحص أصل','Asset Inspection',[['assetNo','رقم الأصل','Asset number',true],['inspectionDate','تاريخ الفحص','Inspection date',true],['condition','الحالة','Condition',true]]],
['ADMIN_AFFAIRS_RECORDS','ADM-INCOMING-CORRESPONDENCE','معاملة واردة','Incoming Correspondence',[['recordNo','رقم المعاملة','Record number',true],['sender','المرسل','Sender',true],['subject','الموضوع','Subject',true]]],
['ADMIN_AFFAIRS_RECORDS','ADM-MEETING-MINUTES','محضر اجتماع','Meeting Minutes',[['meetingNo','رقم الاجتماع','Meeting number',true],['subject','الموضوع','Subject',true],['decisions','القرارات','Decisions',true]]],
['EXECUTIVE_GOVERNANCE','EXE-DECISION','قرار تنفيذي','Executive Decision',[['decisionNo','رقم القرار','Decision number',true],['authority','جهة الاعتماد','Authority',true],['decision','القرار','Decision',true]]],
['EXECUTIVE_GOVERNANCE','EXE-FOLLOWUP','متابعة قرار تنفيذي','Executive Decision Follow-up',[['decisionNo','رقم القرار','Decision number',true],['owner','مسؤول التنفيذ','Execution owner',true],['evidence','أدلة التنفيذ','Execution evidence',true]]],
['RND_MARKET_INTELLIGENCE','RND-RESEARCH-BRIEF','موجز بحث','Research Brief',[['studyNo','رقم الدراسة','Study number',true],['question','سؤال البحث','Research question',true],['evidence','الأدلة','Evidence',true]]],
['RND_MARKET_INTELLIGENCE','RND-FEASIBILITY','دراسة جدوى فرصة','Opportunity Feasibility',[['opportunityNo','رقم الفرصة','Opportunity number',true],['assumptions','الافتراضات','Assumptions',true],['recommendation','التوصية','Recommendation',true]]],
['LEGAL_CONTRACTS_INSURANCE','LEG-CONTRACT-REVIEW','مراجعة عقد','Contract Review',[['matterNo','رقم الموضوع','Matter number',true],['contractNo','رقم العقد','Contract number',true],['reviewStatus','حالة المراجعة','Review status',true]]],
['LEGAL_CONTRACTS_INSURANCE','LEG-INSURANCE-CLAIM','مطالبة تأمينية','Insurance Claim',[['claimNo','رقم المطالبة','Claim number',true],['policyNo','رقم الوثيقة','Policy number',true],['incidentReference','مرجع الحادث','Incident reference',true]]],
];

export function buildOperationalDocumentCatalog(organizationId:string):DocumentTemplate[]{
 if(!organizationId?.trim()) throw new Error('Organization scope is required.');
 return s.map(x=>({id:`operational-${x.code.toLowerCase()}`,organizationId,code:x.code,titleAr:x.ar,titleEn:x.en,department:x.department,version:1,active:true,printable:true,fields:x.fields.map(([key,labelAr,labelEn,required])=>({key,labelAr,labelEn,type:key==='amount'||key==='budget'||key==='score'||key==='depth'||key==='duration'?'NUMBER':key.toLowerCase().includes('date')?'DATE':'TEXT',required}))}));
}
