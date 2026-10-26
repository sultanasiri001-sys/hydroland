import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {AgentModelProviderService}=require('../dist/agents/agent-model-provider.service.js');
const {AgentRuntimeService}=require('../dist/agents/agent-runtime.service.js');
const {AgentRuntimeController}=require('../dist/agents/agent-runtime.controller.js');
const {GovernanceReviewInboxService}=require('../dist/agents/governance-review-inbox.service.js');
const {DatabaseService}=require('../dist/database/database.service.js');
const {AuthService}=require('../dist/auth/auth.service.js');
const {AccessTokenGuard}=require('../dist/auth/access-token.guard.js');
const {AdminGuard}=require('../dist/admin/admin.guard.js');
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
const names=['NODE_ENV','HYDROLAND_INTEGRATION_AI_MODEL_STATUS','HYDROLAND_AI_PROVIDER','OPENAI_API_KEY','HYDROLAND_AI_MODEL','HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION','HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION','HYDROLAND_AI_DAILY_BUDGET_MICRO_USD','HYDROLAND_AI_MAX_INPUT_TOKENS','HYDROLAND_AI_MAX_OUTPUT_TOKENS','HYDROLAND_AI_TEST_BASE_URL'];
const previous=new Map(names.map(name=>[name,process.env[name]]));
let mode='valid',calls=0,entered=false,release,app;
const requests=[];
const server=createServer(async(req,res)=>{
  calls++;let body='';for await(const chunk of req)body+=chunk;requests.push({method:req.method,path:req.url,body});
  if(mode==='disconnect'){req.socket.destroy();return;}
  if(mode==='hold'){entered=true;await new Promise(resolve=>release=resolve);}
  if(mode==='redirect')return res.writeHead(302,{location:'https://example.invalid/do-not-follow'}).end();
  if(/^status-/.test(mode))return res.writeHead(Number(mode.slice(7)),{'content-type':'application/json'}).end(JSON.stringify({error:{message:'LOCAL_PRIVATE_PROVIDER_DETAIL'}}));
  res.writeHead(200,{'content-type':'application/json'});
  res.end(mode==='oversized'?'x'.repeat(17000):mode==='invalid-json'?'{':JSON.stringify({object:'model',id:mode==='wrong-model'?'other-model':'fixture-model',privateDetail:'LOCAL_PRIVATE_PROVIDER_DETAIL'}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_INTEGRATION_AI_MODEL_STATUS:'SANDBOX',HYDROLAND_AI_PROVIDER:'OPENAI',OPENAI_API_KEY:'not-a-real-provider-fixture-key',HYDROLAND_AI_MODEL:'fixture-model',HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION:'100000',HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION:'500000',HYDROLAND_AI_DAILY_BUDGET_MICRO_USD:'10000',HYDROLAND_AI_MAX_INPUT_TOKENS:'2048',HYDROLAND_AI_MAX_OUTPUT_TOKENS:'512',HYDROLAND_AI_TEST_BASE_URL:`http://127.0.0.1:${server.address().port}/v1`});
const provider=new AgentModelProviderService({status:()=>({status:process.env.HYDROLAND_INTEGRATION_AI_MODEL_STATUS})});
const inspect=async()=>{const result=await provider.checkConnection();assert.equal(result.scope,'MODEL_ACCESS_ONLY');assert.equal(result.generationTested,false);assert(!JSON.stringify(result).includes('LOCAL_PRIVATE_PROVIDER_DETAIL'));assert(!JSON.stringify(result).includes(process.env.OPENAI_API_KEY));return result;};
try{
  assert.equal((await inspect()).connected,true);assert.equal(calls,1);
  for(const [status,reason]of [[401,'PROVIDER_AUTH_FAILED'],[403,'PROVIDER_ACCESS_DENIED'],[429,'PROVIDER_RATE_LIMITED'],[500,'PROVIDER_REQUEST_FAILED']]){
    mode='status-'+status;const before=calls;const result=await inspect();assert.equal(result.connected,false);assert.equal(result.reason,reason);assert.equal(calls,before+1,'Diagnostics never retry provider requests');
  }
  for(mode of ['invalid-json','oversized','wrong-model'])assert.equal((await inspect()).reason,'PROVIDER_RESPONSE_INVALID');
  for(mode of ['redirect','disconnect']){const before=calls;assert.equal((await inspect()).reason,'PROVIDER_CONNECTION_FAILED');assert.equal(calls,before+1);}
  const before=calls;process.env.HYDROLAND_INTEGRATION_AI_MODEL_STATUS='DISABLED';assert.equal((await inspect()).reason,'INTEGRATION_DISABLED');assert.equal(calls,before);process.env.HYDROLAND_INTEGRATION_AI_MODEL_STATUS='SANDBOX';
  const base=process.env.HYDROLAND_AI_TEST_BASE_URL;process.env.HYDROLAND_AI_TEST_BASE_URL='https://example.invalid/v1';assert.equal((await inspect()).reason,'PROVIDER_CONFIGURATION_INVALID');assert.equal(calls,before);process.env.HYDROLAND_AI_TEST_BASE_URL=base;
  let allowed=false,authorizations=0;
  const db={serializable:async fn=>fn({account:{findFirst:async({where})=>{authorizations++;return allowed&&where.id==='fixture-admin'?{id:'fixture-admin',personId:'fixture-person'}:null;}}}),roleAssignment:{findFirst:async({where})=>allowed&&where.accountId==='fixture-admin'?{id:'fixture-role'}:null}};
  const runtime=new AgentRuntimeService(db,{}, {},provider,{});
  await assert.rejects(()=>runtime.checkProviderConnection('fixture-admin'),error=>error.getStatus?.()===403);assert.equal(calls,before,'An unauthorized caller never reaches the provider');
  allowed=true;mode='hold';const pending=runtime.checkProviderConnection('fixture-admin');
  const deadline=Date.now()+2000;while(!entered){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,5));}
  allowed=false;release();await assert.rejects(()=>pending,error=>error.getStatus?.()===403,'Revocation while checking suppresses the result');assert.equal(authorizations,3);
  // Exercise the actual route and production guard classes without opening a
  // database or issuing a real login credential. DB-backed acceptance runs in CI.
  class FixtureModule{}
  const unusedInbox={list(){throw new Error('Connection diagnostics must not read the inbox');},detail(){throw new Error('Connection diagnostics must not read review evidence');}};
  Module({controllers:[AgentRuntimeController],providers:[AccessTokenGuard,AdminGuard,{provide:AgentRuntimeService,useValue:runtime},{provide:GovernanceReviewInboxService,useValue:unusedInbox},{provide:DatabaseService,useValue:db},{provide:AuthService,useValue:{authenticateAccessToken:async token=>({accountId:token})}}]})(FixtureModule);
  app=await NestFactory.create(FixtureModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
  const endpoint=(await app.getUrl())+'/api/v1/admin/agents/provider-connection',callsBeforeHttp=calls;
  assert.equal((await fetch(endpoint)).status,401);
  allowed=true;assert.equal((await fetch(endpoint,{headers:{authorization:'Bearer fixture-staff'}})).status,403);assert.equal(calls,callsBeforeHttp);
  mode='valid';const response=await fetch(endpoint,{headers:{authorization:'Bearer fixture-admin'}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).connected,true);assert.equal(calls,callsBeforeHttp+1);
  assert.equal((await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer fixture-admin'}})).status,404);assert.equal(calls,callsBeforeHttp+1);
  allowed=false;assert.equal((await fetch(endpoint,{headers:{authorization:'Bearer fixture-admin'}})).status,403);assert.equal(calls,callsBeforeHttp+1);
  assert(requests.every(request=>request.method==='GET'&&request.path==='/v1/models/fixture-model'&&request.body===''),'All diagnostic traffic is body-free model-metadata GET; no token count or generation');
  console.log('Provider connection diagnostics passed: actual HTTP route/guards, metadata-only requests, bounded sanitized responses, auth/access/rate errors, no redirects or retries, disabled/invalid configuration, and authorization before and after the request. All traffic was loopback.');
}finally{
  release?.();await app?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  for(const[name,value]of previous)if(value===undefined)delete process.env[name];else process.env[name]=value;
}
