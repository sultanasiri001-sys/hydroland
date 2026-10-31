const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {EVIDENCE_KINDS,evidenceCreate,evidenceDigest,evidenceRecordDigest,evidenceTransition,validateEvidenceRecord}=require('../dist/agents/operational-evidence.domain');
const id=randomUUID(),other=randomUUID(),when='2026-10-30T12:00:00.000Z';
const details={WAREHOUSE_BALANCE:{productId:id,locationId:other,quantity:0},WAREHOUSE_MOVEMENT:{productId:id,locationId:other,direction:'RECEIPT',quantity:1},PROCUREMENT:{productId:id,quantity:2,procurementReference:'PO-1'},RECORD_DELIVERY:{recordId:id,recipientReference:'Unit-1'},RECORD_RETENTION:{recordId:id,retainUntil:when,hold:true,policyReference:'POL-1'},RECORD_DISPOSAL:{recordId:id,retentionEvidenceId:other,authorizationDocumentId:randomUUID()},CAMPAIGN_PUBLICATION:{campaignDraftId:id,channel:'WEB',publicationReference:'PUB-1'},CAMPAIGN_ANALYTICS:{campaignDraftId:id,publicationEvidenceId:other,windowStart:when,windowEnd:when,impressions:0,clicks:0,conversions:0}};
const input=kind=>({requestKey:randomUUID(),kind,reference:'REF-'+kind,occurredAt:when,proofDocumentId:randomUUID(),details:details[kind]});
test('eight strictly typed evidence kinds accept real measured zero without asserting execution',()=>{for(const kind of Object.keys(EVIDENCE_KINDS)){const x=evidenceCreate(input(kind));assert.equal(x.department,EVIDENCE_KINDS[kind]);assert.deepEqual(x.details,details[kind]);}});
test('reject unknown authority, malformed links, missing values and invented metrics',()=>{
 for(const extra of [{organizationId:id},{status:'RECORDED'},{approved:true},{published:true},{referenceBindings:{}}])assert.throws(()=>evidenceCreate({...input('WAREHOUSE_BALANCE'),...extra}));
 for(const quantity of [-1,.5,Infinity,NaN,'0',null,1000000001])assert.throws(()=>evidenceCreate({...input('WAREHOUSE_BALANCE'),details:{...details.WAREHOUSE_BALANCE,quantity}}));
 for(const kind of Object.keys(EVIDENCE_KINDS))assert.throws(()=>evidenceCreate({...input(kind),details:{...details[kind],execute:true}}));
 for(const field of ['requestKey','proofDocumentId','occurredAt','kind','reference','details']){const x=input('WAREHOUSE_BALANCE');delete x[field];assert.throws(()=>evidenceCreate(x));}
 assert.throws(()=>evidenceCreate({...input('WAREHOUSE_MOVEMENT'),details:{...details.WAREHOUSE_MOVEMENT,quantity:0}}));
 assert.throws(()=>evidenceCreate({...input('CAMPAIGN_ANALYTICS'),details:{...details.CAMPAIGN_ANALYTICS,windowStart:'2026-10-31T00:00:00Z'}}));
 assert.throws(()=>evidenceCreate({...input('RECORD_RETENTION'),details:{...details.RECORD_RETENTION,hold:'false'}}));
 assert.throws(()=>evidenceCreate({...input('RECORD_DELIVERY'),occurredAt:'2026-02-30T12:00:00Z'}));
});
test('confirmations, revisions and append snapshots retain the exact typed facts',()=>{
 for(const x of [{expectedRevision:1,reason:'checked',confirmed:false},{expectedRevision:'1',reason:'checked',confirmed:true},{expectedRevision:1,reason:'checked',confirmed:true,execute:true}])assert.throws(()=>evidenceTransition(x));
 assert.deepEqual(evidenceTransition({expectedRevision:1,reason:' checked ',confirmed:true}),{expectedRevision:1,reason:'checked'});
 const {requestKey,...content}=evidenceCreate(input('WAREHOUSE_BALANCE')),now=new Date(when),row={id:randomUUID(),organizationId:id,requestKey,requestDigest:evidenceDigest(content),...content,occurredAt:now,proofVersion:1,proofContentHash:'a'.repeat(64),referenceBindings:{},revision:1,status:'DRAFT',createdByAccountId:id,recordedAt:null,createdAt:now,updatedAt:now};row.recordDigest=evidenceRecordDigest(row);assert.equal(validateEvidenceRecord(row),row);
 assert.throws(()=>validateEvidenceRecord({...row,details:{...row.details,quantity:1}}));
 const changed={...row,status:'RECORDED'};changed.recordDigest=evidenceRecordDigest(changed);assert.throws(()=>validateEvidenceRecord(changed));
 assert.equal(evidenceDigest({b:2,a:1}),evidenceDigest({a:1,b:2}));
});
