# HYDROLAND — مراجعة السياق ونقطة الاستئناف

تاريخ المراجعة: 28 سبتمبر 2026. خط الأساس المفحوص: `main` عند `d309c1b9fdb4458bd577903fc4cd29a4e383597a`.

## القرارات الحاكمة

- سبق اعتماد المرحلة الأولى، ثم طلب سلطان صراحة إعادة تدقيقها وتصحيح الفروقات مع المرجع في 28 سبتمبر. التدقيق كشف فروقًا فعلية في الشعار والثيم الافتراضي وزوايا الأزرار؛ تصحيحها مصرح به، والإغلاق البصري النهائي ينتظر مراجعة النتيجة.
- الصور الست التي أعاد سلطان إرسالها هي المرجع البصري لكل البوابات. تطابق اللون وحده لا يحقق القبول؛ توزيع المكونات والصور والأحجام والوظائف جزء من المطابقة.
- التنفيذ على المعمارية القائمة، بواجهة واحدة لكل قدرة، ومن دون مسارات بيانات أو صلاحيات موازية.
- التسميات المعتمدة: «محترفي الغوص» و«الوساطة البحرية».
- الصيانة والخدمات الفنية وقطع الغيار داخل الوساطة البحرية، وليست بوابات جديدة.
- لا انتقال إلى مرحلة تصميم لاحقة قبل قبول الحالية بصريًا ووظيفيًا.

## مراجعة الدردشات الخمس

المصادر المتاحة تشمل مقتطفات المحادثات وملخصاتها، وليست تصديرًا حرفيًا كاملًا لكل رسالة. قورنت ادعاءات الإغلاق بحالة المستودع وRender مباشرة. عناوين السياق التي تمت مراجعتها:

| الدردشة | ما يحكم الاستئناف |
| --- | --- |
| مراجعة وتلخيص المشروع — 28 سبتمبر | خطة التصميم 1–8؛ إغلاق #354 ثم دمج #355، وكان المتبقي CI على main والتحقق من Render. |
| متابعة بوابات HYDROLAND — 26–28 سبتمبر | سبع بوابات حسب الدور، الفصل بين الزائر والحسابات، التصاميم المرسلة ملزمة، والتحقق الفعلي من الواجهات. |
| فحص المشروع وتقرير الإنجاز — 26 سبتمبر | الوجود البرمجي لا يساوي جاهزية الإطلاق؛ يلزم دليل للبيانات والتشغيل والتكاملات. |
| تلخيص مقارنة وتقرير last five chats — 26 سبتمبر | إغلاق مرحلي سابق لا يتغلب على فشل لاحق؛ لا نعيد استخدام نسب إنجاز غير مثبتة. |
| واصل من آخر نقطة — 26 سبتمبر | مراحل الإغلاق التشغيلي القديمة، الطقس والخرائط والتكاملات؛ لا تخلط أرقامها مع خطة التصميم الحالية. |

التكاملات الخارجية والبريد مؤجلان وفق تعليمات السياق الأحدث. التأجيل لا يساوي الجاهزية الإنتاجية ولا يرفع شروط السلامة والدفع.

## ما تحقق مباشرة في هذه المراجعة

- #355 مدمج عند `d309c1b9fdb4458bd577903fc4cd29a4e383597a`.
- نجحت بوابات الدفع إلى main الثماني: API، Web، Security، Release Candidate، Production Release، Stage 3 Integrity، Stage 3 Technical Closure، Production Uptime.
- نشر الويب `dep-dat3ue8473hc738dg9b0` بحالة Live على الالتزام نفسه.
- API منشورة على `05b7dbfa34c8b1fc03309718738c7c6081dc744e`. المقارنة حتى `d309c1b9` لا تتضمن تغييرات API؛ اختلاف SHA هنا لا يثبت تأخر كود الخلفية.
- الواجهة العامة تُعرض في الإنتاج، لكن واجهة البداية طويلة جدًا مقارنة بالمرجع، والبطاقات موزعة أسفلها في صفوف مكررة.
- فشل فك الصورة بالكامل لملفي `red-sea-hero.png` و`summer-island-trip.png`. الصورة `hydroland-hero-v2.webp` صالحة؛ تستخدمها معالجة المرحلة الثانية بدل الاعتماد على الصورتين التالفتين في عرض الزائر.

