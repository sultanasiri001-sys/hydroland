import {assertSessionScope,isSessionScopeCurrent,type SessionScope} from './session';
import {OfflineAccessError} from './offline-errors';
export type OfflineLease={version:1;accountId:string;sessionId:string;tripId:string;resourceKind:'PACKAGE'|'DRAFT'|'DRAFTS';resourceId:string;sourceRevision:string;issuedAt:string;expiresAt:string;token:string};
type Clock={wall:number;monotonic:number};
type Anchor={lease:OfflineLease;scope:SessionScope;started:Clock;received:Clock;last:Clock;deadline:number};
const anchors=new Map<string,Anchor>();
let invalidatedAt=-Infinity;
const tripInvalidatedAt=new Map<string,number>();
const key=(kind:OfflineLease['resourceKind'],id:string)=>kind+':'+id;
const needed=()=>new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Online source verification is required.');
export function offlineClock():Clock{const monotonic=globalThis.performance?.now();if(!Number.isFinite(monotonic))throw needed();return{wall:Date.now(),monotonic}}
export function clearOfflineLeases(){anchors.clear();invalidatedAt=globalThis.performance?.now()??Infinity}
export function clearTripOfflineLeases(tripId:string,draftsOnly=false){const scopeKey=tripId+(draftsOnly?':drafts':':all');tripInvalidatedAt.set(scopeKey,globalThis.performance?.now()??Infinity);for(const [id,value] of anchors)if(value.lease.tripId===tripId&&(!draftsOnly||value.lease.resourceKind!=='PACKAGE'))anchors.delete(id)}
export function clearPackageOfflineLease(tripId:string){tripInvalidatedAt.set(tripId+':package',globalThis.performance?.now()??Infinity);anchors.delete(key('PACKAGE',tripId))}
export function offlineTripEpoch(tripId:string,draftsOnly=false){return String(tripInvalidatedAt.get(tripId+':all'))+':'+String(tripInvalidatedAt.get(tripId+(draftsOnly?':drafts':':package')))}
export function assertOfflineTripEpoch(tripId:string,expected:string,draftsOnly=false){if(offlineTripEpoch(tripId,draftsOnly)!==expected)throw needed()}
/** Only call with a successful authenticated native API response. Stored files
 * cannot install an anchor. A process restart deliberately requires reconnect. */
export function acceptOfflineLease(value:OfflineLease,scope:SessionScope,started:Clock){
 assertSessionScope(scope);const now=offlineClock(),issued=Date.parse(value?.issuedAt),end=Date.parse(value?.expiresAt);
 const duration=end-issued,elapsed=now.monotonic-started.monotonic;
 if(started.monotonic<=invalidatedAt||started.monotonic<=(tripInvalidatedAt.get(value.tripId+':all')??-Infinity)||started.monotonic<=(tripInvalidatedAt.get(value.tripId+(value.resourceKind==='PACKAGE'?':package':':drafts'))??-Infinity))throw needed();
 if(value?.version!==1||value.accountId!==scope.accountId||!value.sessionId||!['PACKAGE','DRAFT','DRAFTS'].includes(value.resourceKind)||!value.resourceId||!value.tripId||!/^[a-f0-9]{64}$/.test(value.sourceRevision)||typeof value.token!=='string'||!value.token||!Number.isFinite(duration)||duration<=0||duration>900000||elapsed<0||elapsed>=duration||now.wall<started.wall)throw needed();
 const previous=anchors.get(key(value.resourceKind,value.resourceId));if(previous&&isSessionScopeCurrent(previous.scope)&&previous.started.monotonic>started.monotonic)throw needed();
 anchors.set(key(value.resourceKind,value.resourceId),{lease:value,scope,started,received:now,last:now,deadline:started.monotonic+duration});
}
export function requireOfflineLease(kind:OfflineLease['resourceKind'],id:string,scope:SessionScope,revision?:string){
 assertSessionScope(scope);const reference=key(kind,id),anchor=anchors.get(reference),now=offlineClock();
 if(!anchor||!isSessionScopeCurrent(anchor.scope)||anchor.scope.cacheId!==scope.cacheId||now.wall<anchor.last.wall||now.monotonic<anchor.last.monotonic||now.monotonic>=anchor.deadline||now.wall-anchor.received.wall>=anchor.deadline-anchor.received.monotonic){anchors.delete(reference);throw needed()}
 anchor.last=now;if(revision!==undefined&&anchor.lease.sourceRevision!==revision)throw needed();return anchor.lease;
}
export function offlineLeaseState(kind:OfflineLease['resourceKind'],id:string,revision?:string){const anchor=anchors.get(key(kind,id));if(!anchor)return false;try{requireOfflineLease(kind,id,anchor.scope,revision);return true}catch{return false}}
export function offlineLeaseRemainingMs(kind:OfflineLease['resourceKind'],id:string,scope:SessionScope){requireOfflineLease(kind,id,scope);const anchor=anchors.get(key(kind,id))!,now=offlineClock();return Math.max(0,Math.floor(Math.min(anchor.deadline-now.monotonic,anchor.deadline-anchor.received.monotonic-(now.wall-anchor.received.wall))))}
