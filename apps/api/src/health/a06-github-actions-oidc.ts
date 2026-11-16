import { createPublicKey, verify as verifySignature } from 'node:crypto';

export const A06_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
export const A06_OIDC_AUDIENCE = 'https://hydroland.onrender.com';
export const A06_OIDC_WORKFLOW = 'sultanasiri001-sys/hydroland/.github/workflows/a06-provider-watch.yml@refs/heads/main';
const REPOSITORY = 'sultanasiri001-sys/hydroland';
const REPOSITORY_ID = '1366555943';
const OWNER_ID = '326666007';
const JWKS_URL = A06_OIDC_ISSUER + '/.well-known/jwks';
type Claims = Record<string,unknown>;
type Jwk = JsonWebKey & {kid?:string;use?:string;alg?:string};
let cachedKeys: {keys:Jwk[];expiresAt:number}|undefined;

function decodeSegment(value:string):unknown {
  return JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
}
function stringClaim(claims:Claims,key:string){return typeof claims[key]==='string'?claims[key] as string:'';}
function numericClaim(claims:Claims,key:string){const value=claims[key];const number=typeof value==='number'?value:typeof value==='string'&&/^[0-9]+$/.test(value)?Number(value):Number.NaN;return Number.isSafeInteger(number)?number:Number.NaN;}

async function signingKeys(fetcher:typeof fetch, now:number):Promise<Jwk[]> {
  if(fetcher===fetch&&cachedKeys&&cachedKeys.expiresAt>now)return cachedKeys.keys;
  const response=await fetcher(JWKS_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8_000)});
  if(!response.ok)throw new Error('A06_OIDC_KEYS_UNAVAILABLE');
  const payload=await response.json() as {keys?:Jwk[]};
  if(!Array.isArray(payload.keys)||payload.keys.length<1||payload.keys.length>32)throw new Error('A06_OIDC_KEYS_INVALID');
  const keys=payload.keys.filter(key=>key&&key.kty==='RSA'&&typeof key.kid==='string'&&(key.use===undefined||key.use==='sig')&&(key.alg===undefined||key.alg==='RS256'));
  if(fetcher===fetch)cachedKeys={keys,expiresAt:now+15*60_000};
  return keys;
}

export async function verifyA06GitHubActionsToken(token:string,fetcher:typeof fetch=fetch,nowMs=Date.now()):Promise<Claims>{
  try{
    if(typeof token!=='string'||token.length<100||token.length>8192)throw new Error();
    const parts=token.split('.');
    if(parts.length!==3)throw new Error();
    const header=decodeSegment(parts[0]) as Claims;
    const claims=decodeSegment(parts[1]) as Claims;
    const kid=stringClaim(header,'kid');
    if(header.alg!=='RS256'||!kid||header.typ!=='JWT')throw new Error();
    const keys=await signingKeys(fetcher,nowMs);
    const jwk=keys.find(key=>key.kid===kid);
    if(!jwk?.n||!jwk.e)throw new Error();
    const publicKey=createPublicKey({key:{kty:'RSA',n:jwk.n,e:jwk.e},format:'jwk'});
    if(!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),publicKey,Buffer.from(parts[2],'base64url')))throw new Error();
    const now=Math.floor(nowMs/1000),issued=numericClaim(claims,'iat'),notBefore=numericClaim(claims,'nbf'),expires=numericClaim(claims,'exp');
    const audience=claims.aud;
    const audienceMatches=audience===A06_OIDC_AUDIENCE||(Array.isArray(audience)&&audience.includes(A06_OIDC_AUDIENCE));
    if(stringClaim(claims,'iss')!==A06_OIDC_ISSUER||!audienceMatches
      ||stringClaim(claims,'repository')!==REPOSITORY||stringClaim(claims,'repository_id')!==REPOSITORY_ID
      ||stringClaim(claims,'repository_owner_id')!==OWNER_ID
      ||stringClaim(claims,'workflow_ref')!==A06_OIDC_WORKFLOW
      ||stringClaim(claims,'ref')!=='refs/heads/main'
      ||!['schedule','workflow_dispatch'].includes(stringClaim(claims,'event_name'))
      ||!Number.isSafeInteger(numericClaim(claims,'run_id'))||numericClaim(claims,'run_id')<1||!Number.isSafeInteger(numericClaim(claims,'run_attempt'))||numericClaim(claims,'run_attempt')<1
      ||!Number.isFinite(issued)||!Number.isFinite(notBefore)||!Number.isFinite(expires)
      ||issued>now+30||issued<now-600||notBefore>now+30||expires<=now||expires<=issued||expires-issued>600)throw new Error();
    return claims;
  }catch{
    throw new Error('A06_OIDC_TOKEN_INVALID');
  }
}
