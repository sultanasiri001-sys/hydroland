import type { DocumentFieldDefinition } from '../document-forms/document-form.domain';
const field=(key:string,labelAr:string,type:DocumentFieldDefinition['type']='TEXT',required=true,options?:string[]):DocumentFieldDefinition=>({key,labelAr,labelEn:labelAr,type,required,...(options?{options}:{})});
// Installed only by an explicit owner action into the existing document
// library. This defines blank forms; it never creates an approval or source.
export const privacyTemplates=[
  {code:'LEGAL-A15-RETENTION-ACTIVATION',titleAr:'نفاذ مدد الاحتفاظ بعد اكتمال العمل التقني',titleEn:'Retention schedule effective date',department:'LEGAL_CONTRACTS_INSURANCE',fields:[
    field('purpose','غرض القرار','SELECT',true,['A15_RETENTION_ACTIVATION']),field('policyVersion','إصدار الجدول','SELECT',true,['0.1']),
    field('technicalWorkCompleted','تحقق اكتمال العمل التقني','BOOLEAN'),field('acceptanceReference','مرجع قبول العمل التقني'),
    field('effectiveFrom','بدء النفاذ بصيغة UTC كاملة، بعد اعتماد القرار'),
  ]},
  {code:'LEGAL-A15-RECORD-DISPOSITION',titleAr:'قرار التصرف في سجل طلب بيانات محدد',titleEn:'Individual data request record disposition',department:'LEGAL_CONTRACTS_INSURANCE',fields:[
    field('purpose','غرض القرار','SELECT',true,['A15_RECORD_DISPOSITION']),field('policyVersion','إصدار الجدول','SELECT',true,['0.1']),
    field('requestId','مرجع طلب البيانات'),field('accountId','مرجع صاحب البيانات'),field('domain','نوع السجل','SELECT',true,['ACCOUNT','BOOKINGS','PAYMENTS','SENT_MESSAGES']),
    field('recordRef','مرجع السجل المحدد'),field('sourceHash','بصمة معاينة السجل'),
    field('recordClass','تصنيف السجل','SELECT',true,['ACCOUNT_PROFILE','BOOKINGS_RENTALS','PAYMENT_COMMERCIAL','PAYMENT_VAT','PAYMENT_COMMERCIAL_AND_VAT','PRIVATE_MEMBER_CONVERSATION']),
    field('accountClosureAt','وقت إغلاق الحساب بصيغة UTC كاملة','TEXT',false),field('commercialPeriodEnd','نهاية الفترة التجارية بصيغة UTC كاملة','TEXT',false),
    field('taxPeriodEnd','نهاية الفترة الضريبية بصيغة UTC كاملة','TEXT',false),field('additionalRetainUntil','أي التزام احتفاظ أطول بصيغة UTC كاملة','TEXT',false),
    field('settlementsComplete','اكتمال التسويات','BOOLEAN'),field('holdsReviewed','مراجعة التجميد والموانع','BOOLEAN'),field('noOutstandingLegalHold','عدم بقاء تجميد أو مانع نافذ','BOOLEAN'),
    field('holdReviewReference','مرجع مراجعة الموانع'),
  ]},
];

privacyTemplates.push({...privacyTemplates[1],code:'FIN-A15-RECORD-DISPOSITION',titleAr:'قرار التصرف في سجل مالي لطلب بيانات',titleEn:'Financial record disposition',department:'FINANCE'});
