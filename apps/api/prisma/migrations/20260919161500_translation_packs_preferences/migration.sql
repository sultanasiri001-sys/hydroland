CREATE TYPE "TranslationMode" AS ENUM ('OFFLINE','ONLINE','AUTO');
CREATE TYPE "LanguagePackStatus" AS ENUM ('DOWNLOAD_AVAILABLE','INSTALLED','UPDATE_AVAILABLE','DISABLED');

CREATE TABLE "LanguagePack" (
  "id" TEXT NOT NULL,
  "languageCode" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "LanguagePackStatus" NOT NULL DEFAULT 'DOWNLOAD_AVAILABLE',
  "checksum" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LanguagePack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LanguagePack_languageCode_version_key" ON "LanguagePack"("languageCode","version");
CREATE INDEX "LanguagePack_languageCode_status_idx" ON "LanguagePack"("languageCode","status");

CREATE TABLE "TranslationPreference" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "preferredLanguageCode" TEXT NOT NULL DEFAULT 'ar',
  "mode" "TranslationMode" NOT NULL DEFAULT 'AUTO',
  "autoTranslateMessages" BOOLEAN NOT NULL DEFAULT false,
  "keepOriginalText" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranslationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TranslationPreference_accountId_key" ON "TranslationPreference"("accountId");
ALTER TABLE "TranslationPreference" ADD CONSTRAINT "TranslationPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
