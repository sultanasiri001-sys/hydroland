import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { AccessService } from '../access/access.service';
import { AccessContext } from '../access/access.types';
import { inspectDocument } from './document-validator';
import { LocalPrivateObjectStorage } from './private-storage.service';

@Injectable()
export class DocumentService {
 constructor(private readonly db:DatabaseService,private readonly access:AccessService,private readonly storage:LocalPrivateObjectStorage){}
 async register(context:AccessContext,input:{scopeId:string;buffer:Buffer;mimeType:string}){
  this.access.require(context,'document.upload',input.scopeId);
  const meta=inspectDocument(input.buffer,input.mimeType); const id=randomUUID(); const storageKey=await this.storage.put(input.buffer);
  try{await this.db.query(`INSERT INTO private_documents(id,owner_account_id,scope_id,storage_key,sha256,mime_type,size_bytes)
   VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,context.accountId,input.scopeId,storageKey,meta.sha256,meta.mimeType,meta.sizeBytes]);}
  catch(e){await this.storage.delete(storageKey);throw e;}
  return {id,...meta};
 }
 async authorizeRead(context:AccessContext,id:string){
  const r=await this.db.query<any>('SELECT id,owner_account_id,scope_id,storage_key,sha256,mime_type,size_bytes,created_at FROM private_documents WHERE id=$1 LIMIT 1',[id]);
  const d=r.rows[0]; if(!d) throw new NotFoundException('Document not found');
  if(d.owner_account_id!==context.accountId) this.access.require(context,'document.read',d.scope_id);
  return d;
 }
 async authorizeDownload(context:AccessContext,id:string){
  const d=await this.authorizeRead(context,id);
  if(d.owner_account_id!==context.accountId) this.access.require(context,'document.download',d.scope_id);
  return d;
 }
 async download(context:AccessContext,id:string){const d=await this.authorizeDownload(context,id);return this.storage.get(d.storage_key);}
}
