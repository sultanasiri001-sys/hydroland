const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const d=require('../dist/technology-security/technology-request.domain');
const input=()=>({requestKey:randomUUID(),kind:'CHANGE',title:'تغيير معزول قابل للمراجعة',scopeReference:'service-ci',executionPlan:'خطة تنفيذ محددة النطاق',testPlan:'اختبار النجاح والمنع',rollbackPlan:'استرجاع الحالة السابقة والتحقق',assigneeAccountId:randomUUID(),expiresAt:new Date(Date.now()+3600000).toISOString(),requestDocumentId:randomUUID(),requestDocumentVersion:1,requestDocumentHash:'a'.repeat(64)});
test('request creation rejects client authority, secret fields and unbounded or malformed input',()=>{
 for(const extra of [{state:'CLOSED'},{organizationId:randomUUID()},{approvedBy:randomUUID()},{role:'ADMIN'},{password:'never-accepted'},{expectedRevision:1}])assert.throws(()=>d.technologyCreate({...input(),...extra}),e=>e.getStatus()===400);
 for(const change of [{kind:'PRODUCTION_DEPLOY'},{title:''},{title:'x'.repeat(161)},{testPlan:'x\0y'},{executionPlan:[]},{rollbackPlan:''},{expiresAt:'invalid'},{expiresAt:new Date(Date.now()-1).toISOString()},{expiresAt:new Date(Date.now()+8*86400000).toISOString()},{requestDocumentHash:'not-a-hash'},{requestDocumentVersion:1.5},{assigneeAccountId:'001'}])assert.throws(()=>d.technologyCreate({...input(),...change}),e=>e.getStatus()===400);
});
test('access operations require an explicit target and one existing IAM operation',()=>{
 for(const accessAction of ['GRANT_ADMIN','BYPASS_MFA','DELETE_ACCOUNT','*',null])assert.throws(()=>d.technologyCreate({...input(),kind:'ACCESS',targetAccountId:randomUUID(),accessAction}));
 for(const accessAction of ['SUSPEND','REACTIVATE','APPOINTMENT'])assert.equal(d.technologyCreate({...input(),kind:'ACCESS',targetAccountId:randomUUID(),accessAction}).accessAction,accessAction);
 assert.throws(()=>d.technologyCreate({...input(),targetAccountId:randomUUID()}));assert.throws(()=>d.technologyCreate({...input(),kind:'ACCESS',accessAction:'SUSPEND'}));
});
test('an operator cannot approve, accept risk, verify, close or revoke their own execution',()=>{
 for(const state of d.TECHNOLOGY_REQUEST_STATES)for(const action of ['APPROVE','PASS_TEST','FAIL_TEST','ACCEPT_RISK','CLOSE','REJECT','REVOKE','REQUEST_ROLLBACK'])assert.throws(()=>d.technologyNext(state,action,'ASSIGNEE'));
 for(const state of d.TECHNOLOGY_REQUEST_STATES)for(const action of ['START','RECORD_EXECUTION','RECORD_ROLLBACK'])assert.throws(()=>d.technologyNext(state,action,'OWNER'));
});
test('normal execution cannot be closed from an approval, a running operation or unverified evidence',()=>{
 let state='DRAFT';for(const [action,role,expected] of [['SUBMIT','OWNER','SUBMITTED'],['APPROVE','OWNER','APPROVED'],['START','ASSIGNEE','IN_PROGRESS'],['RECORD_EXECUTION','ASSIGNEE','EXECUTED'],['PASS_TEST','OWNER','VERIFIED'],['CLOSE','OWNER','CLOSED']]){if(state!=='VERIFIED')assert.throws(()=>d.technologyNext(state,'CLOSE','OWNER'));state=d.technologyNext(state,action,role);assert.equal(state,expected);}
 for(const role of ['OWNER','ASSIGNEE'])assert.deepEqual(d.technologyActions('CLOSED',role),[]);
});
test('a failed test requires remediation or explicit risk ownership, and rollback must be tested independently',()=>{
 const failed=d.technologyNext('EXECUTED','FAIL_TEST','OWNER');assert.equal(failed,'TEST_FAILED');assert.throws(()=>d.technologyNext(failed,'CLOSE','OWNER'));
 assert.equal(d.technologyNext(failed,'ACCEPT_RISK','OWNER'),'RISK_ACCEPTED');assert.equal(d.technologyNext('RISK_ACCEPTED','CLOSE','OWNER'),'CLOSED');
 assert.equal(d.technologyNext(failed,'REQUEST_ROLLBACK','OWNER'),'ROLLBACK_REQUIRED');assert.equal(d.technologyNext('ROLLBACK_REQUIRED','RECORD_ROLLBACK','ASSIGNEE'),'ROLLED_BACK');assert.throws(()=>d.technologyNext('ROLLED_BACK','CLOSE','OWNER'));assert.equal(d.technologyNext('ROLLED_BACK','PASS_TEST','OWNER'),'VERIFIED');
});
test('revocation is terminal and cannot be undone by a replay or later successful test',()=>{
 for(const state of ['APPROVED','IN_PROGRESS','EXECUTED','TEST_FAILED','VERIFIED','ROLLBACK_REQUIRED','ROLLED_BACK'])assert.equal(d.technologyNext(state,'REVOKE','OWNER'),'REVOKED');
 for(const role of ['OWNER','ASSIGNEE'])assert.deepEqual(d.technologyActions('REVOKED',role),[]);
});
test('mutations bind the visible integer revision and fresh confirmation, and proof cannot be supplied to approval',()=>{
 for(const expectedRevision of [null,0,-1,1.1,'1',Infinity])assert.throws(()=>d.technologyTransition({expectedRevision,reason:'سبب موثق',confirmed:true},'APPROVE'));
 assert.throws(()=>d.technologyTransition({expectedRevision:1,reason:'سبب موثق',confirmed:false},'APPROVE'));
 assert.throws(()=>d.technologyTransition({expectedRevision:1,reason:'سبب موثق',confirmed:true,proofDocumentId:randomUUID()},'APPROVE'));
 assert.throws(()=>d.technologyTransition({expectedRevision:1,reason:'سبب موثق',confirmed:true},'PASS_TEST'));
 const proof={expectedRevision:1,reason:'سبب موثق',confirmed:true,proofDocumentId:randomUUID(),proofDocumentVersion:1,proofDocumentHash:'b'.repeat(64)};
 for(const riskReviewAt of [null,'invalid',new Date(Date.now()-10).toISOString()])assert.throws(()=>d.technologyTransition({...proof,riskReviewAt},'ACCEPT_RISK'));
 assert.equal(d.technologyTransition({...proof,riskReviewAt:new Date(Date.now()+3600000).toISOString()},'ACCEPT_RISK').proof.documentId,proof.proofDocumentId);
});
test('scope, assignment, evidence, status and decision mutations invalidate the persisted record digest',()=>{
 const now=new Date().toISOString(),row={policy:d.TECHNOLOGY_REQUEST_POLICY,id:randomUUID(),organizationId:randomUUID(),kind:'CHANGE',state:'APPROVED',revision:3,assignee:{accountId:randomUUID()},requestProof:{documentId:randomUUID(),contentHash:'a'.repeat(64)},approval:{accountId:randomUUID()},createdAt:now,updatedAt:now};row.recordDigest=d.technologyRecordDigest(row);assert.equal(d.readTechnologyRequest(row),row);
 for(const change of [{organizationId:randomUUID()},{id:randomUUID()},{state:'CLOSED'},{revision:4},{assignee:{accountId:randomUUID()}},{requestProof:{documentId:randomUUID(),contentHash:'a'.repeat(64)}},{approval:{accountId:randomUUID()}}])assert.throws(()=>d.readTechnologyRequest({...row,...change}));
 assert.equal(d.technologyRecordDigest(Object.fromEntries(Object.entries(row).reverse())),row.recordDigest);
});
