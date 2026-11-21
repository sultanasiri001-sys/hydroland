// Approved duration schedule 0.1. These rules describe the source records
// represented in the download. They do not schedule a deletion or expire a downloaded file.
const exportRules = {
  ACCOUNT: [
    { recordClass: 'ACCOUNT_PROFILE', basis: 'DURATION_OF_ACCOUNT_SERVICE', labelAr: 'طوال تقديم خدمة الحساب. عند إغلاقه وإتمام التسويات تراجع بيانات الملف، وتفصل المستندات التي لها التزام مستقل.' },
    { recordClass: 'CREDENTIAL_REFERENCES', basis: 'VERIFICATION_OR_VALIDITY_AS_NEEDED', labelAr: 'تحفظ مراجع التحقق والصلاحية بقدر الحاجة للغرض.' },
  ],
  BOOKINGS: [
    { recordClass: 'BOOKINGS_RENTALS', basis: 'MAXIMUM', months: 12, startEvent: 'LATEST_OF_COMPLETION_CANCELLATION_SETTLEMENT', reviewEveryMonths: 3, labelAr: 'حتى ١٢ شهرًا من آخر حدث بين الإتمام أو الإلغاء أو التسوية. يراجع التشغيل الحاجة كل ثلاثة أشهر.' },
  ],
  PAYMENTS: [
    { recordClass: 'COMMERCIAL_BOOK_SUPPORT', basis: 'CONDITIONAL_MINIMUM', years: 10, appliesWhen: 'CLASSIFIED_WITHIN_COMMERCIAL_BOOK_OBLIGATIONS', labelAr: 'إذا صنّفت المالية السجل ضمن الدفاتر التجارية أو مؤيداتها، فالحد الأدنى في الجدول عشر سنوات عند الانطباق.' },
    { recordClass: 'VAT_RECORDS', basis: 'CONDITIONAL_MINIMUM', years: 6, startEvent: 'TAX_PERIOD_END', appliesWhen: 'VAT_OBLIGATION_APPLIES', labelAr: 'لسجلات الضريبة عند الانطباق ست سنوات على الأقل من نهاية الفترة الضريبية. تراجع المالية حكم الأصول الرأسمالية وأي التزام أطول.' },
  ],
  SENT_MESSAGES: [
    { recordClass: 'TRIP_COORDINATION', basis: 'CONDITIONAL_MAXIMUM', days: 90, startEvent: 'TRIP_END_OR_CANCELLATION', appliesWhen: 'TRIP_COORDINATION_CONVERSATION', labelAr: 'لمحادثات تنسيق الرحلة حتى ٩٠ يومًا من انتهائها أو إلغائها. تفصل الرسالة المرتبطة بواقعة عن بقية المحادثة.' },
    { recordClass: 'PRIVATE_MEMBER_CONVERSATION', basis: 'REQUIRES_SEPARATE_PRODUCT_DECISION', labelAr: 'للمحادثات الخاصة بين الأعضاء قرار مستقل يراعي الطرف الآخر.' },
  ],
} as const;

export function exportRetentionPolicy(domain: keyof typeof exportRules) {
  return {
    version: '0.1', status: 'DURATIONS_APPROVED_PENDING_EFFECTIVE_DATE',
    activationCondition: 'TECHNICAL_WORK_COMPLETED', effectiveFrom: null, scope: 'SOURCE_RECORD_CLASS_GUIDANCE',
    recordLevelDispositionAssessed: false, automaticDeletionAuthorized: false,
    noticeAr: 'اعتمدت مدد الجدول. تبدأ عند إتمام العمل التقني. يراجع المخوّل انطباق القاعدة وموانع الإتلاف على كل سجل.',
    rules: exportRules[domain],
  };
}
