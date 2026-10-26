import {Directory,File,Paths} from 'expo-file-system';
import {assertSessionScope,type SessionScope} from './session';

const root=()=>new Directory(Paths.document,'hydroland','trip-packages-v2');
const safe=(value:string)=>encodeURIComponent(value).replace(/\./g,'%2E');
function ensureRoot(scope:SessionScope){assertSessionScope(scope);const dir=new Directory(root(),safe(scope.accountId),safe(scope.cacheId));if(!dir.exists)dir.create({idempotent:true,intermediates:true});return dir}
export function clearOfflineContent(){const dir=root();if(dir.exists)dir.delete()}
export function clearLegacyOfflineContent(){const dir=new Directory(Paths.document,'hydroland','trip-packages');if(dir.exists)dir.delete()}
export type StoredOfflineContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown};
const contentFile=(tripId:string,scope:SessionScope)=>new File(ensureRoot(scope),safe(tripId)+'.json');
export function contentRef(tripId:string,scope:SessionScope){return contentFile(tripId,scope).uri}
export function saveOfflineContent(value:StoredOfflineContent,scope:SessionScope){const file=contentFile(value.tripId,scope);file.write(JSON.stringify(value));return file.uri}
export function loadOfflineContent(tripId:string,scope:SessionScope):StoredOfflineContent|null{const file=contentFile(tripId,scope);if(!file.exists)return null;try{return JSON.parse(file.textSync()) as StoredOfflineContent}catch{file.delete();return null}}
export function deleteOfflineContent(tripId:string,scope:SessionScope){const file=contentFile(tripId,scope);if(file.exists)file.delete();const payloads=new Directory(ensureRoot(scope),safe(tripId)+'-payloads');if(payloads.exists)payloads.delete()}
// Metadata and content share the same private app-directory lifecycle. No secrets go here.
export function metadataFile(tripId:string,scope:SessionScope){return new File(ensureRoot(scope),safe(tripId)+'.meta.json')}
export function payloadFile(tripId:string,mediaKey:string,scope:SessionScope){const dir=new Directory(ensureRoot(scope),safe(tripId)+'-payloads');if(!dir.exists)dir.create({idempotent:true,intermediates:true});return new File(dir,safe(mediaKey))}
export function deletePayload(tripId:string,mediaKey:string,scope:SessionScope){const file=payloadFile(tripId,mediaKey,scope);if(file.exists)file.delete()}
export function loadPayloadBytes(tripId:string,mediaKey:string,scope:SessionScope):Uint8Array|null{const file=payloadFile(tripId,mediaKey,scope);if(!file.exists)return null;try{return file.bytesSync()}catch{return null}}
