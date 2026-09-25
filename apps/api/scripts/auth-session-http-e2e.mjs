import { PrismaClient } from '@prisma/client';

const db=new PrismaClient();
const base=process.env.AUTH_SESSION_E2E_BASE_URL||process.env.RBAC_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const suffix=Date.now().toString();
const email=`auth-session-${suffix}@example.invalid`;
const password='Hydroland-Session-E2E-2026!';
let account=null;

const jsonRequest=async(path,options={})=>{
  const response=await fetch(base+path,options);
  const body=await response.json().catch(()=>null);
  return {response,body};
};
const bearer=token=>({authorization:`Bearer ${token}`});
const jwtPayload=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
const login=()=>jsonRequest('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});

try{
  let result=await jsonRequest('/auth/register',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({email,password})
  });
  if(!result.response.ok)throw new Error(`Register failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  if(result.body?.status!=='PENDING_VERIFICATION'||result.body?.requiresEmailVerification!==true||result.body?.email!==email)throw new Error(`Unexpected registration response: ${JSON.stringify(result.body)}`);
  if(result.body?.accessToken||result.body?.refreshToken)throw new Error('Unverified registration must not return access/refresh tokens.');

  account=await db.account.findUnique({where:{email}});
  if(!account)throw new Error('Registered account was not persisted.');
  if(account.status!=='PENDING_VERIFICATION')throw new Error(`Expected PENDING_VERIFICATION, got ${account.status}`);
  if(account.emailVerifiedAt)throw new Error('Fresh registration must not be email verified.');
  let sessions=await db.session.findMany({where:{accountId:account.id}});
  if(sessions.length!==0)throw new Error(`Fresh unverified registration created ${sessions.length} session(s).`);

  result=await login();
  if(result.response.status!==401)throw new Error(`Pending unverified login expected 401, got ${result.response.status}`);

  await db.account.update({where:{id:account.id},data:{status:'ACTIVE'}});
  result=await login();
  if(result.response.status!==401)throw new Error(`Active but unverified login expected 401, got ${result.response.status}`);

  await db.account.update({where:{id:account.id},data:{emailVerifiedAt:new Date()}});
  result=await login();
  if(!result.response.ok)throw new Error(`Verified active login failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const initial=result.body;
  if(!initial?.accessToken||!initial?.refreshToken)throw new Error('Verified login did not return access/refresh tokens.');
  const initialClaims=jwtPayload(initial.accessToken);
  if(typeof initialClaims.sid!=='string'||!initialClaims.sid)throw new Error('Access token is missing session id (sid).');

  let response=await fetch(base+'/me',{headers:bearer(initial.accessToken)});
  if(!response.ok)throw new Error(`Initial session-bound access token was rejected: ${response.status} ${await response.text()}`);

  result=await jsonRequest('/auth/refresh',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({refreshToken:initial.refreshToken})
  });
  if(!result.response.ok)throw new Error(`Refresh failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const rotated=result.body;
  if(!rotated?.accessToken||!rotated?.refreshToken)throw new Error('Refresh did not return rotated tokens.');
  const rotatedClaims=jwtPayload(rotated.accessToken);
  if(typeof rotatedClaims.sid!=='string'||!rotatedClaims.sid||rotatedClaims.sid===initialClaims.sid)throw new Error('Refresh did not bind the new access token to a new session.');

  response=await fetch(base+'/me',{headers:bearer(initial.accessToken)});
  if(response.status!==401)throw new Error(`Old access token remained valid after refresh rotation: ${response.status}`);
  response=await fetch(base+'/me',{headers:bearer(rotated.accessToken)});
  if(!response.ok)throw new Error(`Rotated access token was rejected: ${response.status} ${await response.text()}`);

  result=await jsonRequest('/auth/refresh',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({refreshToken:initial.refreshToken})
  });
  if(result.response.status!==401)throw new Error(`Consumed refresh token replay expected 401, got ${result.response.status}`);

  response=await fetch(base+'/auth/logout',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({refreshToken:rotated.refreshToken})
  });
  if(response.status!==204)throw new Error(`Logout failed: ${response.status} ${await response.text()}`);

  response=await fetch(base+'/me',{headers:bearer(rotated.accessToken)});
  if(response.status!==401)throw new Error(`Access token remained valid after logout: ${response.status}`);

  sessions=await db.session.findMany({where:{accountId:account.id},orderBy:{createdAt:'asc'}});
  if(sessions.length!==2)throw new Error(`Expected 2 login/rotated sessions, found ${sessions.length}`);
  if(sessions.some(session=>!session.revokedAt))throw new Error('Expected both consumed/logged-out sessions to be revoked.');

  console.log('Auth session HTTP/DB E2E passed: registration is sessionless until activation+verification, then access tokens are session-bound and immediately revoked by refresh rotation/logout.');
} finally {
  if(account){
    await db.session.deleteMany({where:{accountId:account.id}});
    const personId=account.personId;
    await db.account.delete({where:{id:account.id}}).catch(()=>{});
    await db.person.delete({where:{id:personId}}).catch(()=>{});
  }
  await db.$disconnect();
}
