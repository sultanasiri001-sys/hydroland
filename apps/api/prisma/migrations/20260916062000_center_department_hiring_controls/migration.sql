CREATE TYPE "WorkforceCenterDepartmentStatus" AS ENUM ('LOCKED', 'ENABLED');
CREATE TYPE "WorkforceHiringRequestStatus" AS ENUM ('PENDING_EXECUTIVE_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "WorkforceCenterDepartment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "status" "WorkforceCenterDepartmentStatus" NOT NULL DEFAULT 'LOCKED',
  "managerAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" UUID,
  "activatedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkforceCenterDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkforceHiringRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "candidateAccountId" UUID NOT NULL,
  "targetSeatId" UUID,
  "requestedById" UUID NOT NULL,
  "reviewedById" UUID,
  "status" "WorkforceHiringRequestStatus" NOT NULL DEFAULT 'PENDING_EXECUTIVE_APPROVAL',
  "justification" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "assignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkforceHiringRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkforceCenterDepartment_organizationId_departmentId_key" ON "WorkforceCenterDepartment"("organizationId", "departmentId");
CREATE INDEX "WorkforceCenterDepartment_organizationId_status_idx" ON "WorkforceCenterDepartment"("organizationId", "status");
CREATE INDEX "WorkforceCenterDepartment_departmentId_status_idx" ON "WorkforceCenterDepartment"("departmentId", "status");
CREATE INDEX "WorkforceHiringRequest_status_createdAt_idx" ON "WorkforceHiringRequest"("status", "createdAt");
CREATE INDEX "WorkforceHiringRequest_organizationId_departmentId_status_idx" ON "WorkforceHiringRequest"("organizationId", "departmentId", "status");
CREATE INDEX "WorkforceHiringRequest_candidateAccountId_status_idx" ON "WorkforceHiringRequest"("candidateAccountId", "status");

ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WorkforcePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_targetSeatId_fkey" FOREIGN KEY ("targetSeatId") REFERENCES "WorkforceSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
