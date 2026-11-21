ALTER TABLE "PersonalDataRequest" ADD COLUMN "routingCenterId" TEXT;
ALTER TABLE "PrivacyGrievance" ADD COLUMN "personalDataRequestId" TEXT REFERENCES "PersonalDataRequest"("id") ON DELETE RESTRICT,
  ADD COLUMN "decisionPersonId" TEXT, ADD COLUMN "firstOutcome" TEXT, ADD COLUMN "appealReason" TEXT,
  ADD COLUMN "appealedAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "PrivacyGrievance_personalDataRequestId_key" ON "PrivacyGrievance"("personalDataRequestId");
