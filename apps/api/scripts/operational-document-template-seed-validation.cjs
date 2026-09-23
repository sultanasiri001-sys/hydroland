const fs=require('fs');
const s=fs.readFileSync('scripts/operational-document-template-seed.cjs','utf8');
for(const token of ['ORGANIZATION_ID','documentTemplate.upsert','organizationId_code_version','status:\'ACTIVE\'','buildOperationalDocumentCatalog']) if(!s.includes(token)) throw new Error('Missing seed control: '+token);
console.log('Operational document template seed validation passed.');
