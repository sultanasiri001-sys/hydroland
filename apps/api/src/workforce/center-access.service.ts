import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CenterPermissionLevel } from '../centers/center-permissions.domain';

const LEVELS: CenterPermissionLevel[] = ['L1', 'L2', 'L3', 'L4'];

@Injectable()
export class CenterAccessService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async setLevel(actorId: string, organizationId: string, departmentId: string, maxLevel: CenterPermissionLevel) {
    if (!LEVELS.includes(maxLevel)) throw new BadRequestException('Invalid center permission level.');
    const [organization, department, access] = await Promise.all([
      this.db.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      this.db.workforceDepartment.findUnique({ where: { id: departmentId }, select: { id: true, status: true } }),
      this.db.workforceCenterDepartment.findUnique({ where: { organizationId_departmentId: { organizationId, departmentId } }, select: { id: true, status: true } }),
    ]);
    if (!organization) throw new NotFoundException('External center not found.');
    if (!department) throw new NotFoundException('Department not found.');
    if (!access) throw new BadRequestException('Initialize the external center before setting department level.');
    if (department.status !== 'ENABLED' || access.status !== 'ENABLED') throw new BadRequestException('Department must be enabled centrally and for this center before assigning a level.');

    await this.db.$executeRaw(Prisma.sql`
      UPDATE "WorkforceCenterDepartment"
      SET "maxLevel" = ${maxLevel}, "updatedById" = ${actorId}::uuid, "updatedAt" = NOW()
      WHERE "organizationId" = ${organizationId}::uuid AND "departmentId" = ${departmentId}::uuid
    `);
    await this.audit.record({ actorId, action: 'CENTER_DEPARTMENT_LEVEL_CHANGED', resource: 'Organization', resourceId: organizationId, metadata: { departmentId, maxLevel } });
    return { organizationId, departmentId, maxLevel };
  }

  async matrix(organizationId: string) {
    const organization = await this.db.organization.findUnique({ where: { id: organizationId }, select: { id: true, displayName: true } });
    if (!organization) throw new NotFoundException('External center not found.');
    const rows = await this.db.$queryRaw<Array<{ departmentId: string; code: string; nameAr: string; status: string; managerAccessEnabled: boolean; maxLevel: CenterPermissionLevel }>>(Prisma.sql`
      SELECT wcd."departmentId", wd."code", wd."nameAr", wcd."status", wcd."managerAccessEnabled", wcd."maxLevel"
      FROM "WorkforceCenterDepartment" wcd
      JOIN "WorkforceDepartment" wd ON wd."id" = wcd."departmentId"
      WHERE wcd."organizationId" = ${organizationId}::uuid
      ORDER BY wd."displayOrder" ASC
    `);
    return { organization, departments: rows };
  }
}
