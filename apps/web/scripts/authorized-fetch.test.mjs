import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source=await readFile(new URL('../src/hydroland-auth.js',import.meta.url),'utf8');
function fixture(statuses=[200]){
 const requests=[];const state={sessionVersion:1};
 const context=vm.createContext({Headers,FormData,state,API_BASE:'https://example.invalid/api/v1',isAuthenticated:()=>true,sessionStorage:{getItem:()=> 'old-token'},refreshSession:async()=> 'new-token',clearSession(){},emitAuthChanged(){},showLogin(){},fetch:async(url,options)=>{requests.push(new Request(url,options));return new Response('{}',{status:statuses.shift()??200})}});
 const start=source.indexOf('  const authorizedFetch=');const end=source.indexOf('  const setPanelStatus=',start);assert.ok(start>=0&&end>start);
 vm.runInContext(source.slice(start,end)+'\nthis.send=authorizedFetch;',context);
 return {send:context.send,requests};
}
for(const headers of [{'content-type':'application/json'},new Headers({'content-type':'application/json'}),[['content-type','application/json']]]){
 test('JSON payload survives case-insensitive caller headers: '+headers.constructor.name,async()=>{
  const f=fixture([401,200]);const body=JSON.stringify({referenceNumber:'LIC-1',subject:'ترخيص المركز'});
  await f.send('/center/me/licenses',{method:'POST',headers,body});assert.equal(f.requests.length,2);
  for(const request of f.requests){assert.equal(request.headers.get('content-type'),'application/json');assert.deepEqual(await request.json(),JSON.parse(body));}
  assert.equal(f.requests[1].headers.get('authorization'),'Bearer new-token');
 });
}
test('JSON default does not replace explicit content type or multipart boundary',async()=>{
 const f=fixture();await f.send('/json',{method:'POST',body:'{}'});assert.equal(f.requests[0].headers.get('content-type'),'application/json');
 await f.send('/text',{method:'POST',headers:{'content-type':'text/plain'},body:'hello'});assert.equal(f.requests[1].headers.get('content-type'),'text/plain');
 const data=new FormData();data.append('file','example');await f.send('/multipart',{method:'POST',body:data});assert.match(f.requests[2].headers.get('content-type'),/^multipart\/form-data; boundary=/);
});
