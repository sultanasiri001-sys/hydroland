import {Directory,File,Paths} from 'expo-file-system';

const root=()=>new Directory(Paths.document,'hydroland','trip-packages');
const safeTripId=(tripId:string)=>encodeURIComponent(tripId);
function ensureRoot(){const dir=root();if(!dir.exists)dir.create({idempotent:true,intermediates:true});return dir}

export type StoredOfflineContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown};

export function contentRef(tripId:string){return new File(ensureRoot(),safeTripId(tripId)+'.json').uri}

export function saveOfflineContent(value:StoredOfflineContent){
 const file=new File(ensureRoot(),safeTripId(value.tripId)+'.json');
 file.write(JSON.stringify(value));
 return file.uri;
}

export function loadOfflineContent(tripId:string):StoredOfflineContent|null{
 const file=new File(ensureRoot(),safeTripId(tripId)+'.json');
 if(!file.exists)return null;
 try{return JSON.parse(file.textSync()) as StoredOfflineContent}catch{try{file.delete()}catch{}return null}
}

export function deleteOfflineContent(tripId:string){
 const file=new File(ensureRoot(),safeTripId(tripId)+'.json');
 if(file.exists)file.delete();
}

const payloadRoot=(tripId:string)=>new Directory(ensureRoot(),safeTripId(tripId)+'-payloads');
function ensurePayloadRoot(tripId:string){const dir=payloadRoot(tripId);if(!dir.exists)dir.create({idempotent:true,intermediates:true});return dir}
const safeMediaKey=(mediaKey:string)=>encodeURIComponent(mediaKey);

export function payloadFile(tripId:string,mediaKey:string){return new File(ensurePayloadRoot(tripId),safeMediaKey(mediaKey))}

export function deletePayload(tripId:string,mediaKey:string){
 const file=payloadFile(tripId,mediaKey);
 if(file.exists)file.delete();
}
