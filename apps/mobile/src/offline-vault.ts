import * as SecureStore from 'expo-secure-store';
import {AESEncryptionKey,AESKeySize,AESSealedData,aesEncryptAsync,aesDecryptAsync} from 'expo-crypto';
import {assertSessionScope,isSessionScopeCurrent,SessionChangedError,type SessionScope} from './session';
import {OfflineAccessError} from './offline-errors';
import {clearOfflineLeases} from './offline-access';
const KEY='hydroland.offline.key.v3';
const OPTIONS={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export const MAX_OFFLINE_BYTES=8*1024*1024;
let keyWrites:Promise<unknown>=Promise.resolve(),epoch=0;
function serialize<T>(work:()=>Promise<T>){const result=keyWrites.then(work);keyWrites=result.catch(()=>{});return result}
const unavailable=()=>new OfflineAccessError('OFFLINE_ENCRYPTION_UNAVAILABLE','Secure offline storage is unavailable.');
const corrupt=()=>new OfflineAccessError('OFFLINE_CACHE_CORRUPT','Encrypted offline content could not be authenticated.');
function invalidate(scope:SessionScope){if(isSessionScopeCurrent(scope))clearOfflineLeases()}
function check(scope:SessionScope,expected:number){assertSessionScope(scope);if(epoch!==expected)throw new SessionChangedError()}
async function nativeKey(scope:SessionScope,create:boolean){
 const expected=epoch;return serialize(async()=>{
  check(scope,expected);
  if(typeof AESEncryptionKey?.generate!=='function'||typeof aesEncryptAsync!=='function'||typeof aesDecryptAsync!=='function'||!await SecureStore.isAvailableAsync())throw unavailable();
  check(scope,expected);const saved=await SecureStore.getItemAsync(KEY,OPTIONS);check(scope,expected);
  if(saved){let data;try{data=JSON.parse(saved)}catch{throw unavailable()}
   if(data.accountId!==scope.accountId||data.cacheId!==scope.cacheId||typeof data.key!=='string'||!/^[a-f0-9]{64}$/i.test(data.key))throw unavailable();
   const key=await AESEncryptionKey.import(data.key,'hex');check(scope,expected);return key;
  }
  if(!create)throw unavailable();
  const key=await AESEncryptionKey.generate(AESKeySize.AES256);check(scope,expected);
  const encoded=await key.encoded('hex');check(scope,expected);if(key.size!==256||!/^[a-f0-9]{64}$/i.test(encoded))throw unavailable();
  const value=JSON.stringify({version:1,accountId:scope.accountId,cacheId:scope.cacheId,key:encoded});
  await SecureStore.setItemAsync(KEY,value,OPTIONS);check(scope,expected);
  if(await SecureStore.getItemAsync(KEY,OPTIONS)!==value)throw unavailable();check(scope,expected);return key;
 });
}
export function clearOfflineSecrets(){epoch++;return serialize(()=>SecureStore.deleteItemAsync(KEY,OPTIONS))}
function aad(scope:SessionScope,purpose:string){return new TextEncoder().encode(JSON.stringify({version:3,accountId:scope.accountId,cacheId:scope.cacheId,purpose}))}
export async function ensureOfflineEncryption(scope:SessionScope){
 const expected=epoch;try{const key=await nativeKey(scope,true),plain=new Uint8Array([72,76,3]);check(scope,expected);
  const sealed=await aesEncryptAsync(plain,key,{additionalData:aad(scope,'capability'),nonce:{length:12},tagLength:16});check(scope,expected);
  const opened=await aesDecryptAsync(sealed,key,{additionalData:aad(scope,'capability')});check(scope,expected);
  if(opened.length!==plain.length||opened.some((value,index)=>value!==plain[index]))throw unavailable();
 }catch(error){invalidate(scope);if(error instanceof SessionChangedError||error instanceof OfflineAccessError)throw error;throw unavailable()}
}
export async function sealOfflineBytes(bytes:Uint8Array,scope:SessionScope,purpose:string){
 const expected=epoch;
 try{if(bytes.byteLength>MAX_OFFLINE_BYTES)throw unavailable();const key=await nativeKey(scope,true);check(scope,expected);
  const sealed=await aesEncryptAsync(bytes,key,{nonce:{length:12},tagLength:16,additionalData:aad(scope,purpose)});check(scope,expected);
  const ciphertext=await sealed.combined('base64');check(scope,expected);
  return JSON.stringify({version:3,algorithm:'AES-256-GCM',ciphertext});
 }catch(error){invalidate(scope);if(error instanceof SessionChangedError||error instanceof OfflineAccessError)throw error;throw unavailable()}
}
export async function openOfflineBytes(envelope:string,scope:SessionScope,purpose:string){
 const expected=epoch;let key:AESEncryptionKey;
 try{key=await nativeKey(scope,false);check(scope,expected)}catch(error){invalidate(scope);if(error instanceof SessionChangedError||error instanceof OfflineAccessError)throw error;throw unavailable()}
 try{
  if(envelope.length>MAX_OFFLINE_BYTES*2+1024)throw corrupt();const parsed=JSON.parse(envelope);
  if(parsed?.version!==3||parsed.algorithm!=='AES-256-GCM'||typeof parsed.ciphertext!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(parsed.ciphertext))throw corrupt();
  const bytes=await aesDecryptAsync(AESSealedData.fromCombined(parsed.ciphertext,{ivLength:12,tagLength:16}),key,{additionalData:aad(scope,purpose)});check(scope,expected);
  if(bytes.length>MAX_OFFLINE_BYTES)throw corrupt();return bytes;
 }catch(error){invalidate(scope);if(error instanceof SessionChangedError||error instanceof OfflineAccessError)throw error;throw corrupt()}
}
