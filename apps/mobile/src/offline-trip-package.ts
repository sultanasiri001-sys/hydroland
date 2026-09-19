import * as SecureStore from 'expo-secure-store';
export type OfflineTripPackage={tripId:string;manifestVersion:string;downloadedAt:string;sourceUpdatedAt:string;briefing:unknown;divePlan:unknown;emergencyPlan:unknown;map:unknown;phrasebook:unknown};
const key=(tripId:string)=>'hydroland.trip-package.'+tripId;
export async function saveTripPackage(value:OfflineTripPackage){await SecureStore.setItemAsync(key(value.tripId),JSON.stringify(value))}
export async function loadTripPackage(tripId:string):Promise<OfflineTripPackage|null>{const raw=await SecureStore.getItemAsync(key(tripId));if(!raw)return null;try{return JSON.parse(raw) as OfflineTripPackage}catch{await SecureStore.deleteItemAsync(key(tripId));return null}}
export async function deleteTripPackage(tripId:string){await SecureStore.deleteItemAsync(key(tripId))}
export function freshnessLabel(value:OfflineTripPackage,now=Date.now()){const age=now-new Date(value.sourceUpdatedAt).getTime();return age<=3600000?'RECENT_CACHE':age<=86400000?'STALE_CACHE':'EXPIRED_CACHE'}
