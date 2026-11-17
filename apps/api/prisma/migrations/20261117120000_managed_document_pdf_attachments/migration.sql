-- Managed document identifiers are UUID in the production recovery baseline,
-- while legacy/test databases may retain TEXT identifiers. Derive each
-- reference column from its parent so the foreign keys work in both layouts.
CREATE TABLE "ManagedDocumentAttachment" AS
SELECT
    document."id" AS "id",
    document."id" AS "documentId",
    organization."id" AS "organizationId",
    account."id" AS "uploadedByAccountId",
    ''::TEXT AS "filename",
    'application/pdf'::TEXT AS "mimeType",
    0::INTEGER AS "byteSize",
    ''::TEXT AS "sha256",
    decode('', 'hex') AS "content",
    CURRENT_TIMESTAMP::TIMESTAMP(3) AS "createdAt"
FROM "ManagedDocument" AS document
CROSS JOIN "Organization" AS organization
CROSS JOIN "Account" AS account
WHERE false;

ALTER TABLE "ManagedDocumentAttachment"
    ALTER COLUMN "id" SET NOT NULL,
    ALTER COLUMN "documentId" SET NOT NULL,
    ALTER COLUMN "organizationId" SET NOT NULL,
    ALTER COLUMN "uploadedByAccountId" SET NOT NULL,
    ALTER COLUMN "filename" SET NOT NULL,
    ALTER COLUMN "mimeType" SET NOT NULL,
    ALTER COLUMN "byteSize" SET NOT NULL,
    ALTER COLUMN "sha256" SET NOT NULL,
    ALTER COLUMN "content" SET NOT NULL,
    ALTER COLUMN "createdAt" SET NOT NULL;

ALTER TABLE "ManagedDocumentAttachment"
    ALTER COLUMN "mimeType" SET DEFAULT 'application/pdf',
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ManagedDocumentAttachment"
    ADD CONSTRAINT "ManagedDocumentAttachment_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "ManagedDocumentAttachment_documentId_sha256_key" ON "ManagedDocumentAttachment"("documentId", "sha256");
CREATE INDEX "ManagedDocumentAttachment_organizationId_documentId_createdAt_idx" ON "ManagedDocumentAttachment"("organizationId", "documentId", "createdAt");

ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_uploadedByAccountId_fkey" FOREIGN KEY ("uploadedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