## المعمارية الحالية وحدودها

الطبقات المعتمدة: Web وMobile → API تحت `/api/v1` → خدمات المجالات والصلاحيات → Prisma وقاعدة البيانات. المزودون عبر Integration Hub/Adapters. تاريخ الترحيلات محفوظ؛ لا تغيير قاعدة بيانات في عمل التصميم الحالي.

البوابات السبع: الزائر، الغواص، محترفي الغوص، مراكز الغوص، الوساطة البحرية، الشركات والجهات الحكومية، الإدارة. لا تُمنح صلاحية بمجرد ظهور رابط؛ تفويض الخادم هو الحاكم.

| الإدارة | حدود الملكية المعتمدة ومسار التنفيذ |
| --- | --- |
| الموارد البشرية | العاملون والتوظيف والعقود الوظيفية؛ `hr` و`governance`. |
| التدريب | الدورات والتسجيل والمهارات والجلسات؛ `governance/training-*`. |
| الرحلات والعمليات البحرية | الرحلات والحجز والطاقم والسجل والأسطول؛ `trips` و`marine-operations` و`dive-logs`. |
| المخزون والمستودعات واللوجستيات والمشتريات | المخزون والتأجير والموردون، مع رقابة المالية والعقود؛ `inventory`. |
| المالية | الحسابات والمدفوعات والميزانية والمستحقات؛ `finance` و`payments` و`store` و`wallet` و`rewards`. |
| السلامة والامتثال والمخاطر | القرار التشغيلي والحوادث والجاهزية؛ `safety` وضوابط الرحلات. |
| خدمة العملاء وتجربتهم | التذاكر والتفاعلات والشكاوى؛ `customer-service`. |
| التسويق والعلامة والنمو | الحملات والمحتوى؛ `marketing`. |
| التقنية والأنظمة والأمن السيبراني | تشغيل التقنية والتكاملات والوكلاء؛ `technology-security` و`integrations` و`agents`. |
| المرافق والأصول والصيانة | الأصول وأوامر العمل والصيانة؛ `facilities-maintenance`، مع الأصول البحرية في مجالها. |
| الشؤون الإدارية والسجلات | المراسلات والاجتماعات والسجلات والوثائق؛ `administrative-affairs` و`document-forms`. |
| الإدارة العليا والحوكمة | التفويض والاعتماد والقرارات والسياسات؛ `executive-governance` و`governance`. |
| البحث والتطوير وتحليل السوق | الأبحاث والفرص والتجارب؛ `research-market`، مستقل عن تنفيذ الحملات. |
| القانونية والعقود والتأمين | المراجعة القانونية والالتزامات؛ `legal-governance`، مستقل عن قرار السلامة التشغيلي. |

هذه خريطة ملكية وتنفيذ، وليست إقرارًا بأن كل خدمة مكتملة أو مكشوفة عبر API. يبقى التحقق الوظيفي لكل بوابة ضمن مرحلتها.

مكتب الإدارة العليا المعتمد يضم سكرتيرًا تنفيذيًا ومسؤول متابعة داخلية ومساعد Executive AI. ظهر `EXECUTIVE_SECRETARY` في نموذج القيادة، لكن لم تُثبت هذه المراجعة تنفيذ الدور الثاني أو دورة Executive Office Engine كاملة؛ يُحفظ ذلك كبند تحقق للمرحلة السادسة، ولا يُعتبر مغلقًا بمجرد وجود `ExecutiveGovernanceModule`.

## خطة التصميم الحالية

| المرحلة | الحالة |
| --- | --- |
| 1 — الهوية ونظام التصميم | إعادة تدقيق بطلب المستخدم؛ تصحيح أخطاء مثبتة ضمن #356، مع بقاء قبول المطابقة البصرية مفتوحًا. |
| 2 — الواجهات العامة | العمل الحالي؛ الأساس مدمج ومنشور، المطابقة البصرية النهائية مفتوحة. |
| 3 — الحساب والمصادقة | تلي قبول المرحلة 2؛ تُبنى على وظائف الحساب القائمة. |
| 4 — بوابات الغوص | تلي المرحلة 3. |
| 5 — مقدمو الخدمات البحرية | تلي المرحلة 4. |
| 6 — الشركات والإدارة | تلي المرحلة 5، وتشمل تحقق مكتب الإدارة العليا. |
| 7 — التدقيق البصري الشامل | تلي اكتمال الواجهات السابقة. |
| 8 — الإغلاق النهائي | اختبارات فعلية وCI ودمج ونشر وفحص إنتاجي. |

