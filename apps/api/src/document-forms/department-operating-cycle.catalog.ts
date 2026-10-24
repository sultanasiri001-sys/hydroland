import { DepartmentCode } from '../governance/department-ownership.domain';
import { buildDepartmentTemplateCatalog } from './document-template-catalog';
import { buildOperationalDocumentCatalog } from './operational-document-catalog';

type Cycle = { titleAr: string; stepsAr: readonly string[]; sourcePaths: readonly string[] };
type Definition = { cycles: readonly Cycle[]; handoffs: readonly DepartmentCode[]; closureEvidenceAr: readonly string[] };

// Restates the existing department boundaries and workflow baselines. These
// definitions are acceptance scope, not claims that every branch is persisted,
// exposed in the UI, tested, legally adopted or exercised in production.
export const DEPARTMENT_OPERATING_CYCLES: Record<DepartmentCode, Definition> = {
  HR: {
    cycles: [
      { titleAr: 'التوظيف والتغيير الوظيفي', stepsAr: ['طلب احتياج أو تغيير', 'تحقق الموارد البشرية والأهلية والعقد', 'مراجعة واعتماد بحسب المسؤولية والتفويض المحفوظين', 'سريان التعيين أو الحركة', 'تطبيق نطاق الوصول عبر IAM', 'حفظ الأدلة والإصدارات وسجل القرار'], sourcePaths: ['docs/HR_LEVEL_3_EMPLOYEE_LIFECYCLE.md','apps/api/src/hr/hr-policy.ts','apps/api/src/hr/staffing-admin.service.ts','apps/api/src/hr/staff-approval-authority.ts','apps/api/src/hr/owner-department-responsibility.ts'] },
      { titleAr: 'المتابعة الوظيفية وإنهاء العلاقة', stepsAr: ['الحضور والإجازات والأداء والتطوير', 'العلاقات الوظيفية والقرار والتظلم', 'اعتماد المغادرة وتاريخ السريان', 'إخلاء العهد والالتزامات والتسوية مع المالية', 'سحب التفويضات والأدوار والجلسات عبر IAM', 'أرشفة الملف وإثبات الإقفال'], sourcePaths: ['docs/HR_LEVEL_4_GOVERNANCE.md','apps/api/src/hr/hr.service.ts'] },
    ], handoffs: ['EXECUTIVE_GOVERNANCE','LEGAL_CONTRACTS_INSURANCE','FINANCE','TECHNOLOGY_CYBERSECURITY','FACILITIES_ASSETS_MAINTENANCE'], closureEvidenceAr: ['مرجع العقد بإصداره وأدلة المراجعة والاعتماد المنفصلة', 'أثر الحركة أو التعيين وسجل تطبيق IAM', 'إخلاء العهد والتسوية وإبطال الوصول دون حذف التاريخ'] },
  TRAINING: {
    cycles: [{ titleAr: 'الدورة التدريبية ونتيجة المتدرب', stepsAr: ['اختيار البرنامج والجهة والمعيار والإصدار', 'تحقق أهلية المتدرب والمدرب والتسجيل', 'جدولة المراحل والجلسات واشتراطات السلامة', 'تسجيل المهارات وتوقيع المدرب وإقرار المتدرب أو اعتراضه', 'معالجة التعليق أو نقل المدرب مع حفظ المهارات', 'مراجعة النتيجة والشهادة وإقفال السجل'], sourcePaths: ['apps/api/src/governance/training-workflow.service.ts','apps/api/src/governance/training.domain.ts'] }], handoffs: ['HR','MARINE_OPERATIONS','SAFETY_COMPLIANCE_RISK','FINANCE'], closureEvidenceAr: ['نسخة البرنامج ومعيار الانطباق والجهة التدريبية', 'سجل المهارات والجلسات والتقييم والاعتراضات', 'قرار النتيجة ومرجع الشهادة والتحقق من الإقفال'] },
  MARINE_OPERATIONS: {
    cycles: [{ titleAr: 'الرحلة البحرية وسجل الغوص', stepsAr: ['تخطيط الرحلة والوسيلة والطاقم والموقع', 'نشر الحجز وتسعيره ضمن الصلاحية', 'التحقق من المشاركين والتصاريح والطقس والمعدات', 'التصريح التشغيلي والسلامة قبل المغادرة', 'تنفيذ الرحلة وتسجيل الغوص والحوادث', 'العودة والمطابقة وتسليم الأثر المالي وإقفال الرحلة'], sourcePaths: ['apps/api/src/marine-operations/marine-trip-management.service.ts','apps/api/src/marine-operations/marine-operations.service.ts','apps/api/src/trips/trips.service.ts'] }], handoffs: ['SAFETY_COMPLIANCE_RISK','INVENTORY_LOGISTICS','FINANCE','CUSTOMER_EXPERIENCE'], closureEvidenceAr: ['موافقات السلامة والطقس والتصاريح صالحة وقت التنفيذ', 'قائمة المشاركين والطاقم وسجلات الرحلة والغوص', 'محضر العودة والمعدات والأحداث والتسوية المرتبطة'] },
  INVENTORY_LOGISTICS: {
    cycles: [{ titleAr: 'الشراء والمخزون والتحويل والعهد', stepsAr: ['طلب احتياج أو شراء أو تحويل', 'تحقق المخزون والمورد والميزانية والمراجعة القانونية عند الحاجة', 'اعتماد الطلب وحجز الكميات', 'الشراء والاستلام والفحص أو الصرف والتحويل', 'إثبات الاستلام والرصيد والعهد أو الإرجاع', 'الجرد والمطابقة والفروق وإقفال الحركة'], sourcePaths: ['apps/api/src/inventory/inventory-workflow.service.ts','apps/api/src/inventory/inventory-operations.service.ts'] }], handoffs: ['FINANCE','LEGAL_CONTRACTS_INSURANCE','FACILITIES_ASSETS_MAINTENANCE','MARINE_OPERATIONS'], closureEvidenceAr: ['طلب معتمد وربط المورد والطلب المالي عند الانطباق', 'محضر الاستلام والفحص وحركة الكمية بمواقعها', 'مطابقة الرصيد والعهد والفروق وقرار معالجتها'] },
  FINANCE: {
    cycles: [{ titleAr: 'المعاملة المالية والتسوية والإقفال', stepsAr: ['مستند مصدر وفاتورة أو استحقاق', 'تحقق الميزانية ومركز التكلفة والضريبة والسياسة المعتمدة', 'مراجعة واعتماد مستقلان بحسب الصلاحية', 'تحصيل أو صرف وترحيل عبر المجال المالي', 'مطابقة المزود والبنك والوردية أو الفترة', 'معالجة الفروق والاسترداد ثم إقفال الفترة والأرشفة'], sourcePaths: ['apps/api/src/finance/finance-persistence.service.ts','apps/api/src/finance/finance-settlement.service.ts','apps/api/src/finance/finance-period-close.service.ts'] }], handoffs: ['HR','INVENTORY_LOGISTICS','LEGAL_CONTRACTS_INSURANCE','EXECUTIVE_GOVERNANCE'], closureEvidenceAr: ['المستند المصدر والاعتماد والقيد المتوازن', 'مرجع التنفيذ المالي الفعلي والمطابقة والفروق', 'قرار الإقفال وإمكانية تتبع التصحيح دون تعديل التاريخ'] },
  SAFETY_COMPLIANCE_RISK: {
    cycles: [{ titleAr: 'تقييم المخاطر والامتثال والحوادث', stepsAr: ['تحديد الخطر أو المتطلب ومصدره ونسخته', 'تقييم الانطباق والخطورة والأدلة', 'مراجعة مستقلة وقرار التصريح أو المنع', 'متابعة التنفيذ واستقبال الحوادث', 'تحقيق السبب الجذري وإجراء تصحيحي ووقائي', 'تحقق مستقل من الفاعلية وإقفال النتيجة مع متابعة الصلاحية'], sourcePaths: ['apps/api/src/safety/safety-compliance-risk-workflow.service.ts','apps/api/src/safety/safety-incidents.service.ts'] }], handoffs: ['MARINE_OPERATIONS','TRAINING','LEGAL_CONTRACTS_INSURANCE','EXECUTIVE_GOVERNANCE'], closureEvidenceAr: ['تقييم معتمد وأدلة صالحة وقت القرار', 'الحادث والتحقيق وإجراءات CAPA ومسؤولوها', 'تحقق الفاعلية ومعالجة الموانع وإثبات قرار الإقفال'] },
  CUSTOMER_EXPERIENCE: {
    cycles: [{ titleAr: 'الطلب أو الشكوى حتى الإقفال', stepsAr: ['استقبال الحالة وتصنيفها وربط العميل والمعاملة', 'التكليف والتحقق من نطاق الاطلاع', 'التواصل والتحقيق وإحالات الإدارات', 'تقديم المعالجة ومتابعة انتظار العميل', 'توثيق الحل وطلب الأثر المالي من المالية عند الحاجة', 'تأكيد النتيجة وإقفال الحالة وحفظ سجل التواصل'], sourcePaths: ['apps/api/src/customer-service/customer-service-workflow.service.ts','apps/api/src/customer-service/customer-case.service.ts'] }], handoffs: ['MARINE_OPERATIONS','TRAINING','FINANCE','LEGAL_CONTRACTS_INSURANCE'], closureEvidenceAr: ['سجل الحالة والتواصل والإحالات دون كشف غير مصرح', 'دليل المعالجة ومرجع الاسترداد إن وجد', 'نتيجة العميل وقرار الإقفال ومتابعة التكرار'] },
  MARKETING_GROWTH: {
    cycles: [{ titleAr: 'الحملة والمحتوى وقياس النتيجة', stepsAr: ['موجز الحملة والهدف والجمهور والميزانية', 'تحقق حقوق المحتوى والبيانات والمراجعة اللازمة', 'اعتماد مستقل للحملة وأصول المحتوى', 'النشر أو التفعيل ومتابعة الأداء', 'إيقاف أو تعديل بإصدار موثق عند الحاجة', 'تقرير النتيجة والمصروفات والدروس ثم إقفال الحملة'], sourcePaths: ['apps/api/src/marketing/marketing-workflow.service.ts','apps/api/src/marketing/marketing-governance.service.ts'] }], handoffs: ['FINANCE','LEGAL_CONTRACTS_INSURANCE','RND_MARKET_INTELLIGENCE'], closureEvidenceAr: ['الموجز والمحتوى المعتمد وحقوق استخدامه', 'دليل النشر وقياس المؤشرات ومطابقة المصروفات', 'تقرير الحملة وقرار الإقفال والاحتفاظ بنسخ التعديلات'] },
  TECHNOLOGY_CYBERSECURITY: {
    cycles: [{ titleAr: 'الوصول والتغيير والحادث التقني', stepsAr: ['طلب وصول أو تغيير أو بلاغ أمني', 'تحديد النطاق والمخاطر والمراجعين', 'اعتماد مختص مستقل مع منع التصعيد الذاتي', 'تنفيذ IAM أو التغيير أو تخفيف الخطر', 'اختبار النتيجة وخطة الرجوع أو إعادة الفحص', 'قرار الحل أو قبول الخطر من صاحبه ثم الإقفال والأرشفة'], sourcePaths: ['apps/api/src/technology-security/technology-security-workflow.service.ts','apps/api/src/technology-security/staffing-iam.service.ts'] }], handoffs: ['HR','EXECUTIVE_GOVERNANCE','SAFETY_COMPLIANCE_RISK'], closureEvidenceAr: ['طلب معتمد بمدة ونطاق واضحين', 'أثر التنفيذ واختبارات النفي والرجوع وإبطال الوصول عند اللزوم', 'دليل المعالجة أو قبول الخطر من صاحب الصلاحية وسجل التدقيق'] },
  FACILITIES_ASSETS_MAINTENANCE: {
    cycles: [{ titleAr: 'الأصل وأمر الصيانة', stepsAr: ['بلاغ أو موعد خطة صيانة وربط الأصل', 'تقييم الأولوية والمخاطر والموارد', 'اعتماد مستقل وجدولة وإسناد الفني', 'بدء التنفيذ وتسجيل الأعمال والقطع', 'إكمال الفني وفحص النتيجة', 'تحقق وإقفال مستقلان وتحديث سجل الأصل والخطة'], sourcePaths: ['apps/api/src/facilities-maintenance/facilities-maintenance-workflow.service.ts','apps/api/src/facilities-maintenance/facilities-maintenance-operations.service.ts'] }], handoffs: ['INVENTORY_LOGISTICS','FINANCE','SAFETY_COMPLIANCE_RISK','MARINE_OPERATIONS'], closureEvidenceAr: ['أمر معتمد وخطة وتكليف الفني', 'سجل الأعمال والقطع والفحص ووقت الإنجاز', 'إقفال من شخص مستقل عن الفني وتحديث تاريخ الأصل'] },
  ADMIN_AFFAIRS_RECORDS: {
    cycles: [{ titleAr: 'المعاملة والمراسلة ومحضر الاجتماع', stepsAr: ['استقبال أو إنشاء وتسجيل وترقيم', 'تصنيف السرية والجهة والمرفقات', 'إحالة وتكليف ضمن النطاق', 'مراجعة وقرار أو رد من صاحب الصلاحية', 'متابعة التسليم وتنفيذ القرارات', 'تحقق اكتمال المعاملة وحفظ النسخ والأرشفة'], sourcePaths: ['apps/api/src/administrative-affairs/administrative-affairs-workflow.service.ts','apps/api/src/administrative-affairs/administrative-affairs-operations.service.ts'] }], handoffs: ['EXECUTIVE_GOVERNANCE','LEGAL_CONTRACTS_INSURANCE'], closureEvidenceAr: ['مرجع الوارد أو الصادر والمرفقات والإحالات', 'محضر أو رد معتمد ودليل التسليم والمتابعة', 'نسخة محفوظة بصلاحياتها وسجل الإقفال والاحتفاظ'] },
  EXECUTIVE_GOVERNANCE: {
    cycles: [{ titleAr: 'القرار والتفويض والمتابعة', stepsAr: ['مذكرة القرار أو طلب التفويض وأدلته', 'مراجعة الاختصاص والأثر والتعارض', 'اعتماد مستقل من الجهة المخولة', 'إصدار القرار أو التفويض محدد النطاق والمدة', 'تكليف التنفيذ ومتابعة الأدلة والتصعيد', 'التحقق من النتيجة وإقفال القرار أو إنهاء التفويض'], sourcePaths: ['apps/api/src/executive-governance/executive-governance-workflow.service.ts','apps/api/src/executive-governance/executive-governance-operations.service.ts'] }], handoffs: ['LEGAL_CONTRACTS_INSURANCE','FINANCE','TECHNOLOGY_CYBERSECURITY'], closureEvidenceAr: ['محضر الاعتماد والاختصاص وعدم تعارض المصالح', 'قرار صادر ومكلفون ومواعيد وأدلة تنفيذ', 'قرار إقفال أو انتهاء تفويض وأثر سحب صلاحياته'] },
  RND_MARKET_INTELLIGENCE: {
    cycles: [{ titleAr: 'البحث والفرصة ودراسة الجدوى', stepsAr: ['موجز البحث والسؤال والمنهج والمصادر', 'مراجعة مستقلة واعتماد المبادرة', 'جمع الأدلة والتحليل أو التجربة المصرح بها', 'مراجعة الدراسة والافتراضات والنتائج', 'توصية وجدوى وإحالة القرار الاستثماري لصاحبه', 'توثيق النتيجة والدروس وإقفال المبادرة'], sourcePaths: ['apps/api/src/research-market/research-market-workflow.service.ts','apps/api/src/research-market/research-market-operations.service.ts'] }], handoffs: ['MARKETING_GROWTH','FINANCE','EXECUTIVE_GOVERNANCE'], closureEvidenceAr: ['نسخ المصادر والمنهج وأدلة الدراسة', 'مراجعة مستقلة للنتيجة والافتراضات', 'توصية وقرار صاحب الاختصاص وإقفال المبادرة دون إطلاق تلقائي'] },
  LEGAL_CONTRACTS_INSURANCE: {
    cycles: [{ titleAr: 'المراجعة والعقد والالتزام والتأمين', stepsAr: ['فتح الموضوع وتحديد صاحب العمل والمصدر والإصدار', 'تحقق الانطباق ومراجعة قانونية مستقلة', 'قرار الاعتماد أو الإعادة واستكمال الشروط', 'توقيع الأطراف المخولة وحفظ النسخة المقفلة', 'متابعة الالتزامات والتجديد والتأمين والمطالبة', 'التحقق من الوفاء أو التسوية والإنهاء والأرشفة'], sourcePaths: ['apps/api/src/legal-governance/legal-governance-workflow.service.ts','apps/api/src/document-forms/contract-library.service.ts','apps/api/src/document-forms/cooperation-contract.service.ts'] }], handoffs: ['EXECUTIVE_GOVERNANCE','FINANCE','HR','ADMIN_AFFAIRS_RECORDS'], closureEvidenceAr: ['مصدر بإصداره ومتطلبه وانطباقه وقرار المراجعة المستقلة', 'نسخة العقد الموقعة وأدلة صفة الأطراف', 'سجل الالتزامات أو المطالبة والتسوية ومواعيد الاحتفاظ'] },
};

