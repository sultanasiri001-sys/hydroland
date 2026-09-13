import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface WriteAuditEventInput {
  actorPersonId?: string;
  action: string;
  entityType: string;
  entityId: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason?: string;
  referenceId?: string;
  context?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(input: WriteAuditEventInput) {
    return this.prisma.auditEvent.create({
      data: {
        actorPersonId: input.actorPersonId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: input.result,
        reason: input.reason,
        referenceId: input.referenceId,
        context: input.context,
      },
    });
  }

  listRecent(limit = 100) {
    return this.prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }
}
