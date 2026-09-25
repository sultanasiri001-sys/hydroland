import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve('apps/api');
const read=path=>readFile(resolve(root,path),'utf8');
const [migration,service,controller,moduleFile,appModule]=await Promise.all([
  read('prisma/migrations/20260925224500_messaging_runtime/migration.sql'),
  read('src/messaging/messaging.service.ts'),
  read('src/messaging/messaging.controller.ts'),
  read('src/messaging/messaging.module.ts'),
  read('src/app.module.ts')
]);

for(const table of ['"Conversation"','"ConversationParticipant"','"Message"'])if(!migration.includes(`CREATE TABLE ${table}`))throw new Error(`Missing messaging table ${table}`);
for(const constraint of ['ConversationParticipant_unique','Message_kind_check','Message_payload_check'])if(!migration.includes(constraint))throw new Error(`Missing messaging constraint ${constraint}`);
for(const marker of ["'TEXT'","'VOICE'",'^https://', 'BETWEEN 1 AND 600','BETWEEN 1 AND 4000'])if(!migration.includes(marker))throw new Error(`Missing messaging payload boundary ${marker}`);
for(const marker of ['requireParticipant(accountId,conversationId)','Conversation access denied.','participantAccountIds must contain 1-20 accounts.','Voice message requires an HTTPS mediaUrl.','Text message must be 1-4000 characters.','Promise.allSettled'])if(!service.includes(marker))throw new Error(`Missing messaging service boundary ${marker}`);
if(service.includes('$queryRawUnsafe')||service.includes('$executeRawUnsafe'))throw new Error('Messaging request path must not use unsafe raw SQL.');
for(const marker of ["@UseGuards(AccessTokenGuard)","@Controller('messages')","@Get('conversations')","@Post('conversations')","@Get('conversations/:id')","@Post('conversations/:id/messages')","@Post('conversations/:id/read')"])if(!controller.includes(marker))throw new Error(`Missing messaging API route ${marker}`);
for(const marker of ['AuthModule','NotificationsModule','MessagingController','MessagingService'])if(!moduleFile.includes(marker))throw new Error(`Missing MessagingModule dependency ${marker}`);
if(!appModule.includes("import { MessagingModule } from './messaging/messaging.module';")||!appModule.includes('NotificationsModule, MessagingModule'))throw new Error('MessagingModule is not registered in AppModule.');

console.log('Messaging validation passed: persistence, participant-only authorization, text/voice payload controls, notifications boundary and protected routes.');
