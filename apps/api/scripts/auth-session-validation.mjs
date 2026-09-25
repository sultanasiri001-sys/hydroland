import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const service=await readFile(path.join(root,'src/auth/auth.service.ts'),'utf8');
const controller=await readFile(path.join(root,'src/auth/auth.controller.ts'),'utf8');
const web=await readFile(path.join(root,'../web/src/hydroland-auth.js'),'utf8');

const requiredService=[
  "type RegistrationResult={email:string;status:'PENDING_VERIFICATION';requiresEmailVerification:true}",
  "async register(input:Credentials):Promise<RegistrationResult>",
  "return{email:account.email,status:'PENDING_VERIFICATION',requiresEmailVerification:true}",
  "if(account.status!=='ACTIVE')throw new UnauthorizedException('Account activation is required.')",
  "if(!account.emailVerifiedAt)throw new UnauthorizedException('Email verification is required.')",
  "session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt",
  "updateMany({where:{id:session.id,revokedAt:null,expiresAt:{gt:new Date()}}",
  "if(consumed.count!==1)throw new UnauthorizedException('Invalid session.')",
  "updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}})",
  "where:{id:claims.sessionId,accountId:claims.accountId,revokedAt:null,expiresAt:{gt:new Date()}}",
  "return{accountId:session.account.id,sessionId:session.id}",
  "const session=await this.db.session.create",
  "accessToken:this.access(accountId,session.id)",
  "sid:sessionId",
  "if(typeof claims.sid==='string'&&claims.sid)return{accountId:claims.sub,sessionId:claims.sid}",
  "if(this.allowSessionlessE2eAccess())return{accountId:claims.sub,sessionId:null}",
  "process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'",
  "account.email.endsWith('@example.invalid')",
  "exp:now+900",
  "expiresAt:new Date(Date.now()+2592000000)"
];
for(const marker of requiredService) assert.ok(service.includes(marker),`Missing session/registration invariant: ${marker}`);
for(const marker of ["@Post('register')","@Post('refresh')","@Post('logout')","HttpStatus.NO_CONTENT"]) assert.ok(controller.includes(marker),`Missing auth endpoint marker: ${marker}`);

const requiredController=[
  'const MAX_LOGIN_FAILURES=10',
  'const MAX_REGISTRATION_ATTEMPTS=5',
  'const MAX_RATE_BUCKETS=5000',
  "key=`register:${ip}`",
  'this.isLimited(registrationAttempts,key,MAX_REGISTRATION_ATTEMPTS)',
  'this.increment(registrationAttempts,key)',
  "action:'AUTH_REGISTER_RATE_LIMITED'",
  "action:'AUTH_REGISTER_SUCCEEDED'",
  "action:'AUTH_REGISTER_FAILED'",
  'this.isLimited(loginFailures,key,MAX_LOGIN_FAILURES)',
  "action:'AUTH_LOGIN_RATE_LIMITED'",
  'private ensureCapacity(bucket:Map<string,RateEntry>,now:number)',
  'while(bucket.size>=MAX_RATE_BUCKETS)'
];
for(const marker of requiredController) assert.ok(controller.includes(marker),`Missing auth abuse-control invariant: ${marker}`);
assert.ok(!controller.includes('const attempts=new Map'),'Legacy unbounded shared login attempt map must not return.');

const registerStart=service.indexOf('async register(input:Credentials)');
const loginStart=service.indexOf('async login(input:Credentials)');
assert.ok(registerStart>=0&&loginStart>registerStart,'register/login methods must exist in order');
const registerBody=service.slice(registerStart,loginStart);
assert.ok(!registerBody.includes('this.issue('),'Registration must not issue a session before verification.');
assert.ok(!registerBody.includes('accessToken'),'Registration must not return an access token.');
assert.ok(!registerBody.includes('refreshToken'),'Registration must not return a refresh token.');

const requiredWeb=[
  "if(state.refreshPromise)return state.refreshPromise",
  "if(response.status!==401)return response",
  "access=await refreshSession()",
  "if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}",
  "if(state.mode==='register')",
  "body?.status!=='PENDING_VERIFICATION'||body?.requiresEmailVerification!==true",
  "clearSession();clearProtectedView();setAuthUi(false);emitAuthChanged()",
  "تم إنشاء الحساب. يلزم التحقق من البريد الإلكتروني قبل تسجيل الدخول",
  "storeTokens(body);setAuthUi(true)",
  "setTimeout(emitAuthChanged,0)",
  "fetch(`${API_BASE}/auth/logout`"
];
for(const marker of requiredWeb) assert.ok(web.includes(marker),`Missing web lifecycle marker: ${marker}`);

const issueStart=service.indexOf('private async issue(accountId:string)');
assert.ok(issueStart>=0,'issue() method must exist');
const issueBody=service.slice(issueStart);
assert.ok(issueBody.includes('tokenHash:this.tokenHash(refreshToken)'),'Refresh token must be stored hashed');
assert.ok(!/data:\s*\{[^}]*refreshToken\s*[:},]/s.test(issueBody),'Raw refresh token must not be persisted in session data');
console.log('Validated auth lifecycle invariants: unverified registration is sessionless, registration/login abuse controls are bounded and audited, activation+email verification are required for login, refresh rotates once, logout revokes immediately, and the web never treats registration as authenticated.');
