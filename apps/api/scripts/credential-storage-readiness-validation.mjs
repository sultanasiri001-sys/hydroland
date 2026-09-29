import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';

const require=createRequire(import.meta.url);
const {inspectCredentialObjectStorage}=require('../dist/credentials/credential-object-storage.config.js');
const {CredentialObjectStorageService}=require('../dist/credentials/credential-object-storage.service.js');
const {IntegrationReadinessController}=require('../dist/health/integration-readiness.controller.js');
const {IntegrationService}=require('../dist/integrations/integration.service.js');
const integrations=new IntegrationService({}),storage=new CredentialObjectStorageService(integrations),controller=new IntegrationReadinessController(integrations);
const selected=key=>key==='NODE_ENV'||key==='HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS'||key.startsWith('HYDROLAND_OBJECT_STORAGE_')||key.startsWith('CLOUDFLARE_R2_');
const original=Object.fromEntries(Object.entries(process.env).filter(([key])=>selected(key)));
const apply=values=>{for(const key of Object.keys(process.env))if(selected(key))delete process.env[key];Object.assign(process.env,values)};
const valid={
  NODE_ENV:'production',HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'PRODUCTION_ENABLED',
  HYDROLAND_OBJECT_STORAGE_ENDPOINT:'https://private-storage.example.invalid',
  HYDROLAND_OBJECT_STORAGE_BUCKET:'private-credential-bucket',
  HYDROLAND_OBJECT_STORAGE_REGION:'us-east-1',
  HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID:'fixture-only-access-key',
  HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY:'fixture-only-secret-key',
  HYDROLAND_OBJECT_STORAGE_PRIVATE_ACCESS_CONFIRMED:'true',
  HYDROLAND_OBJECT_STORAGE_ENCRYPTION_CONFIRMED:'true',
  HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED:'true',
};
const assertParity=(values,expected)=>{
  apply(values);
  const readiness=controller.getCredentialStorageReadiness();
  assert.equal(readiness.locallyConfigured,expected,'Runtime readiness must match the upload adapter');
  for(const value of Object.values(readiness.checks))assert.equal(typeof value,'boolean');
  const serialized=JSON.stringify(readiness);
  for(const secret of ['fixture-only-access-key','fixture-only-secret-key','private-credential-bucket','private-storage.example.invalid'])assert(!serialized.includes(secret),'Readiness exposes configuration values');
  if(expected){
    const signed=storage.signedGet('credentials/local/account/evidence.pdf');
    assert.equal(new URL(signed.url).searchParams.get('X-Amz-Expires'),'300');
  }else assert.throws(()=>storage.signedGet('credentials/local/account/evidence.pdf'),error=>error.getStatus?.()===503);
  return readiness;
};

try{
  assertParity({},false);
  const r2={NODE_ENV:'production',HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'PRODUCTION_ENABLED',HYDROLAND_OBJECT_STORAGE_PROVIDER:'CLOUDFLARE_R2',CLOUDFLARE_R2_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_R2_BUCKET:'offline-fixture',CLOUDFLARE_R2_ACCESS_KEY_ID:'offline-access',CLOUDFLARE_R2_SECRET_ACCESS_KEY:'offline-secret'};
  assertParity(r2,false);
  assert.equal(controller.getObjectStorageReadiness().productionReady,true,'Existing offline delivery readiness remains independent');
  assert.equal(controller.getCredentialStorageReadiness().productionReady,false,'R2 offline settings cannot claim account documents are ready');
  assert.equal(assertParity(valid,true).productionReady,true);
  assert.equal(assertParity({...valid,HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'SANDBOX'},true).productionReady,false);
  assert.equal(controller.getCredentialStorageReadiness().sandboxReady,true);
  for(const status of ['NOT_SELECTED','CONFIGURED','VERIFIED','DEGRADED','DISABLED','UNKNOWN'])assertParity({...valid,HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:status},false);
  for(const key of ['HYDROLAND_OBJECT_STORAGE_ENDPOINT','HYDROLAND_OBJECT_STORAGE_BUCKET','HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID','HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY']){
    assertParity({...valid,[key]:''},false);assertParity({...valid,[key]:'   '},false);
  }
  for(const endpoint of ['not-a-url','ftp://storage.example.invalid','http://storage.example.invalid','https://user:secret@storage.example.invalid','https://storage.example.invalid/?token=hidden','https://storage.example.invalid/#fragment'])assertParity({...valid,HYDROLAND_OBJECT_STORAGE_ENDPOINT:endpoint},false);
  for(const key of ['HYDROLAND_OBJECT_STORAGE_PRIVATE_ACCESS_CONFIRMED','HYDROLAND_OBJECT_STORAGE_ENCRYPTION_CONFIRMED','HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED']){
    for(const value of ['', 'false','TRUE'])assertParity({...valid,[key]:value},false);
    assertParity({...valid,[key]:'false',HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'SANDBOX'},false);
  }
  const local={...valid,NODE_ENV:'test',HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'SANDBOX',HYDROLAND_OBJECT_STORAGE_ENDPOINT:'http://127.0.0.1:3199',HYDROLAND_OBJECT_STORAGE_PRIVATE_ACCESS_CONFIRMED:'false',HYDROLAND_OBJECT_STORAGE_ENCRYPTION_CONFIRMED:'false',HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED:'false'};
  assert.equal(assertParity(local,true).sandboxReady,true);
  assert.equal(assertParity({...local,HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'PRODUCTION_ENABLED'},true).productionReady,false,'Development HTTP must never be reported as production-ready');
  apply({...valid,HYDROLAND_OBJECT_STORAGE_REGION:'  '});
  assert.equal(inspectCredentialObjectStorage().config.region,'us-east-1');

  const blueprint=fs.readFileSync(new URL('../../../render.yaml',import.meta.url),'utf8');
  const example=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
  for(const key of Object.keys(valid).filter(key=>key.startsWith('HYDROLAND_OBJECT_STORAGE_'))){
    assert(blueprint.includes(`key: ${key}\n        sync: false`),`Blueprint missing securely supplied input: ${key}`);
    assert(example.includes(`${key}=`),`Development example missing: ${key}`);
  }
  const inventory=fs.readFileSync(new URL('./production-integration-inventory.mjs',import.meta.url),'utf8');
  assert(inventory.includes("adminRead('/health/integrations/credential-storage')"));
  assert(inventory.includes("if (!safeCredentialStorage.productionReady) blockers.push('CREDENTIAL_STORAGE:PRODUCTION_NOT_READY')"));
  console.log('Credential storage readiness validation passed: runtime/config parity, missing fields, invalid endpoints, lifecycle gates, mandatory production protections, sandbox boundaries, independent R2 delivery, secret redaction and deployment inputs.');
}finally{apply(original)}
