import {saveOfflineMetadata,loadOfflineMetadata,deleteOfflineMetadata} from './offline-content-store';
import {getSessionScope,type SessionScope} from './session';
import {offlineLeaseState,requireOfflineLease} from './offline-access';
/** Cache metadata is account/session bound, never an authorization or safety decision. */
export type OfflineTripPackage={tripId:string;manifestVersion:string;downloadedAt:string;sourceUpdatedAt:string;staleAfter?:string;checksum?:string;briefingVersion?:number;localContentRef?:string};
async function scopeOrThrow(scope?:SessionScope){const current=scope??await getSessionScope();if(!current)throw new Error('Authentication required.');return current}
export async function saveTripPackage(value:OfflineTripPackage,scope?:SessionScope){const current=await scopeOrThrow(scope);const lease=requireOfflineLease('PACKAGE',value.tripId,current,value.checksum);await saveOfflineMetadata(value.tripId,{...value,staleAfter:lease.expiresAt},current)}
export async function loadTripPackage(tripId:string,scope?:SessionScope):Promise<OfflineTripPackage|null>{const current=await scopeOrThrow(scope),value=await loadOfflineMetadata(tripId,current);if(value?.tripId===tripId&&typeof value.manifestVersion==='string'){requireOfflineLease('PACKAGE',tripId,current,value.checksum);return value}if(value)deleteOfflineMetadata(tripId,current);return null}
export async function deleteTripPackage(tripId:string,scope?:SessionScope){deleteOfflineMetadata(tripId,await scopeOrThrow(scope))}
export function freshnessLabel(value:OfflineTripPackage,now=Date.now()){if(!value.staleAfter)return'UNKNOWN_CACHE' as const;const staleAt=Date.parse(value.staleAfter);if(!Number.isFinite(staleAt))return'UNKNOWN_CACHE' as const;if(staleAt<=now)return'STALE_CACHE' as const;return offlineLeaseState('PACKAGE',value.tripId,value.checksum)?'CURRENT_CACHE' as const:'UNKNOWN_CACHE' as const}

export type PackageSyncState='NO_LOCAL_PACKAGE'|'SERVER_UNAVAILABLE'|'SERVER_NOT_READY'|'UPDATE_REQUIRED'|'MATCHED';
export function packageSyncState(local:OfflineTripPackage|null,remote:{status:string;checksum?:string;briefingVersion?:number}|null,serverAvailable=true,verifiedLocalContent=false):PackageSyncState{
 if(!local)return'NO_LOCAL_PACKAGE';if(!serverAvailable||!remote)return'SERVER_UNAVAILABLE';if(remote.status!=='READY')return remote.status==='UPDATE_REQUIRED'?'UPDATE_REQUIRED':'SERVER_NOT_READY';
 if(!verifiedLocalContent||!local.localContentRef)return'UPDATE_REQUIRED';
 if(!local.checksum||!remote.checksum||local.checksum!==remote.checksum)return'UPDATE_REQUIRED';
 if(local.briefingVersion!==undefined&&remote.briefingVersion!==undefined&&local.briefingVersion!==remote.briefingVersion)return'UPDATE_REQUIRED';return'MATCHED';
}