## دفعة التصحيح الحالية للمرحلة 2

- تقليل ارتفاع الواجهة الرئيسية وتقريب ترتيبها من المرجع، وإظهار مسارات الرحلات والتدريب والحساب مباشرة بعدها.
- نقل نموذج البحث الواحد إلى رأس واجهة الزائر، وإعادته لموضعه عند الانتقال للحساب، مع إجراء مستقل لإنشاء الحساب.
- تجميع ملخص المصادر البحرية والرحلات والخريطة في صف متجاور على الكمبيوتر، وتكديس واضح في الجوال.
- إزالة صف الاكتشاف المكرر، مع إبقاء التنقل ومسارات الحساب والأدوار تحت الضوابط الحالية.
- إضافة اختبارات متصفح لتموضع العناصر وعدم تجاوز العرض وفتح التدريب والتسجيل، وصور مراجعة من CI.

لا تدّعي هذه الدفعة مطابقة بصرية نهائية لكل البوابات. تبقى مراجعة النتيجة المرئية وقبول سلطان مطلوبين لإغلاق المرحلة 2.

### استكمال صفحات العرض والتفاصيل — PR #356

- تفعيل عرض مستقل داخل الواجهة القائمة للاستكشاف والرحلات والأنشطة والتدريب والمتجر، مع بقاء تنقل الحسابات وبوابات الأدوار كما هو.
- تفاصيل الرحلات والمنتجات عبر روابط قابلة للمشاركة، وإجراءاتها تستدعي مساري الحجز والسلة القائمين.
- فلاتر الرحلات حسب النوع وفلاتر المنتجات حسب المخزون تعمل على البيانات المحملة، وتبقى حالات عدم النشر وفشل الاتصال ظاهرة.
- لا يوجد كتالوج دورات عام في API الحالية؛ صفحات التدريب تعريف بالمسارات الموجودة، ولا تعرض مواعيد أو أسعارًا مفترضة ولا تنشئ تسجيلًا أو شراءً.
- زر الحجز في صفحة التفاصيل يستخدم سبب المنع نفسه المستخدم في بطاقة الرحلة؛ التسعير غير المعتمد يبقى مانعًا حتى لو كان قرار السلامة يسمح بالرحلة.
- تضاف اختبارات التنقل والتفاصيل والروابط المباشرة والرجوع والسلة وحالات الخطأ على المقاسات الثلاثة. لا تُعد نتيجة CI بديلًا عن اعتماد المطابقة البصرية.

### معالجة نتائج فحص الصور

- فحص الصور الأولى كشف أن قاعدة قديمة تجبر المتجر على عمودين في الجوال؛ عُولج التعارض وأضاف الاختبار قياسًا لعرض بطاقة المنتج.
- يبدأ الانتقال بين الصفحات العامة من رأس الصفحة كي يبقى عنوانها ومسار التنقل ظاهرين.
- ترتيب مسارات الرئيسية من اليمين: الحساب ثم التدريب ثم الرحلات. تعرض الرئيسية ملخصات مدمجة، وتبقى الأسعار والتوقيت والحجز في صفحة الرحلات وتفاصيلها.
- حالة الحجز ترتبط بمعرّف الرحلة قبل اللجوء إلى الاسم؛ يغطي الاختبار رحلتين بالاسم نفسه مع اختلاف اعتماد السعر.
- صور CI تستخدم بيانات اختبار، ولا تثبت وجود منتجات أو رحلات منشورة في الإنتاج.

### استكمال الرسومات والمطابقة — 28 سبتمبر

