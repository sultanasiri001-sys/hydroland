-- Candidate-only: missing production lookup and financial uniqueness indexes.
CREATE INDEX "BriefingTranslation_reviewStatus_idx" ON public."BriefingTranslation" USING btree ("reviewStatus");
CREATE INDEX "CompensationTerm_requestedByAccountId_idx" ON public."CompensationTerm" USING btree ("requestedByAccountId");
CREATE INDEX "CompensationTerm_reviewedByAccountId_idx" ON public."CompensationTerm" USING btree ("reviewedByAccountId");
CREATE UNIQUE INDEX "FinanceAccountantShift_active_accountant_center_key" ON public."FinanceAccountantShift" USING btree ("accountantAccountId", "centerOrgUnitId") WHERE (status = ANY (ARRAY['OPEN'::"FinanceShiftStatus", 'HANDOVER_PENDING'::"FinanceShiftStatus"]));
CREATE INDEX "FinanceEntry_postedByAccountId_idx" ON public."FinanceEntry" USING btree ("postedByAccountId");
CREATE INDEX "FinanceShiftEntry_recordedBy_idx" ON public."FinanceShiftEntry" USING btree ("recordedByAccountId", "createdAt");
CREATE INDEX "FinanceShiftEntry_reference_idx" ON public."FinanceShiftEntry" USING btree ("referenceType", "referenceId");
CREATE UNIQUE INDEX "FinanceShiftHandover_pending_fromShift_key" ON public."FinanceShiftHandover" USING btree ("fromShiftId") WHERE (status = 'PENDING'::"FinanceHandoverStatus");
