import { createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db=new PrismaClient();
const base=process.env.AUTH_SESSION_E2E_BASE_URL||process.env.RBAC_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const suffix=Date.now().toString();
const email=`auth-session-${suffix}@example.invalid`;
const password='Hydroland-Session-E2E-2026!';
const abuseIp='198.51.100.77';
let account=null;
const abuseAccounts=[];

const jsonRequest=async(path,options={})=>{const response=await fetch(base+path,options);const body=await response.json().catch(()=>null);return {response,body}};
const bearer=token=>({authorization:`Bearer ${token}`});
const jwtPayload=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
const login=()=>jsonRequest('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
const decodeBase32=value=>{const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',clean=value.replace(/=+$/,'').toUpperCase();let bits=0,buffer=0;const bytes=[];for(const char of clean){const index=alphabet.indexOf(char);if(index<0)throw new Error('Invalid base32 secret');buffer=(buffer<<5)|index;bits+=5;if(bits>=8){bytes.push((buffer>>>(bits-8))&255);bits-=8}}return Buffer.from(bytes)};
const totp=(secret,nowMs=Date.now())=>{const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(nowMs/30000)));const digest=createHmac('sha1',decodeBase32(secret)).update(counter).digest(),position=digest[digest.length-1]&15,value=((digest[position]&127)<<24)|((digest[position+1]&255)<<16)|((digest[position+2]&255)<<8)|(digest[position+3]&255);return String(value%1000000).padStart(6,'0')};

try{
  let result=await jsonRequest('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
  if(!result.response.ok)throw new Error(`Register failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  if(result.body?.status!=='PENDING_VERIFICATION'||result.body?.requiresEmailVerification!==true||result.body?.email!==email)throw new Error(`Unexpected registration response: ${JSON.stringify(result.body)}`);
  if(result.body?.accessToken||result.body?.refreshToken)throw new Error('Unverified registration must not return access/refresh tokens.');

  account=await db.account.findUnique({where:{email}});if(!account)throw new Error('Registered account was not persisted.');
  if(account.status!=='PENDING_VERIFICATION')throw new Error(`Expected PENDING_VERIFICATION, got ${account.status}`);
  if(account.emailVerifiedAt)throw new Error('Fresh registration must not be email verified.');
  let sessions=await db.session.findMany({where:{accountId:account.id}});if(sessions.length!==0)throw new Error(`Fresh unverified registration created ${sessions.length} session(s).`);

  result=await login();if(result.response.status!==401)throw new Error(`Pending unverified login expected 401, got ${result.response.status}`);
  await db.account.update({where:{id:account.id},data:{status:'ACTIVE'}});result=await login();if(result.response.status!==401)throw new Error(`Active but unverified login expected 401, got ${result.response.status}`);
  await db.account.update({where:{id:account.id},data:{emailVerifiedAt:new Date()}});result=await login();if(!result.response.ok)throw new Error(`Verified active login failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const initial=result.body;if(!initial?.accessToken||!initial?.refreshToken)throw new Error('Verified login did not return access/refresh tokens.');
  const initialClaims=jwtPayload(initial.accessToken);if(typeof initialClaims.sid!=='string'||!initialClaims.sid)throw new Error('Access token is missing session id (sid).');

  let response=await fetch(base+'/me',{headers:bearer(initial.accessToken)});if(!response.ok)throw new Error(`Initial session-bound access token was rejected: ${response.status} ${await response.text()}`);
  result=await jsonRequest('/auth/refresh',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:initial.refreshToken})});if(!result.response.ok)throw new Error(`Refresh failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const rotated=result.body;if(!rotated?.accessToken||!rotated?.refreshToken)throw new Error('Refresh did not return rotated tokens.');
  const rotatedClaims=jwtPayload(rotated.accessToken);if(typeof rotatedClaims.sid!=='string'||!rotatedClaims.sid||rotatedClaims.sid===initialClaims.sid)throw new Error('Refresh did not bind the new access token to a new session.');
  response=await fetch(base+'/me',{headers:bearer(initial.accessToken)});if(response.status!==401)throw new Error(`Old access token remained valid after refresh rotation: ${response.status}`);
  response=await fetch(base+'/me',{headers:bearer(rotated.accessToken)});if(!response.ok)throw new Error(`Rotated access token was rejected: ${response.status} ${await response.text()}`);
  result=await jsonRequest('/auth/refresh',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:initial.refreshToken})});if(result.response.status!==401)throw new Error(`Consumed refresh token replay expected 401, got ${result.response.status}`);

  result=await jsonRequest('/auth/mfa/totp/setup',{method:'POST',headers:{'content-type':'application/json',...bearer(rotated.accessToken)}});if(!result.response.ok||!result.body?.secret)throw new Error(`MFA setup failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const mfaSecret=result.body.secret;
  result=await jsonRequest('/auth/mfa/totp/confirm',{method:'POST',headers:{'content-type':'application/json',...bearer(rotated.accessToken)},body:JSON.stringify({code:totp(mfaSecret)})});
  if(!result.response.ok||result.body?.enabled!==true||!Array.isArray(result.body?.recoveryCodes)||result.body.recoveryCodes.length!==10)throw new Error(`MFA confirmation failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const recoveryCodes=result.body.recoveryCodes;

  response=await fetch(base+'/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:rotated.refreshToken})});if(response.status!==204)throw new Error(`Logout failed: ${response.status} ${await response.text()}`);
  response=await fetch(base+'/me',{headers:bearer(rotated.accessToken)});if(response.status!==401)throw new Error(`Access token remained valid after logout: ${response.status}`);

  result=await login();if(!result.response.ok||result.body?.mfaRequired!==true||typeof result.body?.challengeToken!=='string'||result.body.accessToken||result.body.refreshToken)throw new Error(`MFA-enabled login must return only a challenge: ${result.response.status} ${JSON.stringify(result.body)}`);
  const challengeToken=result.body.challengeToken;
  result=await jsonRequest('/auth/mfa/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeToken,code:'000000'})});if(result.response.status!==401)throw new Error(`Invalid MFA code expected 401, got ${result.response.status}`);
  result=await jsonRequest('/auth/mfa/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeToken,code:totp(mfaSecret)})});if(!result.response.ok||!result.body?.accessToken||!result.body?.refreshToken)throw new Error(`Valid MFA code did not issue session: ${result.response.status} ${JSON.stringify(result.body)}`);
  const mfaSession=result.body;
  response=await fetch(base+'/me',{headers:bearer(mfaSession.accessToken)});if(!response.ok)throw new Error(`MFA-issued access token rejected: ${response.status} ${await response.text()}`);
  result=await jsonRequest('/auth/mfa/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeToken,code:totp(mfaSecret)})});if(result.response.status!==401)throw new Error(`Consumed MFA challenge replay expected 401, got ${result.response.status}`);

  response=await fetch(base+'/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:mfaSession.refreshToken})});if(response.status!==204)throw new Error(`MFA session logout failed: ${response.status}`);
  result=await login();if(result.body?.mfaRequired!==true)throw new Error('Recovery-code test did not receive MFA challenge.');
  const recoveryChallenge=result.body.challengeToken;
  result=await jsonRequest('/auth/mfa/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({challengeToken:recoveryChallenge,code:recoveryCodes[0]})});if(!result.response.ok||!result.body?.accessToken)throw new Error(`Recovery code did not issue session: ${result.response.status}`);
  const recoverySession=result.body;
  result=await jsonRequest('/auth/mfa/status',{method:'GET',headers:bearer(recoverySession.accessToken)});if(!result.response.ok||result.body?.enabled!==true||result.body?.recoveryCodesRemaining!==9)throw new Error(`Recovery-code consumption not persisted: ${JSON.stringify(result.body)}`);
  await fetch(base+'/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken:recoverySession.refreshToken})});

  for(let index=0;index<5;index++){
    const abuseEmail=`auth-register-abuse-${suffix}-${index}@example.invalid`;
    result=await jsonRequest('/auth/register',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':abuseIp},body:JSON.stringify({email:abuseEmail,password})});
    if(!result.response.ok)throw new Error(`Registration abuse-control setup ${index+1}/5 failed: ${result.response.status} ${JSON.stringify(result.body)}`);
    const created=await db.account.findUnique({where:{email:abuseEmail}});if(!created)throw new Error(`Registration abuse-control account ${index+1} was not persisted.`);abuseAccounts.push(created);
  }
  const blockedEmail=`auth-register-abuse-${suffix}-blocked@example.invalid`;
  result=await jsonRequest('/auth/register',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':abuseIp},body:JSON.stringify({email:blockedEmail,password})});
  if(result.response.status!==429)throw new Error(`Sixth registration from one IP expected 429, got ${result.response.status}`);
  if(await db.account.findUnique({where:{email:blockedEmail}}))throw new Error('Rate-limited registration unexpectedly created an account.');
  const abuseAudit=await db.auditEvent.findMany({where:{action:{in:['AUTH_REGISTER_SUCCEEDED','AUTH_REGISTER_RATE_LIMITED']}}}),matchingAudit=abuseAudit.filter(event=>event.metadata&&typeof event.metadata==='object'&&!Array.isArray(event.metadata)&&event.metadata.ip===abuseIp);
  if(matchingAudit.filter(event=>event.action==='AUTH_REGISTER_SUCCEEDED').length!==5)throw new Error('Expected five successful registration audit events for the limited IP.');
  if(matchingAudit.filter(event=>event.action==='AUTH_REGISTER_RATE_LIMITED').length!==1)throw new Error('Expected one rate-limited registration audit event for the limited IP.');

  console.log('Auth HTTP/DB E2E passed: registration is sessionless, refresh/logout revoke immediately, TOTP MFA gates session issuance with one-time challenges/recovery codes, and registration abuse is limited/audited.');
} finally {
  for(const created of abuseAccounts.reverse()){await db.session.deleteMany({where:{accountId:created.id}});await db.account.delete({where:{id:created.id}}).catch(()=>{});await db.person.delete({where:{id:created.personId}}).catch(()=>{})}
  if(account){await db.operationalSetting.deleteMany({where:{key:`auth.mfa.account.${account.id}`}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}});const personId=account.personId;await db.account.delete({where:{id:account.id}}).catch(()=>{});await db.person.delete({where:{id:personId}}).catch(()=>{})}
  await db.$disconnect();
}
