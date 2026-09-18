import { createHash } from 'crypto';
import { validateDocumentMetadata } from './document.types';

const signatures:Record<string,(b:Buffer)=>boolean>={
 'application/pdf':b=>b.subarray(0,5).toString()==='%PDF-',
 'image/jpeg':b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,
 'image/png':b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
};
export function inspectDocument(buffer:Buffer,declaredMime:string){
 validateDocumentMetadata(declaredMime,buffer.length);
 const match=signatures[declaredMime];
 if(!match?.(buffer)) throw new Error('Document content does not match declared MIME type');
 return {sizeBytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),mimeType:declaredMime};
}
