export type CredentialObjectStorageConfig={
  url:URL;
  bucket:string;
  accessKeyId:string;
  secretAccessKey:string;
  region:string;
};

// This is the single configuration contract for credential uploads and their readiness report.
// R2 offline payload delivery has a separate read-only adapter and must not satisfy this contract.
export function inspectCredentialObjectStorage(env:NodeJS.ProcessEnv=process.env){
  const endpoint=env.HYDROLAND_OBJECT_STORAGE_ENDPOINT?.trim();
  const bucket=env.HYDROLAND_OBJECT_STORAGE_BUCKET?.trim();
  const accessKeyId=env.HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey=env.HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
  const region=env.HYDROLAND_OBJECT_STORAGE_REGION?.trim()||'us-east-1';
  let url:URL|undefined;
  try{if(endpoint)url=new URL(endpoint);}catch{/* Report invalid configuration without exposing its value. */}
  const checks={
    endpointConfigured:Boolean(endpoint),
    endpointValid:Boolean(url&&['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&!url.hash),
    bucketConfigured:Boolean(bucket),
    accessKeyConfigured:Boolean(accessKeyId),
    secretConfigured:Boolean(secretAccessKey),
    httpsConfigured:url?.protocol==='https:',
    privateAccessConfirmed:env.HYDROLAND_OBJECT_STORAGE_PRIVATE_ACCESS_CONFIRMED==='true',
    encryptionConfirmed:env.HYDROLAND_OBJECT_STORAGE_ENCRYPTION_CONFIRMED==='true',
    versioningConfirmed:env.HYDROLAND_OBJECT_STORAGE_VERSIONING_CONFIRMED==='true',
  };
  const connectionConfigured=checks.endpointConfigured&&checks.endpointValid&&checks.bucketConfigured&&checks.accessKeyConfigured&&checks.secretConfigured;
  const productionConfigured=connectionConfigured&&checks.httpsConfigured&&checks.privateAccessConfirmed&&checks.encryptionConfirmed&&checks.versioningConfirmed;
  const runtimeConfigured=connectionConfigured&&(env.NODE_ENV!=='production'||productionConfigured);
  let error:string|null=null;
  if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)error='Private object storage is not configured.';
  else if(!checks.endpointValid)error='Private object storage endpoint is invalid.';
  else if(env.NODE_ENV==='production'&&!checks.httpsConfigured)error='Production object storage must use HTTPS.';
  else if(!runtimeConfigured)error='Production object storage requires confirmed private access, encryption at rest, and versioning.';
  const config:CredentialObjectStorageConfig|null=runtimeConfigured&&url&&bucket&&accessKeyId&&secretAccessKey?{url,bucket,accessKeyId,secretAccessKey,region}:null;
  return{checks,runtimeConfigured,productionConfigured,config,error};
}
