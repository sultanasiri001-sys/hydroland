ALTER TABLE "InstructorCompensationAgreement"
  ADD COLUMN "earningTiming" VARCHAR(1000),
  ADD COLUMN "reversalTerms" VARCHAR(1000),
  ADD CONSTRAINT "InstructorCompAgreement_settlement_terms_pair" CHECK (
    ("earningTiming" IS NULL AND "reversalTerms" IS NULL)
    OR ("mode" <> 'SALARY_ONLY' AND "earningTiming" IS NOT NULL AND "reversalTerms" IS NOT NULL
        AND length(trim("earningTiming")) > 0 AND length(trim("reversalTerms")) > 0)
  );
