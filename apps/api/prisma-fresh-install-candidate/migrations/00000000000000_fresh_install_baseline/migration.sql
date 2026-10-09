-- CANDIDATE: empty installations only; not an existing-database migration.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProfessionalRole" AS ENUM ('DIVER', 'INSTRUCTOR', 'DIVE_CENTER', 'BOAT_OWNER', 'STAFF', 'ORGANIZATION', 'ADMIN', 'REVIEWER', 'CENTER_MANAGER', 'HR_REVIEWER', 'HR_MANAGER', 'HR_EXECUTIVE', 'EXECUTIVE_APPROVER', 'IAM_SERVICE');

-- CreateEnum
CREATE TYPE "RoleAssignmentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CredentialVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'DOCUMENT_VERIFIED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivationRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'INSTRUCTOR', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'QUARANTINED', 'AVAILABLE', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('HQ', 'REGION', 'CENTER', 'DEPARTMENT', 'UNIT', 'TEAM');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "WorkerClass" AS ENUM ('EMPLOYEE', 'TEMPORARY_WORKER', 'INDEPENDENT_PROFESSIONAL', 'CONTRACTOR', 'CENTER_AFFILIATED', 'TRIP_ONLY');

-- CreateEnum
CREATE TYPE "EmploymentMovementType" AS ENUM ('APPOINTMENT', 'TRANSFER', 'TEMPORARY_ASSIGNMENT', 'PROMOTION', 'DEMOTION', 'SUSPENSION', 'RETURN_TO_ROLE', 'TERMINATION');

