-- Phase 4: make the application audit ledger append-only at the database boundary.
CREATE OR REPLACE FUNCTION "hydroland_reject_audit_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only; % is prohibited', TG_OP USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS "AuditEvent_append_only_row" ON "AuditEvent";
CREATE TRIGGER "AuditEvent_append_only_row"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "hydroland_reject_audit_mutation"();

DROP TRIGGER IF EXISTS "AuditEvent_append_only_truncate" ON "AuditEvent";
CREATE TRIGGER "AuditEvent_append_only_truncate"
BEFORE TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION "hydroland_reject_audit_mutation"();
