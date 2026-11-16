import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const providers=Object.freeze(['STORAGE','WEATHER','EMAIL','PAYMENTS','AI','DATABASE']);
const repo='sultanasiri001-sys/hydroland';
export function runAlertDrill(env=process.env,execute=(args,input)=>execFileSync('gh',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe']})){
  if(env.GITHUB_REPOSITORY!==repo||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.A06_CONFIRM!=='A06_SYNTHETIC_ROUTE_ONLY')throw new Error('A06_DRILL_AUTHORIZATION_REQUIRED');
  if(!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||'')||!/^[0-9a-f]{40}$/.test(env.GITHUB_SHA||''))throw new Error('A06_DRILL_CONTEXT_REQUIRED');
  const run='https://github.com/'+repo+'/actions/runs/'+env.GITHUB_RUN_ID;
  const title='[A06 SYNTHETIC DRILL] alert route '+env.GITHUB_RUN_ID;
  const label='a06-alert-drill';
  const gh=(args,input)=>{try{return execute([...args,'--repo',repo],input);}catch{throw new Error('A06_GITHUB_ROUTE_FAILED');}};
  const json=args=>{try{return JSON.parse(gh(args));}catch{throw new Error('A06_GITHUB_RECEIPT_INVALID');}};
  const body=state=>['Synthetic A06 alert-route drill. No real provider outage is asserted.','', 'Run: '+run,'Source: '+env.GITHUB_SHA,'Owner: platform director 001 / repository owner.','',...providers.map(p=>p+': '+state)].join('\n');
  gh(['label','create',label,'--color','D4C5F9','--description','Synthetic A06 alert route acceptance','--force']);
  const candidates=json(['issue','list','--state','all','--label',label,'--limit','100','--json','number,title']);
  if(!Array.isArray(candidates))throw new Error('A06_GITHUB_RECEIPT_INVALID');
  const matches=candidates.filter(x=>x.title===title);
  if(matches.length>1)throw new Error('A06_DUPLICATE_DRILL_RECORDS');
  let number=matches[0]?.number;
  if(!number){
    const url=gh(['issue','create','--title',title,'--label',label,'--assignee','sultanasiri001-sys','--body-file','-'],body('SIMULATED_UNAVAILABLE')).trim();
    if(!new RegExp('^https://github.com/'+repo+'/issues/[1-9][0-9]*$').test(url))throw new Error('A06_GITHUB_RECEIPT_INVALID');
    number=Number(url.split('/').at(-1));
  }
  if(!Number.isSafeInteger(number)||number<1)throw new Error('A06_GITHUB_RECEIPT_INVALID');
  const read=()=>json(['issue','view',String(number),'--json','number,title,body,state,url']);
  let record=read();
  if(record.number!==number||record.title!==title||record.url!=='https://github.com/'+repo+'/issues/'+number)throw new Error('A06_WRONG_DRILL_RECORD');
  if(record.state==='CLOSED')gh(['issue','reopen',String(number)]);
  gh(['issue','edit',String(number),'--body-file','-'],body('SIMULATED_UNAVAILABLE'));
  record=read();
  if(record.state!=='OPEN'||!providers.every(p=>record.body.includes(p+': SIMULATED_UNAVAILABLE')))throw new Error('A06_ALERT_DELIVERY_NOT_VERIFIED');
  gh(['issue','edit',String(number),'--body-file','-'],body('SIMULATED_RECOVERED'));
  record=read();
  if(record.state!=='OPEN'||!providers.every(p=>record.body.includes(p+': SIMULATED_RECOVERED')))throw new Error('A06_RECOVERY_DELIVERY_NOT_VERIFIED');
  gh(['issue','close',String(number),'--reason','completed']);
  if(read().state!=='CLOSED')throw new Error('A06_RECOVERY_CLOSE_NOT_VERIFIED');
  return {scope:'A06_SYNTHETIC_GITHUB_ALERT_ROUTE',status:'PASS',providers:[...providers],issue:number,url:record.url,run,commit:env.GITHUB_SHA,productionProviderOutageVerified:false,humanAcknowledgementVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{console.log(JSON.stringify(runAlertDrill()));}catch(error){console.error(error.message);process.exitCode=1;}
}
