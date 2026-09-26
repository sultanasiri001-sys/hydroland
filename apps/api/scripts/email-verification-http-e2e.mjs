import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db=new PrismaClient();
const base=process.env.EMAIL_VERIFICATION_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const suffix=Date.now().toString();
const email=`email-verify-${suffix}@example.invalid`;
const password='Hydroland-Email-Verification-2026!';
const registrationIp='198.51.100.141';
const resendIp='198.51.100.142';
let account=null;

const request=async(path,options={})=>{const response=await fetch(base+path,options);const body=await response.json().catch(()=>null);return{response,body}};
const json=(body,headers={})=>({method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});

try{
  let result=await request('/auth/register',json({email,password},{'x-forwarded-for':registrationIp}));
  if(!result.response.ok)throw new Error(`Registration failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  if(result.body?.verificationDelivery!=='UNAVAILABLE')throw new Error(`Expected fail-closed UNAVAILABLE email delivery in CI, got ${JSON.stringify(result.body)}`);
  if(result.body?.accessToken||result.body?.refreshToken)throw new Error('Registration returned session tokens before email verification.');

  account=await db.account.findUnique({where:{email}});
  if(!account||account.status!=='PENDING_VERIFICATION'||account.emailVerifiedAt)throw new Error('Fresh password account is not pending email verification.');

  result=await request('/auth/email-verification/resend',json({email},{'x-forwarded-for':resendIp}));
  if(!result.response.ok||result.body?.accepted!==true||result.body?.delivery!=='UNAVAILABLE')throw new Error(`Unavailable resend did not fail closed: ${result.response.status} ${JSON.stringify(result.body)}`);
  result=await request('/auth/email-verification/resend',json({email:`unknown-${suffix}@example.invalid`},{'x-forwarded-for':'198.51.100.143'}));
  if(!result.response.ok||result.body?.accepted!==true||result.body?.delivery!=='UNAVAILABLE')throw new Error('Unknown-email resend response differs from pending-account response while provider is unavailable.');

  const rawToken=`${account.id}.${randomBytes(32).toString('base64url')}`;
  const tokenHash=createHash('sha256').update(rawToken).digest('hex');
  await db.operationalSetting.upsert({where:{key:`auth.email-verification.account.${account.id}`},create:{key:`auth.email-verification.account.${account.id}`,value:{version:1,tokenHash,expiresAt:new Date(Date.now()+60*60*1000).toISOString(),issuedAt:new Date().toISOString()}},update:{value:{version:1,tokenHash,expiresAt:new Date(Date.now()+60*60*1000).toISOString(),issuedAt:new Date().toISOString()}}});

  result=await request('/auth/email-verification/verify',json({token:rawToken},{'x-forwarded-for':'198.51.100.144'}));
  if(!result.response.ok||result.body?.verified!==true)throw new Error(`Email verification failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  account=await db.account.findUnique({where:{email}});
  if(!account||account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new Error('Successful email verification did not activate and verify the account.');
  if(await db.operationalSetting.findUnique({where:{key:`auth.email-verification.account.${account.id}`}}))throw new Error('Email verification challenge was not consumed.');

  result=await request('/auth/email-verification/verify',json({token:rawToken},{'x-forwarded-for':'198.51.100.144'}));
  if(result.response.status!==401)throw new Error(`Consumed email verification token replay expected 401, got ${result.response.status}`);

  result=await request('/auth/login',json({email,password},{'x-forwarded-for':'198.51.100.145'}));
  if(!result.response.ok||!result.body?.accessToken||!result.body?.refreshToken)throw new Error(`Verified password account could not log in: ${result.response.status} ${JSON.stringify(result.body)}`);
  const refreshToken=result.body.refreshToken;
  const logout=await fetch(base+'/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken})});
  if(logout.status!==204)throw new Error(`Logout after verified login failed: ${logout.status}`);

  const limitedEmail=`resend-limit-${suffix}@example.invalid`;
  for(let index=0;index<3;index++){
    result=await request('/auth/email-verification/resend',json({email:limitedEmail},{'x-forwarded-for':resendIp}));
    if(!result.response.ok)throw new Error(`Resend throttle setup ${index+1}/3 failed: ${result.response.status}`);
  }
  result=await request('/auth/email-verification/resend',json({email:limitedEmail},{'x-forwarded-for':resendIp}));
  if(result.response.status!==429)throw new Error(`Fourth resend within the window expected 429, got ${result.response.status}`);

  console.log('Email verification HTTP/DB E2E passed: registration is sessionless, provider-unavailable delivery is explicit, verification is one-time, activation enables login, and resend is privacy-preserving/rate-limited.');
} finally {
  if(account){await db.operationalSetting.deleteMany({where:{key:`auth.email-verification.account.${account.id}`}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}});const personId=account.personId;await db.account.delete({where:{id:account.id}}).catch(()=>{});await db.person.delete({where:{id:personId}}).catch(()=>{})}
  await db.$disconnect();
}
