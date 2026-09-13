import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateNotificationInput {
  personId: string;
  type: string;
  titleAr: string;
  bodyAr: string;
  referenceType?: string;
  referenceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        personId: input.personId,
        type: input.type,
        titleAr: input.titleAr,
        bodyAr: input.bodyAr,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    });
  }

  listMine(personId: string) {
    return this.prisma.notification.findMany({
      where: { personId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(personId: string, publicId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { publicId, personId, archivedAt: null },
    });
    if (!notification) throw new NotFoundException('الإشعار غير موجود');

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'READ', readAt: notification.readAt ?? new Date() },
    });
  }
}
