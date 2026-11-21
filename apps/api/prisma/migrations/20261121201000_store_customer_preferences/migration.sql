-- Preserve the actual native types of both keys on older installations.
CREATE TABLE "StoreProductPreference" AS
  SELECT a.id AS "accountId", p.id AS "productId"
  FROM "Account" a CROSS JOIN "StoreProduct" p WITH NO DATA;
ALTER TABLE "StoreProductPreference"
  ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stockAlert" BOOLEAN NOT NULL DEFAULT false,
  ADD PRIMARY KEY ("accountId","productId"),
  ADD FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE CASCADE,
  ADD FOREIGN KEY ("productId") REFERENCES "StoreProduct"(id) ON DELETE CASCADE;
CREATE INDEX "StoreProductPreference_productId_stockAlert_idx" ON "StoreProductPreference" ("productId","stockAlert");

CREATE FUNCTION hydroland_store_restock_notice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'ACTIVE' OR NEW."stockQuantity" < 1
     OR (OLD.status = 'ACTIVE' AND OLD."stockQuantity" > 0) THEN RETURN NEW; END IF;
  IF NEW."organizationId" IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM "Organization" o WHERE o.id = NEW."organizationId" AND o.status='ACTIVE') THEN RETURN NEW; END IF;
  WITH delivered AS (
    UPDATE "StoreProductPreference" SET "stockAlert"=false
    WHERE "productId"=NEW.id AND "stockAlert" RETURNING "accountId"
  ) INSERT INTO "Notification" (id,"accountId",type,payload,status,"sentAt","createdAt")
    SELECT gen_random_uuid(),d."accountId",'STORE_PRODUCT_BACK_IN_STOCK',
      jsonb_build_object('title','توفر منتج تتابعه','message',NEW."nameAr",'productId',NEW.id,'sku',NEW.sku),
      'SENT',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM delivered d JOIN "Account" a ON a.id=d."accountId" AND a.status='ACTIVE';
  DELETE FROM "StoreProductPreference" WHERE "productId"=NEW.id AND NOT favorite AND NOT "stockAlert";
  RETURN NEW;
END $$;
CREATE TRIGGER hydroland_store_restock_notice AFTER UPDATE OF "stockQuantity",status ON "StoreProduct"
  FOR EACH ROW EXECUTE FUNCTION hydroland_store_restock_notice();
