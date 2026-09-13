CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "PersonStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'RESTRICTED', 'ARCHIVED');
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "RoleScope" AS ENUM ('OWN', 'ORGANIZATION', 'TRIP', 'REGION', 'PLATFORM');
CREATE TYPE "ProfessionalRoleRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "CredentialVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'DOCUMENT_VERIFIED', 'VERIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

CREATE TABLE "Person" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "middleName" TEXT,
  "lastName" TEXT NOT NULL,
  "nationalityCode" VARCHAR(3),
  "preferredLanguage" VARCHAR(5) NOT NULL DEFAULT 'ar',
  "status" "PersonStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" UUID NOT NULL,
  "personId" UUID NOT NULL,
  "email" TEXT,
  "phoneE164" TEXT,
  "passwordHash" TEXT,
  "emailVerifiedAt" TIMESTAMP(3),
  "phoneVerifiedAt" TIMESTAMP(3),
  "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
  "id" UUID NOT NULL,
  "personId" UUID NOT NULL,
  "displayName" TEXT,
  "bio" TEXT,
  "avatarFileId" TEXT,
  "regionCode" TEXT,
  "city" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
  "roleId" UUID NOT NULL,
  "permissionId" UUID NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "PersonRole" (
  "id" UUID NOT NULL,
  "personId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "scope" "RoleScope" NOT NULL DEFAULT 'OWN',
  "scopeRef" TEXT,
  "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalRoleRequest" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "personId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "status" "ProfessionalRoleRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "applicantNote" TEXT,
  "reviewerNote" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewerPersonId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ProfessionalRoleRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalCredential" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "personId" UUID NOT NULL,
  "roleRequestId" UUID,
  "credentialType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "issuerName" TEXT NOT NULL,
  "credentialNumber" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "verificationStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "verificationSource" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByPersonId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ProfessionalCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRecord" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "personId" UUID NOT NULL,
  "credentialId" UUID,
  "roleRequestId" UUID,
  "documentType" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256Hex" VARCHAR(64) NOT NULL,
  "storageObjectKey" TEXT NOT NULL,
  "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'PENDING',
  "scanDetail" TEXT,
  "scannedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "personId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "bodyAr" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "referenceType" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL,
  "actorPersonId" UUID,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "reason" TEXT,
  "referenceId" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Person_publicId_key" ON "Person"("publicId");
CREATE INDEX "Person_status_idx" ON "Person"("status");
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Account_phoneE164_key" ON "Account"("phoneE164");
CREATE INDEX "Account_personId_idx" ON "Account"("personId");
CREATE INDEX "Account_status_idx" ON "Account"("status");
CREATE UNIQUE INDEX "Profile_personId_key" ON "Profile"("personId");
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "PersonRole_personId_roleId_idx" ON "PersonRole"("personId", "roleId");
CREATE INDEX "PersonRole_scope_scopeRef_idx" ON "PersonRole"("scope", "scopeRef");
CREATE UNIQUE INDEX "ProfessionalRoleRequest_publicId_key" ON "ProfessionalRoleRequest"("publicId");
CREATE INDEX "ProfessionalRoleRequest_personId_status_idx" ON "ProfessionalRoleRequest"("personId", "status");
CREATE INDEX "ProfessionalRoleRequest_roleId_status_idx" ON "ProfessionalRoleRequest"("roleId", "status");
CREATE INDEX "ProfessionalRoleRequest_reviewerPersonId_idx" ON "ProfessionalRoleRequest"("reviewerPersonId");
CREATE UNIQUE INDEX "ProfessionalCredential_publicId_key" ON "ProfessionalCredential"("publicId");
CREATE INDEX "ProfessionalCredential_personId_verificationStatus_idx" ON "ProfessionalCredential"("personId", "verificationStatus");
CREATE INDEX "ProfessionalCredential_roleRequestId_idx" ON "ProfessionalCredential"("roleRequestId");
CREATE INDEX "ProfessionalCredential_expiresAt_idx" ON "ProfessionalCredential"("expiresAt");
CREATE UNIQUE INDEX "DocumentRecord_publicId_key" ON "DocumentRecord"("publicId");
CREATE UNIQUE INDEX "DocumentRecord_storageObjectKey_key" ON "DocumentRecord"("storageObjectKey");
CREATE INDEX "DocumentRecord_personId_createdAt_idx" ON "DocumentRecord"("personId", "createdAt");
CREATE INDEX "DocumentRecord_credentialId_idx" ON "DocumentRecord"("credentialId");
CREATE INDEX "DocumentRecord_roleRequestId_idx" ON "DocumentRecord"("roleRequestId");
CREATE INDEX "DocumentRecord_scanStatus_idx" ON "DocumentRecord"("scanStatus");
CREATE INDEX "DocumentRecord_sha256Hex_idx" ON "DocumentRecord"("sha256Hex");
CREATE UNIQUE INDEX "Notification_publicId_key" ON "Notification"("publicId");
CREATE INDEX "Notification_personId_status_createdAt_idx" ON "Notification"("personId", "status", "createdAt");
CREATE INDEX "Notification_referenceType_referenceId_idx" ON "Notification"("referenceType", "referenceId");
CREATE INDEX "AuditEvent_actorPersonId_createdAt_idx" ON "AuditEvent"("actorPersonId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalRoleRequest" ADD CONSTRAINT "ProfessionalRoleRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalRoleRequest" ADD CONSTRAINT "ProfessionalRoleRequest_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalRoleRequest" ADD CONSTRAINT "ProfessionalRoleRequest_reviewerPersonId_fkey" FOREIGN KEY ("reviewerPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCredential" ADD CONSTRAINT "ProfessionalCredential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCredential" ADD CONSTRAINT "ProfessionalCredential_roleRequestId_fkey" FOREIGN KEY ("roleRequestId") REFERENCES "ProfessionalRoleRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalCredential" ADD CONSTRAINT "ProfessionalCredential_verifiedByPersonId_fkey" FOREIGN KEY ("verifiedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ProfessionalCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_roleRequestId_fkey" FOREIGN KEY ("roleRequestId") REFERENCES "ProfessionalRoleRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorPersonId_fkey" FOREIGN KEY ("actorPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
