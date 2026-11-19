import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {basename,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();

export function sourceReceipt(env,source,now=new Date()){
  assert(sha(source.commit)&&sha(source.tree)&&sha(env.GITHUB_SHA),'Exact source commit/tree and GitHub SHA are required');
  assert.equal(source.commit,env.GITHUB_SHA,'Checkout differs from the workflow event SHA');
  assert.equal(source.trackedChanges,'','Tracked source must be clean before acceptance');
  const requestedPrHead=env.HL_REQUESTED_PR_HEAD||null;
  assert(requestedPrHead===null||sha(requestedPrHead),'Invalid requested PR head');
  assert(/^[1-9]\d*$/.test(env.GITHUB_RUN_ID||'')&&/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT||''),'Run identity is required');
  assert(env.GITHUB_EVENT_NAME!=='pull_request'||requestedPrHead,'PR event requires its requested head');
  return{schemaVersion:1,kind:'SOURCE_RECEIPT_ONLY',recordedAt:now.toISOString(),repository:env.GITHUB_REPOSITORY,event:env.GITHUB_EVENT_NAME,ref:env.GITHUB_REF,workflow:env.GITHUB_WORKFLOW,job:env.GITHUB_JOB,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,checkoutCommit:source.commit,checkoutTree:source.tree,githubSha:env.GITHUB_SHA,requestedPrHead,requestedHead:requestedPrHead||env.GITHUB_SHA,testResult:null};
}

export function verifyReport(report,receipt,{file,count}={}){
  assert(receipt?.kind==='SOURCE_RECEIPT_ONLY'&&sha(receipt.checkoutCommit)&&sha(receipt.checkoutTree),'Source receipt is required');
  assert(Array.isArray(report?.suites)&&Array.isArray(report?.errors)&&report.errors.length===0,'Native Playwright report is missing or contains global errors');
  assert(Number.isFinite(Date.parse(report.stats?.startTime))&&Date.parse(report.stats.startTime)>=Date.parse(receipt.recordedAt),'Report predates the recorded source');
  assert.equal(report.stats.unexpected,0,'Report contains unexpected outcomes');
  const records=[];
  function visit(suite){
    for(const spec of suite.specs||[])for(const test of spec.tests||[]){
      assert(Array.isArray(test.results)&&test.results.length>0,'Discovered tests are not execution results');
      records.push({file:spec.file||suite.file,title:spec.title,project:test.projectName||'',expectedStatus:test.expectedStatus,outcome:test.status,results:test.results});
    }
    for(const child of suite.suites||[])visit(child);
  }
  for(const suite of report.suites)visit(suite);
  assert(records.length>0&&records.some(test=>test.results.some(result=>result.status==='passed')),'No executed passing case is recorded');
  if(file){
    assert(Number.isSafeInteger(count)&&count>0,'Focused case count is required');
    assert.equal(records.length,count,'Focused case count changed');
    assert(records.every(test=>basename(test.file||'')===file),'Focused report contains a different specification');
    assert(records.every(test=>test.expectedStatus==='passed'&&test.outcome==='expected'&&test.results.at(-1)?.status==='passed'),'Every focused case must actually pass');
  }
  return{kind:'BROWSER_EXECUTION_EVIDENCE',checkoutCommit:receipt.checkoutCommit,checkoutTree:receipt.checkoutTree,requestedPrHead:receipt.requestedPrHead,requestedHead:receipt.requestedHead,runId:receipt.runId,runAttempt:receipt.runAttempt,scope:file||'FULL_BROWSER_SUITE',recordedCases:records.length,passedCases:records.filter(test=>test.results.at(-1)?.status==='passed').length,stats:report.stats};
}

function writeJson(path,value){mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');}
function currentSource(){return{commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),trackedChanges:git('status','--porcelain','--untracked-files=no')};}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [mode,path,receiptPath,file,count]=process.argv.slice(2);
  assert(path,'Evidence output path is required');
  if(mode==='source'){
    const receipt=sourceReceipt(process.env,currentSource());writeJson(path,receipt);console.log(JSON.stringify(receipt));
  }else if(mode==='verify'){
    assert(receiptPath&&statSync(path).size>0,'Nonempty Playwright result file is required after successful execution');
    const bytes=readFileSync(path),sourceBytes=readFileSync(receiptPath),receipt=JSON.parse(sourceBytes),source=currentSource();
    assert.equal(source.commit,receipt.checkoutCommit,'Checkout changed during acceptance');assert.equal(source.tree,receipt.checkoutTree,'Source tree changed during acceptance');assert.equal(source.trackedChanges,'','Tracked source changed during acceptance');
    const result=verifyReport(JSON.parse(bytes),receipt,file?{file,count:Number(count)}:{});
    const proof={...result,reportSha256:hash(bytes),sourceReceiptSha256:hash(sourceBytes)};
    writeJson(path.replace(/\.json$/,'')+'.verified.json',proof);console.log(JSON.stringify(proof));
  }else throw new Error('Use source or verify mode');
}
