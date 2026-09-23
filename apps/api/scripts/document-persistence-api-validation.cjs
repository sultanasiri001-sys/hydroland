const fs=require('fs');
const files=['src/document-forms/document-persistence.service.ts','src/document-forms/document-persistence.controller.ts','src/document-forms/document-form.module.ts'];
for(const f of files) if(!fs.existsSync(f)) throw new Error('Missing '+f);
const service=fs.readFileSync(files[0],'utf8');
for(const token of ['organizationMember.findUnique','managedDocument.create','documentLifecycleEvent.create','serializable','Creator cannot approve own document','Signer must be independent']) if(!service.includes(token)) throw new Error('Missing API control: '+token);
const controller=fs.readFileSync(files[1],'utf8');
for(const route of ["@Post(':id/submit')","@Post(':id/approve')","@Post(':id/sign')","@Post(':id/archive')"]) if(!controller.includes(route)) throw new Error('Missing lifecycle route: '+route);
console.log('Persistent Document API validation passed.');
