import {metadataFile} from './offline-content-store';
import {getSessionScope,type SessionScope} from './session';
/** Cache metadata is account/session bound, never an authorization or safety decision. */
export type OfflineTripPackage={tripId:string;manifestVersion:string;downloadedAt:string;sourceUpdatedAt:string;staleAfter?:string;checksum?:string;briefingVersion?:number;localContentRef?:string};
async function scopeOrThrow(scope?:SessionScope){const current=scope??await getSessionScope();if(!current)throw new Error('Authentication required.');return current}
export async function saveTripPackage(value:OfflineTripPackage,scope?:SessionScope){metadataFile(value.tripId,await scopeOrThrow(scope)).write(JSON.stringify(value))}
export async function loadTripPackage(tripId:string,scope?:SessionScope):Promise<OfflineTripPackage|null>{const file=metadataFile(tripId,await scopeOrThrow(scope));if(!file.exists)return null;try{const value=JSON.parse(file.textSync());if(value?.tripId===tripId&&typeof value.manifestVersion==='string')return value}catch{}file.delete();return null}
export async function deleteTripPackage(tripId:string,scope?:SessionScope){const file=metadataFile(tripId,await scopeOrThrow(scope));if(file.exists)file.delete()}
export function freshnessLabel(value:OfflineTripPackage,now=Date.now()){if(!value.staleAfter)return'UNKNOWN_CACHE' as const;const staleAt=new Date(value.staleAfter).getTime();if(!Number.isFinite(staleAt))return'UNKNOWN_CACHE' as const;return staleAt>now?'CURRENT_CACHE' as const:'STALE_CACHE' as const}

export type PackageSyncState='NO_LOCAL_PACKAGE'|'SERVER_UNAVAILABLE'|'SERVER_NOT_READY'|'UPDATE_REQUIRED'|'MATCHED';
export function packageSyncState(local:OfflineTripPackage|null,remote:{status:string;checksum?:string;briefingVersion?:number}|null,serverAvailable=true,verifiedLocalContent=false):PackageSyncState{
 if(!local)return'NO_LOCAL_PACKAGE';if(!serverAvailable||!remote)return'SERVER_UNAVAILABLE';if(remote.status!=='READY')return remote.status==='UPDATE_REQUIRED'?'UPDATE_REQUIRED':'SERVER_NOT_READY';
 if(!verifiedLocalContent||!local.localContentRef)return'UPDATE_REQUIRED';
 if(!local.checksum||!remote.checksum||local.checksum!==remote.checksum)return'UPDATE_REQUIRED';
 if(local.briefingVersion!==undefined&&remote.briefingVersion!==undefined&&local.briefingVersion!==remote.briefingVersion)return'UPDATE_REQUIRED';return'MATCHED';
}
