export const MARINE_ASSET_TYPES=['DIVE_BOAT','YACHT','RIB','SUPPORT_VESSEL','OTHER'] as const;
export type MarineAssetType=typeof MARINE_ASSET_TYPES[number];
export const REQUIRED_MARINE_DOCUMENTS=['REGISTRATION','NAVIGATION_LICENSE','OPERATING_LICENSE','SAFETY_CERTIFICATE','PERIODIC_INSPECTION','COMMUNICATIONS_LICENSE'] as const;
export type MarineReadinessResult={status:'READY'|'NEEDS_REVIEW'|'NOT_READY';reasonCodes:string[]};

/** Pure projection shared by the native readiness writer and passport reads.
 * Reading a passport must not append a readiness approval/snapshot. */
export function inspectMarineReadiness(asset:{status:string;calendarResourceId:string|null;
 documents:Array<{documentType:string;status:string;expiresAt:Date|null}>;
 maintenance:Array<{status:string;dueAt:Date|null}>},now=new Date()):MarineReadinessResult{
 const reasons:string[]=[];
 if(asset.status!=='ACTIVE')reasons.push('ASSET_NOT_ACTIVE');
 if(!asset.calendarResourceId)reasons.push('CALENDAR_RESOURCE_NOT_LINKED');
 for(const type of REQUIRED_MARINE_DOCUMENTS){
  if(!asset.documents.some(d=>d.documentType===type&&d.status==='VERIFIED'&&(!d.expiresAt||d.expiresAt>now)))reasons.push('DOCUMENT_'+type+'_INVALID');
 }
 if(asset.maintenance.some(m=>!['COMPLETED','CANCELLED'].includes(m.status)&&(!m.dueAt||m.dueAt<=now)))reasons.push('MAINTENANCE_BLOCKING');
 const hard=reasons.filter(reason=>reason!=='CALENDAR_RESOURCE_NOT_LINKED');
 return{status:hard.length?'NOT_READY':reasons.length?'NEEDS_REVIEW':'READY',reasonCodes:reasons};
}
