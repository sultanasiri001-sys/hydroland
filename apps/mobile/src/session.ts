import * as SecureStore from 'expo-secure-store';import {apiFetch} from './api';
const ACCESS='hydroland.access',REFRESH='hydroland.refresh';export type Session={accessToken:string;refreshToken:string};
export async function saveSession(s:Session){await Promise.all([SecureStore.setItemAsync(ACCESS,s.accessToken),SecureStore.setItemAsync(REFRESH,s.refreshToken)])}
export async function clearSession(){await Promise.all([SecureStore.deleteItemAsync(ACCESS),SecureStore.deleteItemAsync(REFRESH)])}
export async function loadSession():Promise<Session|null>{const [accessToken,refreshToken]=await Promise.all([SecureStore.getItemAsync(ACCESS),SecureStore.getItemAsync(REFRESH)]);return accessToken&&refreshToken?{accessToken,refreshToken}:null}
export async function login(email:string,password:string){const s=await apiFetch<Session>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});await saveSession(s);return s}
export async function refreshSession(){const current=await loadSession();if(!current)return null;try{const next=await apiFetch<Session>('/auth/refresh',{method:'POST',body:JSON.stringify({refreshToken:current.refreshToken})});await saveSession(next);return next}catch{await clearSession();return null}}
export async function logout(){const s=await loadSession();try{if(s)await apiFetch('/auth/logout',{method:'POST',body:JSON.stringify({refreshToken:s.refreshToken})})}finally{await clearSession()}}
