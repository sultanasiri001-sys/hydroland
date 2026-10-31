import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {AgentModelProviderService}=require('../dist/agents/agent-model-provider.service.js');
const names=['NODE_ENV','HYDROLAND_INTEGRATION_AI_MODEL_STATUS','HYDROLAND_AI_PROVIDER','OPENAI_API_KEY','HYDROLAND_AI_MODEL','HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION','HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION','HYDROLAND_AI_DAILY_BUDGET_MICRO_USD','HYDROLAND_AI_MAX_INPUT_TOKENS','HYDROLAND_AI_MAX_OUTPUT_TOKENS','HYDROLAND_AI_TEST_BASE_URL','HYDROLAND_AI_TEST_MANUAL_WORKER'];
const previous=new Map(names.map(name=>[name,process.env[name]]));
const requests=[];
let forceIncomplete=false;
const server=createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;
  const body=JSON.parse(raw);requests.push({path:req.url,body});
  res.writeHead(200,{'content-type':'application/json'});
  if(req.url==='/v1/responses/input_tokens')return res.end(JSON.stringify({input_tokens:10}));
  const report=JSON.parse(body.input[1].content).executiveReport;
  const incomplete=forceIncomplete||report&&body.model==='gpt-6-luna'&&body.reasoning?.effort!=='none';
  res.end(JSON.stringify(incomplete?{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[],usage:{input_tokens:10,output_tokens:2048}}:{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'bounded fixture report'}]}],usage:{input_tokens:10,output_tokens:20}}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_INTEGRATION_AI_MODEL_STATUS:'SANDBOX',HYDROLAND_AI_PROVIDER:'OPENAI',OPENAI_API_KEY:'fixture-not-a-real-key',HYDROLAND_AI_MODEL:'gpt-6-luna',HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION:'100000',HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION:'500000',HYDROLAND_AI_DAILY_BUDGET_MICRO_USD:'300000',HYDROLAND_AI_MAX_INPUT_TOKENS:'8192',HYDROLAND_AI_MAX_OUTPUT_TOKENS:'2048',HYDROLAND_AI_TEST_MANUAL_WORKER:'1',HYDROLAND_AI_TEST_BASE_URL:'http://127.0.0.1:'+server.address().port+'/v1'});
const provider=new AgentModelProviderService({status:()=>({status:'SANDBOX'})});
const report={entries:[{departmentName:'Fixture department',officeStatus:'EVIDENCE_REQUIRED',findings:['Unresolved concern'],evidenceGaps:['Missing evidence']}]};
async function run(key,model,executiveReport){
  process.env.HYDROLAND_AI_MODEL=model;
  const config=provider.configuration(),start=requests.length;
  assert.equal(config.ready,true);
  const result=await provider.execute(config,{key,nameEn:'Fixture agent'},'DRAFT_REPORT','ar-SA','Keep all supplied concerns.',undefined,undefined,undefined,executiveReport);
  const sent=requests.slice(start);
  assert.equal(sent.length,2);
  assert.deepEqual(sent[0].body.input,sent[1].body.input,'count exactly the generation input');
  const body=sent[1].body;
  assert.equal(body.store,false);assert.deepEqual(body.tools,[]);assert.equal(body.tool_choice,'none');
  assert.equal(body.max_output_tokens,key.startsWith('GOV_')?1024:2048);
  assert.equal(result.text,'bounded fixture report');
  if(executiveReport)assert.deepEqual(JSON.parse(body.input[1].content).executiveReport,report,'do not truncate source findings');
  return body;
}
try{
  const formatter=await run('EXECUTIVE','gpt-6-luna',report);
  assert.deepEqual(formatter.reasoning,{effort:'none'});
  assert.equal((await run('SUPPORT','gpt-6-luna')).reasoning,undefined);
  assert.equal((await run('GOV_QUALITY_AUDIT','gpt-6-luna')).reasoning,undefined);
  assert.equal((await run('EXECUTIVE','fixture-other-model',report)).reasoning,undefined);
  process.env.HYDROLAND_AI_MODEL='gpt-6-luna';forceIncomplete=true;
  const before=requests.length;
  await assert.rejects(()=>provider.execute(provider.configuration(),{key:'EXECUTIVE',nameEn:'Fixture executive'},'DRAFT_REPORT','ar-SA','Keep concerns.',undefined,undefined,undefined,report),e=>e.code==='PROVIDER_RESULT_INCOMPLETE'&&e.uncertain===true);
  assert.equal(requests.length,before+2,'an incomplete result is never retried');
  console.log('Formatter output checks passed: Luna formatter only, unchanged review/other-model behavior, exact counted input, original findings, bounded output and no uncertain retry. All traffic was loopback.');
}finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  for(const [key,value]of previous)if(value===undefined)delete process.env[key];else process.env[key]=value;
}