- إضافة خلفية محيط وصورة جزيرة مستوحاة من المرجع المعتمد، مولّدتين بالأداة المدمجة ومحفوظتين داخل أصول المشروع. الصور تعبيرية وليست توثيقًا لموقع رحلة بعينه.
- توحيد الأيقونات بملفات SVG مضمنة، وضبط أزرار الدخول والتسجيل والبحث ومسارات الرئيسية.
- تقريب صف الرحلات والخريطة والطقس والبطاقات السفلية والفوتر من توزيع المرجع على الكمبيوتر، مع حفظ التكديس على الجوال.
- المساعد الذكي يعرض حالة «قريبًا»؛ تبقى حالة مزودي الخرائط والطقس من النظام دون أرقام طقس أو جغرافيا مفترضة.
- شعار المرحلة الأولى وتوكنات الهوية والصلاحيات ومسارات الدفع لم تتغير. صور المتصفح والاعتماد البصري هما شرط إغلاق المرحلة، بعد CI.
- مصدر الأصول وتوجيهات إنشائها في `docs/PUBLIC_VISUAL_ASSETS.md`.

### إعادة تدقيق المرحلة الأولى وتصحيح الرئيسية

راجع `PHASE_1_VISUAL_AUDIT_2026_09_28.md` لأدلة الفروق والمعالجة وحدود الإغلاق. تشمل الدفعة الشعار، الألوان الفعلية للثيم الافتراضي، الخطوط المحلية، زوايا الأزرار، أصول الصور وتوزيع الرئيسية. خريطة المعاينة جغرافية مبسطة، ومؤشراتها من إحداثيات الرحلات الفعلية فقط. قراءات الطقس غير المتاحة تبقى فارغة بوضوح.

### متابعة تدقيق الصفحات العامة — 28 سبتمبر، بعد تدقيق الرئيسية

- كشفت صور المتصفح أن أزرار تفاصيل الرحلة تقع خارج الجزء المرئي في الجوال. أصبح رأس التفاصيل وشريط الإجراءات ثابتين داخل النافذة، مع تمرير مستقل للمحتوى يدعم لوحة المفاتيح والرجوع والإغلاق.
- إزالة تكرار عنوان المتجر ورابط العودة إلى الصفحة نفسها في قائمتي المتجر والرحلات؛ العنوان العام ومسار التنقل يكفيان. تبقى فلاتر المنتجات والسلة والأوامر القائمة.
- تقريب بطاقات الاستكشاف والدورات من الهوية البحرية المعتمدة باستخدام الأصول المحلية، ورفع عتامة خلفية الأنشطة وتباين مقدمة التدريب.
- إصلاح تعارض معالج التنقل القديم مع المعالج العام، وتزامن تمييز الصفحة النشطة في القائمتين الجانبية والسفلية وإضافة `aria-current`.
- تبسيط نص إنشاء الطلب مع التصريح بأن الدفع الإلكتروني غير متاح وأن الطلب لا يخصم مبلغًا؛ لا تغيير في منطق الطلب أو سجلات الدفع.
- توسعة فحص المتصفح لتغطية ظهور إجراءات التفاصيل، والمحتوى الطويل على شاشة 390×568، واستعادة تركيز لوحة المفاتيح. صور القوائم تغطي الصفحة كاملة؛ نتائج الفحص المحدثة تُسجل في PR #356 بعد تشغيل CI.

هذه متابعة للمرحلة الثانية. لا تتضمن دمجًا أو نشرًا ولا تغلق قبول المطابقة البصرية للمرحلتين الأولى والثانية.

## Superseding instruction — clean presentation rebuild

The user explicitly rejected adding patches to the old interface and requested rebuilding each interface from the six attached approved boards, while preserving the architectural and executive structure. This expands the earlier public-layout correction into all seven portal presentations. Phase completion still requires visual and functional review; previous percentage estimates do not certify this rebuild.

The presentation now has one design-token/control layer, one application shell, a public-page composition stylesheet, and portal compositions. Ten obsolete presentation/override stylesheets were removed. Existing feature controllers, backend APIs, active-role checks, refresh-before-action authorization, and payment/document boundaries remain authoritative. Public discovery is the initial anonymous screen; account entry opens a branded dialog. Recovery/verification links and explicit logout retain their existing authentication flows.

Portal home screens follow role-specific compositions: diver hero/profile summary/action cards/readiness; center masthead/operations/metrics/picture actions/resource panels; organization service requests/documents/approval workflow; admin command summary/actions/integrations/safety/approvals. Professional and brokerage portals use the same approved identity with their existing service structure because no independent board was supplied for them. Operational services open inside their workspace shell rather than appearing as an unstructured stack below every dashboard. Unimplemented services stay disabled or explicitly pending; no sample metrics or external safety/AI integrations are represented as live.

