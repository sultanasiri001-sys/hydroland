import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import ts from 'typescript';

// Execute the actual app TS/TSX. Only the device boundary, hooks and HTTP are
// replaced; these tests do not use a native device, real account or provider.
const root=fileURLToPath(new URL('../',import.meta.url));
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
const jwt=(subject,expired=false)=>`e30.${Buffer.from(JSON.stringify({sub:subject,exp:Math.floor(Date.now()/1000)+(expired?-60:3600)})).toString('base64url')}.synthetic`;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const response=(value,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const packageFor=tripId=>{const manifest={schemaVersion:1,tripId,briefingVersion:1,files:[],generatedAt:'2026-10-26T00:00:00Z'};return{tripId,briefingVersion:1,manifest,checksum:hash(stable(manifest)),generatedAt:manifest.generatedAt}};
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):node&&typeof node==='object'?text(node.props?.children):'';
function world(){
 const secure=new Map(),files=new Map(),dirs=new Set(),modules=new Map(),calls=[],navigations=[],appListeners=new Set();
 let handler=null,writeHook=null,digestHook=null,params={tripId:'trip-a'},component=null,tree=null,dirty=false,cursor=0;
 const states=[],hooks=[],pending=[];
 const secureStore={getItemAsync:async key=>secure.get(key)??null,setItemAsync:async(key,value)=>{if(writeHook)await writeHook(key,value);secure.set(key,value)},deleteItemAsync:async key=>secure.delete(key)};
 class Directory{
  constructor(...items){this.uri=items.map(item=>item.uri??item).join('/')}
  get exists(){return dirs.has(this.uri)}
  create(){let current='';for(const part of this.uri.split('/')){current+='/'+part;if(part)dirs.add(current.replace(/^\/\//,'/'))}dirs.add(this.uri)}
  delete(){for(const key of files.keys())if(key.startsWith(this.uri+'/'))files.delete(key);for(const key of dirs)if(key===this.uri||key.startsWith(this.uri+'/'))dirs.delete(key)}
 }
 class File{
  constructor(...items){this.uri=items.map(item=>item.uri??item).join('/')}
  get exists(){return files.has(this.uri)}
  write(value){files.set(this.uri,typeof value==='string'?value:new Uint8Array(value))}
  textSync(){return files.get(this.uri)}
  bytesSync(){return new Uint8Array(files.get(this.uri))}
  delete(){files.delete(this.uri)}
 }
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const effect=(fn,deps)=>{const index=cursor++;if(!same(hooks[index]?.deps,deps)){pending.push(()=>{hooks[index]?.cleanup?.();hooks[index]={deps,cleanup:fn()}})}};
 const react={
  useState:initial=>{const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return[states[index],value=>{const next=typeof value==='function'?value(states[index]):value;if(!Object.is(next,states[index])){states[index]=next;dirty=true}}]},
  useRef:initial=>{const index=cursor++;if(!(index in states))states[index]={current:initial};return states[index]},
  useCallback:(fn,deps)=>{const index=cursor++;if(!same(hooks[index]?.deps,deps))hooks[index]={deps,fn};return hooks[index].fn},
  useEffect:effect,
 };
 const defaultHandler=async(route,init)=>{
  if(route==='/auth/login'){const account=JSON.parse(init.body).email;return response({accessToken:jwt('untrusted-decoded-subject'),refreshToken:'refresh-'+account})}
  if(route==='/me')return response({id:'verified-account',status:'ACTIVE'});
  if(route==='/auth/logout')return response(null,204);
  if(route==='/auth/refresh')return response({accessToken:jwt('refreshed'),refreshToken:'rotated-refresh'});
  const match=route.match(/^\/trip-intelligence\/([^/]+)\/offline-package(\/content)?$/);
  if(match){const value=packageFor(decodeURIComponent(match[1]));return response(match[2]?value:{...value,status:'READY'})}
  throw new Error('Unexpected synthetic route '+route);
 };
 const native={
  'expo-secure-store':secureStore,'expo-file-system':{Directory,File,Paths:{document:'/sandbox'}},
  'expo-crypto':{randomUUID,CryptoDigestAlgorithm:{SHA256:'SHA-256'},digestStringAsync:async(_,value,options)=>{if(digestHook)await digestHook();return createHash('sha256').update(value).digest(options?.encoding??'hex')},digest:async(_,value)=>{if(digestHook)await digestHook();const bytes=createHash('sha256').update(new Uint8Array(value)).digest();return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}},
  react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},
  'expo-router':{useLocalSearchParams:()=>params,router:{replace:value=>navigations.push(value)},useFocusEffect:fn=>effect(fn,[fn])},
  'react-native':{SafeAreaView:'SafeAreaView',Text:'Text',View:'View',Pressable:'Pressable',TextInput:'TextInput',StyleSheet:{create:value=>value},AppState:{addEventListener:(_,fn)=>{appListeners.add(fn);return{remove:()=>appListeners.delete(fn)}}}},
 };
 function load(rel){
  const file=path.resolve(root,rel);if(modules.has(file))return modules.get(file).exports;
  const mod={exports:{}};modules.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const require=name=>{if(native[name])return native[name];if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx')}throw new Error(name)};
  const fetch=async(url,init={})=>{const route=new URL(url).pathname.replace('/api/v1','');calls.push({route,init});return handler?handler(route,init,defaultHandler):defaultHandler(route,init)};
  vm.runInNewContext(`(function(exports,require,module){${code}\n})`,{console,globalThis,Date,Headers,fetch,Uint8Array,ArrayBuffer,process:{env:{}},setTimeout,clearTimeout})(mod.exports,require,mod);
  return mod.exports;
 }
 function render(){if(!component)return null;dirty=false;cursor=0;tree=component();const work=pending.splice(0);work.forEach(fn=>fn());return tree}
 async function settle(){for(let i=0;i<20;i++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render()}return tree}
 return{secure,files,dirs,calls,navigations,load,defaultHandler,setHandler:value=>handler=value,setWriteHook:value=>writeHook=value,setDigestHook:value=>digestHook=value,
  mount:(rel='app/trip-day.tsx')=>{component=load(rel).default;return render()},render,settle,tree:()=>tree,
  navigate:value=>{params=value;return render()},resume:()=>{for(const fn of appListeners)fn('active')},
  unmount:()=>{for(const hook of hooks)hook?.cleanup?.();component=null},
  login:async(account='A')=>load('src/session.ts').login(account,'synthetic-password'),
  download:async(trip='trip-a')=>load('src/trip-intelligence.ts').downloadOfflinePackage(trip),
 };
}
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS',name)}
await check('protected /me, not unverified JWT sub, supplies cache namespace',async()=>{
 const w=world();await w.login();const scope=await w.load('src/session.ts').getSessionScope();assert.equal(scope.accountId,'verified-account');assert.notEqual(scope.accountId,'untrusted-decoded-subject');await w.download();assert.ok([...w.files.keys()].every(key=>key.includes('/verified-account/')));
});
await check('unverified legacy identity cannot read cache or trust decoded subject while offline',async()=>{
 const w=world();w.secure.set('hydroland.access',jwt('victim'));w.secure.set('hydroland.refresh','legacy');w.dirs.add('/sandbox/hydroland/trip-packages');w.files.set('/sandbox/hydroland/trip-packages/trip-a.json','private');w.setHandler(async()=>{throw new TypeError('offline')});await assert.rejects(()=>w.load('src/session.ts').getSessionScope(),/offline/);assert.equal(w.files.size,0);assert.equal((await w.load('src/session.ts').loadSession()).refreshToken,'legacy');
});
await check('logout removes file/metadata cache and invalidates previous account scope',async()=>{
 const w=world();await w.login();await w.download();const s=w.load('src/session.ts'),scope=await s.getSessionScope();await s.logout();assert.equal(await s.loadSession(),null);assert.equal(w.files.size,0);assert.throws(()=>w.load('src/offline-content-store.ts').loadOfflineContent('trip-a',scope),/Session changed/);w.setHandler((route,init,normal)=>route==='/me'?response({id:'verified-account-B',status:'ACTIVE'}):normal(route,init));await w.login('B');assert.equal(await w.load('src/offline-trip-package.ts').loadTripPackage('trip-a'),null);assert.equal((await s.getSessionScope()).accountId,'verified-account-B');assert.notEqual((await s.getSessionScope()).cacheId,scope.cacheId);
});
await check('refresh is single-flight and delayed refresh cannot resurrect logout',async()=>{
 const w=world();await w.login();const s=w.load('src/session.ts'),gate=deferred();w.setHandler((route,init,normal)=>route==='/auth/refresh'?gate.promise:normal(route,init));const first=s.refreshSession(),second=s.refreshSession();await w.settle();assert.equal(w.calls.filter(x=>x.route==='/auth/refresh').length,1);await s.logout();gate.resolve(response({accessToken:jwt('A'),refreshToken:'late-issued'}));assert.equal(await first,null);assert.equal(await second,null);assert.equal(await s.loadSession(),null);assert.ok(w.calls.some(x=>x.route==='/auth/logout'&&JSON.parse(x.init.body).refreshToken==='late-issued'));
});
await check('storage write in flight is serialized before logout deletion',async()=>{
 const w=world();await w.login();const gate=deferred();let writing=false;w.setWriteHook(async()=>{writing=true;await gate.promise});const pending=w.load('src/session.ts').refreshSession();await w.settle();assert.equal(writing,true);const logout=w.load('src/session.ts').logout();await w.settle();gate.resolve();await pending;await logout;assert.equal(await w.load('src/session.ts').loadSession(),null);assert.equal(w.secure.has('hydroland.session.v2'),false);
});
await check('refresh transport failure retains session/cache, definitive 401 clears both',async()=>{
 const w=world();await w.login();await w.download();const s=w.load('src/session.ts');w.setHandler(async(route,init,normal)=>{if(route==='/auth/refresh')throw new TypeError('offline');return normal(route,init)});await assert.rejects(()=>s.refreshSession(),/offline/);assert.ok(await s.loadSession());assert.ok(w.files.size);w.setHandler((route,init,normal)=>route==='/auth/refresh'?response({},401):normal(route,init));assert.equal(await s.refreshSession(),null);assert.equal(await s.loadSession(),null);assert.equal(w.files.size,0);
});
await check('second authorized 401 invalidates session; late old response cannot cross login',async()=>{
 const w=world();await w.login();const api=w.load('src/api.ts');w.setHandler((route,init,normal)=>route==='/private'?response({},401):normal(route,init));await assert.rejects(()=>api.authorizedFetch('/private'),error=>error.status===401);assert.equal(await w.load('src/session.ts').loadSession(),null);await w.login();const gate=deferred();w.setHandler((route,init,normal)=>route==='/private'?gate.promise:normal(route,init));const pending=api.authorizedFetch('/private');await w.settle();await w.login('B');gate.resolve(response({secret:'A'}));await assert.rejects(()=>pending,/Session changed/);
});
await check('manifest integrity is rehashed by actual TripDay and corruption is removed',async()=>{
 const w=world();await w.login();await w.download();const file=[...w.files.keys()].find(key=>key.endsWith('/trip-a.json'));const value=JSON.parse(w.files.get(file));value.manifest.tampered=true;w.files.set(file,JSON.stringify(value));w.mount();await w.settle();assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.equal(await w.load('src/offline-trip-package.ts').loadTripPackage('trip-a'),null);
});
await check('trip route change hides prior matched state immediately and fences delayed work',async()=>{
 const w=world();await w.login();await w.download();w.mount();await w.settle();assert.ok(text(w.tree()).includes('الحزمة المحلية مطابقة'));const gate=deferred();w.setHandler((route,init,normal)=>route.includes('trip-b')?gate.promise:normal(route,init));assert.ok(!text(w.navigate({tripId:'trip-b'})).includes('الحزمة المحلية مطابقة'));await w.settle();w.navigate({tripId:'trip-c'});await w.settle();gate.resolve(response({...packageFor('trip-b'),status:'READY'}));await w.settle();assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));
});
await check('transient offline status retains verified cache; app resume rechecks and clears old error',async()=>{
 const w=world();await w.login();await w.download();w.setHandler(async(route,init,normal)=>{if(route.includes('/trip-intelligence/'))throw new TypeError('offline');return normal(route,init)});w.mount();await w.settle();assert.ok(text(w.tree()).includes('تعذر التحقق'));assert.ok(w.files.size);w.setHandler(null);w.resume();await w.settle();assert.ok(text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.ok(!text(w.tree()).includes('تعذر التحقق من حالة الحزمة'));
});
await check('revoked session clears mounted TripDay and redirects; trip 403 removes private cache',async()=>{
 const w=world();await w.login();await w.download();w.mount();await w.settle();w.setHandler((route,init,normal)=>route.includes('/trip-intelligence/')||route==='/auth/refresh'?response({},401):normal(route,init));w.resume();await w.settle();assert.equal(w.files.size,0);assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.ok(w.navigations.some(x=>x.pathname==='/login'));
 const denied=world();await denied.login();await denied.download();const deniedScope=await denied.load('src/session.ts').getSessionScope();denied.load('src/offline-content-store.ts').payloadFile('trip-a','private',deniedScope).write(new Uint8Array([7]));denied.setHandler((route,init,normal)=>route.includes('/trip-intelligence/')?response({},403):normal(route,init));denied.mount();await denied.settle();assert.equal(denied.files.size,0);assert.ok(text(denied.tree()).includes('لم يعد الوصول'));assert.ok(await denied.load('src/session.ts').loadSession());
});
await check('download interrupted during hashing cannot write cache after logout',async()=>{
 const w=world();await w.login();const gate=deferred();w.setDigestHook(()=>gate.promise);const pending=w.download();await w.settle();await w.load('src/session.ts').logout();gate.resolve();await assert.rejects(()=>pending,/Session changed/);assert.equal(w.files.size,0);
});
async function approveMedia(w,entry,bytes){
 const pkg=packageFor('trip-a');pkg.manifest.files=[JSON.parse(JSON.stringify(entry))];pkg.checksum=hash(stable(pkg.manifest));
 w.setHandler((route,init,normal)=>route.includes('/payloads/')?new Response(bytes):route.endsWith('/offline-package/content')?response(pkg):normal(route,init));
 await w.download();
}
await check('payload byte SHA256 agrees with server hex for empty/binary/Unicode/large fixtures',async()=>{
 const w=world();await w.login();const api=w.load('src/trip-intelligence.ts');
 for(const bytes of [Buffer.alloc(0),Buffer.from([0,255,128,1]),Buffer.from('الغوص 🌊'),Buffer.alloc(131073,173)]){
  const entry={key:'media:fixture',checksum:hash(bytes),sizeBytes:bytes.length,classification:'OPERATIONAL_OFFLINE'};await approveMedia(w,entry,bytes);
  await api.downloadOfflinePayload('trip-a',entry);assert.equal(await api.verifyStoredOfflinePayload('trip-a',entry),true);
  const file=[...w.files.keys()].find(key=>key.endsWith('/fixture'));w.files.set(file,new Uint8Array([99]));assert.equal(await api.verifyStoredOfflinePayload('trip-a',entry),false);assert.equal(w.files.has(file),false);
 }
});
await check('payload wrong hash/size fail closed; dot segments stay encoded',async()=>{
 const w=world();await w.login();const api=w.load('src/trip-intelligence.ts'),bytes=Buffer.from([1,2,3]);
 const wrongHash={key:'media:fixture',checksum:'wrong',classification:'PUBLIC_CACHE'};await approveMedia(w,wrongHash,bytes);await assert.rejects(()=>api.downloadOfflinePayload('trip-a',wrongHash),/checksum/);
 const wrongSize={key:'media:fixture',checksum:hash(bytes),sizeBytes:4,classification:'PUBLIC_CACHE'};await approveMedia(w,wrongSize,bytes);await assert.rejects(()=>api.downloadOfflinePayload('trip-a',wrongSize),/size/);
 const scope=await w.load('src/session.ts').getSessionScope();assert.ok(w.load('src/offline-content-store.ts').payloadFile('..','..',scope).uri.endsWith('/%2E%2E-payloads/%2E%2E'));
});
await check('sensitive/online/unknown payloads remain fail-closed even if caller lies about classification',async()=>{
 for(const classification of ['SENSITIVE_ENCRYPTED','ONLINE_ONLY','UNKNOWN',undefined]){
  const w=world();await w.login();const bytes=Buffer.from('synthetic private'),entry={key:'media:fixture',checksum:hash(bytes),classification};await approveMedia(w,entry,bytes);
  const scope=await w.load('src/session.ts').getSessionScope(),store=w.load('src/offline-content-store.ts');store.payloadFile('trip-a','fixture',scope).write(bytes);
  const api=w.load('src/trip-intelligence.ts'),forged={...entry,classification:'PUBLIC_CACHE'};await assert.rejects(()=>api.downloadOfflinePayload('trip-a',forged),/not approved/);
  assert.equal(await api.verifyStoredOfflinePayload('trip-a',forged),false);assert.equal(store.loadPayloadBytes('trip-a','fixture',scope),null);assert.equal(w.calls.filter(call=>call.route.includes('/payloads/')).length,0);
 }
 const absent=world();await absent.login();await assert.rejects(()=>absent.load('src/trip-intelligence.ts').downloadOfflinePayload('trip-a',{key:'media:missing',checksum:'x',classification:'PUBLIC_CACHE'}),/Verified offline manifest/);
});
await check('deep-link return is restricted to implemented local routes and handles malformed params',async()=>{
 const safe=w=>world().load('src/navigation.ts').safeReturnTo(w);
 for(const value of ['https://outside.invalid','//outside.invalid','/login','/\\outside.invalid',['/trip-day'],'/trip-day?tripId=%','/trip-day?tripId=x&returnTo=//outside.invalid'])assert.equal(safe(value),'/');assert.equal(safe('/trip-day?tripId=trip-a'),'/trip-day?tripId=trip-a');assert.equal(safe('/trip-day'),'/trip-day');
});
await check('cancelled login never persists or navigates; MFA challenge is not a token session',async()=>{
 const w=world(),gate=deferred();let active=true;w.setHandler((route,init,normal)=>route==='/auth/login'?gate.promise:normal(route,init));const pending=w.load('src/session.ts').login('A','synthetic',()=>active);await w.settle();active=false;gate.resolve(response({accessToken:jwt('A'),refreshToken:'cancelled'}));await assert.rejects(()=>pending,/Session changed/);assert.equal(await w.load('src/session.ts').loadSession(),null);
 const mfa=world();mfa.setHandler((route,init,normal)=>route==='/auth/login'?response({mfaRequired:true,challengeToken:'synthetic'}):normal(route,init));await assert.rejects(()=>mfa.login(),/Additional authentication/);assert.equal(await mfa.load('src/session.ts').loadSession(),null);
});
await check('actual login screen suppresses repeated taps and cancels late persistence on unmount',async()=>{
 const w=world();w.navigate({returnTo:'/trip-day?tripId=trip-a'});w.mount('app/login.tsx');
 const nodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
 const inputs=nodes(w.tree()).filter(node=>node.type==='TextInput');inputs[0].props.onChangeText('A');inputs[1].props.onChangeText('synthetic');w.render();
 const gate=deferred();let writing=false;w.setWriteHook(async()=>{writing=true;await gate.promise});
 const button=nodes(w.tree()).find(node=>node.type==='Pressable');const first=button.props.onPress(),second=button.props.onPress();await w.settle();
 assert.equal(w.calls.filter(call=>call.route==='/auth/login').length,1);assert.equal(writing,true);w.unmount();gate.resolve();await first;await second;
 assert.equal(await w.load('src/session.ts').loadSession(),null);assert.equal(w.secure.has('hydroland.session.v2'),false);assert.equal(w.navigations.length,0);
});
await check('actual login returns to protected trip only after verified session persistence',async()=>{
 const w=world();w.navigate({returnTo:'/trip-day?tripId=trip-a'});w.mount('app/login.tsx');
 const walk=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(walk):[node,...walk(node.props?.children)];
 await walk(w.tree()).find(node=>node.type==='Pressable').props.onPress();assert.equal(w.navigations[0],'/trip-day?tripId=trip-a');assert.equal((await w.load('src/session.ts').getSessionScope()).accountId,'verified-account');
});
await check('freshness stays unknown without trusted expiry and stale when expired',async()=>{
 const m=world().load('src/offline-trip-package.ts');assert.equal(m.freshnessLabel({}), 'UNKNOWN_CACHE');assert.equal(m.freshnessLabel({staleAfter:'invalid'}),'UNKNOWN_CACHE');assert.equal(m.freshnessLabel({staleAfter:'2026-01-01'},Date.parse('2026-02-01')),'STALE_CACHE');assert.equal(m.freshnessLabel({staleAfter:'2026-03-01'},Date.parse('2026-02-01')),'CURRENT_CACHE');
});
console.log(`PASS ${passed} mobile session/offline behavioral groups (synthetic boundaries, no device acceptance claim)`);
