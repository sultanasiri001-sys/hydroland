import { assertOperationalClearance, assertOperationalScope, assertSegregation } from './operations-policy';

function expectThrow(fn:()=>unknown,code:string){let message='';try{fn();}catch(error){message=error instanceof Error?error.message:String(error);}if(message!==code)throw new Error(`Expected ${code}, got ${message||'NO_ERROR'}`);}

const future=new Date(Date.now()+60_000);
const ready={tripOpen:true,startsAt:future,safetyDecision:'ALLOWED' as const,complianceDecision:'ALLOWED' as const,weatherBlocking:false,crewReady:true,resourcesReady:true};

if(!assertOperationalClearance(ready))throw new Error('Ready trip must pass.');
expectThrow(()=>assertOperationalClearance({...ready,safetyDecision:'DEFERRED'}),'OPERATIONS_SAFETY_BLOCK');
expectThrow(()=>assertOperationalClearance({...ready,complianceDecision:'REVIEW_REQUIRED'}),'OPERATIONS_COMPLIANCE_BLOCK');
expectThrow(()=>assertOperationalClearance({...ready,weatherBlocking:true}),'OPERATIONS_WEATHER_BLOCK');
expectThrow(()=>assertOperationalClearance({...ready,crewReady:false}),'OPERATIONS_CREW_NOT_READY');
expectThrow(()=>assertOperationalClearance({...ready,resourcesReady:false}),'OPERATIONS_RESOURCES_NOT_READY');
expectThrow(()=>assertOperationalClearance({...ready,tripOpen:false}),'OPERATIONS_TRIP_NOT_OPEN');
expectThrow(()=>assertOperationalClearance({...ready,startsAt:new Date(Date.now()-1)}),'OPERATIONS_TRIP_ALREADY_STARTED');

assertOperationalScope({accountId:'manager-a',role:'CENTER_MANAGER',centerId:'center-a'},'center-a');
expectThrow(()=>assertOperationalScope({accountId:'manager-a',role:'CENTER_MANAGER',centerId:'center-a'},'center-b'),'OPERATIONS_CENTER_SCOPE_DENIED');

assertSegregation('maker','reviewer','approver');
expectThrow(()=>assertSegregation('maker','maker','approver'),'OPERATIONS_SEGREGATION_OF_DUTIES_VIOLATION');
expectThrow(()=>assertSegregation('maker','reviewer','maker'),'OPERATIONS_SEGREGATION_OF_DUTIES_VIOLATION');

console.log('Operations policy assertions passed.');
