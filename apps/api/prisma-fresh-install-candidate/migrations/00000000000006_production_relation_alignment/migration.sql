-- Candidate-only alignment to validated production FK update actions.
-- Preserves data, parents and delete actions; rejects unexpected pre-state.
BEGIN;
LOCK TABLE "Account","ActivationRequest","AuditEvent","Booking","Credential","Document","Invoice","Notification","Organization","OrganizationMember","Payment","ProfessionalProfile","ReviewDecision","RoleAssignment","SafetyChecklist","Session" IN ACCESS EXCLUSIVE MODE;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Account"'::regclass AND conname='Account_personId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Account_personId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ActivationRequest"'::regclass AND conname='ActivationRequest_applicantId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("applicantId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: ActivationRequest_applicantId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ActivationRequest"'::regclass AND conname='ActivationRequest_roleAssignmentId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("roleAssignmentId") REFERENCES "RoleAssignment"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: ActivationRequest_roleAssignmentId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"AuditEvent"'::regclass AND conname='AuditEvent_actorId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("actorId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: AuditEvent_actorId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Booking"'::regclass AND conname='Booking_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Booking_accountId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Booking"'::regclass AND conname='Booking_tripId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Booking_tripId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Credential"'::regclass AND conname='Credential_personId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Credential_personId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Document"'::regclass AND conname='Document_credentialId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("credentialId") REFERENCES "Credential"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Document_credentialId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Invoice"'::regclass AND conname='Invoice_paymentId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Invoice_paymentId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Notification"'::regclass AND conname='Notification_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Notification_accountId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Organization"'::regclass AND conname='Organization_ownerId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("ownerId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Organization_ownerId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"OrganizationMember"'::regclass AND conname='OrganizationMember_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: OrganizationMember_accountId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"OrganizationMember"'::regclass AND conname='OrganizationMember_organizationId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: OrganizationMember_organizationId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Payment"'::regclass AND conname='Payment_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Payment_accountId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Payment"'::regclass AND conname='Payment_bookingId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Payment_bookingId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ProfessionalProfile"'::regclass AND conname='ProfessionalProfile_personId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: ProfessionalProfile_personId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ReviewDecision"'::regclass AND conname='ReviewDecision_activationRequestId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("activationRequestId") REFERENCES "ActivationRequest"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: ReviewDecision_activationRequestId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ReviewDecision"'::regclass AND conname='ReviewDecision_reviewerId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("reviewerId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: ReviewDecision_reviewerId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"RoleAssignment"'::regclass AND conname='RoleAssignment_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: RoleAssignment_accountId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"SafetyChecklist"'::regclass AND conname='SafetyChecklist_tripId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON UPDATE CASCADE ON DELETE RESTRICT') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: SafetyChecklist_tripId_fkey'; END IF;
END $guard$;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"Session"'::regclass AND conname='Session_accountId_fkey' AND contype='f' AND convalidated AND pg_get_constraintdef(oid,true)='FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE CASCADE') THEN RAISE EXCEPTION 'Unexpected candidate FK pre-state: Session_accountId_fkey'; END IF;
END $guard$;
ALTER TABLE "Account" DROP CONSTRAINT "Account_personId_fkey";
ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"(id) ON DELETE RESTRICT;
ALTER TABLE "ActivationRequest" DROP CONSTRAINT "ActivationRequest_applicantId_fkey";
ALTER TABLE "ActivationRequest" ADD CONSTRAINT "ActivationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "ActivationRequest" DROP CONSTRAINT "ActivationRequest_roleAssignmentId_fkey";
ALTER TABLE "ActivationRequest" ADD CONSTRAINT "ActivationRequest_roleAssignmentId_fkey" FOREIGN KEY ("roleAssignmentId") REFERENCES "RoleAssignment"(id) ON DELETE RESTRICT;
ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_actorId_fkey";
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"(id) ON DELETE RESTRICT;
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_accountId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_tripId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON DELETE RESTRICT;
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_personId_fkey";
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"(id) ON DELETE RESTRICT;
ALTER TABLE "Document" DROP CONSTRAINT "Document_credentialId_fkey";
ALTER TABLE "Document" ADD CONSTRAINT "Document_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"(id) ON DELETE RESTRICT;
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_paymentId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON DELETE RESTRICT;
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_accountId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_ownerId_fkey";
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_accountId_fkey";
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_organizationId_fkey";
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE RESTRICT;
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_accountId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE RESTRICT;
ALTER TABLE "ProfessionalProfile" DROP CONSTRAINT "ProfessionalProfile_personId_fkey";
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"(id) ON DELETE RESTRICT;
ALTER TABLE "ReviewDecision" DROP CONSTRAINT "ReviewDecision_activationRequestId_fkey";
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_activationRequestId_fkey" FOREIGN KEY ("activationRequestId") REFERENCES "ActivationRequest"(id) ON DELETE RESTRICT;
ALTER TABLE "ReviewDecision" DROP CONSTRAINT "ReviewDecision_reviewerId_fkey";
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "RoleAssignment" DROP CONSTRAINT "RoleAssignment_accountId_fkey";
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT;
ALTER TABLE "SafetyChecklist" DROP CONSTRAINT "SafetyChecklist_tripId_fkey";
ALTER TABLE "SafetyChecklist" ADD CONSTRAINT "SafetyChecklist_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON DELETE RESTRICT;
ALTER TABLE "Session" DROP CONSTRAINT "Session_accountId_fkey";
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE CASCADE;
COMMIT;
