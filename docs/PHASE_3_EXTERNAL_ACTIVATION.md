# المرحلة الثالثة — ربط دخول Google ومستندات الحساب

## النتيجة التقنية

كان فحص `/health/integrations/object-storage` يختبر إعدادات تنزيل حزم الرحلات
عبر Cloudflare R2. رفع مستندات الحساب يستخدم محولًا مستقلًا بإعدادات
`HYDROLAND_OBJECT_STORAGE_*`؛ لذلك لا تثبت جاهزية R2 أن مستندات الحساب تعمل.

أصبح `/health/integrations/credential-storage` فحصًا مستقلًا محميًا بصلاحية
ADMIN، ويستخدم عقد الإعدادات نفسه الذي يقرأه محول الرفع الفعلي. يتضمن تقرير
الربط الفحصين، ويضيف `CREDENTIAL_STORAGE:PRODUCTION_NOT_READY` إذا لم تكتمل
إعدادات المستندات. جميع عناصر `checks` قيم منطقية؛ لا يعرض التقرير أسماء
الحاويات أو العناوين أو مفاتيح الوصول.

النتيجة فحص إعدادات محلية وليست إثبات اتصال بالمزود. يظل اختبار الرفع
والتنزيل الخاص والاستعادة على المزود الحقيقي شرطًا مستقلًا قبل الإغلاق.
`SANDBOX` يستخدم المزود الفعلي ولا يعطل شروط HTTPS والخصوصية والتشفير
والإصدارات عندما يعمل الخادم في بيئة production.

## مدخلات تخزين المستندات

أضيفت المفاتيح التالية إلى `render.yaml` بصيغة `sync: false` وإلى المثال
المحلي دون أسرار. لا يفعّل هذا التغيير مزودًا أو يؤكد حماية غير متحققة.

| المفتاح | المدخل المطلوب |
|---|---|
| `HYDROLAND_OBJECT_STORAGE_ENDPOINT` | عنوان HTTPS لمزود S3 متوافق، دون بيانات دخول أو query أو fragment |
| `HYDROLAND_OBJECT_STORAGE_BUCKET` | حاوية مستندات خاصة |
| `HYDROLAND_OBJECT_STORAGE_REGION` | منطقة التوقيع حسب المزود؛ الافتراضي الحالي us-east-1 |
| `HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID` | معرّف مفتاح محدود بالحاوية المطلوبة |
| `HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY` | السر، يُدخل عبر إعدادات Render الآمنة |
| `HYDROLAND_OBJECT_STORAGE_PRIVATE_ACCESS_CONFIRMED` | true بعد التحقق من حظر الوصول العام |
| `HYDROLAND_OBJECT_STORAGE_ENCRYPTION_CONFIRMED` | true بعد التحقق من التشفير في التخزين |
| `HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED` | true بعد التحقق من حفظ الإصدارات والاستعادة |

يبقى `HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS` غير تشغيلي حتى توفير
المدخلات والتحقق منها. ثم يمكن تفعيل SANDBOX لاختبار الربط الحقيقي، وترقية
الحالة إلى PRODUCTION_ENABLED بعد اكتمال التحقق. لا يُضبط أي تأكيد على true
لمجرد تجاوز الفحص.

إعدادات `CLOUDFLARE_R2_*` تخص محول تنزيل الحزم القائم. وثائق R2 الرسمية
بتاريخ المراجعة 2026-09-29 تدرج GetBucketVersioning وPutBucketVersioning
ضمن العمليات غير المدعومة؛ لا تُعامل إعدادات R2 وحدها كإثبات لشرط الإصدارات
المطلوب حاليًا لمستندات الحساب.

المصدر: https://developers.cloudflare.com/r2/api/s3/api/

## إعداد مقترح للتجربة: Backblaze B2

هذا اقتراح ربط، وليس حسابًا أُنشئ أو خدمة فُعّلت. روجعت وثائق المزود في
2026-09-29: أول 10 GB من التخزين مجانية، وصفحة التسجيل لا تطلب بطاقة دفع.
التنزيل المجاني له حد يبلغ ثلاثة أمثال متوسط التخزين الشهري؛ ما يزيد عليه
قد يكون مدفوعًا. تشمل السعة المستخدمة الإصدارات السابقة؛ لا تعني التجربة
تخزينًا أو تنزيلًا غير محدود. يبقى عنوان المنصة الحالي على Render كما هو.

