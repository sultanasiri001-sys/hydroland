import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

// Auth challenges share the table but must never be visible or consumed as in-app alerts.
const inAppNotification: Prisma.NotificationWhereInput = {
  NOT: { type: { startsWith: 'AUTH_' } },
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db:DatabaseService){}

  list(accountId:string){
    return this.db.notification.findMany({where:{accountId,...inAppNotification},orderBy:{createdAt:'desc'},take:100});
  }

  notify(accountId:string,type:string,payload:Record<string,unknown>){
    return this.db.notification.create({data:{accountId,type,payload:payload as never,status:'SENT',sentAt:new Date()}});
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
