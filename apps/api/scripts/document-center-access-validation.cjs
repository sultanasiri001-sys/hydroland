const assert=require('node:assert/strict');
const {DocumentAuthorizationService}=require('../.tmp-document-center-access/document-forms/document-authorization.service.js');

const memberships=[
  {id:'center-owner-membership',organizationId:'center-e2e-001',accountId:'center-user-001',role:'OWNER',status:'ACTIVE'},
  {id:'center-viewer-membership',organizationId:'center-e2e-001',accountId:'center-viewer-001',role:'VIEWER',status:'ACTIVE'},
  {id:'center-inactive-membership',organizationId:'center-e2e-001',accountId:'center-inactive-001',role:'OWNER',status:'SUSPENDED'}
];
const queries=[];
const db={organizationMember:{findUnique:async({where})=>{
  const key=where.organizationId_accountId;
  queries.push(key);
  return memberships.find(member=>member.organizationId===key.organizationId&&member.accountId===key.accountId)||null;
}}};

async function main(){
  const authz=new DocumentAuthorizationService(db);
  const owner=await authz.assert('center-user-001','center-e2e-001','DOCUMENT_CREATE');
  assert.equal(owner.role,'OWNER');
  assert.equal((await authz.assert('center-viewer-001','center-e2e-001','DOCUMENT_LIST')).role,'VIEWER');
  await assert.rejects(()=>authz.assert('center-viewer-001','center-e2e-001','DOCUMENT_CREATE'),/not permitted/);
  await assert.rejects(()=>authz.assert('center-inactive-001','center-e2e-001','DOCUMENT_CREATE'),/Active organization membership/);
  await assert.rejects(()=>authz.assert('center-user-001','other-center-001','DOCUMENT_CREATE'),/Active organization membership/);
  assert.deepEqual(queries[0],{organizationId:'center-e2e-001',accountId:'center-user-001'});
  console.log('Center document access passed: active owner can create, viewer is read-only, inactive and cross-center memberships are denied.');
}

main().catch(error=>{console.error(error);process.exitCode=1});
