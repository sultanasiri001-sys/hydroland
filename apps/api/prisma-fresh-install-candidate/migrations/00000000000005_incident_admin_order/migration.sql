-- Candidate-only index for SafetyIncidentsService.listAdmin actual ordering.
CREATE INDEX "SafetyIncident_status_createdAt_desc_idx" ON "SafetyIncident" ("status" ASC,"createdAt" DESC);
