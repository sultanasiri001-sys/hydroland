import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { inspectCredentialObjectStorage } from '../credentials/credential-object-storage.config';
import { IntegrationService } from '../integrations/integration.service';

export const erasureDigest = (value: unknown): string => createHash('sha256').update(canonical(value)).digest('hex');
export function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string,unknown>)[k])).join(',') + '}';
}
export type JournalPhase='intent'|'commit'|'abort'|'baseline';
export interface ErasureJournal {
  put(id: string, phase: JournalPhase, value: unknown): Promise<void>;
  entries(): Promise<Array<{id:string;phase:JournalPhase;value:unknown}>>;
}
const identifier = /^[a-f0-9-]{36}$/;
const phasePattern = /^(intent|commit|abort|baseline)$/;

/** The journal is outside PostgreSQL and encrypted before upload. A missing
 * terminal record is an unresolved operation, never permission to replay it. */
@Injectable()
export class PrivateErasureJournal implements ErasureJournal {
  constructor(private readonly integrations:IntegrationService){}
  private config() {
    this.integrations.requireOperational('OBJECT_STORAGE',{allowSandbox:true});
    const storage = inspectCredentialObjectStorage();
    const namespace = process.env.HYDROLAND_PRIVACY_JOURNAL_NAMESPACE;
    const key = process.env.HYDROLAND_PRIVACY_JOURNAL_KEY;
    if (!storage.config || !namespace || !/^[a-z0-9-]{8,80}$/.test(namespace) || !key || !/^[a-f0-9]{64}$/.test(key))
      throw new ServiceUnavailableException('سجل المحو الخارجي المشفر غير مهيأ؛ لم يبدأ المحو.');
    const cfg = storage.config;
    return { key:Buffer.from(key,'hex'), prefix:'privacy-erasure/'+namespace+'/', bucket:cfg.bucket,
      client:new S3Client({region:cfg.region,endpoint:cfg.url.toString(),forcePathStyle:true,maxAttempts:1,requestChecksumCalculation:'WHEN_REQUIRED',
        credentials:{accessKeyId:cfg.accessKeyId,secretAccessKey:cfg.secretAccessKey}}) };
  }
  private async request<T>(operation:(signal:AbortSignal)=>Promise<T>,allowNotFound=false):Promise<T|null> {
    // A configured endpoint does not override the existing provider kill switch.
    this.integrations.requireOperational('OBJECT_STORAGE',{allowSandbox:true});
    const controller=new AbortController();
    let timer:NodeJS.Timeout|undefined;
    const deadline=new Promise<never>((_resolve,reject)=>{
      timer=setTimeout(()=>{controller.abort();reject(new Error('Privacy journal transport deadline.'));},8000);timer.unref();
    });
    try {
      const response=await Promise.race([operation(controller.signal),deadline]);
      await this.integrations.recordProviderSignal('OBJECT_STORAGE','SUCCESS');return response;
    }catch(error){
      if(allowNotFound&&(error as {$metadata?:{httpStatusCode?:number}})?.$metadata?.httpStatusCode===404){
        await this.integrations.recordProviderSignal('OBJECT_STORAGE','SUCCESS');return null;
      }
      await this.integrations.recordProviderSignal('OBJECT_STORAGE','PROVIDER_FAILURE');
      throw new ServiceUnavailableException('تعذر الوصول إلى سجل المحو الخارجي في المهلة المحددة.');
    }finally{if(timer)clearTimeout(timer);}
  }
  private read(cfg:ReturnType<PrivateErasureJournal['config']>,objectKey:string,allowNotFound=false) {
    return this.request(async signal=>{
      const response=await cfg.client.send(new GetObjectCommand({Bucket:cfg.bucket,Key:objectKey}),{abortSignal:signal}),body=response.Body;
      if(!body)throw new Error('Missing privacy journal response body.');
      // SDK send resolves at the headers. Keep the same deadline through the
      // complete body and destroy a stalled Node stream when it expires.
      const abort=()=>{if('destroy' in body&&typeof body.destroy==='function')body.destroy(new Error('Privacy journal body deadline.'));};
      signal.addEventListener('abort',abort,{once:true});
      try{signal.throwIfAborted();return await body.transformToString();}finally{signal.removeEventListener('abort',abort);}
    },allowNotFound);
  }
  private objectKey(prefix:string,id:string,phase:string,digest:string) {
    if (!identifier.test(id) || !phasePattern.test(phase)||!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid erasure journal reference.');
    return prefix+id+'/'+phase+'-'+digest+'.json';
  }
  private encrypt(value:unknown,key:Buffer,binding:string) {
    const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(Buffer.from(binding));
    const ciphertext=Buffer.concat([cipher.update(canonical(value),'utf8'),cipher.final()]);
    return Buffer.from(JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));
  }
  private decrypt(bytes:string,key:Buffer,binding:string):unknown {
    const e=JSON.parse(bytes);
    if(e.version!==1 || Object.keys(e).sort().join(',')!=='ciphertext,iv,tag,version') throw new Error('Invalid erasure journal envelope.');
    const iv=Buffer.from(e.iv,'base64'),tag=Buffer.from(e.tag,'base64'),data=Buffer.from(e.ciphertext,'base64');
    if(iv.length!==12||tag.length!==16||data.length>1048576)throw new Error('Invalid erasure journal envelope.');
    const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(binding));decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8'));
  }
  async put(id:string,phase:JournalPhase,value:unknown) {
    const cfg=this.config(),digest=erasureDigest(value),objectKey=this.objectKey(cfg.prefix,id,phase,digest);
    const operationPrefix=cfg.prefix+id+'/';
    const verifyAddress=async(required:boolean)=>{
      const list=(await this.request(signal=>cfg.client.send(new ListObjectsV2Command({Bucket:cfg.bucket,Prefix:operationPrefix,MaxKeys:4}),{abortSignal:signal})))!;
      const keys=(list.Contents??[]).map(row=>row.Key);
      const phases=new Map<string,string>();
      for(const key of keys){
        const relative=key?.startsWith(operationPrefix)?key.slice(operationPrefix.length):'',match=/^(intent|commit|abort|baseline)-[a-f0-9]{64}\.json$/.exec(relative);
        if(!match||phases.has(match[1]))throw new Error('Conflicting or incomplete erasure journal phase.');
        phases.set(match[1],key!);
      }
      if(list.IsTruncated||phases.has(phase)&&phases.get(phase)!==objectKey||required&&!phases.has(phase)
        ||phases.has('commit')&&(phases.has('abort')||phase==='abort')||phases.has('abort')&&phase==='commit'
        ||phases.has('baseline')&&(phases.size!==1||phase!=='baseline')||phase==='baseline'&&keys.some(key=>key!==objectKey))
        throw new Error('Conflicting or incomplete erasure journal phase.');
    };
    // B2 does not promise S3 conditional PUT semantics. Address the canonical
    // value by its full hash instead; never overwrite a different value at the
    // same logical phase. Both normal readback and enumeration detect forks.
    await verifyAddress(false);
    const prior=await this.read(cfg,objectKey,true);
    if(prior!==null){if(!prior||erasureDigest(this.decrypt(prior,cfg.key,objectKey))!==digest)throw new Error('Erasure journal content mismatch.');await verifyAddress(true);return;}
    try {
      const body=this.encrypt(value,cfg.key,objectKey);
      await this.request(signal=>cfg.client.send(new PutObjectCommand({Bucket:cfg.bucket,Key:objectKey,Body:body,
        ContentType:'application/json'}),{abortSignal:signal}));
    } catch(error) {
      // A transport failure can be ambiguous. Read this exact content address;
      // never issue a differently addressed value or a second destructive command.
      const text=await this.read(cfg,objectKey).catch(()=>{throw error;});
      if(!text||erasureDigest(this.decrypt(text,cfg.key,objectKey))!==erasureDigest(value))throw new Error('Erasure journal collision or changed evidence.');
      await verifyAddress(true);
      return;
    }
    const text=await this.read(cfg,objectKey);
    if(!text||erasureDigest(this.decrypt(text,cfg.key,objectKey))!==erasureDigest(value))throw new Error('Erasure journal verification failed.');
    await verifyAddress(true);
  }
  async entries() {
    const cfg=this.config(), entries:Array<{id:string;phase:JournalPhase;value:unknown}>=[];
    let token:string|undefined;
    do {
      const page=(await this.request(signal=>cfg.client.send(new ListObjectsV2Command({Bucket:cfg.bucket,Prefix:cfg.prefix,ContinuationToken:token,MaxKeys:1000}),{abortSignal:signal})))!;
      for(const item of page.Contents??[]) {
        const key=item.Key??'', relative=key.slice(cfg.prefix.length), match=/^([a-f0-9-]{36})\/(intent|commit|abort|baseline)-([a-f0-9]{64})\.json$/.exec(relative);
        if(!key.startsWith(cfg.prefix)||!match||!item.Size||item.Size>1048576)throw new Error('Unexpected erasure journal object.');
        const text=await this.read(cfg,key);
        if(!text)throw new Error('Erasure journal object unavailable.');
        const value=this.decrypt(text,cfg.key,key);if(erasureDigest(value)!==match[3])throw new Error('Erasure journal content address mismatch.');
        entries.push({id:match[1],phase:match[2] as JournalPhase,value});
      }
      if(page.IsTruncated&&!page.NextContinuationToken)throw new Error('Incomplete erasure journal listing.');
      token=page.IsTruncated?page.NextContinuationToken:undefined;
    }while(token);
    return entries;
  }
}
