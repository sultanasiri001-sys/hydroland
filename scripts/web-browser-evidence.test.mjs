import assert from 'node:assert/strict';
import test from 'node:test';
import {sourceReceipt,verifyReport} from './web-browser-evidence.mjs';

const commit='a'.repeat(40),tree='b'.repeat(40),head='c'.repeat(40);
const env={GITHUB_SHA:commit,HL_REQUESTED_PR_HEAD:head,GITHUB_EVENT_NAME:'pull_request',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_REPOSITORY:'synthetic/fixture',GITHUB_JOB:'validate'};
const source={commit,tree,trackedChanges:''};
const receipt=()=>sourceReceipt(env,source,new Date('2026-11-19T00:00:00Z'));
function report(){return{errors:[],stats:{startTime:'2026-11-19T00:00:01Z',duration:100,expected:4,skipped:0,unexpected:0,flaky:0},suites:[{file:'center-scoped-search.spec.js',specs:Array.from({length:4},(_,i)=>({title:'Synthetic contract case '+i,file:'center-scoped-search.spec.js',tests:[{projectName:'',expectedStatus:'passed',status:'expected',results:[{status:'passed',duration:20}]}]}))}]};}
const focused=value=>verifyReport(value,receipt(),{file:'center-scoped-search.spec.js',count:4});

test('source receipt distinguishes the actual merge checkout from the requested PR head without claiming a result',()=>{const value=receipt();assert.equal(value.checkoutCommit,commit);assert.equal(value.checkoutTree,tree);assert.equal(value.requestedPrHead,head);assert.equal(value.requestedHead,head);assert.equal(value.testResult,null)});
test('changed or dirty source and absent PR identity cannot create an acceptance receipt',()=>{assert.throws(()=>sourceReceipt(env,{...source,commit:head}));assert.throws(()=>sourceReceipt(env,{...source,trackedChanges:' M tracked.js'}));assert.throws(()=>sourceReceipt({...env,HL_REQUESTED_PR_HEAD:''},source))});
test('four actual focused outcomes retain their scope separately from the full suite',()=>{assert.equal(focused(report()).recordedCases,4);assert.equal(focused(report()).scope,'center-scoped-search.spec.js');assert.equal(verifyReport(report(),receipt()).scope,'FULL_BROWSER_SUITE')});
test('discovery and summary-only data cannot substitute for individual execution records',()=>{let value=report();value.suites[0].specs[0].tests[0].results=[];assert.throws(()=>focused(value));value=report();value.suites=[];assert.throws(()=>focused(value))});
test('skipped, failed, missing or unrelated focused cases cannot pass as the four center-search cases',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs[0].file='another.spec.js',r=>r.suites[0].specs[0].tests[0].results[0].status='skipped',r=>r.suites[0].specs[0].tests[0].results[0].status='failed']){const value=report();mutate(value);assert.throws(()=>focused(value))}});
test('stale reports and global runner errors cannot become current execution evidence',()=>{let value=report();value.stats.startTime='2026-11-18T23:59:59Z';assert.throws(()=>focused(value));value=report();value.errors=[{message:'Synthetic runner failure'}];assert.throws(()=>focused(value))});
