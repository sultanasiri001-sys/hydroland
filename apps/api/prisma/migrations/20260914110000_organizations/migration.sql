-- HYDROLAND organizations and governed membership foundation
CREATE TYPE "OrganizationStatus" AS ENUM ('DRAFT','PENDING_REVIEW','ACTIVE','REJECTED','SUSPENDED','ARCHIVED');
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER','ADMIN','OPERATOR','INSTRUCTOR','STAFF','VIEWER');
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','REMOVED');

CREATE TABLE "Organization" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "displayName" TEXT NOT NULL,
  "legalName" TEXT,
  "kind" TEXT NOT NULL,
  "registrationNumber" TEXT UNIQUE,
  "regionCode" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "ownerId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reviewedAt" TIMESTAMPTZ,
  "reviewedById" UUID
);

CREATE TABLE "OrganizationMember" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "accountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'VIEWER',
  "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "accountId")
);

CREATE INDEX "Organization_status_createdAt_idx" ON "Organization" ("status", "createdAt");
CREATE INDEX "Organization_ownerId_status_idx" ON "Organization" ("ownerId", "status");
CREATE INDEX "OrganizationMember_accountId_status_idx" ON "OrganizationMember" ("accountId", "status");
