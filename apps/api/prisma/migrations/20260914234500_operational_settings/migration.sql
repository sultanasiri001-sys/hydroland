CREATE TABLE "OperationalSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "OperationalSetting" ("key", "value")
VALUES ('WEATHER_GATE', '{"enabled":false,"mode":"ADVISORY","provider":"NOT_SELECTED"}'::jsonb)
ON CONFLICT ("key") DO NOTHING;