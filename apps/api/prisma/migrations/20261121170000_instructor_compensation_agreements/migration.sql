CREATE TABLE "InstructorCompensationAgreement" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "instructorAccountId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0), "mode" TEXT NOT NULL,
  "rateBps" INTEGER NOT NULL CHECK ("rateBps" BETWEEN 0 AND 10000), "fixedMinor" INTEGER NOT NULL CHECK ("fixedMinor" >= 0),
  "currency" TEXT NOT NULL DEFAULT 'SAR' CHECK ("currency"='SAR'), "recordedByAccountId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("mode"='PERCENTAGE' AND "rateBps">0 AND "fixedMinor"=0)
      OR ("mode"='FIXED' AND "rateBps"=0 AND "fixedMinor">0)
      OR ("mode"='FIXED_PLUS_PERCENTAGE' AND "rateBps">0 AND "fixedMinor">0)
      OR ("mode"='SALARY_ONLY' AND "rateBps"=0 AND "fixedMinor"=0))
);
CREATE UNIQUE INDEX "InstructorCompAgreement_center_trainer_rev" ON "InstructorCompensationAgreement" ("organizationId","instructorAccountId","revision");
CREATE INDEX "InstructorCompensationAgreement_instructorAccountId_idx" ON "InstructorCompensationAgreement" ("instructorAccountId");
