import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { platformOrganization } from '../hr/staffing-catalog';

export const abuseReference = 'PRIVATE_MESSAGE_ABUSE';
type Tx = Prisma.TransactionClient;
type Content = { kind: string; body: string | null; mediaUrl: string | null; durationSec: number | null };
type Source = Content & { id: string; senderAccountId: string; withdrawnAt: Date | null; expired: boolean };

@Injectable()
export class PrivateMessageReviewService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  onModuleInit() {
    this.timer = setInterval(() => { void this.sweep(); }, 60000);
    this.timer.unref();
    void this.sweep();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async sweep() {
    if (this.running) return;
    this.running = true;
    try { await this.purgeExpired(); }
    catch { Logger.error('Could not purge expired private messages', PrivateMessageReviewService.name); }
    finally { this.running = false; }
  }
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async source(tx: Tx, actor: string, conversation: string, message: string) {
    const [source] = await tx.$queryRaw<Source[]>`
      SELECT m.*, m."withdrawnAt" + interval '720 hours' <= clock_timestamp() AS expired
      FROM "Message" m
      WHERE m.id::text = ${message} AND m."conversationId"::text = ${conversation}
        AND EXISTS (SELECT 1 FROM "ConversationParticipant" p WHERE p."conversationId" = m."conversationId" AND p."accountId"::text = ${actor})
        AND (SELECT count(*) FROM "ConversationParticipant" p WHERE p."conversationId" = m."conversationId") = 2
      FOR UPDATE OF m`;
    if (!source) throw new NotFoundException();
    return source;
  }

  withdraw(actor: string, conversation: string, message: string) {
    return this.db.serializable(async tx => {
      const source = await this.source(tx, actor, conversation, message);
      if (source.senderAccountId !== actor) throw new ForbiddenException();
      if (!source.withdrawnAt) {
        await tx.$executeRaw`INSERT INTO "WithdrawnMessageContent" ("messageId",kind,body,"mediaUrl","durationSec")
          VALUES (${message},${source.kind},${source.body},${source.mediaUrl},${source.durationSec})`;
        await tx.$executeRaw`UPDATE "Message" SET "withdrawnAt"=clock_timestamp(),kind='TEXT',body='[withdrawn]',"mediaUrl"=NULL,"durationSec"=NULL
          WHERE id::text=${message}`;
        await this.audit.record({actorId:actor,action:'message.withdrawn_for_everyone',resource:'Message',resourceId:message},tx);
      }
      return { hiddenForEveryone: true };
    });
  }

  report(actor: string, conversation: string, message: string) {
    return this.db.serializable(async tx => {
      const source = await this.source(tx, actor, conversation, message);
      const [previous] = await tx.$queryRaw<{caseId:string}[]>`SELECT "caseId" FROM "MessageAbuseEvidence"
        WHERE "messageId"=${message} AND "reporterId"=${actor}`;
      if (previous) return previous;
      if (source.expired) throw new ConflictException('انتهت مهلة الإبلاغ عن الرسالة المحذوفة.');
      const ticket = await tx.customerCase.create({data:{customerId:actor,type:'COMPLAINT',priority:'HIGH',
        subject:'بلاغ إساءة في رسالة خاصة',description:'طلب مراجعة رسالة محددة من أحد طرفي المحادثة.',
        referenceType:abuseReference,referenceId:message},select:{id:true}});
      await tx.$executeRaw`INSERT INTO "MessageAbuseEvidence" ("caseId","messageId","reporterId") VALUES (${ticket.id},${message},${actor})`;
      await this.audit.record({actorId:actor,action:'message.abuse_reported',resource:'CustomerCase',resourceId:ticket.id},tx);
      return { caseId: ticket.id };
    });
  }

  private async reviewScope(tx: Tx, actor: string, caseId: string) {
    const reviewer = await requireVerifiedAdmin(tx,actor);
    const ticket = await tx.customerCase.findFirst({where:{id:caseId,referenceType:abuseReference,organizationId:null}});
    if (!ticket) throw new NotFoundException();
    const platform = await platformOrganization(tx);
    if (!platform || (platform.ownerId!==actor && ticket.assignedAccountId!==actor)) throw new ForbiddenException();
    const [evidence] = await tx.$queryRaw<{messageId:string;releasePersonId:string|null;releasedAt:Date|null}[]>`
      SELECT "messageId","releasePersonId","releasedAt" FROM "MessageAbuseEvidence" WHERE "caseId"=${caseId} FOR UPDATE`;
    if (!evidence || evidence.releasedAt) throw new NotFoundException();
    return {reviewer,ticket,evidence};
  }

  read(actor: string, caseId: string) {
    return this.db.serializable(async tx => {
      const {evidence}=await this.reviewScope(tx,actor,caseId);
      const [content]=await tx.$queryRaw<Content[]>`
        SELECT kind,body,"mediaUrl","durationSec" FROM "WithdrawnMessageContent" WHERE "messageId"=${evidence.messageId}
        UNION ALL SELECT kind,body,"mediaUrl","durationSec" FROM "Message" WHERE id::text=${evidence.messageId} AND "withdrawnAt" IS NULL`;
      if (!content) throw new NotFoundException();
      await this.audit.record({actorId:actor,action:'message.case_evidence_read',resource:'CustomerCase',resourceId:caseId},tx);
      return content;
    });
  }

  release(actor: string, caseId: string, reason: unknown) {
    if (typeof reason!=='string' || reason.trim().length<5 || reason.length>1000) throw new BadRequestException();
    return this.db.serializable(async tx => {
      const {reviewer,ticket,evidence}=await this.reviewScope(tx,actor,caseId);
      if (ticket.status!=='CLOSED') throw new ConflictException('أغلق البلاغ وسجّل زوال سبب الحفظ أولًا.');
      if (evidence.releasePersonId===reviewer.personId) throw new ConflictException('يلزم تأكيد مفوّض آخر.');
      const released=!!evidence.releasePersonId;
      if (released) await tx.$executeRaw`UPDATE "MessageAbuseEvidence" SET "releasedAt"=clock_timestamp() WHERE "caseId"=${caseId}`;
      else await tx.$executeRaw`UPDATE "MessageAbuseEvidence" SET "releasePersonId"=${reviewer.personId},"releaseReason"=${reason.trim()} WHERE "caseId"=${caseId}`;
      await this.audit.record({actorId:actor,action:released?'message.hold_released':'message.hold_release_requested',resource:'CustomerCase',resourceId:caseId,metadata:{reason:reason.trim()}},tx);
      return {released};
    });
  }

  purgeExpired() {
    return this.db.serializable(async tx => {
      const due=await tx.$queryRaw<{id:string}[]>`SELECT m.id::text AS id FROM "Message" m
        WHERE m."withdrawnAt" <= clock_timestamp() - interval '720 hours'
          AND NOT EXISTS (SELECT 1 FROM "MessageAbuseEvidence" e WHERE e."messageId"=m.id::text AND e."releasedAt" IS NULL)
        ORDER BY m."withdrawnAt",m.id LIMIT 500 FOR UPDATE OF m SKIP LOCKED`;
      if (!due.length) return 0;
      const ids=Prisma.join(due.map(row=>row.id));
      await tx.$executeRaw(Prisma.sql`DELETE FROM "WithdrawnMessageContent" WHERE "messageId" IN (${ids})`);
      await tx.$executeRaw(Prisma.sql`DELETE FROM "Message" WHERE id::text IN (${ids})`);
      await this.audit.record({action:'message.expired_content_purged',resource:'Message',metadata:{count:due.length}},tx);
      return due.length;
    });
  }
}
