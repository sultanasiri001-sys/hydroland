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
  const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
  assert.match(html,/<button id="menu"[^>]*aria-label="فتح القائمة"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);
  assert.match(html,/<dialog id="role-dialog" aria-labelledby="role-dialog-title">/);
  assert.match(html,/<h2 id="role-dialog-title">اختر نوع الحساب<\/h2>/);
  assert.match(html,/<button id="close-dialog"[^>]*aria-label="إغلاق"/);
  assert.equal((html.match(/id="sidebar"/g)||[]).length,1);
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.ok(app.indexOf("await loadScript('hydroland-ui.js')")<app.indexOf('window.HydrolandUI.bindNavigationMenu('));
});
