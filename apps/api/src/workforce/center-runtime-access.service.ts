import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import type { CenterPermissionLevel } from '../centers/center-permissions.domain';

const LEVEL_WEIGHT: Record<CenterPermissionLevel, number> = { L1: 1, L2: 2, L3: 3, L4: 4 };

type RuntimeAccessRow = {
  seatId: string;
  organizationId: string;
  departmentId: string;
  departmentCode: string;
  maxLevel: CenterPermissionLevel;
  managerAccessEnabled: boolean;
  canManageExternalCenter: boolean;
};

@Injectable()
export class CenterRuntimeAccessService {
  constructor(private readonly db: DatabaseService) {}

  async assertAccess(input: {
    accountId: string;
    organizationId: string;
    departmentCode: string;
    requiredLevel: CenterPermissionLevel;
  }) {
    const rows = await this.db.$queryRaw<RuntimeAccessRow[]>(Prisma.sql`
      SELECT
        ws."id" AS "seatId",
        ws."organizationId" AS "organizationId",
        wcd."departmentId" AS "departmentId",
        target."code" AS "departmentCode",
        wcd."maxLevel" AS "maxLevel",
        wcd."managerAccessEnabled" AS "managerAccessEnabled",
        wp."canManageExternalCenter" AS "canManageExternalCenter"
      FROM "WorkforceSeat" ws
      JOIN "WorkforcePosition" wp ON wp."id" = ws."positionId"
      JOIN "WorkforceDepartment" target ON target."code" = ${input.departmentCode}
      JOIN "WorkforceCenterDepartment" wcd
        ON wcd."organizationId" = ws."organizationId"
       AND wcd."departmentId" = target."id"
      WHERE ws."accountId" = ${input.accountId}::uuid
        AND ws."organizationId" = ${input.organizationId}::uuid
        AND ws."scope" = 'EXTERNAL_CENTER'
        AND ws."accessStatus" = 'ENABLED'
        AND target."status" = 'ENABLED'
        AND wcd."status" = 'ENABLED'
        AND (
          (wp."canManageExternalCenter" = TRUE AND wcd."managerAccessEnabled" = TRUE)
          OR target."id" = COALESCE(ws."technicalDepartmentId", wp."departmentId")
        )
      LIMIT 1
    `);

    const access = rows[0];
    if (!access) throw new ForbiddenException('No active center department access is assigned to this account.');

    if (LEVEL_WEIGHT[access.maxLevel] < LEVEL_WEIGHT[input.requiredLevel]) {
      throw new ForbiddenException(`This operation requires ${input.requiredLevel} center access.`);
    }

    return access;
  }

  async accessSnapshot(accountId: string, organizationId: string) {
    return this.db.$queryRaw<Array<RuntimeAccessRow & { departmentNameAr: string }>>(Prisma.sql`
      SELECT
        ws."id" AS "seatId",
        ws."organizationId" AS "organizationId",
        wcd."departmentId" AS "departmentId",
        target."code" AS "departmentCode",
        target."nameAr" AS "departmentNameAr",
        wcd."maxLevel" AS "maxLevel",
        wcd."managerAccessEnabled" AS "managerAccessEnabled",
        wp."canManageExternalCenter" AS "canManageExternalCenter"
      FROM "WorkforceSeat" ws
      JOIN "WorkforcePosition" wp ON wp."id" = ws."positionId"
      JOIN "WorkforceCenterDepartment" wcd ON wcd."organizationId" = ws."organizationId"
      JOIN "WorkforceDepartment" target ON target."id" = wcd."departmentId"
      WHERE ws."accountId" = ${accountId}::uuid
        AND ws."organizationId" = ${organizationId}::uuid
        AND ws."scope" = 'EXTERNAL_CENTER'
        AND ws."accessStatus" = 'ENABLED'
        AND target."status" = 'ENABLED'
        AND wcd."status" = 'ENABLED'
        AND (
          (wp."canManageExternalCenter" = TRUE AND wcd."managerAccessEnabled" = TRUE)
          OR target."id" = COALESCE(ws."technicalDepartmentId", wp."departmentId")
        )
      ORDER BY target."displayOrder" ASC
    `);
  }
}