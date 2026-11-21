import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source=await readFile(new URL('../src/hydroland-ui.js',import.meta.url),'utf8');
function fixture(){
  const observers=[];
  const document={activeElement:null,dialogOpen:false,querySelector(){return this.dialogOpen?{}:null}};
  function node(id,parent=null){
    const listeners={},classes=new Set();
    const n={id,parent,attributes:{},getClientRects:()=>[{}],setAttribute(k,v){this.attributes[k]=v},focus(){document.activeElement=this},contains(target){for(let p=target;p;p=p.parent)if(p===this)return true;return false},closest(){return this.action?this:null},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},emit(type,event={}){for(const fn of listeners[type]||[])fn({target:this,preventDefault(){this.defaultPrevented=true},...event})}};
    n.classList={contains:k=>classes.has(k),remove:k=>classes.delete(k),toggle(k){if(classes.has(k)){classes.delete(k);return false}classes.add(k);return true}};
    return n;
  }
  const root=node('root'),panel=node('navigation',root),button=node('menu',root),link=node('service',panel),outside=node('outside',root);link.action=true;
  const context={window:{},document,MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}}};vm.runInNewContext(source,context);
  context.window.HydrolandUI.bindNavigationMenu(button,panel,root,'open',root);
  const click=target=>{target.emit('click');root.emit('click',{target})};
  return {root,panel,button,link,outside,document,click,flush:()=>observers.forEach(fn=>fn()),state:()=>button.attributes['aria-expanded']};
}
test('repeated toggle retains correct state and target association',()=>{
  const f=fixture();assert.equal(f.button.attributes['aria-controls'],f.panel.id);assert.equal(f.state(),'false');
  for(let i=0;i<4;i++){f.click(f.button);assert.equal(f.state(),'true');f.click(f.button);assert.equal(f.state(),'false')}
});
test('Escape closes and restores trigger focus; unrelated keys do not',()=>{
  const f=fixture();f.click(f.button);f.link.focus();f.root.emit('keydown',{key:'Tab'});assert.equal(f.state(),'true');
  f.root.emit('keydown',{key:'Escape'});assert.equal(f.state(),'false');assert.equal(f.document.activeElement,f.button);
});
test('Escape respects an active native dialog and consumed events',()=>{
  const f=fixture();f.click(f.button);f.document.dialogOpen=true;f.root.emit('keydown',{key:'Escape'});assert.equal(f.state(),'true');
  f.document.dialogOpen=false;f.root.emit('keydown',{key:'Escape',defaultPrevented:true});assert.equal(f.state(),'true');
});
test('navigation/home actions dismiss and restore focus from the hidden panel',()=>{
  const f=fixture();for(let i=0;i<3;i++){f.click(f.button);f.link.focus();f.click(f.link);assert.equal(f.state(),'false');assert.equal(f.document.activeElement,f.button)}
});
test('outside dismissal preserves an already focused destination',()=>{
  const f=fixture();f.click(f.button);f.outside.focus();f.click(f.outside);assert.equal(f.state(),'false');assert.equal(f.document.activeElement,f.outside);
});
test('legacy service/training closures synchronize ARIA without moving destination focus',()=>{
  const f=fixture();for(let i=0;i<3;i++){f.click(f.button);f.root.classList.remove('open');f.outside.focus();f.flush();assert.equal(f.state(),'false');assert.equal(f.document.activeElement,f.outside)}
});
test('clicking non-action panel content does not close the navigation',()=>{
  const f=fixture();f.click(f.button);f.click(f.panel);assert.equal(f.state(),'true');
});
test('earlier navigation closure and stopped propagation both restore stranded panel focus',()=>{
  const f=fixture();for(const bubbles of [true,false]){
    f.click(f.button);f.link.focus();f.root.classList.remove('open');
    if(bubbles)f.root.emit('click',{target:f.link});
    f.flush();assert.equal(f.state(),'false');assert.equal(f.document.activeElement,f.button);
  }
});
test('desktop closure does not focus its hidden mobile trigger',()=>{
  const f=fixture();f.click(f.button);f.link.focus();f.button.getClientRects=()=>[];f.root.classList.remove('open');f.flush();assert.equal(f.document.activeElement,f.link);
});
test('shell names, native dialog association and bootstrap order are retained',async()=>{
  // Authored localization comments do not alter the native accessible name.
  const html=(await readFile(new URL('../src/index.html',import.meta.url),'utf8')).replace(/<!--(?:hl-i18n:[^>]*|\/hl-i18n)-->/g,'');
  assert.match(html,/<button id="menu"[^>]*aria-label="فتح القائمة"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);
  assert.match(html,/<dialog id="role-dialog" aria-labelledby="role-dialog-title">/);
  assert.match(html,/<h2 id="role-dialog-title">اختر نوع الحساب<\/h2>/);
  assert.match(html,/<button id="close-dialog"[^>]*aria-label="إغلاق"/);
  assert.equal((html.match(/id="sidebar"/g)||[]).length,1);
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.ok(app.indexOf("await loadScript('hydroland-ui.js')")<app.indexOf('window.HydrolandUI.bindNavigationMenu('));
});