-- CreateEnum
CREATE TYPE "HrRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'HR_REVIEW', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EFFECTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdministrativeRecordDbStatus" AS ENUM ('DRAFT', 'REGISTERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationalDecision" AS ENUM ('ALLOWED', 'REVIEW_REQUIRED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "SafetyIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SafetyIncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DiveLogStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "CustomerCaseType" AS ENUM ('QUESTION', 'SUPPORT', 'COMPLAINT', 'BOOKING_ISSUE', 'PAYMENT_ISSUE', 'SAFETY_CONCERN');

-- CreateEnum
CREATE TYPE "CustomerCaseStatus" AS ENUM ('OPEN', 'ASSIGNED', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CustomerCasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CustomerInteractionActorType" AS ENUM ('CUSTOMER', 'STAFF', 'AI_AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CustomerInteractionChannel" AS ENUM ('APP', 'WEB', 'EMAIL', 'PHONE', 'WHATSAPP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('REVENUE', 'EXPENSE', 'REFUND', 'ADJUSTMENT', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "FinanceEntryStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REJECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FinanceShiftStatus" AS ENUM ('OPEN', 'HANDOVER_PENDING', 'HANDED_OVER', 'CLOSED');

-- CreateEnum
CREATE TYPE "FinanceHandoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ReceivableInstallmentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingRecordStatus" AS ENUM ('NOT_STARTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InstructorEarningStatus" AS ENUM ('PENDING', 'APPROVED', 'SETTLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "TrainingCertificateStatus" AS ENUM ('RECOMMENDED', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TrainingSessionStatus" AS ENUM ('SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StoreProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RewardEntryType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BriefingStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TranslationMode" AS ENUM ('OFFLINE', 'ONLINE', 'AUTO');

-- CreateEnum
CREATE TYPE "LanguagePackStatus" AS ENUM ('DOWNLOAD_AVAILABLE', 'INSTALLED', 'UPDATE_AVAILABLE', 'DISABLED');

-- CreateEnum
CREATE TYPE "EmergencyPhraseStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MarineAssetStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "MarineReadinessStatus" AS ENUM ('NOT_READY', 'NEEDS_REVIEW', 'READY');

-- CreateEnum
CREATE TYPE "ManagedDocumentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SIGNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "kind" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "regionCode" TEXT,
    "documentLogoUrl" TEXT,
    "documentLogoAssetId" TEXT,
    "documentBrandNameAr" TEXT,
    "documentBrandNameEn" TEXT,
    "documentFooterAr" TEXT,
    "documentFooterEn" TEXT,
    "documentBrandVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDocumentAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationDocumentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentBrandSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandVersion" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "logoAssetId" TEXT,
    "brandNameAr" TEXT,
    "brandNameEn" TEXT,
    "footerAr" TEXT,
    "footerEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentBrandSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'VIEWER',
    "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "regionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiverProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "identityType" TEXT,
    "identityLast4" TEXT,
    "identityVerifiedAt" TIMESTAMP(3),
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "preferredContact" TEXT,
    "emergencyName" TEXT,
    "emergencyRelation" TEXT,
    "emergencyPhone" TEXT,
    "emergencyAltPhone" TEXT,
    "bloodType" TEXT,
    "medicalFitnessStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "medicalClearanceExpiresAt" TIMESTAMP(3),
    "preferredLanguage" TEXT DEFAULT 'ar',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiverEquipment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ownership" TEXT NOT NULL DEFAULT 'OWNED',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "size" TEXT,
    "serviceDueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiverEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "ProfessionalRole" NOT NULL,
    "status" "RoleAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" JSONB,
    "activeAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credentialNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verificationStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT,
    "ownerId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationRequest" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "roleAssignmentId" TEXT NOT NULL,
    "status" "ActivationRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "activationRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "AdministrativeRecordDbStatus" NOT NULL DEFAULT 'DRAFT',
    "licenseAssetId" TEXT,
    "licenseIssuedAt" TIMESTAMP(3),
    "licenseExpiresAt" TIMESTAMP(3),
    "licenseReviewStatus" TEXT,
    "licenseReviewSubmittedAt" TIMESTAMP(3),
    "licenseReviewSubmittedById" TEXT,
    "licenseReviewDecidedAt" TIMESTAMP(3),
    "licenseReviewDecidedById" TEXT,
    "licenseReviewReason" TEXT,
    "ownerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeRouting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "assignedToAccountId" TEXT,
    "decision" TEXT,
    "decidedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AdministrativeRouting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeMeeting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "organizerAccountId" TEXT NOT NULL,
    "participantAccountIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PolicyControl" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT,
    "state" TEXT NOT NULL DEFAULT 'ENABLED',
    "description" TEXT,
    "metadata" JSONB,
    "updatedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingParticipant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "accountId" TEXT,
    "fullName" TEXT NOT NULL,
    "certificationTitle" TEXT,
    "certificationNumber" TEXT,
    "certificationIssuer" TEXT,
    "eligibilityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "profileSnapshot" JSONB,
    "equipmentSnapshot" JSONB,
    "emergencySnapshot" JSONB,
    "identitySnapshot" JSONB,
    "snapshotAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarResource" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "referenceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarAllocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewAssignment" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "replacesAssignmentId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyChecklist" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "decision" "OperationalDecision" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "reportedByAccountId" TEXT NOT NULL,
    "severity" "SafetyIncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationName" TEXT,
    "status" "SafetyIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedByAccountId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiveLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "sourceTripId" TEXT,
    "sourceParticipantId" TEXT,
    "siteName" TEXT NOT NULL,
    "regionCode" TEXT,
    "diveDate" TIMESTAMP(3) NOT NULL,
    "maxDepthM" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "buddyName" TEXT,
    "instructorName" TEXT,
    "notes" TEXT,
    "status" "DiveLogStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiveLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSchedule" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoatResourceCompliance" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "navigationLicenseNumber" TEXT,
    "navigationLicenseExpiresAt" TIMESTAMP(3),
    "safetyCertificateExpiresAt" TIMESTAMP(3),
    "passengerLimit" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoatResourceCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripComplianceReview" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "regulatoryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "permitStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "permitReference" TEXT,
    "authorityReference" TEXT,
    "notes" TEXT,
    "reviewedByAccountId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripComplianceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "OrgUnitType" NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "positionId" TEXT,
    "managerEmploymentId" TEXT,
    "workerClass" "WorkerClass" NOT NULL,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentContract" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contractType" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "documentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentMovement" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "type" "EmploymentMovementType" NOT NULL,
    "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "fromOrgUnitId" TEXT,
    "toOrgUnitId" TEXT,
    "fromPositionId" TEXT,
    "toPositionId" TEXT,
    "requestedByAccountId" TEXT NOT NULL,
    "reviewedByAccountId" TEXT,
    "approvedByAccountId" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "approvedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "shiftCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationTerm" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "baseAmountMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "allowances" JSONB,
    "benefits" JSONB,
    "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedByAccountId" TEXT,
    "reviewedByAccountId" TEXT,
    "approvedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceCycle" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "goals" JSONB,
    "managerAssessment" JSONB,
    "hrReview" JSONB,
    "developmentPlan" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRelationsCase" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "openedByAccountId" TEXT NOT NULL,
    "reviewedByAccountId" TEXT,
    "approvedByAccountId" TEXT,
    "summary" TEXT,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRelationsCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingCase" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "status" "HrRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "lastWorkingAt" TIMESTAMP(3),
    "clearance" JSONB,
    "iamRevokedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "customerId" TEXT NOT NULL,
    "type" "CustomerCaseType" NOT NULL,
    "status" "CustomerCaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CustomerCasePriority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "assignedAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorType" "CustomerInteractionActorType" NOT NULL,
    "actorId" TEXT,
    "channel" "CustomerInteractionChannel" NOT NULL DEFAULT 'WEB',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "financeAccountId" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT,
    "requestedByAccountId" TEXT NOT NULL,
    "approvedByAccountId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedByAccountId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceApproval" (
    "id" TEXT NOT NULL,
    "financeEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedByAccountId" TEXT NOT NULL,
    "decidedByAccountId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccountantShift" (
    "id" TEXT NOT NULL,
    "centerOrgUnitId" TEXT NOT NULL,
    "accountantAccountId" TEXT NOT NULL,
    "status" "FinanceShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reviewedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccountantShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceShiftEntry" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paymentId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "recordedByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceShiftEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceShiftHandover" (
    "id" TEXT NOT NULL,
    "fromShiftId" TEXT NOT NULL,
    "toShiftId" TEXT NOT NULL,
    "fromAccountantId" TEXT NOT NULL,
    "toAccountantId" TEXT NOT NULL,
    "expectedCashMinor" INTEGER NOT NULL,
    "actualCashMinor" INTEGER NOT NULL,
    "varianceMinor" INTEGER NOT NULL,
    "varianceReason" TEXT,
    "status" "FinanceHandoverStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "centerOrgUnitId" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "paidMinor" INTEGER NOT NULL DEFAULT 0,
    "outstandingMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "creditLimitMinor" INTEGER,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableInstallment" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paidMinor" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ReceivableInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivableInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePayment" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "installmentId" TEXT,
    "paymentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "studentAccountId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "centerOrganizationId" TEXT,
    "instructorAccountId" TEXT,
    "status" "TrainingEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "TrainingRecordStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "policyVersion" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingStage" (
    "id" TEXT NOT NULL,
    "trainingRecordId" TEXT NOT NULL,
    "stageType" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSkill" (
    "id" TEXT NOT NULL,
    "trainingStageId" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "signedOffByInstructorId" TEXT,
    "signedOffAt" TIMESTAMP(3),
    "studentAcknowledgedAt" TIMESTAMP(3),
    "studentObjection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorEarning" (
    "id" TEXT NOT NULL,
    "trainingEnrollmentId" TEXT NOT NULL,
    "instructorAccountId" TEXT NOT NULL,
    "centerOrganizationId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "InstructorEarningStatus" NOT NULL DEFAULT 'PENDING',
    "financeEntryId" TEXT,
    "approvedByAccountId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "trainingRecordId" TEXT NOT NULL,
    "trainingStageId" TEXT,
    "instructorAccountId" TEXT NOT NULL,
    "facilityOrSiteId" TEXT,
    "tripId" TEXT,
    "vesselId" TEXT,
    "evidence" JSONB,
    "status" "TrainingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "StoreProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'CREATED',
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreInvoice" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "balanceMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "balanceAfterMinor" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardEntry" (
    "id" TEXT NOT NULL,
    "rewardAccountId" TEXT NOT NULL,
    "type" "RewardEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripBriefing" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BriefingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "summary" JSONB,
    "createdByAccountId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefingMedia" (
    "id" TEXT NOT NULL,
    "briefingId" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "contentType" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'OPERATIONAL_OFFLINE',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivePlan" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPlan" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefingTranslation" (
    "id" TEXT NOT NULL,
    "briefingId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "level" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAccountId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefingTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineTripPackage" (
    "id" TEXT NOT NULL,
    "briefingId" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_READY',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineTripPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguagePack" (
    "id" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LanguagePackStatus" NOT NULL DEFAULT 'DOWNLOAD_AVAILABLE',
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguagePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationPreference" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "preferredLanguageCode" TEXT NOT NULL DEFAULT 'ar',
    "mode" "TranslationMode" NOT NULL DEFAULT 'AUTO',
    "autoTranslateMessages" BOOLEAN NOT NULL DEFAULT false,
    "keepOriginalText" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPhrase" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceArabic" TEXT NOT NULL,
    "status" "EmergencyPhraseStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByAccountId" TEXT NOT NULL,
    "reviewedByAccountId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPhraseTranslation" (
    "id" TEXT NOT NULL,
    "phraseId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "reviewedByAccountId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyPhraseTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarineAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "calendarResourceId" TEXT,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "passengerCapacity" INTEGER,
    "status" "MarineAssetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarineAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarineAssetDocument" (
    "id" TEXT NOT NULL,
    "marineAssetId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarineAssetDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarineMaintenanceRecord" (
    "id" TEXT NOT NULL,
    "marineAssetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarineMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarineReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "marineAssetId" TEXT NOT NULL,
    "tripId" TEXT,
    "status" "MarineReadinessStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reasonCodes" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedByAccountId" TEXT,

    CONSTRAINT "MarineReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "printable" BOOLEAN NOT NULL DEFAULT true,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "ManagedDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL,
    "documentBrandVersion" INTEGER,
    "payload" JSONB NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "approvedByAccountId" TEXT,
    "signedByAccountId" TEXT,
    "archivedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLifecycleEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorAccountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ManagedDocumentStatus",
    "toStatus" "ManagedDocumentStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReferenceCounter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReferenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_phone_key" ON "Person"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Account_personId_key" ON "Account"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_registrationNumber_key" ON "Organization"("registrationNumber");

-- CreateIndex
CREATE INDEX "Organization_status_createdAt_idx" ON "Organization"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Organization_ownerId_status_idx" ON "Organization"("ownerId", "status");

-- CreateIndex
CREATE INDEX "OrganizationDocumentAsset_organizationId_kind_createdAt_idx" ON "OrganizationDocumentAsset"("organizationId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDocumentAsset_organizationId_sha256_key" ON "OrganizationDocumentAsset"("organizationId", "sha256");

-- CreateIndex
CREATE INDEX "DocumentBrandSnapshot_organizationId_createdAt_idx" ON "DocumentBrandSnapshot"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentBrandSnapshot_organizationId_brandVersion_key" ON "DocumentBrandSnapshot"("organizationId", "brandVersion");

-- CreateIndex
CREATE INDEX "OrganizationMember_accountId_status_idx" ON "OrganizationMember"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_accountId_key" ON "OrganizationMember"("organizationId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_accountId_expiresAt_idx" ON "Session"("accountId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_personId_key" ON "ProfessionalProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "DiverProfile_accountId_key" ON "DiverProfile"("accountId");

-- CreateIndex
CREATE INDEX "DiverEquipment_accountId_category_idx" ON "DiverEquipment"("accountId", "category");

-- CreateIndex
CREATE INDEX "RoleAssignment_role_status_idx" ON "RoleAssignment"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_accountId_role_key" ON "RoleAssignment"("accountId", "role");

-- CreateIndex
CREATE INDEX "Credential_personId_verificationStatus_idx" ON "Credential"("personId", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Document_sha256_key" ON "Document"("sha256");

-- CreateIndex
CREATE INDEX "Document_ownerId_status_idx" ON "Document"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ActivationRequest_status_createdAt_idx" ON "ActivationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CenterLicense_platform_review_queue_idx" ON "AdministrativeRecord"("licenseReviewStatus", "licenseReviewSubmittedAt");

-- CreateIndex
CREATE INDEX "AdministrativeRecord_organizationId_unitId_status_idx" ON "AdministrativeRecord"("organizationId", "unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeRecord_organizationId_referenceNumber_key" ON "AdministrativeRecord"("organizationId", "referenceNumber");

-- CreateIndex
CREATE INDEX "AdministrativeRouting_organizationId_recordId_idx" ON "AdministrativeRouting"("organizationId", "recordId");

-- CreateIndex
CREATE INDEX "AdministrativeRouting_assignedToAccountId_decision_idx" ON "AdministrativeRouting"("assignedToAccountId", "decision");

-- CreateIndex
CREATE INDEX "AdministrativeMeeting_organizationId_unitId_scheduledAt_idx" ON "AdministrativeMeeting"("organizationId", "unitId", "scheduledAt");

-- CreateIndex
CREATE INDEX "AuditEvent_resource_resourceId_occurredAt_idx" ON "AuditEvent"("resource", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_occurredAt_idx" ON "AuditEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "PolicyControl_category_state_idx" ON "PolicyControl"("category", "state");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyControl_category_ruleKey_key" ON "PolicyControl"("category", "ruleKey");

-- CreateIndex
CREATE INDEX "Trip_status_startsAt_idx" ON "Trip"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Trip_organizationId_status_startsAt_idx" ON "Trip"("organizationId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_tripId_status_idx" ON "Booking"("tripId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tripId_accountId_key" ON "Booking"("tripId", "accountId");

-- CreateIndex
CREATE INDEX "BookingParticipant_bookingId_eligibilityStatus_idx" ON "BookingParticipant"("bookingId", "eligibilityStatus");

-- CreateIndex
CREATE INDEX "BookingParticipant_accountId_idx" ON "BookingParticipant"("accountId");

-- CreateIndex
CREATE INDEX "CalendarResource_type_active_idx" ON "CalendarResource"("type", "active");

-- CreateIndex
CREATE INDEX "CalendarResource_referenceId_idx" ON "CalendarResource"("referenceId");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizationId_startsAt_endsAt_idx" ON "CalendarEvent"("organizationId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_type_status_startsAt_idx" ON "CalendarEvent"("type", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_referenceType_referenceId_key" ON "CalendarEvent"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "CalendarAllocation_resourceId_startsAt_endsAt_idx" ON "CalendarAllocation"("resourceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CalendarAllocation_eventId_status_idx" ON "CalendarAllocation"("eventId", "status");

-- CreateIndex
CREATE INDEX "CrewAssignment_tripId_status_idx" ON "CrewAssignment"("tripId", "status");

-- CreateIndex
CREATE INDEX "CrewAssignment_accountId_status_idx" ON "CrewAssignment"("accountId", "status");

-- CreateIndex
CREATE INDEX "CrewAssignment_resourceId_idx" ON "CrewAssignment"("resourceId");

-- CreateIndex
CREATE INDEX "SafetyChecklist_tripId_decision_idx" ON "SafetyChecklist"("tripId", "decision");

-- CreateIndex
CREATE INDEX "SafetyIncident_tripId_status_createdAt_idx" ON "SafetyIncident"("tripId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_reportedByAccountId_createdAt_idx" ON "SafetyIncident"("reportedByAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_status_severity_createdAt_idx" ON "SafetyIncident"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "DiveLog_accountId_diveDate_idx" ON "DiveLog"("accountId", "diveDate");

-- CreateIndex
CREATE INDEX "DiveLog_accountId_status_idx" ON "DiveLog"("accountId", "status");

-- CreateIndex
CREATE INDEX "DiveLog_sourceTripId_idx" ON "DiveLog"("sourceTripId");

-- CreateIndex
CREATE INDEX "DiveLog_sourceParticipantId_idx" ON "DiveLog"("sourceParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "DiveLog_sourceParticipantId_sourceTripId_key" ON "DiveLog"("sourceParticipantId", "sourceTripId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE INDEX "Payment_accountId_status_idx" ON "Payment"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "ThemeSchedule_status_startsAt_endsAt_idx" ON "ThemeSchedule"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ThemeSchedule_themeId_idx" ON "ThemeSchedule"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "BoatResourceCompliance_resourceId_key" ON "BoatResourceCompliance"("resourceId");

-- CreateIndex
CREATE INDEX "BoatResourceCompliance_registrationStatus_idx" ON "BoatResourceCompliance"("registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TripComplianceReview_tripId_key" ON "TripComplianceReview"("tripId");

-- CreateIndex
CREATE INDEX "TripComplianceReview_regulatoryStatus_permitStatus_idx" ON "TripComplianceReview"("regulatoryStatus", "permitStatus");

-- CreateIndex
CREATE INDEX "OrgUnit_organizationId_parentId_type_idx" ON "OrgUnit"("organizationId", "parentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_organizationId_code_key" ON "OrgUnit"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Position_orgUnitId_code_key" ON "Position"("orgUnitId", "code");

-- CreateIndex
CREATE INDEX "HrCandidate_organizationId_status_idx" ON "HrCandidate"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HrCandidate_organizationId_personId_key" ON "HrCandidate"("organizationId", "personId");

-- CreateIndex
CREATE INDEX "Employment_accountId_status_idx" ON "Employment"("accountId", "status");

-- CreateIndex
CREATE INDEX "Employment_organizationId_orgUnitId_status_idx" ON "Employment"("organizationId", "orgUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentContract_employmentId_version_key" ON "EmploymentContract"("employmentId", "version");

-- CreateIndex
CREATE INDEX "EmploymentMovement_employmentId_status_idx" ON "EmploymentMovement"("employmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEntry_employmentId_workDate_key" ON "AttendanceEntry"("employmentId", "workDate");

-- CreateIndex
CREATE INDEX "ShiftAssignment_employmentId_startsAt_idx" ON "ShiftAssignment"("employmentId", "startsAt");

-- CreateIndex
CREATE INDEX "ShiftAssignment_status_idx" ON "ShiftAssignment"("status");

-- CreateIndex
CREATE INDEX "CompensationTerm_employmentId_effectiveFrom_idx" ON "CompensationTerm"("employmentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CompensationTerm_status_idx" ON "CompensationTerm"("status");

-- CreateIndex
CREATE INDEX "CustomerCase_customerId_status_createdAt_idx" ON "CustomerCase"("customerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerCase_organizationId_status_createdAt_idx" ON "CustomerCase"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerCase_assignedAccountId_status_idx" ON "CustomerCase"("assignedAccountId", "status");

-- CreateIndex
CREATE INDEX "CustomerInteraction_caseId_createdAt_idx" ON "CustomerInteraction"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceAccount_organizationId_active_idx" ON "FinanceAccount"("organizationId", "active");

-- CreateIndex
CREATE INDEX "FinanceEntry_organizationId_status_createdAt_idx" ON "FinanceEntry"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_referenceType_referenceId_idx" ON "FinanceEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "FinanceEntry_financeAccountId_status_idx" ON "FinanceEntry"("financeAccountId", "status");

-- CreateIndex
CREATE INDEX "FinanceApproval_financeEntryId_status_idx" ON "FinanceApproval"("financeEntryId", "status");

-- CreateIndex
CREATE INDEX "FinanceApproval_requestedByAccountId_status_idx" ON "FinanceApproval"("requestedByAccountId", "status");

-- CreateIndex
CREATE INDEX "FinanceApproval_decidedByAccountId_status_idx" ON "FinanceApproval"("decidedByAccountId", "status");

-- CreateIndex
CREATE INDEX "FinanceAccountantShift_centerOrgUnitId_status_idx" ON "FinanceAccountantShift"("centerOrgUnitId", "status");

-- CreateIndex
CREATE INDEX "FinanceAccountantShift_accountantAccountId_status_idx" ON "FinanceAccountantShift"("accountantAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceShiftEntry_paymentId_key" ON "FinanceShiftEntry"("paymentId");

-- CreateIndex
CREATE INDEX "FinanceShiftEntry_shiftId_createdAt_idx" ON "FinanceShiftEntry"("shiftId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceShiftHandover_fromShiftId_status_idx" ON "FinanceShiftHandover"("fromShiftId", "status");

-- CreateIndex
CREATE INDEX "FinanceShiftHandover_toShiftId_status_idx" ON "FinanceShiftHandover"("toShiftId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_invoiceId_key" ON "Receivable"("invoiceId");

-- CreateIndex
CREATE INDEX "Receivable_centerOrgUnitId_status_dueAt_idx" ON "Receivable"("centerOrgUnitId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Receivable_customerAccountId_status_idx" ON "Receivable"("customerAccountId", "status");

-- CreateIndex
CREATE INDEX "ReceivableInstallment_dueAt_status_idx" ON "ReceivableInstallment"("dueAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableInstallment_receivableId_sequence_key" ON "ReceivableInstallment"("receivableId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_paymentId_key" ON "ReceivablePayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_receiptNumber_key" ON "ReceivablePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "ReceivablePayment_receivableId_collectedAt_idx" ON "ReceivablePayment"("receivableId", "collectedAt");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_studentAccountId_status_idx" ON "TrainingEnrollment"("studentAccountId", "status");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_centerOrganizationId_status_idx" ON "TrainingEnrollment"("centerOrganizationId", "status");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_instructorAccountId_status_idx" ON "TrainingEnrollment"("instructorAccountId", "status");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_courseCode_status_idx" ON "TrainingEnrollment"("courseCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingRecord_enrollmentId_key" ON "TrainingRecord"("enrollmentId");

-- CreateIndex
CREATE INDEX "TrainingRecord_status_updatedAt_idx" ON "TrainingRecord"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrainingStage_trainingRecordId_status_idx" ON "TrainingStage"("trainingRecordId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingStage_trainingRecordId_sequence_key" ON "TrainingStage"("trainingRecordId", "sequence");

-- CreateIndex
CREATE INDEX "TrainingSkill_trainingStageId_status_idx" ON "TrainingSkill"("trainingStageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSkill_trainingStageId_skillCode_key" ON "TrainingSkill"("trainingStageId", "skillCode");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorEarning_trainingEnrollmentId_key" ON "InstructorEarning"("trainingEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorEarning_financeEntryId_key" ON "InstructorEarning"("financeEntryId");

-- CreateIndex
CREATE INDEX "InstructorEarning_instructorAccountId_status_createdAt_idx" ON "InstructorEarning"("instructorAccountId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCertificate_trainingRecordId_key" ON "TrainingCertificate"("trainingRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCertificate_certificateNumber_key" ON "TrainingCertificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCertificate_verificationTokenHash_key" ON "TrainingCertificate"("verificationTokenHash");

-- CreateIndex
CREATE INDEX "TrainingCertificate_studentAccountId_status_idx" ON "TrainingCertificate"("studentAccountId", "status");

-- CreateIndex
CREATE INDEX "TrainingCertificate_status_createdAt_idx" ON "TrainingCertificate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingSession_trainingRecordId_status_startsAt_idx" ON "TrainingSession"("trainingRecordId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingSession_instructorAccountId_startsAt_idx" ON "TrainingSession"("instructorAccountId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProduct_sku_key" ON "StoreProduct"("sku");

-- CreateIndex
CREATE INDEX "StoreProduct_status_nameAr_idx" ON "StoreProduct"("status", "nameAr");

-- CreateIndex
CREATE INDEX "StoreOrder_accountId_status_createdAt_idx" ON "StoreOrder"("accountId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorePayment_orderId_key" ON "StorePayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePayment_idempotencyKey_key" ON "StorePayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StorePayment_providerReference_key" ON "StorePayment"("providerReference");

-- CreateIndex
CREATE INDEX "StorePayment_accountId_status_idx" ON "StorePayment"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInvoice_paymentId_key" ON "StoreInvoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInvoice_number_key" ON "StoreInvoice"("number");

-- CreateIndex
CREATE INDEX "StoreOrderItem_orderId_idx" ON "StoreOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "StoreOrderItem_productId_idx" ON "StoreOrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_accountId_key" ON "Wallet"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_idempotencyKey_key" ON "WalletEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletEntry_walletId_createdAt_idx" ON "WalletEntry"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardAccount_accountId_key" ON "RewardAccount"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardEntry_idempotencyKey_key" ON "RewardEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardEntry_rewardAccountId_createdAt_idx" ON "RewardEntry"("rewardAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardEntry_expiresAt_idx" ON "RewardEntry"("expiresAt");

-- CreateIndex
CREATE INDEX "TripBriefing_tripId_status_idx" ON "TripBriefing"("tripId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TripBriefing_tripId_version_key" ON "TripBriefing"("tripId", "version");

-- CreateIndex
CREATE INDEX "BriefingMedia_briefingId_status_idx" ON "BriefingMedia"("briefingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BriefingMedia_briefingId_mediaKey_key" ON "BriefingMedia"("briefingId", "mediaKey");

-- CreateIndex
CREATE UNIQUE INDEX "DivePlan_tripId_version_key" ON "DivePlan"("tripId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyPlan_tripId_version_key" ON "EmergencyPlan"("tripId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "BriefingTranslation_briefingId_languageCode_key" ON "BriefingTranslation"("briefingId", "languageCode");

-- CreateIndex
CREATE INDEX "OfflineTripPackage_briefingId_status_idx" ON "OfflineTripPackage"("briefingId", "status");

-- CreateIndex
CREATE INDEX "LanguagePack_languageCode_status_idx" ON "LanguagePack"("languageCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LanguagePack_languageCode_version_key" ON "LanguagePack"("languageCode", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationPreference_accountId_key" ON "TranslationPreference"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyPhrase_key_key" ON "EmergencyPhrase"("key");

-- CreateIndex
CREATE INDEX "EmergencyPhrase_category_status_idx" ON "EmergencyPhrase"("category", "status");

-- CreateIndex
CREATE INDEX "EmergencyPhraseTranslation_languageCode_reviewedAt_idx" ON "EmergencyPhraseTranslation"("languageCode", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyPhraseTranslation_phraseId_languageCode_key" ON "EmergencyPhraseTranslation"("phraseId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "MarineAsset_calendarResourceId_key" ON "MarineAsset"("calendarResourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MarineAsset_registrationNumber_key" ON "MarineAsset"("registrationNumber");

-- CreateIndex
CREATE INDEX "MarineAsset_organizationId_status_idx" ON "MarineAsset"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MarineAssetDocument_marineAssetId_status_expiresAt_idx" ON "MarineAssetDocument"("marineAssetId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "MarineMaintenanceRecord_marineAssetId_status_dueAt_idx" ON "MarineMaintenanceRecord"("marineAssetId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "MarineReadinessSnapshot_marineAssetId_checkedAt_idx" ON "MarineReadinessSnapshot"("marineAssetId", "checkedAt");

-- CreateIndex
CREATE INDEX "MarineReadinessSnapshot_tripId_status_idx" ON "MarineReadinessSnapshot"("tripId", "status");

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_department_status_idx" ON "DocumentTemplate"("organizationId", "department", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_organizationId_code_version_key" ON "DocumentTemplate"("organizationId", "code", "version");

-- CreateIndex
CREATE INDEX "ManagedDocument_organizationId_department_status_idx" ON "ManagedDocument"("organizationId", "department", "status");

-- CreateIndex
CREATE INDEX "ManagedDocument_templateId_status_idx" ON "ManagedDocument"("templateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDocument_organizationId_referenceNumber_key" ON "ManagedDocument"("organizationId", "referenceNumber");

-- CreateIndex
CREATE INDEX "DocumentRevision_documentId_createdAt_idx" ON "DocumentRevision"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentRevision_createdByAccountId_createdAt_idx" ON "DocumentRevision"("createdByAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRevision_documentId_version_key" ON "DocumentRevision"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentLifecycleEvent_documentId_occurredAt_idx" ON "DocumentLifecycleEvent"("documentId", "occurredAt");

-- CreateIndex
CREATE INDEX "DocumentLifecycleEvent_actorAccountId_occurredAt_idx" ON "DocumentLifecycleEvent"("actorAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "DocumentReferenceCounter_organizationId_year_idx" ON "DocumentReferenceCounter"("organizationId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReferenceCounter_organizationId_department_year_key" ON "DocumentReferenceCounter"("organizationId", "department", "year");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocumentAsset" ADD CONSTRAINT "OrganizationDocumentAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBrandSnapshot" ADD CONSTRAINT "DocumentBrandSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiverProfile" ADD CONSTRAINT "DiverProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiverEquipment" ADD CONSTRAINT "DiverEquipment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationRequest" ADD CONSTRAINT "ActivationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationRequest" ADD CONSTRAINT "ActivationRequest_roleAssignmentId_fkey" FOREIGN KEY ("roleAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_activationRequestId_fkey" FOREIGN KEY ("activationRequestId") REFERENCES "ActivationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_licenseReviewSubmittedById_fkey" FOREIGN KEY ("licenseReviewSubmittedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_licenseReviewDecidedById_fkey" FOREIGN KEY ("licenseReviewDecidedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_licenseAssetId_fkey" FOREIGN KEY ("licenseAssetId") REFERENCES "OrganizationDocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AdministrativeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_assignedToAccountId_fkey" FOREIGN KEY ("assignedToAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_decidedByAccountId_fkey" FOREIGN KEY ("decidedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizerAccountId_fkey" FOREIGN KEY ("organizerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyControl" ADD CONSTRAINT "PolicyControl_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyChecklist" ADD CONSTRAINT "SafetyChecklist_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_reportedByAccountId_fkey" FOREIGN KEY ("reportedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_resolvedByAccountId_fkey" FOREIGN KEY ("resolvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_sourceTripId_fkey" FOREIGN KEY ("sourceTripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_sourceParticipantId_fkey" FOREIGN KEY ("sourceParticipantId") REFERENCES "BookingParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_verifiedByAccountId_fkey" FOREIGN KEY ("verifiedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_managerEmploymentId_fkey" FOREIGN KEY ("managerEmploymentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_fromOrgUnitId_fkey" FOREIGN KEY ("fromOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_toOrgUnitId_fkey" FOREIGN KEY ("toOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_fromPositionId_fkey" FOREIGN KEY ("fromPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_toPositionId_fkey" FOREIGN KEY ("toPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentMovement" ADD CONSTRAINT "EmploymentMovement_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCycle" ADD CONSTRAINT "PerformanceCycle_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRelationsCase" ADD CONSTRAINT "EmployeeRelationsCase_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRelationsCase" ADD CONSTRAINT "EmployeeRelationsCase_openedByAccountId_fkey" FOREIGN KEY ("openedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRelationsCase" ADD CONSTRAINT "EmployeeRelationsCase_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRelationsCase" ADD CONSTRAINT "EmployeeRelationsCase_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCase" ADD CONSTRAINT "CustomerCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CustomerCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceApproval" ADD CONSTRAINT "FinanceApproval_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_fromShiftId_fkey" FOREIGN KEY ("fromShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_toShiftId_fkey" FOREIGN KEY ("toShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ReceivableInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingStage" ADD CONSTRAINT "TrainingStage_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSkill" ADD CONSTRAINT "TrainingSkill_trainingStageId_fkey" FOREIGN KEY ("trainingStageId") REFERENCES "TrainingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorEarning" ADD CONSTRAINT "InstructorEarning_trainingEnrollmentId_fkey" FOREIGN KEY ("trainingEnrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreInvoice" ADD CONSTRAINT "StoreInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StorePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAccount" ADD CONSTRAINT "RewardAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_rewardAccountId_fkey" FOREIGN KEY ("rewardAccountId") REFERENCES "RewardAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBriefing" ADD CONSTRAINT "TripBriefing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefingMedia" ADD CONSTRAINT "BriefingMedia_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivePlan" ADD CONSTRAINT "DivePlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPlan" ADD CONSTRAINT "EmergencyPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefingTranslation" ADD CONSTRAINT "BriefingTranslation_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineTripPackage" ADD CONSTRAINT "OfflineTripPackage_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationPreference" ADD CONSTRAINT "TranslationPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPhraseTranslation" ADD CONSTRAINT "EmergencyPhraseTranslation_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "EmergencyPhrase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarineAssetDocument" ADD CONSTRAINT "MarineAssetDocument_marineAssetId_fkey" FOREIGN KEY ("marineAssetId") REFERENCES "MarineAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarineMaintenanceRecord" ADD CONSTRAINT "MarineMaintenanceRecord_marineAssetId_fkey" FOREIGN KEY ("marineAssetId") REFERENCES "MarineAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarineReadinessSnapshot" ADD CONSTRAINT "MarineReadinessSnapshot_marineAssetId_fkey" FOREIGN KEY ("marineAssetId") REFERENCES "MarineAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_signedByAccountId_fkey" FOREIGN KEY ("signedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_archivedByAccountId_fkey" FOREIGN KEY ("archivedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReferenceCounter" ADD CONSTRAINT "DocumentReferenceCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Exact raw SQL component: 20260915024500_equipment_barcode_inventory
CREATE TABLE "EquipmentBarcode" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "barcodeValue" TEXT NOT NULL,
  "qrValue" TEXT NOT NULL,
  "serialNumber" TEXT,
  "sku" TEXT,
  "location" TEXT,
  "stockStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentBarcode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentBarcode_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EquipmentBarcode_resourceId_key" ON "EquipmentBarcode"("resourceId");
CREATE UNIQUE INDEX "EquipmentBarcode_assetCode_key" ON "EquipmentBarcode"("assetCode");
CREATE UNIQUE INDEX "EquipmentBarcode_barcodeValue_key" ON "EquipmentBarcode"("barcodeValue");
CREATE UNIQUE INDEX "EquipmentBarcode_qrValue_key" ON "EquipmentBarcode"("qrValue");
CREATE INDEX "EquipmentBarcode_stockStatus_idx" ON "EquipmentBarcode"("stockStatus");
CREATE INDEX "EquipmentBarcode_serialNumber_idx" ON "EquipmentBarcode"("serialNumber");

CREATE TABLE "EquipmentMovement" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "fromLocation" TEXT,
  "toLocation" TEXT,
  "tripId" TEXT,
  "assignedAccountId" TEXT,
  "notes" TEXT,
  "actorAccountId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentMovement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EquipmentMovement_resourceId_occurredAt_idx" ON "EquipmentMovement"("resourceId","occurredAt");
CREATE INDEX "EquipmentMovement_tripId_idx" ON "EquipmentMovement"("tripId");
CREATE INDEX "EquipmentMovement_assignedAccountId_idx" ON "EquipmentMovement"("assignedAccountId");


-- Exact raw SQL component: 20260915031500_equipment_inspections
CREATE TABLE "EquipmentInspection" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceExpiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "reviewedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentInspection_status_check" CHECK ("status" IN ('PASS','REVIEW','FAIL'))
);

CREATE INDEX "EquipmentInspection_resourceId_inspectedAt_idx"
  ON "EquipmentInspection"("resourceId", "inspectedAt" DESC);

CREATE INDEX "EquipmentInspection_status_idx"
  ON "EquipmentInspection"("status");


-- Exact raw SQL component: 20260915042000_inventory_stocktake
CREATE TABLE "InventoryStocktake" (
  "id" TEXT PRIMARY KEY,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "startedByAccountId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedByAccountId" TEXT,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE "InventoryStocktakeScan" (
  "id" TEXT PRIMARY KEY,
  "stocktakeId" TEXT NOT NULL,
  "resourceId" TEXT,
  "scannedCode" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "expectedLocation" TEXT,
  "observedLocation" TEXT,
  "scannedByAccountId" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryStocktakeScan_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "InventoryStocktake"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "InventoryStocktakeScan_session_resource_key" ON "InventoryStocktakeScan"("stocktakeId","resourceId") WHERE "resourceId" IS NOT NULL;
CREATE INDEX "InventoryStocktake_status_idx" ON "InventoryStocktake"("status","startedAt");
CREATE INDEX "InventoryStocktakeScan_stocktake_idx" ON "InventoryStocktakeScan"("stocktakeId","scannedAt");


-- Exact raw SQL component: 20260915044000_inventory_asset_value
ALTER TABLE "EquipmentBarcode"
ADD COLUMN "acquisitionCostHalala" BIGINT;

ALTER TABLE "EquipmentBarcode"
ADD CONSTRAINT "EquipmentBarcode_acquisitionCostHalala_check"
CHECK ("acquisitionCostHalala" IS NULL OR "acquisitionCostHalala" >= 0);


-- Exact raw SQL component: 20260915045500_equipment_rentals
CREATE TABLE "EquipmentRental" (
  "id" TEXT PRIMARY KEY,
  "renterAccountId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "totalHalala" BIGINT NOT NULL DEFAULT 0,
  "invoiceNumber" TEXT NOT NULL UNIQUE,
  "whatsappPhone" TEXT,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdByAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentRental_status_check" CHECK ("status" IN ('RESERVED','ACTIVE','RETURNED','CANCELLED')),
  CONSTRAINT "EquipmentRental_payment_check" CHECK ("paymentStatus" IN ('PENDING','PAID','REFUNDED'))
);
CREATE INDEX "EquipmentRental_renter_idx" ON "EquipmentRental"("renterAccountId","createdAt" DESC);

CREATE TABLE "EquipmentRentalItem" (
  "id" TEXT PRIMARY KEY,
  "rentalId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "equipmentType" TEXT,
  "size" TEXT,
  "unitPriceHalala" BIGINT NOT NULL DEFAULT 0,
  "assetCodeSnapshot" TEXT NOT NULL,
  "equipmentNameSnapshot" TEXT NOT NULL,
  "serialNumberSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentRentalItem_rental_fk" FOREIGN KEY ("rentalId") REFERENCES "EquipmentRental"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "EquipmentRentalItem_rental_resource_uq" ON "EquipmentRentalItem"("rentalId","resourceId");
CREATE INDEX "EquipmentRentalItem_resource_idx" ON "EquipmentRentalItem"("resourceId");


-- Exact raw SQL component: 20260915052000_equipment_rental_returns
ALTER TABLE "EquipmentRentalItem"
  ADD COLUMN "returnedAt" TIMESTAMP(3),
  ADD COLUMN "returnCondition" TEXT,
  ADD COLUMN "returnNotes" TEXT;

ALTER TABLE "EquipmentRentalItem"
  ADD CONSTRAINT "EquipmentRentalItem_return_condition_check"
  CHECK ("returnCondition" IS NULL OR "returnCondition" IN ('OK','DAMAGED','REVIEW'));

CREATE INDEX "EquipmentRentalItem_returned_idx"
  ON "EquipmentRentalItem"("rentalId","returnedAt");


-- Exact raw SQL component: 20260915053500_equipment_rental_due_extensions
ALTER TABLE "EquipmentRental"
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "extensionRequestedUntil" TIMESTAMP(3),
  ADD COLUMN "extensionStatus" TEXT,
  ADD COLUMN "extensionRequestedAt" TIMESTAMP(3),
  ADD COLUMN "extensionReviewedAt" TIMESTAMP(3),
  ADD COLUMN "extensionReviewedByAccountId" TEXT,
  ADD COLUMN "returnIntentAt" TIMESTAMP(3);

ALTER TABLE "EquipmentRental"
  ADD CONSTRAINT "EquipmentRental_extension_status_check"
  CHECK ("extensionStatus" IS NULL OR "extensionStatus" IN ('PENDING','APPROVED','REJECTED'));

CREATE INDEX "EquipmentRental_due_idx" ON "EquipmentRental"("status","dueAt");
CREATE INDEX "EquipmentRental_extension_idx" ON "EquipmentRental"("extensionStatus","extensionRequestedAt");


-- Exact raw SQL component: 20260915054500_equipment_tag_profiles
ALTER TABLE "EquipmentBarcode"
  ADD COLUMN "tagMethod" TEXT NOT NULL DEFAULT 'ADHESIVE_LABEL',
  ADD COLUMN "tagPlacement" TEXT,
  ADD COLUMN "tagMaterial" TEXT,
  ADD COLUMN "tagNotes" TEXT;

ALTER TABLE "EquipmentBarcode"
  ADD CONSTRAINT "EquipmentBarcode_tag_method_check"
  CHECK ("tagMethod" IN ('ADHESIVE_LABEL','HANG_TAG','MICRO_QR','DATA_MATRIX','NFC_RFID'));

CREATE INDEX "EquipmentBarcode_tag_method_idx"
  ON "EquipmentBarcode"("tagMethod");


-- Exact raw SQL component: 20260915060000_equipment_rental_handover
ALTER TABLE "EquipmentRentalItem"
  ADD COLUMN "handedOverAt" TIMESTAMP(3);

UPDATE "EquipmentRentalItem" i
SET "handedOverAt" = r."paidAt"
FROM "EquipmentRental" r
WHERE i."rentalId" = r."id"
  AND r."status" IN ('ACTIVE','RETURNED')
  AND r."paidAt" IS NOT NULL;

CREATE INDEX "EquipmentRentalItem_rental_handover_idx"
  ON "EquipmentRentalItem"("rentalId","handedOverAt");


-- Exact raw SQL component: 20260925210500_trip_weather_runtime
CREATE TABLE "TripOperationalLocation" (
  "tripId" TEXT PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE,
  "locationName" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TripOperationalLocation_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
  CONSTRAINT "TripOperationalLocation_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
);

CREATE TABLE "TripWeatherReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId" TEXT NOT NULL REFERENCES "Trip"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "forecastAt" TIMESTAMPTZ NOT NULL,
  "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "snapshot" JSONB NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "reviewedByAccountId" TEXT REFERENCES "Account"("id") ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TripWeatherReview_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED'))
);

CREATE INDEX "TripWeatherReview_trip_fetched_idx" ON "TripWeatherReview" ("tripId", "fetchedAt" DESC);
CREATE INDEX "TripWeatherReview_trip_status_idx" ON "TripWeatherReview" ("tripId", "status", "fetchedAt" DESC);


-- Exact raw SQL component: 20260925224500_messaging_runtime
CREATE TABLE "Conversation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" TEXT,
  "createdByAccountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Conversation_title_length_check" CHECK ("title" IS NULL OR char_length("title") BETWEEN 1 AND 120)
);

CREATE TABLE "ConversationParticipant" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReadAt" TIMESTAMPTZ,
  CONSTRAINT "ConversationParticipant_unique" UNIQUE ("conversationId", "accountId")
);

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderAccountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
  "kind" TEXT NOT NULL DEFAULT 'TEXT',
  "body" TEXT,
  "mediaUrl" TEXT,
  "durationSec" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Message_kind_check" CHECK ("kind" IN ('TEXT','VOICE')),
  CONSTRAINT "Message_payload_check" CHECK (
    ("kind" = 'TEXT' AND "body" IS NOT NULL AND char_length(btrim("body")) BETWEEN 1 AND 4000 AND "mediaUrl" IS NULL AND "durationSec" IS NULL)
    OR
    ("kind" = 'VOICE' AND "body" IS NULL AND "mediaUrl" ~ '^https://[^[:space:]]+$' AND "durationSec" BETWEEN 1 AND 600)
  )
);

CREATE INDEX "Conversation_created_idx" ON "Conversation" ("createdAt" DESC);
CREATE INDEX "ConversationParticipant_account_idx" ON "ConversationParticipant" ("accountId", "joinedAt" DESC);
CREATE INDEX "Message_conversation_created_idx" ON "Message" ("conversationId", "createdAt" ASC);
CREATE INDEX "Message_sender_created_idx" ON "Message" ("senderAccountId", "createdAt" DESC);


-- Exact raw SQL component: 20260930080000_audit_event_append_only
-- Phase 4: make the application audit ledger append-only at the database boundary.
CREATE OR REPLACE FUNCTION "hydroland_reject_audit_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only; % is prohibited', TG_OP USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS "AuditEvent_append_only_row" ON "AuditEvent";
CREATE TRIGGER "AuditEvent_append_only_row"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "hydroland_reject_audit_mutation"();

DROP TRIGGER IF EXISTS "AuditEvent_append_only_truncate" ON "AuditEvent";
CREATE TRIGGER "AuditEvent_append_only_truncate"
BEFORE TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION "hydroland_reject_audit_mutation"();

