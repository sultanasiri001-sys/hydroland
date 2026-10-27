import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(kind) {
  const filename=kind==='certificates'?'hydroland-profile-data.js':'hydroland-training.js';
  const source=readFileSync(new URL(`../src/${filename}`,import.meta.url),'utf8');
  const helper=source.split('\n').find(line=>line.trim().startsWith('const shortcutScrollBehavior='))||'';
  const marker=kind==='certificates'?'[data-hl-action="certs"]':'[data-hl-action="training"]';
  const handler=source.split('\n').find(line=>line.includes("document.addEventListener('click'")&&line.includes(marker));
  assert.ok(handler,'actual production event callback exists');
  const state={reduced:false,authenticated:true,matched:true,instructor:false,hasHost:true,events:[],list:{innerHTML:''},callback:null};
  const host={scrollIntoView(options){state.events.push(['scroll',options.behavior,options.block]);},querySelector(){return state.list;}};
  const authObject={isAuthenticated:()=>state.authenticated};
  const document={addEventListener(event,callback){assert.equal(event,'click');state.callback=callback;},querySelector:()=>state.hasHost?host:null,getElementById:()=>({close(){state.events.push(['close']);}})};
  const window={matchMedia:()=>({matches:state.reduced}),HydrolandWorkspaceUI:{show(node){assert.equal(node,host);state.events.push(['show']);}}};
  const context=vm.createContext({document,window,section:host,auth:kind==='certificates'?()=>authObject:authObject,toast:message=>state.events.push(['toast',message]),load:mode=>state.events.push(['load',mode])});
  vm.runInContext(helper+'\n'+handler,context);
  state.click=()=>state.callback({preventDefault(){state.events.push(['preventDefault']);},target:{closest:()=>state.matched?{closest:()=>state.instructor?{}:null}:null}});
  return {state,window};
}
for(const kind of ['certificates','training']) {
  test(`${kind}: actual handler reads preference each time and preserves action ordering`,()=>{
    const {state}=fixture(kind);
    for(const [reduced,behavior] of [[false,'smooth'],[true,'instant'],[false,'smooth']]) {
      state.events=[];state.reduced=reduced;state.click();
      assert.deepEqual(state.events,kind==='certificates'?[['preventDefault'],['close'],['show'],['scroll',behavior,'start']]:[['preventDefault'],['scroll',behavior,'start'],['load',undefined]]);
    }
  });
  test(`${kind}: missing media API/result uses instant scrolling`,()=>{
    const {state,window}=fixture(kind);delete window.matchMedia;state.click();
    assert.deepEqual(state.events.find(e=>e[0]==='scroll'),['scroll','instant','start']);
    state.events=[];window.matchMedia=()=>null;state.click();
    assert.deepEqual(state.events.find(e=>e[0]==='scroll'),['scroll','instant','start']);
  });
  test(`${kind}: unrelated clicks have no effects`,()=>{
    const {state}=fixture(kind);state.matched=false;state.click();assert.deepEqual(state.events,[]);
  });
}
test('certificate guest remains denied without dialog/workspace/scroll effects',()=>{
  const {state}=fixture('certificates');state.authenticated=false;state.click();
  assert.deepEqual(state.events,[['preventDefault'],['toast','سجل الدخول أولًا لعرض الشهادات']]);
});
test('missing certificate host retains truthful failure message',()=>{
  const {state}=fixture('certificates');state.hasHost=false;state.click();
  assert.deepEqual(state.events,[['preventDefault'],['toast','تعذر فتح قسم الشهادات']]);
});
test('training guest still sees sign-in message but never loads private data',()=>{
  const {state}=fixture('training');state.authenticated=false;state.reduced=true;state.click();
  assert.deepEqual(state.events,[['preventDefault'],['scroll','instant','start']]);
  assert.equal(state.list.innerHTML,'<p>سجل الدخول لعرض بيانات التدريب.</p>');
});
test('training preserves instructor mode',()=>{
  const {state}=fixture('training');state.instructor=true;state.click();assert.deepEqual(state.events.at(-1),['load','instructor']);
});
