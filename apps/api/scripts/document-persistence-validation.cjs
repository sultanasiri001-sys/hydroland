const fs=require('fs'); const schema=fs.readFileSync('prisma/schema.prisma','utf8'); const migration=fs.readFileSync('prisma/migrations/20260923161000_document_persistence/migration.sql','utf8');
for(const model of ['DocumentTemplate','ManagedDocument','DocumentLifecycleEvent']) if(!schema.includes(`model ${model}`)) throw new Error(`Missing Prisma model: ${model}`);
for(const status of ['DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED']) if(!schema.includes(status)) throw new Error(`Missing lifecycle status: ${status}`);
for(const token of ['DocumentTemplate_pkey','ManagedDocument_organizationId_referenceNumber_key','DocumentLifecycleEvent_documentId_occurredAt_idx']) if(!migration.includes(token)) throw new Error(`Missing migration object: ${token}`);
if(!schema.includes('@@unique([organizationId,referenceNumber])')) throw new Error('Missing organization-scoped reference uniqueness.');
console.log('Document persistence schema and migration validation passed.');
