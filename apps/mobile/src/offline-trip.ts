import * as SecureStore from 'expo-secure-store';
export type OfflineTripManifest={tripId:string;version:number;generatedAt:string;checksum:string;downloadedAt:string;staleAfter?:string};
const key=(tripId:string)=>'hydroland.trip.'+tripId;
export async function saveTripManifest(m:OfflineTripManifest){await SecureStore.setItemAsync(key(m.tripId),JSON.stringify(m))}
export async function loadTripManifest(tripId:string):Promise<OfflineTripManifest|null>{const raw=await SecureStore.getItemAsync(key(tripId));if(!raw)return null;try{return JSON.parse(raw) as OfflineTripManifest}catch{await SecureStore.deleteItemAsync(key(tripId));return null}}
export async function removeTripManifest(tripId:string){await SecureStore.deleteItemAsync(key(tripId))}
export function offlineFreshness(m:OfflineTripManifest,now=new Date()){if(!m.staleAfter)return'UNKNOWN' as const;return new Date(m.staleAfter)>now?'CURRENT' as const:'STALE' as const}
