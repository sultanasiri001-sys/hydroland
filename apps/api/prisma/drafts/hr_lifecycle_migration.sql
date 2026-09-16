-- HYDROLAND HR L3/L4 canonical additive migration DRAFT.
-- QUARANTINED: this file is intentionally outside prisma/migrations.
-- Do not deploy until schema.prisma relations are reconciled and prisma validate succeeds.

CREATE TYPE "OrgUnitType" AS ENUM ('HQ','REGION','CENTER','DEPARTMENT','UNIT','TEAM');
CREATE TYPE "EmploymentStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','OFFBOARDED');
CREATE TYPE "WorkerClass" AS ENUM ('EMPLOYEE','TEMPORARY_WORKER','INDEPENDENT_PROFESSIONAL','CONTRACTOR','CENTER_AFFILIATED','TRIP_ONLY');
CREATE TYPE "EmploymentMovementType" AS ENUM ('APPOINTMENT','TRANSFER','TEMPORARY_ASSIGNMENT','PROMOTION','DEMOTION','SUSPENSION','RETURN_TO_ROLE','TERMINATION');
CREATE TYPE "HrRequestStatus" AS ENUM ('DRAFT','SUBMITTED','HR_REVIEW','APPROVAL_REQUIRED','APPROVED','REJECTED','CANCELLED','EFFECTIVE','CLOSED');

-- Full SQL source remains preserved in Git history at blob 36344dc7a7aed5e393dac532f5b0f2a8b8547eb5.
-- The production migration will be regenerated from the reconciled canonical Prisma schema.
