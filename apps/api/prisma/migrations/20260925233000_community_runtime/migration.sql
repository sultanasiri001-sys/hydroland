CREATE TYPE "CommunityPostStatus" AS ENUM ('PENDING_REVIEW','PUBLISHED','REJECTED','ARCHIVED');
CREATE TYPE "CommunityEventStatus" AS ENUM ('DRAFT','PUBLISHED','CANCELLED','COMPLETED');
CREATE TYPE "CommunityVolunteerStatus" AS ENUM ('REGISTERED','CANCELLED','ATTENDED','REJECTED');
CREATE TYPE "CommunityEngagementType" AS ENUM ('CONSULTATION','MEETING');
CREATE TYPE "CommunityEngagementStatus" AS ENUM ('OPEN','UNDER_REVIEW','SCHEDULED','RESOLVED','REJECTED','CANCELLED');

CREATE TABLE "CommunityPost" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorAccountId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "CommunityPostStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewedByAccountId" TEXT,
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "publishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CommunityPost_title_length_check" CHECK (char_length(btrim("title")) BETWEEN 3 AND 160),
  CONSTRAINT "CommunityPost_body_length_check" CHECK (char_length(btrim("body")) BETWEEN 3 AND 5000),
  CONSTRAINT "CommunityPost_review_notes_length_check" CHECK ("reviewNotes" IS NULL OR char_length(btrim("reviewNotes")) <= 2000)
);

CREATE TABLE "CommunityEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdByAccountId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "locationName" TEXT NOT NULL,
  "startsAt" TIMESTAMPTZ NOT NULL,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "capacity" INTEGER,
  "status" "CommunityEventStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CommunityEvent_title_length_check" CHECK (char_length(btrim("title")) BETWEEN 3 AND 160),
  CONSTRAINT "CommunityEvent_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 3 AND 5000),
  CONSTRAINT "CommunityEvent_location_length_check" CHECK (char_length(btrim("locationName")) BETWEEN 3 AND 160),
  CONSTRAINT "CommunityEvent_timing_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "CommunityEvent_capacity_check" CHECK ("capacity" IS NULL OR "capacity" BETWEEN 1 AND 100000)
);

CREATE TABLE "CommunityVolunteerRegistration" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" "CommunityVolunteerStatus" NOT NULL DEFAULT 'REGISTERED',
  "approvedMinutes" INTEGER,
  "reviewNotes" TEXT,
  "reviewedByAccountId" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "attendedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CommunityVolunteerRegistration_unique" UNIQUE ("eventId","accountId"),
  CONSTRAINT "CommunityVolunteerRegistration_minutes_check" CHECK ("approvedMinutes" IS NULL OR "approvedMinutes" BETWEEN 1 AND 1440),
  CONSTRAINT "CommunityVolunteerRegistration_notes_length_check" CHECK ("reviewNotes" IS NULL OR char_length(btrim("reviewNotes")) <= 2000)
);

CREATE TABLE "CommunityEngagementRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requesterAccountId" TEXT NOT NULL,
  "type" "CommunityEngagementType" NOT NULL,
  "status" "CommunityEngagementStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requestedFor" TIMESTAMPTZ,
  "scheduledAt" TIMESTAMPTZ,
  "decisionNotes" TEXT,
  "decidedByAccountId" TEXT,
  "decidedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CommunityEngagementRequest_subject_length_check" CHECK (char_length(btrim("subject")) BETWEEN 3 AND 160),
  CONSTRAINT "CommunityEngagementRequest_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 3 AND 5000),
  CONSTRAINT "CommunityEngagementRequest_notes_length_check" CHECK ("decisionNotes" IS NULL OR char_length(btrim("decisionNotes")) <= 2000)
);

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorAccountId_fkey" FOREIGN KEY ("authorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityVolunteerRegistration" ADD CONSTRAINT "CommunityVolunteerRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityVolunteerRegistration" ADD CONSTRAINT "CommunityVolunteerRegistration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityVolunteerRegistration" ADD CONSTRAINT "CommunityVolunteerRegistration_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityEngagementRequest" ADD CONSTRAINT "CommunityEngagementRequest_requesterAccountId_fkey" FOREIGN KEY ("requesterAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityEngagementRequest" ADD CONSTRAINT "CommunityEngagementRequest_decidedByAccountId_fkey" FOREIGN KEY ("decidedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CommunityPost_status_publishedAt_idx" ON "CommunityPost" ("status","publishedAt" DESC);
CREATE INDEX "CommunityPost_author_createdAt_idx" ON "CommunityPost" ("authorAccountId","createdAt" DESC);
CREATE INDEX "CommunityEvent_status_startsAt_idx" ON "CommunityEvent" ("status","startsAt" ASC);
CREATE INDEX "CommunityEvent_creator_createdAt_idx" ON "CommunityEvent" ("createdByAccountId","createdAt" DESC);
CREATE INDEX "CommunityVolunteerRegistration_account_status_createdAt_idx" ON "CommunityVolunteerRegistration" ("accountId","status","createdAt" DESC);
CREATE INDEX "CommunityVolunteerRegistration_event_status_createdAt_idx" ON "CommunityVolunteerRegistration" ("eventId","status","createdAt" DESC);
CREATE INDEX "CommunityEngagementRequest_requester_status_createdAt_idx" ON "CommunityEngagementRequest" ("requesterAccountId","status","createdAt" DESC);
CREATE INDEX "CommunityEngagementRequest_status_type_createdAt_idx" ON "CommunityEngagementRequest" ("status","type","createdAt" DESC);
