import assert from 'node:assert/strict';
import {validateAuditReport,auditScopes,summarizeAuditReport} from './release-dependency-audit.mjs';
const valid=()=>({metadata:{vulnerabilities:{high:0,critical:0}},vulnerabilities:{}});
const detailed={vulnerabilities:{
  'node-forge':{severity:'high',range:'<=1.4.0',fixAvailable:false,nodes:['node_modules/node-forge'],via:[{name:'node-forge',title:'Signature verification issue',severity:'high',range:'<=1.4.0',url:'https://example.invalid/advisory'}]},
  'some-parent':{severity:'moderate',via:['nested advisory']},
}};
assert.deepEqual(summarizeAuditReport(detailed),[
  {package:'node-forge',severity:'high',range:'<=1.4.0',fixAvailable:false,via:[{name:'node-forge',title:'Signature verification issue',severity:'high',range:'<=1.4.0',url:'https://example.invalid/advisory'}],nodes:['node_modules/node-forge']},
  {package:'some-parent',severity:'moderate',range:undefined,fixAvailable:undefined,via:[{name:'nested advisory'}],nodes:[]},
]);
assert.doesNotThrow(()=>validateAuditReport(valid(),0));
const moderate=valid();moderate.vulnerabilities.example={severity:'moderate'};
assert.doesNotThrow(()=>validateAuditReport(moderate,1));
for(const report of [null,{},[],{error:{message:'registry unavailable'}},
  {...valid(),vulnerabilities:[]},
  {...valid(),vulnerabilities:{malformed:null}},
  {...valid(),vulnerabilities:{malformed:{}}},
  {...valid(),metadata:{vulnerabilities:{high:'0',critical:0}}},
  {...valid(),metadata:{vulnerabilities:{high:-1,critical:0}}},
  {...valid(),metadata:{vulnerabilities:{high:1,critical:0}}},
  {...valid(),metadata:{vulnerabilities:{high:0,critical:1}}},
  {...valid(),vulnerabilities:{'node-forge':{severity:'high'}}},
  {...valid(),vulnerabilities:{unknown:{severity:'critical'}}}]){
  assert.throws(()=>validateAuditReport(report,1));
}
for(const status of [null,2,127])assert.throws(()=>validateAuditReport(valid(),status));
assert.deepEqual(auditScopes.repository,[],'Full repository coverage remains unfiltered');
assert.ok(auditScopes.mobile.includes('--workspace=@hydroland/mobile'));
assert.ok(auditScopes['web-api'].includes('--include-workspace-root=true'));
console.log('Release audit contract passed: clean/moderate reports, fail-closed errors, severity counts/rows and retained full/mobile coverage.');
