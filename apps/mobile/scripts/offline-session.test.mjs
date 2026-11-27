import assert from 'node:assert/strict';
import {world,packageFor,stable,hash,jwt,deferred,response,text,leaseFor} from './offline-test-world.mjs';
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS',name)}
await check('native enrollment uses the signed-in session after permission and does not submit a stale device response', async () => {
 const sequence=[];
 const native={AndroidImportance:{DEFAULT:3},setNotificationChannelAsync:async()=>{sequence.push('channel')},
   getPermissionsAsync:async()=>({granted:false,canAskAgain:true}),requestPermissionsAsync:async()=>{sequence.push('permission');return {granted:true}},
   getExpoPushTokenAsync:async({projectId})=>{assert.equal(projectId,'synthetic-project');sequence.push('token');return {data:'ExpoPushToken[fixture]'}}};
 const w=world(native),register=w.load('src/register-push.ts').registerDevicePush;
 assert.equal(await register(),'guest');assert.deepEqual(sequence,[]);
 await w.login();const session=w.load('src/session.ts'),saved=await session.loadSession();
 w.setHandler((route,init,normal)=>{
   if(route!=='/notifications/device/register')return normal(route,init);
   assert.equal(init.headers.get('Authorization'),'Bearer '+saved.accessToken);
   assert.deepEqual(JSON.parse(init.body),{token:'ExpoPushToken[fixture]'});sequence.push('register');return response({registered:true});
 });
 assert.equal(await register(),'enabled');assert.deepEqual(sequence,['channel','permission','token','register']);
 const gate=deferred();native.getExpoPushTokenAsync=()=>gate.promise;
 const late=register();await w.settle();await w.login('B');
 gate.resolve({data:'ExpoPushToken[stale]'});await assert.rejects(()=>late,/Session changed/);
 assert.equal(w.calls.filter(call=>call.route==='/notifications/device/register').length,1);
});
await check('denied native permission does not request or register a token',async()=>{
 const w=world({AndroidImportance:{DEFAULT:3},setNotificationChannelAsync:async()=>{},
   getPermissionsAsync:async()=>({granted:false,canAskAgain:false})});
 await w.login();assert.equal(await w.load('src/register-push.ts').registerDevicePush(),'denied');
 assert.equal(w.calls.filter(call=>call.route==='/notifications/device/register').length,0);
});
await check('protected /me, not unverified JWT sub, supplies cache namespace',async()=>{
 const w=world();await w.login();const scope=await w.load('src/session.ts').getSessionScope();assert.equal(scope.accountId,'verified-account');assert.notEqual(scope.accountId,'untrusted-decoded-subject');await w.download();assert.ok([...w.files.keys()].every(key=>key.includes('/verified-account/')));
});
await check('unverified legacy identity cannot read cache or trust decoded subject while offline',async()=>{
 const w=world();w.secure.set('hydroland.access',jwt('victim'));w.secure.set('hydroland.refresh','legacy');w.dirs.add('/sandbox/hydroland/trip-packages');w.files.set('/sandbox/hydroland/trip-packages/trip-a.json','private');w.setHandler(async()=>{throw new TypeError('offline')});await assert.rejects(()=>w.load('src/session.ts').getSessionScope(),/offline/);assert.equal(w.files.size,0);assert.equal((await w.load('src/session.ts').loadSession()).refreshToken,'legacy');
});
await check('logout removes file/metadata cache and invalidates previous account scope',async()=>{
 const w=world();await w.login();await w.download();const s=w.load('src/session.ts'),scope=await s.getSessionScope();await s.logout();assert.equal(await s.loadSession(),null);assert.equal(w.files.size,0);await assert.rejects(()=>w.load('src/offline-content-store.ts').loadOfflineContent('trip-a',scope),/Session changed/);w.setHandler((route,init,normal)=>route==='/me'?response({id:'verified-account-B',status:'ACTIVE'}):normal(route,init));await w.login('B');assert.equal(await w.load('src/offline-trip-package.ts').loadTripPackage('trip-a'),null);assert.equal((await s.getSessionScope()).accountId,'verified-account-B');assert.notEqual((await s.getSessionScope()).cacheId,scope.cacheId);
});
await check('account switch revokes the prior server session before issuing the new one', async () => {
 const w=world(); await w.login('A');
 const revoke=deferred(); w.setHandler((route,init,normal)=>route==='/auth/logout'?revoke.promise:normal(route,init));
 const replacement=w.login('B'); await w.settle();
 assert.equal(w.calls.filter(call=>call.route==='/auth/login').length,1);
 assert.equal(JSON.parse(w.calls.find(call=>call.route==='/auth/logout').init.body).refreshToken,'refresh-A');
 revoke.resolve(response(null,204)); await replacement;
 assert.equal((await w.load('src/session.ts').loadSession()).refreshToken,'refresh-B');
});
await check('failed remote revocation keeps the old session available for a retry', async () => {
 const w=world(); await w.login('A');
 w.setHandler((route,init,normal)=>route==='/auth/logout'?response({},503):normal(route,init));
 await assert.rejects(()=>w.login('B'));
 assert.equal(w.calls.filter(call=>call.route==='/auth/login').length,1);
 assert.equal((await w.load('src/session.ts').loadSession()).refreshToken,'refresh-A');
 w.setHandler(null); await w.login('B');
 assert.equal((await w.load('src/session.ts').loadSession()).refreshToken,'refresh-B');
});
await check('a rotation racing with account switch is revoked before the new login',async()=>{
 const w=world(); await w.login('A'); const s=w.load('src/session.ts'),rotate=deferred(),revoke=deferred();
 w.setHandler((route,init,normal)=>{
   if(route==='/auth/refresh')return rotate.promise;
   if(route==='/auth/logout' && JSON.parse(init.body).refreshToken==='refresh-A')return revoke.promise;
   return normal(route,init);
 });
 const rotation=s.refreshSession(); await w.settle();
 const change=w.login('B'); await w.settle();
 rotate.resolve(response({accessToken:jwt('A'),refreshToken:'rotated-A'})); await rotation;
 revoke.resolve(response(null,204)); await change;
 assert.deepEqual(w.calls.filter(call=>call.route==='/auth/logout').map(call=>JSON.parse(call.init.body).refreshToken),['refresh-A','rotated-A']);
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
 const w=world();await w.login();await w.download();const file=[...w.files.keys()].find(key=>key.endsWith('/trip-a.json'));const store=w.load('src/offline-content-store.ts'),scope=await w.load('src/session.ts').getSessionScope(),value=await store.loadOfflineContent('trip-a',scope);value.manifest.tampered=true;await store.saveOfflineContent(value,scope);w.mount();await w.settle();assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.equal(await w.load('src/offline-trip-package.ts').loadTripPackage('trip-a'),null);
});
await check('trip route change hides prior matched state immediately and fences delayed work',async()=>{
 const w=world();await w.login();await w.download();w.mount();await w.settle();assert.ok(text(w.tree()).includes('الحزمة المحلية مطابقة'));const gate=deferred();w.setHandler((route,init,normal)=>route.includes('trip-b')?gate.promise:normal(route,init));assert.ok(!text(w.navigate({tripId:'trip-b'})).includes('الحزمة المحلية مطابقة'));await w.settle();w.navigate({tripId:'trip-c'});await w.settle();gate.resolve(response({...packageFor('trip-b'),status:'READY'}));await w.settle();assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));
});
await check('delayed TripDay metadata cannot start an old trip request under a replacement session',async()=>{
 const w=world();await w.login();await w.download();w.disableInitialFocus();const meta=w.load('src/offline-trip-package.ts'),original=meta.loadTripPackage,gate=deferred();let reads=0;
 meta.loadTripPackage=async(...args)=>{const result=await original(...args);if(++reads===2)await gate.promise;return result};
 w.mount();await w.settle();assert.equal(reads,2);await w.login('B');await w.settle();
 const before=w.calls.filter(call=>call.route.endsWith('/status')).length;gate.resolve();await w.settle();assert.equal(w.calls.filter(call=>call.route.endsWith('/status')).length,before);
});
await check('package download checks scope again after the await that returns it, before any request',async()=>{
 const w=world();await w.login();const session=w.load('src/session.ts'),original=session.assertSessionScope,api=w.load('src/api.ts'),authorize=api.authorizedFetch;let starts=0,scheduled=false;
 api.authorizedFetch=(...args)=>{starts++;return authorize(...args)};
 session.assertSessionScope=scope=>{original(scope);if(!scheduled){scheduled=true;queueMicrotask(()=>{void session.clearSession()})}};
 await assert.rejects(()=>w.download(),/Session changed/);assert.equal(starts,0);
});
await check('transient offline status retains verified cache; app resume rechecks and clears old error',async()=>{
 const w=world();await w.login();await w.download();w.setHandler(async(route,init,normal)=>{if(route.includes('/mobile-offline/'))throw new TypeError('offline');return normal(route,init)});w.mount();await w.settle();assert.ok(text(w.tree()).includes('تعذر التحقق'));assert.ok(w.files.size);w.setHandler(null);w.resume();await w.settle();assert.ok(text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.ok(!text(w.tree()).includes('تعذر التحقق من حالة الحزمة'));
});
await check('revoked session clears mounted TripDay and redirects; trip 403 removes private cache',async()=>{
 const w=world();await w.login();await w.download();w.mount();await w.settle();w.setHandler((route,init,normal)=>route.includes('/mobile-offline/')||route==='/auth/refresh'?response({},401):normal(route,init));w.resume();await w.settle();assert.equal(w.files.size,0);assert.ok(!text(w.tree()).includes('الحزمة المحلية مطابقة'));assert.ok(w.navigations.some(x=>x.pathname==='/login'));
 const denied=world();await denied.login();await denied.download();const deniedScope=await denied.load('src/session.ts').getSessionScope();await denied.load('src/offline-content-store.ts').savePayloadBytes('trip-a','private',new Uint8Array([7]),deniedScope);denied.setHandler((route,init,normal)=>route.includes('/mobile-offline/')?response({},403):normal(route,init));denied.mount();await denied.settle();assert.equal(denied.files.size,0);assert.ok(text(denied.tree()).includes('لم يعد الوصول'));assert.ok(await denied.load('src/session.ts').loadSession());
});
await check('download interrupted during hashing cannot write cache after logout',async()=>{
 const w=world();await w.login();const gate=deferred();w.setDigestHook(()=>gate.promise);const pending=w.download();await w.settle();await w.load('src/session.ts').logout();gate.resolve();await assert.rejects(()=>pending,/Session changed/);assert.equal(w.files.size,0);
});
async function approveMedia(w,entry,bytes){
 const pkg=packageFor('trip-a');pkg.manifest.files.push(JSON.parse(JSON.stringify(entry)));pkg.checksum=hash(stable(pkg.manifest));pkg.accessLease=leaseFor('trip-a','PACKAGE','trip-a',pkg.checksum);
 w.setHandler((route,init,normal)=>route.startsWith('https://synthetic.r2.cloudflarestorage.com/')?new Response(bytes,{headers:{'content-length':String(bytes.length)}}):route.includes('/payloads/')?response({provider:'CLOUDFLARE_R2',url:'https://synthetic.r2.cloudflarestorage.com/private',expiresAt:new Date(Date.now()+60000).toISOString(),checksum:entry.checksum,sizeBytes:entry.sizeBytes}):route.endsWith('/package')?response(pkg):normal(route,init));await w.download();
}
await check('payload byte SHA256 agrees with server hex and encrypted tampering fails closed',async()=>{
 const w=world();await w.login();const api=w.load('src/trip-intelligence.ts');
 for(const bytes of [Buffer.alloc(0),Buffer.from([0,255,128,1]),Buffer.from('الغوص 🌊'),Buffer.alloc(131073,173)]){
  const entry={key:'media:fixture',checksum:hash(bytes),sizeBytes:bytes.length,classification:'OPERATIONAL_OFFLINE'};await approveMedia(w,entry,bytes);
  await api.downloadOfflinePayload('trip-a',entry);assert.equal(await api.verifyStoredOfflinePayload('trip-a',entry),true);
  const file=[...w.files.keys()].find(key=>key.endsWith('/fixture')),envelope=JSON.parse(w.files.get(file)),corrupt=Buffer.from(envelope.ciphertext,'base64');corrupt[15]^=1;envelope.ciphertext=corrupt.toString('base64');w.files.set(file,JSON.stringify(envelope));await assert.rejects(()=>api.verifyStoredOfflinePayload('trip-a',entry),error=>error.code==='OFFLINE_CACHE_CORRUPT');assert.equal(w.files.has(file),false);
 }
 const delivery=w.calls.find(call=>call.route.startsWith('https://'));assert.equal(new Headers(delivery.init.headers).has('Authorization'),false);assert.equal(delivery.init.credentials,'omit');assert.equal(delivery.init.redirect,'error');
});
await check('payload wrong hash/size fail closed; dot segments stay encoded',async()=>{
 const w=world();await w.login();const api=w.load('src/trip-intelligence.ts'),bytes=Buffer.from([1,2,3]);
 const wrongHash={key:'media:fixture',checksum:'a'.repeat(64),sizeBytes:3,classification:'PUBLIC_CACHE'};await approveMedia(w,wrongHash,bytes);await assert.rejects(()=>api.downloadOfflinePayload('trip-a',wrongHash),/checksum/);
 const wrongSize={key:'media:fixture',checksum:hash(bytes),sizeBytes:4,classification:'PUBLIC_CACHE'};await approveMedia(w,wrongSize,bytes);await assert.rejects(()=>api.downloadOfflinePayload('trip-a',wrongSize),/size/);
 const scope=await w.load('src/session.ts').getSessionScope(),lease=w.load('src/offline-access.ts');lease.acceptOfflineLease(leaseFor('..','PACKAGE','..','b'.repeat(64)),scope,lease.offlineClock());await w.load('src/offline-content-store.ts').savePayloadBytes('..','..',bytes,scope);assert.ok([...w.files.keys()].some(uri=>uri.endsWith('/%2E%2E-payloads/%2E%2E')));
});
await check('sensitive payloads require encryption; online/unknown remain excluded even if caller lies',async()=>{
 for(const classification of ['SENSITIVE_ENCRYPTED','ONLINE_ONLY','UNKNOWN',undefined]){
  const w=world();await w.login();const bytes=Buffer.from('synthetic private'),entry={key:'media:fixture',checksum:hash(bytes),sizeBytes:bytes.length,classification};await approveMedia(w,entry,bytes);
  const scope=await w.load('src/session.ts').getSessionScope(),store=w.load('src/offline-content-store.ts'),api=w.load('src/trip-intelligence.ts'),forged={...entry,classification:'PUBLIC_CACHE'};
  if(classification==='SENSITIVE_ENCRYPTED'){await api.downloadOfflinePayload('trip-a',forged);assert.equal(await api.verifyStoredOfflinePayload('trip-a',forged),true);assert.ok([...w.files.values()].every(value=>!String(value).includes('synthetic private')));continue}
  await store.savePayloadBytes('trip-a','fixture',bytes,scope);await assert.rejects(()=>api.downloadOfflinePayload('trip-a',forged),/not approved/);await assert.rejects(()=>api.verifyStoredOfflinePayload('trip-a',forged),/not approved/);assert.equal(await store.loadPayloadBytes('trip-a','fixture',scope),null);assert.equal(w.calls.filter(call=>call.route.includes('/payloads/')).length,0);
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
// Login UI duplicate-tap, persistence/unmount and protected-return assertions
// run with real React in product-ui.test.mjs (D05), not synthetic hooks.
await check('freshness stays unknown without trusted expiry and stale when expired',async()=>{
 const m=world().load('src/offline-trip-package.ts');assert.equal(m.freshnessLabel({}), 'UNKNOWN_CACHE');assert.equal(m.freshnessLabel({staleAfter:'invalid'}),'UNKNOWN_CACHE');assert.equal(m.freshnessLabel({staleAfter:'2026-01-01'},Date.parse('2026-02-01')),'STALE_CACHE');assert.equal(m.freshnessLabel({staleAfter:'2026-03-01'},Date.parse('2026-02-01')),'UNKNOWN_CACHE');
});
console.log(`PASS ${passed} mobile session/offline behavioral groups (synthetic boundaries, no device acceptance claim)`);
