// Actual shipped runtime functions with a deliberately limited DOM shim.
// This is state/replay coverage, NOT Chromium rendering/native-form/focus coverage.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as F from '../e2e/research-runtime-fixtures.mjs';
const contract=readFileSync(new URL('../src/hydroland-research-contract.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/hydroland-research-runtime.js',import.meta.url),'utf8');
const anchor='window.HydrolandResearchRuntime={';
assert.equal(runtime.split(anchor).length,2,'Test must expose the actual single runtime export, never silently execute a different shim');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.events={};this.open=false;this._text='';}
 appendChild(node){this.children.push(node);return node;}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
 set innerHTML(_value){this.children=[];for(const key of ['body','status','notice','list','reload','close']){const node=new Element();node.key=key;this.appendChild(node);}}
 setAttribute(){}
 addEventListener(key,listener){(this.events[key]??=[]).push(listener);}
 emit(key){for(const listener of this.events[key]||[])listener({preventDefault(){},target:this});}
 all(){return this.children.flatMap(node=>[node,...node.all()]);}
 querySelector(selector){return this.all().find(node=>selector==='[data-research-'+node.key+']');}
 querySelectorAll(){return this.all().filter(node=>node.dataset.researchAction!==undefined);}
 replaceChildren(...nodes){this.children=nodes;}
 close(){this.open=false;this.emit('close');}
 showModal(){this.open=true;}
}
function setup({owner=true,response=F.detail(),deferred=false,malformed=false,me={}}={}){
 const events={},head=new Element(),body=new Element(),profile=new Element();let writes=0,release,session=1;
 const document={head,body,createElement:tag=>new Element(tag),querySelector:()=>profile,getElementById:()=>null,addEventListener:(key,listener)=>(events[key]??=[]).push(listener)};
 const ctx={document,AbortController,setTimeout,clearTimeout,crypto:{randomUUID:()=>F.ids.person},addEventListener:(key,listener)=>(events[key]??=[]).push(listener),HydrolandAuth:{isAuthenticated:()=>true,getSessionVersion:()=>session,authorizedFetch:async path=>{
  if(path==='/me')return {ok:true,status:200,json:async()=>({id:F.ids.owner,status:'ACTIVE',roleAssignments:[{role:owner?'ADMIN':'STAFF',status:'ACTIVE'}],...me})};
  writes++;if(deferred)await new Promise(resolve=>release=resolve);
  return {ok:true,status:200,json:async()=>{if(malformed)throw Error('invalid JSON');return response;}};
 }}};ctx.window=ctx;
 vm.runInNewContext(contract,ctx);vm.runInNewContext(runtime.replace(anchor,'window.__testResearch={s,dialog,body,write,clear};'+anchor),ctx);
 const actual=ctx.__testResearch;Object.assign(actual.s,{session:1,actor:F.ids.owner,organization:F.ids.org,owner});actual.dialog.open=true;actual.body.appendChild(new Element());
 return {ctx,actual,emit:key=>{for(const listener of events[key]||[])listener();},get writes(){return writes;},release:()=>release(),setSession:value=>{session=value;}};
}
const write=fixture=>fixture.actual.write('/synthetic-internal-research-write',{confirmed:true},response=>fixture.ctx.HydrolandResearchContract.detail(response,F.ids.initiative));
async function untilWrite(fixture){for(let i=0;i<20&&fixture.writes===0;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(fixture.writes,1);}
for(const response of [null,false,0,'',{}])test('malformed successful response '+JSON.stringify(response)+' locks actual runtime mutation',async()=>{const f=setup({response});await write(f);assert.equal(f.writes,1);assert.equal(f.actual.s.uncertain,true);assert.match(f.actual.dialog.querySelector('[data-research-status]').textContent,/لم تتأكد/);assert.equal(f.actual.body.children.length,0);await write(f);assert.equal(f.writes,1);});
test('invalid JSON200 locks actual runtime mutation',async()=>{const f=setup({malformed:true});await write(f);assert.equal(f.actual.s.uncertain,true);assert.match(f.actual.dialog.querySelector('[data-research-status]').textContent,/لم تتأكد/);assert.equal(f.actual.body.children.length,0);await write(f);assert.equal(f.writes,1);});
test('concurrent confirmations issue at most one POST',async()=>{const f=setup({deferred:true}),first=write(f);await untilWrite(f);await write(f);assert.equal(f.writes,1);f.release();await first;assert.equal(f.actual.s.uncertain,true);});
for(const me of [{id:F.ids.reviewer},{status:'SUSPENDED'},{roleAssignments:[]}])test('fresh actor/status/role mismatch refuses mutation '+JSON.stringify(me),async()=>{const f=setup({me});await write(f);assert.equal(f.writes,0);assert.equal(f.actual.dialog.open,false);assert.equal(f.actual.body.children.length,0);});
for(const event of ['hydroland:session-cleared','hydroland:portal-cleared','hydroland:auth-changed','hydroland:role-changed','hydroland:workspace-selected','popstate'])test(event+' clears actual private runtime',()=>{const f=setup(),before=f.actual.s.generation;f.emit(event);assert.equal(f.actual.dialog.open,false);assert.equal(f.actual.body.children.length,0);assert(f.actual.s.generation>before);});
for(const owner of [true,false])for(const change of ['valid','role','status','actor'])test('fresh profile '+change+' in '+(owner?'owner':'reviewer')+' mode',()=>{const f=setup({owner}),profile={id:F.ids.owner,status:'ACTIVE',roles:[{role:owner?'ADMIN':'STAFF',status:'ACTIVE'}]};if(change==='role')profile.roles=[];if(change==='status')profile.status='SUSPENDED';if(change==='actor')profile.id=F.ids.reviewer;f.ctx.HydrolandProfileData={profile};f.emit('hydroland:profile-data-ready');assert.equal(f.actual.dialog.open,change==='valid');assert.equal(f.actual.body.children.length,change==='valid'?1:0);});
test('foreign owner write scope is uncertain without success body',async()=>{const f=setup({response:{...F.detail(),organizationId:F.ids.review}});await write(f);assert.equal(f.writes,1);assert.equal(f.actual.s.uncertain,true);assert.match(f.actual.dialog.querySelector('[data-research-status]').textContent,/لم تتأكد/);assert.equal(f.actual.body.children.length,0);});
test('late mutation cannot repopulate after fresh profile revocation',async()=>{const f=setup({deferred:true}),pending=write(f);await untilWrite(f);f.ctx.HydrolandProfileData={profile:{id:F.ids.owner,status:'ACTIVE',roles:[]}};f.emit('hydroland:profile-data-ready');f.release();await pending;assert.equal(f.actual.dialog.open,false);assert.equal(f.actual.body.children.length,0);});
test('late old mutation cannot clear a newer context',async()=>{const f=setup({deferred:true}),pending=write(f);await untilWrite(f);f.actual.clear();f.setSession(2);Object.assign(f.actual.s,{session:2,mode:'LIST',owner:false});f.actual.dialog.open=true;const next=new Element();next.textContent='NEW_CONTEXT';f.actual.body.appendChild(next);f.release();await pending;assert.equal(f.actual.body.textContent,'NEW_CONTEXT');assert.equal(f.actual.dialog.open,true);});

test('valid same-scope response displays saved result before mandatory readback',async()=>{const f=setup();await write(f);assert.equal(f.writes,1);assert.equal(f.actual.s.uncertain,true);assert.match(f.actual.dialog.querySelector('[data-research-status]').textContent,/حُفظ الإجراء/);assert.doesNotMatch(f.actual.dialog.querySelector('[data-research-status]').textContent,/لم تتأكد/);assert.equal(f.actual.body.children.length,0);});
