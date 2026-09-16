import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { WORKFORCE_CATALOG, WORKFORCE_TOTALS } from './workforce.catalog';

type DepartmentStatus = 'ENABLED' | 'DISABLED';
type WorkforceMode = 'DISABLED' | 'AI_ONLY' | 'HUMAN_ONLY' | 'HYBRID';
type SeatScope = 'HEADQUARTERS' | 'EXTERNAL_CENTER';
type SeatAccessStatus = 'LOCKED' | 'ENABLED' | 'SUSPENDED';

@Injectable()
export class WorkforceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async ensureCatalog() {
    for (const [departmentIndex, definition] of WORKFORCE_CATALOG.entries()) {
      const department = await this.db.workforceDepartment.upsert({
        where: { code: definition.code },
        create: {
          code: definition.code,
          nameAr: definition.nameAr,
          nameEn: definition.nameEn,
          description: definition.description,
          status: definition.enabled ? 'ENABLED' : 'DISABLED',
          isHumanResources: Boolean(definition.humanResources),
          displayOrder: departmentIndex + 1,
        },
        update: {
          nameAr: definition.nameAr,
          nameEn: definition.nameEn,
          description: definition.description,
          isHumanResources: Boolean(definition.humanResources),
          displayOrder: departmentIndex + 1,
        },
      });

      const manager = await this.upsertPosition(department.id, definition.manager, 'MANAGER', null, 1, definition.enabled);
      await this.ensureHeadquartersSeat(manager.id, department.id, definition.manager.titleAr);

      for (const [assistantIndex, assistant] of definition.assistants.entries()) {
        const position = await this.upsertPosition(department.id, assistant, 'ASSISTANT', manager.id, assistantIndex + 2, definition.enabled);
        await this.ensureHeadquartersSeat(position.id, department.id, assistant.titleAr);
      }
    }
  }

  private upsertPosition(
    departmentId: string,
    definition: { code: string; titleAr: string; titleEn: string; permissions: string[]; externalLiaisonEligible?: boolean; canManageExternalCenter?: boolean },
    tier: 'MANAGER' | 'ASSISTANT',
    parentPositionId: string | null,
    displayOrder: number,
    departmentEnabled: boolean,
  ) {
    return this.db.workforcePosition.upsert({
      where: { code: definition.code },
      create: {
        departmentId,
        code: definition.code,
        titleAr: definition.titleAr,
        titleEn: definition.titleEn,
        tier,
        parentPositionId,
        aiEnabled: departmentEnabled,
        humanEnabled: false,
        mode: departmentEnabled ? 'AI_ONLY' : 'DISABLED',
        externalLiaisonEligible: Boolean(definition.externalLiaisonEligible),
        canManageExternalCenter: Boolean(definition.canManageExternalCenter),
        permissions: definition.permissions,
        displayOrder,
      },
      update: {
        departmentId,
        titleAr: definition.titleAr,
        titleEn: definition.titleEn,
        tier,
        parentPositionId,
        externalLiaisonEligible: Boolean(definition.externalLiaisonEligible),
        canManageExternalCenter: Boolean(definition.canManageExternalCenter),
        permissions: definition.permissions,
        displayOrder,
      },
    });
  }

  private async ensureHeadquartersSeat(positionId: string, technicalDepartmentId: string, titleAr: string) {
    const existing = await this.db.workforceSeat.findFirst({ where: { positionId, scope: 'HEADQUARTERS', organizationId: null } });
    if (existing) return existing;
    return this.db.workforceSeat.create({
      data: {
        positionId,
        scope: 'HEADQUARTERS',
        accessStatus: 'LOCKED',
        label: `المقعد البشري: ${titleAr}`,
        technicalDepartmentId,
      },
    });
  }

  async structure() {
    await this.ensureCatalog();
    const [departments, organizations, accounts] = await Promise.all([
      this.db.workforceDepartment.findMany({
        include: {
          positions: {
            include: {
              seats: {
                include: {
                  account: { select: { id: true, email: true, status: true, person: { select: { firstName: true, lastName: true } } } },
                  organization: { select: { id: true, displayName: true, kind: true, status: true } },
                  technicalDepartment: { select: { id: true, code: true, nameAr: true } },
                },
                orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
              },
            },
            orderBy: [{ tier: 'asc' }, { displayOrder: 'asc' }],
          },
        },
        orderBy: { displayOrder: 'asc' },
      }),
      this.db.organization.findMany({ select: { id: true, displayName: true, kind: true, status: true, regionCode: true }, orderBy: { displayName: 'asc' }, take: 200 }),
      this.db.account.findMany({ select: { id: true, email: true, status: true, person: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);
    const seats = departments.flatMap((department) => department.positions.flatMap((position) => position.seats));
    return {
      totals: {
        ...WORKFORCE_TOTALS,
        humanSeatTemplates: WORKFORCE_TOTALS.managers + WORKFORCE_TOTALS.assistants,
        seats: seats.length,
        enabledHumanSeats: seats.filter((seat) => seat.accessStatus === 'ENABLED').length,
        externalCenterSeats: seats.filter((seat) => seat.scope === 'EXTERNAL_CENTER').length,
      },
      departments,
      organizations,
      accounts,
    };
  }

  async setDepartmentStatus(actorId: string, departmentId: string, status: DepartmentStatus) {
    if (!['ENABLED', 'DISABLED'].includes(status)) throw new BadRequestException('Invalid department status.');
    const department = await this.db.workforceDepartment.findUnique({ where: { id: departmentId } });
    if (!department) throw new NotFoundException('Department not found.');
    await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.workforceDepartment.update({ where: { id: departmentId }, data: { status } });
      if (status === 'DISABLED') {
        const positions = await tx.workforcePosition.findMany({ where: { departmentId }, select: { id: true } });
        const positionIds = positions.map((position) => position.id);
        await tx.workforcePosition.updateMany({ where: { departmentId }, data: { aiEnabled: false, humanEnabled: false, mode: 'DISABLED' } });
        await tx.workforceSeat.updateMany({ where: { positionId: { in: positionIds } }, data: { accessStatus: 'LOCKED', enabledAt: null, disabledAt: new Date() } });
      }
    });
    await this.audit.record({ actorId, action: 'WORKFORCE_DEPARTMENT_STATUS_CHANGED', resource: 'WorkforceDepartment', resourceId: departmentId, metadata: { code: department.code, status } });
    return this.db.workforceDepartment.findUnique({ where: { id: departmentId } });
  }

  async setPositionMode(actorId: string, positionId: string, input: { aiEnabled?: boolean; humanEnabled?: boolean; mode?: WorkforceMode }) {
    const position = await this.db.workforcePosition.findUnique({ where: { id: positionId }, include: { department: true } });
    if (!position) throw new NotFoundException('Position not found.');
    const aiEnabled = input.aiEnabled ?? position.aiEnabled;
    const humanEnabled = input.humanEnabled ?? position.humanEnabled;
    if (position.department.status === 'DISABLED' && (aiEnabled || humanEnabled)) throw new BadRequestException('Enable the department first.');
    const derivedMode: WorkforceMode = aiEnabled && humanEnabled ? 'HYBRID' : humanEnabled ? 'HUMAN_ONLY' : aiEnabled ? 'AI_ONLY' : 'DISABLED';
    const mode = input.mode ?? derivedMode;
    if (!['DISABLED', 'AI_ONLY', 'HUMAN_ONLY', 'HYBRID'].includes(mode)) throw new BadRequestException('Invalid workforce mode.');
    if ((mode === 'DISABLED' && (aiEnabled || humanEnabled)) || (mode === 'AI_ONLY' && (!aiEnabled || humanEnabled)) || (mode === 'HUMAN_ONLY' && (aiEnabled || !humanEnabled)) || (mode === 'HYBRID' && (!aiEnabled || !humanEnabled))) {
      throw new BadRequestException('Workforce mode does not match AI and human switches.');
    }
    const updated = await this.db.workforcePosition.update({ where: { id: positionId }, data: { aiEnabled, humanEnabled, mode } });
    if (!humanEnabled) await this.db.workforceSeat.updateMany({ where: { positionId }, data: { accessStatus: 'LOCKED', enabledAt: null, disabledAt: new Date() } });
    await this.audit.record({ actorId, action: 'WORKFORCE_POSITION_MODE_CHANGED', resource: 'WorkforcePosition', resourceId: positionId, metadata: { code: position.code, aiEnabled, humanEnabled, mode } });
    return updated;
  }

  async createSeat(actorId: string, input: {
    positionId?: string; accountId?: string | null; organizationId?: string | null; scope?: SeatScope; label?: string;
    administrativeManagerSeatId?: string | null; technicalDepartmentId?: string | null;
  }) {
    if (!input.positionId) throw new BadRequestException('Position is required.');
    const position = await this.db.workforcePosition.findUnique({ where: { id: input.positionId }, include: { department: true } });
    if (!position) throw new NotFoundException('Position not found.');
    const scope = input.scope ?? (input.organizationId ? 'EXTERNAL_CENTER' : 'HEADQUARTERS');
    if (scope === 'EXTERNAL_CENTER' && !input.organizationId) throw new BadRequestException('External center seat requires an organization.');
    if (input.accountId && !(await this.db.account.findUnique({ where: { id: input.accountId }, select: { id: true } }))) throw new NotFoundException('Account not found.');
    if (input.organizationId && !(await this.db.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } }))) throw new NotFoundException('Organization not found.');
    const seat = await this.db.workforceSeat.create({
      data: {
        positionId: position.id,
        accountId: input.accountId || null,
        organizationId: input.organizationId || null,
        scope,
        accessStatus: 'LOCKED',
        label: input.label?.trim() || `المقعد البشري: ${position.titleAr}`,
        administrativeManagerSeatId: input.administrativeManagerSeatId || null,
        technicalDepartmentId: input.technicalDepartmentId || position.departmentId,
      },
    });
    await this.audit.record({ actorId, action: 'WORKFORCE_SEAT_CREATED', resource: 'WorkforceSeat', resourceId: seat.id, metadata: { positionId: position.id, scope, organizationId: input.organizationId || null } });
    return seat;
  }

  async updateSeat(actorId: string, seatId: string, input: {
    accountId?: string | null; accessStatus?: SeatAccessStatus; label?: string; administrativeManagerSeatId?: string | null; technicalDepartmentId?: string | null;
  }) {
    const seat = await this.db.workforceSeat.findUnique({ where: { id: seatId }, include: { position: { include: { department: true } } } });
    if (!seat) throw new NotFoundException('Seat not found.');
    const accountId = input.accountId === undefined ? seat.accountId : input.accountId;
    const accessStatus = input.accessStatus ?? seat.accessStatus;
    if (!['LOCKED', 'ENABLED', 'SUSPENDED'].includes(accessStatus)) throw new BadRequestException('Invalid seat status.');
    if (accountId && !(await this.db.account.findUnique({ where: { id: accountId }, select: { id: true } }))) throw new NotFoundException('Account not found.');
    if (accessStatus === 'ENABLED') {
      if (!accountId) throw new BadRequestException('Assign a user before enabling the seat.');
      if (!seat.position.humanEnabled || seat.position.department.status !== 'ENABLED') throw new BadRequestException('Enable the department and human position first.');
    }
    const updated = await this.db.workforceSeat.update({
      where: { id: seatId },
      data: {
        accountId,
        accessStatus,
        label: input.label?.trim() || seat.label,
        administrativeManagerSeatId: input.administrativeManagerSeatId === undefined ? seat.administrativeManagerSeatId : input.administrativeManagerSeatId,
        technicalDepartmentId: input.technicalDepartmentId === undefined ? seat.technicalDepartmentId : input.technicalDepartmentId,
        enabledAt: accessStatus === 'ENABLED' ? new Date() : null,
        disabledAt: accessStatus === 'ENABLED' ? null : new Date(),
      },
    });
    await this.audit.record({ actorId, action: 'WORKFORCE_SEAT_STATUS_CHANGED', resource: 'WorkforceSeat', resourceId: seatId, metadata: { accountId, accessStatus } });
    return updated;
  }

  async initializeExternalCenter(actorId: string, organizationId: string) {
    await this.ensureCatalog();
    const organization = await this.db.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found.');
    const managerPosition = await this.db.workforcePosition.findFirst({ where: { canManageExternalCenter: true } });
    if (!managerPosition) throw new NotFoundException('External center manager position is not configured.');
    let managerSeat = await this.db.workforceSeat.findFirst({ where: { organizationId, positionId: managerPosition.id, scope: 'EXTERNAL_CENTER' } });
    if (!managerSeat) {
      managerSeat = await this.db.workforceSeat.create({
        data: { positionId: managerPosition.id, organizationId, scope: 'EXTERNAL_CENTER', accessStatus: 'LOCKED', label: `مدير المركز الخارجي: ${organization.displayName}`, technicalDepartmentId: managerPosition.departmentId },
      });
    }
    const departments = await this.db.workforceDepartment.findMany({ include: { positions: { where: { externalLiaisonEligible: true }, orderBy: { displayOrder: 'asc' }, take: 1 } } });
    let created = 0;
    for (const department of departments) {
      const liaison = department.positions[0];
      if (!liaison || liaison.id === managerPosition.id) continue;
      const existing = await this.db.workforceSeat.findFirst({ where: { organizationId, positionId: liaison.id, scope: 'EXTERNAL_CENTER' } });
      if (existing) continue;
      await this.db.workforceSeat.create({
        data: {
          positionId: liaison.id,
          organizationId,
          scope: 'EXTERNAL_CENTER',
          accessStatus: 'LOCKED',
          label: `مساعد خارجي: ${department.nameAr} · ${organization.displayName}`,
          administrativeManagerSeatId: managerSeat.id,
          technicalDepartmentId: department.id,
        },
      });
      created += 1;
    }
    await this.audit.record({ actorId, action: 'EXTERNAL_CENTER_WORKFORCE_INITIALIZED', resource: 'Organization', resourceId: organizationId, metadata: { managerSeatId: managerSeat.id, liaisonSeatsCreated: created } });
    return { organizationId, managerSeatId: managerSeat.id, liaisonSeatsCreated: created };
  }
}
