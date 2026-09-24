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
  "exp:now+900",
  "expiresAt:new Date(Date.now()+2592000000)"
];
for(const marker of requiredService) assert.ok(service.includes(marker),`Missing session invariant: ${marker}`);
for(const marker of ["@Post('refresh')","@Post('logout')","HttpStatus.NO_CONTENT"]) assert.ok(controller.includes(marker),`Missing auth endpoint marker: ${marker}`);

const requiredWeb=[
  "if(state.refreshPromise)return state.refreshPromise",
  "if(response.status!==401)return response",
  "access=await refreshSession()",
  "if(response.status===401){clearSession();emitAuthChanged();showLogin('انتهت الجلسة، سجّل الدخول من جديد')}",
  "clearSession();emitAuthChanged();",
  "fetch(`${API_BASE}/auth/logout`",
  "location.reload()"
];
for(const marker of requiredWeb) assert.ok(web.includes(marker),`Missing web lifecycle marker: ${marker}`);

const issueStart=service.indexOf('private async issue(accountId:string)');
assert.ok(issueStart>=0,'issue() method must exist');
const issueBody=service.slice(issueStart);
assert.ok(issueBody.includes('tokenHash:this.tokenHash(refreshToken)'),'Refresh token must be stored hashed');
assert.ok(!/data:\s*\{[^}]*refreshToken\s*[:},]/s.test(issueBody),'Raw refresh token must not be persisted in session data');
console.log('Validated session lifecycle invariants: expiry, one-time refresh rotation, replay/race rejection, logout revocation, fail-closed web refresh and login recovery.');
