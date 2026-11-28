-- Additive F03 storage. No program, terms, adoption, consent or approval is seeded.
-- Native keys in historical installations can be TEXT or UUID. Preserve their
-- exact types instead of guessing or converting existing identities.
DO $$
DECLARE account_type text; organization_type text; document_type text; event_type text; registration_type text;
BEGIN
 SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO organization_type FROM pg_attribute WHERE attrelid='"Organization"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO document_type FROM pg_attribute WHERE attrelid='"ManagedDocument"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO event_type FROM pg_attribute WHERE attrelid='"CommunityEvent"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO registration_type FROM pg_attribute WHERE attrelid='"CommunityVolunteerRegistration"'::regclass AND attname='id';
 EXECUTE format('CREATE TABLE "CommunityProgram" (
 id text PRIMARY KEY,
 "documentId" %s NOT NULL REFERENCES "ManagedDocument"(id) ON DELETE RESTRICT,
 "organizationId" %s NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version>0), "contentHash" text NOT NULL, "sourceHash" text NOT NULL,
 "ownerAccountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
 "adoptedByAccountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
 "adoptedAt" timestamptz NOT NULL DEFAULT now(), state text NOT NULL DEFAULT ''ACTIVE'' CHECK(state IN (''ACTIVE'',''WITHDRAWN'')),
 UNIQUE("documentId",version)
 )',document_type,organization_type,account_type,account_type);
 EXECUTE format('CREATE TABLE "CommunityEventProgram" (
 "eventId" %s PRIMARY KEY REFERENCES "CommunityEvent"(id) ON DELETE CASCADE,
 "programId" text NOT NULL REFERENCES "CommunityProgram"(id) ON DELETE RESTRICT,
 activity text NOT NULL CHECK(activity IN (''ACADEMY'',''ENVIRONMENT'',''VOLUNTEER''))
 )',event_type);
 EXECUTE format('CREATE TABLE "CommunityVolunteerConsent" (
 "registrationId" %s PRIMARY KEY REFERENCES "CommunityVolunteerRegistration"(id) ON DELETE CASCADE,
 "programId" text NOT NULL REFERENCES "CommunityProgram"(id) ON DELETE RESTRICT,
 "sourceHash" text NOT NULL, "consentedAt" timestamptz NOT NULL DEFAULT now()
 )',registration_type);
 EXECUTE format('CREATE TABLE "CommunityBuddyMembership" (
 id text PRIMARY KEY,
 "programId" text NOT NULL REFERENCES "CommunityProgram"(id) ON DELETE RESTRICT,
 "accountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
 "sourceHash" text NOT NULL, alias text NOT NULL CHECK(char_length(alias) BETWEEN 3 AND 60), region text NOT NULL CHECK(char_length(region) BETWEEN 3 AND 80),
 state text NOT NULL DEFAULT ''ACTIVE'' CHECK(state IN (''ACTIVE'',''WITHDRAWN'')),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 "consentedAt" timestamptz NOT NULL DEFAULT now(),"withdrawnAt" timestamptz,
 UNIQUE("programId","accountId")
 )',account_type);
 EXECUTE format('CREATE TABLE "CommunityBuddyRequest" (
 id text PRIMARY KEY,"programId" text NOT NULL REFERENCES "CommunityProgram"(id) ON DELETE RESTRICT,
 "requesterAccountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
 "recipientAccountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
 "requesterMembershipId" text NOT NULL REFERENCES "CommunityBuddyMembership"(id) ON DELETE RESTRICT,
 "recipientMembershipId" text NOT NULL REFERENCES "CommunityBuddyMembership"(id) ON DELETE RESTRICT,
 "requesterRevision" integer NOT NULL CHECK("requesterRevision">0),"recipientRevision" integer NOT NULL CHECK("recipientRevision">0),
 "sourceHash" text NOT NULL,"pairKey" text NOT NULL,"requestKey" text NOT NULL,"requestDigest" text NOT NULL,
 status text NOT NULL DEFAULT ''PENDING'' CHECK(status IN (''PENDING'',''ACCEPTED'',''DECLINED'',''WITHDRAWN'')),
 "createdAt" timestamptz NOT NULL DEFAULT now(),"respondedAt" timestamptz,
 CHECK("requesterAccountId"<>"recipientAccountId"),CHECK("requesterMembershipId"<>"recipientMembershipId"),
 UNIQUE("requesterAccountId","requestKey")
 )',account_type,account_type);
END $$;
CREATE UNIQUE INDEX "CommunityBuddyRequest_current_pair" ON "CommunityBuddyRequest"("programId","pairKey") WHERE status IN ('PENDING','ACCEPTED');
CREATE INDEX "CommunityBuddyMembership_program_state" ON "CommunityBuddyMembership"("programId",state);
CREATE INDEX "CommunityBuddyRequest_recipient_created" ON "CommunityBuddyRequest"("recipientAccountId","createdAt");
CREATE INDEX "CommunityBuddyRequest_requester_created" ON "CommunityBuddyRequest"("requesterAccountId","createdAt");
CREATE INDEX "CommunityEventProgram_program" ON "CommunityEventProgram"("programId");
