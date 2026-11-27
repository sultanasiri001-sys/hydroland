(() => {
  const locale = window.HydrolandI18n?.createScope('participant-eligibility', {
    'موافقات المشاركة والأهلية': 'Participation consent and eligibility',
    'إغلاق موافقات المشاركة': 'Close participation consent',
    'تحديث': 'Refresh', 'عودة إلى الطلبات': 'Back to cases',
    'جارٍ تحميل البيانات…': 'Loading details…', 'جارٍ حفظ الإجراء…': 'Saving the action…',
    'تم حفظ الإجراء.': 'Action saved.',
    'تعذر تحميل البيانات. أعد المحاولة.': 'Could not load details. Try again.',
    'تعذر التحقق من بيانات الخادم.': 'The server response could not be verified.',
    'تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.': 'Details or permissions changed. Refresh and review the case before saving.',
    'تعذر التأكد من نتيجة الحفظ. يمكنك تحديث الحالة أو إعادة الطلب نفسه.': 'The save outcome is uncertain. Refresh the state or retry the same request.',
    'إعادة الطلب نفسه': 'Retry the same request',
    'طلب جديد مرتبط بالمشارك والخدمة': 'New case linked to the participant and service',
    'المشارك والخدمة': 'Participant and service',
    'مصدر المتطلبات والانطباق': 'Requirements and applicability source',
    'دليل هوية المشارك وعمره': 'Participant identity and age evidence',
    'اختر': 'Choose', 'إنشاء طلب المراجعة': 'Create review case',
    'لا توجد طلبات ضمن صلاحيتك الحالية.': 'There are no cases within your current scope.',
    'لم يجهز طلب لهذه المشاركة.': 'No case has been prepared for this participation.',
    'الحالة': 'Status', 'يتطلب إجراءً': 'Action required', 'مستوفٍ لمتطلبات المشاركة المحددة': 'Cleared for the specified participation requirements',
    'طلب الموافقة': 'Consent case', 'المشارك': 'Participant', 'الخدمة': 'Service',
    'الموعد': 'Schedule', 'المصدر': 'Source', 'الإصدار': 'Version', 'المرجع': 'Reference',
    'المراجعة والأدلة مرتبطة بالمشارك والخدمة والإصدار المحددين. الإقرار الذاتي لا يمنح تصريحًا طبيًا.': 'Reviews and evidence are bound to the specified participant, service and version. A self-declaration does not grant medical clearance.',
    'فتح الطلب': 'Open case', 'غير متاح': 'Unavailable', 'غير مسجل': 'Not recorded',
    'الطلبات الحالية': 'Current cases', 'مصادر الأدلة الخاصة': 'Private evidence sources',
    'سياسة وانطباق': 'Policy and applicability', 'هوية وعمر': 'Identity and age',
    'ولاية وموافقة القاصر': 'Guardian authority', 'دليل طبي': 'Medical evidence',
    'المشاركة في رحلة': 'Trip participation', 'التسجيل في تدريب': 'Training enrollment',
    'عرض المصدر': 'View source', 'سبب الإجراء': 'Reason for the action',
    'ملاحظات المراجعة': 'Review notes', 'أسباب الحاجة إلى إجراء': 'Reasons action is required',
    'موافقة المشارك أو وليه': 'Participant or guardian consent',
    'الاسم المسجل للموقّع': 'Recorded signer name',
    'أوافق على نص الإقرار والخدمة والإصدار المحددين أعلاه، وأوقع باسمي المسجل.': 'I agree to the declaration, service and version shown above and sign using my recorded name.',
    'تسجيل موافقتي': 'Record my consent', 'سحب موافقتي': 'Withdraw my consent',
    'ربط دليل': 'Link evidence', 'نوع الدليل': 'Evidence kind', 'الدليل الموقع': 'Signed evidence',
    'قرار أهلية المشاركة': 'Participation eligibility decision', 'مؤهل': 'Eligible', 'مرفوض': 'Rejected',
    'راجعت مصادر المتطلبات والأدلة وانطباقها على هذه المشاركة.': 'I reviewed the requirement sources, evidence and their applicability to this participation.',
    'حفظ مراجعة الأهلية': 'Save eligibility review', 'سحب قرار الأهلية': 'Revoke eligibility decision',
    'استبدال مصادر الطلب': 'Replace case sources', 'سجل الإجراءات': 'Action history',
    'تاريخ الإجراء': 'Action time', 'بصمة الإصدار': 'Version digest',
    'تأكد من الحقول المطلوبة قبل الإرسال.': 'Check the required fields before submitting.',
    'قراءة فقط': 'Read only', 'الطلب الحالي': 'Current case',
    'البيانات المعتمدة للمشارك': 'Reviewed participant details', 'اسم المشارك': 'Participant name',
    'تاريخ الميلاد': 'Date of birth', 'اسم ولي الأمر': 'Guardian name',
    'موقّع الموافقة': 'Consent signer', 'صفة الموقّع': 'Signer capacity', 'تاريخ التوقيع': 'Signed at',
    'تاريخ السحب': 'Withdrawn at', 'لم تُسجل موافقة.': 'No consent has been recorded.',
    'نص الإقرار العربي لهذا الإصدار': 'Arabic declaration for this version',
    'نص الإقرار الإنجليزي لهذا الإصدار': 'English declaration for this version',
    'مرجع المصدر المعتمد': 'Reviewed source reference', 'إصدار المصدر': 'Source edition',
    'المادة أو موضع النص': 'Clause or source locator', 'سبب الانطباق': 'Applicability reason',
    'بداية السريان': 'Effective from', 'نهاية الصلاحية المسجلة': 'Recorded validity end',
    'الحد الأدنى للعمر من المصدر': 'Minimum age from the source', 'حد عمر الولاية من المصدر': 'Guardian age boundary from the source',
    'انطباق الموافقة': 'Consent applicability', 'انطباق الدليل الطبي': 'Medical evidence applicability',
    'مطلوب بحسب المصدر': 'Required by the source', 'غير منطبق بحسب المصدر': 'Not applicable under the source',
    'النتيجة المسجلة في الدليل': 'Outcome recorded in the evidence', 'مستوفٍ للنشاط المحدد': 'Cleared for the specified activity',
    'غير مستوفٍ': 'Not cleared', 'يلزم مراجعة': 'Review required', 'القيود المسجلة دون تشخيص': 'Recorded limitations without diagnosis',
    'الجهة المصدرة': 'Issuer', 'مرجع اختصاص المصدر': 'Issuer professional reference',
    'القرار المسجل': 'Recorded decision', 'المشارك نفسه': 'Participant', 'ولي الأمر المثبت': 'Verified guardian',
    'الموافقة مسحوبة': 'Consent withdrawn', 'سبب السحب': 'Revocation reason',
    'سجل توقيع لإصدار سابق؛ الموافقة على النص الحالي تتطلب توقيعًا جديدًا.': 'Signature retained for an earlier version. Consent to the current wording requires a new signature.',
    'لا يوجد إجراء متاح في الحالة الحالية.': 'No action is available in the current state.',
    'مصدر الأدلة': 'Evidence source', 'عودة إلى الطلب': 'Back to case',
    'تقديم المصدر للمراجعة': 'Submit source for review', 'اعتماد المصدر': 'Approve source',
    'توقيع المصدر الإداري': 'Sign the administrative source', 'سحب المصدر': 'Revoke source',
    'هذه مراجعة إدارية لأصل الدليل؛ لا تُسجل توقيع المشارك أو الولي ولا تمنح اختصاصًا طبيًا للمراجع.': 'This is an administrative review of the original evidence. It does not record the participant’s or guardian’s signature or grant medical authority to the reviewer.',
    'مسودة': 'Draft', 'مقدم للمراجعة': 'Submitted for review', 'معتمد': 'Approved', 'موقع': 'Signed', 'مسحوب': 'Revoked',
    'تنزيل أصل PDF': 'Download original PDF', 'مرفقات المصدر الخاصة': 'Private source attachments',
    'تعذر تنزيل الملف.': 'Could not download the file.',
    'إنشاء مصدر خاص': 'Create private source', 'نوع المصدر': 'Source kind', 'الجهة': 'Organization',
    'عنوان المصدر': 'Source title', 'المستند الأصلي PDF': 'Original PDF document',
    'إرفاق ملف PDF واحد حتى 10 ميجابايت.': 'Attach one PDF up to 10 MB.',
    'حفظ مسودة المصدر': 'Save source draft',
    'الحساب الموثق للمشارك': 'Verified participant account', 'الحساب الموثق لولي الأمر': 'Verified guardian account',
    'البريد المطابق للحساب': 'Exact account email', 'تحقق من الحساب': 'Verify account',
    'لم يُتحقق من حساب.': 'No account has been verified.',
    'لا تربط حالة حساب أو عضوية بإثبات الولاية؛ يجب مراجعة أصل الولاية ونطاقه.': 'An account or membership does not establish guardian authority. Review the original authority evidence and its scope.',
    'نوع العلاقة المثبتة': 'Documented relationship', 'والد أو والدة': 'Parent', 'ولي قانوني': 'Legal guardian',
    'هوية غير مرتبطة بحساب مشارك': 'Identity not linked to a participant account',
    'مرجع المستند': 'Document reference', 'تاريخ الإصدار — توقيت الرياض': 'Issue time — Riyadh time',
    'بداية السريان — توقيت الرياض': 'Effective time — Riyadh time', 'نهاية الصلاحية — توقيت الرياض': 'Validity end — Riyadh time',
    'أدخل الحدود والتواريخ من المصدر المعتمد وانطباقه؛ لا تُفترض مدة طبية أو قاعدة عمر عامة.': 'Enter the limits and dates from the reviewed source and its applicability. No universal medical duration or age rule is assumed.',
    'نوع النشاط': 'Activity type', 'مرجع هوية المشارك': 'Participant identity source',
    'اختر الجهة والمشارك أولًا.': 'Choose the organization and participant first.',
    'توقيع موافقة': 'Consent signed', 'سحب موافقة': 'Consent withdrawn', 'ربط دليل جديد': 'Evidence linked',
    'مراجعة أهلية': 'Eligibility reviewed', 'سحب أهلية': 'Eligibility revoked', 'تغيير المصادر': 'Sources replaced',
    'سبب تجديد الموافقة بعد السحب أو الرفض': 'Reason for renewed consent after withdrawal or rejection',
    'المصدر يحتاج مراجعة؛ لا يُستخدم نصه لمنح موافقة جديدة.': 'The source needs review; its wording cannot be used to grant new consent.',
    'آخر تحديث للحالة': 'State last refreshed',
    'توقيت الرياض': 'Riyadh time',
    'من': 'From', 'إلى': 'To',
    'تحتاج مصادر الأهلية إلى مراجعة.': 'The eligibility sources need review.',
    'سجل الإجراءات لا يطابق الأدلة المحفوظة.': 'The action history does not match the retained evidence.',
    'قرار الأهلية مسحوب.': 'The eligibility decision has been revoked.',
    'الموافقة الشخصية مسحوبة.': 'Personal consent has been withdrawn.',
    'المشاركة مرفوضة بقرار المراجعة.': 'Participation was rejected by the reviewer.',
    'تغيرت بيانات المشارك أو الخدمة؛ يلزم ربط ومراجعة جديدان.': 'Participant or service details changed; new binding and review are required.',
    'جهة التشغيل غير نشطة.': 'The operating organization is inactive.',
    'تعذر التحقق من المشارك أو الخدمة.': 'The participant or service could not be verified.',
    'تغير مصدر المتطلبات أو إصداره.': 'The requirements source or its version changed.',
    'مصدر المتطلبات مسحوب.': 'The requirements source has been revoked.',
    'تعذر اعتماد مصدر المتطلبات الحالي.': 'The current requirements source could not be verified.',
    'المصدر لا ينطبق على النشاط أو الفترة المحددين.': 'The source does not apply to the specified activity or period.',
    'تغير دليل الهوية أو لم يعد يغطي الفترة المطلوبة.': 'Identity evidence changed or no longer covers the required period.',
    'دليل الهوية مسحوب.': 'Identity evidence has been revoked.',
    'تعذر التحقق من دليل الهوية.': 'Identity evidence could not be verified.',
    'حساب المشارك أو هويته لا يطابقان الدليل.': 'The participant account or identity does not match the evidence.',
    'حساب المشارك غير نشط.': 'The participant account is inactive.',
    'العمر لا يستوفي متطلبات المصدر المنطبق.': 'The age does not meet the applicable source requirements.',
    'يلزم دليل ولاية صالح لهذا العمر والخدمة.': 'Valid guardian authority evidence is required for this age and service.',
    'تغير دليل الولاية أو إصداره.': 'Guardian authority evidence or its version changed.',
    'دليل الولاية مسحوب.': 'Guardian authority evidence has been revoked.',
    'تعذر التحقق من دليل الولاية.': 'Guardian authority evidence could not be verified.',
    'دليل الولاية لا يغطي المشارك والخدمة والفترة المحددين.': 'Guardian authority evidence does not cover the specified participant, service and period.',
    'هوية الولي لا تطابق الدليل أو الحساب غير نشط.': 'The guardian identity does not match the evidence or the account is inactive.',
    'يلزم دليل طبي منطبق بحسب مصدر هذه الخدمة.': 'Applicable medical evidence is required by this service’s source.',
    'تغير الدليل الطبي أو إصداره.': 'Medical evidence or its version changed.',
    'الدليل الطبي مسحوب.': 'Medical evidence has been revoked.',
    'تعذر التحقق من الدليل الطبي.': 'Medical evidence could not be verified.',
    'الدليل الطبي لا يغطي المشارك والنشاط والفترة المحددين.': 'Medical evidence does not cover the specified participant, activity and period.',
    'الدليل يسجل عدم الاستيفاء للنشاط المحدد.': 'The evidence records that the specified activity is not cleared.',
    'نتيجة الدليل أو قيوده تتطلب مراجعة مختصة.': 'The evidence outcome or limitations require qualified review.',
    'يلزم تسجيل موافقة المشارك أو وليه المثبت.': 'Consent from the participant or verified guardian is required.',
    'الموافقة لا تطابق النص والمصدر الحاليين.': 'The consent does not match the current wording and source.',
    'يلزم قرار مراجعة أهلية مستقل.': 'An independent eligibility review decision is required.',
    'قرار المراجعة لا يطابق الأدلة الحالية.': 'The review decision does not match the current evidence.',
    'تغيرت صلاحية المراجع؛ يلزم قرار جديد.': 'Reviewer authority changed; a new decision is required.',
    'مراجعة أهلية المشارك الأصلية غير مكتملة.': 'The original participant eligibility review is incomplete.',
  });
  const auth = () => window.HydrolandAuth;
  const profile = () => window.HydrolandProfileData?.profile;
  const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
  const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const sourceKinds = ['POLICY','IDENTITY','GUARDIAN','MEDICAL'];
  const actionNames = ['LINK_EVIDENCE','SIGN_CONSENT','WITHDRAW_CONSENT','REVIEW','REVOKE','REPLACE_SOURCES'];
  const reasonLabels={SOURCE_REVIEW_REQUIRED:'تحتاج مصادر الأهلية إلى مراجعة.',HISTORY_INVALID:'سجل الإجراءات لا يطابق الأدلة المحفوظة.',REVOKED:'قرار الأهلية مسحوب.',CONSENT_WITHDRAWN:'الموافقة الشخصية مسحوبة.',REJECTED:'المشاركة مرفوضة بقرار المراجعة.',SUBJECT_CHANGED:'تغيرت بيانات المشارك أو الخدمة؛ يلزم ربط ومراجعة جديدان.',OPERATOR_INACTIVE:'جهة التشغيل غير نشطة.',SUBJECT_UNAVAILABLE:'تعذر التحقق من المشارك أو الخدمة.',POLICY_CHANGED:'تغير مصدر المتطلبات أو إصداره.',POLICY_REVOKED:'مصدر المتطلبات مسحوب.',POLICY_INVALID:'تعذر اعتماد مصدر المتطلبات الحالي.',POLICY_NOT_APPLICABLE:'المصدر لا ينطبق على النشاط أو الفترة المحددين.',IDENTITY_CHANGED:'تغير دليل الهوية أو لم يعد يغطي الفترة المطلوبة.',IDENTITY_REVOKED:'دليل الهوية مسحوب.',IDENTITY_INVALID:'تعذر التحقق من دليل الهوية.',IDENTITY_ACCOUNT_MISMATCH:'حساب المشارك أو هويته لا يطابقان الدليل.',IDENTITY_PERSON_CHANGED:'حساب المشارك أو هويته لا يطابقان الدليل.',PARTICIPANT_INACTIVE:'حساب المشارك غير نشط.',AGE_REQUIREMENT:'العمر لا يستوفي متطلبات المصدر المنطبق.',GUARDIAN_REQUIRED:'يلزم دليل ولاية صالح لهذا العمر والخدمة.',GUARDIAN_CHANGED:'تغير دليل الولاية أو إصداره.',GUARDIAN_REVOKED:'دليل الولاية مسحوب.',GUARDIAN_INVALID:'تعذر التحقق من دليل الولاية.',GUARDIAN_NOT_APPLICABLE:'دليل الولاية لا يغطي المشارك والخدمة والفترة المحددين.',GUARDIAN_IDENTITY:'هوية الولي لا تطابق الدليل أو الحساب غير نشط.',GUARDIAN_INACTIVE:'هوية الولي لا تطابق الدليل أو الحساب غير نشط.',MEDICAL_REQUIRED:'يلزم دليل طبي منطبق بحسب مصدر هذه الخدمة.',MEDICAL_CHANGED:'تغير الدليل الطبي أو إصداره.',MEDICAL_REVOKED:'الدليل الطبي مسحوب.',MEDICAL_INVALID:'تعذر التحقق من الدليل الطبي.',MEDICAL_NOT_APPLICABLE:'الدليل الطبي لا يغطي المشارك والنشاط والفترة المحددين.',MEDICAL_PROHIBITION:'الدليل يسجل عدم الاستيفاء للنشاط المحدد.',MEDICAL_REVIEW_REQUIRED:'نتيجة الدليل أو قيوده تتطلب مراجعة مختصة.',CONSENT_REQUIRED:'يلزم تسجيل موافقة المشارك أو وليه المثبت.',CONSENT_STALE:'الموافقة لا تطابق النص والمصدر الحاليين.',REVIEW_REQUIRED:'يلزم قرار مراجعة أهلية مستقل.',DECISION_STALE:'قرار المراجعة لا يطابق الأدلة الحالية.',REVIEW_AUTHORITY_CHANGED:'تغيرت صلاحية المراجع؛ يلزم قرار جديد.',NATIVE_REVIEW_REQUIRED:'مراجعة أهلية المشارك الأصلية غير مكتملة.'};
  const labels = {POLICY:'سياسة وانطباق',IDENTITY:'هوية وعمر',GUARDIAN:'ولاية وموافقة القاصر',MEDICAL:'دليل طبي',BOOKING_PARTICIPANT:'المشاركة في رحلة',TRAINING_ENROLLMENT:'التسجيل في تدريب',CLEARED:'مستوفٍ لمتطلبات المشاركة المحددة',ACTION_REQUIRED:'يتطلب إجراءً',REQUIRED:'مطلوب بحسب المصدر',NOT_APPLICABLE:'غير منطبق بحسب المصدر',CLEARED_FOR_ACTIVITY:'مستوفٍ للنشاط المحدد',NOT_CLEARED:'غير مستوفٍ',REQUIRES_REVIEW:'يلزم مراجعة',ELIGIBLE:'مؤهل',REJECTED:'مرفوض',PARTICIPANT:'المشارك نفسه',GUARDIAN_ACTOR:'ولي الأمر المثبت',DRAFT:'مسودة',SUBMITTED:'مقدم للمراجعة',PENDING_APPROVAL:'مقدم للمراجعة',APPROVED:'معتمد',SIGNED:'موقع',ARCHIVED:'مسحوب',REVOKED:'مسحوب',SIGN_CONSENT:'توقيع موافقة',WITHDRAW_CONSENT:'سحب موافقة',LINK_EVIDENCE:'ربط دليل جديد',REVIEW:'مراجعة أهلية',REVOKE:'سحب أهلية',REPLACE_SOURCES:'تغيير المصادر'};
  const text = (tag,value,parent,authored = true) => {
    const node = document.createElement(tag);
    if (value !== undefined) {
      if (authored && locale) locale.setText(node,value);
      else node.textContent = String(value ?? '');
    }
    parent?.append(node); return node;
  };
  const named = (tag,value,parent) => text(tag,labels[value] || value,parent,Boolean(labels[value]));
  const button = (label,parent,run) => { const node=text('button',label,parent);node.type='button';if(run)node.addEventListener('click',run);return node; };
  const localError = message => { const error = new Error(message);error.authored=true;return error; };
  const validAction = value => plain(value) && typeof value.allowed === 'boolean' && (value.reason === null || typeof value.reason === 'string');
  const validReference = value => plain(value) && id(value.id) && Number.isSafeInteger(value.version) && value.version > 0 && digest(value.hash);
  const validateCase = value => {
    if (!plain(value) || !id(value.id) || !Number.isSafeInteger(value.revision) || value.revision < 1 || !digest(value.digest) || !['CLEARED','ACTION_REQUIRED'].includes(value.status) || !plain(value.subject) || !plain(value.readiness) || typeof value.readiness.ready !== 'boolean' || typeof value.readiness.hardBlocked !== 'boolean' || !Array.isArray(value.readiness.reasons) || !plain(value.actions) || actionNames.some(key => !validAction(value.actions[key])) || !Array.isArray(value.events) || value.status === 'CLEARED' && (!value.readiness.ready || value.readiness.hardBlocked)) throw localError('تعذر التحقق من بيانات الخادم.');
    const policyTerms=value.policy?.terms,identityTerms=value.identity?.terms;
    if(!id(value.subject.subjectId)||!['BOOKING_PARTICIPANT','TRAINING_ENROLLMENT'].includes(value.subject.subjectType)||!id(value.subject.organizationId)||typeof value.subject.participantName!=='string'||!plain(value.subject.service)||!id(value.subject.service.id)||typeof value.subject.service.title!=='string'||!validReference(value.policy?.reference)||policyTerms!==null&&(!plain(policyTerms)||typeof policyTerms.consentTextAr!=='string'||typeof policyTerms.consentTextEn!=='string')||!validReference(value.identity?.reference)||identityTerms!==null&&!plain(identityTerms)||!plain(value.identity?.participant)||typeof value.identity.participant.fullName!=='string'||!digest(value.consentHash)||typeof value.signatureName!=='string'||typeof value.resumeReasonRequired!=='boolean'||value.readiness.selfDeclarationIsMedicalEvidence!==false||value.readiness.clinicalDecisionPerformed!==false||(!policyTerms||!identityTerms)&&(value.status==='CLEARED'||value.actions.SIGN_CONSENT.allowed))throw localError('تعذر التحقق من بيانات الخادم.');
    for(const source of [value.guardian,value.medical])if(source!==null&&(!plain(source)||!validReference(source.reference)||source.terms!==null&&!plain(source.terms)||source.terms===null&&value.status==='CLEARED'))throw localError('تعذر التحقق من بيانات الخادم.');
    return value;
  };
  const validateWorkspace = value => {
    if (!plain(value) || !plain(value.actor) || !id(value.actor.id) || typeof value.actor.name !== 'string' || !Array.isArray(value.organizations) || !Array.isArray(value.subjects) || !Array.isArray(value.sources) || !Array.isArray(value.cases) || !plain(value.capabilities) || !validAction(value.capabilities.createSource) || !validAction(value.capabilities.createCase)) throw localError('تعذر التحقق من بيانات الخادم.');
    value.cases.forEach(validateCase);
    for (const row of value.subjects) if (!plain(row) || !['BOOKING_PARTICIPANT','TRAINING_ENROLLMENT'].includes(row.subjectType) || !id(row.subjectId) || !id(row.organizationId) || typeof row.participantName !== 'string' || !plain(row.service) || !id(row.service.id) || typeof row.service.title !== 'string') throw localError('تعذر التحقق من بيانات الخادم.');
    for (const row of value.sources) if (!plain(row) || !id(row.id) || !id(row.organizationId) || !sourceKinds.includes(row.kind) || typeof row.title !== 'string' || !Number.isSafeInteger(row.version) || !digest(row.hash) || !plain(row.payload) || !Array.isArray(row.attachments)) throw localError('تعذر التحقق من بيانات الخادم.');
    return value;
  };
  const authority = value => value ? JSON.stringify([value.id,value.status,(value.roleAssignments || value.roles || []).map(role => [role.role,role.status]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]) : null;
  let active = null, sequence = 0, entry;
  function current(view) {
    return active === view && view.dialog.open && view.dialog.isConnected && auth()?.isAuthenticated?.() && auth()?.getSessionVersion?.() === view.session && (!profile() || profile().id === view.accountId) && (!profile() || authority(profile()) === view.authority);
  }
  function close() {
    const view=active;active=null;sequence++;
    if (view) { view.body.replaceChildren();view.feedback.replaceChildren();view.dialog.close();view.dialog.remove(); }
  }
  function feedback(view,error) {
    if (!current(view)) return;
    if (error?.authored && locale) locale.setText(view.feedback,error.message);
    else view.feedback.textContent = error instanceof Error ? error.message : String(error ?? '');
  }
  async function request(view,path,options={}) {
    if (!current(view)) throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');
    const response=await auth().authorizedFetch(path,{...options,headers:{...(options.body ? {'Content-Type':'application/json'} : {}),...options.headers}});
    const body=await response.json().catch(() => null);
    if (!current(view)) throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');
    if (!response.ok) {
      if ([401,403].includes(response.status)||response.status===404&&/^\/participation\/(cases|sources)\/[^/]+/.test(path)) { close();throw localError('غير متاح'); }
      const error = typeof body?.message === 'string' ? new Error(body.message) : localError('تعذر تحميل البيانات. أعد المحاولة.');
      error.status=response.status;throw error;
    }
    return body;
  }
  async function freshIdentity(view) {
    const me=await request(view,'/me');
    if (me?.id !== view.accountId || me.status !== 'ACTIVE' || authority(me) !== view.authority) { close();throw localError('غير متاح'); }
  }
  function markBusy(view,busy) {
    if (!current(view)) return;
    view.busy=busy;view.body.inert=busy;view.dialog.setAttribute('aria-busy',String(busy));view.reload.disabled=busy;
    for(const form of view.body.querySelectorAll('form'))form.inert=Boolean(view.uncertain||view.stale);
  }
  function field(form,label,name,{type='text',value='',required=true,maxLength=1000}={}) {
    const wrap=text('label',label,form),input=text(type==='textarea'?'textarea':'input',undefined,wrap);
    if (type!=='textarea')input.type=type;
    input.name=name;input.value=value;input.required=required;input.maxLength=maxLength;return input;
  }
  function select(form,label,name,rows,labelOf) {
    const wrap=text('label',label,form),input=text('select',undefined,wrap);input.name=name;input.required=true;
    const empty=text('option','اختر',input);empty.value='';
    rows.forEach(row=>{const option=text('option',labelOf(row),input,false);option.value=row.id;});return input;
  }
  function check(form,label,name) { const wrap=text('label',undefined,form);wrap.className='hl-eligibility-check';const input=text('input',undefined,wrap);input.type='checkbox';input.name=name;input.required=true;text('span',label,wrap);return input; }
  function updateTime(node) {
    const value=node.dateTime,dateOnly=node.dataset.dateOnly==='true',date=new Date(value);
    if(!value||!Number.isFinite(date.getTime())){node.textContent='—';return;}
    const english=window.HydrolandI18n?.getLocale?.()==='en';
    const options={calendar:'gregory',numberingSystem:'latn',timeZone:dateOnly?'UTC':'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric',...(dateOnly?{}:{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})};
    const parts=Object.fromEntries(new Intl.DateTimeFormat(english?'en-GB':'ar-SA',options).formatToParts(date).map(part=>[part.type,part.value]));
    node.textContent=`${parts.day}/${parts.month}/${parts.year}`+(dateOnly?'':`, ${parts.hour}:${parts.minute} (${english?'Riyadh time':'توقيت الرياض'})`);
  }
  function time(parent,value,dateOnly=false) {const node=text('time',undefined,parent);node.dateTime=typeof value==='string'?value:'';node.dataset.dateOnly=String(dateOnly);node.dir='ltr';updateTime(node);return node;}
  function details(parent,rows) { const list=text('dl',undefined,parent);for(const [label,value,format] of rows){text('dt',label,list);const description=text('dd',undefined,list);if(format==='range'){description.className='hl-eligibility-range';for(const [index,caption] of ['من','إلى'].entries()){const row=text('span',undefined,description);text('span',caption,row);row.append(' · ');time(row,value[index]);}}else if(format==='date'||format==='datetime')time(description,value,format==='date');else description.textContent=value ?? '—';}return list; }
  function submit(form,label,run) {
    const control=text('button',label,form);control.type='submit';
    form.addEventListener('submit',event=>{event.preventDefault();if(!active||active.busy||active.uncertain||active.stale||!form.isConnected)return;if(!form.reportValidity())return;void run(new FormData(form));});return control;
  }
  function sourceLabel(row) { return `${row.title} · ${row.referenceNumber || row.id} · v${row.version}`; }
  function sourceOptions(view,kind,organizationId) { return view.workspace.sources.filter(row=>row.kind===kind && row.organizationId===organizationId && row.status==='SIGNED'); }
  function notice(parent,label) {const node=text('p',label,parent);node.className='hl-eligibility-notice';return node;}
  async function loadWorkspace(view,selected) {
    const read=++view.read;
    markBusy(view,true);feedback(view,localError('جارٍ تحميل البيانات…'));
    try {
      await freshIdentity(view);
      const workspace=validateWorkspace(await request(view,'/participation/workspace'));
      if (!current(view)||read!==view.read)return;
      if(workspace.actor.id!==view.accountId)throw localError('تعذر التحقق من بيانات الخادم.');
      view.workspace=workspace;view.case=null;view.source=null;view.uncertain=null;view.stale=false;
      if(selected?.sourceId){markBusy(view,false);await loadSource(view,selected.sourceId);return;}
      if(selected?.caseId){await loadCase(view,selected.caseId);return;}
      const found=selected?.subjectId ? workspace.cases.find(row=>row.subject.subjectId===selected.subjectId&&row.subject.subjectType===selected.subjectType) : null;
      if(found){await loadCase(view,found.id);return;}
      renderWorkspace(view,selected);view.feedback.textContent='';
    } catch(error) { if(current(view)&&read===view.read)feedback(view,error); }
    finally { if(current(view)&&read===view.read)markBusy(view,false); }
  }
  async function loadCase(view,caseId) {
    const read=++view.read;markBusy(view,true);feedback(view,localError('جارٍ تحميل البيانات…'));
    try {
      const value=validateCase(await request(view,'/participation/cases/'+encodeURIComponent(caseId)));
      if(!current(view)||read!==view.read)return;
      if(value.id!==caseId)throw localError('تعذر التحقق من بيانات الخادم.');
      view.case=value;view.uncertain=null;view.stale=false;renderCase(view);view.feedback.textContent='';
    } catch(error) {if(current(view)&&read===view.read)feedback(view,error);}
    finally {if(current(view)&&read===view.read)markBusy(view,false);}
  }
  function renderWorkspace(view,selected) {
    view.body.replaceChildren();notice(view.body,'المراجعة والأدلة مرتبطة بالمشارك والخدمة والإصدار المحددين. الإقرار الذاتي لا يمنح تصريحًا طبيًا.');
    if(selected?.subjectId)text('p','لم يجهز طلب لهذه المشاركة.',view.body);
    text('h3','الطلبات الحالية',view.body);
    if(!view.workspace.cases.length)text('p','لا توجد طلبات ضمن صلاحيتك الحالية.',view.body);
    for(const row of view.workspace.cases){
      const card=text('article',undefined,view.body);card.dataset.participationCase=row.id;
      text('h3',row.subject.participantName || row.id,card,false);
      text('p',row.subject.service?.title || '',card,false);
      const state=named('strong',row.status,card);state.className='hl-eligibility-status';state.dataset.state=row.status;
      button('فتح الطلب',card,()=>{if(!view.busy&&!view.uncertain)void loadCase(view,row.id);});
    }
    if(view.workspace.capabilities.createCase.allowed)renderCreateCase(view,selected);
    renderSources(view);
  }
  function renderCreateCase(view,selected) {
    const form=text('form',undefined,view.body);form.dataset.participationCreate='';const box=text('fieldset',undefined,form);text('legend','طلب جديد مرتبط بالمشارك والخدمة',box);
    const subjectRows=view.workspace.subjects.map(row=>({...row,id:row.subjectType+':'+row.subjectId}));
    const subject=select(box,'المشارك والخدمة','subject',subjectRows,row=>`${row.participantName} · ${row.service.title}`);
    const policy=select(box,'مصدر المتطلبات والانطباق','policy',[],sourceLabel),identity=select(box,'دليل هوية المشارك وعمره','identity',[],sourceLabel);
    const sync=()=>{const row=subjectRows.find(row=>row.id===subject.value);for(const [input,kind] of [[policy,'POLICY'],[identity,'IDENTITY']]){input.replaceChildren();const empty=text('option','اختر',input);empty.value='';if(row)for(const option of sourceOptions(view,kind,row.organizationId)){const node=text('option',sourceLabel(option),input,false);node.value=option.id;}}};
    subject.addEventListener('change',sync);
    if(selected?.subjectId){subject.value=selected.subjectType+':'+selected.subjectId;sync();}
    submit(form,'إنشاء طلب المراجعة',()=>{
      const chosen=subjectRows.find(row=>row.id===subject.value);if(!chosen)return;
      return mutate(view,{path:'/participation/cases',action:'CREATE_CASE',body:{requestId:crypto.randomUUID(),subjectType:chosen.subjectType,subjectId:chosen.subjectId,policyDocumentId:policy.value,identityDocumentId:identity.value}});
    });
  }
  function renderSources(view) {
    if(!view.workspace.sources.length&&!view.workspace.capabilities.createSource.allowed)return;
    const box=text('section',undefined,view.body);box.className='hl-eligibility-section';text('h3','مصادر الأدلة الخاصة',box);
    for(const row of view.workspace.sources){const card=text('article',undefined,box);text('h4',sourceLabel(row),card,false);named('p',row.kind,card);named('p',row.status,card);button('عرض المصدر',card,()=>void loadSource(view,row.id));}
    if(view.workspace.capabilities.createSource.allowed)renderCreateSource(view,box);
  }
  function actionSection(view,key,title) {
    const permission=view.case.actions[key],box=text('section',undefined,view.body);box.className='hl-eligibility-section';box.dataset.participationAction=key;text('h3',title,box);
    if(!permission.allowed){if(permission.reason)text('p',permission.reason,box,false);return null;}
    return box;
  }
  function caseCommand(view,action,payload) {
    return {path:'/participation/cases/'+encodeURIComponent(view.case.id)+'/actions',action,caseId:view.case.id,body:{requestId:crypto.randomUUID(),expectedRevision:view.case.revision,expectedDigest:view.case.digest,action,payload}};
  }
  function sourceSummary(view,kind,record) {
    const box=text('section',undefined,view.body);box.className='hl-eligibility-section';named('h3',kind,box);
    if(!record){text('p',kind==='MEDICAL'&&view.case.policy.terms?.medicalRequirement==='NOT_APPLICABLE'||kind==='GUARDIAN'&&view.case.readiness.guardianRequired===false?'غير منطبق بحسب المصدر':'غير مسجل',box);return;}
    const terms=record.terms,reference=record.reference;
    if(!plain(reference)||!id(reference.id)||!digest(reference.hash)||!Number.isSafeInteger(reference.version))throw localError('تعذر التحقق من بيانات الخادم.');
    if(terms===null){text('p','المصدر يحتاج مراجعة؛ لا يُستخدم نصه لمنح موافقة جديدة.',box);details(box,[['الإصدار',reference.version]]);button('عرض المصدر',box,()=>void loadSource(view,reference.id));return;}
    if(!plain(terms))throw localError('تعذر التحقق من بيانات الخادم.');
    details(box,[['المرجع',terms.sourceReference],['الإصدار',reference.version],['الجهة المصدرة',terms.sourceAuthority||terms.issuerName],['بداية السريان',terms.effectiveFrom||terms.validFrom||terms.issuedAt,'datetime'],['نهاية الصلاحية المسجلة',terms.validUntil,'datetime']]);
    if(kind==='POLICY'){
      details(box,[['إصدار المصدر',terms.sourceVersion],['المادة أو موضع النص',terms.sourceClause],['سبب الانطباق',terms.applicabilityReason],['الحد الأدنى للعمر من المصدر',terms.minimumAge],['حد عمر الولاية من المصدر',terms.guardianBelowAge]]);
      const p=text('p',undefined,box);text('span','انطباق الموافقة',p);p.append(' · ');named('span',terms.consentRequirement,p);
      const m=text('p',undefined,box);text('span','انطباق الدليل الطبي',m);m.append(' · ');named('span',terms.medicalRequirement,m);
    }
    if(kind==='MEDICAL'){named('p',terms.outcome,box);if(terms.limitations){text('h4','القيود المسجلة دون تشخيص',box);text('p',terms.limitations,box,false).className='hl-eligibility-text';}}
    if(kind==='GUARDIAN')details(box,[['اسم ولي الأمر',record.actor?.name]]);
    button('عرض المصدر',box,()=>void loadSource(view,reference.id));
  }
  function renderCase(view) {
    const value=view.case;
    if(!plain(value.identity?.participant)||!digest(value.consentHash))throw localError('تعذر التحقق من بيانات الخادم.');
    view.source=null;view.body.replaceChildren();button('عودة إلى الطلبات',view.body,()=>void loadWorkspace(view));
    notice(view.body,'المراجعة والأدلة مرتبطة بالمشارك والخدمة والإصدار المحددين. الإقرار الذاتي لا يمنح تصريحًا طبيًا.');
    const header=text('section',undefined,view.body);header.className='hl-eligibility-section';header.dataset.participationDetail=value.id;
    text('h3',value.subject.participantName,header,false);text('p',value.subject.service.title,header,false);
    const state=named('strong',value.status,header);state.className='hl-eligibility-status';state.dataset.state=value.status;
    details(header,[['الموعد',[value.subject.service.startsAt,value.subject.service.endsAt],'range'],['الإصدار',value.revision],['اسم المشارك',value.identity.participant.fullName],['تاريخ الميلاد',value.identity.participant.dateOfBirth,'date'],['آخر تحديث للحالة',new Date().toISOString(),'datetime']]);
    if(value.readiness.reasons.length){text('h4','أسباب الحاجة إلى إجراء',header);const reasons=text('ul',undefined,header);for(const reason of value.readiness.reasons){const label=typeof reason==='string'&&reason.startsWith('PARTICIPATION_')?reasonLabels[reason.slice('PARTICIPATION_'.length)]||'تحتاج مصادر الأهلية إلى مراجعة.':null;text('li',label||(typeof reason==='string'?reason:reason.message),reasons,Boolean(label));}}
    if(value.revokedAt)details(header,[['تاريخ السحب',value.revokedAt,'datetime'],['سبب السحب',value.revocationReason]]);
    sourceSummary(view,'POLICY',value.policy);sourceSummary(view,'IDENTITY',value.identity);sourceSummary(view,'GUARDIAN',value.guardian);sourceSummary(view,'MEDICAL',value.medical);
    const consent=text('section',undefined,view.body);consent.className='hl-eligibility-section';consent.dataset.participationConsent='';text('h3','موافقة المشارك أو وليه',consent);
    if(value.policy.terms)for(const [label,content,language] of [['نص الإقرار العربي لهذا الإصدار',value.policy.terms.consentTextAr,'ar'],['نص الإقرار الإنجليزي لهذا الإصدار',value.policy.terms.consentTextEn,'en']]){text('h4',label,consent);const p=text('p',content,consent,false);p.className='hl-eligibility-text';p.lang=language;p.dir=language==='ar'?'rtl':'ltr';}
    else text('p','المصدر يحتاج مراجعة؛ لا يُستخدم نصه لمنح موافقة جديدة.',consent);
    if(value.consent){
      if(value.consent.consentHash!==value.consentHash){const stale=notice(consent,'سجل توقيع لإصدار سابق؛ الموافقة على النص الحالي تتطلب توقيعًا جديدًا.');stale.dataset.participationConsentStale='';}
      if(value.consent.withdrawnAt)text('strong','الموافقة مسحوبة',consent);
      details(consent,[['موقّع الموافقة',value.consent.signedName],['تاريخ التوقيع',value.consent.signedAt,'datetime'],['تاريخ السحب',value.consent.withdrawnAt,'datetime']]);named('p',value.consent.role==='GUARDIAN'?'GUARDIAN_ACTOR':value.consent.role,consent);
    }else text('p','لم تُسجل موافقة.',consent);
    if(value.actions.SIGN_CONSENT.allowed){
      const form=text('form',undefined,consent);form.dataset.participationSign='';const name=field(form,'الاسم المسجل للموقّع','signedName',{value:value.signatureName,maxLength:160});name.readOnly=true;
      const resumeReason=value.resumeReasonRequired?field(form,'سبب تجديد الموافقة بعد السحب أو الرفض','reason',{type:'textarea'}):null;
      check(form,'أوافق على نص الإقرار والخدمة والإصدار المحددين أعلاه، وأوقع باسمي المسجل.','consent');
      submit(form,'تسجيل موافقتي',()=>mutate(view,caseCommand(view,'SIGN_CONSENT',{consent:true,signedName:value.signatureName,consentHash:value.consentHash,...(resumeReason?{reason:resumeReason.value.trim()}:{})})));
    } else if(value.actions.SIGN_CONSENT.reason)text('p',value.actions.SIGN_CONSENT.reason,consent,false);
    if(value.actions.WITHDRAW_CONSENT.allowed){const form=text('form',undefined,consent);form.dataset.participationWithdraw='';const reason=field(form,'سبب الإجراء','reason',{type:'textarea'});submit(form,'سحب موافقتي',()=>mutate(view,caseCommand(view,'WITHDRAW_CONSENT',{reason:reason.value.trim()})));}
    if(value.actions.LINK_EVIDENCE.allowed){
      const box=actionSection(view,'LINK_EVIDENCE','ربط دليل'),form=text('form',undefined,box);
      const kind=choices(form,'نوع الدليل','kind',[['GUARDIAN','ولاية وموافقة القاصر'],['MEDICAL','دليل طبي']]),evidence=select(form,'الدليل الموقع','document',[],sourceLabel);
      kind.addEventListener('change',()=>{evidence.replaceChildren();const empty=text('option','اختر',evidence);empty.value='';for(const row of sourceOptions(view,kind.value,value.subject.organizationId).filter(row=>row.payload.subjectId===value.subject.subjectId)){const option=text('option',sourceLabel(row),evidence,false);option.value=row.id;}});
      submit(form,'ربط دليل',()=>mutate(view,caseCommand(view,'LINK_EVIDENCE',{kind:kind.value,documentId:evidence.value})));
    }
    if(value.review){const box=text('section',undefined,view.body);box.className='hl-eligibility-section';text('h3','القرار المسجل',box);named('p',value.review.decision,box);details(box,[['ملاحظات المراجعة',value.review.reason],['تاريخ الإجراء',value.review.reviewedAt,'datetime']]);}
    if(value.actions.REVIEW.allowed){
      const box=actionSection(view,'REVIEW','قرار أهلية المشاركة'),form=text('form',undefined,box);form.dataset.participationReview='';
      const decision=choices(form,'قرار أهلية المشاركة','decision',[['ELIGIBLE','مؤهل'],['REJECTED','مرفوض']]),reason=field(form,'ملاحظات المراجعة','reason',{type:'textarea'});
      check(form,'راجعت مصادر المتطلبات والأدلة وانطباقها على هذه المشاركة.','reviewed');submit(form,'حفظ مراجعة الأهلية',()=>mutate(view,caseCommand(view,'REVIEW',{decision:decision.value,reason:reason.value.trim(),reviewed:true})));
    }
    if(value.actions.REVOKE.allowed){const box=actionSection(view,'REVOKE','سحب قرار الأهلية'),form=text('form',undefined,box);form.dataset.participationRevoke='';const reason=field(form,'سبب الإجراء','reason',{type:'textarea'});submit(form,'سحب قرار الأهلية',()=>mutate(view,caseCommand(view,'REVOKE',{reason:reason.value.trim()})));}
    if(value.actions.REPLACE_SOURCES.allowed){
      const box=actionSection(view,'REPLACE_SOURCES','استبدال مصادر الطلب'),form=text('form',undefined,box);form.dataset.participationReplace='';
      const policy=select(form,'مصدر المتطلبات والانطباق','policy',sourceOptions(view,'POLICY',value.subject.organizationId),sourceLabel),identity=select(form,'دليل هوية المشارك وعمره','identity',sourceOptions(view,'IDENTITY',value.subject.organizationId).filter(row=>row.payload.subjectId===value.subject.subjectId),sourceLabel),reason=field(form,'سبب الإجراء','reason',{type:'textarea'});
      submit(form,'استبدال مصادر الطلب',()=>mutate(view,caseCommand(view,'REPLACE_SOURCES',{policyDocumentId:policy.value,identityDocumentId:identity.value,reason:reason.value.trim()})));
    }
    const events=text('details',undefined,view.body);text('summary','سجل الإجراءات',events);
    for(const event of value.events){const row=text('p',undefined,events);named('span',event.action,row);text('span',' · '+event.actorName+' · ',row,false);time(row,event.createdAt);}
  }
  function validateSource(value) {
    if(!plain(value)||!id(value.id)||!sourceKinds.includes(value.kind)||!Number.isSafeInteger(value.version)||!digest(value.hash)||!plain(value.payload)||!Array.isArray(value.attachments)||!plain(value.actions)||['SUBMIT','APPROVE','SIGN','REVOKE'].some(action=>!validAction(value.actions[action])))throw localError('تعذر التحقق من بيانات الخادم.');
    return value;
  }
  async function loadSource(view,sourceId) {
    if(view.busy||view.uncertain)return;const read=++view.read;markBusy(view,true);
    try{const source=validateSource(await request(view,'/participation/sources/'+encodeURIComponent(sourceId)));if(!current(view)||read!==view.read)return;if(source.id!==sourceId)throw localError('تعذر التحقق من بيانات الخادم.');view.source=source;view.stale=false;renderSource(view);view.feedback.textContent='';}
    catch(error){if(current(view)&&read===view.read)feedback(view,error);}
    finally{if(current(view)&&read===view.read)markBusy(view,false);}
  }
  async function mutate(view,command,retry=false) {
    if(!current(view)||view.busy||view.stale||view.uncertain&&!retry)return;
    markBusy(view,true);feedback(view,localError('جارٍ حفظ الإجراء…'));let sent=false;
    try{
      await freshIdentity(view);
      if(command.caseId){const latest=validateCase(await request(view,'/participation/cases/'+encodeURIComponent(command.caseId)));if(!retry&&(latest.revision!==command.body.expectedRevision||latest.digest!==command.body.expectedDigest||!latest.actions[command.action].allowed)){view.stale=true;throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');}}
      else if(command.sourceId){const latest=validateSource(await request(view,'/participation/sources/'+encodeURIComponent(command.sourceId)));if(!retry&&(latest.version!==command.body.expectedVersion||latest.hash!==command.body.expectedHash||!latest.actions[command.action].allowed)){view.stale=true;throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');}}
      else {const latest=validateWorkspace(await request(view,'/participation/workspace'));if(latest.actor.id!==view.accountId||!latest.capabilities[command.action==='CREATE_CASE'?'createCase':'createSource'].allowed){view.stale=true;throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');}
        if(!retry&&command.action==='CREATE_CASE')for(const key of ['policyDocumentId','identityDocumentId']){const before=view.workspace.sources.find(row=>row.id===command.body[key]),after=latest.sources.find(row=>row.id===command.body[key]);if(!before||!after||after.status!=='SIGNED'||after.version!==before.version||after.hash!==before.hash){view.stale=true;throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');}}
      }
      if(!current(view))return;sent=true;
      const result=await request(view,command.path,{method:'POST',body:JSON.stringify(command.body)});
      if(!current(view))return;view.uncertain=null;view.stale=false;
      if(command.action==='CREATE_SOURCE'||command.sourceId){view.source=validateSource(result);renderSource(view);}
      else {view.case=validateCase(result);renderCase(view);}
      feedback(view,localError('تم حفظ الإجراء.'));
    }catch(error){
      if(!current(view))return;
      if(sent&&(!error.status||error.status>=500)){
        view.uncertain=command;feedback(view,localError('تعذر التأكد من نتيجة الحفظ. يمكنك تحديث الحالة أو إعادة الطلب نفسه.'));
        const retryButton=button('إعادة الطلب نفسه',view.feedback,()=>void mutate(view,command,true));retryButton.dataset.participationRetry='';
      }else {view.uncertain=null;if(error.status===409)view.stale=true;feedback(view,error);}
    }finally{if(current(view))markBusy(view,false);}
  }
  async function downloadSource(view,source,attachment) {
    if(!current(view)||view.busy||!id(attachment.id))return;markBusy(view,true);
    try {
      await freshIdentity(view);
      const response=await auth().authorizedFetch('/participation/sources/'+encodeURIComponent(source.id)+'/attachments/'+encodeURIComponent(attachment.id));
      if(!current(view))return;
      if([401,403,404].includes(response.status)){close();return;}
      if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))throw localError('تعذر تنزيل الملف.');
      const bytes=await response.arrayBuffer();if(!current(view))return;
      const currentSource=validateSource(await request(view,'/participation/sources/'+encodeURIComponent(source.id)));
      if(!current(view)||currentSource.id!==source.id||currentSource.hash!==source.hash||!currentSource.attachments.some(row=>row.id===attachment.id))throw localError('تغيرت البيانات أو الصلاحية. حدّث الطلب وراجعه قبل الحفظ.');
      if(bytes.byteLength!==attachment.byteSize||!digest(attachment.sha256))throw localError('تعذر تنزيل الملف.');
      const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');if(!current(view))return;if(actual!==attachment.sha256)throw localError('تعذر تنزيل الملف.');
      const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=attachment.filename||'participation-source.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){if(current(view))feedback(view,error);}
    finally{if(current(view))markBusy(view,false);}
  }
  function renderSource(view) {
    const source=view.source;view.body.replaceChildren();
    button(view.case?'عودة إلى الطلب':'عودة إلى الطلبات',view.body,()=>{if(view.case)void loadCase(view,view.case.id);else void loadWorkspace(view);});
    const box=text('section',undefined,view.body);box.className='hl-eligibility-section';box.dataset.participationSource=source.id;
    text('h3',source.title,box,false);named('p',source.kind,box);named('p',source.status,box);
    notice(box,'هذه مراجعة إدارية لأصل الدليل؛ لا تُسجل توقيع المشارك أو الولي ولا تمنح اختصاصًا طبيًا للمراجع.');
    details(box,[['المرجع',source.referenceNumber],['الإصدار',source.version]]);
    const terms=source.payload,subject=view.workspace.subjects.find(row=>row.subjectId===terms.subjectId)||(view.case?.subject.subjectId===terms.subjectId?view.case.subject:null);
    if(subject)details(box,[['المشارك',subject.participantName],['الخدمة',subject.service.title],['الموعد',[subject.service.startsAt,subject.service.endsAt],'range']]);
    const fields={sourceAuthority:'الجهة المصدرة',issuerName:'الجهة المصدرة',issuerReference:'مرجع اختصاص المصدر',sourceReference:'مرجع المصدر المعتمد',sourceVersion:'إصدار المصدر',sourceClause:'المادة أو موضع النص',applicabilityReason:'سبب الانطباق',fullName:'اسم المشارك',dateOfBirth:'تاريخ الميلاد',issuedAt:'تاريخ الإجراء',effectiveFrom:'بداية السريان',validFrom:'بداية السريان',validUntil:'نهاية الصلاحية المسجلة',minimumAge:'الحد الأدنى للعمر من المصدر',guardianBelowAge:'حد عمر الولاية من المصدر',limitations:'القيود المسجلة دون تشخيص'};
    details(box,Object.entries(fields).filter(([key])=>terms[key]!==undefined).map(([key,label])=>[label,terms[key],key==='dateOfBirth'?'date':['issuedAt','effectiveFrom','validFrom','validUntil'].includes(key)?'datetime':undefined]));
    for(const [key,label] of [['consentRequirement','انطباق الموافقة'],['medicalRequirement','انطباق الدليل الطبي'],['outcome','النتيجة المسجلة في الدليل']])if(terms[key]){text('h4',label,box);named('p',terms[key],box);}
    for(const [key,label,language] of [['consentTextAr','نص الإقرار العربي لهذا الإصدار','ar'],['consentTextEn','نص الإقرار الإنجليزي لهذا الإصدار','en']])if(terms[key]){text('h4',label,box);const p=text('p',terms[key],box,false);p.className='hl-eligibility-text';p.lang=language;p.dir=language==='ar'?'rtl':'ltr';}
    text('h4','مرفقات المصدر الخاصة',box);
    for(const attachment of source.attachments){const row=text('div',undefined,box);text('p',attachment.filename||attachment.originalName||'PDF',row,false);button('تنزيل أصل PDF',row,()=>void downloadSource(view,source,attachment));}
    const names={SUBMIT:'تقديم المصدر للمراجعة',APPROVE:'اعتماد المصدر',SIGN:'توقيع المصدر الإداري',REVOKE:'سحب المصدر'};
    for(const [action,label] of Object.entries(names)){
      const permission=source.actions[action];if(!permission.allowed)continue;
      const form=text('form',undefined,view.body);form.dataset.participationSourceAction=action;const fieldset=text('fieldset',undefined,form);text('legend',label,fieldset);const reason=field(fieldset,'سبب الإجراء','reason',{type:'textarea'});
      submit(form,label,()=>mutate(view,{path:'/participation/sources/'+encodeURIComponent(source.id)+'/actions',sourceId:source.id,action,body:{requestId:crypto.randomUUID(),expectedVersion:source.version,expectedHash:source.hash,action,reason:reason.value.trim()}}));
    }
  }
  const utc = value => {if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))throw localError('تأكد من الحقول المطلوبة قبل الإرسال.');const parsed=new Date(value+(value.length===16?':00':'')+'+03:00');if(!Number.isFinite(parsed.getTime()))throw localError('تأكد من الحقول المطلوبة قبل الإرسال.');return parsed.toISOString();};
  function choices(form,label,name,items) {const control=select(form,label,name,items.map(([id,title])=>({id,title})),row=>row.title);items.forEach(([,title],index)=>locale?.setText(control.options[index+1],title));return control;}
  function renderCreateSource(view,parent) {
    const disclosure=text('details',undefined,parent);text('summary','إنشاء مصدر خاص',disclosure);
    const form=text('form',undefined,disclosure);form.dataset.participationSourceCreate='';
    const organization=select(form,'الجهة','organization',view.workspace.organizations,row=>row.name);
    const kind=choices(form,'نوع المصدر','kind',sourceKinds.map(key=>[key,labels[key]]));
    const subject=select(form,'المشارك والخدمة','subject',[],row=>row.participantName+' · '+row.service.title);
    const title=field(form,'عنوان المصدر','title',{maxLength:180}),dynamic=text('div',undefined,form);dynamic.className='hl-eligibility-grid';
    const attachment=field(form,'المستند الأصلي PDF','attachment',{type:'file'});attachment.accept='application/pdf';text('small','إرفاق ملف PDF واحد حتى 10 ميجابايت.',form);
    notice(form,'أدخل الحدود والتواريخ من المصدر المعتمد وانطباقه؛ لا تُفترض مدة طبية أو قاعدة عمر عامة.');
    let builder=null,formGeneration=0;
    const chooseSubject=()=>view.workspace.subjects.find(row=>row.subjectType+':'+row.subjectId===subject.value&&row.organizationId===organization.value);
    function accountPicker(label,initial,nullable=false) {
      const box=text('section',undefined,dynamic);box.className='hl-eligibility-section';text('h4',label,box);
      const email=field(box,'البريد المطابق للحساب','accountEmail',{type:'email',required:false,maxLength:254}),result=text('p',undefined,box);result.dataset.participationAccount='';let selected=initial||null,unlinked;
      if(nullable){unlinked=check(box,'هوية غير مرتبطة بحساب مشارك','unlinked');unlinked.required=false;unlinked.addEventListener('change',()=>{if(unlinked.checked){selected=null;result.textContent='';email.value='';}});}
      if(selected)result.textContent=selected.name;else locale?.setText(result,'لم يُتحقق من حساب.');
      email.addEventListener('input',()=>{selected=null;locale?.setText(result,'لم يُتحقق من حساب.');if(unlinked)unlinked.checked=false;});
      button('تحقق من الحساب',box,async()=>{
        if(view.busy||view.uncertain||view.stale||!email.value.trim()||!email.reportValidity())return;
        const generation=formGeneration,value=email.value.trim();markBusy(view,true);
        try {await freshIdentity(view);const response=await request(view,'/participation/accounts?organizationId='+encodeURIComponent(organization.value)+'&email='+encodeURIComponent(value));
          if(!current(view)||generation!==formGeneration||!box.isConnected||email.value.trim()!==value)return;
          if(!plain(response?.account)||!id(response.account.id)||typeof response.account.name!=='string')throw localError('تعذر التحقق من بيانات الخادم.');
          selected=response.account;result.textContent=selected.name;
        }catch(error){if(current(view)&&generation===formGeneration)feedback(view,error);}
        finally{if(current(view))markBusy(view,false);}
      });
      return ()=>{if(nullable&&unlinked.checked)return null;if(!selected)throw localError('لم يُتحقق من حساب.');return selected.id;};
    }
    function syncFields() {
      formGeneration++;dynamic.replaceChildren();builder=null;const row=chooseSubject();if(!row||!sourceKinds.includes(kind.value)){text('p','اختر الجهة والمشارك أولًا.',dynamic);return;}
      const inputs={};const add=(key,label,type='text',options={})=>inputs[key]=field(dynamic,label,key,{type,...options});
      const time=(key,label)=>add(key,label,'datetime-local');
      let accountValue,identityInput;
      if(kind.value==='POLICY'){
        add('sourceAuthority','الجهة المصدرة');add('sourceReference','مرجع المصدر المعتمد','text',{maxLength:1000});add('sourceVersion','إصدار المصدر','text',{maxLength:100});add('sourceClause','المادة أو موضع النص','textarea');add('applicabilityReason','سبب الانطباق','textarea',{maxLength:2000});
        time('effectiveFrom','بداية السريان — توقيت الرياض');time('validUntil','نهاية الصلاحية — توقيت الرياض');
        for(const [key,label] of [['minimumAge','الحد الأدنى للعمر من المصدر'],['guardianBelowAge','حد عمر الولاية من المصدر']]){const input=add(key,label,'number');input.min='0';input.max='120';input.step='1';}
        inputs.consentRequirement=choices(dynamic,'انطباق الموافقة','consentRequirement',[['REQUIRED','مطلوب بحسب المصدر'],['NOT_APPLICABLE','غير منطبق بحسب المصدر']]);
        inputs.medicalRequirement=choices(dynamic,'انطباق الدليل الطبي','medicalRequirement',[['REQUIRED','مطلوب بحسب المصدر'],['NOT_APPLICABLE','غير منطبق بحسب المصدر']]);
        add('consentTextAr','نص الإقرار العربي لهذا الإصدار','textarea',{maxLength:8000});inputs.consentTextAr.lang='ar';inputs.consentTextAr.dir='rtl';
        add('consentTextEn','نص الإقرار الإنجليزي لهذا الإصدار','textarea',{maxLength:8000});inputs.consentTextEn.lang='en';inputs.consentTextEn.dir='ltr';
      }else{
        add('issuerName','الجهة المصدرة');add('sourceReference','مرجع المصدر المعتمد','text',{maxLength:1000});time('issuedAt','تاريخ الإصدار — توقيت الرياض');time('validUntil','نهاية الصلاحية — توقيت الرياض');
        if(kind.value==='IDENTITY'){
          add('fullName','اسم المشارك','text',{value:row.participantName,maxLength:160});add('dateOfBirth','تاريخ الميلاد','date');
          accountValue=accountPicker('الحساب الموثق للمشارك',row.accountId?{id:row.accountId,name:row.participantName}:null,true);
        }else{
          const identities=sourceOptions(view,'IDENTITY',row.organizationId).filter(source=>source.payload.subjectType===row.subjectType&&source.payload.subjectId===row.subjectId);
          identityInput=select(dynamic,'مرجع هوية المشارك','identity',identities,sourceLabel);time('validFrom','بداية السريان — توقيت الرياض');
          if(kind.value==='GUARDIAN'){
            inputs.relationshipKind=choices(dynamic,'نوع العلاقة المثبتة','relationshipKind',[['PARENT','والد أو والدة'],['LEGAL_GUARDIAN','ولي قانوني']]);
            accountValue=accountPicker('الحساب الموثق لولي الأمر',null);notice(dynamic,'لا تربط حالة حساب أو عضوية بإثبات الولاية؛ يجب مراجعة أصل الولاية ونطاقه.');
          }else{
            add('issuerReference','مرجع اختصاص المصدر');inputs.outcome=choices(dynamic,'النتيجة المسجلة في الدليل','outcome',[['CLEARED_FOR_ACTIVITY','مستوفٍ للنشاط المحدد'],['NOT_CLEARED','غير مستوفٍ'],['REQUIRES_REVIEW','يلزم مراجعة']]);add('limitations','القيود المسجلة دون تشخيص','textarea',{required:false,maxLength:2000});
          }
        }
      }
      builder=()=>{
        const payload=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.type==='datetime-local'?utc(input.value):input.type==='number'?Number(input.value):input.value.trim()]));
        const serviceType=row.subjectType==='BOOKING_PARTICIPANT'?'TRIP':'TRAINING_ENROLLMENT';
        if(kind.value==='POLICY')return {...payload,purpose:'D01_POLICY_V1',subjectId:row.subjectId,serviceType,serviceId:row.service.id,activityCode:row.service.activityCode};
        Object.assign(payload,{purpose:'D01_'+kind.value+'_V1',subjectType:row.subjectType,subjectId:row.subjectId});
        if(kind.value==='IDENTITY')return {...payload,participantAccountId:accountValue()};
        const identity=view.workspace.sources.find(source=>source.id===identityInput.value&&source.kind==='IDENTITY');if(!identity)throw localError('تأكد من الحقول المطلوبة قبل الإرسال.');
        Object.assign(payload,{serviceType,serviceId:row.service.id,identityDocumentId:identity.id,identityDocumentHash:identity.hash});
        return kind.value==='GUARDIAN'?{...payload,guardianAccountId:accountValue(),authorityScope:'PARTICIPATION_CONSENT'}:{...payload,activityCode:row.service.activityCode};
      };
    }
    organization.addEventListener('change',()=>{subject.replaceChildren();const empty=text('option','اختر',subject);empty.value='';for(const row of view.workspace.subjects.filter(row=>row.organizationId===organization.value)){const option=text('option',row.participantName+' · '+row.service.title,subject,false);option.value=row.subjectType+':'+row.subjectId;}syncFields();});
    kind.addEventListener('change',syncFields);subject.addEventListener('change',syncFields);syncFields();
    submit(form,'حفظ مسودة المصدر',async()=>{
      if(!builder)return;let command;try{const payload=builder(),file=attachment.files[0];if(!file||file.size>10_000_000||!file.name.toLowerCase().endsWith('.pdf')||file.type!=='application/pdf')throw localError('إرفاق ملف PDF واحد حتى 10 ميجابايت.');
        const generation=formGeneration;markBusy(view,true);const bytes=new Uint8Array(await file.arrayBuffer());if(!current(view)||!form.isConnected||generation!==formGeneration)return;
        if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw localError('إرفاق ملف PDF واحد حتى 10 ميجابايت.');
        let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
        command={path:'/participation/sources',action:'CREATE_SOURCE',body:{requestId:crypto.randomUUID(),organizationId:organization.value,kind:kind.value,title:title.value.trim(),payload,attachment:{filename:file.name,mimeType:'application/pdf',base64:btoa(binary)}}};
      }catch(error){if(current(view))feedback(view,error);}finally{if(current(view))markBusy(view,false);}
      if(command&&current(view))await mutate(view,command);
    });
  }
  async function open(selected={}) {
    if(!auth()?.isAuthenticated?.())return;
    close();const session=auth().getSessionVersion();if(!profile())await window.HydrolandProfile?.load?.();if(!auth()?.isAuthenticated?.()||session!==auth().getSessionVersion())return;const account=profile();if(!account?.id||account.status!=='ACTIVE')return;
    document.getElementById('profile-dialog')?.close();document.getElementById('hl-booking-participants-dialog')?.close();
    const dialog=text('dialog');dialog.id='hl-participant-eligibility';dialog.className='hl-participant-eligibility';dialog.setAttribute('aria-labelledby','hl-participation-title');
    const header=text('header',undefined,dialog),title=text('h2','موافقات المشاركة والأهلية',header);title.id='hl-participation-title';
    const controls=text('div',undefined,header);controls.className='hl-eligibility-actions';
    const reload=button('تحديث',controls),dismiss=button('إغلاق موافقات المشاركة',controls,close);
    const feedbackNode=text('p',undefined,dialog);feedbackNode.dataset.eligibilityFeedback='';feedbackNode.setAttribute('role','status');feedbackNode.setAttribute('aria-live','polite');
    const body=text('div',undefined,dialog);body.dataset.eligibilityBody='';
    const view={dialog,body,feedback:feedbackNode,reload,session:auth().getSessionVersion(),accountId:account.id,authority:authority(account),generation:++sequence,read:0,busy:false,uncertain:null,workspace:null,case:null};active=view;
    reload.addEventListener('click',()=>{if(current(view)&&!view.busy)void loadWorkspace(view,view.source?{sourceId:view.source.id}:view.case?{caseId:view.case.id}:selected);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(active===view&&!dialog.open)close();});
    document.body.append(dialog);dialog.showModal();dismiss.focus();await loadWorkspace(view,selected);
  }
  function mountEntry() {
    const list=document.querySelector('#profile-dialog .profile-list');if(!list)return;
    if(!entry?.isConnected){entry=button('موافقات المشاركة والأهلية',null,()=>void open());entry.dataset.participationOpen='';list.insertBefore(entry,list.querySelector('[data-hl-action="logout"]'));}
    entry.hidden=!auth()?.isAuthenticated?.();
  }
  for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:role-changed'])document.addEventListener(event,()=>{close();mountEntry();});
  for(const event of ['hydroland:profile-data-ready','hydroland:auth-changed'])document.addEventListener(event,()=>{if(active&&!current(active))close();mountEntry();});
  document.addEventListener('hydroland:locale-changed',()=>{if(active&&current(active))active.dialog.querySelectorAll('time').forEach(updateTime);});
  document.addEventListener('click',event=>{const link=event.target.closest?.('[data-participation-subject]');if(link){event.preventDefault();void open({subjectType:link.dataset.participationType||'BOOKING_PARTICIPANT',subjectId:link.dataset.participationSubject});}});
  window.HydrolandParticipantEligibility={open,close};mountEntry();
})();
