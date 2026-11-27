import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { CommunityPolicyService } from '../community/community-policy.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { inspectPrivateAudio, PRIVATE_AUDIO_ACCOUNT_BYTES } from './private-audio.domain';

type Input = Parameters<typeof inspectPrivateAudio>[0];
const key = (table: 'Account' | 'Conversation' | 'Message', id: string) => Prisma.sql`(jsonb_populate_record(${Prisma.raw('NULL::"' + table + '"')},jsonb_build_object('id',${id}::text)))."id"`;

@Injectable()
export class PrivateAudioService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly notifications: NotificationsService,private readonly policy:CommunityPolicyService) {}
  private async access(tx: Prisma.TransactionClient, actor: string, conversation: string) {
    await lockAccountIdentities(tx, [actor]);
    if (!await tx.account.findFirst({ where: { id: actor, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { id: true } })) throw new ForbiddenException();
    const [row] = await tx.$queryRaw<{ id: string }[]>`SELECT c.id::text AS id FROM "Conversation" c WHERE c.id::text=${conversation}
      AND EXISTS (SELECT 1 FROM "ConversationParticipant" p WHERE p."conversationId"=c.id AND p."accountId"::text=${actor})
      AND (SELECT count(*) FROM "ConversationParticipant" p WHERE p."conversationId"=c.id)=2 FOR UPDATE OF c`;
    if (!row) throw new NotFoundException('Private conversation not found.');
  }
  async send(actor: string, conversation: string, input: Input) {
    const payload = inspectPrivateAudio(input);
    const result = await this.db.serializable(async tx => {
      const policy=await this.policy.requirePrivateAudio(tx,actor);
      await this.access(tx, actor, conversation);
      const [previous] = await tx.$queryRaw<{ messageId: string; conversationId: string; sha256: string; withdrawnAt: Date | null; durationMs: number }[]>`
        SELECT a."messageId"::text AS "messageId",a."conversationId"::text AS "conversationId",a.sha256,m."withdrawnAt",a."durationMs" FROM "PrivateMessageAudio" a JOIN "Message" m ON m.id=a."messageId"
        WHERE a."senderAccountId"::text=${actor} AND a."requestKey"=${payload.requestKey}`;
      if (previous) {
        if (previous.sha256 !== payload.sha256 || previous.conversationId !== conversation || previous.withdrawnAt) throw new ConflictException('This audio request key was already used.');
        return { id: previous.messageId, durationSec: Math.ceil(previous.durationMs / 1000), created: false };
      }
      const [usage] = await tx.$queryRaw<{ bytes: bigint }[]>`SELECT COALESCE(sum("byteSize"),0)::bigint AS bytes FROM "PrivateMessageAudio" WHERE "senderAccountId"::text=${actor}`;
      if (Number(usage.bytes) + payload.bytes.length > PRIVATE_AUDIO_ACCOUNT_BYTES) throw new ConflictException('Private audio storage quota reached.');
      const [message] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`INSERT INTO "Message" ("conversationId","senderAccountId",kind,"durationSec") VALUES (${key('Conversation',conversation)},${key('Account',actor)},'VOICE',${payload.durationSec}) RETURNING id::text AS id`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO "PrivateMessageAudio" ("messageId","conversationId","senderAccountId","requestKey","mimeType",sha256,"byteSize","durationMs",content)
        VALUES (${key('Message',message.id)},${key('Conversation',conversation)},${key('Account',actor)},${payload.requestKey},'audio/wav',${payload.sha256},${payload.bytes.length},${payload.durationMs},${payload.bytes})`);
      await tx.$executeRaw`UPDATE "Conversation" SET "updatedAt"=now() WHERE id::text=${conversation}`;
      await this.audit.record({ actorId: actor, action: 'message.private_audio_created', resource: 'Message', resourceId: message.id, metadata: { byteSize: payload.bytes.length, durationMs: payload.durationMs, sha256: payload.sha256,policyDocumentId:policy.documentId,policyVersion:policy.version,policyHash:policy.contentHash } }, tx);
      const recipients=await tx.$queryRaw<{accountId:string}[]>`SELECT "accountId"::text AS "accountId" FROM "ConversationParticipant" WHERE "conversationId"::text=${conversation} AND "accountId"::text<>${actor}`;
      for(const row of recipients)await this.notifications.notify(row.accountId,'MESSAGE_RECEIVED',{conversationId:conversation,messageId:message.id,kind:'VOICE'},tx);
      return { id: message.id, durationSec: payload.durationSec, created: true };
    });
    return { id: result.id, conversationId: conversation, senderAccountId: actor, kind: 'VOICE', privateAudio: true, mediaUrl: null, durationSec: result.durationSec };
  }
  read(actor: string, conversation: string, message: string) {
    return this.db.serializable(async tx => {
      await this.access(tx, actor, conversation);
      const [row] = await tx.$queryRaw<{ content: Buffer; byteSize: number; sha256:string }[]>`SELECT a.content,a."byteSize",a.sha256 FROM "PrivateMessageAudio" a JOIN "Message" m ON m.id=a."messageId"
        WHERE a."conversationId"::text=${conversation} AND a."messageId"::text=${message} AND m."withdrawnAt" IS NULL FOR SHARE OF m,a`;
      if (!row) throw new NotFoundException('Audio is unavailable.');
      const bytes=Buffer.from(row.content);if(bytes.length!==row.byteSize||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new ConflictException('Audio integrity check failed.');return bytes;
    });
  }
}
