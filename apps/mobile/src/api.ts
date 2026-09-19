export const API_BASE_URL=process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'')??'http://localhost:3001/api/v1';
export class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
export async function apiFetch<T>(path:string,init:RequestInit={},accessToken?:string):Promise<T>{
 const headers=new Headers(init.headers);headers.set('Accept','application/json');if(init.body)headers.set('Content-Type','application/json');if(accessToken)headers.set('Authorization',`Bearer ${accessToken}`);
 const response=await fetch(API_BASE_URL+path,{...init,headers});if(!response.ok)throw new ApiError(response.status,await response.text()||'Request failed');
 if(response.status===204)return undefined as T;return response.json() as Promise<T>;
}