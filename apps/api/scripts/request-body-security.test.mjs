import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {gzipSync,deflateSync,brotliCompressSync} from 'node:zlib';

// Resolve middleware from Nest's own module context, so a vulnerable nested
// copy cannot be hidden by a patched package at the workspace root.
const middlewareLoader=`
  import {createRequire} from 'node:module';
  const root=createRequire(process.cwd()+'/package.json');
  const framework=createRequire(root.resolve('@nestjs/platform-express/package.json'));
  const express=framework('express'),multer=framework('multer');
`;

// Exercise the real parser in a child: a parser crash must fail the test without
// taking down the test runner. No production API, database or accounts are used.
test('compressed request trailing bytes cannot terminate the HTTP process',{timeout:15000},async()=>{
  const child=spawn(process.execPath,['--input-type=module','-e',`
    ${middlewareLoader}
    const app=express();app.use(express.json({limit:'8kb'}));
    app.post('/echo',(req,res)=>res.json(req.body));
    app.get('/health',(_,res)=>res.json({ok:true}));
    app.use((err,req,res,next)=>res.status(err.status||500).json({error:'invalid body'}));
    const server=app.listen(0,'127.0.0.1',()=>console.log(server.address().port));
  `],{stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',c=>{stderr+=c});
  const exited=once(child,'exit');
  try{
    const port=await new Promise((resolve,reject)=>{
      let output='';child.stdout.on('data',c=>{output+=c;if(output.includes('\n'))resolve(Number(output.trim()))});
      child.once('error',reject);child.once('exit',code=>reject(new Error('HTTP child exited before ready: '+code+' '+stderr)));
    });
    assert(Number.isInteger(port)&&port>0);const base='http://127.0.0.1:'+port;
    for(const [encoding,compress] of [['gzip',gzipSync],['deflate',deflateSync],['br',brotliCompressSync]]){
      const value={contractVersion:7,consent:true},compressed=compress(Buffer.from(JSON.stringify(value)));
      const send=body=>fetch(base+'/echo',{method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':encoding},body,signal:AbortSignal.timeout(3000)});
      const valid=await send(compressed);assert.equal(valid.status,200);assert.deepEqual(await valid.json(),value);
      const malformed=await send(Buffer.concat([compressed,Buffer.from('invalid trailing bytes')]));
      // The parser may finish the valid frame before noticing a late decoder
      // error. Either accepting that frame or rejecting it must leave it alive.
      assert([200,400].includes(malformed.status));await malformed.arrayBuffer();
      await new Promise(r=>setTimeout(r,100));
      assert.equal(child.exitCode,null,'Uncaught decompression error: '+stderr);
      const health=await fetch(base+'/health',{signal:AbortSignal.timeout(3000)});assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true});
      const after=await send(compressed);assert.equal(after.status,200);assert.deepEqual(await after.json(),value);
    }
  }finally{if(child.exitCode===null)child.kill('SIGTERM');await exited;}
});

test('a late upload filter after rejection cannot terminate the HTTP process',{timeout:15000},async()=>{
  const child=spawn(process.execPath,['--input-type=module','-e',`
    ${middlewareLoader}
    const app=express(),upload=multer({storage:multer.memoryStorage(),fileFilter(req,file,done){
      if(file.originalname==='pending.bin')setTimeout(()=>done(null,true),80);
      else done(Object.assign(new Error('fixture rejected'),{status:400}));
    }});
    app.post('/upload',upload.array('files'),(req,res)=>res.json({files:req.files.length}));
    app.get('/health',(_,res)=>res.json({ok:true}));
    app.use((err,req,res,next)=>res.status(err.status||500).json({error:'invalid upload'}));
    const server=app.listen(0,'127.0.0.1',()=>console.log(server.address().port));
  `],{stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',c=>{stderr+=c});const exited=once(child,'exit');
  try{
    const port=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',c=>{output+=c;if(output.includes('\n'))resolve(Number(output.trim()))});child.once('error',reject);child.once('exit',code=>reject(new Error('HTTP child exited before ready: '+code+' '+stderr)))});
    const base='http://127.0.0.1:'+port;
    const form=new FormData();form.append('files',new Blob(['synthetic upload']),'pending.bin');form.append('files',new Blob(['rejected upload']),'reject.bin');
    const rejected=await fetch(base+'/upload',{method:'POST',body:form,signal:AbortSignal.timeout(3000)});assert.equal(rejected.status,400);await rejected.arrayBuffer();
    await new Promise(r=>setTimeout(r,200));assert.equal(child.exitCode,null,'Late filter crashed the process: '+stderr);
    const health=await fetch(base+'/health',{signal:AbortSignal.timeout(3000)});assert.equal(health.status,200);
    const valid=new FormData();valid.append('files',new Blob(['synthetic upload']),'pending.bin');
    const accepted=await fetch(base+'/upload',{method:'POST',body:valid,signal:AbortSignal.timeout(3000)});assert.equal(accepted.status,200);assert.deepEqual(await accepted.json(),{files:1});
  }finally{if(child.exitCode===null)child.kill('SIGTERM');await exited;}
});
