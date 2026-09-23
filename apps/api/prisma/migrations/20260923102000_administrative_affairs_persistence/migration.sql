CREATE TYPE "AdministrativeRecordDbStatus" AS ENUM ('DRAFT','REGISTERED','ARCHIVED');

CREATE TABLE "AdministrativeRecord" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "unitId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL, "subject" TEXT NOT NULL, "status" "AdministrativeRecordDbStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerAccountId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdministrativeRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdministrativeRouting" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "recordId" TEXT NOT NULL, "fromUnitId" TEXT NOT NULL, "toUnitId" TEXT NOT NULL,
  "requestedByAccountId" TEXT NOT NULL, "assignedToAccountId" TEXT, "decision" TEXT, "decidedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedAt" TIMESTAMP(3),
  CONSTRAINT "AdministrativeRouting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdministrativeMeeting" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "unitId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL, "organizerAccountId" TEXT NOT NULL, "participantAccountIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdministrativeMeeting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdministrativeRecord_organizationId_referenceNumber_key" ON "AdministrativeRecord"("organizationId","referenceNumber");
CREATE INDEX "AdministrativeRecord_organizationId_unitId_status_idx" ON "AdministrativeRecord"("organizationId","unitId","status");
CREATE INDEX "AdministrativeRouting_organizationId_recordId_idx" ON "AdministrativeRouting"("organizationId","recordId");
CREATE INDEX "AdministrativeRouting_assignedToAccountId_decision_idx" ON "AdministrativeRouting"("assignedToAccountId","decision");
CREATE INDEX "AdministrativeMeeting_organizationId_unitId_scheduledAt_idx" ON "AdministrativeMeeting"("organizationId","unitId","scheduledAt");
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AdministrativeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_assignedToAccountId_fkey" FOREIGN KEY ("assignedToAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_decidedByAccountId_fkey" FOREIGN KEY ("decidedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizerAccountId_fkey" FOREIGN KEY ("organizerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
