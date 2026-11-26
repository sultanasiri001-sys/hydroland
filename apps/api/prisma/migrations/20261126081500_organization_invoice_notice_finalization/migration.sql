-- An organizational PDF is awaiting its supplier accountant's approval while
-- the native Invoice is DRAFT. The atomic finalization changes it to PAID and
-- the existing native-issue trigger then queues one inbox/email notification.
-- Existing issued invoices, personal purchases and store notices retain their behavior.
BEGIN;
CREATE OR REPLACE FUNCTION hl_notify_invoice(source_kind text, source_key text) RETURNS void LANGUAGE plpgsql AS $$
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
  IF source_kind='TRIP_PAYMENT' AND buyer_org IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Invoice" i WHERE i."paymentId"::text=source_key AND i.status IN ('ISSUED','PAID')
  ) THEN
    RETURN;
  END IF;
  IF buyer_org IS NOT NULL THEN
    -- One intended organizational recipient, with actual purchase access.
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
COMMIT;
