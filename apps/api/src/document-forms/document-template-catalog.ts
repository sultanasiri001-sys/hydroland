import { DocumentDepartment, DocumentTemplate } from './document-form.domain';

type Seed = { department: DocumentDepartment; code: string; ar: string; en: string; fields: Array<[string,string,string,boolean]> };
const seeds: Seed[] = [
['HR','HR-EMPLOYEE-REPORT','تقرير بيانات موظف','Employee Record Report',[['employeeNo','رقم الموظف','Employee number',true],['status','الحالة','Status',true]]],
['TRAINING','TRN-COURSE-REPORT','تقرير دورة تدريبية','Training Course Report',[['courseCode','رمز الدورة','Course code',true],['instructor','المدرب','Instructor',true]]],
['MARINE_OPERATIONS','MAR-TRIP-REPORT','تقرير رحلة بحرية','Marine Trip Report',[['tripNo','رقم الرحلة','Trip number',true],['vessel','الوسيلة البحرية','Marine vessel',true]]],
['INVENTORY_LOGISTICS','INV-STOCK-REPORT','تقرير المخزون','Inventory Report',[['warehouse','المستودع','Warehouse',true],['itemCount','عدد الأصناف','Item count',true]]],
['FINANCE','FIN-TRANSACTION-REPORT','تقرير معاملة مالية','Financial Transaction Report',[['referenceNo','رقم المرجع','Reference number',true],['amount','المبلغ','Amount',true]]],
['SAFETY_COMPLIANCE_RISK','SAF-INCIDENT-REPORT','تقرير حادث سلامة','Safety Incident Report',[['incidentNo','رقم الحادث','Incident number',true],['severity','درجة الخطورة','Severity',true]]],
['CUSTOMER_EXPERIENCE','CEX-CASE-REPORT','تقرير حالة عميل','Customer Case Report',[['caseNo','رقم الحالة','Case number',true],['resolution','المعالجة','Resolution',false]]],
['MARKETING_GROWTH','MKT-CAMPAIGN-REPORT','تقرير حملة تسويقية','Marketing Campaign Report',[['campaign','الحملة','Campaign',true],['channel','القناة','Channel',true]]],
['TECHNOLOGY_CYBERSECURITY','TEC-SECURITY-REPORT','تقرير تقني وأمني','Technology & Security Report',[['eventNo','رقم الحدث','Event number',true],['classification','التصنيف','Classification',true]]],
['FACILITIES_ASSETS_MAINTENANCE','FAC-MAINTENANCE-REPORT','تقرير صيانة أصل','Asset Maintenance Report',[['assetNo','رقم الأصل','Asset number',true],['workOrder','أمر العمل','Work order',true]]],
['ADMIN_AFFAIRS_RECORDS','ADM-CORRESPONDENCE-REPORT','تقرير معاملة إدارية','Administrative Record Report',[['recordNo','رقم المعاملة','Record number',true],['subject','الموضوع','Subject',true]]],
['EXECUTIVE_GOVERNANCE','EXE-DECISION-REPORT','محضر قرار تنفيذي','Executive Decision Record',[['decisionNo','رقم القرار','Decision number',true],['authority','جهة الاعتماد','Authority',true]]],
['RND_MARKET_INTELLIGENCE','RND-STUDY-REPORT','تقرير دراسة وتحليل سوق','Research & Market Study Report',[['studyNo','رقم الدراسة','Study number',true],['evidence','الأدلة','Evidence',true]]],
['LEGAL_CONTRACTS_INSURANCE','LEG-LEGAL-REPORT','تقرير قانوني وعقود وتأمين','Legal, Contracts & Insurance Report',[['matterNo','رقم الموضوع','Matter number',true],['reviewStatus','حالة المراجعة','Review status',true]]],
].map(([department,code,ar,en,fields])=>({department,code,ar,en,fields})) as Seed[];

export function buildDepartmentTemplateCatalog(organizationId:string): DocumentTemplate[] {
 if(!organizationId?.trim()) throw new Error('Organization scope is required.');
 return seeds.map((s,i)=>({id:`canonical-${s.code.toLowerCase()}`,organizationId,code:s.code,titleAr:s.ar,titleEn:s.en,department:s.department,version:1,active:true,printable:true,fields:s.fields.map(([key,labelAr,labelEn,required])=>({key,labelAr,labelEn,type:key==='amount'||key==='itemCount'?'NUMBER':'TEXT',required}))}));
}
