import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const read=relative=>readFile(path.join(root,relative),'utf8');
const requireToken=(source,token,label)=>{if(!source.includes(token))throw new Error(`Phase 11 control missing (${label}): ${token}`)};

const [rootDocker,apiDocker,compose,envTemplate,main,securityWorkflow,mfaService,totp]=await Promise.all([
  read('Dockerfile'),
  read('apps/api/Dockerfile'),
  read('infra/docker-compose.production.yml'),
  read('infra/.env.production.example'),
  read('apps/api/src/main.ts'),
  read('.github/workflows/security-audit.yml'),
  read('apps/api/src/auth/mfa.service.ts'),
  read('apps/api/src/auth/totp.ts'),
]);

requireToken(rootDocker,'USER node','root production image runs non-root');
requireToken(rootDocker,'AS build','root production image is multi-stage');
requireToken(apiDocker,'USER node','API image runs non-root');
requireToken(compose,'read_only: true','API filesystem is read-only');
requireToken(compose,'no-new-privileges:true','container privilege escalation disabled');
requireToken(compose,'127.0.0.1:3001:3001','production gateway exposes API only through localhost binding');

const postgresBlock=compose.split(/\n  postgres:\n/)[1]??'';
if(!postgresBlock)throw new Error('Phase 11 control missing: private PostgreSQL service block.');
if(/\n\s+ports\s*:/.test(postgresBlock))throw new Error('Phase 11 violation: PostgreSQL must not publish host ports.');

for(const placeholder of ['CHANGE_ME','GENERATE_A_32_CHARACTER_MINIMUM_SECRET','KMS/secret manager']){
  requireToken(envTemplate,placeholder,'production secrets stay out of source');
}
if(/(?:sk-|AKIA|BEGIN PRIVATE KEY|password\s*=\s*[^\s]*(?!CHANGE_ME))/i.test(envTemplate.replaceAll('POSTGRES_PASSWORD=CHANGE_ME',''))){
  throw new Error('Phase 11 violation: production environment template appears to contain a real secret.');
}

for(const token of ['Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Content-Security-Policy','WEB_ORIGIN is required in production']){
  requireToken(main,token,'production HTTP security baseline');
}
requireToken(mfaService,'MfaService','MFA service exists');
requireToken(totp,'verifyTotp','TOTP verification exists');
requireToken(securityWorkflow,"['high','critical']",'dependency severity gate');
requireToken(securityWorkflow,'process.exit(1)','security audit fails closed');
requireToken(securityWorkflow,'if: always()','audit evidence retained on failure');

console.log('Phase 11 repository controls validated: non-root container, read-only/no-new-privileges baseline, private DB topology, secret template, HTTP headers, MFA and fail-closed dependency audit.');