Browser verification includes all six authenticated portal layouts at desktop, tablet, and mobile sizes, plus public catalog/details, authentication, session expiry, portal revocation, and document workflows. This section records scope and implementation, not a production deployment or final visual approval.

## تحديث المسميات المعتمدة

بتوجيه المستخدم: واجهة `diver` باسم **هواة الغوص**، وواجهة `instructor` باسم **محترفي الغوص**، وواجهة `boat` باسم **الوسائط البحرية**. هذه المسميات تتقدم على أي تسمية سابقة في وثائق المتابعة. التعديل في العرض والقوائم فقط؛ معرفات الأدوار والصلاحيات ثابتة.

## خريطة المملكة والمراكز المبدئية

بتوجيه المستخدم أضيفت ثمانية مواقع تخطيطية: جازان، جزيرة فرسان، البرك وعمق في عسير، القنفذة، تبوك، أملج، ينبع. الإحداثيات تقريبية للمنطقة وليست عناوين منشآت قائمة. تُعرض كمراكز مخططة بلون ذهبي، منفصلة عن إحداثيات الرحلات المنشورة بلون سماوي، ولا تُنشئ حسابات أو تراخيص أو حجوزات أو سجلات Organization. تعيين عنوان كل مركز وربطه بسجله الفعلي ما زال مطلوبًا؛ نموذج Organization الحالي لا يملك حقول إحداثيات.

الخريطة المحلية الجغرافية تدعم التكبير والتحريك واختيار العلامات بلوحة المفاتيح، وتبقى متاحة عند غياب مزود الخرائط أو تعذّر تحميله. المصدر الأساسي للمواقع التشغيلية يظل `/trips`، وإعداد المزود `/integrations/maps/public-config`، بلا تغيير ملكية القدرات أو الصلاحيات. أضيف اختبار لحالة تعطل المزود مع مراكز تخطيطية غير قابلة للحجز. البناء والفحص الساكن ناجحان؛ اختبار المتصفح المحلي تعذر لغياب Chromium، وتنتظر النتيجة في CI. لا تمثل هذه الدفعة إغلاق تدقيق المعمارية الشامل أو قبول المطابقة البصرية أو نشرًا.

### مرجع الخريطة الجديد IMG_9882

توجيه المستخدم: اعتماد أسلوب الخريطة المضيئة المرفقة. أضيفت حدود المناطق الـ13 من geoBoundaries مع نسب المصدر والترخيص، وأسماء المناطق الصحيحة، والحدود الذهبية والخلفية الكحلية والسواحل السماوية. بيانات الحدود مرجعها 2017 وليست اعتمادًا رسميًا حاليًا. أصلح ارتفاع خريطة الكمبيوتر لتبقى مرئية داخل النافذة، ونقلت بطاقة التفاصيل أسفل أزرار التكبير. عُدلت اختبارات الرحلات لتعد العلامات التشغيلية وحدها بدل خلطها بالمراكز التخطيطية الثمانية. مراجعة الصور الجديدة لازمة قبل قبول المطابقة.

### مراجعة لقطات الخريطة والتحقق

نجحت بوابات CI الثماني والاختبارات الـ68 على `c7b82f10d47b26dcf9fc8342fc6383f2e7edd523` (Web run 36463663159). مراجعة صور الكمبيوتر والجوال أكدت إصلاح اقتصاص الخريطة. وجدت أن بطاقة تفاصيل المركز تغطي الخريطة، فنُقلت إلى قائمة المواقع، وأصبح زر المملكة يمسح الاختيار ويعيد القائمة إلى الأعلى. الفحص الساكن والبناء ناجحان للتعديل اللاحق؛ نتيجة CI لهذا التعديل تُراجع منفصلة. لم يحصل دمج أو نشر أو اعتماد نهائي للمطابقة.

### تقريب الخريطة إلى المرجع — التفاصيل والعمق

