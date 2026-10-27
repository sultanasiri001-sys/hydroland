import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=name=>readFileSync(new URL(`../src/hydroland-${name}.js`,import.meta.url),'utf8');
const line=(s,marker)=>{const result=s.split('\n').find(x=>x.includes(marker));assert.ok(result,marker);return result;};
function fixture(name,variant='') {
 const s=source(name), events=[], state={role:'boat',allowed:true,authenticated:true,found:true,reduced:false,focus:true,route:'documents',index:1,membershipRole:'OWNER',membershipStatus:'ACTIVE'};
 const callback={};
 const node={dataset:{},classList:{remove(){},add(){}},scrollIntoView:o=>events.push(['scroll',o.behavior,o.block]),addEventListener:(type,fn)=>callback.fn=fn,querySelector:()=>node,querySelectorAll:()=>[node],reset:()=>events.push(['reset']),elements:{namedItem:()=>null}};
 const window={matchMedia:()=>({matches:state.reduced}),HydrolandAuth:{isAuthenticated:()=>state.authenticated},HydrolandPortalAccess:{getCurrentRole:()=>state.role,roleAllowed:()=>state.allowed},HydrolandWorkspaceUI:{show:()=>events.push(['show'])},HydrolandAccountCenter:{openNotifications:()=>events.push(['notifications'])},HydrolandMessages:{open:()=>events.push(['messages'])}};
 const context=vm.createContext({window,document:{getElementById:()=>state.found?node:null,querySelector:()=>state.found?node:null},history:{replaceState:(a,b,hash)=>events.push(['hash',hash])},dashboard:node,panel:node,section:node,d:node,role:'instructor',state:{role:'boat'},eligible:()=>state.allowed,close:()=>events.push(['close']),refresh:()=>events.push(['refresh']),refreshData:()=>events.push(['refresh']),authorizeRoleAction:async()=>state.allowed,targetFor:()=>state.found?node:null,openTarget:()=>events.push(['open']),setTargetAvailability:()=>events.push(['availability']),selected:{movements:[]},renderHistory:()=>events.push(['history']),renderPassport:()=>events.push(['passport']),scanDialog:{close:()=>events.push(['close'])},stopCamera:()=>events.push(['stop']),load:async()=>events.push(['load']),request:async()=>{if(!state.allowed)throw Error('denied');events.push(['request']);return {movements:[]};},notify:()=>events.push(['notify']),note:()=>events.push(['note']),editingOrganization:null,stateMemberships:[]});
 let code,invoke;
 const event={preventDefault(){},stopImmediatePropagation(){},target:{closest:selector=>selector.includes('notifications')||selector.includes('messages')?null:{dataset:{diverRoute:state.route}}}};
 if(['marine-readiness','marine-trips','marine-documents','safety-incidents'].includes(name)) {code=line(s,'function open(');invoke=()=>context.open(state.role,state.focus);}
 if(name==='diver-dashboard'){code=line(s,"dashboard.addEventListener('click'");invoke=()=>callback.fn(event);}
 if(name==='role-task-routing'){code=s.slice(s.indexOf('  const navigate=config=>{'),s.indexOf('  // The admin dashboard'));code+='\nglobalThis.run=navigate;';invoke=()=>context.run(state.found?{section:'documents'}:{section:'absent'});}
 if(name==='inventory'&&variant==='lookup'){code=line(s,'const lookup=');code+='\nglobalThis.run=lookup;';invoke=()=>context.run(state.code??'tag');}
 if(name==='inventory'&&variant==='history'){code=line(s,"[data-inventory-action=\"history\"]");invoke=()=>callback.fn();}
 if(name==='role-dashboards'&&variant==='control'){code=line(s,'const connectControl=');code+='\nglobalThis.run=connectControl;';invoke=async()=>{context.run(node,'instructor',state.route,'label');return callback.fn(event);};}
 if(name==='role-dashboards'&&variant==='nav'){code=line(s,"d.querySelectorAll('.hl-portal-nav-item').forEach((node,index)=>node.addEventListener");node.querySelectorAll=()=>({forEach(fn){fn(node,state.index);}});invoke=async()=>{node.dataset.hlNavRoute=state.route;vm.runInContext(code,context);return callback.fn(event);};}
 if(name==='organizations'){const start=s.indexOf("  panel.querySelector('[data-org-list]')?.addEventListener");const end=s.indexOf('\n  });',start)+7;code=s.slice(start,end);const button={disabled:false,closest:()=>({dataset:{orgId:'org'}}),matches:selector=>selector==='[data-org-edit]'};invoke=()=>{context.stateMemberships=[{status:state.membershipStatus,role:state.membershipRole,organization:{id:'org',displayName:'Original'}}];return callback.fn({target:{closest:()=>button}});};state.button=button;}
 const helper=s.split('\n').find(x=>x.includes('const residualScrollBehavior='))||'';
 vm.runInContext(helper,context);
 if(!(name==='role-dashboards'&&variant==='nav'))vm.runInContext(code,context);
 return {state,events,window,node,context,invoke};
}
const paths=[['diver-dashboard'],['role-dashboards','control'],['role-dashboards','nav'],['role-task-routing'],['inventory','lookup'],['inventory','history'],['organizations'],['marine-readiness'],['marine-trips'],['marine-documents'],['safety-incidents']];
for(const [name,variant] of paths){
 test(`${name}/${variant||'open'}: production callback respects live preference and media fallback`,async()=>{
 const f=fixture(name,variant);
 for(const [reduced,expected] of [[false,'smooth'],[true,'instant'],[false,'smooth']]){f.state.reduced=reduced;f.events.length=0;await f.invoke();assert.equal(f.events.filter(x=>x[0]==='scroll').length,1);assert.equal(f.events.find(x=>x[0]==='scroll')[1],expected);}
 delete f.window.matchMedia;f.events.length=0;await f.invoke();assert.equal(f.events.find(x=>x[0]==='scroll')[1],'instant');
 f.window.matchMedia=()=>null;f.events.length=0;await f.invoke();assert.equal(f.events.find(x=>x[0]==='scroll')[1],'instant');
 });
}
test('role dashboard home branch reads live preference without authorizing a service',async()=>{const f=fixture('role-dashboards','nav');f.state.index=0;f.state.allowed=false;f.state.reduced=true;await f.invoke();assert.deepEqual(f.events,[['show'],['scroll','instant','start']]);});
for(const variant of ['control','nav'])test(`role ${variant} authorization denial never opens or scrolls`,async()=>{const f=fixture('role-dashboards',variant);f.state.allowed=false;await f.invoke();assert.ok(!f.events.some(x=>['open','scroll','hash'].includes(x[0])));});
test('marine trips retains authentication, role and allowed-role gates',async()=>{for(const change of [{authenticated:false},{role:'diver'},{allowed:false}]){const f=fixture('marine-trips');Object.assign(f.state,change);await f.invoke();assert.deepEqual(f.events,[]);}});
test('readiness ineligible closes only; nonfocus refreshes without scrolling',async()=>{const f=fixture('marine-readiness');f.state.allowed=false;await f.invoke();assert.deepEqual(f.events,[['close']]);f.events.length=0;f.state.allowed=true;f.state.focus=false;await f.invoke();assert.deepEqual(f.events,[['refresh']]);});
test('safety nonfocus refreshes without scrolling',async()=>{const f=fixture('safety-incidents');f.state.focus=false;await f.invoke();assert.deepEqual(f.events,[['refresh']]);});
test('organization edit remains limited to active managing memberships',async()=>{for(const change of [{membershipRole:'STAFF'},{membershipStatus:'PENDING'}]){const f=fixture('organizations');Object.assign(f.state,change);await f.invoke();assert.deepEqual(f.events,[]);assert.equal(f.state.button.disabled,false);}});
test('inventory lookup keeps load order; blank and failed lookups never scroll',async()=>{const f=fixture('inventory','lookup');f.state.reduced=true;await f.invoke();assert.deepEqual(f.events.map(x=>x[0]),['request','close','stop','load','passport','history','scroll','notify']);f.events.length=0;f.state.code=' ';await f.invoke();assert.deepEqual(f.events,[]);f.state.code='tag';f.state.allowed=false;await f.invoke();assert.deepEqual(f.events,[['notify']]);});
test('missing role routing target has no scrolling or history effects',async()=>{const f=fixture('role-task-routing');f.state.found=false;assert.equal(await f.invoke(),false);assert.deepEqual(f.events,[]);});
