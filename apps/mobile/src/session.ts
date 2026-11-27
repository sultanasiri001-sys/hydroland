import * as SecureStore from 'expo-secure-store';
import {randomUUID} from 'expo-crypto';
import {apiFetch,ApiError} from './api';
import {clearOfflineContent,clearLegacyOfflineContent} from './offline-content-store';
import {clearOfflineSecrets} from './offline-vault';
import {clearOfflineLeases} from './offline-access';

const SESSION='hydroland.session.v2',ACCESS='hydroland.access',REFRESH='hydroland.refresh';
export type Session={accessToken:string;refreshToken:string};
type StoredSession=Session&{accountId?:string;cacheId?:string};
export type SessionScope={accountId:string;cacheId:string;generation:number};
export class SessionChangedError extends Error{constructor(){super('Session changed.')}}
let generation=0,current:StoredSession|null=null,hydrated=false;
let hydration:Promise<void>|null=null,writes:Promise<unknown>=Promise.resolve();
let refreshing:{generation:number;promise:Promise<StoredSession|null>}|null=null;
let identifying:{generation:number;promise:Promise<SessionScope|null>}|null=null;
let pendingMfa:{challengeToken:string;generation:number;expiresAt?:string}|null=null;
let mfaVerification:{challengeToken:string;promise:Promise<StoredSession>}|null=null;
export type LoginResult={kind:'SESSION';session:Session}|{kind:'MFA';challengeToken:string;expiresAt?:string};
export function cancelMfaLogin(){pendingMfa=null}
const listeners=new Set<()=>void>();
const rotationListeners=new Set<(sessionId:string|null)=>void>();
export const sessionGeneration=()=>generation;
export function subscribeSession(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
// Decoded sid is only a correlation fence for session-bound OTP responses.
// It never grants account, trip, role or offline read authority.
function sessionIdOf(token:string|undefined):string|null{try{if(!token)return null;const part=token.split('.')[1];if(!part)return null;const value=JSON.parse(globalThis.atob(part.replace(/-/g,'+').replace(/_/g,'/')));return typeof value.sid==='string'&&value.sid.length>0?value.sid:null}catch{return null}}
export function getCurrentSessionId(){return sessionIdOf(current?.accessToken)}
export function subscribeSessionRotation(listener:(sessionId:string|null)=>void){rotationListeners.add(listener);return()=>{rotationListeners.delete(listener)}}
export function assertSessionGeneration(expected:number){if(expected!==generation)throw new SessionChangedError()}
export function isSessionScopeCurrent(scope:SessionScope){return scope.generation===generation&&scope.accountId===current?.accountId&&scope.cacheId===current?.cacheId}
export function assertSessionScope(scope:SessionScope){if(!isSessionScopeCurrent(scope))throw new SessionChangedError()}
function tokens(value:unknown):value is Session{const s=value as Session|null;return!!s&&typeof s.accessToken==='string'&&!!s.accessToken&&typeof s.refreshToken==='string'&&!!s.refreshToken}
function accessIsUsable(token:string){try{const part=token.split('.')[1];if(!part)return false;const payload=JSON.parse(globalThis.atob(part.replace(/-/g,'+').replace(/_/g,'/')));return typeof payload.exp==='number'&&payload.exp*1000>Date.now()+30000}catch{return false}}
function serialize<T>(operation:()=>Promise<T>):Promise<T>{const result=writes.then(operation);writes=result.catch(()=>{});return result}
export async function loadSession():Promise<StoredSession|null>{
 if(!hydrated){
  if(!hydration){const epoch=generation;hydration=(async()=>{
   const raw=await SecureStore.getItemAsync(SESSION);let saved:StoredSession|null=null;
   if(raw){try{const value=JSON.parse(raw);if(tokens(value))saved=value}catch{}}
   else{const [accessToken,refreshToken]=await Promise.all([SecureStore.getItemAsync(ACCESS),SecureStore.getItemAsync(REFRESH)]);if(accessToken&&refreshToken)saved={accessToken,refreshToken}}
   if(epoch===generation){clearLegacyOfflineContent();current=saved;hydrated=true}
  })().finally(()=>{hydration=null})}
  await hydration;
 }
 return current;
}
async function persistSession(value:StoredSession,epoch:number,isCurrent:()=>boolean=()=>true){
 return serialize(async()=>{
  assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();await SecureStore.setItemAsync(SESSION,JSON.stringify(value));assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();
  current=value;hydrated=true;return value;
 });
}
export async function clearSession(expected=generation){
 if(expected!==generation)return;
 generation++;current=null;hydrated=true;pendingMfa=null;clearOfflineLeases();
 // Invalidate synchronously, before any pending server/storage response can finish.
 for(const listener of listeners){try{listener()}catch{}}
 let cleanupError:unknown;try{clearOfflineContent();clearLegacyOfflineContent()}catch(error){cleanupError=error}
 try{await clearOfflineSecrets()}catch(error){cleanupError=cleanupError??error}
 await serialize(async()=>{await Promise.all([SESSION,ACCESS,REFRESH].map(key=>SecureStore.deleteItemAsync(key)))});
 if(cleanupError)throw cleanupError;
}
async function discardIssuedSession(value:unknown){if(tokens(value)){try{await apiFetch('/auth/logout',{method:'POST',body:JSON.stringify({refreshToken:value.refreshToken})})}catch{}}}
async function identify(value:Session){
 const profile=await apiFetch<{id?:unknown;status?:unknown}>('/me',{},value.accessToken);
 if(typeof profile.id!=='string'||!profile.id||profile.status!=='ACTIVE')throw new Error('Authenticated account identity is unavailable.');
 return profile.id;
}
async function acceptIssuedSession(next:Session,epoch:number,isCurrent:()=>boolean){
 try{assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();const accountId=await identify(next);assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();return await persistSession({accessToken:next.accessToken,refreshToken:next.refreshToken,accountId,cacheId:randomUUID()},epoch,isCurrent)}
 catch(error){try{await clearSession(epoch)}finally{await discardIssuedSession(next)}throw error}
}
export async function startLogin(email:string,password:string,isCurrent:()=>boolean=()=>true):Promise<LoginResult>{
 // The previous account can still own a server session on this installation.
 // Revoke it before a replacement login, including a rotation that finishes during logout.
 const previousEpoch = generation;
 let previous = await loadSession();
 assertSessionGeneration(previousEpoch);
 while (previous) {
   if (!isCurrent()) throw new SessionChangedError();
   await apiFetch('/auth/logout', {method:'POST', body:JSON.stringify({refreshToken:previous.refreshToken})});
   assertSessionGeneration(previousEpoch);
   if (refreshing) await refreshing.promise;
   assertSessionGeneration(previousEpoch);
   if (current?.refreshToken === previous.refreshToken) break;
   previous = current;
 }
 const clearing=clearSession(),epoch=generation;await clearing;assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();
 const next=await apiFetch<Session|{mfaRequired?:boolean;challengeToken?:string;expiresAt?:string}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
 if(tokens(next))return{kind:'SESSION',session:await acceptIssuedSession(next,epoch,isCurrent)};
 assertSessionGeneration(epoch);if(!isCurrent())throw new SessionChangedError();
 if(next?.mfaRequired===true&&typeof next.challengeToken==='string'&&next.challengeToken.length>=32){
  pendingMfa={challengeToken:next.challengeToken,generation:epoch,expiresAt:typeof next.expiresAt==='string'?next.expiresAt:undefined};
  return{kind:'MFA',challengeToken:pendingMfa.challengeToken,expiresAt:pendingMfa.expiresAt};
 }
 throw new Error('Additional authentication is required.');
}
// Preserve the existing password-only API: a challenge is never a session.
export async function login(email:string,password:string,isCurrent:()=>boolean=()=>true){const result=await startLogin(email,password,isCurrent);if(result.kind==='SESSION')return result.session;cancelMfaLogin();throw new Error('Additional authentication is required.')}
export async function completeMfaLogin(challengeToken:string,code:string,isCurrent:()=>boolean=()=>true):Promise<Session>{
 const attempt=pendingMfa;if(!attempt||attempt.challengeToken!==challengeToken||attempt.generation!==generation||!isCurrent())throw new SessionChangedError();
 if(mfaVerification?.challengeToken===challengeToken)return mfaVerification.promise;
 const promise=(async()=>{
  const next=await apiFetch<Session>('/auth/mfa/verify',{method:'POST',body:JSON.stringify({challengeToken,code})});
  if(!tokens(next))throw new Error('Invalid session response.');
  const stillCurrent=()=>pendingMfa===attempt&&isCurrent();
  const saved=await acceptIssuedSession(next,attempt.generation,stillCurrent);
  if(pendingMfa===attempt)pendingMfa=null;return saved;
 })();
 mfaVerification={challengeToken,promise};try{return await promise}finally{if(mfaVerification?.promise===promise)mfaVerification=null}
}
export async function refreshSession():Promise<StoredSession|null>{
 const epoch=generation;
 if(refreshing?.generation===epoch)return refreshing.promise;
 const promise=(async()=>{
  const previous=await loadSession();assertSessionGeneration(epoch);if(!previous)return null;
  let next:Session;
  try{next=await apiFetch<Session>('/auth/refresh',{method:'POST',body:JSON.stringify({refreshToken:previous.refreshToken})})}
  catch(error){if(epoch!==generation)return null;if(error instanceof ApiError&&error.status===401){await clearSession(epoch);return null}throw error}
  if(epoch!==generation){await discardIssuedSession(next);return null}
  if(!tokens(next))throw new Error('Invalid session response.');
  try{const saved=await persistSession({...previous,accessToken:next.accessToken,refreshToken:next.refreshToken},epoch);clearOfflineLeases();if(sessionIdOf(previous.accessToken)!==sessionIdOf(saved.accessToken)){for(const listener of rotationListeners){if(epoch!==generation||current?.accessToken!==saved.accessToken)break;try{listener(getCurrentSessionId())}catch{}}}return saved}catch(error){if(epoch!==generation){await discardIssuedSession(next);return null}throw error}
 })();
 refreshing={generation:epoch,promise};
 try{return await promise}finally{if(refreshing?.promise===promise)refreshing=null}
}
export async function getAccessToken(){const epoch=generation,saved=await loadSession();assertSessionGeneration(epoch);if(!saved)return null;if(accessIsUsable(saved.accessToken))return saved.accessToken;return(await refreshSession())?.accessToken??null}
// For local erasure only. This does not refresh or authorize a private read.
export async function getLocalSessionScope():Promise<SessionScope|null>{const epoch=generation,saved=await loadSession();assertSessionGeneration(epoch);return saved?.accountId&&saved.cacheId?{accountId:saved.accountId,cacheId:saved.cacheId,generation:epoch}:null}
export async function getSessionScope():Promise<SessionScope|null>{
 const epoch=generation,token=await getAccessToken();assertSessionGeneration(epoch);if(!token)return null;
 const saved=await loadSession();assertSessionGeneration(epoch);if(!saved)return null;
 if(saved.accountId&&saved.cacheId)return{accountId:saved.accountId,cacheId:saved.cacheId,generation:epoch};
 if(identifying?.generation===epoch)return identifying.promise;
 const promise=(async()=>{
  // Legacy tokens have no trusted owner. A decoded JWT is never cache authority.
  clearLegacyOfflineContent();assertSessionGeneration(epoch);
  try{
   const accountId=await identify({accessToken:token,refreshToken:saved.refreshToken});assertSessionGeneration(epoch);
   const latest=await loadSession();assertSessionGeneration(epoch);if(!latest)return null;
   const verified=await persistSession({...latest,accountId,cacheId:randomUUID()},epoch);
   return{accountId:verified.accountId!,cacheId:verified.cacheId!,generation:epoch};
  }catch(error){if(error instanceof ApiError&&error.status===401)await clearSession(epoch);throw error}
 })();
 identifying={generation:epoch,promise};try{return await promise}finally{if(identifying?.promise===promise)identifying=null}
}
export async function logout(){const epoch=generation,saved=await loadSession();assertSessionGeneration(epoch);try{await clearSession(epoch)}finally{if(saved)await apiFetch('/auth/logout',{method:'POST',body:JSON.stringify({refreshToken:saved.refreshToken})})}}
