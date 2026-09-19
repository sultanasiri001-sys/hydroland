import {CryptoDigestAlgorithm,digestStringAsync} from 'expo-crypto';
import {authorizedFetch} from './api';
import {saveOfflineContent,loadOfflineContent,deleteOfflineContent} from './offline-content-store';
import {saveTripPackage,deleteTripPackage,type OfflineTripPackage} from './offline-trip-package';

export type OfflinePackageStatus={tripId:string;briefingVersion?:number;status:'NOT_READY'|'UPDATE_REQUIRED'|'READY'|string;reason?:string;checksum?:string;generatedAt?:string};
export type OfflinePackageContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown};

export function getOfflinePackageStatus(tripId:string){return authorizedFetch<OfflinePackageStatus>(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package`)}
export function getOfflinePackageContent(tripId:string){return authorizedFetch<OfflinePackageContent>(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package/content`)}

function stableJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
 if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;return '{'+Object.keys(obj).sort().map(key=>JSON.stringify(key)+':'+stableJson(obj[key])).join(',')+'}';}
 return JSON.stringify(value);
}
async function manifestChecksum(manifest:unknown){return digestStringAsync(CryptoDigestAlgorithm.SHA256,stableJson(manifest))}

export async function downloadOfflinePackage(tripId:string):Promise<OfflineTripPackage>{
 const remote=await getOfflinePackageContent(tripId);
 if(remote.tripId!==tripId||!remote.checksum||!Number.isFinite(remote.briefingVersion))throw new Error('Invalid offline package response.');
 const computedChecksum=await manifestChecksum(remote.manifest);
 if(computedChecksum.toLowerCase()!==remote.checksum.toLowerCase()){
  deleteOfflineContent(tripId);
  await deleteTripPackage(tripId);
  throw new Error('Offline package checksum verification failed.');
 }
 const localContentRef=saveOfflineContent(remote);
 const persisted=loadOfflineContent(tripId);
 if(!persisted||persisted.tripId!==remote.tripId||persisted.checksum!==remote.checksum||persisted.briefingVersion!==remote.briefingVersion){
  deleteOfflineContent(tripId);
  await deleteTripPackage(tripId);
  throw new Error('Offline package persistence verification failed.');
 }
 const persistedChecksum=await manifestChecksum(persisted.manifest);
 if(persistedChecksum.toLowerCase()!==remote.checksum.toLowerCase()){
  deleteOfflineContent(tripId);
  await deleteTripPackage(tripId);
  throw new Error('Stored offline package checksum verification failed.');
 }
 const metadata:OfflineTripPackage={tripId,manifestVersion:'1',downloadedAt:new Date().toISOString(),sourceUpdatedAt:remote.generatedAt,checksum:remote.checksum,briefingVersion:remote.briefingVersion,localContentRef};
 try{await saveTripPackage(metadata);return metadata}catch(error){deleteOfflineContent(tripId);await deleteTripPackage(tripId);throw error}
}
