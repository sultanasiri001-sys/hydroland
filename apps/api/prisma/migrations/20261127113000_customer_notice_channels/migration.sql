BEGIN;

-- Optional customer channels remain disabled until provider policy is configured.
-- Existing inbox/email notices are preserved; no historical notices are backfilled.
CREATE TABLE "CustomerNoticePreference" (
  "accountId" TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  email BOOLEAN NOT NULL DEFAULT TRUE,
  sms BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  push BOOLEAN NOT NULL DEFAULT FALSE,
  bookings BOOLEAN NOT NULL DEFAULT TRUE,
  invoices BOOLEAN NOT NULL DEFAULT TRUE,
  "quietStart" INTEGER CHECK ("quietStart" BETWEEN 0 AND 1439),
  "quietEnd" INTEGER CHECK ("quietEnd" BETWEEN 0 AND 1439),
  "timeZone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  "phoneCiphertext" TEXT,
  "phoneHash" TEXT,
  "phoneProofId" TEXT,
  "phoneVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  CHECK (("quietStart" IS NULL AND "quietEnd" IS NULL) OR ("quietStart" IS NOT NULL AND "quietEnd" IS NOT NULL AND "quietStart" <> "quietEnd")),
  CHECK (("phoneCiphertext" IS NULL AND "phoneHash" IS NULL AND "phoneProofId" IS NULL AND "phoneVerifiedAt" IS NULL AND NOT sms AND NOT whatsapp)
    OR ("phoneCiphertext" IS NOT NULL AND "phoneHash" IS NOT NULL AND "phoneProofId" IS NOT NULL AND "phoneVerifiedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "CustomerNoticePreference_phoneHash_key" ON "CustomerNoticePreference"("phoneHash");

CREATE TABLE "CustomerPhoneChallenge" (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "preferenceRevision" INTEGER NOT NULL CHECK ("preferenceRevision" > 0),
  "phoneCiphertext" TEXT NOT NULL,
  "phoneHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('RESERVED','SENT','CONSUMED','EXPIRED','REVIEW_REQUIRED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);
CREATE INDEX "CustomerPhoneChallenge_account_created" ON "CustomerPhoneChallenge"("accountId","createdAt");
CREATE INDEX "CustomerPhoneChallenge_phone_created" ON "CustomerPhoneChallenge"("phoneHash","createdAt");

CREATE TABLE "CustomerChannelBudget" (
  month TEXT NOT NULL CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  channel TEXT NOT NULL CHECK (channel IN ('SMS','WHATSAPP','PUSH')),
  "reservedHalalas" INTEGER NOT NULL CHECK ("reservedHalalas" >= 0),
  PRIMARY KEY (month, channel)
);
CREATE TABLE "CustomerChannelDispatch" (
  id TEXT PRIMARY KEY,
  "notificationId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('BOOKING_CONFIRMED','INVOICE_ISSUED')),
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('SMS','WHATSAPP','PUSH')),
  "preferenceRevision" INTEGER NOT NULL CHECK ("preferenceRevision" > 0),
  "bindingId" TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','RESERVED','PROVIDER_ACCEPTED','PROVIDER_DELIVERED','PUSH_SERVICE_CONFIRMED','SUPPRESSED','PROVIDER_REJECTED','REVIEW_REQUIRED')),
  reason TEXT,
  "recipientHash" TEXT,
  "providerId" TEXT,
  "providerScope" TEXT,
  "submittedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  "receiptChecks" INTEGER NOT NULL DEFAULT 0 CHECK ("receiptChecks" BETWEEN 0 AND 12),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  UNIQUE (event,"sourceType","sourceId","accountId",channel,"bindingId")
);
CREATE INDEX "CustomerChannelDispatch_pending" ON "CustomerChannelDispatch"(state,"nextAttemptAt");
CREATE UNIQUE INDEX "CustomerChannelDispatch_provider_key" ON "CustomerChannelDispatch"(channel,"providerScope","providerId") WHERE "providerId" IS NOT NULL;
CREATE UNIQUE INDEX "CustomerChannelDispatch_phone_event" ON "CustomerChannelDispatch"(event,"sourceType","sourceId","accountId",channel) WHERE channel <> 'PUSH';
CREATE UNIQUE INDEX "CustomerChannelDispatch_push_event" ON "CustomerChannelDispatch"(event,"sourceType","sourceId","accountId","recipientHash") WHERE channel = 'PUSH';

-- Only these empty new identity columns adapt to the deployed Account key type.
DO $$ DECLARE account_type TEXT; t TEXT; BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO account_type FROM pg_attribute a
    WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND a.attnum>0;
  IF account_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported Account identity type'; END IF;
  FOREACH t IN ARRAY ARRAY['CustomerNoticePreference','CustomerPhoneChallenge','CustomerChannelDispatch'] LOOP
    IF account_type='uuid' THEN EXECUTE format('ALTER TABLE %I ALTER COLUMN "accountId" TYPE uuid USING "accountId"::uuid',t); END IF;
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT',t,t||'_account_fkey');
  END LOOP;
END $$;

ALTER TABLE "Session" ADD COLUMN "pushRegistrationId" TEXT;
CREATE UNIQUE INDEX "Session_pushRegistrationId_key" ON "Session"("pushRegistrationId");
-- Re-enrollment is required for historical device tokens: do not manufacture consent.
CREATE OR REPLACE FUNCTION hl_forget_revoked_push_token() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."revokedAt" IS NOT NULL OR NEW."pushTokenHash" IS NULL OR NEW."pushTokenCiphertext" IS NULL THEN
    NEW."pushRegistrationId" := NULL;
  END IF;
  IF NEW."revokedAt" IS NOT NULL THEN
    NEW."pushTokenHash" := NULL;
    NEW."pushTokenCiphertext" := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION hl_queue_customer_channels() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p "CustomerNoticePreference"%ROWTYPE; kind TEXT; source_key TEXT; channel_name TEXT; device RECORD;
BEGIN
  SELECT * INTO p FROM "CustomerNoticePreference" WHERE "accountId"::text=NEW."accountId"::text;
  IF NOT FOUND OR NEW."createdAt" < p."createdAt" THEN RETURN NEW; END IF;
  IF NEW.type='BOOKING_CONFIRMED' AND p.bookings THEN
    SELECT 'BOOKING', b.id::text INTO kind,source_key FROM "Booking" b
      WHERE b.id::text=NEW.payload->>'bookingId' AND b."accountId"::text=NEW."accountId"::text AND b.status='CONFIRMED';
  ELSIF NEW.type='INVOICE_ISSUED' AND p.invoices THEN
    SELECT e."sourceType",e."sourceId" INTO kind,source_key FROM "CustomerNoticeEmail" e
      WHERE e.event='INVOICE_ISSUED' AND e."accountId"::text=NEW."accountId"::text
        AND e."sourceType"=NEW.payload->>'sourceType' AND e."sourceId"=NEW.payload->>'sourceId';
  END IF;
  IF kind IS NULL OR source_key IS NULL THEN RETURN NEW; END IF;
  FOREACH channel_name IN ARRAY ARRAY['SMS','WHATSAPP'] LOOP
    IF p."phoneProofId" IS NOT NULL AND ((channel_name='SMS' AND p.sms) OR (channel_name='WHATSAPP' AND p.whatsapp)) THEN
      INSERT INTO "CustomerChannelDispatch"(id,"notificationId","accountId",event,"sourceType","sourceId",channel,"preferenceRevision","bindingId","recipientHash")
        VALUES(gen_random_uuid()::text,NEW.id::text,p."accountId",NEW.type,kind,source_key,channel_name,p.revision,p."phoneProofId",p."phoneHash")
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  IF p.push THEN
    FOR device IN SELECT "pushRegistrationId","pushTokenHash" FROM "Session"
      WHERE "accountId"::text=NEW."accountId"::text AND "revokedAt" IS NULL AND "expiresAt">timezone('UTC',CURRENT_TIMESTAMP)
        AND "pushRegistrationId" IS NOT NULL AND "pushTokenHash" IS NOT NULL AND "pushTokenCiphertext" IS NOT NULL AND "tokenHash" NOT LIKE 'mfa:%'
    LOOP
      INSERT INTO "CustomerChannelDispatch"(id,"notificationId","accountId",event,"sourceType","sourceId",channel,"preferenceRevision","bindingId","recipientHash")
        VALUES(gen_random_uuid()::text,NEW.id::text,p."accountId",NEW.type,kind,source_key,'PUSH',p.revision,device."pushRegistrationId",device."pushTokenHash")
        ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hl_customer_channels AFTER INSERT ON "Notification" FOR EACH ROW
  WHEN (NEW.type IN ('BOOKING_CONFIRMED','INVOICE_ISSUED')) EXECUTE FUNCTION hl_queue_customer_channels();
COMMIT;
