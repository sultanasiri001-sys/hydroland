CREATE TABLE "ManagedDocumentAttachment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedByAccountId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedDocumentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagedDocumentAttachment_documentId_sha256_key" ON "ManagedDocumentAttachment"("documentId", "sha256");
CREATE INDEX "ManagedDocumentAttachment_organizationId_documentId_createdAt_idx" ON "ManagedDocumentAttachment"("organizationId", "documentId", "createdAt");

ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocumentAttachment" ADD CONSTRAINT "ManagedDocumentAttachment_uploadedByAccountId_fkey" FOREIGN KEY ("uploadedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
