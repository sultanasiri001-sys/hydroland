export type WorkforcePositionDefinition = {
  code: string;
  titleAr: string;
  titleEn: string;
  externalLiaisonEligible?: boolean;
  canManageExternalCenter?: boolean;
  permissions: string[];
};

export type WorkforceDepartmentDefinition = {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  enabled: boolean;
  humanResources?: boolean;
  manager: WorkforcePositionDefinition;
  assistants: WorkforcePositionDefinition[];
};

export const WORKFORCE_CATALOG: WorkforceDepartmentDefinition[] = [
  {
    code: 'MARINE_OPERATIONS', nameAr: 'العمليات البحرية والرحلات', nameEn: 'Marine Operations & Trips', enabled: true,
    description: 'تخطيط وتشغيل الرحلات والقوارب والطاقم والجدولة والتنسيق الميداني.',
    manager: { code: 'MARINE_OPERATIONS_MANAGER', titleAr: 'مدير العمليات البحرية والرحلات', titleEn: 'Marine Operations Manager', permissions: ['trips.manage', 'crew.manage', 'vessels.manage'] },
    assistants: [
      { code: 'TRIP_SCHEDULING_ASSISTANT', titleAr: 'مساعد جدولة الرحلات', titleEn: 'Trip Scheduling Assistant', permissions: ['trips.schedule'] },
      { code: 'VESSEL_CREW_ASSISTANT', titleAr: 'مساعد القوارب والطاقم', titleEn: 'Vessel & Crew Assistant', permissions: ['crew.coordinate', 'vessels.coordinate'] },
      { code: 'MARINE_WEATHER_ASSISTANT', titleAr: 'مساعد الطقس والبحر', titleEn: 'Marine Weather Assistant', permissions: ['weather.read', 'marine.signals.read'] },
      { code: 'FIELD_OPERATIONS_LIAISON', titleAr: 'مساعد التنسيق الميداني والخارجي', titleEn: 'Field Operations Liaison', externalLiaisonEligible: true, permissions: ['trips.coordinate', 'centers.liaise'] },
    ],
  },
  {
    code: 'SAFETY_QUALITY', nameAr: 'السلامة والطوارئ والجودة', nameEn: 'Safety, Emergency & Quality', enabled: true,
    description: 'قرارات الجاهزية والمخاطر وقوائم الفحص والحوادث والطوارئ وضمان الجودة.',
    manager: { code: 'SAFETY_QUALITY_MANAGER', titleAr: 'مدير السلامة والطوارئ والجودة', titleEn: 'Safety & Quality Manager', permissions: ['safety.manage', 'incidents.manage', 'quality.manage'] },
    assistants: [
      { code: 'RISK_ASSESSMENT_ASSISTANT', titleAr: 'مساعد تقييم المخاطر', titleEn: 'Risk Assessment Assistant', permissions: ['risk.assess'] },
      { code: 'SAFETY_CHECKLIST_ASSISTANT', titleAr: 'مساعد قوائم وفحوص السلامة', titleEn: 'Safety Checklist Assistant', permissions: ['safety.checklists'] },
      { code: 'EMERGENCY_INCIDENT_ASSISTANT', titleAr: 'مساعد الحوادث والطوارئ', titleEn: 'Emergency & Incident Assistant', permissions: ['incidents.coordinate'] },
      { code: 'QUALITY_CENTER_LIAISON', titleAr: 'مساعد الجودة وتدقيق المراكز', titleEn: 'Quality Center Liaison', externalLiaisonEligible: true, permissions: ['quality.audit', 'centers.liaise'] },
    ],
  },
  {
    code: 'LEGAL_COMPLIANCE', nameAr: 'الامتثال والقانون والعقود', nameEn: 'Legal, Compliance & Contracts', enabled: true,
    description: 'اللوائح والتصاريح والعقود والتوقيع والتأمين والعلاقات الحكومية.',
    manager: { code: 'LEGAL_COMPLIANCE_MANAGER', titleAr: 'مدير الامتثال والقانون والعقود', titleEn: 'Legal & Compliance Manager', permissions: ['compliance.manage', 'contracts.manage'] },
    assistants: [
      { code: 'REGULATORY_PERMITS_ASSISTANT', titleAr: 'مساعد اللوائح والتصاريح', titleEn: 'Regulatory & Permits Assistant', permissions: ['permits.review', 'regulations.read'] },
      { code: 'CONTRACT_ESIGN_ASSISTANT', titleAr: 'مساعد العقود والتوقيع الإلكتروني', titleEn: 'Contracts & E-sign Assistant', permissions: ['contracts.prepare', 'esign.coordinate'] },
      { code: 'INSURANCE_CLAIMS_ASSISTANT', titleAr: 'مساعد التأمين والمطالبات', titleEn: 'Insurance & Claims Assistant', permissions: ['insurance.coordinate'] },
      { code: 'LEGAL_CENTER_LIAISON', titleAr: 'مساعد الشؤون القانونية للمراكز الخارجية', titleEn: 'External Center Legal Liaison', externalLiaisonEligible: true, permissions: ['legal.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'TRAINING_CERTIFICATION', nameAr: 'التدريب والشهادات', nameEn: 'Training & Certification', enabled: true,
    description: 'الدورات والمدربون والطلاب والاختبارات والشهادات والاعتمادات.',
    manager: { code: 'TRAINING_MANAGER', titleAr: 'مدير التدريب والشهادات', titleEn: 'Training & Certification Manager', permissions: ['training.manage', 'certifications.manage'] },
    assistants: [
      { code: 'COURSE_CONTENT_ASSISTANT', titleAr: 'مساعد الدورات والمحتوى', titleEn: 'Course & Content Assistant', permissions: ['training.content'] },
      { code: 'INSTRUCTOR_STUDENT_ASSISTANT', titleAr: 'مساعد المدربين والطلاب', titleEn: 'Instructor & Student Assistant', permissions: ['training.people'] },
      { code: 'EXAMS_CERTIFICATES_ASSISTANT', titleAr: 'مساعد الاختبارات والشهادات', titleEn: 'Exams & Certificates Assistant', permissions: ['training.assess', 'certifications.issue'] },
      { code: 'TRAINING_CENTER_LIAISON', titleAr: 'مساعد التدريب للمراكز الخارجية', titleEn: 'External Training Liaison', externalLiaisonEligible: true, permissions: ['training.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'MEMBERSHIPS_PROVIDERS', nameAr: 'العضويات ومقدمو الخدمات', nameEn: 'Memberships & Providers', enabled: true,
    description: 'تسجيل واعتماد الغواصين والمدربين والمراكز والقوارب والشركات والجهات.',
    manager: { code: 'MEMBERSHIPS_MANAGER', titleAr: 'مدير العضويات ومقدمي الخدمات', titleEn: 'Memberships & Providers Manager', permissions: ['memberships.manage', 'providers.manage'] },
    assistants: [
      { code: 'ONBOARDING_VERIFICATION_ASSISTANT', titleAr: 'مساعد التسجيل والتحقق', titleEn: 'Onboarding & Verification Assistant', permissions: ['onboarding.review'] },
      { code: 'DIVER_INSTRUCTOR_MEMBERSHIP_ASSISTANT', titleAr: 'مساعد عضويات الغواصين والمدربين', titleEn: 'Diver & Instructor Membership Assistant', permissions: ['memberships.divers', 'memberships.instructors'] },
      { code: 'CENTER_BOAT_PROVIDER_ASSISTANT', titleAr: 'مساعد المراكز والقوارب ومقدمي الخدمة', titleEn: 'Center & Boat Provider Assistant', permissions: ['providers.centers', 'providers.boats'] },
      { code: 'EXTERNAL_CENTER_MANAGER', titleAr: 'مدير المركز الخارجي والمتابعة الإدارية', titleEn: 'External Center Manager', externalLiaisonEligible: true, canManageExternalCenter: true, permissions: ['centers.administer', 'centers.liaise'] },
    ],
  },
  {
    code: 'COMMERCE_LOGISTICS', nameAr: 'المتجر والمعدات واللوجستيات', nameEn: 'Commerce, Equipment & Logistics', enabled: true,
    description: 'المخزون والتأجير والموردون والمشتريات والشحن والصيانة والفحص.',
    manager: { code: 'COMMERCE_LOGISTICS_MANAGER', titleAr: 'مدير المتجر والمعدات واللوجستيات', titleEn: 'Commerce & Logistics Manager', permissions: ['inventory.manage', 'commerce.manage', 'logistics.manage'] },
    assistants: [
      { code: 'INVENTORY_ASSISTANT', titleAr: 'مساعد المخزون', titleEn: 'Inventory Assistant', permissions: ['inventory.manage'] },
      { code: 'EQUIPMENT_RENTAL_ASSISTANT', titleAr: 'مساعد تأجير المعدات', titleEn: 'Equipment Rental Assistant', permissions: ['rentals.manage'] },
      { code: 'SUPPLIERS_PROCUREMENT_ASSISTANT', titleAr: 'مساعد الموردين والمشتريات', titleEn: 'Suppliers & Procurement Assistant', permissions: ['procurement.manage'] },
      { code: 'SHIPPING_MAINTENANCE_ASSISTANT', titleAr: 'مساعد الشحن والصيانة', titleEn: 'Shipping & Maintenance Assistant', permissions: ['shipping.manage', 'maintenance.manage'] },
      { code: 'LOGISTICS_CENTER_LIAISON', titleAr: 'مساعد اللوجستيات للمراكز الخارجية', titleEn: 'External Logistics Liaison', externalLiaisonEligible: true, permissions: ['logistics.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'SALES_PARTNERSHIPS', nameAr: 'المبيعات والشراكات', nameEn: 'Sales & Partnerships', enabled: true,
    description: 'مبيعات الأفراد والشركات والجهات الحكومية والشراكات وإدارة العملاء.',
    manager: { code: 'SALES_PARTNERSHIPS_MANAGER', titleAr: 'مدير المبيعات والشراكات', titleEn: 'Sales & Partnerships Manager', permissions: ['sales.manage', 'partnerships.manage'] },
    assistants: [
      { code: 'CONSUMER_SALES_ASSISTANT', titleAr: 'مساعد مبيعات الأفراد', titleEn: 'Consumer Sales Assistant', permissions: ['sales.consumer'] },
      { code: 'B2B_B2G_SALES_ASSISTANT', titleAr: 'مساعد مبيعات الشركات والجهات الحكومية', titleEn: 'B2B & B2G Sales Assistant', permissions: ['sales.business', 'sales.government'] },
      { code: 'CRM_REVENUE_ASSISTANT', titleAr: 'مساعد العملاء والإيرادات', titleEn: 'CRM & Revenue Assistant', permissions: ['crm.manage', 'revenue.read'] },
      { code: 'SALES_CENTER_LIAISON', titleAr: 'مساعد المبيعات للمراكز الخارجية', titleEn: 'External Sales Liaison', externalLiaisonEligible: true, permissions: ['sales.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'MARKETING_CONTENT', nameAr: 'التسويق والمحتوى', nameEn: 'Marketing & Content', enabled: true,
    description: 'المحتوى والتصميم والإعلانات والنمو وإدارة منصات التواصل.',
    manager: { code: 'MARKETING_MANAGER', titleAr: 'مدير التسويق والمحتوى', titleEn: 'Marketing & Content Manager', permissions: ['marketing.manage', 'content.manage'] },
    assistants: [
      { code: 'CONTENT_ASSISTANT', titleAr: 'مساعد المحتوى', titleEn: 'Content Assistant', permissions: ['content.create'] },
      { code: 'DESIGN_ASSISTANT', titleAr: 'مساعد التصميم', titleEn: 'Design Assistant', permissions: ['design.create'] },
      { code: 'ADS_GROWTH_ASSISTANT', titleAr: 'مساعد الإعلانات والنمو', titleEn: 'Ads & Growth Assistant', permissions: ['ads.manage', 'growth.analyze'] },
      { code: 'SOCIAL_CENTER_LIAISON', titleAr: 'مساعد التواصل والمراكز الخارجية', titleEn: 'Social & External Center Liaison', externalLiaisonEligible: true, permissions: ['social.manage', 'centers.liaise'] },
    ],
  },
  {
    code: 'CUSTOMER_COMMUNITY', nameAr: 'خدمة العملاء والمجتمع', nameEn: 'Customer Experience & Community', enabled: true,
    description: 'المحادثة والاتصال والشكاوى والاستشارات والمجتمع والمتطوعون.',
    manager: { code: 'CUSTOMER_COMMUNITY_MANAGER', titleAr: 'مدير خدمة العملاء والمجتمع', titleEn: 'Customer & Community Manager', permissions: ['support.manage', 'community.manage'] },
    assistants: [
      { code: 'CHAT_WHATSAPP_ASSISTANT', titleAr: 'مساعد المحادثة والواتساب', titleEn: 'Chat & WhatsApp Assistant', permissions: ['support.chat'] },
      { code: 'CALL_CENTER_ASSISTANT', titleAr: 'مساعد مركز الاتصال', titleEn: 'Call Center Assistant', permissions: ['support.calls'] },
      { code: 'COMPLAINTS_CONSULTATIONS_ASSISTANT', titleAr: 'مساعد الشكاوى والاستشارات', titleEn: 'Complaints & Consultations Assistant', permissions: ['support.cases'] },
      { code: 'COMMUNITY_CENTER_LIAISON', titleAr: 'مساعد المجتمع والمراكز الخارجية', titleEn: 'Community & External Center Liaison', externalLiaisonEligible: true, permissions: ['community.coordinate', 'centers.liaise'] },
    ],
  },
  {
    code: 'FINANCE_ACCOUNTING', nameAr: 'المالية والمحاسبة', nameEn: 'Finance & Accounting', enabled: true,
    description: 'المدفوعات والفواتير والتسويات والاستردادات والتقارير والميزانيات.',
    manager: { code: 'FINANCE_MANAGER', titleAr: 'مدير المالية والمحاسبة', titleEn: 'Finance & Accounting Manager', permissions: ['finance.manage'] },
    assistants: [
      { code: 'PAYMENTS_INVOICES_ASSISTANT', titleAr: 'مساعد المدفوعات والفواتير', titleEn: 'Payments & Invoices Assistant', permissions: ['payments.manage', 'invoices.manage'] },
      { code: 'SETTLEMENTS_REFUNDS_ASSISTANT', titleAr: 'مساعد التسويات والاستردادات', titleEn: 'Settlements & Refunds Assistant', permissions: ['settlements.manage', 'refunds.manage'] },
      { code: 'BUDGET_REPORTING_ASSISTANT', titleAr: 'مساعد الميزانية والتقارير', titleEn: 'Budget & Reporting Assistant', permissions: ['budgets.manage', 'finance.reports'] },
      { code: 'FINANCE_CENTER_LIAISON', titleAr: 'مساعد المالية للمراكز الخارجية', titleEn: 'External Center Finance Liaison', externalLiaisonEligible: true, permissions: ['finance.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'PRODUCT_TECH_AI', nameAr: 'المنتج والتقنية والذكاء الاصطناعي', nameEn: 'Product, Technology & AI', enabled: true,
    description: 'تطوير المنصة وتجربة المستخدم والتكاملات والبيانات والتحليلات والوكلاء.',
    manager: { code: 'PRODUCT_TECH_AI_MANAGER', titleAr: 'مدير المنتج والتقنية والذكاء الاصطناعي', titleEn: 'Product, Technology & AI Manager', permissions: ['product.manage', 'technology.manage', 'agents.manage'] },
    assistants: [
      { code: 'PLATFORM_DEVELOPMENT_ASSISTANT', titleAr: 'مساعد تطوير المنصة', titleEn: 'Platform Development Assistant', permissions: ['platform.develop'] },
      { code: 'UX_QUALITY_ASSISTANT', titleAr: 'مساعد تجربة المستخدم وضمان الجودة', titleEn: 'UX & Quality Assistant', permissions: ['ux.manage', 'qa.manage'] },
      { code: 'INTEGRATIONS_ASSISTANT', titleAr: 'مساعد التكاملات', titleEn: 'Integrations Assistant', permissions: ['integrations.manage'] },
      { code: 'DATA_ANALYTICS_ASSISTANT', titleAr: 'مساعد البيانات والتحليلات', titleEn: 'Data & Analytics Assistant', permissions: ['analytics.manage'] },
      { code: 'AI_CENTER_LIAISON', titleAr: 'مساعد الوكلاء والمراكز الخارجية', titleEn: 'AI & External Center Liaison', externalLiaisonEligible: true, permissions: ['agents.coordinate', 'centers.liaise'] },
    ],
  },
  {
    code: 'CYBERSECURITY_PRIVACY', nameAr: 'الأمن السيبراني والخصوصية', nameEn: 'Cybersecurity & Privacy', enabled: true,
    description: 'مراقبة الأمن والصلاحيات وحماية البيانات والاستجابة للحوادث والتدقيق.',
    manager: { code: 'CYBERSECURITY_MANAGER', titleAr: 'مدير الأمن السيبراني والخصوصية', titleEn: 'Cybersecurity & Privacy Manager', permissions: ['security.manage', 'privacy.manage'] },
    assistants: [
      { code: 'SECURITY_MONITORING_ASSISTANT', titleAr: 'مساعد المراقبة الأمنية', titleEn: 'Security Monitoring Assistant', permissions: ['security.monitor'] },
      { code: 'IAM_ASSISTANT', titleAr: 'مساعد الهوية والصلاحيات', titleEn: 'Identity & Access Assistant', permissions: ['access.manage'] },
      { code: 'DATA_PRIVACY_ASSISTANT', titleAr: 'مساعد حماية البيانات والخصوصية', titleEn: 'Data Privacy Assistant', permissions: ['privacy.review'] },
      { code: 'SECURITY_CENTER_LIAISON', titleAr: 'مساعد الأمن للمراكز الخارجية', titleEn: 'External Center Security Liaison', externalLiaisonEligible: true, permissions: ['security.liaise', 'centers.liaise'] },
    ],
  },
  {
    code: 'HUMAN_RESOURCES', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', enabled: false, humanResources: true,
    description: 'قسم احتياطي مغلق افتراضيًا لتخطيط القوى العاملة والتوظيف والأداء وشؤون الموظفين.',
    manager: { code: 'HUMAN_RESOURCES_MANAGER', titleAr: 'مدير الموارد البشرية', titleEn: 'Human Resources Manager', permissions: ['hr.manage'] },
    assistants: [
      { code: 'WORKFORCE_PLANNING_ASSISTANT', titleAr: 'مساعد تخطيط القوى العاملة', titleEn: 'Workforce Planning Assistant', permissions: ['hr.plan'] },
      { code: 'RECRUITMENT_ONBOARDING_ASSISTANT', titleAr: 'مساعد التوظيف والتهيئة', titleEn: 'Recruitment & Onboarding Assistant', permissions: ['hr.recruit', 'hr.onboard'] },
      { code: 'PERFORMANCE_DEVELOPMENT_ASSISTANT', titleAr: 'مساعد الأداء والتطوير', titleEn: 'Performance & Development Assistant', permissions: ['hr.performance', 'hr.develop'] },
      { code: 'HR_CENTER_LIAISON', titleAr: 'مساعد الموارد البشرية للمراكز الخارجية', titleEn: 'External Center HR Liaison', externalLiaisonEligible: true, permissions: ['hr.liaise', 'centers.liaise'] },
    ],
  },
];

export const WORKFORCE_TOTALS = {
  departments: WORKFORCE_CATALOG.length,
  managers: WORKFORCE_CATALOG.length,
  assistants: WORKFORCE_CATALOG.reduce((total, department) => total + department.assistants.length, 0),
};
