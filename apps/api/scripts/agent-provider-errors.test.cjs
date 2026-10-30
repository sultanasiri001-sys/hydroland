const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {AgentModelProviderService,AiProviderError}=require('../dist/agents/agent-model-provider.service');

const privateDetail='PRIVATE_PROVIDER_MESSAGE_AND_ACCOUNT_IDENTIFIER';
const config={ready:true,model:'fixture-model',maxInputTokens:8192,maxOutputTokens:2048,inputRate:100000,outputRate:500000};

async function rejection({stage='INPUT_TOKENS',body,status=429},expected){
 const requests=[];
 const server=createServer(async(req,res)=>{
  for await(const _ of req){}requests.push(req.url);
  if(stage==='GENERATION'&&req.url==='/v1/responses/input_tokens')return res.writeHead(200,{'content-type':'application/json'}).end('{"input_tokens":32}');
  res.writeHead(status,{'content-type':'application/json'}).end(body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const names=['NODE_ENV','HYDROLAND_AI_TEST_BASE_URL','OPENAI_API_KEY'];
 const previous=names.map(name=>[name,process.env[name]]);
 Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_AI_TEST_BASE_URL:`http://127.0.0.1:${server.address().port}/v1`,OPENAI_API_KEY:'fixture-only-not-a-real-key'});
 try{
  const provider=new AgentModelProviderService({});
  await assert.rejects(()=>provider.execute(config,{key:'SUPPORT',nameEn:'Support'},'READ_OPERATIONS','ar-SA','fixture brief'),error=>{
   assert(error instanceof AiProviderError);assert.equal(error.code,expected);assert.equal(error.providerStage,stage);assert.equal(error.uncertain,false);
   assert(!JSON.stringify(error).includes(privateDetail));assert(!error.message.includes(privateDetail));assert(!JSON.stringify(error).includes(process.env.OPENAI_API_KEY));return true;
  });
  assert.deepEqual(requests,stage==='GENERATION'?['/v1/responses/input_tokens','/v1/responses']:['/v1/responses/input_tokens'],'Rejections never retry or dispatch generation after a failed count');
 }finally{
  for(const[name,value]of previous)if(value===undefined)delete process.env[name];else process.env[name]=value;
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
}

test('token-count quota exhaustion is distinct from transient rate limiting',async()=>{
 await rejection({body:JSON.stringify({error:{code:'insufficient_quota',message:privateDetail}})},'PROVIDER_QUOTA_EXHAUSTED');
 await rejection({body:JSON.stringify({error:{code:'rate_limit_exceeded',message:privateDetail}})},'PROVIDER_RATE_LIMITED');
});
test('generation rejection records its stage without replaying the request',async()=>{
 await rejection({stage:'GENERATION',body:JSON.stringify({error:{type:'insufficient_quota',message:privateDetail}})},'PROVIDER_QUOTA_EXHAUSTED');
 await rejection({stage:'GENERATION',body:JSON.stringify({error:{type:'rate_limit_exceeded',message:privateDetail}})},'PROVIDER_RATE_LIMITED');
});
test('explicit overload and ramp-rate rejections are classified without retrying in the HTTP client',async()=>{
 await rejection({stage:'GENERATION',status:503,body:JSON.stringify({error:{code:'server_is_overloaded',message:privateDetail}})},'PROVIDER_OVERLOADED');
 await rejection({stage:'GENERATION',body:JSON.stringify({error:{code:'slow_down',message:privateDetail}})},'PROVIDER_RATE_LIMITED');
});
test('unknown, malformed and oversized 429 bodies stay unclassified and private',async()=>{
 for(const body of [JSON.stringify({error:{code:'unknown',message:privateDetail}}),'{',privateDetail.repeat(1000)])await rejection({body},'PROVIDER_USAGE_LIMITED');
});
test('quota classification takes precedence over a conflicting rate-limit field',async()=>{
 await rejection({body:JSON.stringify({error:{code:'insufficient_quota',type:'rate_limit_exceeded',message:privateDetail}})},'PROVIDER_QUOTA_EXHAUSTED');
});
test('non-429 provider errors cannot be relabeled by untrusted body content',async()=>{
 await rejection({status:401,body:JSON.stringify({error:{code:'insufficient_quota',message:privateDetail}})},'PROVIDER_AUTH_FAILED');
 await rejection({status:500,body:JSON.stringify({error:{code:'rate_limit_exceeded',message:privateDetail}})},'PROVIDER_REQUEST_FAILED');
});
