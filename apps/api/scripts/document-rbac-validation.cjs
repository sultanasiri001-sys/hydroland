const fs=require('fs');
const p=fs.readFileSync('src/document-forms/document-authorization.service.ts','utf8');
const s=fs.readFileSync('src/document-forms/document-persistence.service.ts','utf8');
for(const token of ["VIEWER:new Set(['TEMPLATE_LIST','DOCUMENT_READ'])","STAFF:new Set(['TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_READ','REVISE','SUBMIT'])","ADMIN:new Set(['TEMPLATE_CREATE'","OWNER:new Set(['TEMPLATE_CREATE'","status!=='ACTIVE'"]) if(!p.includes(token)) throw new Error('Missing RBAC policy: '+token);
for(const token of ["'TEMPLATE_CREATE'","'TEMPLATE_LIST'","'DOCUMENT_CREATE'","'DOCUMENT_READ'","'REVISE'","'SUBMIT'","'APPROVE'","'SIGN'","'ARCHIVE'"]) if(!s.includes(token)) throw new Error('Missing RBAC enforcement: '+token);
if(s.includes('assertMember(')) throw new Error('Legacy membership-only authorization remains.');
console.log('Document RBAC validation passed.');