أضيفت رسوم SVG زخرفية للمعالم والشعاب والأسماك والغواص، مع زيادة عمق الحافة والتوهج. هذه رموز بصرية وليست مواقع تشغيلية جديدة أو بيانات بيئية. المشهد التفاعلي يستخدم تحويلًا مائلًا واحدًا للخريطة والعلامات مع تحويل مركز التكبير بنفس المعادلة. صغرت العلامات، وأضيفت أسماء المراكز المخططة بخطوط إشارة منفصلة لتخفيف التزاحم؛ تختفي التسميات الجانبية عند التكبير. المعمارية ومصادر الرحلات والأدوار ثابتة. نجاح الفحص الساكن والبناء لا يغني عن مراجعة اللقطات الجديدة ولا يرفع نسبة المطابقة تلقائيًا.

## أولوية الواجهات الرئيسية — الخرائط مؤجلة

وجّه المستخدم بإنهاء الواجهات الرئيسية أولًا وتأجيل الخرائط إلى آخر العمل. هذه الدفعة لا تعدّل الخرائط. تمت مقارنة الزائر وهواة الغوص والشركات باللوحات المعتمدة: تكبير الشعار في القوائم، تعديل نصوص وصور مسارات الزائر، زر أزرق لهواة الغوص، بطاقات مؤشرات بخلفيات بحرية وأيقونات دائرية، إزالة الأيقونات الكبيرة التي تحجب صور الإجراءات، وإطارات مستقلة للجاهزية. صحح تمييز الرئيسية النشط عند دخول هواة الغوص. بطاقات المؤشرات المشتركة اكتسبت الخلفية البحرية، وأصبحت إجراءات الشركات صفًا واحدًا على الكمبيوتر بنفس نمط مرجعها مع استجابة للتابلت والجوال. معرفات الخدمات والصلاحيات والأرقام الفعلية لم تتغير. الفحص الساكن والبناء ناجحان؛ الصور واختبارات المتصفح للالتزام الجديد مطلوبة قبل القبول. بقية الفروق في الواجهات ما زالت ضمن العمل، ولا تمثل هذه الدفعة إغلاقها كلها.

### Main interface visual review follow-up
- Commit a1e057d passed all eight CI workflows, including browser E2E and desktop/tablet/mobile screenshot generation (Web run 36470540133).
- Inspected actual diver/organization desktop and public mobile screenshots. The diver blue CTA, framed readiness tiles and organization ten-action desktop row render correctly.
- Follow-up: show the actual member name and initial in the existing diver account button, preserving its account/wallet handlers; clear the identity presentation when leaving the role or signing out. Remove header blur to expose the marine scene. Vary metric backgrounds using existing marine/equipment assets and improve readiness caption contrast.
- Preserve requested terminology: محترفي الغوص.
- Static validation and production build passed. This is not visual closure: organization hero artwork and other portal-specific differences still require review; maps remain deferred. No merge or production deployment.

### Phase 2 public catalog identity pass
- Scope is the original Stage 2 public pages: home, explore, trips, activities, training, store and details; role portals belong to later stages, and map refinement remains deferred by request.
- Commit 036d157 passed all eight CI workflows.
- Reviewed actual explore/store/training desktop screenshots from the previous public artifact. Replaced repeated exploration artwork with service-specific existing marine assets and differentiated course/activity cards; kept the shared palette, type, borders and layout.
- Product cards explicitly identify missing product photography rather than showing unrelated catalog imagery.
- Static web/design-system checks and production build pass. Full visual approval and merge/deployment remain outstanding; no phase closure claimed.

### Phase 2 mobile detail review
- Web CI run 36472137671 succeeded for 29d60c0; reviewed its actual desktop exploration and mobile training/detail images.
- Mobile trip-detail screenshot clips the top of the dialog despite preceding visibility assertions. Explicitly anchor the detail dialog to the viewport (fixed/inset/margin auto) and check complete dialog bounds plus both controls before and after screenshot capture. This regression remains under verification until the next CI run and image review.

### Public home reference controls
- 75e917c passed all eight CI workflows. The new mobile trip-detail image shows the close button fully visible; the viewport-bound regression checks passed.
- Match reference home controls: illuminated blue selected sidebar entry, light inactive icons, dark gold-outlined registration button, luminous hero CTA borders, and assistant artwork on the right at desktop size. Mobile assistant arrangement remains responsive.
- Marked the old FINAL_VISUAL_QA checklist as historical because its light visitor treatment and marine-portal label contradict the latest approved references and user instructions.
- Maps deferred. No merge or deployment. Visual matching is still under review; no closure or percentage claimed.
