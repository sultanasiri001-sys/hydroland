const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {warehouseLocationContent,warehouseLocationCreate,warehouseLocationEdit,warehouseLocationTransition,locationDigest,warehouseLocationRecordDigest,validateWarehouseLocationRecord}=require('../dist/inventory/warehouse-location.domain');
const content=()=>({title:'موقع مستودع داخلي',locationDescription:'وصف الموقع المسجل داخل الجهة'});
test('warehouse creation canonicalizes immutable codes and rejects stock or operating authority',()=>{
 const key=randomUUID(),created=warehouseLocationCreate({...content(),code:' wh-001 ',requestKey:key.toUpperCase()});assert.equal(created.content.code,'WH-001');assert.equal(created.requestKey,key);
 for(const extra of [{status:'ACTIVE'},{organizationId:randomUUID()},{approved:true},{stockQuantity:5},{operatingPermission:true}])assert.throws(()=>warehouseLocationCreate({...content(),code:'WH-001',requestKey:randomUUID(),...extra}));
});
test('warehouse content and location codes enforce bounded valid fields',()=>{
 for(const code of ['', 'a', 'x'.repeat(33),'WH 001','WH/001','رمز'])assert.throws(()=>warehouseLocationCreate({...content(),code,requestKey:randomUUID()}));
 for(const change of [{title:' '},{title:'x'.repeat(161)},{locationDescription:'x'.repeat(1001)},{locationDescription:''},{title:'bad\u0000title'}])assert.throws(()=>warehouseLocationContent({...content(),...change}));
});
test('warehouse creation uses a stable UUID request key and canonical content',()=>{
 for(const requestKey of [null,'',23,'key'])assert.throws(()=>warehouseLocationCreate({...content(),code:'WH-001',requestKey}));
 const requestKey=randomUUID();assert.equal(locationDigest(warehouseLocationCreate({...content(),code:'wh-001',requestKey}).content),locationDigest(warehouseLocationCreate({...content(),code:'WH-001',requestKey}).content));
});
test('warehouse edits keep codes immutable and require the current revision, reason and confirmation',()=>{
 for(const expectedRevision of [0,-1,1.5,'1',null,Infinity,1000001])assert.throws(()=>warehouseLocationEdit({...content(),expectedRevision,reason:'تصحيح وصف الموقع'}));
 assert.throws(()=>warehouseLocationEdit({...content(),expectedRevision:1,reason:'تعديل',code:'WH-002'}));
 assert.throws(()=>warehouseLocationTransition({expectedRevision:1,reason:'أرشفة',confirmed:false}));
 assert.throws(()=>warehouseLocationTransition({expectedRevision:1,reason:' ',confirmed:true}));
 assert.equal(warehouseLocationTransition({expectedRevision:2,reason:'استعادة السجل',confirmed:true}).expectedRevision,2);
});
test('warehouse record digest binds scope, code, description, creator, revision and timestamps',()=>{
 const now=new Date(),row={id:randomUUID(),organizationId:randomUUID(),createdByAccountId:randomUUID(),requestKey:randomUUID(),requestDigest:'a'.repeat(64),revision:1,status:'RECORDED',code:'WH-001',...content(),createdAt:now,updatedAt:now};row.recordDigest=warehouseLocationRecordDigest(row);assert.equal(validateWarehouseLocationRecord(row),row);
 for(const change of [{organizationId:randomUUID()},{createdByAccountId:randomUUID()},{revision:2},{status:'ACTIVE'},{title:'Changed'},{code:'WH-002'},{locationDescription:'Changed'},{updatedAt:new Date(+now+1)}])assert.throws(()=>validateWarehouseLocationRecord({...row,...change}));
 assert.equal(warehouseLocationRecordDigest(Object.fromEntries(Object.entries(row).reverse())),row.recordDigest);
});