export const OPERATING_CYCLE_CLOSURE_GATES = [
  { id: 'REFERENCE_APPLICABILITY', labelAr: 'المصدر والإصدار والمادة والانطباق وقرار الاعتماد موثقة' },
  { id: 'DOCUMENT_COVERAGE', labelAr: 'جميع عائلات مستندات الإجراء محددة؛ القوالب الثلاثة الأساسية ليست حصرًا كاملًا' },
  { id: 'SCOPED_AUTHORIZATION', labelAr: 'صلاحية فعلية بنطاق الإدارة والمركز وفصل المنشئ والمراجع والمعتمد والمنفذ حيث يلزم' },
  { id: 'PERSISTED_EXECUTION', labelAr: 'الإجراء منفذ في مجاله مع مرجع السجل وأثره الفعلي وتسليم الإدارات المرتبطة' },
  { id: 'VERIFICATION_AND_EXCEPTIONS', labelAr: 'النتيجة متحقق منها ومعالجة الإعادة والرفض والإلغاء والتظلم والتعارض' },
  { id: 'REVISION_PRINT_RETENTION', labelAr: 'الإصدارات والأدلة والطباعة العربية والاحتفاظ والأرشفة قابلة للتتبع' },
  { id: 'END_TO_END_ACCEPTANCE', labelAr: 'اختبار كامل للنجاح والمنع والعزل والتزامن ثم تحقق النشر وقبول التشغيل المطلوب' },
] as const;

export function departmentOperatingCycle(code: DepartmentCode) {
  const templates = [...buildDepartmentTemplateCatalog('catalog-scope'), ...buildOperationalDocumentCatalog('catalog-scope')].filter(t => t.department === code);
  return {
    specificationVersion: '2026-10-24.v1',
    scopeStatus: 'EXISTING_BASELINES_AND_CURRENT_USER_SCOPE',
    ...DEPARTMENT_OPERATING_CYCLES[code],
    sharedDocumentStates: ['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED'],
    sharedEngineBoundaryAr: 'الاعتماد والتوقيع والأرشفة حالات مستند؛ التنفيذ والتحقق والإقفال أعمال في المجال المختص، ويلزم إثبات ربطها بالمستند.',
    canonicalTemplates: templates.map(t => ({ code: t.code, titleAr: t.titleAr, titleEn: t.titleEn, department: t.department })),
    closureGates: OPERATING_CYCLE_CLOSURE_GATES.map(g => ({ ...g, verificationStatus: 'NOT_ASSESSED' as const })),
    closureAssessment: 'NOT_ASSESSED',
    departmentClosed: false,
    closureDecisionReference: null,
    completeDocumentInventoryVerified: false,
  };
}
