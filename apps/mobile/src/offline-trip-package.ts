import * as SecureStore from 'expo-secure-store';
/** Small offline-package metadata only. Large briefing/media/map payloads must live in a file/DB store, not SecureStore. */
export type OfflineTripPackage={tripId:string;manifestVersion:string;downloadedAt:string;sourceUpdatedAt:string;staleAfter?:string;localContentRef?:string};
const key=(tripId:string)=>'hydroland.trip-package-meta.'+tripId;
export async function saveTripPackage(value:OfflineTripPackage){await SecureStore.setItemAsync(key(value.tripId),JSON.stringify(value))}
export async function loadTripPackage(tripId:string):Promise<OfflineTripPackage|null>{const raw=await SecureStore.getItemAsync(key(tripId));if(!raw)return null;try{return JSON.parse(raw) as OfflineTripPackage}catch{await SecureStore.deleteItemAsync(key(tripId));return null}}
export async function deleteTripPackage(tripId:string){await SecureStore.deleteItemAsync(key(tripId))}
export function freshnessLabel(value:OfflineTripPackage,now=Date.now()){if(!value.staleAfter)return'UNKNOWN_CACHE' as const;const staleAt=new Date(value.staleAfter).getTime();if(!Number.isFinite(staleAt))return'UNKNOWN_CACHE' as const;return staleAt>now?'CURRENT_CACHE' as const:'STALE_CACHE' as const}
