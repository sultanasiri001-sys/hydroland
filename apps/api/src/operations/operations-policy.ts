export type OperationalReadiness = {
  tripOpen: boolean;
  startsAt: Date;
  safetyDecision?: 'ALLOWED'|'REVIEW_REQUIRED'|'DEFERRED'|null;
  complianceDecision?: 'ALLOWED'|'REVIEW_REQUIRED'|'DEFERRED'|null;
  weatherBlocking: boolean;
  crewReady: boolean;
  resourcesReady: boolean;
};

export type OperationalActor = {
  accountId: string;
  role: 'CENTER_MANAGER'|'OPERATIONS'|'SAFETY'|'COMPLIANCE'|'EXECUTIVE'|'SYSTEM';
  centerId?: string;
};

export function assertOperationalScope(actor:OperationalActor,targetCenterId?:string){
  if(actor.role==='CENTER_MANAGER' && (!targetCenterId || !actor.centerId || actor.centerId!==targetCenterId)) throw new Error('OPERATIONS_CENTER_SCOPE_DENIED');
}

export function assertOperationalClearance(readiness:OperationalReadiness,now=new Date()){
  if(!readiness.tripOpen) throw new Error('OPERATIONS_TRIP_NOT_OPEN');
  if(readiness.startsAt<=now) throw new Error('OPERATIONS_TRIP_ALREADY_STARTED');
  if(readiness.safetyDecision!=='ALLOWED') throw new Error('OPERATIONS_SAFETY_BLOCK');
  if(readiness.complianceDecision!=='ALLOWED') throw new Error('OPERATIONS_COMPLIANCE_BLOCK');
  if(readiness.weatherBlocking) throw new Error('OPERATIONS_WEATHER_BLOCK');
  if(!readiness.crewReady) throw new Error('OPERATIONS_CREW_NOT_READY');
  if(!readiness.resourcesReady) throw new Error('OPERATIONS_RESOURCES_NOT_READY');
  return true;
}

export function assertSegregation(requestedBy:string,reviewedBy?:string|null,approvedBy?:string|null){
  const actors=[requestedBy,reviewedBy,approvedBy].filter((value):value is string=>Boolean(value));
  if(new Set(actors).size!==actors.length) throw new Error('OPERATIONS_SEGREGATION_OF_DUTIES_VIOLATION');
}
