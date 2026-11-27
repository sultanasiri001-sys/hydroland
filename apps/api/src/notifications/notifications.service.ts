import { createHash, randomUUID } from 'node:crypto';
import { protectSecret } from '../auth/mfa-crypto';
import { BadRequestException, ConflictException, UnauthorizedException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { lockActiveSessionAccount } from '../auth/account-session-lock';

// Email outboxes must never be visible or consumed as in-app alerts: marking a
// pending report READ would otherwise suppress its delivery.
const inAppNotification: Prisma.NotificationWhereInput = {
  NOT: [{ type: { startsWith: 'AUTH_' } }, { type: 'EXECUTIVE_GOVERNANCE_REPORT' }],
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db:DatabaseService){}

  private deviceToken(value: unknown): string {
    if (typeof value !== 'string' || value.length > 256 || !/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(value)) {
      throw new BadRequestException('Invalid push token.');
    }
    return value;
  }

  async registerDevice(accountId: string, sessionId: string, value: unknown) {
    const token = this.deviceToken(value);
    const hash = createHash('sha256').update(token).digest('hex');
    const encrypted = protectSecret(token, 'push-device:' + sessionId);
    const registrationId = randomUUID();
    try {
      await this.db.serializable(async tx => {
        await lockActiveSessionAccount(tx,accountId);
        // Release an expired binding without displacing another active session.
        await tx.$executeRaw`UPDATE "Session" SET "pushTokenHash"=NULL, "pushTokenCiphertext"=NULL
          WHERE "pushTokenHash"=${hash} AND "expiresAt" <= timezone('UTC', CURRENT_TIMESTAMP)`;
        const changed = await tx.$executeRaw`UPDATE "Session" SET "pushTokenHash"=${hash}, "pushTokenCiphertext"=${encrypted},
          "pushRegistrationId"=CASE WHEN "pushTokenHash"=${hash} THEN COALESCE("pushRegistrationId",${registrationId}) ELSE ${registrationId} END
          WHERE id::text=${sessionId} AND "accountId"::text=${accountId} AND "revokedAt" IS NULL
          AND "expiresAt" > timezone('UTC', CURRENT_TIMESTAMP) AND "tokenHash" NOT LIKE 'mfa:%'`;
        if (!changed) throw new UnauthorizedException('A current session is required.');
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010' && error.meta?.code === '23505') {
        throw new ConflictException('Device registration is unavailable.');
      }
      throw error;
    }
    return {registered: true};
  }

  async unregisterDevice(accountId: string, sessionId: string, value: unknown) {
    const hash = createHash('sha256').update(this.deviceToken(value)).digest('hex');
    await this.db.$executeRaw`UPDATE "Session" SET "pushTokenHash"=NULL, "pushTokenCiphertext"=NULL
      WHERE id::text=${sessionId} AND "accountId"::text=${accountId} AND "pushTokenHash"=${hash}`;
    return {registered: false};
  }

  list(accountId:string){
    return this.db.notification.findMany({where:{accountId,...inAppNotification},orderBy:{createdAt:'desc'},take:100});
  }

  notify(accountId:string,type:string,payload:Record<string,unknown>,tx:Prisma.TransactionClient=this.db){
    return tx.notification.create({data:{accountId,type,payload:payload as never,status:'SENT',sentAt:new Date()}});
  }

  createSafetyTest(accountId: string) {
    // The caller cannot choose a recipient, location, or real hazard severity.
    // Serializable retries also deduplicate simultaneous requests from multiple tabs.
    return this.db.serializable(async tx => {
      const now = new Date();
      const existing = await tx.notification.findFirst({
        where: { accountId, type: 'SAFETY_TEST', createdAt: { gte: new Date(now.getTime() - 60_000) } },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return { created: false, notification: existing };
      const notification = await tx.notification.create({
        data: {
          accountId,
          type: 'SAFETY_TEST',
          status: 'SENT',
          sentAt: now,
          payload: {
            title: 'تنبيه سلامة تجريبي — منطقة الرأس',
            message: 'مثال تجريبي: خطر في منطقة الرأس. هذه محاكاة لحسابك فقط، ولا تعني وجود خطر فعلي في المنطقة.',
            areaLabel: 'منطقة الرأس',
            isTest: true,
          },
        },
      });
      return { created: true, notification };
    });
  }

  async read(accountId:string,id:string){
    const result=await this.db.notification.updateMany({where:{id,accountId,...inAppNotification},data:{status:'READ'}});
    if(!result.count)throw new NotFoundException('Notification not found.');
    return{id,status:'READ'};
  }
}
