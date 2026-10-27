import {sessionGeneration} from './session';
export const API_BASE_URL=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'')??'http://localhost:3001/api/v1';
export class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
export async function apiFetch<T>(path:string,init:RequestInit={},accessToken?:string):Promise<T>{
 const headers=new Headers(init.headers);headers.set('Accept','application/json');if(init.body)headers.set('Content-Type','application/json');if(accessToken)headers.set('Authorization',`Bearer ${accessToken}`);
 const response=await fetch(API_BASE_URL+path,{...init,headers});if(!response.ok)throw new ApiError(response.status,await response.text()||'Request failed');
 if(response.status===204)return undefined as T;return response.json() as Promise<T>;
}
async function authorized<T>(request:(token:string)=>Promise<T>):Promise<T>{
 const epoch=sessionGeneration();
 const {getAccessToken,refreshSession,assertSessionGeneration,clearSession}=await import('./session');
 assertSessionGeneration(epoch);const token=await getAccessToken();assertSessionGeneration(epoch);if(!token)throw new ApiError(401,'Authentication required');
 try{const result=await request(token);assertSessionGeneration(epoch);return result}catch(error){
  assertSessionGeneration(epoch);if(!(error instanceof ApiError)||error.status!==401)throw error;
  const refreshed=await refreshSession();if(!refreshed)throw error;assertSessionGeneration(epoch);
  try{const result=await request(refreshed.accessToken);assertSessionGeneration(epoch);return result}catch(retryError){assertSessionGeneration(epoch);if(retryError instanceof ApiError&&retryError.status===401)await clearSession(epoch);throw retryError}
 }
}
export function authorizedFetch<T>(path:string,init:RequestInit={}):Promise<T>{return authorized(token=>apiFetch<T>(path,init,token))}
export function authorizedBinaryFetch(path:string):Promise<ArrayBuffer>{return authorized(async token=>{
 const headers=new Headers();headers.set('Accept','application/octet-stream');headers.set('Authorization',`Bearer ${token}`);
 const response=await fetch(API_BASE_URL+path,{headers});if(!response.ok)throw new ApiError(response.status,await response.text()||'Request failed');return response.arrayBuffer();
})}
