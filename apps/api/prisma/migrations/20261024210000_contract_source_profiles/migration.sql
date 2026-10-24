-- Nullable additions to the existing canonical profile owners. No copied member tables.
ALTER TABLE "Organization" ADD COLUMN "address" TEXT, ADD COLUMN "trainingMembershipReference" TEXT;
ALTER TABLE "ProfessionalProfile" ADD COLUMN "nationalLicenseCredentialId" TEXT, ADD COLUMN "qualificationCredentialId" TEXT, ADD COLUMN "eligibilityEvidenceReference" TEXT;
