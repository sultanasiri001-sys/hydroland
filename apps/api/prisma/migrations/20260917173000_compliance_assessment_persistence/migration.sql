-- HYDROLAND canonical compliance persistence.
-- Additive only: no existing safety, trip, or boat-compliance data is rewritten.

CREATE TABLE "ComplianceAssessment" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "safetyChecklistId" TEXT,
  "decision" TEXT NOT NULL,
  "results" JSONB NOT NULL,
  "assessedByAccountId" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceEvidence" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "controlId" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL,
  "reference" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceAssessment_tripId_assessedAt_idx"
  ON "ComplianceAssessment"("tripId", "assessedAt");
CREATE INDEX "ComplianceAssessment_safetyChecklistId_idx"
  ON "ComplianceAssessment"("safetyChecklistId");
CREATE INDEX "ComplianceAssessment_decision_assessedAt_idx"
  ON "ComplianceAssessment"("decision", "assessedAt");
CREATE INDEX "ComplianceEvidence_assessmentId_controlId_idx"
  ON "ComplianceEvidence"("assessmentId", "controlId");
CREATE INDEX "ComplianceEvidence_controlId_verified_idx"
  ON "ComplianceEvidence"("controlId", "verified");

ALTER TABLE "ComplianceAssessment"
  ADD CONSTRAINT "ComplianceAssessment_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceAssessment"
  ADD CONSTRAINT "ComplianceAssessment_safetyChecklistId_fkey"
  FOREIGN KEY ("safetyChecklistId") REFERENCES "SafetyChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceAssessment"
  ADD CONSTRAINT "ComplianceAssessment_assessedByAccountId_fkey"
  FOREIGN KEY ("assessedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "ComplianceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
