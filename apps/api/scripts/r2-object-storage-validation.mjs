import fs from 'node:fs';

const service=fs.readFileSync(new URL('../src/trip-intelligence/offline-payload-storage.service.ts',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../../render.yaml',import.meta.url),'utf8');
const rootPackage=JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url),'utf8'));

for(const marker of [
  "requireOperational('OBJECT_STORAGE',{allowSandbox:true})",
  "HYDROLAND_OBJECT_STORAGE_PROVIDER",
  "'CLOUDFLARE_R2'",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "new S3Client",
  "region:'auto'",
  ".r2.cloudflarestorage.com",
  "new GetObjectCommand",
  "getSignedUrl",
  "configuredTtl>=60&&configuredTtl<=900",
])if(!service.includes(marker))throw new Error(`R2 object storage invariant missing: ${marker}`);

for(const prohibited of ['PutObjectCommand','DeleteObjectCommand','public-read','console.log','console.error']){
  if(service.includes(prohibited))throw new Error(`R2 delivery adapter contains prohibited capability/output: ${prohibited}`);
}

for(const key of [
  'HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS',
  'HYDROLAND_OBJECT_STORAGE_PROVIDER',
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_BUCKET',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'HYDROLAND_OBJECT_STORAGE_URL_TTL_SECONDS',
])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing R2 activation input: ${key}`);

for(const dependency of ['@aws-sdk/client-s3','@aws-sdk/s3-request-presigner']){
  if(!rootPackage.dependencies?.[dependency])throw new Error(`Root package missing object storage dependency: ${dependency}`);
}

console.log('Cloudflare R2 Stage 3 validation passed.');
