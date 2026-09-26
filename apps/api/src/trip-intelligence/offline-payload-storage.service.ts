import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {GetObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {IntegrationService} from '../integrations/integration.service';

export type OfflinePayloadDescriptor={
 storageKey:string;
 checksum:string;
 sizeBytes?:number|null;
 contentType?:string|null;
};

export type OfflinePayloadDelivery={
 provider:'CLOUDFLARE_R2';
 url:string;
 expiresAt:string;
 checksum:string;
 sizeBytes?:number|null;
 contentType?:string|null;
};

@Injectable()
export class OfflinePayloadStorageService {
 constructor(private readonly integrations:IntegrationService){}
 readonly provider='CLOUDFLARE_R2' as const;

 async delivery(descriptor:OfflinePayloadDescriptor):Promise<OfflinePayloadDelivery>{
  this.integrations.requireOperational('OBJECT_STORAGE',{allowSandbox:true});
  if(process.env.HYDROLAND_OBJECT_STORAGE_PROVIDER?.trim().toUpperCase()!=='CLOUDFLARE_R2')throw new ServiceUnavailableException('Offline payload storage provider is not configured.');
  const storageKey=descriptor.storageKey?.trim();
  if(!storageKey||storageKey.length>1024||storageKey.startsWith('/')||storageKey.includes('..')||/[\u0000-\u001f\u007f]/.test(storageKey))throw new ServiceUnavailableException('Offline payload storage reference is unavailable.');

  const accountId=process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const bucket=process.env.CLOUDFLARE_R2_BUCKET?.trim();
  const accessKeyId=process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey=process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  if(!accountId||!bucket||!accessKeyId||!secretAccessKey)throw new ServiceUnavailableException('Offline payload storage credentials are not configured.');
  if(!/^[a-f0-9]{32}$/i.test(accountId))throw new ServiceUnavailableException('Offline payload storage account identifier is invalid.');
  if(!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))throw new ServiceUnavailableException('Offline payload storage bucket is invalid.');

  const configuredTtl=Number(process.env.HYDROLAND_OBJECT_STORAGE_URL_TTL_SECONDS||300);
  const expiresIn=Number.isInteger(configuredTtl)&&configuredTtl>=60&&configuredTtl<=900?configuredTtl:300;
  const client=new S3Client({
   region:'auto',
   endpoint:`https://${accountId}.r2.cloudflarestorage.com`,
   credentials:{accessKeyId,secretAccessKey},
  });
  let url:string;
  try{
   url=await getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:storageKey}),{expiresIn});
  }catch{
   throw new ServiceUnavailableException('Offline payload delivery could not be prepared.');
  }
  if(!url.startsWith('https://'))throw new ServiceUnavailableException('Offline payload delivery URL is invalid.');
  return{
   provider:this.provider,
   url,
   expiresAt:new Date(Date.now()+expiresIn*1000).toISOString(),
   checksum:descriptor.checksum,
   sizeBytes:descriptor.sizeBytes??null,
   contentType:descriptor.contentType??null,
  };
 }
}
