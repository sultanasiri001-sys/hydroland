import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {bindReleaseSource,evaluateBoundReleaseEvidence} from './a02-release-source-binding.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const workflowPath='.github/workflows/validation.yml';
const workflow=`name: Synthetic source fixture
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Critical validation
        run: node --version
`;
const policy={schemaVersion:1,repository:'synthetic/fixture',repositoryId:1,branch:'main',event:'push',maxSnapshotAgeMs:300000,maxRunAgeMs:86400000,required:[{workflowId:1,path:workflowPath,jobs:['build'],criticalSteps:{build:['Critical validation']}}]};
function withRepo(callback){
  const path=mkdtempSync(join(tmpdir(),'a02-source-binding-'));
  const git=(...args)=>execFileSync('git',['-C',path,...args],{encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',LC_ALL:'C'}}).trim();
  try{
    git('init','--quiet','--template=');mkdirSync(join(path,'.github/workflows'),{recursive:true});mkdirSync(join(path,'scripts'));
    const inventory=JSON.stringify({status:'PROPOSED_NOT_ADOPTED',policy,workflows:[{path:workflowPath,disposition:'required',reason:'Synthetic source binding fixture'}]});
    writeFileSync(join(path,workflowPath),workflow);writeFileSync(join(path,'scripts/a02-release-inventory.json'),inventory);
    const commit=()=>{git('add','.');git('-c','user.name=Synthetic Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','--allow-empty','-m','Synthetic fixture');return git('rev-parse','HEAD');};
    const expectedCommit=commit();
    const target={repositoryPath:path,expectedCommit,expectedTree:git('rev-parse','HEAD^{tree}'),expectedInventoryDigest:hash(inventory),expectedRepository:policy.repository};
    const refresh=()=>({...target,expectedCommit:commit(),expectedTree:git('rev-parse','HEAD^{tree}')});
    return callback({path,git,target,inventory,refresh});
  }finally{rmSync(path,{recursive:true,force:true});}
}
function receipt(target){
 const now=Date.parse('2026-10-29T12:00:00Z'),iso=n=>new Date(n).toISOString(),repo={id:1,full_name:policy.repository};
 return {now,evidence:{schemaVersion:1,complete:true,repository:policy.repository,repositoryId:1,branch:'main',headBefore:target.expectedCommit,headAfter:target.expectedCommit,capturedAt:iso(now),total_count:1,workflow_runs:[{id:1,workflow_id:1,path:workflowPath,head_sha:target.expectedCommit,head_branch:'main',event:'push',run_number:1,run_attempt:1,repository:repo,head_repository:repo,status:'completed',conclusion:'success',created_at:iso(now-120000),updated_at:iso(now-60000)}],jobs:{1:{complete:true,runId:1,runAttempt:1,total_count:1,jobs:[{id:1,run_id:1,head_sha:target.expectedCommit,name:'build',status:'completed',conclusion:'success',started_at:iso(now-110000),completed_at:iso(now-61000),steps:[{number:1,name:'Critical validation',status:'completed',conclusion:'success'}]}]}}}};
}
test('binds exact commit/tree/inventory and evaluates real source with synthetic evidence',()=>withRepo(({target})=>{
 const binding=bindReleaseSource(target);assert.equal(binding.status,'PASS');assert.equal(binding.productionAuthorized,false);assert.deepEqual(binding.policy,policy);
 const {evidence,now}=receipt(target);const result=evaluateBoundReleaseEvidence(target,evidence,now);assert.equal(result.status,'PASS');assert.equal(result.productionAuthorized,false);assert.equal(result.sourceTree,target.expectedTree);
 evidence.jobs[1].jobs[0].steps[0].conclusion='skipped';assert.equal(evaluateBoundReleaseEvidence(target,evidence,now).status,'BLOCKED');
}));
for(const [name,field,value,reason] of [
 ['branch label instead of commit','expectedCommit','main','INVALID_TRUSTED_TARGET'],
 ['wrong tree','expectedTree','b'.repeat(40),'TARGET_TREE_MISMATCH'],
 ['wrong inventory digest','expectedInventoryDigest','b'.repeat(64),'INVENTORY_DIGEST_MISMATCH'],
 ['wrong repository','expectedRepository','other/fixture','POLICY_REPOSITORY_MISMATCH'],
 ['relative repository path','repositoryPath','.','INVALID_TRUSTED_TARGET'],
 ['missing inventory approval digest','expectedInventoryDigest',undefined,'INVALID_TRUSTED_TARGET'],
])test(`source binding blocks ${name}`,()=>withRepo(({target})=>{
 const result=bindReleaseSource({...target,[field]:value});assert.equal(result.status,'BLOCKED');assert.deepEqual(result.reasons,[reason]);assert.equal(result.policy,null);
}));
test('working copy cannot substitute for exact committed source',()=>withRepo(({path,target})=>{
 writeFileSync(join(path,'scripts/a02-release-inventory.json'),'UNTRUSTED_WORKTREE');writeFileSync(join(path,workflowPath),'UNTRUSTED_WORKTREE');
 assert.equal(bindReleaseSource(target).status,'PASS');
}));
test('candidate policy change cannot silently choose its own trusted digest',()=>withRepo(({path,target,inventory,refresh})=>{
 const changed=JSON.parse(inventory);delete changed.policy.required[0].criticalSteps;writeFileSync(join(path,'scripts/a02-release-inventory.json'),JSON.stringify(changed));
 const next=refresh();assert.equal(bindReleaseSource(next).status,'BLOCKED');assert.equal(bindReleaseSource(target).status,'PASS');
}));
for(const [name,change] of [
 ['conditional critical step',s=>s.replace('        run:','        if: false\n        run:')],
 ['optional critical step',s=>s.replace('        run:','        continue-on-error: true\n        run:')],
 ['missing critical step',s=>s.replace('Critical validation','Unrelated validation')],
 ['filtered main push',s=>s.replace('    branches: [main]','    branches: [main]\n    paths: [docs/**]')],
])test(`exact target source refuses ${name}`,()=>withRepo(({path,refresh})=>{
 writeFileSync(join(path,workflowPath),change(workflow));assert.deepEqual(bindReleaseSource(refresh()).reasons,['SOURCE_CONTRACT_BLOCKED']);
}));
test('unclassified new workflow in target tree blocks',()=>withRepo(({path,refresh})=>{
 writeFileSync(join(path,'.github/workflows/new.yml'),workflow);assert.equal(bindReleaseSource(refresh()).status,'BLOCKED');
}));
test('symlink workflow mode blocks without following its target',()=>withRepo(({path,refresh})=>{
 rmSync(join(path,workflowPath));symlinkSync('/synthetic/nonexistent',join(path,workflowPath));assert.deepEqual(bindReleaseSource(refresh()).reasons,['UNSUPPORTED_WORKFLOW_MODE']);
}));
test('Git replacement refs cannot replace approved source',()=>withRepo(({path,target,git,refresh})=>{
 writeFileSync(join(path,workflowPath),'invalid source');const next=refresh();git('replace',target.expectedCommit,next.expectedCommit);
 assert.equal(bindReleaseSource(target).status,'PASS');
}));
test('Git environment overrides are not inherited',()=>withRepo(({target})=>{
 const before=process.env.GIT_DIR;process.env.GIT_DIR='/synthetic/nonexistent';try{assert.equal(bindReleaseSource(target).status,'PASS');}finally{if(before===undefined)delete process.env.GIT_DIR;else process.env.GIT_DIR=before;}
}));
test('missing Git source yields sanitized failure and no policy',()=>withRepo(({target})=>{
 const r=bindReleaseSource({...target,repositoryPath:'/synthetic/SECRET_NOT_RETAINED'});assert.equal(r.status,'BLOCKED');assert.equal(r.policy,null);assert(!JSON.stringify(r).includes('SECRET_NOT_RETAINED'));
}));
test('coordinator wrapper cannot accept fabricated binding success instead of trusted target',()=>{
 const r=evaluateBoundReleaseEvidence({status:'PASS',policy,commit:'a'.repeat(40)},{});assert.equal(r.status,'BLOCKED');assert.equal(r.productionAuthorized,false);
});
