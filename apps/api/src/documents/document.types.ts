export interface PrivateDocument { id:string; ownerAccountId:string; scopeId:string; storageKey:string; sha256:string; mimeType:string; sizeBytes:number; createdAt:string; }
export const allowedDocumentMimeTypes=new Set(['application/pdf','image/jpeg','image/png']);
export function validateDocumentMetadata(mimeType:string,sizeBytes:number){
 if(!allowedDocumentMimeTypes.has(mimeType)) throw new Error('Unsupported document type');
 if(sizeBytes<=0 || sizeBytes>10*1024*1024) throw new Error('Invalid document size');
}
