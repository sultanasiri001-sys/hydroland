import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {actors, passwordFor} from './seed.mjs';
import {prepareReceivableChecks} from './receivables-smoke.mjs';
import {prepareLicenseChecks} from './licenses-smoke.mjs';

// Destructive acceptance actions are confined to a freshly created CI database.
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Smoke is CI-only; never run against deployed acceptance data');
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
const secret=randomBytes(32).toString('base64url');
const env={...process.env,HYDROLAND_UAT_ENABLED:'true',HYDROLAND_UAT_DATABASE:'hydroland_center_uat',HYDROLAND_UAT_PASSWORD:secret,JWT_SECRET:randomBytes(48).toString('base64url'),PORT:'4173'};
const db=new PrismaClient();
let child;
let checks=0;
const ok=(condition,message)=>{assert(condition,message);checks++;};
const boot=()=>spawnSync(process.execPath,['scripts/center-uat/bootstrap.mjs'],{env,encoding:'utf8',timeout:120000});
const tokens={};
async function request(actor,path,body,method){
  return fetch('http://127.0.0.1:4173/api/v1'+path,{method:method??(body===undefined?'GET':'POST'),headers:{'content-type':'application/json',...(tokens[actor]?{authorization:'Bearer '+tokens[actor]}:{})},body:body===undefined?undefined:JSON.stringify(body)});
}
async function call(actor,path,body,expected,method){
  const res=await request(actor,path,body,method);
  const text=await res.text();
  ok(expected?expected.includes(res.status):res.ok,`${actor} ${path}: HTTP ${res.status} ${text.slice(0,500)}`);
  return text?JSON.parse(text):null;
}
try {
  await db.$executeRaw`CREATE TABLE "UnrelatedData" (id integer)`;
  let result=boot();
  ok(result.status!==0 && result.stderr.includes('UAT_EXISTING_DATABASE_DENIED'),'refuses an occupied, unmarked database');
  await db.$executeRaw`DROP TABLE "UnrelatedData"`;
  result=boot();
  ok(result.status===0, 'fresh bootstrap: '+result.stderr);
  const ids=await db.account.findMany({select:{id:true,email:true,passwordHash:true},orderBy:{email:'asc'}});
  ok(ids.length===9&&ids.filter(x=>x.passwordHash.includes(':')).length===7,'seven sign-in accounts and two customers without passwords');
  result=boot();
  ok(result.status===0,'repeat bootstrap');
  assert.deepEqual(await db.account.findMany({select:{id:true,email:true,passwordHash:true},orderBy:{email:'asc'}}),ids); checks++;
  const account=Object.fromEntries(ids.map(x=>[x.email.split('@')[0],x.id]));
  const center=await db.orgUnit.findFirstOrThrow({where:{code:'UAT-A'}});
  child=spawn(process.execPath,['scripts/center-uat/serve.mjs'],{env,stdio:['ignore','inherit','inherit']});
  let ready=false;
  for(let i=0;i<90;i++){
    try{if((await fetch('http://127.0.0.1:4173/api/v1/health/ready')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  ok(ready,'gateway ready');
  const page=await fetch('http://127.0.0.1:4173/');
  ok(page.headers.get('content-security-policy')?.includes("connect-src 'self'"),'browser network boundary');
  ok((await page.text()).includes('window.HYDROLAND_API_BASE=window.location.origin'),'same-origin API configuration');
  await call(null,'/auth/register/',{email:'not-allowed@example.test',password:'not-allowed'},[403]);
  await call(null,'/finance/mine/centers',undefined,[401]);
  for(const actor of actors){const login=await call(null,'/auth/login',{email:actor+'@center-uat.hydroland.test',password:passwordFor(actor,secret)});ok(typeof login.accessToken==='string','real login '+actor);tokens[actor]=login.accessToken;}
  ok(await db.session.count()===7,'real stored sessions, no CI auth bypass');
  await call(null,'/auth/login',{email:'customer-a@fixtures.hydroland.test',password:'UAT_CUSTOMER_LOGIN_DISABLED'},[401]);
  await call('manager','/center/me/overview');
  await call('admin','/center/me/overview',undefined,[403]);
  const centers=await call('accountant1','/finance/mine/centers');
  ok(centers.length===1&&centers[0].id===center.id,'accountant center scope');
  await call('outsider',`/finance/centers/${center.id}/workspace`,undefined,[403]);
  await call('admin','/finance/shifts/open',{centerOrgUnitId:center.id,openingBalanceMinor:0},[403]);
  const receivables=await prepareReceivableChecks({db,call,ok,center,account});
  const licenses=await prepareLicenseChecks({db,call,request,ok,center,account});
  const first=await call('accountant1','/finance/shifts/open',{centerOrgUnitId:center.id,openingBalanceMinor:10000});
  await call('accountant1','/finance/shifts/open',{centerOrgUnitId:center.id,openingBalanceMinor:0},[409]);
  const second=await call('accountant2','/finance/shifts/open',{centerOrgUnitId:center.id,openingBalanceMinor:0});
  await call('accountant2',`/finance/shifts/${first.id}/entries`,{type:'EXPENSE',amountMinor:100},[403]);
  await call('accountant1',`/finance/shifts/${first.id}/entries`,{type:'EXPENSE',amountMinor:1000,description:'مصروف وهمي لقبول النظام'});
  await receivables.collectFirst(first.id);
  const handover=await call('accountant1',`/finance/shifts/${first.id}/handover`,{toAccountantId:account.accountant2,actualCashMinor:49000});
  await call('accountant1',`/finance/shifts/handovers/${handover.id}/accept`,{},[403]);
  const accepted=await call('accountant2',`/finance/shifts/handovers/${handover.id}/accept`,{});
  ok(accepted.openingBalanceMinor===49000,'handover includes collected amount');
  await call('accountant2',`/finance/shifts/handovers/${handover.id}/accept`,{},[409]);
  await receivables.collectSecond(second.id);
  const close=await call('accountant2',`/finance/centers/${center.id}/shifts/${second.id}/close`,{actualCashMinor:109000});
  await call('accountant2',`/finance/shift-close-reviews/${close.submissionId}/decision`,{decision:'APPROVED'},[403]);
  const reviewed=await call('manager',`/finance/shift-close-reviews/${close.submissionId}/decision`,{decision:'APPROVED'});
  ok(reviewed.status==='APPROVED','independent close review');
  const period=await call('accountant1',`/finance/centers/${center.id}/period-close-submissions`,{periodType:'MONTH',periodKey:'2000-01'});
  const approval1=await call('finance1',`/finance/period-close-submissions/${period.submissionId}/decision`,{decision:'APPROVED'});
  ok(approval1.status==='SUBMITTED'&&approval1.approvalCount===1,'one approval cannot close period');
  await call('finance1',`/finance/period-close-submissions/${period.submissionId}/decision`,{decision:'APPROVED'},[400]);
  const approval2=await call('finance2',`/finance/period-close-submissions/${period.submissionId}/decision`,{decision:'APPROVED'});
  ok(approval2.status==='CLOSED'&&approval2.approvalCount===2,'two independent approvals');
  result=boot();ok(result.status===0,'restart after transactions');
  ok(await db.financeAccountantShift.count()===2,'restart preserves finance history');
  await receivables.verifyRestart();
  await licenses.verifyRestart();
  console.log(JSON.stringify({suite:'center-uat-real-auth',checks,synthetic:true,productionWrites:0,externalProviderCalls:0}));
} finally {
  child?.kill('SIGTERM');
  await db.$disconnect();
}
