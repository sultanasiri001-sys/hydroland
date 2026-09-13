import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveAccess(personId: string) {
    const now = new Date();
    const assignments = await this.prisma.personRole.findMany({
      where: {
        personId,
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const permissionKeys = new Set<string>();
    const roles = assignments.map((assignment) => {
      const permissions = assignment.role.permissions.map((item) => item.permission.key);
      permissions.forEach((key) => permissionKeys.add(key));
      return {
        key: assignment.role.key,
        nameAr: assignment.role.nameAr,
        scope: assignment.scope,
        scopeRef: assignment.scopeRef,
        activeFrom: assignment.activeFrom,
        expiresAt: assignment.expiresAt,
        permissions,
      };
    });

    return { roles, permissions: [...permissionKeys].sort() };
  }

  async hasPermission(personId: string, permissionKey: string) {
    const access = await this.getEffectiveAccess(personId);
    return access.permissions.includes(permissionKey);
  }
}
