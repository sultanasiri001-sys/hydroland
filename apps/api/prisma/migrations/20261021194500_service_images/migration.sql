CREATE TABLE "ServiceImage" (
 "kind" TEXT NOT NULL CHECK (kind IN ('trip','course','product','equipment')),
 "entityId" TEXT NOT NULL,
 "revision" TEXT NOT NULL,
 "content" BYTEA CHECK (octet_length(content)<=2000000),
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("kind","entityId")
);
-- Entity IDs are intentionally text: older deployments use UUID parent keys.
CREATE FUNCTION hydroland_delete_service_image() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM "ServiceImage" WHERE kind=TG_ARGV[0] AND "entityId"=OLD.id::text;
 RETURN OLD;
END;
$$;
CREATE TRIGGER service_image_trip_delete AFTER DELETE ON "Trip" FOR EACH ROW EXECUTE FUNCTION hydroland_delete_service_image('trip');
CREATE TRIGGER service_image_course_delete AFTER DELETE ON "StoreCourseOffer" FOR EACH ROW EXECUTE FUNCTION hydroland_delete_service_image('course');
CREATE TRIGGER service_image_product_delete AFTER DELETE ON "StoreProduct" FOR EACH ROW EXECUTE FUNCTION hydroland_delete_service_image('product');
CREATE TRIGGER service_image_equipment_delete AFTER DELETE ON "CalendarResource" FOR EACH ROW EXECUTE FUNCTION hydroland_delete_service_image('equipment');
