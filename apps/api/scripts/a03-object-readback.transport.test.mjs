import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createStorageReader} from './a03-object-readback.mjs';
import {probeReferencedObjects} from './a03-recovery-evidence.mjs';

const require=createRequire(import.meta.url),sdk=require('@aws-sdk/client-s3');
const key='credentials/synthetic/account/fixture.pdf',payload=Buffer.from('original');
const object={key,byteSize:payload.length,sha256:createHash('sha256').update(payload).digest('hex')};
const xml=(res,text)=>{res.writeHead(200,{'content-type':'application/xml'});res.end(text);};

// The real locked SDK signs/parses/streams against an in-process loopback S3
// fixture. It never receives provider credentials or production data.
async function withStorage(mode,operation){
  const calls=[];let unexpectedRoute=false;
  const server=createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1'),signed=Boolean(req.headers.authorization);
    calls.push({method:req.method,path:url.pathname,query:[...url.searchParams.keys()],signed});
    if(url.pathname==='/redirect-target'){unexpectedRoute=true;res.writeHead(500);res.end();return;}
    if(!signed){
      if(mode==='redirect'){res.writeHead(302,{location:'/redirect-target'});res.end();return;}
      res.writeHead(mode==='public'?200:403,{'content-type':'application/octet-stream'});res.end(mode==='public'?payload:'Denied');return;
    }
    if(url.searchParams.has('versioning'))return xml(res,'<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>');
    if(url.searchParams.has('encryption'))return xml(res,'<ServerSideEncryptionConfiguration><Rule><ApplyServerSideEncryptionByDefault><SSEAlgorithm>AES256</SSEAlgorithm></ApplyServerSideEncryptionByDefault></Rule></ServerSideEncryptionConfiguration>');
    if(url.searchParams.has('versions'))return xml(res,`<ListVersionsResult><IsTruncated>false</IsTruncated><Version><Key>${key}</Key><VersionId>known-old-version</VersionId><IsLatest>false</IsLatest><Size>8</Size></Version></ListVersionsResult>`);
    if(url.searchParams.has('acl')&&mode==='wrong-owner')return xml(res,'<AccessControlPolicy><Owner><ID>other-owner</ID></Owner><AccessControlList><Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser"><ID>other-owner</ID></Grantee><Permission>FULL_CONTROL</Permission></Grant></AccessControlList></AccessControlPolicy>');
    if(url.searchParams.has('acl'))return xml(res,'<AccessControlPolicy><Owner><ID>fixture-owner</ID></Owner><AccessControlList><Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser"><ID>fixture-owner</ID></Grantee><Permission>FULL_CONTROL</Permission></Grant></AccessControlList></AccessControlPolicy>');
    assert.equal(url.searchParams.get('versionId'),'known-old-version');
    assert.equal(url.pathname,'/private-fixture/'+key);
    if(mode==='hang')return;
    const bytes=mode==='corrupt'?Buffer.from('modified'):payload;
    res.writeHead(200,{'content-length':bytes.length,'content-type':'application/pdf','x-amz-version-id':mode==='wrong-version'?'another-version':'known-old-version','x-amz-server-side-encryption':'AES256'});res.end(bytes);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const config={endpoint:`http://127.0.0.1:${server.address().port}`,region:'us-east-1',bucket:'private-fixture',credentials:{accessKeyId:'FIXTURE_ONLY',secretAccessKey:'FIXTURE_ONLY'}};
  const client=new sdk.S3Client({endpoint:config.endpoint,region:config.region,credentials:config.credentials,forcePathStyle:true,maxAttempts:1});
  try{return await operation(createStorageReader(config,sdk,client),calls,()=>unexpectedRoute);}
  finally{client.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

test('real SDK transport preserves version/ACL/encryption identity and uses only signed reads plus one anonymous read',()=>withStorage('private',async(storage,calls)=>{
  const r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage});assert.equal(r.status,'PASS');
  assert.equal(calls.length,6);assert(calls.every(x=>x.method==='GET'));assert.equal(calls.filter(x=>!x.signed).length,1);
  const anon=calls.at(-1);assert.equal(anon.path,'/private-fixture/'+key);assert(anon.query.includes('versionId'));
}));

test('actual streamed corrupted bytes fail before ACL and anonymous checks',()=>withStorage('corrupt',async(storage,calls)=>{
  const r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage});assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'VERSION_BYTES');
  assert(!calls.some(x=>x.query.includes('acl')));assert(calls.every(x=>x.signed));
}));

test('an actual public response fails the anonymous-denial gate',()=>withStorage('public',async storage=>{
  const r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage});assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'ANONYMOUS_VERSION');
}));

test('actual response version headers must match the requested historical version',()=>withStorage('wrong-version',async(storage,calls)=>{
  const r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage});assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'VERSION_BYTES');assert(calls.every(x=>x.signed));
}));

test('a hung real SDK request is aborted within the configured bound',()=>withStorage('hang',async storage=>{
  const started=performance.now(),r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage,requestMs:250});
  assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'VERSION_BYTES');assert(performance.now()-started<3000);
}));

test('the anonymous fetch cannot follow a redirect to a different object',()=>withStorage('redirect',async(storage,_calls,unexpected)=>{
  const r=await probeReferencedObjects({expectedOwnerId:'fixture-owner',objects:[object],storage});assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'ANONYMOUS_VERSION');assert.equal(unexpected(),false);
}));


test('actual SDK ACL parsing rejects a self-consistent but unexpected owner before anonymous probing',()=>withStorage('wrong-owner',async(storage,calls)=>{
  const r=await probeReferencedObjects({objects:[object],storage,expectedOwnerId:'fixture-owner'});
  assert.equal(r.status,'FAIL');assert.equal(r.failureStage,'VERSION_ACL');assert(calls.every(x=>x.signed));
  assert(!JSON.stringify(r).includes('other-owner'));
}));
