import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { IntegrationService } from '../integrations/integration.service';

const EMPTY_SHA256=createHash('sha256').update('').digest('hex');
const enc=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac=(key:Buffer|string,value:string)=>createHmac('sha256',key).update(value).digest();

@Injectable()
export class CredentialObjectStorageService {
  constructor(private readonly integrations:IntegrationService){}

  private config(){
    this.integrations.requireOperational('OBJECT_STORAGE',{allowSandbox:true});
    const endpoint=process.env.HYDROLAND_OBJECT_STORAGE_ENDPOINT?.trim();
    const bucket=process.env.HYDROLAND_OBJECT_STORAGE_BUCKET?.trim();
    const accessKeyId=process.env.HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
    const secretAccessKey=process.env.HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
    const region=process.env.HYDROLAND_OBJECT_STORAGE_REGION?.trim()||'us-east-1';
    if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)throw new ServiceUnavailableException('Private object storage is not configured.');
    let url:URL;try{url=new URL(endpoint)}catch{throw new ServiceUnavailableException('Private object storage endpoint is invalid.');}
    if(!['http:','https:'].includes(url.protocol))throw new ServiceUnavailableException('Private object storage endpoint must use HTTP or HTTPS.');
    if(url.username||url.password||url.search||url.hash)throw new ServiceUnavailableException('Private object storage endpoint is invalid.');
    return{url,bucket,accessKeyId,secretAccessKey,region};
  }

  key(accountId:string,credentialId:string,mimeType:string){
    const ext=mimeType==='application/pdf'?'pdf':mimeType==='image/png'?'png':'jpg';
    return`credentials/${accountId}/${credentialId}/${randomUUID()}.${ext}`;
  }

  async put(storageKey:string,bytes:Buffer,mimeType:string){
    const payloadHash=createHash('sha256').update(bytes).digest('hex');
    const request=this.signedRequest('PUT',storageKey,payloadHash,{'content-type':mimeType});
    const body=Uint8Array.from(bytes).buffer;
    const response=await fetch(request.url,{method:'PUT',headers:request.headers,body});
    if(!response.ok)throw new BadGatewayException(`Object storage upload failed (${response.status}).`);
  }

  async exists(storageKey:string){
    const request=this.signedRequest('HEAD',storageKey,EMPTY_SHA256,{});
    const response=await fetch(request.url,{method:'HEAD',headers:request.headers});
    if(response.status===404)return false;
    if(!response.ok)throw new BadGatewayException(`Object storage check failed (${response.status}).`);
    return true;
  }

  async delete(storageKey:string){
    try{const request=this.signedRequest('DELETE',storageKey,EMPTY_SHA256,{});await fetch(request.url,{method:'DELETE',headers:request.headers});}catch{return;}
  }

  signedGet(storageKey:string,expiresSeconds=300){
    const cfg=this.config();
    const expires=Math.max(30,Math.min(300,Math.trunc(expiresSeconds)));
    const now=new Date(),amzDate=this.amzDate(now),dateStamp=amzDate.slice(0,8),scope=`${dateStamp}/${cfg.region}/s3/aws4_request`;
    const target=this.target(cfg,storageKey),credential=`${cfg.accessKeyId}/${scope}`;
    const params=new URLSearchParams();
    params.set('X-Amz-Algorithm','AWS4-HMAC-SHA256');
    params.set('X-Amz-Credential',credential);
    params.set('X-Amz-Date',amzDate);
    params.set('X-Amz-Expires',String(expires));
    params.set('X-Amz-SignedHeaders','host');
    const canonicalQuery=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${enc(k)}=${enc(v)}`).join('&');
    const canonicalHeaders=`host:${target.host}\n`;
    const canonicalRequest=['GET',target.pathname,canonicalQuery,canonicalHeaders,'host','UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const signature=createHmac('sha256',this.signingKey(cfg.secretAccessKey,dateStamp,cfg.region)).update(stringToSign).digest('hex');
    target.search=`${canonicalQuery}&X-Amz-Signature=${signature}`;
    return{url:target.toString(),expiresAt:new Date(now.getTime()+expires*1000).toISOString()};
  }

  private signedRequest(method:string,storageKey:string,payloadHash:string,extraHeaders:Record<string,string>){
    const cfg=this.config(),now=new Date(),amzDate=this.amzDate(now),dateStamp=amzDate.slice(0,8),scope=`${dateStamp}/${cfg.region}/s3/aws4_request`,target=this.target(cfg,storageKey);
    const headers:Record<string,string>={'host':target.host,'x-amz-content-sha256':payloadHash,'x-amz-date':amzDate,...extraHeaders};
    const names=Object.keys(headers).map(k=>k.toLowerCase()).sort();
    const canonicalHeaders=names.map(name=>`${name}:${headers[name].trim().replace(/\s+/g,' ')}\n`).join('');
    const signedHeaders=names.join(';');
    const canonicalRequest=[method,target.pathname,'',canonicalHeaders,signedHeaders,payloadHash].join('\n');
    const stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const signature=createHmac('sha256',this.signingKey(cfg.secretAccessKey,dateStamp,cfg.region)).update(stringToSign).digest('hex');
    const authorization=`AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const fetchHeaders:Record<string,string>={...extraHeaders,'x-amz-content-sha256':payloadHash,'x-amz-date':amzDate,Authorization:authorization};
    return{url:target.toString(),headers:fetchHeaders};
  }

  private target(cfg:ReturnType<CredentialObjectStorageService['config']>,storageKey:string){
    const target=new URL(cfg.url.toString()),prefix=target.pathname.replace(/\/$/,'');
    const keyPath=storageKey.split('/').map(enc).join('/');
    target.pathname=`${prefix}/${enc(cfg.bucket)}/${keyPath}`.replace(/\/+/g,'/');target.search='';target.hash='';
    return target;
  }
  private amzDate(date:Date){return date.toISOString().replace(/[:-]|\.\d{3}/g,'');}
  private signingKey(secret:string,dateStamp:string,region:string){const kDate=hmac(`AWS4${secret}`,dateStamp),kRegion=hmac(kDate,region),kService=hmac(kRegion,'s3');return hmac(kService,'aws4_request');}
}
