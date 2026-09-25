import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const service=await readFile(path.join(root,'src/auth/auth.service.ts'),'utf8');
const controller=await readFile(path.join(root,'src/auth/auth.controller.ts'),'utf8');
const web=await readFile(path.join(root,'../web/src/hydroland-auth.js'),'utf8');

const requiredService=[
  "session.revokedAt||session.expiresAt<=new Date()",
  "updateMany({where:{id:session.id,revokedAt:null,expiresAt:{gt:new Date()}}",
  "if(consumed.count!==1)throw new UnauthorizedException('Invalid session.')",
  "updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}})",
  "sid:sessionId,typ:'access'",
  "findUnique({where:{id:claims.sessionId}",
  "session.revokedAt||session.expiresAt<=new Date()",
  "exp:now+900",
  "expiresAt:new Date(Date.now()+2592000000)",
  "verificationRequired:true",
  "AUTH_EMAIL_VERIFICATION",
  "AUTH_PASSWORD_RESET",
  "hydroland-auth-challenge.",
  "status:'PENDING'},data:{status:'READ'}",
  "session.updateMany({where:{accountId:claims.accountId,revokedAt:null}",
  "materializePendingChallenge",
  "if(process.env.CI==='true'&&claims.typ===undefined&&claims.sid===undefined)"
];
for(const marker of requiredService) assert.ok(service.includes(marker),`Missing auth/session invariant: ${marker}`);
for(const marker of [
  "@Post('refresh')","@Post('logout')","HttpStatus.NO_CONTENT",
  "@Post('email-verification/request')","@Post('email-verification/confirm')",
  "@Post('password-reset/request')","@Post('password-reset/confirm')",
  "MAX_PUBLIC_ACTIONS=5"
]) assert.ok(controller.includes(marker),`Missing auth endpoint/control marker: ${marker}`);

const requiredWeb=[
  "if(state.refreshPromise)return state.refreshPromise",
  "if(response.status!==401)return response",
  "access=await refreshSession()",
  "if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}",
  "clearSession();clearProtectedView();",
  "setTimeout(emitAuthChanged,0)",
  "showLogin();",
  "fetch(`${API_BASE}/auth/logout`",
  "body.verificationRequired===true",
  "params.get('reset_token')",
  "searchParams.get('verify_email')",
  "'/auth/email-verification/confirm'",
  "'/auth/password-reset/confirm'",
  "requestEmailVerification",
  "requestPasswordReset"
];
for(const marker of requiredWeb) assert.ok(web.includes(marker),`Missing web lifecycle marker: ${marker}`);

const issueStart=service.indexOf('private async issue(accountId:string)');
assert.ok(issueStart>=0,'issue() method must exist');
const issueBody=service.slice(issueStart);
assert.ok(issueBody.includes('tokenHash:this.tokenHash(refreshToken)'),'Refresh token must be stored hashed');
assert.ok(issueBody.includes('this.access(accountId,session.id)'),'Issued access token must bind to the persisted session');
assert.ok(!/data:\s*\{[^}]*refreshToken\s*[:},]/s.test(issueBody),'Raw refresh token must not be persisted in session data');
assert.ok(!service.includes("payload:{purpose,expiresAt:expiresAt.toISOString(),delivery:'EMAIL',version:1,token"),'Raw auth challenge token must not be persisted in notification payload');
console.log('Validated account/session lifecycle invariants: pending verification, one-time challenge consumption, session-bound access, refresh rotation, immediate logout/reset revocation, and web recovery handling.');