لم يُظهر البحث في دليل الإضافات موصلًا مباشرًا لإدارة Backblaze أو عملاء
Google OAuth. لا يحل موصل Google Drive محل إعداد عميل دخول خاص بالمنصة.

### خطوة المالك

يفتح المالك [تسجيل Backblaze B2](https://www.backblaze.com/sign-up/cloud-storage)
أو يسجل دخوله إلى حساب قائم. إنشاء الحساب يتضمن التحقق من البريد واختيار
منطقة البيانات ومراجعة شروط الخدمة. يُنجز المالك هذه الخطوات في موقع المزود؛
لا تُرسل كلمات المرور أو رموز التحقق أو مفاتيح التخزين في المحادثة.
لا يتضمن هذا الإعداد شراء خطة أو إضافة بطاقة دفع.

### الإعداد الجاهز للتطبيق بعد الدخول

| العنصر | القيمة المقترحة أو طريقة الحصول عليها |
|---|---|
| الحاوية | اسم مستقل مثل `hydroland-credentials-trial`، بعد التحقق من توفره |
| الوصول | `Private` |
| التشفير | تفعيل/التحقق من `SSE-B2 / AES256` للحاوية ثم التحقق من الملف التجريبي نفسه |
| حفظ الإصدارات | `Keep all versions of the file` أثناء التجربة؛ لا تضبط قاعدة تحذف النسخ السابقة |
| مفتاح التطبيق | مفتاح قياسي جديد خاص بالحاوية، وليس Master Application Key |
| نطاق الملفات | `credentials/`، وهو المسار الذي يولّده محول المستندات الحالي |
| صلاحيات التشغيل | `readFiles`, `writeFiles`, `deleteFiles`؛ فحص إعدادات الحاوية والاستعادة يتم بحساب المالك أو مفتاح تحقق مستقل |
| Endpoint | قيمة S3 Endpoint الفعلية من صفحة الحاوية، مع `https://` |
| Region | المنطقة الواردة في Endpoint؛ مثال توضيحي فقط: `us-west-004` للعنوان `s3.us-west-004.backblazeb2.com` |

وثائق التشفير تتضمن نصوصًا عن تفعيل تدريجي للقيمة الافتراضية؛ لذلك لا يكفي
افتراض أن الحاوية الجديدة مشفّرة. تُراجع القيمة الفعلية وتفاصيل الملف بعد
رفعه. لا يُعد Object Lock بديلًا عن حفظ الإصدارات، وليس مطلوبًا لهذا الربط.

تُنقل القيم عبر [إعدادات خدمة API في Render](https://dashboard.render.com/web/srv-dakelt142hec73aavvsg/env):

| إعداد Render | القيمة من B2 |
|---|---|
| `HYDROLAND_OBJECT_STORAGE_ENDPOINT` | S3 Endpoint مع HTTPS |
| `HYDROLAND_OBJECT_STORAGE_BUCKET` | اسم الحاوية |
| `HYDROLAND_OBJECT_STORAGE_REGION` | منطقة Endpoint نفسها؛ لا تستخدم الافتراضي `us-east-1` دون تحقق |
| `HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID` | `keyID` للمفتاح القياسي |
| `HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY` | `applicationKey`، عبر حقل Render الآمن |

### دليل التفعيل المطلوب

تظل الحالة غير تشغيلية والتأكيدات غير مفعّلة حتى التحقق من إعدادات المزود.
يُستخدم ملف اصطناعي بلا بيانات شخصية لاختبار المزود من حساب المالك أولًا.

| التأكيد | الدليل المطلوب قبل ضبطه على `true` |
|---|---|
| `PRIVATE_ACCESS_CONFIRMED` | الحاوية Private، تنزيل الملف بالمصادقة ينجح والوصول إلى الملف نفسه بلا توقيع مرفوض |
| `ENCRYPTION_CONFIRMED` | Default Encryption مضبوط على SSE-B2/AES256 وتفاصيل الملف التجريبي تثبت تشفيره |
| `VERSIONING_CONFIRMED` | حفظ جميع الإصدارات، رفع نسختين مختلفتين للاسم نفسه ثم استرجاع النسخة الأولى ومقارنة محتواها |

أسماء التأكيدات أعلاه مسبوقة بـ `HYDROLAND_OBJECT_STORAGE_` في Render.
بعد تحققها يمكن ضبط `HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS=SANDBOX`.
يُختبر بعدها المسار الفعلي من حساب المالك داخل HYDROLAND: إنشاء مستند، رفع
ملف اصطناعي، معاينته عبر الرابط المؤقت، ومنع حساب آخر من الوصول إليه.
يسجّل فحص المدير `/api/v1/health/integrations/credential-storage` جاهزية
الإعدادات؛ لا يستبدل اختبار الاستخدام. لا تُرقّى الحالة إلى
`PRODUCTION_ENABLED` ولا تغلق المرحلة الثالثة قبل اكتمال الربط والتحقق.

مصادر الإعداد:

- [التسعير](https://www.backblaze.com/cloud-storage/pricing)
- [بدء الحساب](https://www.backblaze.com/docs/cloud-storage-enable-backblaze-b2)
- [الحاويات الخاصة وEndpoint](https://www.backblaze.com/docs/cloud-storage-create-and-manage-buckets)
- [التحقق من التشفير](https://www.backblaze.com/docs/cloud-storage-enable-encryption-on-a-bucket)
- [الإصدارات وقواعد الاحتفاظ](https://www.backblaze.com/docs/cloud-storage-lifecycle-rules)
- [المفاتيح وصلاحيات S3](https://www.backblaze.com/docs/cloud-storage-s3-compatible-app-keys)

## دخول Google

المطلوب عميل OAuth من نوع Web application خاص بالمنصة ضمن مشروع المالك.
يسجل أصل الواجهة `https://hydroland-web.onrender.com` في Authorized
JavaScript origins، ويوضع معرّف العميل في `GOOGLE_CLIENT_ID` لخدمة API.
الكود الحالي يستخدم callback في المتصفح والتحقق من ID token في الخادم؛
لا يحتاج إدخال كلمة مرور Google أو Client Secret لهذا المسار.

بعد الإعداد: يتحقق `/api/v1/auth/google/config` من ظهور المعرّف، ثم يُختبر
دخول المالك فعليًا واستمرار الجلسة وخروجها وتحدي MFA إذا كان مفعّلًا.
نجاح اختبار المتصفح المعزول لا يحل محل هذا الاختبار الخارجي.

المصدر: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

خطوة المالك التالية هي فتح
[عملاء Google Auth Platform](https://console.cloud.google.com/auth/clients)
واختيار مشروع المنصة. يكون اسم التطبيق `HYDROLAND`، ونوع العميل
`Web application`، والأصل المسموح `https://hydroland-web.onrender.com`.
صلاحيات الهوية الأساسية `openid`, `email`, `profile` تكفي لهذا المسار؛ لا
يتطلب الوصول إلى Drive أو Gmail. يوضع معرّف العميل في `GOOGLE_CLIENT_ID`
على خدمة API في Render. لا تُنشأ موافقات أو بيانات عميل نيابة عن المالك
دون وصول معتمد إلى مشروعه.

## دليل التحقق الآلي

- اختبار إعدادات وتشغيل المحول عبر حالات نقص المفاتيح وفساد العنوان وإيقاف
  المزود وشروط الإنتاج والتجربة، والتحقق من عدم تسريب الإعدادات.
- اختبار HTTP/DB مع رفع فعلي إلى مخزن محلي معزول: الضيف 401، العضو والمراجع
  403، المدير 200، وسحب صلاحية المدير يمنع الوصول فورًا.
- فحوص العقود المعمارية وجرد الربط تستهلك المسار الجديد وتبقي فحص R2 قائمًا.

لا تغلق هذه الدفعة المرحلة الثالثة. يلزم توفير الربط الخارجي واختباره على
حساب المالك قبل اعتماد التشغيل الفعلي.