// Execute the production route handler; defer only its training network boundary.
// WorkspaceUI.show synchronously announces successful selections, while reset
// removes the selected class without announcing a replacement destination.
const dashboardSource=await readFile(new URL('../src/hydroland-role-dashboards.js',import.meta.url),'utf8');
function trainingNavigationFixture(){
  const start=dashboardSource.indexOf('  // Navigation follows the selected workspace,');
  const end=dashboardSource.indexOf('  const setTargetAvailability=',start);
  assert.ok(start>=0&&end>start,'actual dashboard navigation handlers exist');
  const listeners=new Map(),loads=[],shows=[];
  const node=id=>{
    const classes=new Set();
    return {id,isConnected:true,classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)}};
  };
  const training=node('training'),home=node('home'),finance=node('finance'),nodes=[training,home,finance];
  const state={selected:home,authenticated:true,role:'instructor'};
  const document={
    addEventListener(type,callback){const callbacks=listeners.get(type)||[];callbacks.push(callback);listeners.set(type,callbacks)},
    querySelector(selector){return selector==='.hl-training'?training:selector==='.hl-finance'?finance:null},
    getElementById(id){return nodes.find(item=>item.id===id)||null}
  };
  const show=target=>{
    shows.push(target?.id);
    if(!state.authenticated||!target?.isConnected)return false;
    for(const item of nodes)item.classList.remove('hl-workspace-selected');
    state.selected=target;
    if(target!==home)target.classList.add('hl-workspace-selected');
    for(const callback of listeners.get('hydroland:workspace-selected')||[])callback({detail:{target}});
    return true;
  };
  const window={
    HydrolandWorkspaceUI:{show},
    HydrolandPortalAccess:{getCurrentRole:()=>state.role},
    HydrolandTraining:{reload(mode){let resolve;const loading=new Promise(done=>{resolve=done});loads.push({mode,resolve});return loading}}
  };
  const context=vm.createContext({window,document,Promise,Element:class{},routeSelectors:{training:'.hl-training',finance:'.hl-finance'}});
  vm.runInContext(dashboardSource.slice(start,end)+'\nglobalThis.openTrainingRoute=openTarget;',context);
  return {
    state,training,home,finance,loads,shows,show,
    open:route=>context.openTrainingRoute(route,'instructor',''),
    async finish(index){loads[index].resolve();await new Promise(resolve=>setImmediate(resolve))},
    reset(role,authenticated=true){state.role=role;state.authenticated=authenticated;state.selected=null;for(const item of nodes)item.classList.remove('hl-workspace-selected')}
  };
}
test('training navigation: unchanged active training receives its completion refresh',async()=>{
  const f=trainingNavigationFixture();f.open('training-earnings');
  assert.equal(f.loads[0].mode,'instructor-earnings');assert.equal(f.state.selected,f.training);assert.equal(f.shows.length,1);
  await f.finish(0);assert.equal(f.state.selected,f.training);assert.equal(f.shows.length,2);
});
test('training navigation: a late response keeps Home selected',async()=>{
  const f=trainingNavigationFixture();f.open('training-earnings');f.show(f.home);
  await f.finish(0);assert.equal(f.state.selected,f.home);assert.equal(f.shows.length,2);
});
test('training navigation: a late response keeps another service selected',async()=>{
  const f=trainingNavigationFixture();f.open('training');f.show(f.finance);
  await f.finish(0);assert.equal(f.state.selected,f.finance);assert.equal(f.shows.length,2);
});
test('training navigation: older completion cannot reselect a newer training selection',async()=>{
  for(const completionOrder of [[0,1],[1,0]]){
    const f=trainingNavigationFixture();f.open('training-schedule');f.open('training-earnings');
    assert.deepEqual(f.loads.map(load=>load.mode),['instructor-schedule','instructor-earnings']);
    let expectedShows=2;
    for(const index of completionOrder){
      await f.finish(index);if(index===1)expectedShows+=1;
      assert.equal(f.state.selected,f.training);assert.equal(f.shows.length,expectedShows);
    }
  }
});
test('training navigation: role reset invalidates the pending selection',async()=>{
  const f=trainingNavigationFixture();f.open('training');f.reset('center');
  await f.finish(0);assert.equal(f.state.selected,null);assert.equal(f.shows.length,1);
});
test('training navigation: logout reset invalidates the pending selection',async()=>{
  const f=trainingNavigationFixture();f.open('training');f.reset('visitor',false);
  await f.finish(0);assert.equal(f.state.selected,null);assert.equal(f.shows.length,1);
});
test('training navigation: a detached training target cannot be refreshed',async()=>{
  const f=trainingNavigationFixture();f.open('training');f.training.isConnected=false;
  await f.finish(0);assert.equal(f.shows.length,1);
});
