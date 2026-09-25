import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [service,controller,mfa,crypto,totp,google,web,googleWeb,webApp,apiPackage]=await Promise.all([
  readFile(path.join(root,'src/auth/auth.service.ts'),'utf8'),
  readFile(path.join(root,'src/auth/auth.controller.ts'),'utf8'),
  readFile(path.join(root,'src/auth/mfa.service.ts'),'utf8'),
  readFile(path.join(root,'src/auth/mfa-crypto.ts'),'utf8'),
  readFile(path.join(root,'src/auth/totp.ts'),'utf8'),
  readFile(path.join(root,'src/auth/google-identity.service.ts'),'utf8'),
  readFile(path.join(root,'../web/src/hydroland-auth.js'),'utf8'),
  readFile(path.join(root,'../web/src/hydroland-google-auth.js'),'utf8'),
  readFile(path.join(root,'../web/src/app.js'),'utf8'),
  readFile(path.join(root,'package.json'),'utf8')
]);

const requiredService=[
  "type RegistrationResult={email:string;status:'PENDING_VERIFICATION';requiresEmailVerification:true}",
  "async register(input:Credentials):Promise<RegistrationResult>",
  "return{email:account.email,status:'PENDING_VERIFICATION',requiresEmailVerification:true}",
  "if(account.status!=='ACTIVE')throw new UnauthorizedException('Account activation is required.')",
  "if(!account.emailVerifiedAt)throw new UnauthorizedException('Email verification is required.')",
  "googleConfig(){return this.google.config()}",
  "async loginWithGoogle(credential:string)",
  "const identity=await this.google.verifyCredential(credential)",
  "const account=await this.resolveGoogleAccount(identity)",
  "private async completePrimaryAuthentication(accountId:string){if(await this.mfa.isEnabled(accountId))return this.mfa.beginChallenge(accountId);return this.issue(accountId)}",
  "private googleSubjectKey(subject:string){return`auth.google.subject.${createHash('sha256').update(subject).digest('hex')}`}",
  "provider:'google',accountId,emailAtLink:email,hostedDomain",
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
for(const marker of requiredService) assert.ok(service.includes(marker),`Missing session/registration/Google invariant: ${marker}`);

const requiredController=[
  "@Post('register')","@Post('refresh')","@Post('logout')",'HttpStatus.NO_CONTENT',
  'const MAX_LOGIN_FAILURES=10','const MAX_REGISTRATION_ATTEMPTS=5','const MAX_MFA_FAILURES=5','const MAX_GOOGLE_FAILURES=10','const MAX_RATE_BUCKETS=5000',
  "key=`register:${ip}`",'this.isLimited(registrationAttempts,key,MAX_REGISTRATION_ATTEMPTS)','this.increment(registrationAttempts,key,WINDOW_MS)',
  "action:'AUTH_REGISTER_RATE_LIMITED'","action:'AUTH_REGISTER_SUCCEEDED'","action:'AUTH_REGISTER_FAILED'",
  'this.isLimited(loginFailures,key,MAX_LOGIN_FAILURES)',"action:'AUTH_LOGIN_RATE_LIMITED'",
  "@Get('google/config')","@Post('google')",'this.isLimited(googleFailures,key,MAX_GOOGLE_FAILURES)',"action:'AUTH_GOOGLE_RATE_LIMITED'","action:'AUTH_GOOGLE_SUCCEEDED'","action:'AUTH_GOOGLE_FAILED'","action:'AUTH_GOOGLE_MFA_REQUIRED'",
  "@Post('mfa/verify')",'this.isLimited(mfaFailures,key,MAX_MFA_FAILURES)',"action:'AUTH_MFA_RATE_LIMITED'","action:'AUTH_MFA_SUCCEEDED'","action:'AUTH_MFA_FAILED'",
  "@Get('mfa/status')","@Post('mfa/totp/setup')","@Post('mfa/totp/confirm')","@Post('mfa/disable')",
  'private ensureCapacity(bucket:Map<string,RateEntry>,now:number)','while(bucket.size>=MAX_RATE_BUCKETS)'
];
for(const marker of requiredController) assert.ok(controller.includes(marker),`Missing auth abuse/Google/MFA invariant: ${marker}`);
assert.ok(!controller.includes('const attempts=new Map'),'Legacy unbounded shared login attempt map must not return.');

for(const marker of [
  "tokenHash:this.challengeHash(challengeToken)","expiresAt:new Date(Date.now()+5*60*1000)","return`mfa:${createHash('sha256').update(token).digest('hex')}`",
  "if(!credential?.enabledAt||!await this.verifyCode",'consumed.count!==1',"setupExpiresAt:new Date(Date.now()+10*60*1000).toISOString()",
  'recoveryCodes=Array.from({length:10}',"this.db.operationalSetting.deleteMany",'revokeOthers(accountId,currentSessionId)','invalidateChallenge(challengeToken:string)'
]) assert.ok(mfa.includes(marker),`Missing MFA lifecycle invariant: ${marker}`);
for(const marker of ["createCipheriv('aes-256-gcm'","createDecipheriv('aes-256-gcm'","process.env.MFA_ENCRYPTION_KEY||process.env.JWT_SECRET",'createRecoveryCode','recoveryHash']) assert.ok(crypto.includes(marker),`Missing MFA secret-protection invariant: ${marker}`);
for(const marker of ["createHmac('sha1'",'counter.writeBigUInt64BE','for(const offset of[-1,0,1])','timingSafeEqual']) assert.ok(totp.includes(marker),`Missing TOTP verification invariant: ${marker}`);

for(const marker of [
  "import { OAuth2Client } from 'google-auth-library'","new OAuth2Client()","process.env.GOOGLE_CLIENT_ID","verifyIdToken({idToken:credential.trim(),audience:clientId})",
  "payload?.email_verified!==true","email.endsWith('@gmail.com')","payload?.email_verified===true&&Boolean(hostedDomain)","subject=typeof payload?.sub==='string'"
]) assert.ok(google.includes(marker),`Missing Google ID-token verification invariant: ${marker}`);
assert.ok(apiPackage.includes('"google-auth-library": "^10.3.0"'),'Google auth verifier dependency is missing.');

const registerStart=service.indexOf('async register(input:Credentials)');
const loginStart=service.indexOf('async login(input:Credentials)');
assert.ok(registerStart>=0&&loginStart>registerStart,'register/login methods must exist in order');
const registerBody=service.slice(registerStart,loginStart);
assert.ok(!registerBody.includes('this.issue('),'Registration must not issue a session before verification.');
assert.ok(!registerBody.includes('accessToken'),'Registration must not return an access token.');
assert.ok(!registerBody.includes('refreshToken'),'Registration must not return a refresh token.');

const requiredWeb=[
  "if(state.refreshPromise)return state.refreshPromise","if(response.status!==401)return response","access=await refreshSession()",
  "if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}","if(state.mode==='register')",
  "body?.status!=='PENDING_VERIFICATION'||body?.requiresEmailVerification!==true","clearSession();clearProtectedView();setAuthUi(false);emitAuthChanged()",
  "تم إنشاء الحساب. يلزم التحقق من البريد الإلكتروني قبل تسجيل الدخول","storeTokens(body);setAuthUi(true)","setTimeout(emitAuthChanged,0)","fetch(`${API_BASE}/auth/logout`"
];
for(const marker of requiredWeb) assert.ok(web.includes(marker),`Missing web lifecycle marker: ${marker}`);
for(const marker of [
  "https://accounts.google.com/gsi/client","/auth/google/config","/auth/google`","data-hl-google-signin","window.google.accounts.id.initialize","window.google.accounts.id.renderButton",
  "challengeToken=null","/auth/mfa/verify","sessionStorage.setItem('hl-access-token'","sessionStorage.setItem('hl-refresh-token'"
])assert.ok(googleWeb.includes(marker),`Missing Google browser boundary: ${marker}`);
assert.ok(!/sessionStorage\.setItem\([^\n]*(credential|challenge)/i.test(googleWeb),'Google credential/MFA challenge must not be persisted in sessionStorage.');
assert.ok(webApp.includes("await loadScript('hydroland-google-auth.js')"),'Google browser module must load after core authentication.');

const issueStart=service.indexOf('private async issue(accountId:string)');assert.ok(issueStart>=0,'issue() method must exist');const issueBody=service.slice(issueStart);
assert.ok(issueBody.includes('tokenHash:this.tokenHash(refreshToken)'),'Refresh token must be stored hashed');
assert.ok(!/data:\s*\{[^}]*refreshToken\s*[:},]/s.test(issueBody),'Raw refresh token must not be persisted in session data');
console.log('Validated auth invariants: registration is sessionless, abuse controls are bounded, Google ID tokens are server-verified and linked by subject, MFA gates session issuance, secrets/recovery codes are protected, refresh/logout revoke immediately, and browser credentials remain fail-closed.');
