const fs=require('fs');
const schema=fs.readFileSync('prisma/schema.prisma','utf8');
const migration=fs.readFileSync('prisma/migrations/20260923163000_document_reference_counter/migration.sql','utf8');
const service=fs.readFileSync('src/document-forms/document-persistence.service.ts','utf8');
for(const token of ['model DocumentReferenceCounter','@@unique([organizationId,department,year])']) if(!schema.includes(token)) throw new Error('Missing counter schema: '+token);
for(const token of ['DocumentReferenceCounter_pkey','DocumentReferenceCounter_organizationId_department_year_key']) if(!migration.includes(token)) throw new Error('Missing counter migration object: '+token);
for(const token of ['documentReferenceCounter.upsert','lastNumber:{increment:1}','padStart(6','HYD-','getUTCFullYear']) if(!service.includes(token)) throw new Error('Missing atomic reference control: '+token);
if(service.includes('input.referenceNumber')) throw new Error('Manual reference number input must not remain in creation flow.');
console.log('Document reference numbering validation passed.');
