import {randomUUID} from 'expo-crypto';
import {authorizedFetch,ApiError} from './api';
import {getSessionScope,assertSessionScope,subscribeSession,type SessionScope} from './session';
import {acceptOfflineLease,offlineClock,requireOfflineLease,offlineTripEpoch,assertOfflineTripEpoch,clearTripOfflineLeases,type OfflineLease} from './offline-access';
import {ensureOfflineEncryption} from './offline-vault';
import {loadOfflineRecord,saveOfflineRecord,deleteOfflineRecord,deleteOfflineDraftRecords} from './offline-content-store';
import {OfflineAccessError} from './offline-errors';
export type OfflineDraftSource={id:string;tripId:string;version:number;status:'DRAFT';title:string|null;summary:unknown;revision:string;accessLease:OfflineLease};
export type OfflineDraftOperation={operationId:string;kind:'PATCH_BRIEFING_DRAFT';tripId:string;briefingId:string;expectedRevision:string;patch:{title:string;summary:{notes:string}}};
export type OfflineSyncResult={operationId:string;status:'APPLIED'|'CONFLICT'|'NEEDS_ONLINE_VERIFICATION';briefingId?:string;revision?:string;currentRevision?:string;reason?:string;replayed?:boolean};
export type OfflineDraftRecord={source:OfflineDraftSource;pending?:OfflineDraftOperation;attempted?:boolean;lastResult?:OfflineSyncResult};
const epochs=new Map<string,number>(),running=new Map<string,Promise<OfflineSyncResult[]>>();
subscribeSession(()=>{epochs.clear();running.clear()});
const key=(scope:SessionScope,id:string)=>scope.cacheId+':'+id;
const epoch=(scope:SessionScope,id:string)=>epochs.get(key(scope,id))??0;
function bump(scope:SessionScope,id:string){epochs.set(key(scope,id),epoch(scope,id)+1)}
async function scope(){const value=await getSessionScope();if(!value)throw new ApiError(401,'Authentication required.');assertSessionScope(value);return value}
const base=(tripId:string)=>'/mobile-offline/trips/'+encodeURIComponent(tripId)+'/drafts';
const path=(tripId:string,id:string)=>base(tripId)+'/'+encodeURIComponent(id);
const needed=()=>new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Online draft verification is required.');
async function request<T>(tripId:string,current:SessionScope,url:string){try{return await authorizedFetch<T>(url)}catch(error){assertSessionScope(current);if(error instanceof ApiError&&error.status===403){clearTripOfflineLeases(tripId,true);deleteOfflineDraftRecords(tripId,current)}throw error}}
function accept(source:OfflineDraftSource,tripId:string,id:string,current:SessionScope,clock:ReturnType<typeof offlineClock>){
 if(source?.id!==id||source.tripId!==tripId||source.status!=='DRAFT'||!/^[a-f0-9]{64}$/.test(source.revision)||source.accessLease?.resourceKind!=='DRAFT'||source.accessLease.resourceId!==id||source.accessLease.sourceRevision!==source.revision||source.accessLease.tripId!==tripId)throw needed();
 acceptOfflineLease(source.accessLease,current,clock);
}
async function put(record:OfflineDraftRecord,current:SessionScope){bump(current,record.source.id);const fence=epoch(current,record.source.id);await saveOfflineRecord('DRAFT',record.source.id,record,current,()=>epoch(current,record.source.id)===fence);assertSessionScope(current)}
export async function loadOfflineDraft(tripId:string,id:string,current?:SessionScope):Promise<OfflineDraftRecord|null>{
 current=current??await scope();const value=await loadOfflineRecord('DRAFT',id,current,tripId);assertSessionScope(current);
 if(value&&(value.source?.id!==id||value.source.tripId!==tripId||value.source.status!=='DRAFT'||(value.pending&&(value.pending.briefingId!==id||value.pending.tripId!==tripId||value.pending.kind!=='PATCH_BRIEFING_DRAFT'))))throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Invalid encrypted draft.');return value;
}
export async function refreshOfflineDraft(tripId:string,id:string,current?:SessionScope){
 const tripEpoch=offlineTripEpoch(tripId,true);current=current??await scope();await ensureOfflineEncryption(current);assertSessionScope(current);assertOfflineTripEpoch(tripId,tripEpoch,true);const clock=offlineClock(),before=epoch(current,id);
 const source=await request<OfflineDraftSource>(tripId,current,path(tripId,id));assertSessionScope(current);if(before!==epoch(current,id))throw needed();accept(source,tripId,id,current,clock);
 const stored=await loadOfflineDraft(tripId,id,current);assertSessionScope(current);if(before!==epoch(current,id))throw needed();const record={...stored,source};await put(record,current);return record;
}
export async function refreshOfflineDrafts(tripId:string){
 const tripEpoch=offlineTripEpoch(tripId,true),current=await scope();await ensureOfflineEncryption(current);assertSessionScope(current);assertOfflineTripEpoch(tripId,tripEpoch,true);const clock=offlineClock(),before=new Map(epochs);
 const result=await request<{tripId:string;items:OfflineDraftSource[];accessLease:OfflineLease}>(tripId,current,base(tripId));assertSessionScope(current);
 if(result.tripId!==tripId||!Array.isArray(result.items)||result.items.length>20||result.accessLease?.resourceKind!=='DRAFTS'||result.accessLease.resourceId!==tripId)throw needed();
 acceptOfflineLease(result.accessLease,current,clock);const records:OfflineDraftRecord[]=[];
 for(const source of result.items){const fence=before.get(key(current,source.id))??0;if(fence!==epoch(current,source.id))throw needed();accept(source,tripId,source.id,current,clock);const stored=await loadOfflineDraft(tripId,source.id,current);if(fence!==epoch(current,source.id))throw needed();const record={...stored,source};await put(record,current);records.push(record)}
 await saveOfflineRecord('DRAFTS',tripId,{tripId,ids:records.map(r=>r.source.id)},current);return records;
}
export async function loadOfflineDrafts(tripId:string){const current=await scope(),index=await loadOfflineRecord('DRAFTS',tripId,current);if(!index)return[];
 if(index.tripId!==tripId||!Array.isArray(index.ids)||index.ids.length>20||index.ids.some((id:unknown)=>typeof id!=='string'))throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Invalid draft list.');
 const records=await Promise.all(index.ids.map((id:string)=>loadOfflineDraft(tripId,id,current)));assertSessionScope(current);return records.filter((r:OfflineDraftRecord|null):r is OfflineDraftRecord=>!!r);
}
function operation(source:OfflineDraftSource,title:string,notes:string):OfflineDraftOperation{
 if(typeof title!=='string'||!title.trim()||title.length>200||typeof notes!=='string'||notes.length>4000)throw new Error('Draft text is outside its supported limits.');
 return{operationId:randomUUID(),kind:'PATCH_BRIEFING_DRAFT',tripId:source.tripId,briefingId:source.id,expectedRevision:source.revision,patch:{title,summary:{notes}}};
}
export async function queueOfflineDraft(tripId:string,id:string,title:string,notes:string){const current=await scope(),record=await loadOfflineDraft(tripId,id,current);if(!record)throw needed();
 requireOfflineLease('DRAFT',id,current,record.source.revision);if(record.pending)throw new OfflineAccessError('PENDING_SYNC','Resolve or retry the pending draft before another edit.');
 const next={...record,pending:operation(record.source,title,notes),attempted:false,lastResult:undefined};await put(next,current);return next;
}
export function discardOfflineDraft(tripId:string,id:string,current:SessionScope){assertSessionScope(current);bump(current,id);deleteOfflineRecord('DRAFT',id,current,tripId)}
export async function syncOfflineDrafts(tripId:string,ids:string[]):Promise<OfflineSyncResult[]>{
 const tripEpoch=offlineTripEpoch(tripId,true),current=await scope();assertOfflineTripEpoch(tripId,tripEpoch,true);const batchKey=key(current,tripId);if(running.has(batchKey))return running.get(batchKey)!;
 const promise=(async()=>{
  if(ids.length>20||new Set(ids).size!==ids.length)throw new Error('Draft batch is too large.');
  const records:OfflineDraftRecord[]=[],prepared=new Map<string,number>();
  for(const id of ids){assertOfflineTripEpoch(tripId,tripEpoch,true);const record=await refreshOfflineDraft(tripId,id,current);assertOfflineTripEpoch(tripId,tripEpoch,true);if(record.pending){records.push(record);prepared.set(id,epoch(current,id))}}
  const results:OfflineSyncResult[]=[];
  for(let offset=0;offset<records.length;offset+=10){
   const batch=records.slice(offset,offset+10).filter(record=>epoch(current,record.source.id)===prepared.get(record.source.id)),fences=new Map<string,number>();if(!batch.length)continue;
   for(const record of batch){if(epoch(current,record.source.id)!==prepared.get(record.source.id))throw needed();await put({...record,attempted:true},current);fences.set(record.source.id,epoch(current,record.source.id))}
   const operations=batch.map(record=>({...record.pending!,leaseToken:requireOfflineLease('DRAFT',record.source.id,current).token}));
   const response=await authorizedFetch<{results:OfflineSyncResult[]}>('/mobile-offline/sync',{method:'POST',body:JSON.stringify({operations})});assertSessionScope(current);
   if(!Array.isArray(response.results)||response.results.length!==batch.length||new Set(response.results.map(r=>r.operationId)).size!==batch.length||response.results.some(r=>!operations.some(op=>op.operationId===r.operationId)||!['APPLIED','CONFLICT','NEEDS_ONLINE_VERIFICATION'].includes(r.status)))throw new Error('Invalid synchronization response.');
   assertOfflineTripEpoch(tripId,tripEpoch,true);for(const result of response.results){
    const record=batch.find(r=>r.pending!.operationId===result.operationId)!;
    if(epoch(current,record.source.id)!==fences.get(record.source.id))continue;
    if(result.status==='APPLIED'&&!/^[a-f0-9]{64}$/.test(result.revision??''))throw new Error('Invalid applied revision.');
    const next:OfflineDraftRecord={...record,lastResult:result,attempted:true};
    if(result.status==='APPLIED'){next.source={...record.source,title:record.pending!.patch.title,summary:record.pending!.patch.summary,revision:result.revision!};delete next.pending}
    await put(next,current);results.push(result);
    try{await refreshOfflineDraft(tripId,record.source.id,current)}catch(error){assertSessionScope(current);if(error instanceof ApiError&&(error.status===401||error.status===403))throw error}
   }
  }
  assertSessionScope(current);return results;
 })();running.set(batchKey,promise);try{return await promise}finally{if(running.get(batchKey)===promise)running.delete(batchKey)}
}
export async function resolveOfflineDraftConflict(tripId:string,id:string,choice:'SERVER'|'MERGE',reviewedRevision:string,values?:{title:string;notes:string}){
 const current=await scope(),record=await refreshOfflineDraft(tripId,id,current);if(record.lastResult?.status!=='CONFLICT'||!record.pending)throw needed();
 if(choice==='SERVER'){const next={source:record.source};await put(next,current);return next}
 if(choice!=='MERGE'||record.source.revision!==reviewedRevision||!values)throw needed();
 const next={source:record.source,pending:operation(record.source,values.title,values.notes),attempted:false};await put(next,current);return next;
}
