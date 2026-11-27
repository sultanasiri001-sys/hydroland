-- No retention duration, moderator, source approval, or activation is seeded.
CREATE TABLE "CommunityPostLifecycle" (
 "postId" text PRIMARY KEY,
 "withdrawnAt" timestamptz,
 "purgeAfter" timestamptz,
 "policyDocumentId" text,
 "policyVersion" integer,
 "policyHash" text,
 "retentionDays" integer CHECK ("retentionDays" BETWEEN 1 AND 3650)
);
CREATE TABLE "CommunityPostRevision" (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "postId" text NOT NULL,
 "changedByAccountId" text NOT NULL,
 title text NOT NULL, body text NOT NULL,
 "previousStatus" text NOT NULL,
 "recordedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "CommunityPostRevision_post" ON "CommunityPostRevision" ("postId");
CREATE TABLE "CommunityPostReport" (
 "caseId" text PRIMARY KEY,
 "postId" text NOT NULL,
 "reporterId" text NOT NULL,
 "reportedTitle" text NOT NULL,
 "reportedBody" text NOT NULL,
 "releasePersonId" text,
 "releasedAt" timestamptz,
 UNIQUE ("postId","reporterId")
);
CREATE INDEX "CommunityPostReport_hold" ON "CommunityPostReport" ("postId") WHERE "releasedAt" IS NULL;
