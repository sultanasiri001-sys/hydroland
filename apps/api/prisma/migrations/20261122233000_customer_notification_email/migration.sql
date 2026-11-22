BEGIN;
CREATE TABLE IF NOT EXISTS "CustomerNoticeEmail" (
  id TEXT PRIMARY KEY, event TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3), "recipientHash" TEXT, "providerMessageId" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerNoticeEmail_event_sourceType_sourceId_accountId_key"
  ON "CustomerNoticeEmail"(event,"sourceType","sourceId","accountId");
CREATE INDEX IF NOT EXISTS "CustomerNoticeEmail_state_nextAttemptAt_idx" ON "CustomerNoticeEmail"(state,"nextAttemptAt");

-- Booking management already writes exactly one customer inbox notification on confirmation.
CREATE FUNCTION hl_queue_booking_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "CustomerNoticeEmail"(id,event,"sourceType","sourceId","accountId")
    SELECT gen_random_uuid()::text,'BOOKING_CONFIRMED','BOOKING',b.id::text,b."accountId"::text
    FROM "Booking" b WHERE b.id::text=NEW.payload->>'bookingId' AND b."accountId"::text=NEW."accountId"::text AND b.status='CONFIRMED'
    ON CONFLICT (event,"sourceType","sourceId","accountId") DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER hl_booking_email AFTER INSERT ON "Notification" FOR EACH ROW
  WHEN (NEW.type='BOOKING_CONFIRMED') EXECUTE FUNCTION hl_queue_booking_email();

-- The original PDF and a native issue transition can describe the same invoice.
CREATE FUNCTION hl_notify_invoice(source_kind text, source_key text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  buyer text;
  buyer_org text;
  recipient "Notification"."accountId"%TYPE;
  mail_id text;
BEGIN
  CASE source_kind
    WHEN 'TRIP_PAYMENT' THEN
      SELECT p."accountId"::text, COALESCE(p."contractSnapshot"#>>'{organizationPaymentAuthorization,buyerOrganizationId}',
        p."contractSnapshot"->>'buyerOrganizationId',b."organizationId"::text)
      INTO buyer,buyer_org FROM "Payment" p JOIN "Booking" b ON b.id=p."bookingId" WHERE p.id::text=source_key;
    WHEN 'STORE_ORDER' THEN
      SELECT "accountId"::text INTO buyer FROM "StoreOrder" WHERE id::text=source_key;
    WHEN 'INSTRUCTOR_SERVICE' THEN
      SELECT "centerOrganizationId"::text INTO buyer_org FROM "InstructorEarning" WHERE id::text=source_key AND status<>'VOIDED';
    ELSE
      SELECT "customerAccountId"::text INTO buyer FROM "CommerceCollectionEvidence"
        WHERE "sourceType"=source_kind AND "sourceId"::text=source_key AND source_kind IN ('TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','RENTAL_DAMAGE');
  END CASE;
  IF buyer_org IS NOT NULL THEN
    -- One intended organizational recipient, with actual purchase access. Never send to the initiating employee by default.
    SELECT o."ownerId" INTO recipient FROM "Organization" o
      JOIN "OrganizationMember" m ON m."organizationId"=o.id AND m."accountId"=o."ownerId" AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN')
      JOIN "RoleAssignment" a ON a."accountId"=m."accountId" AND a.status='ACTIVE'
      WHERE o.id::text=buyer_org AND o.status='ACTIVE' AND a.role::text=CASE WHEN o.kind='MARINE_OPERATOR' THEN 'BOAT_OWNER'
        WHEN o.kind ILIKE '%DIVE%' OR o.kind ILIKE '%CENTER%' THEN 'DIVE_CENTER' ELSE 'ORGANIZATION' END;
  ELSE
    SELECT id INTO recipient FROM "Account" WHERE id::text=buyer;
  END IF;
  IF recipient IS NULL THEN RETURN; END IF;
  INSERT INTO "CustomerNoticeEmail"(id,event,"sourceType","sourceId","accountId")
    VALUES(gen_random_uuid()::text,'INVOICE_ISSUED',source_kind,source_key,recipient::text)
    ON CONFLICT (event,"sourceType","sourceId","accountId") DO NOTHING RETURNING id INTO mail_id;
  IF mail_id IS NOT NULL THEN
    INSERT INTO "Notification"(id,"accountId",type,status,"sentAt","createdAt",payload)
      VALUES(gen_random_uuid(),recipient,'INVOICE_ISSUED','SENT',timezone('UTC', CURRENT_TIMESTAMP),timezone('UTC', CURRENT_TIMESTAMP),
        jsonb_build_object('title','صدرت فاتورتك','message','يمكنك فتح الفاتورة من حسابك في هيدرولاند.','sourceType',source_kind,'sourceId',source_key));
  END IF;
END $$;

CREATE FUNCTION hl_invoice_notice_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE order_key text;
BEGIN
  IF TG_TABLE_NAME='AccountInvoiceDocument' THEN
    PERFORM hl_notify_invoice(NEW."sourceType",NEW."sourceId");
  ELSIF TG_TABLE_NAME='Invoice' THEN
    PERFORM hl_notify_invoice('TRIP_PAYMENT',NEW."paymentId"::text);
  ELSE
    SELECT "orderId"::text INTO order_key FROM "StorePayment" WHERE id=NEW."paymentId";
    PERFORM hl_notify_invoice('STORE_ORDER',order_key);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hl_invoice_pdf AFTER INSERT ON "AccountInvoiceDocument" FOR EACH ROW EXECUTE FUNCTION hl_invoice_notice_event();
CREATE TRIGGER hl_trip_invoice_issue AFTER INSERT OR UPDATE OF status ON "Invoice" FOR EACH ROW
  WHEN (NEW.status IN ('ISSUED','PAID')) EXECUTE FUNCTION hl_invoice_notice_event();
CREATE TRIGGER hl_store_invoice_issue AFTER INSERT OR UPDATE OF status ON "StoreInvoice" FOR EACH ROW
  WHEN (NEW.status IN ('ISSUED','PAID')) EXECUTE FUNCTION hl_invoice_notice_event();
COMMIT;
