import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import ts from 'typescript';
// Runs real app source against deterministic device/HTTP boundaries. AES below
// is Node's GCM adapter, not evidence that Expo's native implementation ran.
const root=fileURLToPath(new URL('../',import.meta.url));
export const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const jwt=(subject,expired=false)=>`e30.${Buffer.from(JSON.stringify({sub:subject,exp:Math.floor(Date.now()/1000)+(expired?-60:3600)})).toString('base64url')}.synthetic`;
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
export const response=(value,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
export const leaseFor=(tripId,kind,id,revision,accountId='verified-account',now=Date.now(),duration=900000)=>({version:1,accountId,sessionId:'synthetic-session',tripId,resourceKind:kind,resourceId:id,sourceRevision:revision,issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+duration).toISOString(),token:'synthetic-authenticated-boundary-token'});
export const packageFor=(tripId,accountId='verified-account',now=Date.now())=>{const briefing={title:'Synthetic private briefing',summary:{notes:'Synthetic notes'}},manifest={schemaVersion:1,tripId,briefingVersion:1,files:[{key:'briefing',checksum:hash(stable(briefing))}],generatedAt:'2026-10-26T00:00:00Z'},checksum=hash(stable(manifest));return{tripId,briefingVersion:1,briefing,manifest,checksum,generatedAt:manifest.generatedAt,accessLease:leaseFor(tripId,'PACKAGE',tripId,checksum,accountId,now)}};
export const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):node&&typeof node==='object'?text(node.props?.children):'';
export const nodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
export function world(notifications={}){
 const secure=new Map(),files=new Map(),dirs=new Set(),modules=new Map(),calls=[],navigations=[],appListeners=new Set(),timers=new Set();
 let initialFocus=true,handler=null,writeHook=null,digestHook=null,cryptoHook=null,params={tripId:'trip-a'},component=null,tree=null,dirty=false,cursor=0,wall=Date.now(),mono=1000,timeoutOverride=null;
 const states=[],hooks=[],pending=[];
 const secureStore={WHEN_UNLOCKED_THIS_DEVICE_ONLY:'native-test-only',isAvailableAsync:async()=>true,getItemAsync:async key=>secure.get(key)??null,setItemAsync:async(key,value)=>{if(writeHook)await writeHook(key,value);secure.set(key,value)},deleteItemAsync:async key=>secure.delete(key)};
 class Directory{constructor(...items){this.uri=items.map(item=>item.uri??item).join('/')}get exists(){return dirs.has(this.uri)}create(){let current='';for(const part of this.uri.split('/')){current+='/'+part;if(part)dirs.add(current.replace(/^\/\//,'/'))}dirs.add(this.uri)}delete(){for(const key of files.keys())if(key.startsWith(this.uri+'/'))files.delete(key);for(const key of dirs)if(key===this.uri||key.startsWith(this.uri+'/'))dirs.delete(key)}}
 class File{constructor(...items){this.uri=items.map(item=>item.uri??item).join('/')}get exists(){return files.has(this.uri)}get size(){const value=files.get(this.uri);return typeof value==='string'?Buffer.byteLength(value):value?.length??0}write(value){files.set(this.uri,typeof value==='string'?value:new Uint8Array(value))}textSync(){return files.get(this.uri)}bytesSync(){return new Uint8Array(files.get(this.uri))}delete(){files.delete(this.uri)}}
 class Key{constructor(bytes){this.bytes=Buffer.from(bytes);this.size=this.bytes.length*8}static async generate(){return new Key(randomBytes(32))}static async import(value,encoding){return new Key(Buffer.from(value,encoding))}async encoded(encoding){return this.bytes.toString(encoding)}}
 class Sealed{constructor(bytes){this.bytes=Buffer.from(bytes)}static fromCombined(value){return new Sealed(typeof value==='string'?Buffer.from(value,'base64'):value)}async combined(encoding){return encoding?this.bytes.toString(encoding):new Uint8Array(this.bytes)}}
 const crypto={randomUUID,AESEncryptionKey:Key,AESKeySize:{AES256:256},AESSealedData:Sealed,CryptoDigestAlgorithm:{SHA256:'SHA-256'},
  aesEncryptAsync:async(bytes,key,options)=>{if(cryptoHook)await cryptoHook('encrypt',bytes);const iv=randomBytes(options.nonce.length),cipher=createCipheriv('aes-256-gcm',key.bytes,iv);cipher.setAAD(Buffer.from(options.additionalData));return new Sealed(Buffer.concat([iv,cipher.update(bytes),cipher.final(),cipher.getAuthTag()]))},
  aesDecryptAsync:async(sealed,key,options)=>{if(cryptoHook)await cryptoHook('decrypt',sealed.bytes);const combined=sealed.bytes,decipher=createDecipheriv('aes-256-gcm',key.bytes,combined.subarray(0,12));decipher.setAAD(Buffer.from(options.additionalData));decipher.setAuthTag(combined.subarray(-16));return new Uint8Array(Buffer.concat([decipher.update(combined.subarray(12,-16)),decipher.final()]))},
  digestStringAsync:async(_,value,options)=>{if(digestHook)await digestHook();return createHash('sha256').update(value).digest(options?.encoding??'hex')},digest:async(_,value)=>{if(digestHook)await digestHook();const bytes=createHash('sha256').update(new Uint8Array(value)).digest();return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const effect=(fn,deps)=>{const index=cursor++;if(!same(hooks[index]?.deps,deps)){pending.push(()=>{hooks[index]?.cleanup?.();hooks[index]={deps,cleanup:fn()}})}};
 const react={useState:initial=>{const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return[states[index],value=>{const next=typeof value==='function'?value(states[index]):value;if(!Object.is(next,states[index])){states[index]=next;dirty=true}}]},useRef:initial=>{const index=cursor++;if(!(index in states))states[index]={current:initial};return states[index]},useCallback:(fn,deps)=>{const index=cursor++;if(!same(hooks[index]?.deps,deps))hooks[index]={deps,fn};return hooks[index].fn},useEffect:effect};
 function owner(){try{return JSON.parse(secure.get('hydroland.session.v2')).accountId??'verified-account'}catch{return'verified-account'}}
 const defaultHandler=async(route,init)=>{
  if(route==='/auth/login'){const account=JSON.parse(init.body).email;return response({accessToken:jwt('untrusted-decoded-subject'),refreshToken:'refresh-'+account})}
  if(route==='/me')return response({id:'verified-account',status:'ACTIVE'});
  if(route==='/auth/logout')return response(null,204);
  if(route==='/auth/refresh')return response({accessToken:jwt('refreshed'),refreshToken:'rotated-refresh'});
  const match=route.match(/^\/mobile-offline\/trips\/([^/]+)\/(status|package|drafts)$/);
  if(match){const tripId=decodeURIComponent(match[1]),value=packageFor(tripId,owner(),wall);if(match[2]==='drafts')return response({tripId,items:[],accessLease:leaseFor(tripId,'DRAFTS',tripId,hash('[]'),owner(),wall)});return response(match[2]==='package'?value:{...value,status:'READY'})}
  throw new Error('Unexpected synthetic route '+route);
 };
 const jsx=(type,props)=>typeof type==='function'?type(props):({type,props});
 const native={'expo-constants':{__esModule:true,default:{expoConfig:{extra:{eas:{projectId:'synthetic-project'}}}}},'expo-notifications':notifications,'expo-secure-store':secureStore,'expo-file-system':{Directory,File,Paths:{document:'/sandbox'}},'expo-crypto':crypto,react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},'expo-router':{useLocalSearchParams:()=>params,router:{replace:value=>navigations.push(value)},useFocusEffect:fn=>effect(()=>initialFocus?fn():undefined,[fn])},'react-native':{Platform:{OS:'android'},SafeAreaView:'SafeAreaView',ScrollView:'ScrollView',Text:'Text',View:'View',Pressable:'Pressable',TextInput:'TextInput',StyleSheet:{create:value=>value},AppState:{addEventListener:(_,fn)=>{appListeners.add(fn);return{remove:()=>appListeners.delete(fn)}}}}};
 const ClockDate=class extends Date{constructor(...args){super(...(args.length?args:[wall]))}static now(){return wall}};
 const localGlobal={atob,performance:{now:()=>++mono}};
 function load(rel){const file=path.resolve(root,rel);if(modules.has(file))return modules.get(file).exports;const mod={exports:{}};modules.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const require=name=>{if(native[name])return native[name];if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx')}throw new Error(name)};
  const fetch=async(url,init={})=>{const parsed=new URL(url),route=parsed.hostname.endsWith('.r2.cloudflarestorage.com')?url:parsed.pathname.replace('/api/v1','');calls.push({route,init});return handler?handler(route,init,defaultHandler):defaultHandler(route,init)};
  vm.runInNewContext(`(function(exports,require,module){${code}\n})`,{console,globalThis:localGlobal,Date:ClockDate,Headers,URL,AbortController,TextEncoder,TextDecoder,fetch,Uint8Array,ArrayBuffer,process:{env:{}},setTimeout:(fn,ms)=>setTimeout(fn,timeoutOverride??ms),clearTimeout,setInterval:fn=>{timers.add(fn);return fn},clearInterval:fn=>timers.delete(fn)})(mod.exports,require,mod);return mod.exports;
 }
 function render(){if(!component)return null;dirty=false;cursor=0;tree=component();const work=pending.splice(0);work.forEach(fn=>fn());return tree}
 async function settle(){for(let i=0;i<30;i++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render()}return tree}
 return{secure,secureStore,crypto,files,dirs,calls,navigations,load,defaultHandler,setHandler:value=>handler=value,setWriteHook:value=>writeHook=value,setDigestHook:value=>digestHook=value,setCryptoHook:value=>cryptoHook=value,setTimeoutOverride:value=>timeoutOverride=value,clock:()=>({wall,mono}),advance:(ms,wallMs=ms)=>{mono+=ms;wall+=wallMs;for(const timer of timers)timer()},resetAnchors:()=>{modules.delete(path.resolve(root,'src/offline-access.ts'))},disableInitialFocus:()=>{initialFocus=false},mount:(rel='app/trip-day.tsx')=>{component=load(rel).default;return render()},render,settle,tree:()=>tree,navigate:value=>{params=value;return render()},resume:()=>{for(const fn of appListeners)fn('active')},background:()=>{for(const fn of appListeners)fn('background')},unmount:()=>{for(const hook of hooks)hook?.cleanup?.();component=null},login:async(account='A')=>load('src/session.ts').login(account,'synthetic-password'),download:async(trip='trip-a')=>load('src/trip-intelligence.ts').downloadOfflinePackage(trip)};
}
