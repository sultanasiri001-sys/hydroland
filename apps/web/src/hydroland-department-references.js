(() => {
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("department-references", {
  "إدارة المراجع": "Reference department",
  "مراجع الإدارات واللوائح": "Department and regulatory references",
  "المراجع المرتبطة بالإدارات الأربع عشرة": "References linked to the fourteen departments",
  "تحديث المراجع": "Refresh references",
  "دورة العمل والمستندات، ومراجع التأسيس والآيزو، والضوابط المسجلة لكل إدارة. إدراج المصدر أو النموذج لا يثبت اكتمال المراجعة أو التنفيذ أو إقفال الإدارة.": "Workflows, documents, founding/ISO references and recorded controls for each department. Listing a source or form does not establish completed review, execution or department closure.",
  "لم تُقيّم": "Not assessed",
  "موانع محفوظة؛ الإدارة غير مقفلة": "Blockers recorded; department not closed",
  "التقييم المحفوظ قديم؛ يلزم إعادة التحقق": "Saved assessment is stale; re-verification required",
  "لم يُقيّم": "Not assessed",
  "مانع مسجل": "Blocker recorded",
  "السجل المحفوظ": "Saved register",
  "· لقطة السجل:": "· Register snapshot:",
  "الحالة المسجلة وقت اللقطة:": "Status recorded at the snapshot:",
  "ربط المصدر بالإدارة مقترح للمراجعة؛ لم يُعتمد انطباق متطلباته تلقائيًا.": "The source-to-department link is proposed for review. Applicability of its requirements has not been automatically approved.",
  "المصدر الرسمي المسجل": "Recorded official source",
  "تقييم النواقص المحفوظ": "Saved gap assessment",
  "التفاصيل وتسجيل التقييم متاحان للمالك المتحقق فقط. المراجع أدلة مسجلة لا تُثبت قبول البوابات، ولا ينفذ الحفظ أي قرار تشغيلي.": "Details and assessment recording are available only to the verified owner. References are recorded evidence, not proof of gate acceptance. Saving does not execute an operational decision.",
  "فتح تقييم النواقص (للمالك)": "Open gap assessment (owner)",
  "جارٍ قراءة تقييم المالك…": "Reading owner assessment…",
  "إغلاق تقييم النواقص": "Close gap assessment",
  "تفاصيل التقييم متاحة للمالك المتحقق فقط.": "Assessment details are available only to the verified owner.",
  "تعذر قراءة التقييم؛ أعد القراءة قبل أي إجراء.": "Could not read the assessment. Read again before any action.",
  "استجابة تقييم النواقص غير مكتملة.": "The gap-assessment response is incomplete.",
  "تمت قراءة التقييم. راجع النواقص ثم اطلب معاينة قبل الحفظ.": "Assessment read. Review gaps, then request a preview before saving.",
  "تعذر قراءة التقييم.": "Could not read the assessment.",
  "التقييم المحفوظ:": "Saved assessment:",
  "· الإصدار": "· Version",
  "هذا التقييم قديم. تحقّق من المصادر والإصدارات قبل إنشاء تقييم جديد.": "This assessment is stale. Verify sources and versions before creating a new assessment.",
  "لا يوجد تقييم محفوظ لهذه الإدارة.": "No saved assessment for this department.",
  "سجل إصدارات التقييم": "Assessment version history",
  "يعرض هذا الملخص أحدث 50 إصدارًا؛ الإصدارات السابقة محفوظة ولم تُحذف.": "This summary shows the latest 50 versions. Earlier versions are retained and have not been deleted.",
  "البوابات السبع — تسجيل مانع أو عدم التقييم فقط": "Seven gates — record a blocker or an unassessed state only",
  "حالة البوابة": "Gate status",
  "حالة": "Status",
  "الملاحظة أو سبب المانع (حتى 1000 حرف)": "Note or blocker reason (up to 1,000 characters)",
  "ملاحظة": "Note",
  "مراجع مستندات معروفة، اختياري: معرّف المستند ثم رقم الإصدار في كل سطر (حتى 3)": "Known document references, optional: document ID followed by version number on each line (up to 3)",
  "أدلة": "Evidence",
  "معاينة تقييم النواقص": "Preview gap assessment",
  "تغيّر التقييم؛ يلزم معاينة جديدة قبل التأكيد.": "The assessment changed. A new preview is required before confirmation.",
  "اختيار مستند من سجل الإدارة": "Choose a document from the department register",
  "رقم المرجع أو اسم النموذج": "Reference number or template name",
  "بحث في مستندات الإدارة": "Search department documents",
  "المستند المحفوظ": "Saved document",
  "عرض مزيد من المستندات": "Show more documents",
  "بوابة إرفاق الدليل": "Evidence attachment gate",
  "إضافة المرجع إلى البوابة": "Add reference to gate",
  "اختر المستند": "Select document",
  "جارٍ البحث…": "Searching…",
  "انتهت صلاحية قراءة أدلة الإدارة. أعد فتح التقييم.": "Department evidence access expired. Reopen the assessment.",
  "· مرفقات PDF": "· PDF attachments",
  "عدد المستندات المعروضة": "Documents shown",
  "لا توجد مستندات مطابقة في هذه الإدارة.": "No matching documents in this department.",
  "تعذر تحميل المستندات. أعد البحث أو أدخل المرجع يدويًا.": "Could not load documents. Search again or enter the reference manually.",
  "هذا المستند مضاف إلى البوابة.": "This document is already added to the gate.",
  "يمكن إضافة ثلاثة مراجع لكل بوابة.": "Up to three references can be added per gate.",
  "أضيف المرجع إلى": "Reference added to",
  "أدخل سببًا واضحًا من 5 إلى 1000 حرف لكل مانع.": "Enter a clear reason of 5–1,000 characters for each blocker.",
  "استخدم ثلاثة مراجع مستندات كحد أقصى لكل بوابة.": "Use no more than three document references per gate.",
  "مرجع الدليل: معرّف مستند صالح ثم رقم إصدار صحيح في كل سطر.": "Evidence reference: a valid document ID followed by an integer version number on each line.",
  "لا تكرر مرجع المستند داخل البوابة.": "Do not repeat a document reference within a gate.",
  "جارٍ معاينة التقييم والتحقق من المراجع…": "Previewing the assessment and verifying references…",
  "تعذرت المعاينة أو تغيّر المصدر. أعد قراءة التقييم قبل المحاولة.": "Preview failed or the source changed. Read the assessment again before retrying.",
  "استجابة معاينة التقييم غير مكتملة؛ أعد القراءة.": "Assessment preview response is incomplete. Read again.",
  "معاينة فقط — لم يُحفظ التقييم": "Preview only — assessment not saved",
  "راجعت النواقص والمراجع؛ هذا الحفظ ليس قبولًا أو اعتمادًا أو إقفالًا.": "I have reviewed gaps and references. Saving does not constitute acceptance, approval or closure.",
  "تأكيد حفظ تقييم النواقص": "Confirm saving the gap assessment",
  "جارٍ حفظ التقييم…": "Saving assessment…",
  "تغيّر التقييم أو المصدر؛ أعد القراءة. لم تُعَد المحاولة تلقائيًا.": "Assessment or source changed. Read again. No automatic retry was made.",
  "لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة.": "Assessment saving is unconfirmed. Read again to verify before retrying.",
  "حُفظ تقييم النواقص بالإصدار": "Gap assessment saved as version",
  "لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة؛ لا إعادة تلقائية.": "Assessment saving is unconfirmed. Read again to verify before retrying; no automatic retry.",
  "راجع المعاينة ثم أكد الحفظ بصورة مستقلة.": "Review the preview, then confirm saving separately.",
  "تعذرت معاينة التقييم. أعد القراءة قبل المحاولة.": "Could not preview the assessment. Read again before retrying.",
  "دورة العمل والمستندات التشغيلية": "Workflow and operational documents",
  "نطاق الإقفال محدد من مسارات الإدارات السابقة. حالة تحقق إقفال الإدارة:": "Closure scope is defined by preceding department workflows. Department-closure verification status:",
  "مرجع التقييم:": "Assessment reference:",
  "أدلة نتيجة الإجراء وإقفاله": "Evidence of action outcome and closure",
  "النماذج المصدرية وحالتها المحفوظة": "Source forms and their saved status",
  "نماذج الإدارة في الكتالوج الحالي:": "Department forms in the current catalog:",
  "نسخة نشطة مسجلة": "Active version recorded",
  "تعارض: أكثر من نسخة نشطة": "Conflict: more than one active version",
  "لم تظهر نسخة نشطة في الجهة المفحوصة": "No active version found in the inspected organization",
  "الجهة الداخلية غير مسجلة": "Internal organization not registered",
  "تحتاج الحالة إلى مراجعة": "Status requires review",
  "الإصدار": "Version",
  "نشط": "Active",
  "محفوظ سابقًا": "Previously saved",
  "مستندات محفوظة مرتبطة بهذه الرموز في الجهة المفحوصة:": "Saved documents linked to these codes in the inspected organization:",
  "شروط إقفال الإدارة": "Department closure requirements",
  "مراجع الآيزو المرتبطة بنطاق المراجعة": "ISO references linked to review scope",
  "يراجع النظام السعودي المنطبق أولًا، ثم الآيزو وWRSTC ثم إصدار برنامج الجهة التدريبية حيث تنطبق. بيانات الإصدار أدناه متحقق منها بتاريخها؛ قرار اعتماد كل معيار ومواده لكل إجراء يحتاج مرجعه المحفوظ. لا يُثبت هذا العرض شهادة آيزو أو توفر نسخة مرخصة.": "Review applicable Saudi rules first, then ISO and WRSTC, followed by the training body's program version where applicable. The version data below was verified on its stated date. Adopting each standard and its clauses for an action requires a saved decision reference. This view does not establish ISO certification or access to a licensed copy.",
  "تاريخ التحقق من بيانات الناشر:": "Publisher-data verification date:",
  "ربط الانطباق ومواد المعيار ومرجع قرار اعتماده: قيد المراجعة.": "Applicability, standard clauses and adoption-decision reference: under review.",
  "بيانات الإصدار لدى ISO": "ISO edition information",
  "ربط مصفوفة المتطلبات بالضوابط": "Link requirement matrices to controls",
  "يحفظ المالك ارتباط نسخة المصفوفة بضوابطها للمراجعة. الربط لا يعتمد المصادر أو الأدلة ولا يفعّل الإلزام أو يغيّر إعدادات التشغيل.": "The owner saves matrix-version links to controls for review. Linking does not approve sources or evidence, enable enforcement or change operational settings.",
  "فتح ربط مصفوفة الضوابط (للمالك)": "Open control-matrix linking (owner)",
  "جارٍ قراءة مصفوفات المالك وروابطها…": "Reading the owner's matrices and links…",
  "تفاصيل الربط وحفظه متاحة لمالك الجهة الداخلية المتحقق فقط.": "Link details and saving are available only to the verified internal-organization owner.",
  "تعذر قراءة بيانات الربط كاملة؛ أعد القراءة.": "Could not read complete link data. Read again.",
  "تمت قراءة النسخ. اختر المصفوفة وراجع معاينة الربط قبل حفظه.": "Versions read. Select a matrix and review the linking preview before saving.",
  "تعذر قراءة الربط.": "Could not read links.",
  "إغلاق ربط المصفوفة": "Close matrix linking",
  "الضوابط المرتبطة للمراجعة:": "Controls linked for review:",
  "· الروابط المتقادمة:": "· Stale links:",
  "مفاتيح الكتالوج دون سجل ضبط مستقل:": "Catalog keys without a separate control record:",
  "نسخة مصفوفة التشغيل": "Operational matrix version",
  "اختر نسخة محفوظة": "Select a saved version",
  "تعرض أحدث 50 نسخة غير مؤرشفة.": "Shows the latest 50 unarchived versions.",
  "سبب ربط المصفوفة": "Reason for linking the matrix",
  "معاينة ربط المصفوفة": "Preview matrix links",
  "راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام": "I have reviewed this version's control links without approving its content or enabling enforcement",
  "حفظ روابط المراجعة": "Save review links",
  "اختر نسخة وأدخل سببًا واضحًا من خمسة أحرف على الأقل.": "Select a version and enter a clear reason of at least five characters.",
  "تعذر حفظ الربط؛ أعد القراءة والمعاينة.": "Could not save links. Read and preview again.",
  "جارٍ معاينة نسخة المصفوفة والضوابط الحالية…": "Previewing the matrix version and current controls…",
  "معاينة الربط غير متسقة؛ أعد القراءة.": "Link preview is inconsistent. Read again.",
  "معاينة فقط ·": "Preview only ·",
  "· عدد الضوابط": "· Control count",
  "راجع النسخة والضوابط ثم أكد حفظ روابط المراجعة.": "Review the version and controls, then confirm saving review links.",
  "تعذرت المعاينة.": "Preview failed.",
  "جارٍ حفظ روابط المراجعة دون اعتماد البنود…": "Saving review links without approving requirements…",
  "نتيجة الحفظ غير مكتملة؛ أعد القراءة قبل أي محاولة أخرى.": "Save result is incomplete. Read again before retrying.",
  "تم حفظ روابط مراجعة": "Review links saved for",
  "ضابطًا ·": "controls ·",
  "لم تتأكد نتيجة الحفظ.": "Save result unconfirmed.",
  "أعد القراءة؛ لا تكرر تأكيد المعاينة القديمة.": "Read again. Do not repeat confirmation of the old preview.",
  "إدارة مستندات هذه الإدارة والنواقص": "Manage this department's documents and gaps",
  "الإدارة موجودة ومفعّلة في الهيكل الداخلي.": "The department exists and is enabled in the internal structure.",
  "الإدارة موجودة وغير مفعّلة حاليًا.": "The department exists and is currently disabled.",
  "لم يظهر سجل للإدارة في الهيكل الداخلي.": "No department record was found in the internal structure.",
  "تُراجع الصلاحية بحسب الدور والإجراء والمورد والإدارة والمركز والشروط وفترة التفويض. تبقى المراجعة القانونية لدى القانونية، وملكية الإجراء لدى الإدارة المختصة.": "Authority is checked by role, action, resource, department, center, conditions and delegation period. Legal review remains with legal affairs; action ownership remains with the responsible department.",
  "لاستكمال الربط: المصدر وإصداره، المادة أو المتطلب المعتمد، قابلية الانطباق، الإجراء والصلاحية، الدليل المتحقق منه، ومرجع الاعتماد.": "To complete linking: source/version, approved clause or requirement, applicability, action/authority, verified evidence and approval reference.",
  "الجهات والخدمات المرجعية": "Reference bodies and services",
  "مراجع هذه الإدارة واردة في السجل القانوني أدناه.": "This department's references appear in the legal register below.",
  "المراجع المحفوظة": "Saved references",
  "استكمال نسخ المصادر وربط موادها ما زال مطلوبًا لهذه الإدارة.": "Source versions and clause links still need completion for this department.",
  "الضوابط المسجلة المرتبطة": "Linked registered controls",
  "لم تظهر ضوابط مسجلة ضمن التصنيفات المرتبطة بهذه الإدارة. هذا لا يثبت غياب إجراءاتها الأخرى.": "No registered controls were found in categories linked to this department. This does not establish the absence of other procedures.",
  "· حالة الإعداد المسجلة:": "· Recorded configuration status:",
  "مفعّل": "Enabled",
  "قيد المراجعة": "Under review",
  "غير مفعّل": "Disabled",
  "سجل إلزام صالح عند القراءة؛ تفرضه الحماية بصرف النظر عن إعداد التعطيل.": "Valid enforcement record at read time. Safeguards enforce it regardless of the disable setting.",
  "سجل عدم انطباق صالح عند القراءة؛ لا يثبت إعفاءً من المتطلبات الأخرى.": "Valid non-applicability record at read time. It does not establish exemption from other requirements.",
  "سجل الربط يتطلب مراجعة؛ القرار التشغيلي محجوب حتى معالجة المصدر والانطباق والاعتماد.": "Link record needs review. Operational decisions are blocked until source, applicability and approval are resolved.",
  "لم يسجل ربط بصيغة الإلزام الحالية لهذا الضابط.": "No link in the current enforcement format is recorded for this control.",
  "لم ترد حالة ربط الإلزام في هذه القراءة؛ حدّث المراجع بعد اكتمال التحديث.": "Enforcement-link status was not returned in this reading. Refresh references after the update is complete.",
  "نسخة مصفوفة مرتبطة للمراجعة؛ الربط لا يعتمد المصدر أو يفعّل الإلزام.": "Matrix version linked for review. Linking does not approve the source or enable enforcement.",
  "ربط المصفوفة متقادم أو غير متسق؛ يلزم إعادة التحقق.": "Matrix link is stale or inconsistent; re-verification required.",
  "لم تربط نسخة مصفوفة بهذا الضابط للمراجعة.": "No matrix version is linked to this control for review.",
  "لم ترد حالة ربط المصفوفة في هذه القراءة.": "Matrix-link status was not returned in this reading.",
  "مراجع بالصيغة السابقة مسجلة؛ لا تثبت وحدها إلزامًا نافذًا.": "References in the previous format are recorded. They do not establish effective enforcement by themselves.",
  "مراجع محفوظة؛ صلاحية سجل الربط لا تثبت صحة الوثائق أو جاهزية رحلة بعينها.": "References are saved. A valid link record does not establish document accuracy or readiness of a specific trip.",
  "ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل في السجل المفحوص.": "Requirement, version, evidence and approval-reference linking are incomplete in the inspected record.",
  "مصفوفة ضوابط الموارد البشرية للمراجعة": "HR control matrix for review",
  "مصادر الحزمة:": "Package sources:",
  "مواد مرشحة للمراجعة:": "Candidate clauses for review:",
  "لم يُثبت متطلب معتمد أو دليل فعلي أو اعتماد قانوني في هذه الحزمة.": "This package does not establish an approved requirement, actual evidence or legal approval.",
  "فتح مسار مراجعة ضوابط الموارد البشرية": "Open HR control review",
  "جارٍ قراءة المراجع وحالة ربطها…": "Reading references and link status…",
  "تعذر تحميل مراجع الإدارات.": "Could not load department references.",
  "استجابة مراجع الإدارات غير مكتملة.": "The department-reference response is incomplete.",
  "استجابة دورة الإدارة غير مكتملة.": "The department-workflow response is incomplete.",
  "استجابة حالات ربط المراجع غير مكتملة.": "The reference-link status response is incomplete.",
  "استجابة روابط المصفوفات غير مكتملة.": "The matrix-link response is incomplete.",
  "استجابة ربط كتالوج التشغيل غير مكتملة.": "The operational-catalog link response is incomplete.",
  "استجابة نماذج الإدارات غير مكتملة.": "The department-form response is incomplete.",
  "وقت القراءة:": "Read time:",
  "· إدارات مسجلة:": "· Registered departments:",
  "من 14 · نماذج الكتالوج:": "of 14 · Catalog forms:",
  "· الضوابط:": "· Controls:",
  "· ذات مراجع مسجلة:": "· With recorded references:",
  "مراجع بالصيغة السابقة:": "References in the previous format:",
  "· سجلات إلزام صالحة:": "· Valid enforcement records:",
  "· سجلات عدم انطباق صالحة:": "· Valid non-applicability records:",
  "· روابط تحتاج مراجعة:": "· Links requiring review:",
  "· بلا ربط بصيغة الإلزام الحالية:": "· Without current-format enforcement links:",
  "لم تقس حالة ربط الإلزام في هذه القراءة؛ العداد السابق وحده لا يحددها.": "Enforcement-link status was not measured in this reading. The preceding count alone does not determine it.",
  "سجلات ضبط مخزنة مرتبطة بالمراجعة:": "Stored control records linked for review:",
  "· روابط متقادمة:": "· Stale links:",
  "· بلا ربط مصفوفة:": "· Without matrix links:",
  "كتالوج التشغيل:": "Operational catalog:",
  "من": "of",
  "مرتبط للمراجعة · متقادم:": "linked for review · Stale:",
  "· بلا ربط:": "· Unlinked:",
  "· مفاتيح دون سجل ضبط مستقل:": "· Keys without a separate control record:",
  "تعذر تحميل المراجع.": "Could not load references.",
  "{0} · لقطة السجل: {1}": "{0} · Register snapshot: {1}",
  "الحالة المسجلة وقت اللقطة: {0}": "Status recorded at the snapshot: {0}",
  "التقييم المحفوظ: {0} · الإصدار {1} · {2}": "Saved assessment: {0} · Version {1} · {2}",
  "{0} · الإصدار {1} · {2}": "{0} · Version {1} · {2}",
  "حالة {0}": "Status {0}",
  "ملاحظة {0}": "Note {0}",
  "أدلة {0}": "Evidence {0}",
  "{0} · {1} · الإصدار {2} · مرفقات PDF {3}": "{0} · {1} · Version {2} · PDF attachments {3}",
  "عدد المستندات المعروضة {0}": "Documents shown {0}",
  "أضيف المرجع إلى {0}.": "Reference added to {0}.",
  "{0} · {1}{2}": "{0} · {1}{2}",
  "{0} · الإصدار {1} · {2}{3}": "{0} · Version {1} · {2}{3}",
  " · مرفقات PDF {0}": " · PDF attachments {0}",
  " راجعت النواقص والمراجع؛ هذا الحفظ ليس قبولًا أو اعتمادًا أو إقفالًا.": " I have reviewed gaps and references. Saving does not constitute acceptance, approval or closure.",
  "حُفظ تقييم النواقص بالإصدار {0}. ليس اعتمادًا أو إقفالًا. حدّث المراجع لقراءة الملخص الأحدث.": "Gap assessment saved as version {0}. This is not approval or closure. Refresh the references to read the latest summary.",
  "نطاق الإقفال محدد من مسارات الإدارات السابقة. حالة تحقق إقفال الإدارة: {0}. حفظ تقييم النواقص ليس قبولًا أو اعتمادًا أو إقفالًا للإدارة.": "Closure scope is defined by preceding department workflows. Department-closure verification status: {0}. Saving a gap assessment does not accept, approve or close the department.",
  "مرجع التقييم: {0} · الإصدار {1} · {2}": "Assessment reference: {0} · Version {1} · {2}",
  "نماذج الإدارة في الكتالوج الحالي: {0}. الحالة المحفوظة تُقرأ من الجهة المحددة.": "Department forms in the current catalog: {0}. Saved status is read from the selected organization.",
  "الإصدار {0} · {1}": "Version {0} · {1}",
  "مستندات محفوظة مرتبطة بهذه الرموز في الجهة المفحوصة: {0}. العدد لا يقيس اكتمال الإجراء ولا يشمل السجلات المحفوظة في المجالات الأخرى.": "Saved documents linked to these codes in the inspected organization: {0}. This count does not measure procedural completion or include records saved in other domains.",
  "{0} — {1}": "{0} — {1}",
  "تاريخ التحقق من بيانات الناشر: {0}": "Publisher-data verification date: {0}",
  "الضوابط المرتبطة للمراجعة: {0} · الروابط المتقادمة: {1}": "Controls linked for review: {0} · Stale links: {1}",
  "مفاتيح الكتالوج دون سجل ضبط مستقل: {0}. يحفظ الربط للمراجعة دون إنشاء هذه السجلات أو تغيير التشغيل.": "Catalog keys without a separate control record: {0}. Links are saved for review without creating these records or changing operations.",
  "معاينة فقط · {0} · الإصدار {1} · عدد الضوابط {2}": "Preview only · {0} · Version {1} · Control count {2}",
  "تم حفظ روابط مراجعة {0} ضابطًا · {1} · {2} · الإصدار {3}. الاعتماد والإلزام ما زالا في مسارهما المستقل.": "Review links saved for {0} controls · {1} · {2} · Version {3}. Approval and enforcement remain in their separate workflows.",
  "{0} أعد القراءة؛ لا تكرر تأكيد المعاينة القديمة.": "{0} Read again. Do not repeat confirmation of the old preview.",
  "{0}.{1} · حالة الإعداد المسجلة: {2}": "{0}.{1} · Recorded configuration status: {2}",
  "مصادر الحزمة: {0}": "Package sources: {0}",
  "مواد مرشحة للمراجعة: {0}": "Candidate clauses for review: {0}",
  "وقت القراءة: {0} · إدارات مسجلة: {1} من 14 · نماذج الكتالوج: {2} · الضوابط: {3} · ذات مراجع مسجلة: {4}. بعض الضوابط مشتركة بين الإدارات. حالة المصادر تعكس تاريخ لقطة السجل.": "Read time: {0} · Registered departments: {1} of 14 · Catalog forms: {2} · Controls: {3} · With recorded references: {4}. Some controls are shared across departments. Source status reflects the register snapshot date.",
  " مراجع بالصيغة السابقة: {0} · سجلات إلزام صالحة: {1} · سجلات عدم انطباق صالحة: {2} · روابط تحتاج مراجعة: {3} · بلا ربط بصيغة الإلزام الحالية: {4}. صلاحية الربط هي نتيجة فحص السجل عند القراءة، وليست تحققًا من الوثيقة الرسمية.": " References in the previous format: {0} · Valid enforcement records: {1} · Valid non-applicability records: {2} · Links requiring review: {3} · Without current-format enforcement links: {4}. Link validity reflects the register check at read time, not verification of the official document.",
  " لم تقس حالة ربط الإلزام في هذه القراءة؛ العداد السابق وحده لا يحددها.": " Enforcement-link status was not measured in this reading. The preceding count alone does not determine it.",
  " سجلات ضبط مخزنة مرتبطة بالمراجعة: {0} · روابط متقادمة: {1} · بلا ربط مصفوفة: {2}.": " Stored control records linked for review: {0} · Stale links: {1} · Without matrix links: {2}.",
  " كتالوج التشغيل: {0} من {1} مرتبط للمراجعة · متقادم: {2} · بلا ربط: {3} · مفاتيح دون سجل ضبط مستقل: {4}. الربط لا ينشئ سجلات ضبط ولا يغيّر التشغيل.": " Operational catalog: {0} of {1} linked for review · Stale: {2} · Unlinked: {3} · Keys without a separate control record: {4}. Linking does not create control records or change operations."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  const mount = () => {
    const host = document.getElementById('hl-admin-employees');
    if (!host) return false;
    if (window.HydrolandDepartmentReferences) return true;
    const box = document.createElement('details');
    box.dataset.departmentReferences = '';
    box.className = 'hl-staff-controls hl-staff-references';
    uiLocale.setHTML(box, uiLocale.html`<summary>مراجع الإدارات واللوائح</summary><section>
      <header><h4>المراجع المرتبطة بالإدارات الأربع عشرة</h4><button type="button" data-reference-refresh>تحديث المراجع</button></header>
      <p>دورة العمل والمستندات، ومراجع التأسيس والآيزو، والضوابط المسجلة لكل إدارة. إدراج المصدر أو النموذج لا يثبت اكتمال المراجعة أو التنفيذ أو إقفال الإدارة.</p>
      <p role="status" data-reference-status></p>
      <label>إدارة المراجع<select data-reference-department aria-label="إدارة المراجع" disabled></select></label>
      <div data-reference-detail></div>
    </section>`);
    host.querySelector('[data-staff-readiness]').after(box);
    const auth = () => window.HydrolandAuth, access = () => window.HydrolandPortalAccess;
    const eligible = () => Boolean(auth()?.isAuthenticated?.() && access()?.getCurrentRole?.() === 'admin' && access()?.roleAllowed?.('admin') && !host.hidden && box.open);
    const status = box.querySelector('[data-reference-status]'), select = box.querySelector('[data-reference-department]'), detail = box.querySelector('[data-reference-detail]'), refresh = box.querySelector('[data-reference-refresh]');
    let generation = 0, assessmentGeneration = 0, data = null, busy = false;
    const assessmentPolicy = 'DEPARTMENT_CLOSURE_ASSESSMENT_V1';
    const gateIds = ['REFERENCE_APPLICABILITY', 'DOCUMENT_COVERAGE', 'SCOPED_AUTHORIZATION', 'PERSISTED_EXECUTION', 'VERIFICATION_AND_EXCEPTIONS', 'REVISION_PRINT_RETENTION', 'END_TO_END_ACCEPTANCE'];
    const assessmentLabels = { NOT_ASSESSED: 'لم تُقيّم', BLOCKED: 'موانع محفوظة؛ الإدارة غير مقفلة', STALE: 'التقييم المحفوظ قديم؛ يلزم إعادة التحقق' };
    const gateLabels = { NOT_ASSESSED: 'لم يُقيّم', BLOCKED: 'مانع مسجل' };
    const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const evidenceId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
    const evidenceKey = value => uuid(value) ? value.toLowerCase() : value;
    const text = value => typeof value === 'string' && value.trim().length > 0;
    const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
    const revision = value => Number.isSafeInteger(value) && value > 0;
    function evidenceRevision(value) {
      const digits = (value || '').replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0));
      return /^[1-9][0-9]*$/.test(digits) && revision(Number(digits)) ? Number(digits) : null;
    }
    const validGates = gates => Array.isArray(gates) && gates.length === gateIds.length && new Set(gates.map(g => g?.id)).size === gateIds.length && gates.every(g => gateIds.includes(g?.id) && Object.hasOwn(gateLabels, g.verificationStatus));
    const consistentGates = (state, gates) => state === 'BLOCKED' ? gates.some(g => g.verificationStatus === 'BLOCKED') : gates.every(g => g.verificationStatus === 'NOT_ASSESSED');
    function validSummary(cycle) {
      if (!cycle || cycle.departmentClosed !== false || cycle.closureDecisionReference !== null || !Object.hasOwn(assessmentLabels, cycle.closureAssessment) || !validGates(cycle.closureGates) || !consistentGates(cycle.closureAssessment, cycle.closureGates)) return false;
      const record = cycle.closureRecord;
      if (record === null) return cycle.closureAssessment === 'NOT_ASSESSED';
      return Boolean(record && uuid(record.id) && revision(record.revision) && time(record.recordedAt) && record.policyVersion === assessmentPolicy && text(record.specificationVersion) && text(record.assessmentReference) && typeof record.assessmentCurrent === 'boolean' && (cycle.closureAssessment === 'STALE') === !record.assessmentCurrent);
    }
    function validEvidence(evidence) {
      return Array.isArray(evidence) && evidence.length <= 3 && evidence.every(e => evidenceId(e?.documentId) && revision(e.version) && text(e.contentHash) && text(e.referenceNumber) && (e.pdfAttachmentCount === undefined || revision(e.pdfAttachmentCount))) && new Set(evidence.map(e => evidenceKey(e.documentId))).size === evidence.length;
    }
    function validPrivateGates(gates) {
      return validGates(gates) && gates.every(g => typeof g.note === 'string' && g.note.length <= 1000 && (g.verificationStatus !== 'BLOCKED' || g.note.trim().length >= 5) && validEvidence(g.evidence));
    }
    function validAssessment(result, department) {
      if (!result || result.schemaVersion !== 1 || result.policy !== assessmentPolicy || result.department !== department || !uuid(result.organizationId) || !text(result.specificationVersion) || !Number.isSafeInteger(result.expectedRevision) || result.expectedRevision < 0 || result.canRecord !== true || result.departmentClosed !== false || result.closureDecisionReference !== null || !text(result.notice) || !Array.isArray(result.history)) return false;
      if (!result.history.every(h => uuid(h?.id) && revision(h.revision) && h.revision <= result.expectedRevision && time(h.recordedAt) && ['NOT_ASSESSED', 'BLOCKED'].includes(h.state) && text(h.assessmentReference)) || new Set(result.history.map(h => h.revision)).size !== result.history.length) return false;
      const record = result.current;
      if (record === null) return result.expectedRevision === 0 && result.history.length === 0;
      return Boolean(record && uuid(record.id) && record.revision === result.expectedRevision && revision(record.revision) && time(record.recordedAt) && ['NOT_ASSESSED', 'BLOCKED'].includes(record.state) && validPrivateGates(record.gates) && consistentGates(record.state, record.gates) && text(record.assessmentReference) && typeof record.assessmentCurrent === 'boolean');
    }
    const current = (g, session) => g === generation && session === auth()?.getSessionVersion?.() && eligible();
    const node = (tag, value, parent) => { const element = document.createElement(tag); if (value !== undefined) uiLocale.setMessage(element, value); parent?.appendChild(element); return element; };
    function link(parent, title, value) {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return;
        const a = node('a', title, parent); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      } catch {}
    }
    function libraryLink(parent, id) {
      if (typeof id === 'string' && /^libfile_[a-z0-9]+$/.test(id)) link(parent, uiLocale.message('السجل المحفوظ'), 'https://chatgpt.com/library?file_id=' + encodeURIComponent(id) + '&account_id=personal');
    }
    function clear() {
      generation++; assessmentGeneration++; data = null; busy = false; select.replaceChildren(); select.disabled = true; detail.replaceChildren(); uiLocale.setMessage(status, ''); refresh.disabled = false; box.open = false;
    }
    function renderSource(source, parent) {
      const item = node('article', undefined, parent);
      node('h6', (source.titleAr || source.nameAr), item);
      node('p', uiLocale.message("{0} · لقطة السجل: {1}", [source.id, source.snapshotDate]), item);
      if (source.recordedStatus) node('p', uiLocale.message("الحالة المسجلة وقت اللقطة: {0}", [source.recordedStatus]), item);
      if (source.versionLabel) node('p', source.versionLabel, item);
      if (source.scope) node('p', source.scope, item);
      if (source.routingStatus) node('p', uiLocale.message('ربط المصدر بالإدارة مقترح للمراجعة؛ لم يُعتمد انطباق متطلباته تلقائيًا.'), item);
      link(item, uiLocale.message('المصدر الرسمي المسجل'), source.url);
      libraryLink(item, source.sourceLibraryFileId);
    }
    function renderAssessmentEditor(department) {
      const section = node('section', undefined, detail); section.dataset.closureEditor = ''; section.style.minWidth = '0'; section.style.overflowWrap = 'anywhere';
      node('h6', uiLocale.message('تقييم النواقص المحفوظ'), section);
      node('p', uiLocale.message('التفاصيل وتسجيل التقييم متاحان للمالك المتحقق فقط. المراجع أدلة مسجلة لا تُثبت قبول البوابات، ولا ينفذ الحفظ أي قرار تشغيلي.'), section);
      const openButton = node('button', uiLocale.message('فتح تقييم النواقص (للمالك)'), section); openButton.type = 'button'; openButton.dataset.closureOpen = '';
      const feedback = node('p', '', section); feedback.setAttribute('role', 'status'); feedback.dataset.closureStatus = '';
      const privatePane = node('div', undefined, section); privatePane.dataset.closurePrivate = '';
      const endpoint = '/admin/department-references/' + encodeURIComponent(department.code) + '/assessment';
      let working = false;
      async function loadAssessment() {
        if (!eligible() || working) return;
        const g = generation, session = auth()?.getSessionVersion?.(), a = ++assessmentGeneration;
        const active = () => current(g, session) && assessmentGeneration === a && select.value === department.code && section.isConnected;
        working = true; openButton.disabled = true; privatePane.replaceChildren(); uiLocale.setMessage(feedback, uiLocale.message('جارٍ قراءة تقييم المالك…'));
        const dismiss = () => { assessmentGeneration++; working = false; privatePane.replaceChildren(); uiLocale.setMessage(feedback, ''); openButton.disabled = false; };
        const close = node('button', uiLocale.message('إغلاق تقييم النواقص'), privatePane); close.type = 'button'; close.addEventListener('click', dismiss);
        try {
          const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
          if (!allowed) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
          if (!active()) return;
          const response = await auth().authorizedFetch(endpoint);
          const result = await response.json().catch(() => null);
          if (!active()) return;
          if (response.status === 401) { clear(); return; }
          if (response.status === 403) throw localError(uiLocale.message('تفاصيل التقييم متاحة للمالك المتحقق فقط.'));
          if (!response.ok) throw localError(uiLocale.message('تعذر قراءة التقييم؛ أعد القراءة قبل أي إجراء.'));
          if (!validAssessment(result, department.code)) throw localError(uiLocale.message('استجابة تقييم النواقص غير مكتملة.'));
          drawAssessment(result, { active, dismiss, g, session, a });
          uiLocale.setMessage(feedback, uiLocale.message('تمت قراءة التقييم. راجع النواقص ثم اطلب معاينة قبل الحفظ.'));
        } catch (error) {
          if (active()) { privatePane.replaceChildren(); uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر قراءة التقييم.'))); }
        } finally {
          if (active()) { working = false; openButton.disabled = false; }
        }
      }
      function drawAssessment(result, context) {
        privatePane.replaceChildren();
        const { active, dismiss, session, g } = context;
        let plan = null, inFlight = false, editVersion = 0;
        const close = node('button', uiLocale.message('إغلاق تقييم النواقص'), privatePane); close.type = 'button'; close.addEventListener('click', dismiss);
        node('p', result.notice, privatePane);
        if (result.current) {
          node('p', uiLocale.message("التقييم المحفوظ: {0} · الإصدار {1} · {2}", [result.current.assessmentReference, result.current.revision, (value=>value===undefined?value:uiLocale.message(value))(assessmentLabels[result.current.state])]), privatePane);
          if (!result.current.assessmentCurrent) node('p', uiLocale.message('هذا التقييم قديم. تحقّق من المصادر والإصدارات قبل إنشاء تقييم جديد.'), privatePane);
        } else node('p', uiLocale.message('لا يوجد تقييم محفوظ لهذه الإدارة.'), privatePane);
        if (result.history.length) {
          const history = node('details', undefined, privatePane); node('summary', uiLocale.message('سجل إصدارات التقييم'), history);
          const list = node('ul', undefined, history);
          result.history.forEach(h => node('li', uiLocale.message("{0} · الإصدار {1} · {2}", [h.assessmentReference, h.revision, (value=>value===undefined?value:uiLocale.message(value))(assessmentLabels[h.state])]), list));
          if (result.hasMoreHistory === true) node('p', uiLocale.message('يعرض هذا الملخص أحدث 50 إصدارًا؛ الإصدارات السابقة محفوظة ولم تُحذف.'), history);
        }
        const form = node('form', undefined, privatePane); form.dataset.closureForm = ''; form.noValidate = true;
        const fields = node('fieldset', undefined, form); fields.style.minWidth = '0'; fields.style.marginInline = '0';
        node('legend', uiLocale.message('البوابات السبع — تسجيل مانع أو عدم التقييم فقط'), fields);
        const rows = gateIds.map(id => {
          const saved = result.current?.gates.find(g => g.id === id), label = department.operatingCycle.closureGates.find(g => g.id === id)?.labelAr || id;
          const row = node('section', undefined, fields); row.dataset.closureGate = id; row.style.minWidth = '0';
          node('h6', label, row);
          const statusLabel = node('label', uiLocale.message('حالة البوابة'), row), state = node('select', undefined, statusLabel); uiLocale.setAttribute(state, "aria-label", "حالة {0}", [id]);
          for (const [value, title] of Object.entries(gateLabels)) { const option = node('option', uiLocale.message(title), state); option.value = value; }
          state.value = saved?.verificationStatus || 'NOT_ASSESSED';
          const noteLabel = node('label', uiLocale.message('الملاحظة أو سبب المانع (حتى 1000 حرف)'), row), note = node('textarea', undefined, noteLabel); uiLocale.setAttribute(note, "aria-label", "ملاحظة {0}", [id]); note.maxLength = 1000; note.rows = 3; note.value = saved?.note || '';
          const evidenceLabel = node('label', uiLocale.message('مراجع مستندات معروفة، اختياري: معرّف المستند ثم رقم الإصدار في كل سطر (حتى 3)'), row), evidence = node('textarea', undefined, evidenceLabel); uiLocale.setAttribute(evidence, "aria-label", "أدلة {0}", [id]); evidence.rows = 2; evidence.dir = 'ltr'; evidence.maxLength = 440; evidence.placeholder = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ١'; evidence.value = (saved?.evidence || []).map(e => e.documentId + ' ' + e.version).join('\n');
          for (const control of [state, note, evidence]) { control.style.maxWidth = '100%'; control.style.width = '100%'; control.style.boxSizing = 'border-box'; }
          return { id, label, state, note, evidence };
        });
        const previewButton = node('button', uiLocale.message('معاينة تقييم النواقص'), form); previewButton.type = 'submit'; previewButton.dataset.closurePreview = '';
        const previewPane = node('div', undefined, privatePane); previewPane.dataset.closurePlan = '';
        const invalidate = () => { editVersion++; plan = null; previewPane.replaceChildren(); if (!inFlight) uiLocale.setMessage(feedback, uiLocale.message('تغيّر التقييم؛ يلزم معاينة جديدة قبل التأكيد.')); };
        for (const event of ['input', 'change']) {
          form.addEventListener(event, e => { if (e.target.closest('[data-closure-gate]')) invalidate(); });
        }
        addDocumentPicker();
        function addDocumentPicker() {
          const picker = node('details');
          fields.insertBefore(picker, fields.querySelector('[data-closure-gate]'));
          node('summary', uiLocale.message('اختيار مستند من سجل الإدارة'), picker);
          const search = node('input', undefined, node('label', uiLocale.message('رقم المرجع أو اسم النموذج'), picker));
          search.type = 'search'; search.maxLength = 100;
          const searchButton = node('button', uiLocale.message('بحث في مستندات الإدارة'), picker); searchButton.type = 'button';
          const documents = node('select', undefined, node('label', uiLocale.message('المستند المحفوظ'), picker));
          const more = node('button', uiLocale.message('عرض مزيد من المستندات'), picker); more.type = 'button'; more.hidden = true;
          const gate = node('select', undefined, node('label', uiLocale.message('بوابة إرفاق الدليل'), picker));
          for (const row of rows) node('option', row.label, gate).value = row.id;
          const add = node('button', uiLocale.message('إضافة المرجع إلى البوابة'), picker); add.type = 'button';
          const message = node('p', '', picker); message.setAttribute('role', 'status');
          let requestId = 0, after = null;
          const choices = new Map();
          function reset() {
            requestId++; after = null; choices.clear(); documents.replaceChildren();
            node('option', uiLocale.message('اختر المستند'), documents).value = '';
            documents.disabled = true; add.disabled = true; more.hidden = true; searchButton.disabled = false; uiLocale.setMessage(message, '');
          }
          async function lookup(append) {
            if (!active() || inFlight) return;
            if (!append) reset();
            const ticket = ++requestId;
            const params = new URLSearchParams({ query: search.value.trim() });
            if (append && after) params.set('after', after);
            searchButton.disabled = true; more.disabled = true;
            uiLocale.setMessage(message, uiLocale.message('جارٍ البحث…'));
            try {
              const response = await auth().authorizedFetch(endpoint + '/documents?' + params);
              if (!active() || ticket !== requestId) return;
              if (response.status === 401 || response.status === 403) { fail(uiLocale.message('انتهت صلاحية قراءة أدلة الإدارة. أعد فتح التقييم.')); return; }
              const page = await response.json();
              if (!active() || ticket !== requestId) return;
              if (!response.ok || page?.organizationId !== result.organizationId || page.department !== department.code ||
                  !Array.isArray(page.documents) || page.documents.length > 25 ||
                  !page.documents.every(d => evidenceId(d?.id) && revision(d.version) && text(d.referenceNumber) && text(d.titleAr) && Number.isSafeInteger(d.pdfAttachmentCount) && d.pdfAttachmentCount >= 0) ||
                  !(page.nextCursor === null || (page.documents.length === 25 && page.nextCursor === page.documents.at(-1).id && page.nextCursor !== after))) {
                throw new Error();
              }
              for (const doc of page.documents) {
                if (choices.has(doc.id)) continue;
                choices.set(doc.id, doc);
                node('option', uiLocale.message("{0} · {1} · الإصدار {2} · مرفقات PDF {3}", [doc.referenceNumber, doc.titleAr, doc.version, doc.pdfAttachmentCount]), documents).value = doc.id;
              }
              after = page.nextCursor; more.hidden = after === null; documents.disabled = choices.size === 0;
              uiLocale.setMessage(message, (choices.size ? uiLocale.message("عدد المستندات المعروضة {0}", [choices.size]) : uiLocale.message('لا توجد مستندات مطابقة في هذه الإدارة.')));
            } catch {
              if (active() && ticket === requestId) uiLocale.setMessage(message, uiLocale.message('تعذر تحميل المستندات. أعد البحث أو أدخل المرجع يدويًا.'));
            } finally {
              if (active() && ticket === requestId) { searchButton.disabled = false; more.disabled = false; }
            }
          }
          search.addEventListener('input', reset);
          search.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); void lookup(false); } });
          searchButton.addEventListener('click', () => void lookup(false));
          more.addEventListener('click', () => void lookup(true));
          documents.addEventListener('change', () => { add.disabled = !choices.has(documents.value); });
          add.addEventListener('click', () => {
            const doc = choices.get(documents.value), row = rows.find(candidate => candidate.id === gate.value);
            if (!active() || inFlight || !doc || !row) return;
            const lines = row.evidence.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            if (lines.some(line => evidenceKey(line.split(/\s+/)[0]) === evidenceKey(doc.id))) { uiLocale.setMessage(message, uiLocale.message('هذا المستند مضاف إلى البوابة.')); return; }
            if (lines.length >= 3) { uiLocale.setMessage(message, uiLocale.message('يمكن إضافة ثلاثة مراجع لكل بوابة.')); return; }
            row.evidence.value = [...lines, doc.id + ' ' + doc.version].join('\n');
            row.evidence.dispatchEvent(new Event('input', { bubbles: true }));
            uiLocale.setMessage(message, uiLocale.message("أضيف المرجع إلى {0}.", [row.label]));
          });
          reset();
        }
        const setBusy = value => { inFlight = value; working = value; fields.disabled = value; previewButton.disabled = value; openButton.disabled = value; };
        function input() {
          return { expectedRevision: result.expectedRevision, specificationVersion: result.specificationVersion, gates: rows.map(row => {
            const note = row.note.value.trim(), verificationStatus = row.state.value;
            if (!Object.hasOwn(gateLabels, verificationStatus) || note.length > 1000 || verificationStatus === 'BLOCKED' && note.length < 5) throw localError(uiLocale.message('أدخل سببًا واضحًا من 5 إلى 1000 حرف لكل مانع.'));
            const lines = row.evidence.value.trim() ? row.evidence.value.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];
            if (lines.length > 3) throw localError(uiLocale.message('استخدم ثلاثة مراجع مستندات كحد أقصى لكل بوابة.'));
            const evidence = lines.map(line => {
              const parts = line.split(/\s+/), version = evidenceRevision(parts[1]);
              if (parts.length !== 2 || !evidenceId(parts[0]) || version === null) throw localError(uiLocale.message('مرجع الدليل: معرّف مستند صالح ثم رقم إصدار صحيح في كل سطر.'));
              return { documentId: evidenceKey(parts[0]), version };
            });
            if (new Set(evidence.map(e => evidenceKey(e.documentId))).size !== evidence.length) throw localError(uiLocale.message('لا تكرر مرجع المستند داخل البوابة.'));
            return { id: row.id, verificationStatus, note, evidence };
          }) };
        }
        const sameDraft = (a, b) => a.every(g => {
          const other = b.find(v => v.id === g.id);
          return other && g.verificationStatus === other.verificationStatus && g.note === other.note && g.evidence.length === other.evidence.length && g.evidence.every(e => other.evidence.some(v => evidenceKey(v.documentId) === evidenceKey(e.documentId) && v.version === e.version));
        });
        function fail(message) {
          if (!active()) return;
          assessmentGeneration++; plan = null; privatePane.replaceChildren(); working = false; openButton.disabled = false; uiLocale.setMessage(feedback, message);
        }
        form.addEventListener('submit', async event => {
          event.preventDefault(); if (!active() || inFlight) return;
          let draft; try { draft = input(); } catch (error) { plan = null; previewPane.replaceChildren(); uiLocale.setMessage(feedback, localErrorMessage(error)); return; }
          const version = editVersion; plan = null; previewPane.replaceChildren(); setBusy(true); uiLocale.setMessage(feedback, uiLocale.message('جارٍ معاينة التقييم والتحقق من المراجع…'));
          try {
            const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
            if (!allowed) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
          if (!active()) return;
            const response = await auth().authorizedFetch(endpoint + '/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
            const next = await response.json().catch(() => null);
            if (!active() || editVersion !== version) return;
            if (!response.ok) { fail((response.status === 403 ? uiLocale.message('تفاصيل التقييم متاحة للمالك المتحقق فقط.') : uiLocale.message('تعذرت المعاينة أو تغيّر المصدر. أعد قراءة التقييم قبل المحاولة.'))); return; }
            if (!next || next.schemaVersion !== 1 || next.policy !== assessmentPolicy || next.organizationId !== result.organizationId || next.department !== department.code || next.specificationVersion !== draft.specificationVersion || next.expectedRevision !== draft.expectedRevision || !validPrivateGates(next.gates) || !sameDraft(draft.gates, next.gates) || typeof next.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(next.expectedPlanHash) || !text(next.notice)) { fail(uiLocale.message('استجابة معاينة التقييم غير مكتملة؛ أعد القراءة.')); return; }
            plan = { draft, hash: next.expectedPlanHash, version };
            node('h6', uiLocale.message('معاينة فقط — لم يُحفظ التقييم'), previewPane); node('p', next.notice, previewPane);
            for (const gate of next.gates) {
              node('p', uiLocale.message("{0} · {1}{2}", [gate.id, (value=>value===undefined?value:uiLocale.message(value))(gateLabels[gate.verificationStatus]), (gate.note ? ' · ' + gate.note : '')]), previewPane);
              gate.evidence.forEach(e => node('p', uiLocale.message("{0} · الإصدار {1} · {2}{3}", [e.referenceNumber, e.version, e.contentHash, (e.pdfAttachmentCount ? uiLocale.message(" · مرفقات PDF {0}", [e.pdfAttachmentCount]) : '')]), previewPane));
            }
            const confirmLabel = node('label', undefined, previewPane), confirmed = node('input', undefined, confirmLabel); confirmLabel.className = 'hl-staff-ack'; confirmed.type = 'checkbox'; confirmed.dataset.closureConfirmed = '';
            confirmLabel.appendChild(document.createTextNode(uiLocale.t(' راجعت النواقص والمراجع؛ هذا الحفظ ليس قبولًا أو اعتمادًا أو إقفالًا.')));
            const save = node('button', uiLocale.message('تأكيد حفظ تقييم النواقص'), previewPane); save.type = 'button'; save.disabled = true; save.dataset.closureSave = '';
            confirmed.addEventListener('change', () => { save.disabled = !confirmed.checked || inFlight || !plan; });
            save.addEventListener('click', async () => {
              if (!active() || inFlight || !plan || !confirmed.checked || plan.version !== editVersion) return;
              const confirmedPlan = plan; plan = null; save.disabled = true; confirmed.disabled = true; setBusy(true); uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ التقييم…'));
              try {
                const authorized = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: active });
                if (!authorized) { if (generation === g && auth()?.getSessionVersion?.() === session) clear(); return; }
                if (!active()) return;
                const response = await auth().authorizedFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...confirmedPlan.draft, expectedPlanHash: confirmedPlan.hash, confirmed: true }) });
                const saved = await response.json().catch(() => null);
                if (!active()) return;
                if (!response.ok || !validAssessment(saved, department.code) || saved.organizationId !== result.organizationId || saved.expectedRevision !== result.expectedRevision + 1 || !sameDraft(confirmedPlan.draft.gates, saved.current?.gates || [])) {
                  fail((response.status === 409 ? uiLocale.message('تغيّر التقييم أو المصدر؛ أعد القراءة. لم تُعَد المحاولة تلقائيًا.') : uiLocale.message('لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة.'))); return;
                }
                // The saved receipt is private. The public summary must be read
                // afresh rather than inferred from this owner-only write.
                uiLocale.setMessage(feedback, uiLocale.message("حُفظ تقييم النواقص بالإصدار {0}. ليس اعتمادًا أو إقفالًا. حدّث المراجع لقراءة الملخص الأحدث.", [saved.expectedRevision]));
                drawAssessment(saved, context);
              } catch { fail(uiLocale.message('لم يتأكد حفظ التقييم. أعد القراءة للتحقق قبل أي محاولة جديدة؛ لا إعادة تلقائية.')); }
              finally { if (active()) setBusy(false); }
            });
            uiLocale.setMessage(feedback, uiLocale.message('راجع المعاينة ثم أكد الحفظ بصورة مستقلة.'));
          } catch { fail(uiLocale.message('تعذرت معاينة التقييم. أعد القراءة قبل المحاولة.')); }
          finally { if (active()) setBusy(false); }
        });
      }
      openButton.addEventListener('click', () => void loadAssessment());
    }
    function renderCycle(department) {
      const cycle = department.operatingCycle;
      node('h5', uiLocale.message('دورة العمل والمستندات التشغيلية'), detail);
      node('p', uiLocale.message("نطاق الإقفال محدد من مسارات الإدارات السابقة. حالة تحقق إقفال الإدارة: {0}. حفظ تقييم النواقص ليس قبولًا أو اعتمادًا أو إقفالًا للإدارة.", [(value=>value===undefined?value:uiLocale.message(value))(assessmentLabels[cycle.closureAssessment])]), detail);
      if (cycle.closureRecord) node('p', uiLocale.message("مرجع التقييم: {0} · الإصدار {1} · {2}", [cycle.closureRecord.assessmentReference, cycle.closureRecord.revision, new Date(cycle.closureRecord.recordedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })]), detail);
      node('p', cycle.sharedEngineBoundaryAr, detail);
      for (const flow of cycle.cycles) {
        const item = node('article', undefined, detail);
        node('h6', flow.titleAr, item);
        const steps = node('ol', undefined, item);
        flow.stepsAr.forEach(step => node('li', step, steps));
      }
      node('h6', uiLocale.message('أدلة نتيجة الإجراء وإقفاله'), detail);
      const evidence = node('ul', undefined, detail);
      cycle.closureEvidenceAr.forEach(value => node('li', value, evidence));
      node('h6', uiLocale.message('النماذج المصدرية وحالتها المحفوظة'), detail);
      node('p', uiLocale.message("نماذج الإدارة في الكتالوج الحالي: {0}. الحالة المحفوظة تُقرأ من الجهة المحددة.", [cycle.templates.length]), detail);
      for (const template of cycle.templates) {
        const item = node('article', undefined, detail);
        item.dataset.referenceTemplate = template.code;
        node('h6', template.titleAr + ' · ' + template.code, item);
        const availability = { ACTIVE_VERSION_RECORDED: 'نسخة نشطة مسجلة', MULTIPLE_ACTIVE_VERSIONS: 'تعارض: أكثر من نسخة نشطة', NO_ACTIVE_VERSION_RECORDED: 'لم تظهر نسخة نشطة في الجهة المفحوصة', ORGANIZATION_NOT_RECORDED: 'الجهة الداخلية غير مسجلة' };
        node('p', ((value=>value===undefined?value:uiLocale.message(value))(availability[template.availability]) || uiLocale.message('تحتاج الحالة إلى مراجعة')), item);
        template.recordedVersions.forEach(v => node('p', uiLocale.message("الإصدار {0} · {1}", [v.version, (v.status === 'ACTIVE' ? uiLocale.message('نشط') : uiLocale.message('محفوظ سابقًا'))]), item));
      }
      const count = cycle.documentCounts.reduce((sum, row) => sum + row.count, 0);
      node('p', uiLocale.message("مستندات محفوظة مرتبطة بهذه الرموز في الجهة المفحوصة: {0}. العدد لا يقيس اكتمال الإجراء ولا يشمل السجلات المحفوظة في المجالات الأخرى.", [count]), detail);
      node('h6', uiLocale.message('شروط إقفال الإدارة'), detail);
      const gates = node('ul', undefined, detail);
      cycle.closureGates.forEach(gate => node('li', uiLocale.message("{0} — {1}", [gate.labelAr, (value=>value===undefined?value:uiLocale.message(value))(gateLabels[gate.verificationStatus])]), gates));
      renderAssessmentEditor(department);
      node('h5', uiLocale.message('مراجع الآيزو المرتبطة بنطاق المراجعة'), detail);
      node('p', uiLocale.message('يراجع النظام السعودي المنطبق أولًا، ثم الآيزو وWRSTC ثم إصدار برنامج الجهة التدريبية حيث تنطبق. بيانات الإصدار أدناه متحقق منها بتاريخها؛ قرار اعتماد كل معيار ومواده لكل إجراء يحتاج مرجعه المحفوظ. لا يُثبت هذا العرض شهادة آيزو أو توفر نسخة مرخصة.'), detail);
      for (const source of data.isoReferences.filter(s => department.isoReferenceIds.includes(s.id))) {
        const item = node('article', undefined, detail);
        node('h6', source.designation + ' · ' + source.titleAr, item);
        node('p', uiLocale.message("تاريخ التحقق من بيانات الناشر: {0}", [source.snapshotDate]), item);
        node('p', source.scopeAr, item);
        node('p', uiLocale.message('ربط الانطباق ومواد المعيار ومرجع قرار اعتماده: قيد المراجعة.'), item);
        link(item, uiLocale.message('بيانات الإصدار لدى ISO'), source.url);
      }
    }
    function renderSourceLinkEditor(department) {
      if (department.code !== 'SAFETY_COMPLIANCE_RISK') return;
      const section=node('section', undefined, detail);section.dataset.sourceLinks='';section.style.minWidth='0';section.style.overflowWrap='anywhere';
      node('h5', uiLocale.message('ربط مصفوفة المتطلبات بالضوابط'), section);
      node('p', uiLocale.message('يحفظ المالك ارتباط نسخة المصفوفة بضوابطها للمراجعة. الربط لا يعتمد المصادر أو الأدلة ولا يفعّل الإلزام أو يغيّر إعدادات التشغيل.'), section);
      const open=node('button', uiLocale.message('فتح ربط مصفوفة الضوابط (للمالك)'), section);open.type='button';open.dataset.sourceLinksOpen='';
      const feedback=node('p', '', section);feedback.setAttribute('role','status');feedback.dataset.sourceLinksStatus='';
      const pane=node('div', undefined, section);pane.dataset.sourceLinksPrivate='';
      const endpoint='/admin/operational-source-links',policy='OPERATIONAL_SOURCE_REVIEW_LINK_V1';
      const states=['UNLINKED','LINKED_FOR_REVIEW','STALE'],id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
      let busy=false,local=0;
      const validView=r=>r&&r.schemaVersion===1&&r.policy===policy&&r.canRecord===true&&r.canActivate===false&&id(r.organizationId)&&text(r.notice)&&Array.isArray(r.documents)&&r.documents.length<=50&&new Set(r.documents.map(d=>d.id)).size===r.documents.length&&r.documents.every(d=>id(d.id)&&revision(d.version)&&text(d.referenceNumber)&&['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED'].includes(d.status))&&Array.isArray(r.controls)&&r.controls.length<=29&&new Set(r.controls.map(c=>c.controlId)).size===r.controls.length&&r.controls.every(c=>text(c.controlId)&&states.includes(c.sourceReviewStatus));
      const dismiss=()=>{local++;busy=false;pane.replaceChildren();uiLocale.setMessage(feedback, '');open.disabled=false;};
      async function loadLinks(){
        if(!eligible()||busy)return;
        const g=generation,session=auth()?.getSessionVersion?.(),l=++local;
        const active=()=>current(g,session)&&local===l&&select.value===department.code&&section.isConnected;
        busy=true;open.disabled=true;pane.replaceChildren();uiLocale.setMessage(feedback, uiLocale.message('جارٍ قراءة مصفوفات المالك وروابطها…'));
        try{
          const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:active});if(!active())return;if(!allowed){clear();return;}
          const response=await auth().authorizedFetch(endpoint),result=await response.json().catch(()=>null);if(!active())return;
          if(response.status===401){clear();return;}if(response.status===403)throw localError(uiLocale.message('تفاصيل الربط وحفظه متاحة لمالك الجهة الداخلية المتحقق فقط.'));
          if(!response.ok||!validView(result))throw localError(uiLocale.message('تعذر قراءة بيانات الربط كاملة؛ أعد القراءة.'));
          drawLinks(result,{active,session});uiLocale.setMessage(feedback, uiLocale.message('تمت قراءة النسخ. اختر المصفوفة وراجع معاينة الربط قبل حفظه.'));
        }catch(error){if(active()){pane.replaceChildren();uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر قراءة الربط.')));}}
        finally{if(active()){busy=false;open.disabled=false;}}
      }
      function drawLinks(view,{active,session}){
        pane.replaceChildren();const close=node('button', uiLocale.message('إغلاق ربط المصفوفة'), pane);close.type='button';close.addEventListener('click',dismiss);
        node('p', view.notice, pane);
        node('p', uiLocale.message("الضوابط المرتبطة للمراجعة: {0} · الروابط المتقادمة: {1}", [view.controls.filter(c=>c.sourceReviewStatus==='LINKED_FOR_REVIEW').length, view.controls.filter(c=>c.sourceReviewStatus==='STALE').length]), pane);
        if(view.controls.every(c=>typeof c.policyRecordExists==='boolean'))node('p', uiLocale.message("مفاتيح الكتالوج دون سجل ضبط مستقل: {0}. يحفظ الربط للمراجعة دون إنشاء هذه السجلات أو تغيير التشغيل.", [view.controls.filter(c=>!c.policyRecordExists).length]), pane);
        const form=node('form', undefined, pane);form.dataset.sourceLinksForm='';
        const sourceLabel=node('label', uiLocale.message('نسخة مصفوفة التشغيل'), form),source=node('select', undefined, sourceLabel);uiLocale.setAttribute(source, "aria-label", 'نسخة مصفوفة التشغيل');source.style.maxWidth='100%';source.style.width='100%';source.style.boxSizing='border-box';
        const empty=node('option', uiLocale.message('اختر نسخة محفوظة'), source);empty.value='';
        for(const doc of view.documents){const option=node('option', uiLocale.message("{0} · الإصدار {1} · {2}", [doc.referenceNumber, doc.version, doc.status]), source);option.value=doc.id;}
        if(view.hasMoreDocuments)node('p', uiLocale.message('تعرض أحدث 50 نسخة غير مؤرشفة.'), form);
        const reasonLabel=node('label', uiLocale.message('سبب ربط المصفوفة'), form),reason=node('input', undefined, reasonLabel);reason.type='text';reason.maxLength=2000;uiLocale.setAttribute(reason, "aria-label", 'سبب ربط المصفوفة');reason.style.maxWidth='100%';
        const preview=node('button', uiLocale.message('معاينة ربط المصفوفة'), form);preview.type='button';preview.dataset.sourceLinksPreview='';
        const planPane=node('div', undefined, form);planPane.dataset.sourceLinksPlan='';
        const confirmationLabel=node('label', undefined, form),confirmation=node('input', undefined, confirmationLabel);confirmation.type='checkbox';uiLocale.setAttribute(confirmation, "aria-label", 'راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام');confirmationLabel.appendChild(document.createTextNode(uiLocale.t('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام')));
        const save=node('button', uiLocale.message('حفظ روابط المراجعة'), form);save.type='button';save.dataset.sourceLinksSave='';save.disabled=true;
        let plan=null,inFlight=false,edit=0;
        const invalidate=()=>{edit++;plan=null;confirmation.checked=false;save.disabled=true;planPane.replaceChildren();};
        source.addEventListener('change',invalidate);reason.addEventListener('input',invalidate);
        confirmation.addEventListener('change',()=>{save.disabled=!plan||!confirmation.checked||inFlight;});
        form.addEventListener('submit',e=>e.preventDefault());
        const input=()=>{const d=view.documents.find(d=>d.id===source.value);if(!d||reason.value.trim().length<5)throw localError(uiLocale.message('اختر نسخة وأدخل سببًا واضحًا من خمسة أحرف على الأقل.'));return {documentId:d.id,expectedDocumentVersion:d.version,reason:reason.value.trim()};};
        const validPlan=(r,body)=>r&&r.schemaVersion===1&&r.policy===policy&&r.organizationId===view.organizationId&&r.canActivate===false&&text(r.notice)&&r.source?.documentId===body.documentId&&r.source.version===body.expectedDocumentVersion&&text(r.source.referenceNumber)&&Array.isArray(r.rows)&&r.rows.length>0&&r.rows.length<=29&&new Set(r.rows.map(row=>row.controlId)).size===r.rows.length&&r.rows.every(row=>view.controls.some(c=>c.controlId===row.controlId)&&['requirement','applicability','responsibility','inspection','acceptance'].every(k=>text(row[k])))&&typeof r.expectedPlanHash==='string'&&/^[a-f0-9]{64}$/.test(r.expectedPlanHash);
        async function request(path,body){const allowed=await access()?.authorizeRole?.('admin',{sessionVersion:session,isCurrent:active});if(!active())return null;if(!allowed){clear();return null;}const response=await auth().authorizedFetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!active())return null;if(response.status===401){clear();return null;}if(!response.ok)throw localError((typeof data?.message==='string' ? data.message : uiLocale.message('تعذر حفظ الربط؛ أعد القراءة والمعاينة.')));return data;}
        preview.addEventListener('click',async()=>{
          if(!active()||inFlight)return;let body;try{body=input();}catch(error){uiLocale.setMessage(feedback, localErrorMessage(error));return;}
          invalidate();const e=edit;inFlight=true;preview.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ معاينة نسخة المصفوفة والضوابط الحالية…'));
          try{const result=await request(endpoint+'/preview',body);if(!active()||!result||edit!==e)return;if(!validPlan(result,body))throw localError(uiLocale.message('معاينة الربط غير متسقة؛ أعد القراءة.'));plan={body,...result};node('p', uiLocale.message("معاينة فقط · {0} · الإصدار {1} · عدد الضوابط {2}", [result.source.referenceNumber, result.source.version, result.rows.length]), planPane);const list=node('ul', undefined, planPane);for(const row of result.rows)node('li', row.controlId+' — '+row.requirement+' — '+row.applicability+' — '+row.acceptance, list);node('p', result.notice, planPane);uiLocale.setMessage(feedback, uiLocale.message('راجع النسخة والضوابط ثم أكد حفظ روابط المراجعة.'));
          }catch(error){if(active()){invalidate();uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذرت المعاينة.')));}}
          finally{if(active()){inFlight=false;preview.disabled=false;}}
        });
        save.addEventListener('click',async()=>{
          if(!active()||inFlight||!plan||!confirmation.checked)return;
          const selected=plan;inFlight=true;save.disabled=true;preview.disabled=true;source.disabled=true;reason.disabled=true;confirmation.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ روابط المراجعة دون اعتماد البنود…'));
          try{const result=await request(endpoint,{...selected.body,expectedPlanHash:selected.expectedPlanHash,confirmed:true});if(!active()||!result)return;if(result.schemaVersion!==1||result.policy!==policy||result.canActivate!==false||result.linkedControlCount!==selected.rows.length||result.source?.documentId!==selected.source.documentId||result.source.version!==selected.source.version||!text(result.reference)||!time(result.recordedAt))throw localError(uiLocale.message('نتيجة الحفظ غير مكتملة؛ أعد القراءة قبل أي محاولة أخرى.'));pane.replaceChildren();uiLocale.setMessage(feedback, uiLocale.message("تم حفظ روابط مراجعة {0} ضابطًا · {1} · {2} · الإصدار {3}. الاعتماد والإلزام ما زالا في مسارهما المستقل.", [result.linkedControlCount, result.reference, result.source.referenceNumber, result.source.version]));
          }catch(error){if(active()){pane.replaceChildren();uiLocale.setMessage(feedback, uiLocale.message("{0} أعد القراءة؛ لا تكرر تأكيد المعاينة القديمة.", [(localErrorMessage(error) || uiLocale.message('لم تتأكد نتيجة الحفظ.'))]));}}
          finally{if(active()){plan=null;inFlight=false;open.disabled=false;}}
        });
      }
      open.addEventListener('click',()=>void loadLinks());
    }
    function render() {
      assessmentGeneration++;
      detail.replaceChildren();
      const department = data?.departments.find(d => d.code === select.value);
      if (!department) return;
      node('h5', department.nameAr, detail);
      const documentsButton = node('button', uiLocale.message('إدارة مستندات هذه الإدارة والنواقص'), detail); documentsButton.type = 'button';
      documentsButton.addEventListener('click', async () => {
        if (!eligible()) return;
        const s = auth()?.getSessionVersion?.(), g = generation;
        const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: s, isCurrent: () => eligible() && generation === g });
        if (allowed && current(g, s)) window.HydrolandDocuments?.open?.({ department: department.code, internal: true });
      });
      node('p', (department.unitRecorded ? (department.unitActive ? uiLocale.message('الإدارة موجودة ومفعّلة في الهيكل الداخلي.') : uiLocale.message('الإدارة موجودة وغير مفعّلة حاليًا.')) : uiLocale.message('لم يظهر سجل للإدارة في الهيكل الداخلي.')), detail);
      node('p', uiLocale.message('تُراجع الصلاحية بحسب الدور والإجراء والمورد والإدارة والمركز والشروط وفترة التفويض. تبقى المراجعة القانونية لدى القانونية، وملكية الإجراء لدى الإدارة المختصة.'), detail);
      node('p', uiLocale.message('لاستكمال الربط: المصدر وإصداره، المادة أو المتطلب المعتمد، قابلية الانطباق، الإجراء والصلاحية، الدليل المتحقق منه، ومرجع الاعتماد.'), detail);
      renderCycle(department);
      renderSourceLinkEditor(department);
      const authorities = data.authorities.filter(a => department.authorityIds.includes(a.id));
      node('h5', uiLocale.message('الجهات والخدمات المرجعية'), detail);
      if (!authorities.length) node('p', uiLocale.message('مراجع هذه الإدارة واردة في السجل القانوني أدناه.'), detail);
      authorities.forEach(a => renderSource(a, detail));
      const sources = [...data.legalReferences.filter(r => department.legalReferenceIds.includes(r.id)), ...data.marineArchives.filter(r => department.marineArchiveIds.includes(r.id)), ...data.hrSources.filter(r => department.hrSourceIds.includes(r.id))];
      node('h5', uiLocale.message('المراجع المحفوظة'), detail);
      sources.forEach(s => renderSource(s, detail));
      if (!sources.length) node('p', uiLocale.message('استكمال نسخ المصادر وربط موادها ما زال مطلوبًا لهذه الإدارة.'), detail);
      node('h5', uiLocale.message('الضوابط المسجلة المرتبطة'), detail);
      if (!department.policies.length) node('p', uiLocale.message('لم تظهر ضوابط مسجلة ضمن التصنيفات المرتبطة بهذه الإدارة. هذا لا يثبت غياب إجراءاتها الأخرى.'), detail);
      for (const policy of department.policies) {
        const item = node('article', undefined, detail);
        node('h6', policy.labelAr, item);
        node('p', uiLocale.message("{0}.{1} · حالة الإعداد المسجلة: {2}", [policy.category, policy.ruleKey, (policy.state === 'ENABLED' ? uiLocale.message('مفعّل') : (policy.state === 'REVIEW' ? uiLocale.message('قيد المراجعة') : uiLocale.message('غير مفعّل')))]), item);
        const bindingLabels = {
          MANDATORY: 'سجل إلزام صالح عند القراءة؛ تفرضه الحماية بصرف النظر عن إعداد التعطيل.',
          NOT_APPLICABLE: 'سجل عدم انطباق صالح عند القراءة؛ لا يثبت إعفاءً من المتطلبات الأخرى.',
          REVIEW_REQUIRED: 'سجل الربط يتطلب مراجعة؛ القرار التشغيلي محجوب حتى معالجة المصدر والانطباق والاعتماد.',
          NOT_RECORDED: 'لم يسجل ربط بصيغة الإلزام الحالية لهذا الضابط.',
        };
        node('p', ((value=>value===undefined?value:uiLocale.message(value))(bindingLabels[policy.bindingStatus]) || uiLocale.message('لم ترد حالة ربط الإلزام في هذه القراءة؛ حدّث المراجع بعد اكتمال التحديث.')), item);
        const reviewLabels={LINKED_FOR_REVIEW:'نسخة مصفوفة مرتبطة للمراجعة؛ الربط لا يعتمد المصدر أو يفعّل الإلزام.',STALE:'ربط المصفوفة متقادم أو غير متسق؛ يلزم إعادة التحقق.',UNLINKED:'لم تربط نسخة مصفوفة بهذا الضابط للمراجعة.'};
        node('p', ((value=>value===undefined?value:uiLocale.message(value))(reviewLabels[policy.sourceReviewStatus]) || uiLocale.message('لم ترد حالة ربط المصفوفة في هذه القراءة.')), item);
        if (policy.legacyReferencesRecorded) node('p', uiLocale.message('مراجع بالصيغة السابقة مسجلة؛ لا تثبت وحدها إلزامًا نافذًا.'), item);
        node('p', (policy.referencesRecorded ? uiLocale.message('مراجع محفوظة؛ صلاحية سجل الربط لا تثبت صحة الوثائق أو جاهزية رحلة بعينها.') : uiLocale.message('ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل في السجل المفحوص.')), item);
      }
      if (department.code === 'HR') {
        node('h5', uiLocale.message('مصفوفة ضوابط الموارد البشرية للمراجعة'), detail);
        for (const control of data.hrControlCandidates) {
          const item = node('article', undefined, detail);
          node('h6', control.labelAr + ' · ' + control.ruleKey, item);
          node('p', uiLocale.message("مصادر الحزمة: {0}", [control.sourceIds.join('، ')]), item);
          node('p', uiLocale.message("مواد مرشحة للمراجعة: {0}", [control.clauseReferences.join('، ')]), item);
          const list = node('ul', undefined, item);
          control.evidenceSpecification.forEach(value => node('li', value, list));
          node('p', control.limitations, item);
          node('p', uiLocale.message('لم يُثبت متطلب معتمد أو دليل فعلي أو اعتماد قانوني في هذه الحزمة.'), item);
        }
        const button = node('button', uiLocale.message('فتح مسار مراجعة ضوابط الموارد البشرية'), detail); button.type = 'button';
        button.addEventListener('click', () => { if (!eligible()) return; const target = host.querySelector('[data-hr-control-review]'); if (target) { target.open = true; target.scrollIntoView({ block: 'start' }); } });
      }
    }
    async function load() {
      if (!eligible() || busy) return;
      const g = ++generation, session = auth()?.getSessionVersion?.(), chosen = select.value;
      assessmentGeneration++; busy = true; data = null; detail.replaceChildren(); select.disabled = true; refresh.disabled = true; uiLocale.setMessage(status, uiLocale.message('جارٍ قراءة المراجع وحالة ربطها…'));
      try {
        const allowed = await access()?.authorizeRole?.('admin', { sessionVersion: session, isCurrent: () => g === generation && !host.hidden && box.open });
        if (!allowed || !current(g, session)) { if (g === generation) clear(); return; }
        const response = await auth().authorizedFetch('/admin/department-references');
        const result = await response.json().catch(() => null);
        if (!current(g, session)) return;
        if ([401, 403].includes(response.status)) { clear(); await access()?.authorizeRole?.('admin'); return; }
        if (!response.ok) throw localError((typeof result?.message === 'string' ? result.message : uiLocale.message('تعذر تحميل مراجع الإدارات.')));
        const arrays = ['departments', 'authorities', 'legalReferences', 'marineArchives', 'hrSources', 'hrControlCandidates', 'isoReferences'];
        if (result?.referenceOnly !== true || result.canActivate !== false || result.canonicalDepartmentCount !== 14 || !arrays.every(k => Array.isArray(result[k])) || result.departments.length !== 14 || new Set(result.departments.map(d => d.code)).size !== 14 || !Number.isFinite(Date.parse(result.observedAt))) throw localError(uiLocale.message('استجابة مراجع الإدارات غير مكتملة.'));
        if (result.completeDocumentInventoryVerified !== false || !result.departments.every(d => validSummary(d.operatingCycle) && ['cycles', 'templates', 'closureEvidenceAr', 'closureGates', 'documentCounts'].every(k => Array.isArray(d.operatingCycle[k])) && Array.isArray(d.isoReferenceIds))) throw localError(uiLocale.message('استجابة دورة الإدارة غير مكتملة.'));
        if (result.bindingSummary !== undefined) {
          const b = result.bindingSummary, keys = ['legacyReferences','currentBindings','mandatoryBindings','notApplicableBindings','reviewRequiredBindings','unrecordedBindings'];
          if (!b || b.schemaVersion !== 1 || !Number.isSafeInteger(result.effectivePolicyCount) || !keys.every(k => Number.isSafeInteger(b[k]) && b[k] >= 0 && b[k] <= result.effectivePolicyCount) || b.currentBindings !== b.mandatoryBindings + b.notApplicableBindings || b.currentBindings + b.reviewRequiredBindings + b.unrecordedBindings !== result.effectivePolicyCount || !result.departments.every(d => Array.isArray(d.policies) && d.policies.every(p => ['MANDATORY','NOT_APPLICABLE','REVIEW_REQUIRED','NOT_RECORDED'].includes(p.bindingStatus) && typeof p.legacyReferencesRecorded === 'boolean'))) throw localError(uiLocale.message('استجابة حالات ربط المراجع غير مكتملة.'));
        }
        if(result.sourceReviewSummary!==undefined){const s=result.sourceReviewSummary;if(!s||s.schemaVersion!==1||!['linkedForReview','staleLinks','unlinked'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.linkedForReview+s.staleLinks+s.unlinked!==result.effectivePolicyCount||!result.departments.every(d=>d.policies.every(p=>['UNLINKED','LINKED_FOR_REVIEW','STALE'].includes(p.sourceReviewStatus))))throw localError(uiLocale.message('استجابة روابط المصفوفات غير مكتملة.'));}
        if(result.sourceReviewCatalogSummary!==undefined){const s=result.sourceReviewCatalogSummary;if(!s||s.schemaVersion!==1||s.total!==29||!['linkedForReview','staleLinks','unlinked','withoutPolicyRecord'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=29)||s.linkedForReview+s.staleLinks+s.unlinked!==29)throw localError(uiLocale.message('استجابة ربط كتالوج التشغيل غير مكتملة.'));}
        const templateCodes = result.departments.flatMap(d => d.operatingCycle.templates.map(t => t.code));
        if (!Number.isSafeInteger(result.canonicalSourceTemplateCount) || result.canonicalSourceTemplateCount !== templateCodes.length || new Set(templateCodes).size !== templateCodes.length) throw localError(uiLocale.message('استجابة نماذج الإدارات غير مكتملة.'));
        data = result; select.replaceChildren();
        for (const department of data.departments) { const option = node('option', department.nameAr, select); option.value = department.code; }
        if (data.departments.some(d => d.code === chosen)) select.value = chosen;
        render();
        uiLocale.setMessage(status, uiLocale.message("وقت القراءة: {0} · إدارات مسجلة: {1} من 14 · نماذج الكتالوج: {2} · الضوابط: {3} · ذات مراجع مسجلة: {4}. بعض الضوابط مشتركة بين الإدارات. حالة المصادر تعكس تاريخ لقطة السجل.", [new Date(data.observedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }), data.recordedDepartmentCount, data.canonicalSourceTemplateCount, data.effectivePolicyCount, data.policiesWithRecordedReferences]));
        status.textContent += data.bindingSummary ? uiLocale.format(" مراجع بالصيغة السابقة: {0} · سجلات إلزام صالحة: {1} · سجلات عدم انطباق صالحة: {2} · روابط تحتاج مراجعة: {3} · بلا ربط بصيغة الإلزام الحالية: {4}. صلاحية الربط هي نتيجة فحص السجل عند القراءة، وليست تحققًا من الوثيقة الرسمية.", [data.bindingSummary.legacyReferences, data.bindingSummary.mandatoryBindings, data.bindingSummary.notApplicableBindings, data.bindingSummary.reviewRequiredBindings, data.bindingSummary.unrecordedBindings]) : uiLocale.t(' لم تقس حالة ربط الإلزام في هذه القراءة؛ العداد السابق وحده لا يحددها.');
        if(data.sourceReviewSummary)status.textContent+=uiLocale.format(" سجلات ضبط مخزنة مرتبطة بالمراجعة: {0} · روابط متقادمة: {1} · بلا ربط مصفوفة: {2}.", [data.sourceReviewSummary.linkedForReview, data.sourceReviewSummary.staleLinks, data.sourceReviewSummary.unlinked]);
        if(data.sourceReviewCatalogSummary){const s=data.sourceReviewCatalogSummary;status.textContent+=uiLocale.format(" كتالوج التشغيل: {0} من {1} مرتبط للمراجعة · متقادم: {2} · بلا ربط: {3} · مفاتيح دون سجل ضبط مستقل: {4}. الربط لا ينشئ سجلات ضبط ولا يغيّر التشغيل.", [s.linkedForReview, s.total, s.staleLinks, s.unlinked, s.withoutPolicyRecord]);}
      } catch (error) {
        if (current(g, session)) { data = null; detail.replaceChildren(); select.replaceChildren(); uiLocale.setMessage(status, (localErrorMessage(error) || uiLocale.message('تعذر تحميل المراجع.'))); }
      } finally {
        if (current(g, session)) { busy = false; refresh.disabled = false; select.disabled = !data; }
      }
    }
    select.addEventListener('change', render);
    refresh.addEventListener('click', () => void load());
    box.addEventListener('toggle', () => { if (box.open) void load(); else clear(); });
    document.addEventListener('hydroland:workspace-selected', event => { if (event.detail?.target !== host) clear(); });
    for (const event of ['hydroland:session-cleared', 'hydroland:portal-cleared', 'hydroland:role-changed']) document.addEventListener(event, clear);
    // A newly authenticated session may belong to another owner even when the
    // portal remains on the same ADMIN role. Never retain private notes across it.
    document.addEventListener('hydroland:auth-changed', clear);
    window.addEventListener('popstate', clear);
    window.HydrolandDepartmentReferences = Object.freeze({ reload: load });
    return true;
  };
  if (!mount()) { const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); }
})();
