CREATE TABLE "HrCandidate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "status" "HrRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "verifiedByAccountId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verificationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HrCandidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HrCandidate_organizationId_status_idx" ON "HrCandidate"("organizationId","status");
CREATE UNIQUE INDEX "HrCandidate_organizationId_personId_key" ON "HrCandidate"("organizationId","personId");
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_verifiedByAccountId_fkey" FOREIGN KEY ("verifiedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
