-- Finance completion gate: additive compatibility migration.
-- Existing production shift tables may already exist from historical migrations.
-- Only the new posting provenance column is introduced here; restored models map to existing tables.
ALTER TABLE "FinanceEntry"
  ADD COLUMN IF NOT EXISTS "postedByAccountId" TEXT;

CREATE INDEX IF NOT EXISTS "FinanceEntry_postedByAccountId_idx"
  ON "FinanceEntry"("postedByAccountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FinanceEntry_postedByAccountId_fkey'
  ) THEN
    ALTER TABLE "FinanceEntry"
      ADD CONSTRAINT "FinanceEntry_postedByAccountId_fkey"
      FOREIGN KEY ("postedByAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
