-- Private audio shares the native message lifecycle and its existing case holds.
DO $$
DECLARE message_type text; account_type text; conversation_type text;
BEGIN
 SELECT format_type(atttypid,atttypmod) INTO message_type FROM pg_attribute WHERE attrelid='"Message"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id';
 SELECT format_type(atttypid,atttypmod) INTO conversation_type FROM pg_attribute WHERE attrelid='"Conversation"'::regclass AND attname='id';
 EXECUTE format('CREATE TABLE "PrivateMessageAudio" (
   "messageId" %s PRIMARY KEY REFERENCES "Message"(id) ON DELETE CASCADE,
   "conversationId" %s NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
   "senderAccountId" %s NOT NULL REFERENCES "Account"(id) ON DELETE RESTRICT,
   "requestKey" text NOT NULL CHECK (length("requestKey") BETWEEN 16 AND 100),
   "mimeType" text NOT NULL CHECK ("mimeType"=''audio/wav''),
   "sha256" text NOT NULL CHECK (length("sha256")=64),
   "byteSize" integer NOT NULL CHECK ("byteSize" BETWEEN 45 AND 4194304),
   "durationMs" integer NOT NULL CHECK ("durationMs" BETWEEN 1 AND 120000),
   "content" bytea NOT NULL CHECK (octet_length(content)="byteSize"),
   "createdAt" timestamptz NOT NULL DEFAULT now(),
   UNIQUE ("senderAccountId","requestKey")
 )',message_type,conversation_type,account_type);
END $$;
CREATE INDEX "PrivateMessageAudio_sender_idx" ON "PrivateMessageAudio" ("senderAccountId");
