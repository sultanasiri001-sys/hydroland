-- HYDROLAND HR L3/L4 canonical additive migration draft
-- Safe design: additive only; no drops/renames/destructive data changes.

CREATE TYPE "OrgUnitType" AS ENUM ('HQ','REGION','CENTER','DEPARTMENT','UNIT','TEAM');
CREATE TYPE "EmploymentStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','OFFBOARDED');
CREATE TYPE "WorkerClass" AS ENUM ('EMPLOYEE','TEMPORARY_WORKER','INDEPENDENT_PROFESSIONAL','CONTRACTOR','CENTER_AFFILIATED','TRIP_ONLY');
CREATE TYPE "EmploymentMovementType" AS ENUM ('APPOINTMENT','TRANSFER','TEMPORARY_ASSIGNMENT','PROMOTION','DEMOTION','SUSPENSION','RETURN_TO_ROLE','TERMINATION');
CREATE TYPE "HrRequestStatus" AS ENUM ('DRAFT','SUBMITTED','HR_REVIEW','APPROVAL_REQUIRED','APPROVED','REJECTED','CANCELLED','EFFECTIVE','CLOSED');

CREATE TABLE "OrgUnit" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "parentId" UUID REFERENCES "OrgUnit"("id") ON DELETE RESTRICT,
  "type" "OrgUnitType" NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "code")
);
CREATE INDEX "OrgUnit_org_parent_type_idx" ON "OrgUnit" ("organizationId","parentId","type");

CREATE TABLE "Position" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgUnitId" UUID NOT NULL REFERENCES "OrgUnit"("id") ON DELETE RESTRICT,
  "code" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("orgUnitId", "code")
);

CREATE TABLE "Employment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "orgUnitId" UUID NOT NULL REFERENCES "OrgUnit"("id") ON DELETE RESTRICT,
  "positionId" UUID REFERENCES "Position"("id") ON DELETE RESTRICT,
  "managerEmploymentId" UUID REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "workerClass" "WorkerClass" NOT NULL,
  "status" "EmploymentStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Employment_account_status_idx" ON "Employment" ("accountId","status");
CREATE INDEX "Employment_org_unit_status_idx" ON "Employment" ("organizationId","orgUnitId","status");

CREATE TABLE "EmploymentContract" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "contractType" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ NOT NULL,
  "effectiveTo" TIMESTAMPTZ,
  "documentId" UUID REFERENCES "Document"("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("employmentId","version")
);

CREATE TABLE "EmploymentMovement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "type" "EmploymentMovementType" NOT NULL,
  "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "fromOrgUnitId" UUID REFERENCES "OrgUnit"("id") ON DELETE RESTRICT,
  "toOrgUnitId" UUID REFERENCES "OrgUnit"("id") ON DELETE RESTRICT,
  "fromPositionId" UUID REFERENCES "Position"("id") ON DELETE RESTRICT,
  "toPositionId" UUID REFERENCES "Position"("id") ON DELETE RESTRICT,
  "requestedByAccountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "reviewedByAccountId" UUID REFERENCES "Account"("id") ON DELETE RESTRICT,
  "approvedByAccountId" UUID REFERENCES "Account"("id") ON DELETE RESTRICT,
  "effectiveAt" TIMESTAMPTZ,
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "EmploymentMovement_employment_status_idx" ON "EmploymentMovement" ("employmentId","status");

CREATE TABLE "LeaveRequest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "type" TEXT NOT NULL,
  "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMPTZ NOT NULL,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "requestedByAccountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "approvedByAccountId" UUID REFERENCES "Account"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "AttendanceEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "workDate" DATE NOT NULL,
  "clockInAt" TIMESTAMPTZ,
  "clockOutAt" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("employmentId","workDate")
);

CREATE TABLE "PerformanceCycle" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "goals" JSONB,
  "managerAssessment" JSONB,
  "hrReview" JSONB,
  "developmentPlan" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("periodEnd" >= "periodStart")
);

CREATE TABLE "EmployeeRelationsCase" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "caseType" TEXT NOT NULL,
  "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "openedByAccountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "reviewedByAccountId" UUID REFERENCES "Account"("id") ON DELETE RESTRICT,
  "approvedByAccountId" UUID REFERENCES "Account"("id") ON DELETE RESTRICT,
  "summary" TEXT,
  "decision" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "OffboardingCase" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employmentId" UUID NOT NULL REFERENCES "Employment"("id") ON DELETE RESTRICT,
  "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT,
  "lastWorkingAt" TIMESTAMPTZ,
  "clearance" JSONB,
  "iamRevokedAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compensation execution remains in Finance. HR stores employment/contract terms only;
-- do not create a duplicate accounting ledger here.
