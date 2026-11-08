const {test}=require('node:test');
const assert=require('node:assert/strict');
const {registrationNumber,registrationCorrectionInput,marineDocumentReviewRevision}=require('../dist/marine-operations/marine-registration.domain');
test('registration identifiers preserve leading zeroes and normalize Arabic and Persian digits',()=>{
 assert.equal(registrationNumber(' ٠٠٧٥ '),'0075');assert.equal(registrationNumber('۱۲۳۴'),'1234');assert.equal(registrationNumber(' ab-23 '),'AB-23');
 for(const bad of ['',null,1,'x'.repeat(81),'<script>','A\nB','A\u0000B','A_12'])assert.throws(()=>registrationNumber(bad));
});
test('correction requires a fresh version, reason and explicit acknowledgement and rejects injected fields',()=>{
 const good={registrationNumber:'NEW-20',reason:'Correct synthetic data entry',expectedRevision:'a'.repeat(64),confirmed:true};
 assert.equal(registrationCorrectionInput(good).registrationNumber,'NEW-20');
 for(const changed of [{confirmed:false},{confirmed:undefined},{reason:'short'},{expectedRevision:'old'},{state:'ACTIVE'},{organizationId:'outside'},{documents:[]},{status:'VERIFIED'}])assert.throws(()=>registrationCorrectionInput({...good,...changed}));
});
test('document review version changes when boat identity, file, expiry or document state changes',()=>{
 const doc={id:'d',status:'PENDING',sha256:'a',expiresAt:'2030-01-01',updatedAt:'2026-01-01'},asset={id:'a',registrationNumber:'OLD-1',updatedAt:'2026-01-01'};
 const before=marineDocumentReviewRevision(doc,asset);
 for(const changed of [{status:'VERIFIED'},{sha256:'b'},{expiresAt:'2027-01-01'},{updatedAt:'2026-01-02'}])assert.notEqual(marineDocumentReviewRevision({...doc,...changed},asset),before);
 assert.notEqual(marineDocumentReviewRevision(doc,{...asset,registrationNumber:'NEW-2'}),before);
});
