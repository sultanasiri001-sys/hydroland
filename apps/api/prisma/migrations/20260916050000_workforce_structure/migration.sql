CREATE TYPE "WorkforceDepartmentStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "WorkforceMode" AS ENUM ('DISABLED', 'AI_ONLY', 'HUMAN_ONLY', 'HYBRID');
CREATE TYPE "WorkforcePositionTier" AS ENUM ('MANAGER', 'ASSISTANT');
CREATE TYPE "WorkforceSeatScope" AS ENUM ('HEADQUARTERS', 'EXTERNAL_CENTER');
CREATE TYPE "WorkforceSeatAccessStatus" AS ENUM ('LOCKED', 'ENABLED', 'SUSPENDED');

CREATE TABLE "WorkforceDepartment" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "description" TEXT,
  "status" "WorkforceDepartmentStatus" NOT NULL DEFAULT 'ENABLED',
  "isHumanResources" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkforceDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkforcePosition" (
  "id" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "tier" "WorkforcePositionTier" NOT NULL,
  "parentPositionId" UUID,
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "humanEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mode" "WorkforceMode" NOT NULL DEFAULT 'AI_ONLY',
  "externalLiaisonEligible" BOOLEAN NOT NULL DEFAULT false,
  "canManageExternalCenter" BOOLEAN NOT NULL DEFAULT false,
  "permissions" JSONB,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkforcePosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkforceSeat" (
  "id" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "accountId" UUID,
  "organizationId" UUID,
  "scope" "WorkforceSeatScope" NOT NULL DEFAULT 'HEADQUARTERS',
  "accessStatus" "WorkforceSeatAccessStatus" NOT NULL DEFAULT 'LOCKED',
  "label" TEXT,
  "administrativeManagerSeatId" UUID,
  "technicalDepartmentId" UUID,
  "enabledAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkforceSeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkforceDepartment_code_key" ON "WorkforceDepartment"("code");
CREATE INDEX "WorkforceDepartment_status_displayOrder_idx" ON "WorkforceDepartment"("status", "displayOrder");
CREATE UNIQUE INDEX "WorkforcePosition_code_key" ON "WorkforcePosition"("code");
CREATE INDEX "WorkforcePosition_departmentId_tier_displayOrder_idx" ON "WorkforcePosition"("departmentId", "tier", "displayOrder");
CREATE INDEX "WorkforcePosition_parentPositionId_idx" ON "WorkforcePosition"("parentPositionId");
CREATE INDEX "WorkforceSeat_positionId_accessStatus_idx" ON "WorkforceSeat"("positionId", "accessStatus");
CREATE INDEX "WorkforceSeat_accountId_accessStatus_idx" ON "WorkforceSeat"("accountId", "accessStatus");
CREATE INDEX "WorkforceSeat_organizationId_scope_accessStatus_idx" ON "WorkforceSeat"("organizationId", "scope", "accessStatus");
CREATE INDEX "WorkforceSeat_administrativeManagerSeatId_idx" ON "WorkforceSeat"("administrativeManagerSeatId");
CREATE INDEX "WorkforceSeat_technicalDepartmentId_idx" ON "WorkforceSeat"("technicalDepartmentId");
CREATE UNIQUE INDEX "WorkforceSeat_one_headquarters_position_key" ON "WorkforceSeat"("positionId") WHERE "scope" = 'HEADQUARTERS' AND "organizationId" IS NULL;
CREATE UNIQUE INDEX "WorkforceSeat_one_external_position_per_center_key" ON "WorkforceSeat"("positionId", "organizationId") WHERE "scope" = 'EXTERNAL_CENTER';

ALTER TABLE "WorkforcePosition" ADD CONSTRAINT "WorkforcePosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforcePosition" ADD CONSTRAINT "WorkforcePosition_parentPositionId_fkey" FOREIGN KEY ("parentPositionId") REFERENCES "WorkforcePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WorkforcePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_administrativeManagerSeatId_fkey" FOREIGN KEY ("administrativeManagerSeatId") REFERENCES "WorkforceSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_technicalDepartmentId_fkey" FOREIGN KEY ("technicalDepartmentId") REFERENCES "WorkforceDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
