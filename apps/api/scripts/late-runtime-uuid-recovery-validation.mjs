import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const recovery=read('scripts/late-runtime-uuid-recovery.mjs');
const safety=read('prisma/migrations/20260925221500_safety_incident_runtime/migration.sql');
const messaging=read('prisma/migrations/20260925224500_messaging_runtime/migration.sql');
const pkg=JSON.parse(read('package.json'));

const required=[
  "const SAFETY_MIGRATION='20260925221500_safety_incident_runtime'",
  "const MESSAGING_MIGRATION='20260925224500_messaging_runtime'",
  "[['Trip','id'],['Account','id']]",
  "Refusing late-runtime recovery: ${table} contains ${count} row(s)",
  '"tripId" UUID',
  '"reportedByAccountId" UUID NOT NULL',
  '"resolvedByAccountId" UUID',
  '"createdByAccountId" UUID NOT NULL REFERENCES "Account"("id")',
  '"conversationId" UUID NOT NULL REFERENCES "Conversation"("id")',
  '"accountId" UUID NOT NULL REFERENCES "Account"("id")',
  '"senderAccountId" UUID NOT NULL REFERENCES "Account"("id")',
  "['prisma','migrate','resolve','--applied',name]",
  "if(accountType!=='uuid'||tripType!=='uuid')",
];
for(const marker of required)if(!recovery.includes(marker))throw new Error(`Missing late-runtime UUID recovery invariant: ${marker}`);
if(!safety.includes('"tripId" TEXT')||!safety.includes('"reportedByAccountId" TEXT NOT NULL'))throw new Error('Historical safety migration changed; repair must remain external.');
if(!messaging.includes('"createdByAccountId" TEXT NOT NULL REFERENCES "Account"("id")')||!messaging.includes('"conversationId" TEXT NOT NULL REFERENCES "Conversation"("id")'))throw new Error('Historical messaging migration changed; repair must remain external.');
if(!pkg.scripts?.['db:deploy']?.includes('late-runtime-uuid-recovery.mjs'))throw new Error('Production db:deploy does not invoke late-runtime UUID recovery.');
console.log('Late runtime UUID recovery validation passed: safety and messaging recovery are UUID-aware, data-preserving, and historical migrations remain immutable.');
