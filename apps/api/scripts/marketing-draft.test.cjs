const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {marketingDraftContent,marketingDraftCreate,marketingDraftEdit,marketingDraftTransition,draftDigest,marketingDraftRecordDigest,validateMarketingDraftRecord}=require('../dist/marketing/marketing-draft.domain');
const content=()=>({title:'خطة اختبار داخلية',objective:'تخطيط لا يمثل نشر حملة أو نتيجتها',channels:['WEB','SOCIAL']});
test('campaign planning is bounded and canonical without accepting publication authority',()=>{
 assert.deepEqual(marketingDraftContent(content()),{...content(),channels:['SOCIAL','WEB']});
 for(const extra of [{status:'ACTIVE'},{organizationId:randomUUID()},{approved:true},{publishedAt:new Date().toISOString()},{analytics:{impressions:3}}])assert.throws(()=>marketingDraftCreate({...content(),requestKey:randomUUID(),...extra}));
});
test('campaign content rejects malformed, repeated and unknown channels and oversized private text',()=>{
 for(const change of [{channels:[]},{channels:['WEB','WEB']},{channels:['UNTRUSTED']},{channels:'WEB'},{title:' '},{title:'x'.repeat(161)},{objective:'x'.repeat(2001)},{title:'bad\u0000title'}])assert.throws(()=>marketingDraftContent({...content(),...change}));
});
test('campaign creation requires an explicit stable idempotency key',()=>{
 const key=randomUUID();assert.equal(marketingDraftCreate({...content(),requestKey:key}).requestKey,key);
 for(const key of [null,'',23,'key'])assert.throws(()=>marketingDraftCreate({...content(),requestKey:key}));
 assert.equal(draftDigest(marketingDraftContent(content())),draftDigest(marketingDraftContent({...content(),channels:['SOCIAL','WEB']})));
});
test('campaign edits and state changes require current integer versions and explicit reasons',()=>{
 for(const version of [0,-1,1.5,'1',null,Infinity,1000001])assert.throws(()=>marketingDraftEdit({...content(),expectedRevision:version,reason:'مراجعة المسودة'}));
 assert.throws(()=>marketingDraftTransition({expectedRevision:1,reason:'أرشفة',confirmed:false}));
 assert.throws(()=>marketingDraftTransition({expectedRevision:1,reason:' ',confirmed:true}));
 assert.throws(()=>marketingDraftEdit({...content(),expectedRevision:1,reason:'تعديل',approved:true}));
 assert.equal(marketingDraftTransition({expectedRevision:2,reason:'استعادة المسودة',confirmed:true}).expectedRevision,2);
});
test('record digests bind organization, creator, revision and all campaign content',()=>{
 const now=new Date(),row={id:randomUUID(),organizationId:randomUUID(),createdByAccountId:randomUUID(),requestKey:randomUUID(),requestDigest:'a'.repeat(64),revision:1,status:'DRAFT',...marketingDraftContent(content()),createdAt:now,updatedAt:now};row.recordDigest=marketingDraftRecordDigest(row);assert.equal(validateMarketingDraftRecord(row),row);
 for(const change of [{organizationId:randomUUID()},{createdByAccountId:randomUUID()},{revision:2},{status:'ACTIVE'},{title:'Changed'},{channels:['EMAIL']},{updatedAt:new Date(+now+1)}])assert.throws(()=>validateMarketingDraftRecord({...row,...change}));
 const reordered=Object.fromEntries(Object.entries(row).reverse());assert.equal(marketingDraftRecordDigest(reordered),row.recordDigest);
});
