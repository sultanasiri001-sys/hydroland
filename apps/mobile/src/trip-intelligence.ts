import {CryptoDigestAlgorithm,digestStringAsync} from 'expo-crypto';
import {authorizedFetch,authorizedBinaryFetch} from './api';
import {saveOfflineContent,loadOfflineContent,deleteOfflineContent,payloadFile,deletePayload} from './offline-content-store';
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

export type OfflineMediaManifestEntry={key:string;checksum:string;mediaType?:string;sizeBytes?:number|null;contentType?:string|null};

function bytesToBase64(bytes:Uint8Array){
 let binary='';const chunk=0x8000;
 for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
 return globalThis.btoa(binary);
}

export async function downloadOfflinePayload(tripId:string,entry:OfflineMediaManifestEntry){
 if(!entry.key.startsWith('media:')||!entry.checksum)throw new Error('Invalid offline media manifest entry.');
 const mediaKey=entry.key.slice('media:'.length);if(!mediaKey)throw new Error('Offline media key is required.');
 const buffer=await authorizedBinaryFetch(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package/payloads/${encodeURIComponent(mediaKey)}`);
 const bytes=new Uint8Array(buffer);
 if(entry.sizeBytes!=null&&bytes.byteLength!==entry.sizeBytes)throw new Error('Offline payload size verification failed.');
 const actual=await digestStringAsync(CryptoDigestAlgorithm.SHA256,bytesToBase64(bytes),{encoding:'base64'} as any);
 if(actual.toLowerCase()!==entry.checksum.toLowerCase()){deletePayload(tripId,mediaKey);throw new Error('Offline payload checksum verification failed.');}
 const file=payloadFile(tripId,mediaKey);
 try{file.write(bytes);return file.uri}catch(error){deletePayload(tripId,mediaKey);throw error}
}
