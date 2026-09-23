const assert=require('assert');
const {DOCUMENT_DEPARTMENTS}=require('../.tmp-operational-document-validation/document-forms/document-form.domain.js');
const {buildOperationalDocumentCatalog}=require('../.tmp-operational-document-validation/document-forms/operational-document-catalog.js');
const c=buildOperationalDocumentCatalog('org-1');
assert.equal(c.length,28);
assert.equal(new Set(c.map(x=>x.code)).size,28);
assert.equal(new Set(c.map(x=>x.id)).size,28);
for(const d of DOCUMENT_DEPARTMENTS) assert.equal(c.filter(x=>x.department===d).length,2,`${d} must own exactly two operational templates`);
for(const t of c){assert.equal(t.organizationId,'org-1');assert(t.active&&t.printable);assert(t.titleAr&&t.titleEn);assert(t.fields.length>=3);assert(t.fields.some(f=>f.required));}
assert.throws(()=>buildOperationalDocumentCatalog(''));
console.log('Operational Document Catalog validation passed.');
