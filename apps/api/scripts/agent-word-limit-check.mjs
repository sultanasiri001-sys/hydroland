import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {AgentModelProviderService}=require('../dist/agents/agent-model-provider.service.js');
const {requestedWordLimit,responseWordCount,reportScopeNotice}=require('../dist/agents/agent-word-policy.js');
assert.equal(requestedWordLimit('لا تتجاوز ٩٠ كلمة'),90);
assert.equal(requestedWordLimit('at most 90 words'),90);
assert.equal(requestedWordLimit('unbounded report'),null);
assert.equal(responseWordCount('1. one two\n- three four'),4);
const saved={...process.env};
let scenario={},requests=[];
const server=createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;
  const body=JSON.parse(raw),repair=body.input.length>2;
  requests.push({path:req.url,body});
  res.setHeader('content-type','application/json');
  if(req.url.endsWith('/input_tokens'))return res.end(JSON.stringify({input_tokens:repair?(scenario.secondInput||20):(scenario.firstInput||10)}));
  if(repair&&scenario.rejectRepair){res.statusCode=429;return res.end(JSON.stringify({error:{code:'rate_limit_exceeded',type:'rate_limit_exceeded'}}));}
  const incomplete=repair?scenario.incompleteRepair:scenario.incompleteFirst;
  const words=repair?(scenario.secondWords||60):(scenario.firstWords||100);
  res.end(JSON.stringify({status:incomplete?'incomplete':'completed',output:incomplete?[]:[{type:'message',role:'assistant',content:[{type:'output_text',text:Array(words).fill('كلمة').join(' ')}]}],usage:{input_tokens:repair?(scenario.secondInput||20):(scenario.firstInput||10),output_tokens:repair?100:(scenario.firstOutput||800)}}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_AI_PROVIDER:'OPENAI',OPENAI_API_KEY:'fixture-only-not-real',HYDROLAND_AI_MODEL:'gpt-6-luna',HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION:'100000',HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION:'500000',HYDROLAND_AI_DAILY_BUDGET_MICRO_USD:'300000',HYDROLAND_AI_MAX_INPUT_TOKENS:'8192',HYDROLAND_AI_MAX_OUTPUT_TOKENS:'2048',HYDROLAND_AI_TEST_BASE_URL:'http://127.0.0.1:'+server.address().port+'/v1'});
const provider=new AgentModelProviderService({status:()=>({status:'SANDBOX'})});
const config=provider.configuration(),agent={key:'INVENTORY',nameEn:'Inventory'};
async function execute(options={},descriptor=agent,brief='لا تتجاوز 90 كلمة. احفظ حقائق العينة.'){scenario=options;requests=[];return provider.execute(config,descriptor,'DRAFT_REPORT','ar-SA',brief,{metrics:{warehouseLocations:2},missingSources:['fixture-gap']});}
try{
  const result=await execute();
  assert.equal(requests.length,4);
  assert.equal(responseWordCount(result.text),60);
  assert.equal(result.inputTokens,30);assert.equal(result.outputTokens,900);
  assert(result.estimatedCostMicroUsd<=config.reserveMicroUsd);
  assert.deepEqual(requests[0].body.input,requests[1].body.input);
  assert.deepEqual(requests[2].body.input,requests[3].body.input);
  assert.deepEqual(requests[3].body.input.slice(0,2),requests[1].body.input,'repair retains complete original brief and evidence');
  assert.equal(requests[3].body.input[2].role,'assistant');
  assert.equal(responseWordCount(requests[3].body.input[2].content),100);
  assert.equal(requests[3].body.max_output_tokens,1248,'both responses share the 2048-token reserve');
  assert.deepEqual(requests[3].body.reasoning,{effort:'none'});
  for(const sent of requests.filter(r=>r.path.endsWith('/responses'))){assert.equal(sent.body.store,false);assert.deepEqual(sent.body.tools,[]);assert.equal(sent.body.tool_choice,'none');}
  await execute({firstWords:60});assert.equal(requests.length,2,'no extra request when the first draft fits');
  await execute({}, {key:'GOV_QUALITY_AUDIT',nameEn:'Reviewer'});assert.equal(requests.length,2,'do not rewrite independent governance reviews');
  await assert.rejects(()=>execute({firstInput:7000,secondInput:2000}),e=>e.code==='OUTPUT_FORMAT_BUDGET');
  assert.equal(requests.length,3,'count but do not generate beyond the original input reserve');
  await assert.rejects(()=>execute({firstOutput:2048}),e=>e.code==='OUTPUT_FORMAT_BUDGET');assert.equal(requests.length,2);
  await assert.rejects(()=>execute({incompleteFirst:true}),e=>e.code==='PROVIDER_RESULT_INCOMPLETE'&&e.uncertain);assert.equal(requests.length,2,'never retry an uncertain first response');
  await assert.rejects(()=>execute({incompleteRepair:true}),e=>e.code==='PROVIDER_RESULT_INCOMPLETE'&&e.uncertain);assert.equal(requests.length,4,'one format pass only');
  await assert.rejects(()=>execute({secondWords:100}),e=>e.code==='OUTPUT_WORD_LIMIT');assert.equal(requests.length,4,'never publish an over-limit second draft');
  await assert.rejects(()=>execute({rejectRepair:true}),e=>e.definiteRejection===false);assert.equal(requests.length,4,'a rejected format pass cannot restart the completed first generation');
  const syntheticBrief='اختبار داخلي على عينة بيانات اختبار. لا تتجاوز 90 كلمة.';
  const labeled=await execute({firstWords:88},agent,syntheticBrief);
  assert.equal(requests.length,4,'reserve words for the protected scope notice');
  assert(labeled.text.startsWith(reportScopeNotice(syntheticBrief)));
  assert.equal(responseWordCount(labeled.text),66,'notice is included in the final count');
  assert.equal(labeled.inputTokens,30);assert.equal(labeled.outputTokens,900);
  const alreadyShort=await execute({firstWords:80},agent,syntheticBrief);
  assert.equal(requests.length,2);
  assert.equal(responseWordCount(alreadyShort.text),86);
  assert(alreadyShort.text.startsWith('عينة اختبار، لا تمثل واقع المنصة.'));
  assert.equal(reportScopeNotice('تقرير تشغيلي فعلي'),null);
  console.log('Word-bound checks passed: one completed-draft format pass, exact counting, combined input/output reservation, original evidence, strict final word bound and no uncertain/whole-task replay.');
}finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);
}
