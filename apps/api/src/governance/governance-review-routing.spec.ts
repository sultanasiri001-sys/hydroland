import assert from 'node:assert/strict';
import { REVIEW_AGENTS, GovernanceSubmission, GovernanceReview, routeGovernanceSubmission } from './governance-review-routing';

const work: GovernanceSubmission = {
  workId:'work-1',departmentCode:'MARINE_OPERATIONS',submittedByAgentKey:'EXECUTIVE',
  stageFinal:false,architectureChange:false,securityOrPrivacyImpact:false,permissionChange:false,
  budgetException:false,contractException:false,destructiveProductionAction:false,
  safetyOrRegulatoryImpact:false,explicitlyOwnerReserved:false,risk:'LOW',evidenceRefs:['artifact:1'],
};
const reviews: GovernanceReview[]=REVIEW_AGENTS.map(agentKey=>({agentKey,verdict:'PASS',evidenceRefs:['proof:1'],findingCodes:[]}));
const route=(w:GovernanceSubmission=work,r:GovernanceReview[]=reviews)=>routeGovernanceSubmission(w,r);
assert.equal(route().route,'INTERNAL_REVIEW_COMPLETE');
assert.equal(route({...work,stageFinal:true}).route,'READY_FOR_OWNER');
assert.equal(route({...work,risk:'HIGH'}).route,'READY_FOR_OWNER');
assert.equal(route({...work,permissionChange:true}).route,'READY_FOR_OWNER');
assert.equal(route({...work,safetyOrRegulatoryImpact:true}).route,'READY_FOR_OWNER');
assert.equal(route({...work,evidenceRefs:[]}).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,reviews.slice(1)).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,[...reviews,reviews[0]]).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,reviews.map((r,i)=>i===0?{...r,verdict:'FAIL'}:r)).route,'RETURN_FOR_CORRECTION');
assert.equal(route(work,reviews.map((r,i)=>i===0?{...r,verdict:'NEEDS_EVIDENCE'}:r)).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,reviews.map((r,i)=>i===0?{...r,evidenceRefs:[]}:r)).route,'WAIT_FOR_EVIDENCE');
assert.equal(route({...work,submittedByAgentKey:REVIEW_AGENTS[0]}).route,'WAIT_FOR_EVIDENCE');
assert.equal(route({...work,risk:'UNKNOWN' as GovernanceSubmission['risk']}).route,'WAIT_FOR_EVIDENCE');
assert.equal(route({...work,stageFinal:'false' as unknown as boolean}).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,reviews.map((r,i)=>i===0?{...r,verdict:'UNKNOWN' as GovernanceReview['verdict']}:r)).route,'WAIT_FOR_EVIDENCE');
assert.equal(route(work,reviews.map((r,i)=>i===0?{...r,evidenceRefs:[null as unknown as string]}:r)).route,'WAIT_FOR_EVIDENCE');
console.log('Governance routing policy cases passed');
