import {Directory,File,Paths} from 'expo-file-system';
import {assertSessionScope,type SessionScope} from './session';
import {openOfflineBytes,sealOfflineBytes,MAX_OFFLINE_BYTES} from './offline-vault';
import {requireOfflineLease,offlineLeaseState,offlineTripEpoch} from './offline-access';
import {OfflineAccessError} from './offline-errors';

const root=()=>new Directory(Paths.document,'hydroland','trip-packages-v3');
const safe=(value:string)=>encodeURIComponent(value).replace(/\./g,'%2E');
function ensureRoot(scope:SessionScope){assertSessionScope(scope);const dir=new Directory(root(),safe(scope.accountId),safe(scope.cacheId));if(!dir.exists)dir.create({idempotent:true,intermediates:true});return dir}
export function clearOfflineContent(){const dir=root();if(dir.exists)dir.delete()}
export function clearLegacyOfflineContent(){for(const name of ['trip-packages','trip-packages-v2']){const dir=new Directory(Paths.document,'hydroland',name);if(dir.exists)dir.delete()}}
export type StoredOfflineContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown;briefing?:{title:string|null;summary:unknown}};
const contentFile=(tripId:string,scope:SessionScope)=>new File(ensureRoot(scope),safe(tripId)+'.json');
export function contentRef(tripId:string,scope:SessionScope){return contentFile(tripId,scope).uri}
async function save(file:File,purpose:string,bytes:Uint8Array,scope:SessionScope,isCurrent:()=>boolean=()=>true){const sealed=await sealOfflineBytes(bytes,scope,purpose);assertSessionScope(scope);if(!isCurrent())throw new OfflineAccessError('NEEDS_ONLINE_VERIFICATION','Offline record changed.');file.write(sealed);return file.uri}
async function read(file:File,purpose:string,scope:SessionScope){assertSessionScope(scope);if(!file.exists)return null;
 if(typeof file.size==='number'&&file.size>MAX_OFFLINE_BYTES*2+1024)throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Encrypted file is too large.');
 try{return await openOfflineBytes(file.textSync(),scope,purpose)}catch(error){if(error instanceof OfflineAccessError&&error.code==='OFFLINE_CACHE_CORRUPT'){try{file.delete()}catch{}}throw error}
}
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const decode=(bytes:Uint8Array)=>JSON.parse(new TextDecoder().decode(bytes));
export async function saveOfflineContent(value:StoredOfflineContent,scope:SessionScope){const epoch=offlineTripEpoch(value.tripId);requireOfflineLease('PACKAGE',value.tripId,scope,value.checksum);const result=await save(contentFile(value.tripId,scope),'content:'+value.tripId,encode(value),scope,()=>offlineTripEpoch(value.tripId)===epoch&&offlineLeaseState('PACKAGE',value.tripId,value.checksum));requireOfflineLease('PACKAGE',value.tripId,scope,value.checksum);return result}
export async function loadOfflineContent(tripId:string,scope:SessionScope):Promise<StoredOfflineContent|null>{const file=contentFile(tripId,scope);if(!file.exists)return null;requireOfflineLease('PACKAGE',tripId,scope);const bytes=await read(file,'content:'+tripId,scope);requireOfflineLease('PACKAGE',tripId,scope);return bytes?decode(bytes):null}
// Package corruption/absence must never erase an independent pending draft.
export function deleteOfflineContent(tripId:string,scope:SessionScope){const file=contentFile(tripId,scope);if(file.exists)file.delete();const payloads=new Directory(ensureRoot(scope),safe(tripId)+'-payloads');if(payloads.exists)payloads.delete();deleteOfflineMetadata(tripId,scope)}
export function deleteOfflineTripContent(tripId:string,scope:SessionScope){deleteOfflineContent(tripId,scope);deleteOfflineDraftRecords(tripId,scope)}
// Every persisted record uses authenticated encryption, including metadata/outbox.
function metadataFile(tripId:string,scope:SessionScope){return new File(ensureRoot(scope),safe(tripId)+'.meta.json')}
function payloadFile(tripId:string,mediaKey:string,scope:SessionScope){const dir=new Directory(ensureRoot(scope),safe(tripId)+'-payloads');if(!dir.exists)dir.create({idempotent:true,intermediates:true});return new File(dir,safe(mediaKey))}
export async function saveOfflineMetadata(tripId:string,value:unknown,scope:SessionScope){const epoch=offlineTripEpoch(tripId);requireOfflineLease('PACKAGE',tripId,scope);await save(metadataFile(tripId,scope),'metadata:'+tripId,encode(value),scope,()=>offlineTripEpoch(tripId)===epoch&&offlineLeaseState('PACKAGE',tripId));requireOfflineLease('PACKAGE',tripId,scope)}
export async function loadOfflineMetadata(tripId:string,scope:SessionScope){const file=metadataFile(tripId,scope);if(!file.exists)return null;requireOfflineLease('PACKAGE',tripId,scope);const bytes=await read(file,'metadata:'+tripId,scope);requireOfflineLease('PACKAGE',tripId,scope);return bytes?decode(bytes):null}
export function deleteOfflineMetadata(tripId:string,scope:SessionScope){const file=metadataFile(tripId,scope);if(file.exists)file.delete()}
export function deletePayload(tripId:string,mediaKey:string,scope:SessionScope){const file=payloadFile(tripId,mediaKey,scope);if(file.exists)file.delete()}
export async function savePayloadBytes(tripId:string,mediaKey:string,bytes:Uint8Array,scope:SessionScope){const epoch=offlineTripEpoch(tripId);requireOfflineLease('PACKAGE',tripId,scope);const result=await save(payloadFile(tripId,mediaKey,scope),'payload:'+tripId+':'+mediaKey,bytes,scope,()=>offlineTripEpoch(tripId)===epoch&&offlineLeaseState('PACKAGE',tripId));requireOfflineLease('PACKAGE',tripId,scope);return result}
export async function loadPayloadBytes(tripId:string,mediaKey:string,scope:SessionScope):Promise<Uint8Array|null>{const file=payloadFile(tripId,mediaKey,scope);if(!file.exists)return null;requireOfflineLease('PACKAGE',tripId,scope);const bytes=await read(file,'payload:'+tripId+':'+mediaKey,scope);requireOfflineLease('PACKAGE',tripId,scope);return bytes}
function recordFile(kind:'DRAFT'|'DRAFTS',id:string,scope:SessionScope,tripId?:string){const trip=kind==='DRAFTS'?id:tripId;if(!trip)throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Trip binding is required.');const dir=new Directory(ensureRoot(scope),safe(trip)+'-drafts');if(!dir.exists)dir.create({idempotent:true,intermediates:true});return new File(dir,safe(kind+':'+id)+'.json')}
export async function saveOfflineRecord(kind:'DRAFT'|'DRAFTS',id:string,value:unknown,scope:SessionScope,isCurrent:()=>boolean=()=>true){requireOfflineLease(kind,id,scope);const tripId=kind==='DRAFTS'?id:(value as {source?:{tripId?:string}})?.source?.tripId;if(!tripId)throw new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Trip binding is required.');const epoch=offlineTripEpoch(tripId,true);await save(recordFile(kind,id,scope,tripId),kind+':'+id,encode(value),scope,()=>offlineTripEpoch(tripId,true)===epoch&&isCurrent()&&offlineLeaseState(kind,id));requireOfflineLease(kind,id,scope)}
export async function loadOfflineRecord(kind:'DRAFT'|'DRAFTS',id:string,scope:SessionScope,tripId?:string){const file=recordFile(kind,id,scope,tripId);if(!file.exists)return null;requireOfflineLease(kind,id,scope);const bytes=await read(file,kind+':'+id,scope);requireOfflineLease(kind,id,scope);return bytes?decode(bytes):null}
export function deleteOfflineRecord(kind:'DRAFT'|'DRAFTS',id:string,scope:SessionScope,tripId?:string){const file=recordFile(kind,id,scope,tripId);if(file.exists)file.delete()}
export function deleteOfflineDraftRecords(tripId:string,scope:SessionScope){const dir=new Directory(ensureRoot(scope),safe(tripId)+'-drafts');if(dir.exists)dir.delete()}
