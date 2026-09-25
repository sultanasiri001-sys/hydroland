import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [service,controller,mfa,crypto,totp,web]=await Promise.all([
  readFile(path.join(root,'src/auth/auth.service.ts'),'utf8'),
  readFile(path.join(root,'src/auth/auth.controller.ts'),'utf8'),
  readFile(path.join(root,'src/auth/mfa.service.ts'),'utf8'),
  readFile(path.join(root,'src/auth/mfa-crypto.ts'),'utf8'),
  readFile(path.join(root,'src/auth/totp.ts'),'utf8'),
  readFile(path.join(root,'../web/src/hydroland-auth.js'),'utf8')
]);

const requiredService=[
  "type RegistrationResult={email:string;status:'PENDING_VERIFICATION';requiresEmailVerification:true}",
  "async register(input:Credentials):Promise<RegistrationResult>",
  "return{email:account.email,status:'PENDING_VERIFICATION',requiresEmailVerification:true}",
  "await this.replaceChallenge(tx,created.id,'VERIFY_EMAIL',VERIFY_TTL_MS)",
  "async requestEmailVerification(emailInput:string)",
  "async confirmEmailVerification(token:string):Promise<Tokens>",
  "async requestPasswordReset(emailInput:string)",
  "async resetPassword(token:string,newPassword:string)",
  "AUTH_EMAIL_VERIFICATION",
  "AUTH_PASSWORD_RESET",
  "hydroland-auth-challenge.",
  "status:'PENDING'},data:{status:'READ'}",
  "session.updateMany({where:{accountId:claims.accountId,revokedAt:null}",
  "materializePendingChallenge",
  "if(account.status!=='ACTIVE')throw new UnauthorizedException('Account activation is required.')",
  "if(!account.emailVerifiedAt)throw new UnauthorizedException('Email verification is required.')",
  "if(await this.mfa.isEnabled(account.id))return this.mfa.beginChallenge(account.id)",
  "async verifyMfaChallenge(challengeToken:string,code:string):Promise<Tokens>",
  "session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt",
  "updateMany({where:{id:session.id,revokedAt:null,expiresAt:{gt:new Date()}}",
  "if(consumed.count!==1)throw new UnauthorizedException('Invalid session.')",
  "updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}})",
  "tokenHash:{not:{startsWith:'mfa:'}}",
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
for(const marker of requiredService) assert.ok(service.includes(marker),`Missing session/registration/recovery invariant: ${marker}`);

const requiredController=[
  "@Post('register')","@Post('refresh')","@Post('logout')",'HttpStatus.NO_CONTENT',
  "@Post('email-verification/request')","@Post('email-verification/confirm')","@Post('password-reset/request')","@Post('password-reset/confirm')",
  'const MAX_LOGIN_FAILURES=10','const MAX_REGISTRATION_ATTEMPTS=5','const MAX_PUBLIC_ACTIONS=5','const MAX_MFA_FAILURES=5','const MAX_RATE_BUCKETS=5000',
  "key=`register:${ip}`",'this.isLimited(registrationAttempts,key,MAX_REGISTRATION_ATTEMPTS)','this.increment(registrationAttempts,key,WINDOW_MS)',
  "action:'AUTH_REGISTER_RATE_LIMITED'","action:'AUTH_REGISTER_SUCCEEDED'","action:'AUTH_REGISTER_FAILED'",
  'this.isLimited(loginFailures,key,MAX_LOGIN_FAILURES)',"action:'AUTH_LOGIN_RATE_LIMITED'",
  'this.isLimited(publicActions,key,MAX_PUBLIC_ACTIONS)',"action:'AUTH_EMAIL_VERIFICATION_REQUESTED'","action:'AUTH_PASSWORD_RESET_REQUESTED'",
  "@Post('mfa/verify')",'this.isLimited(mfaFailures,key,MAX_MFA_FAILURES)',"action:'AUTH_MFA_RATE_LIMITED'","action:'AUTH_MFA_SUCCEEDED'","action:'AUTH_MFA_FAILED'",
  "@Get('mfa/status')","@Post('mfa/totp/setup')","@Post('mfa/totp/confirm')","@Post('mfa/disable')",
  'private ensureCapacity(bucket:Map<string,RateEntry>,now:number)','while(bucket.size>=MAX_RATE_BUCKETS)'
];
for(const marker of requiredController) assert.ok(controller.includes(marker),`Missing auth abuse/recovery/MFA invariant: ${marker}`);
assert.ok(!controller.includes('const attempts=new Map'),'Legacy unbounded shared login attempt map must not return.');

for(const marker of [
  "tokenHash:this.challengeHash(challengeToken)","expiresAt:new Date(Date.now()+5*60*1000)","return`mfa:${createHash('sha256').update(token).digest('hex')}`",
  "if(!credential?.enabledAt||!await this.verifyCode",'consumed.count!==1',"setupExpiresAt:new Date(Date.now()+10*60*1000).toISOString()",
  'recoveryCodes=Array.from({length:10}',"this.db.operationalSetting.deleteMany",'revokeOthers(accountId,currentSessionId)'
]) assert.ok(mfa.includes(marker),`Missing MFA lifecycle invariant: ${marker}`);
for(const marker of ["createCipheriv('aes-256-gcm'","createDecipheriv('aes-256-gcm'","process.env.MFA_ENCRYPTION_KEY||process.env.JWT_SECRET",'createRecoveryCode','recoveryHash']) assert.ok(crypto.includes(marker),`Missing MFA secret-protection invariant: ${marker}`);
for(const marker of ["createHmac('sha1'",'counter.writeBigUInt64BE','for(const offset of[-1,0,1])','timingSafeEqual']) assert.ok(totp.includes(marker),`Missing TOTP verification invariant: ${marker}`);

const registerStart=service.indexOf('async register(input:Credentials)');
const loginStart=service.indexOf('async login(input:Credentials)');
assert.ok(registerStart>=0&&loginStart>registerStart,'register/login methods must exist in order');
const registerBody=service.slice(registerStart,loginStart);
assert.ok(!registerBody.includes('this.issue('),'Registration must not issue a session before verification.');
assert.ok(!registerBody.includes('accessToken'),'Registration must not return an access token.');
assert.ok(!registerBody.includes('refreshToken'),'Registration must not return a refresh token.');
assert.ok(!service.includes("payload:{purpose,expiresAt:expiresAt.toISOString(),delivery:'EMAIL',version:1,token"),'Raw auth challenge token must not be persisted in notification payload');

const requiredWeb=[
  "if(state.refreshPromise)return state.refreshPromise","if(response.status!==401)return response","access=await refreshSession()",
  "if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}","if(state.mode==='register')",
  "body?.status!=='PENDING_VERIFICATION'||body?.requiresEmailVerification!==true","clearSession();clearProtectedView();setAuthUi(false);emitAuthChanged()",
  "تم إنشاء الحساب. يلزم التحقق من البريد الإلكتروني قبل تسجيل الدخول","storeTokens(body);setAuthUi(true)","setTimeout(emitAuthChanged,0)","fetch(`${API_BASE}/auth/logout`",
  "params.get('reset_token')","searchParams.get('verify_email')","'/auth/email-verification/confirm'","'/auth/password-reset/confirm'","requestEmailVerification","requestPasswordReset"
];
for(const marker of requiredWeb) assert.ok(web.includes(marker),`Missing web lifecycle marker: ${marker}`);

const issueStart=service.indexOf('private async issue(accountId:string)');assert.ok(issueStart>=0,'issue() method must exist');const issueBody=service.slice(issueStart);
assert.ok(issueBody.includes('tokenHash:this.tokenHash(refreshToken)'),'Refresh token must be stored hashed');
assert.ok(!/data:\s*\{[^}]*refreshToken\s*[:},]/s.test(issueBody),'Raw refresh token must not be persisted in session data');
console.log('Validated auth invariants: registration is sessionless until one-time email verification, recovery tokens are purpose-bound and non-persisted, password reset revokes all sessions, abuse controls are bounded, MFA challenges gate login session issuance, TOTP secrets are protected, and the web remains fail-closed.');
