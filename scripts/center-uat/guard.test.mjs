import test from 'node:test';
import assert from 'node:assert/strict';
import {assertUatEnvironment} from './guard.mjs';
const valid = {HYDROLAND_UAT_ENABLED:'true',HYDROLAND_UAT_DATABASE:'hydroland_center_uat_test',DATABASE_URL:'postgresql://test:test@localhost:5432/hydroland_center_uat_test',HYDROLAND_UAT_PASSWORD:'test-password-at-least-24-characters',JWT_SECRET:'test-secret-at-least-32-characters'};
test('explicit isolated database and credentials are required',()=>{
  assert.equal(assertUatEnvironment(valid).database,valid.HYDROLAND_UAT_DATABASE);
  for (const patch of [{HYDROLAND_UAT_ENABLED:'false'},{HYDROLAND_UAT_DATABASE:'hydroland'},{DATABASE_URL:'postgresql://test:test@localhost:5432/hydroland'},{DATABASE_URL:valid.DATABASE_URL+'?schema=production'},{JWT_SECRET:'short'},{HYDROLAND_UAT_PASSWORD:'short'}]) assert.throws(()=>assertUatEnvironment({...valid,...patch}));
});
test('production and restored database hosts are rejected independently of name',()=>{
  for(const host of ['dpg-dakd8g5g1s2s73bu70bg-a','dpg-db7v3mks728c739pb05g-a']) assert.throws(()=>assertUatEnvironment({...valid,DATABASE_URL:valid.DATABASE_URL.replace('localhost',host)}));
});
test('external provider activation and credentials are refused',()=>{
  for(const key of ['MOYASAR_SECRET_KEY','RESEND_API_KEY','GOOGLE_CLIENT_ID','STORMGLASS_API_KEY','HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY','HYDROLAND_PAYMENT_PROVIDER','HYDROLAND_INTEGRATION_EMAIL_STATUS']) assert.throws(()=>assertUatEnvironment({...valid,[key]:'configured'}));
});
