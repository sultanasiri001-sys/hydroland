CREATE TABLE "StoreStockLocation" AS SELECT o.id AS "organizationId",u.id AS "orgUnitId" FROM "Organization" o CROSS JOIN "OrgUnit" u WITH NO DATA;
ALTER TABLE "StoreStockLocation" ADD COLUMN id TEXT PRIMARY KEY,ALTER COLUMN "organizationId" SET NOT NULL,
  ADD COLUMN code TEXT NOT NULL, ADD COLUMN title TEXT NOT NULL, ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE RESTRICT, ADD FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"(id) ON DELETE RESTRICT,
  ADD CONSTRAINT "StoreStockLocation_org_code_key" UNIQUE ("organizationId",code);

CREATE TABLE "StoreStockBalance" AS SELECT p.id AS "productId",l.id AS "locationId" FROM "StoreProduct" p CROSS JOIN "StoreStockLocation" l WITH NO DATA;
ALTER TABLE "StoreStockBalance" ADD COLUMN quantity INTEGER NOT NULL CHECK (quantity>=0), ADD PRIMARY KEY ("productId","locationId"),
  ADD FOREIGN KEY ("productId") REFERENCES "StoreProduct"(id) ON DELETE RESTRICT, ADD FOREIGN KEY ("locationId") REFERENCES "StoreStockLocation"(id) ON DELETE RESTRICT;

CREATE TABLE "StoreStockTransfer" AS SELECT p.id AS "productId",o.id AS "organizationId",a.id AS "actorId" FROM "StoreProduct" p CROSS JOIN "Organization" o CROSS JOIN "Account" a WITH NO DATA;
ALTER TABLE "StoreStockTransfer" ADD COLUMN id TEXT PRIMARY KEY, ALTER COLUMN "productId" SET NOT NULL, ALTER COLUMN "organizationId" SET NOT NULL, ALTER COLUMN "actorId" SET NOT NULL,
  ADD COLUMN "sourceKey" TEXT NOT NULL, ADD COLUMN "destinationKey" TEXT NOT NULL, ADD COLUMN quantity INTEGER NOT NULL CHECK(quantity>0),
  ADD COLUMN "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD CHECK("sourceKey"<>"destinationKey"),
  ADD FOREIGN KEY ("productId") REFERENCES "StoreProduct"(id) ON DELETE RESTRICT, ADD FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY ("actorId") REFERENCES "Account"(id) ON DELETE RESTRICT;
CREATE INDEX "StoreStockTransfer_org_time_idx" ON "StoreStockTransfer" ("organizationId","movedAt",id);

CREATE TABLE "StoreStockCount" AS SELECT p.id AS "productId",o.id AS "organizationId",a.id AS "actorId" FROM "StoreProduct" p CROSS JOIN "Organization" o CROSS JOIN "Account" a WITH NO DATA;
ALTER TABLE "StoreStockCount" ADD COLUMN id TEXT PRIMARY KEY, ALTER COLUMN "productId" SET NOT NULL, ALTER COLUMN "organizationId" SET NOT NULL, ALTER COLUMN "actorId" SET NOT NULL,
  ADD COLUMN "locationKey" TEXT NOT NULL, ADD COLUMN "expectedQuantity" INTEGER NOT NULL CHECK("expectedQuantity">=0), ADD COLUMN "countedQuantity" INTEGER NOT NULL CHECK("countedQuantity">=0),
  ADD COLUMN reason TEXT NOT NULL, ADD COLUMN "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD FOREIGN KEY ("productId") REFERENCES "StoreProduct"(id) ON DELETE RESTRICT, ADD FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  ADD FOREIGN KEY ("actorId") REFERENCES "Account"(id) ON DELETE RESTRICT;
CREATE INDEX "StoreStockCount_org_time_idx" ON "StoreStockCount" ("organizationId","countedAt",id);
