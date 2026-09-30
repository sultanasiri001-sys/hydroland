CREATE TYPE "TrainingCertificateStatus" AS ENUM ('RECOMMENDED','APPROVED','REJECTED','REVOKED');

CREATE TABLE "TrainingCertificate" (
  "id" TEXT NOT NULL,
  "trainingRecordId" TEXT NOT NULL,
  "studentAccountId" TEXT NOT NULL,
  "courseCode" TEXT NOT NULL,
  "recommendedByInstructorId" TEXT NOT NULL,
  "recommendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "TrainingCertificateStatus" NOT NULL DEFAULT 'RECOMMENDED',
  "reviewedByAccountId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewReason" TEXT,
  "certificateNumber" TEXT,
  "verificationTokenHash" TEXT,
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingCertificate_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingCertificate_trainingRecordId_key" ON "TrainingCertificate"("trainingRecordId");
CREATE UNIQUE INDEX "TrainingCertificate_certificateNumber_key" ON "TrainingCertificate"("certificateNumber");
CREATE UNIQUE INDEX "TrainingCertificate_verificationTokenHash_key" ON "TrainingCertificate"("verificationTokenHash");
CREATE INDEX "TrainingCertificate_studentAccountId_status_idx" ON "TrainingCertificate"("studentAccountId","status");
CREATE INDEX "TrainingCertificate_status_createdAt_idx" ON "TrainingCertificate"("status","createdAt");
