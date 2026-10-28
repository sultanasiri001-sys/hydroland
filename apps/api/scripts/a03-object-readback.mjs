import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {mkdtemp,writeFile,rename,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LIMITS,digestBody,probeReferencedObjects,safeCode} from './a03-recovery-evidence.mjs';

export function auditConfig(env){
  const names=['ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY'];
  const fields=Object.fromEntries(names.map(key=>[key,env['HYDROLAND_OBJECT_STORAGE_'+key]?.trim()]));
  assert(names.every(key=>fields[key]));
  const endpoint=new URL(fields.ENDPOINT);
  assert(endpoint.protocol==='https:'&&!endpoint.username&&!endpoint.password&&!endpoint.search&&!endpoint.hash);
  assert(!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname));
  assert(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(fields.BUCKET));
  return{endpoint:endpoint.href,bucket:fields.BUCKET,region:fields.REGION,credentials:{accessKeyId:fields.ACCESS_KEY_ID,secretAccessKey:fields.SECRET_ACCESS_KEY}};
}

export async function main(argv=process.argv.slice(2),env=process.env){
  // Confirm the existing API runtime BEFORE loading clients or reading secrets.
  assert.deepEqual(argv,['--confirmed-read-only']);
  assert.equal(env.RENDER_SERVICE_ID,'srv-dakelt142hec73aavvsg');
  const directory=await mkdtemp(join(tmpdir(),'hydroland-a03-readback-'));
  const receipt=join(directory,'receipt.json');
  const initial={scope:'A03_REFERENCED_OBJECT_VERSION_READBACK',status:'FAIL',failureCode:'EXECUTION_INCOMPLETE',productionAccepted:false,providerPitrVerified:false,ownerAclTransferVerified:false,productionWrites:0,objectWrites:0};
  await writeFile(receipt,JSON.stringify(initial,null,2),{mode:0o600,flag:'wx'});
  let db,client,report=initial,stage='CONFIGURATION';
  try{
    const config=auditConfig(env);assert(env.DATABASE_URL);
    stage='CLIENT_LOADING';
    const require=createRequire(new URL('../package.json',import.meta.url));
    const {PrismaClient}=require('@prisma/client');const sdk=require('@aws-sdk/client-s3');
    const dbUrl=new URL(env.DATABASE_URL);dbUrl.searchParams.set('connect_timeout','5');dbUrl.searchParams.set('pool_timeout','5');
    db=new PrismaClient({datasourceUrl:dbUrl.href});
    stage='READ_ONLY_INVENTORY';
    const objects=await db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [identity]=await tx.$queryRawUnsafe("SELECT current_database()::text AS database_name, current_setting('transaction_read_only') AS read_only");
      assert.equal(identity.database_name,'hydroland');assert.equal(identity.read_only,'on');
      const rows=await tx.document.findMany({select:{storageKey:true,sha256:true,byteSize:true},orderBy:{id:'asc'},take:LIMITS.objects+1});
      const marine=await tx.marineAssetDocument.findMany({where:{storageKey:{not:null}},select:{storageKey:true,sha256:true,byteSize:true},orderBy:{id:'asc'},take:LIMITS.objects+1});
      return[...rows,...marine].map(row=>({key:row.storageKey,sha256:row.sha256,byteSize:row.byteSize}));
    },{maxWait:5000,timeout:10000});
    client=new sdk.S3Client({endpoint:config.endpoint,region:config.region,credentials:config.credentials,forcePathStyle:true,maxAttempts:1});
    const send=(Command,input,signal)=>client.send(new Command({Bucket:config.bucket,...input}),{abortSignal:signal});
    const storage={
      versioning:signal=>send(sdk.GetBucketVersioningCommand,{},signal),
      encryption:signal=>send(sdk.GetBucketEncryptionCommand,{},signal),
      versions:(key,signal)=>send(sdk.ListObjectVersionsCommand,{Prefix:key,MaxKeys:25},signal),
      acl:(key,versionId,signal)=>send(sdk.GetObjectAclCommand,{Key:key,VersionId:versionId},signal),
      object:async(key,versionId,signal,budget)=>{
        const response=await send(sdk.GetObjectCommand,{Key:key,VersionId:versionId},signal);
        if(!Number.isSafeInteger(response.ContentLength)||response.ContentLength>LIMITS.objectBytes){response.Body?.destroy();throw new Error('Invalid object length');}
        const digest=await digestBody(response.Body,{signal,maxBytes:LIMITS.objectBytes,budget});
        assert.equal(digest.bytes,response.ContentLength);
        return{...digest,versionId:response.VersionId,encryption:response.ServerSideEncryption};
      },
      anonymous:async(key,versionId,signal)=>{
        const url=new URL(config.endpoint),enc=encodeURIComponent;
        url.pathname=url.pathname.replace(/\/$/,'')+'/'+enc(config.bucket)+'/'+key.split('/').map(enc).join('/');
        url.searchParams.set('versionId',versionId);
        const response=await fetch(url,{method:'GET',redirect:'error',signal,cache:'no-store',credentials:'omit'});
        await response.body?.cancel();return response.status;
      },
    };
    stage='OBJECT_READBACK';report=await probeReferencedObjects({objects,storage});
    report.integrationFlagsChanged=false;
    report.databaseInventoryReadOnly=true;
    report.operatorSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
    report.applicationCommit=/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT||'')?env.RENDER_GIT_COMMIT:null;
  }catch(error){report={...initial,failureStage:stage,failureCode:safeCode(error)};}
  finally{
    client?.destroy();
    try{
      if(db)await Promise.race([db.$disconnect(),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Disconnect timeout')),5000);timer.unref();})]);
      report.clientCleanup='PASS';
    }catch{report.status='FAIL';report.clientCleanup='FAIL';}
  }
  // Deliberately omit bucket/key/version IDs, connection strings and document hashes.
  const staged=join(directory,'final.json');await writeFile(staged,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});await rename(staged,receipt);
  console.log(JSON.stringify({receipt,status:report.status,scope:report.scope}));
  return report.status==='PASS'?0:2;
}

let entry;
try{if(process.argv[1])entry=realpathSync(process.argv[1]);}catch{/* An import is not a CLI invocation. */}
if(entry===fileURLToPath(import.meta.url)){
  process.exitCode=2;
  // A stuck driver cannot keep the CLI alive indefinitely after a FAIL receipt.
  // The timer is unref'd so ordinary successful/refused commands exit promptly.
  const watchdog=setTimeout(()=>process.exit(2),150000);watchdog.unref();
  main().then(code=>{process.exitCode=code;}).catch(()=>{console.error('A03 read-only probe refused; no secret details are logged.');process.exitCode=2;});
}
