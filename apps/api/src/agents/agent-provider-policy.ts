// Only numeric limits, canonical timestamps and allowlisted categories leave
// this parser. Provider messages, account IDs and credentials are never stored.
export const PROVIDER_GATE_KEY='AI_PROVIDER_GATE:v1';
export const MAX_PROVIDER_ATTEMPTS=4;
export const PROVIDER_RECOVERY_WINDOW_MS=72*60*60_000;
export type ProviderStage='INPUT_TOKENS'|'GENERATION';
export type RateDimension='RPM'|'RPD'|'TPM'|'TPD';
export interface ProviderLimits {
  dimension?:RateDimension; retryAt?:string; minimumDelayMs?:number; invalidDelay?:boolean;
  requestLimit?:number; requestsRemaining?:number; tokenLimit?:number;
  tokensRemaining?:number; projectTokenLimit?:number; projectTokensRemaining?:number;
}
export interface ProviderGate {
  version:1; revision:string; status:'WAITING'|'ACTION_REQUIRED'; reason:string;
  notBefore:string|null; limits?:ProviderLimits; taskId?:string;
}
const numberHeader=(headers:Headers,key:string,signed=false)=>{
  const raw=headers.get(key);if(raw===null||!(signed?/^-?\d{1,15}$/:/^\d{1,15}$/).test(raw))return undefined;
  const value=Number(raw);return Number.isSafeInteger(value)?value:undefined;
};
export function durationMs(value:string|null):number|null {
  if(!value||value.length>60||! /^(?:\d+(?:\.\d+)?(?:ms|s|m|h|d))+$/.test(value))return null;
  const units:Record<string,number>={ms:1,s:1000,m:60_000,h:3_600_000,d:86_400_000};
  const result=[...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)].reduce((n,m)=>n+Number(m[1])*units[m[2]],0);
  return Number.isSafeInteger(Math.ceil(result))&&result>=0?Math.ceil(result):null;
}
export function providerLimits(headers:Headers,now:number,detail?:unknown):ProviderLimits {
  const value:ProviderLimits={};
  for(const [header,key]of [['limit-requests','requestLimit'],['remaining-requests','requestsRemaining'],['limit-tokens','tokenLimit'],['remaining-tokens','tokensRemaining'],['limit-project-tokens','projectTokenLimit'],['remaining-project-tokens','projectTokensRemaining']] as const){
    const n=numberHeader(headers,'x-ratelimit-'+header,key.endsWith('Remaining'));if(n!==undefined)value[key]=n;
  }
  const data=detail&&typeof detail==='object'&&!Array.isArray(detail)?detail as Record<string,unknown>:{};
  const message=typeof data.message==='string'?data.message:'';
  const dimension=message.match(/\b(RPM|RPD|TPM|TPD)\b/i)?.[1]?.toUpperCase();
  if(dimension)value.dimension=dimension as RateDimension;
  else if(/tokens per day/i.test(message))value.dimension='TPD';
  else if(/requests per day/i.test(message))value.dimension='RPD';
  else if(/tokens per min(?:ute)?/i.test(message))value.dimension='TPM';
  else if(/requests per min(?:ute)?/i.test(message))value.dimension='RPM';
  const waits:number[]=[];const retry=headers.get('retry-after');
  // Some daily-limit responses omit Retry-After but give a compact duration.
  // Accept only that duration, never instructions, URLs or other message text.
  if(['rate_limit_exceeded','slow_down','server_is_overloaded'].includes(String(data.code))||data.type==='rate_limit_exceeded'){
    const text=message.match(/\btry again in ((?:\d+(?:\.\d+)?(?:ms|s|m|h|d)){1,5})(?:\b|[.,])/i)?.[1];
    if(text){const delay=durationMs(text);if(delay!==null&&delay<=31*86_400_000)waits.push(delay);else value.invalidDelay=true;}
  }
  if(retry!==null){
    const serverDate=Date.parse(headers.get('date')||'');
    const numeric=/^\d+(?:\.\d+)?$/.test(retry),httpDate=/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(retry);
    const delay=numeric?Number(retry)*1000:httpDate?Math.max(0,Date.parse(retry)-(Number.isFinite(serverDate)?serverDate:now)):NaN;
    if(Number.isFinite(delay)&&delay>=0&&delay<=31*86_400_000)waits.push(Math.ceil(delay));else value.invalidDelay=true;
  }
  // Minute resets must never be mistaken for a daily reset from the error body.
  if(!['TPD','RPD'].includes(value.dimension||''))for(const [header,exhausted]of [
    ['reset-requests',value.requestsRemaining!==undefined&&value.requestsRemaining<=0||value.dimension==='RPM'],
    ['reset-tokens',value.tokensRemaining!==undefined&&value.tokensRemaining<=0||value.dimension==='TPM'],
    ['reset-project-tokens',value.projectTokensRemaining!==undefined&&value.projectTokensRemaining<=0||value.dimension==='TPM'],
  ] as const){
    if(!exhausted)continue;const raw=headers.get('x-ratelimit-'+header),delay=durationMs(raw);
    if(delay!==null&&delay<=31*86_400_000)waits.push(delay);else if(raw!==null)value.invalidDelay=true;
  }
  if(waits.length){value.minimumDelayMs=Math.max(...waits);value.retryAt=new Date(now+value.minimumDelayMs).toISOString();}
  return value;
}
export function readProviderGate(value:unknown):ProviderGate|null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='object'||Array.isArray(value))throw new Error('PROVIDER_GATE_INVALID');
  const p=value as Record<string,unknown>;
  if(p.version!==1||typeof p.revision!=='string'||!['WAITING','ACTION_REQUIRED'].includes(String(p.status))||typeof p.reason!=='string'||(p.notBefore!==null&&(typeof p.notBefore!=='string'||!Number.isFinite(Date.parse(p.notBefore)))))throw new Error('PROVIDER_GATE_INVALID');
  return p as unknown as ProviderGate;
}
export function providerGateView(gate:ProviderGate|null,now:number){
  const until=gate?.notBefore?Date.parse(gate.notBefore):0;
  const blocked=gate?.status==='ACTION_REQUIRED'||until>now;
  return{blocked,state:blocked?gate!.status:'READY',reason:blocked?gate!.reason:null,notBefore:gate?.notBefore||null,revision:gate?.revision||null,limits:gate?.limits||null};
}
export function localProviderFixture(){
  if(process.env.NODE_ENV!=='test'||process.env.HYDROLAND_AI_TEST_MANUAL_WORKER!=='1')return false;
  try{const u=new URL(process.env.HYDROLAND_AI_TEST_BASE_URL||'');return u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);}catch{return false;}
}
export function taskIntervalMs(){
  const raw=process.env.HYDROLAND_AI_MIN_TASK_INTERVAL_MS;
  if(raw===undefined)return localProviderFixture()?0:15_000;
  const n=Number(raw);return /^\d+$/.test(raw)&&Number.isSafeInteger(n)&&n>= (localProviderFixture()?0:5000)&&n<=300_000?n:15_000;
}
export function rejectionPlan(code:string,limits:ProviderLimits|undefined,attempt:number,firstAttempt:number,now:number,jitter=Math.random()){
  const transient=['PROVIDER_RATE_LIMITED','PROVIDER_OVERLOADED','PROVIDER_WAIT_REQUIRED'].includes(code);
  const daily=limits?.dimension==='RPD'||limits?.dimension==='TPD';
  const exhausted=attempt>=MAX_PROVIDER_ATTEMPTS;
  const headerAt=Math.max(limits?.retryAt?Date.parse(limits.retryAt):0,limits?.minimumDelayMs!==undefined?now+limits.minimumDelayMs:0);
  const at=Math.max(now+(30_000*2**Math.min(3,Math.max(0,attempt-1))),headerAt||0)+Math.floor(Math.max(0,Math.min(1,jitter))*1000);
  const expired=at>firstAttempt+PROVIDER_RECOVERY_WINDOW_MS;
  const automatic=transient&&!limits?.invalidDelay&&(!daily||Boolean(headerAt))&&!exhausted&&!expired;
  return{automatic,exhausted,notBefore:headerAt>now||automatic?new Date(automatic?at:headerAt).toISOString():null,
    reason:exhausted?'PROVIDER_RETRY_EXHAUSTED':expired?'PROVIDER_RECOVERY_EXPIRED':daily&&!headerAt?'PROVIDER_DAILY_RESET_UNKNOWN':limits?.invalidDelay?'PROVIDER_DELAY_REQUIRES_REVIEW':code};
}
