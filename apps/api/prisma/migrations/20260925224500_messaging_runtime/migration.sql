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
