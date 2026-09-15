CREATE TABLE "PolicyControl" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT,
  "state" TEXT NOT NULL DEFAULT 'ENABLED',
  "description" TEXT,
  "metadata" JSONB,
  "updatedByAccountId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyControl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyControl_category_ruleKey_key" ON "PolicyControl"("category", "ruleKey");
CREATE INDEX "PolicyControl_category_state_idx" ON "PolicyControl"("category", "state");

ALTER TABLE "PolicyControl"
ADD CONSTRAINT "PolicyControl_updatedByAccountId_fkey"
FOREIGN KEY ("updatedByAccountId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PolicyControl" ("id","category","ruleKey","labelAr","labelEn","state","description") VALUES
(gen_random_uuid()::text,'BOOKING','SAFETY_APPROVAL','اعتماد السلامة قبل الحجز','Safety approval before booking','ENABLED','يتحكم في اشتراط قرار سلامة ALLOWED قبل إنشاء أو تأكيد الحجز.'),
(gen_random_uuid()::text,'BOOKING','PARTICIPANT_ELIGIBILITY','أهلية جميع المشاركين','Participant eligibility','ENABLED','يتحكم في اشتراط أهلية كل مقعد/مشارك قبل تأكيد الحجز.'),
(gen_random_uuid()::text,'BOOKING','CAPACITY_LIMIT','حد سعة الرحلة','Trip capacity limit','ENABLED','يتحكم في منع تجاوز السعة التشغيلية للرحلة.'),
(gen_random_uuid()::text,'CREW','QUALIFICATION','مؤهلات الطاقم والمدربين','Crew qualification','ENABLED','يتحكم في التحقق من الدور والاعتماد الموثق والساري.'),
(gen_random_uuid()::text,'CREW','RESPONSE_REQUIRED','استجابة الطاقم للتكليف','Crew response required','ENABLED','يتحكم في قبول/رفض تكليفات الطاقم والتصعيد.'),
(gen_random_uuid()::text,'TRIP','RESOURCE_READINESS','جاهزية الموارد','Resource readiness','ENABLED','يتحكم في اشتراط القارب/الموقع والموارد اللازمة حسب نوع الرحلة.'),
(gen_random_uuid()::text,'TRIP','SAFETY_CLEARANCE','اعتماد السلامة قبل إكمال الرحلة','Safety clearance before completion','ENABLED','يتحكم في اشتراط قرار السلامة قبل إغلاق الرحلة.'),
(gen_random_uuid()::text,'TRIP','OPERATIONAL_CLEARANCE','الاعتماد التشغيلي','Operational clearance','ENABLED','يتحكم في اعتماد التشغيل قبل إكمال الرحلة.'),
(gen_random_uuid()::text,'WEATHER','WEATHER_GATE','بوابة الطقس والبحر','Weather and marine gate','REVIEW','الوضع الافتراضي للمراجعة حتى اختيار مزود بيانات وتشغيل البوابة.'),
(gen_random_uuid()::text,'DIVE_LOG','PARTICIPANT_ELIGIBILITY','أهلية المشارك لإنشاء سجل الغوص','Participant eligibility for dive log','ENABLED','يتحكم في اشتراط أهلية المشارك قبل إنشاء سجل غوص تلقائي.')
ON CONFLICT ("category","ruleKey") DO NOTHING;