import {CryptoDigestAlgorithm,digestStringAsync,digest} from 'expo-crypto';
import {authorizedFetch,ApiError} from './api';
import {saveOfflineContent,loadOfflineContent,deleteOfflineContent,deleteOfflineTripContent,deletePayload,loadPayloadBytes,savePayloadBytes} from './offline-content-store';
import {saveTripPackage,deleteTripPackage,type OfflineTripPackage} from './offline-trip-package';
import {getSessionScope,getLocalSessionScope,assertSessionScope,subscribeSession,type SessionScope} from './session';
import {acceptOfflineLease,offlineClock,requireOfflineLease,offlineLeaseRemainingMs,offlineTripEpoch,assertOfflineTripEpoch,clearTripOfflineLeases,clearPackageOfflineLease,type OfflineLease} from './offline-access';
import {ensureOfflineEncryption,MAX_OFFLINE_BYTES} from './offline-vault';
import {OfflineAccessError} from './offline-errors';
async function requireScope(scope?:SessionScope){const current=scope??await getSessionScope();if(!current)throw new ApiError(401,'Authentication required.');assertSessionScope(current);return current}
export type OfflinePackageStatus={tripId:string;briefingVersion?:number;status:string;reason?:string;checksum?:string;generatedAt?:string;accessLease?:OfflineLease};
export type OfflinePackageContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown;briefing:{title:string|null;summary:unknown};accessLease:OfflineLease};
const base=(tripId:string)=>'/mobile-offline/trips/'+encodeURIComponent(tripId);
const downloads=new Map<string,Promise<OfflineTripPackage>>();
const deliveries=new Map<AbortController,string>();
subscribeSession(()=>{downloads.clear();for(const controller of deliveries.keys())controller.abort();deliveries.clear()});
async function privateRequest<T>(tripId:string,scope:SessionScope,path:string){try{return await authorizedFetch<T>(path)}catch(error){assertSessionScope(scope);if(error instanceof ApiError&&error.status===403){clearTripOfflineLeases(tripId);deleteOfflineTripContent(tripId,scope)}else if(error instanceof ApiError&&(error.status===404||error.status===409))clearPackageOfflineLease(tripId);throw error}}
export async function clearLocalOfflineTrip(tripId:string){const scope=await getLocalSessionScope();clearTripOfflineLeases(tripId);for(const [controller,trip] of deliveries)if(trip===tripId)controller.abort();if(scope)deleteOfflineTripContent(tripId,scope)}
export async function getOfflinePackageStatus(tripId:string){const epoch=offlineTripEpoch(tripId),scope=await requireScope();await ensureOfflineEncryption(scope);assertSessionScope(scope);assertOfflineTripEpoch(tripId,epoch);const clock=offlineClock();
 const result=await privateRequest<OfflinePackageStatus>(tripId,scope,base(tripId)+'/status');assertSessionScope(scope);
 if(result.tripId!==tripId)throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Trip source mismatch.');
 if(result.accessLease){if(result.status!=='READY'||result.accessLease.resourceKind!=='PACKAGE'||result.accessLease.resourceId!==tripId||result.accessLease.sourceRevision!==result.checksum)throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Package source mismatch.');acceptOfflineLease(result.accessLease,scope,clock)}else clearPackageOfflineLease(tripId);return result;
}
export async function getOfflinePackageContent(tripId:string){const epoch=offlineTripEpoch(tripId),scope=await requireScope();await ensureOfflineEncryption(scope);assertSessionScope(scope);assertOfflineTripEpoch(tripId,epoch);const clock=offlineClock();
 const result=await privateRequest<OfflinePackageContent>(tripId,scope,base(tripId)+'/package');assertSessionScope(scope);
 if(result.tripId!==tripId||result.accessLease?.resourceKind!=='PACKAGE'||result.accessLease.resourceId!==tripId||result.accessLease.sourceRevision!==result.checksum)throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Package source mismatch.');
 acceptOfflineLease(result.accessLease,scope,clock);return result;
}
function stableJson(value:unknown):string{if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;return '{'+Object.keys(obj).sort().map(key=>JSON.stringify(key)+':'+stableJson(obj[key])).join(',')+'}'}return JSON.stringify(value)}
const manifestChecksum=(manifest:unknown)=>digestStringAsync(CryptoDigestAlgorithm.SHA256,stableJson(manifest));
async function validContent(content:OfflinePackageContent|Awaited<ReturnType<typeof loadOfflineContent>>,scope:SessionScope){
 if(!content)return false;requireOfflineLease('PACKAGE',content.tripId,scope,content.checksum);
 if((await manifestChecksum(content.manifest)).toLowerCase()!==content.checksum.toLowerCase())return false;assertSessionScope(scope);
 const manifest=content.manifest as {files?:Array<{key:string;checksum:string}>};
 const briefing=manifest?.files?.find(entry=>entry.key==='briefing');
 if(briefing&&(!content.briefing||(await manifestChecksum(content.briefing)).toLowerCase()!==briefing.checksum.toLowerCase()))return false;
 requireOfflineLease('PACKAGE',content.tripId,scope,content.checksum);return true;
}
export async function downloadOfflinePackage(tripId:string):Promise<OfflineTripPackage>{
 const epoch=offlineTripEpoch(tripId),scope=await requireScope();assertSessionScope(scope);assertOfflineTripEpoch(tripId,epoch);const key=scope.cacheId+':'+tripId;
 if(downloads.has(key))return downloads.get(key)!;
 const pending=downloadPackage(tripId,scope);downloads.set(key,pending);try{return await pending}finally{if(downloads.get(key)===pending)downloads.delete(key)}
}
async function downloadPackage(tripId:string,scope:SessionScope):Promise<OfflineTripPackage>{
 assertSessionScope(scope);const remote=await getOfflinePackageContent(tripId);assertSessionScope(scope);
 try{
  if(remote.tripId!==tripId||!remote.checksum||!Number.isSafeInteger(remote.briefingVersion)||!await validContent(remote,scope))throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Offline package checksum verification failed.');
  const {accessLease,...content}=remote,localContentRef=await saveOfflineContent(content,scope);
  const persisted=await loadOfflineContent(tripId,scope);assertSessionScope(scope);
  if(!persisted||persisted.tripId!==tripId||persisted.briefingVersion!==remote.briefingVersion||!await validContent(persisted,scope))throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Stored offline package verification failed.');
  const metadata:OfflineTripPackage={tripId,manifestVersion:'1',downloadedAt:new Date().toISOString(),sourceUpdatedAt:remote.generatedAt,staleAfter:accessLease.expiresAt,checksum:remote.checksum,briefingVersion:remote.briefingVersion,localContentRef};
  await saveTripPackage(metadata,scope);return metadata;
 }catch(error){assertSessionScope(scope);deleteOfflineContent(tripId,scope);await deleteTripPackage(tripId,scope);throw error}
}
export type OfflineMediaManifestEntry={key:string;checksum:string;mediaType?:string;sizeBytes?:number|null;contentType?:string|null;classification?:string};
async function approvedPayload(tripId:string,entry:OfflineMediaManifestEntry,scope:SessionScope):Promise<OfflineMediaManifestEntry>{
 if(!await verifyStoredOfflinePackage(tripId,scope))throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Verified offline manifest is required.');
 const manifest=(await loadOfflineContent(tripId,scope))?.manifest as {files?:unknown}|undefined;
 const approved=Array.isArray(manifest?.files)?manifest.files.find((item:OfflineMediaManifestEntry)=>item?.key===entry.key):undefined;
 if(!approved||approved.checksum!==entry.checksum||!['PUBLIC_CACHE','OPERATIONAL_OFFLINE','SENSITIVE_ENCRYPTED'].includes(approved.classification)){
  deletePayload(tripId,entry.key.slice('media:'.length),scope);throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Offline payload is not approved for secure storage.');
 }
 if(!Number.isSafeInteger(approved.sizeBytes)||approved.sizeBytes<0||approved.sizeBytes>MAX_OFFLINE_BYTES)throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','A bounded payload size is required.');
 return approved;
}
async function payloadChecksum(bytes:Uint8Array){const hash=await digest(CryptoDigestAlgorithm.SHA256,bytes.slice().buffer);return Array.from(new Uint8Array(hash),value=>value.toString(16).padStart(2,'0')).join('')}
type Delivery={provider:string;url:string;expiresAt:string;checksum:string;sizeBytes:number|null;contentType?:string|null};
async function privateDeliveryBytes(url:string,size:number,scope:SessionScope,tripId:string){
 const budget=Math.min(15000,offlineLeaseRemainingMs('PACKAGE',tripId,scope)),controller=new AbortController();deliveries.set(controller,tripId);let response:Response|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,complete=false;
 const timeout=setTimeout(()=>controller.abort(),budget);
 const aborted=new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('Private payload delivery timed out or was cancelled.')),{once:true}));
 const bounded=<T,>(promise:Promise<T>)=>Promise.race([promise,aborted]);
 try{
  // API credentials and redirects are never forwarded to an object host.
  const pending=fetch(url,{method:'GET',credentials:'omit',redirect:'error',signal:controller.signal,headers:{Accept:'application/octet-stream'}});
  void pending.then(late=>{if(controller.signal.aborted)void late.body?.cancel().catch(()=>{})},()=>{});
  response=await bounded(pending);assertSessionScope(scope);requireOfflineLease('PACKAGE',tripId,scope);
  if(!response.ok)throw new Error('Private payload delivery failed.');
  const length=response.headers.get('content-length'),encoding=response.headers.get('content-encoding');
  if(length===null||!/^\d+$/.test(length)||Number(length)!==size||size>MAX_OFFLINE_BYTES||(encoding!==null&&encoding.trim().toLowerCase()!=='identity'))throw new Error('Offline payload size verification failed.');
  let bytes:Uint8Array;
  if(response.body&&typeof response.body.getReader==='function'){
   reader=response.body.getReader();const chunks:Uint8Array[]=[];let total=0;
   while(true){const result=await bounded(reader.read());assertSessionScope(scope);requireOfflineLease('PACKAGE',tripId,scope);if(result.done)break;total+=result.value.byteLength;if(total>size||total>MAX_OFFLINE_BYTES)throw new Error('Offline payload size verification failed.');chunks.push(result.value)}
   bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  }else{
   // Some React Native fetch adapters expose no stream. Require identity encoding,
   // the exact signed size and an abort deadline before their bounded object read.
   bytes=new Uint8Array(await bounded(response.arrayBuffer()));
  }
  assertSessionScope(scope);requireOfflineLease('PACKAGE',tripId,scope);if(bytes.length!==size)throw new Error('Offline payload size verification failed.');complete=true;return bytes;
 }finally{
  clearTimeout(timeout);deliveries.delete(controller);
  if(!complete){controller.abort();if(reader)void reader.cancel().catch(()=>{});else if(response?.body)void response.body.cancel().catch(()=>{})}
 }
}
export async function downloadOfflinePayload(tripId:string,entry:OfflineMediaManifestEntry){
 const epoch=offlineTripEpoch(tripId),scope=await requireScope();assertOfflineTripEpoch(tripId,epoch);if(!entry.key.startsWith('media:')||!entry.checksum)throw new Error('Invalid offline media entry.');
 const mediaKey=entry.key.slice(6);if(!mediaKey)throw new Error('Offline media key is required.');entry=await approvedPayload(tripId,entry,scope);assertSessionScope(scope);assertOfflineTripEpoch(tripId,epoch);
 // The native API returns a signed R2 delivery descriptor, not media bytes.
 const delivery=await privateRequest<Delivery>(tripId,scope,'/trip-intelligence/'+encodeURIComponent(tripId)+'/offline-package/payloads/'+encodeURIComponent(mediaKey));
 assertSessionScope(scope);requireOfflineLease('PACKAGE',tripId,scope);
 let url:URL;try{url=new URL(delivery.url)}catch{throw new Error('Invalid private delivery.')}
 if(delivery.provider!=='CLOUDFLARE_R2'||url.protocol!=='https:'||!url.hostname.endsWith('.r2.cloudflarestorage.com')||url.username||url.password||url.hash||(url.port&&url.port!=='443')||delivery.checksum!==entry.checksum||delivery.sizeBytes!==entry.sizeBytes||!Number.isFinite(Date.parse(delivery.expiresAt))||Date.parse(delivery.expiresAt)<=Date.now())throw new Error('Invalid private delivery.');
 const bytes=await privateDeliveryBytes(url.toString(),entry.sizeBytes!,scope,tripId);assertSessionScope(scope);requireOfflineLease('PACKAGE',tripId,scope);
 if(bytes.byteLength!==entry.sizeBytes||(await payloadChecksum(bytes)).toLowerCase()!==entry.checksum.toLowerCase()){deletePayload(tripId,mediaKey,scope);throw new Error('Offline payload checksum verification failed.');}
 assertOfflineTripEpoch(tripId,epoch);try{await savePayloadBytes(tripId,mediaKey,bytes,scope);if(!await verifyStoredOfflinePayload(tripId,entry))throw new Error('Encrypted payload verification failed.');return{mediaKey,stored:true}}catch(error){assertSessionScope(scope);deletePayload(tripId,mediaKey,scope);throw error}
}
export async function verifyStoredOfflinePackage(tripId:string,requestedScope?:SessionScope){
 const scope=await requireScope(requestedScope),metadata=await (await import('./offline-trip-package')).loadTripPackage(tripId,scope),stored=await loadOfflineContent(tripId,scope);
 if(!metadata||!stored||stored.tripId!==tripId||!metadata.checksum||stored.checksum!==metadata.checksum||stored.briefingVersion!==metadata.briefingVersion||!await validContent(stored,scope)){deleteOfflineContent(tripId,scope);await deleteTripPackage(tripId,scope);return false}return true;
}
export async function verifyStoredOfflinePayload(tripId:string,entry:OfflineMediaManifestEntry){const epoch=offlineTripEpoch(tripId),scope=await requireScope();assertOfflineTripEpoch(tripId,epoch);if(!entry.key.startsWith('media:')||!entry.checksum)return false;const mediaKey=entry.key.slice(6);if(!mediaKey)return false;
 entry=await approvedPayload(tripId,entry,scope);const bytes=await loadPayloadBytes(tripId,mediaKey,scope);if(!bytes)return false;
 if(bytes.byteLength!==entry.sizeBytes||(await payloadChecksum(bytes)).toLowerCase()!==entry.checksum.toLowerCase()){deletePayload(tripId,mediaKey,scope);return false}requireOfflineLease('PACKAGE',tripId,scope);return true;
}
export async function readOfflineBriefing(tripId:string){const scope=await requireScope();if(!await verifyStoredOfflinePackage(tripId,scope))return null;const content=await loadOfflineContent(tripId,scope);requireOfflineLease('PACKAGE',tripId,scope);return content}
