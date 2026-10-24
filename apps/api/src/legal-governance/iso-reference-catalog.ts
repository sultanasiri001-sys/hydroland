import { DepartmentCode, HYDROLAND_DEPARTMENTS } from '../governance/department-ownership.domain';

type IsoReference = {
  id: string; designation: string; titleAr: string; url: string;
  scopeAr: string; departmentCodes: readonly DepartmentCode[];
  priorDiscussion: 'TRAINING_FRAMEWORK' | 'OPTIONAL_ACTIVITY' | 'MANAGEMENT_REFERENCE';
  snapshotDate: string; publisherStatus: 'CURRENT';
  adoptionDecisionReference: null; licensedCopyLibraryFileId: null;
  clauseMappingStatus: 'REVIEW_REQUIRED'; certificationClaim: false;
};
const training: DepartmentCode[] = ['TRAINING', 'SAFETY_COMPLIANCE_RISK', 'LEGAL_CONTRACTS_INSURANCE'];
const marine: DepartmentCode[] = [...training, 'MARINE_OPERATIONS', 'INVENTORY_LOGISTICS'];
const management = HYDROLAND_DEPARTMENTS.map(d => d.code);

// Publisher metadata checked on the snapshot date. These are discovery links,
// not copied ISO clauses, an adoption decision, a licence or certification.
export const ISO_REFERENCE_CATALOG: readonly IsoReference[] = [
  ['ISO-24801-1','ISO 24801-1:2014','تدريب الغواص تحت الإشراف','60460.html','تدريب وتقييم غواص السكوبا بالمستوى الأول؛ يحدد الانطباق بحسب البرنامج.',training,'TRAINING_FRAMEWORK'],
  ['ISO-24801-2','ISO 24801-2:2014','تدريب الغواص المستقل','60461.html','تدريب وتقييم غواص السكوبا بالمستوى الثاني؛ يحدد الانطباق بحسب البرنامج.',training,'TRAINING_FRAMEWORK'],
  ['ISO-24801-3','ISO 24801-3:2014','تدريب قائد الغوص','60462.html','تدريب وتقييم غواص السكوبا بالمستوى الثالث؛ يحدد الانطباق بحسب البرنامج.',training,'TRAINING_FRAMEWORK'],
  ['ISO-24802-1','ISO 24802-1:2014','تدريب مدرب الغوص — المستوى الأول','60463.html','تدريب وتقييم مدربي السكوبا بحسب مستوى المدرب.',training,'TRAINING_FRAMEWORK'],
  ['ISO-24802-2','ISO 24802-2:2014','تدريب مدرب الغوص — المستوى الثاني','60464.html','تدريب وتقييم مدربي السكوبا بحسب مستوى المدرب.',training,'TRAINING_FRAMEWORK'],
  ['ISO-24803','ISO 24803:2017','مقدمو خدمات الغوص الترفيهي','68276.html','خدمات تدريب السكوبا والغوص المصحوب والإيجار والسنوركل؛ لا يعمم على الغوص الحر.',marine,'TRAINING_FRAMEWORK'],
  ['ISO-11121','ISO 11121:2017','برامج التعريف بغوص السكوبا','68275.html','تجربة تعريفية في المياه المفتوحة؛ لا تعامل كشهادة تأهيل غواص.',training,'TRAINING_FRAMEWORK'],
  ['ISO-13289','ISO 13289:2011','رحلات السنوركل','53654.html','مرجع مشروط بوجود نشاط رحلات سنوركل مشمولة بنطاقه.',marine,'OPTIONAL_ACTIVITY'],
  ['ISO-9001','ISO 9001:2026','إدارة الجودة','9001','الإصدار الحالي عند التحقق؛ انتقال اعتماد نسخة سابقة يحتاج قرارًا موثقًا ولا يغير الضوابط تلقائيًا.',management,'MANAGEMENT_REFERENCE'],
  ['ISO-45001','ISO 45001:2018','السلامة والصحة المهنية','45001','يُراجع مع تعديل 2024 ونطاق السلامة المهنية؛ لا يحل محل اللوائح السعودية.', ['HR','SAFETY_COMPLIANCE_RISK','MARINE_OPERATIONS','FACILITIES_ASSETS_MAINTENANCE','LEGAL_CONTRACTS_INSURANCE'],'MANAGEMENT_REFERENCE'],
  ['ISO-31000','ISO 31000:2018','إرشادات إدارة المخاطر','31000','مرجع إرشادي لإدارة المخاطر؛ لا يمثل بذاته شهادة نظام إدارة.', ['EXECUTIVE_GOVERNANCE','SAFETY_COMPLIANCE_RISK','FINANCE','LEGAL_CONTRACTS_INSURANCE'],'MANAGEMENT_REFERENCE'],
].map(row => {
  const [id, designation, titleAr, page, scopeAr, departmentCodes, priorDiscussion] = row as [string,string,string,string,string,DepartmentCode[],IsoReference['priorDiscussion']];
  return { id, designation, titleAr, url: `https://www.iso.org/standard/${page}`, scopeAr, departmentCodes, priorDiscussion, snapshotDate: '2026-10-24', publisherStatus: 'CURRENT', adoptionDecisionReference: null, licensedCopyLibraryFileId: null, clauseMappingStatus: 'REVIEW_REQUIRED', certificationClaim: false };
});
