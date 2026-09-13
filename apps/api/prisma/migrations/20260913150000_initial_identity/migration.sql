-- HYDROLAND initial identity foundation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','ARCHIVED');
CREATE TABLE "Person" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"firstName" TEXT NOT NULL,"lastName" TEXT NOT NULL,"phone" TEXT UNIQUE,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "Account" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"personId" UUID NOT NULL UNIQUE REFERENCES "Person"("id") ON DELETE RESTRICT,"email" TEXT NOT NULL UNIQUE,"passwordHash" TEXT NOT NULL,"status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',"emailVerifiedAt" TIMESTAMPTZ,"lastLoginAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "Session" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"accountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE,"tokenHash" TEXT NOT NULL UNIQUE,"expiresAt" TIMESTAMPTZ NOT NULL,"revokedAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX "Session_accountId_expiresAt_idx" ON "Session" ("accountId","expiresAt");
