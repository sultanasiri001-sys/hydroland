import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.AUTH_E2E_BASE_URL||process.env.RBAC_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret||secret.length<32)throw new Error('JWT_SECRET required for auth lifecycle E2E');
const suffix=Date.now().toString();
const email=`auth-lifecycle-${suffix}@example.invalid`;
const oldPassword='Hydroland-Start-123!';
const newPassword='Hydroland-Renew-456!';
let accountId,personId;

const request=async(path,{method='POST',body,headers={}}={})=>{
  const response=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const payload=await response.json().catch(()=>({}));
  return{response,payload};
};
const assert=(value,message)=>{if(!value)throw new Error(message)};
const challengeToken=(row,purpose)=>{
  const metadata=row.payload;
  const exp=Math.floor(Date.parse(metadata.expiresAt)/1000);
  const payload=Buffer.from(JSON.stringify({id:row.id,sub:row.accountId,p:purpose,exp})).toString('base64url');
  const signature=createHmac('sha256',secret).update(`hydroland-auth-challenge.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
};

try{
  let result=await request('/auth/register',{body:{email,password:oldPassword},headers:{'x-forwarded-for':'203.0.113.31'}});
  assert(result.response.status===201,`register expected 201, got ${result.response.status}: ${JSON.stringify(result.payload)}`);
  assert(result.payload.status==='PENDING_VERIFICATION'&&result.payload.requiresEmailVerification===true,'registration must remain pending verification');
  assert(!result.payload.accessToken&&!result.payload.refreshToken,'registration must not issue a session before verification');

  const account=await db.account.findUnique({where:{email},include:{sessions:true,notifications:true}});
  assert(account,'registered account missing');
  accountId=account.id;personId=account.personId;
  assert(account.status==='PENDING_VERIFICATION'&&!account.emailVerifiedAt,'registered account must remain pending verification');
  assert(account.sessions.length===0,'unverified registration must not create sessions');
  const verifyRow=account.notifications.find(row=>row.type==='AUTH_EMAIL_VERIFICATION'&&row.status==='PENDING');
  assert(verifyRow,'verification outbox challenge missing');
  assert(!JSON.stringify(verifyRow.payload).includes('token'),'outbox payload must not persist a raw bearer token');

  result=await request('/auth/login',{body:{email,password:oldPassword}});
  assert(result.response.status===401,`unverified login expected 401, got ${result.response.status}`);

  const verifyToken=challengeToken(verifyRow,'VERIFY_EMAIL');
  result=await request('/auth/email-verification/confirm',{body:{token:verifyToken}});
  assert(result.response.ok,`verification failed: ${result.response.status} ${JSON.stringify(result.payload)}`);
  const verifiedAccess=result.payload.accessToken,verifiedRefresh=result.payload.refreshToken;
  assert(verifiedAccess&&verifiedRefresh,'verification must issue the first session');
  const verifiedAccount=await db.account.findUniqueOrThrow({where:{id:accountId}});
  assert(verifiedAccount.status==='ACTIVE'&&verifiedAccount.emailVerifiedAt,'verification did not activate account');
  assert((await db.notification.findUniqueOrThrow({where:{id:verifyRow.id}})).status==='READ','verification challenge was not consumed');

  result=await request('/me',{method:'GET',headers:{authorization:`Bearer ${verifiedAccess}`}});
  assert(result.response.ok,`verified access token rejected: ${result.response.status}`);

  result=await request('/auth/email-verification/confirm',{body:{token:verifyToken}});
  assert(result.response.status===401,`verification token replay expected 401, got ${result.response.status}`);

  result=await request('/auth/password-reset/request',{body:{email},headers:{'x-forwarded-for':'203.0.113.32'}});
  assert(result.response.status===202&&result.payload.accepted===true,`reset request expected generic 202, got ${result.response.status}`);
  const resetRow=await db.notification.findFirst({where:{accountId,type:'AUTH_PASSWORD_RESET',status:'PENDING'},orderBy:{createdAt:'desc'}});
  assert(resetRow,'password reset outbox challenge missing');
  const resetToken=challengeToken(resetRow,'RESET_PASSWORD');

  result=await request('/auth/password-reset/confirm',{body:{token:resetToken,password:newPassword}});
  assert(result.response.ok&&result.payload.passwordReset===true,`password reset failed: ${result.response.status} ${JSON.stringify(result.payload)}`);
  result=await request('/me',{method:'GET',headers:{authorization:`Bearer ${verifiedAccess}`}});
  assert(result.response.status===401,`password reset must revoke existing access sessions, got ${result.response.status}`);
  result=await request('/auth/refresh',{body:{refreshToken:verifiedRefresh}});
  assert(result.response.status===401,`password reset must revoke existing refresh sessions, got ${result.response.status}`);

  result=await request('/auth/login',{body:{email,password:oldPassword}});
  assert(result.response.status===401,'old password remained usable after reset');
  result=await request('/auth/login',{body:{email,password:newPassword}});
  assert(result.response.ok&&result.payload.accessToken&&result.payload.refreshToken,'new password login failed');

  result=await request('/auth/password-reset/confirm',{body:{token:resetToken,password:'Hydroland-Replay-789!'}});
  assert(result.response.status===401,`password reset token replay expected 401, got ${result.response.status}`);

  result=await request('/auth/password-reset/request',{body:{email:`missing-${suffix}@example.invalid`},headers:{'x-forwarded-for':'203.0.113.33'}});
  assert(result.response.status===202&&result.payload.accepted===true,'nonexistent account reset request must remain enumeration-safe');

  console.log('Auth account lifecycle HTTP/DB E2E passed: pending registration, one-time verification, session-bound access, one-time password reset, full session revocation, and enumeration-safe recovery requests.');
} finally {
  if(accountId){
    await db.session.deleteMany({where:{accountId}});
    await db.notification.deleteMany({where:{accountId}});
    await db.operationalSetting.deleteMany({where:{key:{startsWith:`AUTH_MFA:${accountId}`}}}).catch(()=>{});
    await db.account.delete({where:{id:accountId}}).catch(()=>{});
  }
  if(personId)await db.person.delete({where:{id:personId}}).catch(()=>{});
  await db.$disconnect();
}
