import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { WORKFORCE_CATALOG, WORKFORCE_TOTALS } from './workforce.catalog';

type DepartmentStatus = 'ENABLED' | 'DISABLED';
type WorkforceMode = 'DISABLED' | 'AI_ONLY' | 'HUMAN_ONLY' | 'HYBRID';
type SeatScope = 'HEADQUARTERS' | 'EXTERNAL_CENTER';
type SeatAccessStatus = 'LOCKED' | 'ENABLED' | 'SUSPENDED';
type CenterDepartmentStatus = 'LOCKED' | 'ENABLED';
type HiringDecision = 'APPROVE' | 'REJECT';
type HrHiringDecision = 'FORWARD' | 'RETURN' | 'REJECT';

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

  private async ensureCenterDepartments(organizationId: string) {
    const departments = await this.db.workforceDepartment.findMany({ select: { id: true } });
    for (const department of departments) {
      await this.db.workforceCenterDepartment.upsert({
        where: { organizationId_departmentId: { organizationId, departmentId: department.id } },
        create: { organizationId, departmentId: department.id, status: 'LOCKED', managerAccessEnabled: false },
        update: {},
      });
    }
  }

  private async assertHumanResourcesRequester(accountId: string) {
    const seat = await this.db.workforceSeat.findFirst({
      where: {
        accountId,
        scope: 'HEADQUARTERS',
        accessStatus: 'ENABLED',
        position: { department: { isHumanResources: true, status: 'ENABLED' } },
      },
      select: { id: true },
    });
    if (!seat) throw new ForbiddenException('An active headquarters Human Resources seat is required for this review.');
  }

  private async hiringRequestSource(accountId: string, organizationId: string, departmentId: string, candidateAccountId: string) {
    if (candidateAccountId === accountId) return 'CANDIDATE' as const;
    const hrSeat = await this.db.workforceSeat.findFirst({ where: { accountId, scope: 'HEADQUARTERS', accessStatus: 'ENABLED', position: { department: { isHumanResources: true, status: 'ENABLED' } } }, select: { id: true } });
    if (hrSeat) return 'HUMAN_RESOURCES' as const;
    const managerSeat = await this.db.workforceSeat.findFirst({ where: { accountId, organizationId, scope: 'EXTERNAL_CENTER', accessStatus: 'ENABLED', position: { canManageExternalCenter: true } }, select: { id: true } });
    if (managerSeat) {
      const access = await this.db.workforceCenterDepartment.findUnique({ where: { organizationId_departmentId: { organizationId, departmentId } }, select: { status: true, managerAccessEnabled: true } });
      if (access?.status !== 'ENABLED' || !access.managerAccessEnabled) throw new ForbiddenException('The center manager is not authorized for this department.');
      return 'CENTER_MANAGER' as const;
    }
    throw new ForbiddenException('Only the candidate, an authorized center manager, or Human Resources can submit this request.');
  }

  async structure() {
    await this.ensureCatalog();
    const initializedOrganizations = await this.db.workforceSeat.findMany({ where: { scope: 'EXTERNAL_CENTER', organizationId: { not: null } }, select: { organizationId: true }, distinct: ['organizationId'] });
    for (const item of initializedOrganizations) if (item.organizationId) await this.ensureCenterDepartments(item.organizationId);
    const [departments, organizations, accounts, centerDepartments, hiringRequests] = await Promise.all([
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
      this.db.workforceCenterDepartment.findMany({
        include: { department: { select: { id: true, code: true, nameAr: true, status: true, displayOrder: true } } },
        orderBy: [{ organizationId: 'asc' }, { department: { displayOrder: 'asc' } }],
      }),
      this.db.workforceHiringRequest.findMany({
        include: {
          organization: { select: { id: true, displayName: true } },
          department: { select: { id: true, code: true, nameAr: true } },
          position: { select: { id: true, code: true, titleAr: true } },
          candidateAccount: { select: { id: true, email: true, status: true, person: { select: { firstName: true, lastName: true } } } },
          requestedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } },
          hrReviewedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } },
          reviewedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);
    const seats = departments.flatMap((department) => department.positions.flatMap((position) => position.seats));
    return {
      totals: {
        ...WORKFORCE_TOTALS,
        humanSeatTemplates: WORKFORCE_TOTALS.managers + WORKFORCE_TOTALS.assistants,
        seats: seats.length,
        enabledHumanSeats: seats.filter((seat) => seat.accessStatus === 'ENABLED').length,
        externalCenterSeats: seats.filter((seat) => seat.scope === 'EXTERNAL_CENTER').length,
        pendingHiringRequests: hiringRequests.filter((request) => request.status === 'PENDING_EXECUTIVE_APPROVAL').length,
        enabledCenterDepartments: centerDepartments.filter((item) => item.status === 'ENABLED').length,
      },
      departments,
      organizations,
      accounts,
      centerDepartments,
      hiringRequests,
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
        await tx.workforceCenterDepartment.updateMany({ where: { departmentId }, data: { status: 'LOCKED', managerAccessEnabled: false, activatedAt: null, lockedAt: new Date(), updatedById: actorId } });
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
    if (scope === 'EXTERNAL_CENTER' && input.accountId) throw new BadRequestException('Center employees must be assigned through an approved Human Resources hiring request.');
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
    const account = accountId ? await this.db.account.findUnique({ where: { id: accountId }, select: { id: true, status: true } }) : null;
    if (accountId && !account) throw new NotFoundException('Account not found.');
    if (seat.scope === 'EXTERNAL_CENTER' && accountId && accountId !== seat.accountId) {
      const approval = await this.db.workforceHiringRequest.findFirst({
        where: { organizationId: seat.organizationId!, positionId: seat.positionId, candidateAccountId: accountId, status: 'APPROVED' },
        select: { id: true },
      });
      if (!approval) throw new BadRequestException('An approved Human Resources hiring request is required before assigning this center employee.');
    }
    if (accessStatus === 'ENABLED') {
      if (!accountId) throw new BadRequestException('Assign a user before enabling the seat.');
      if (account?.status !== 'ACTIVE') throw new BadRequestException('The assigned account must be active before enabling the seat.');
      if (seat.position.department.status !== 'ENABLED') throw new BadRequestException('Enable the headquarters department first.');
      if (seat.scope === 'HEADQUARTERS' && !seat.position.humanEnabled) throw new BadRequestException('Enable the human position first.');
      if (seat.scope === 'EXTERNAL_CENTER') {
        if (seat.position.canManageExternalCenter) {
          const delegatedDepartment = await this.db.workforceCenterDepartment.findFirst({ where: { organizationId: seat.organizationId!, status: 'ENABLED', managerAccessEnabled: true } });
          if (!delegatedDepartment) throw new BadRequestException('Grant the center manager access to at least one enabled department first.');
        } else {
          const centerDepartment = await this.db.workforceCenterDepartment.findUnique({
            where: { organizationId_departmentId: { organizationId: seat.organizationId!, departmentId: seat.technicalDepartmentId || seat.position.departmentId } },
          });
          if (centerDepartment?.status !== 'ENABLED') throw new BadRequestException('Enable this department for the external center first.');
        }
      }
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

  async setCenterDepartmentAccess(actorId: string, organizationId: string, departmentId: string, input: { status?: CenterDepartmentStatus; managerAccessEnabled?: boolean }) {
    await this.ensureCatalog();
    const [organization, department] = await Promise.all([
      this.db.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      this.db.workforceDepartment.findUnique({ where: { id: departmentId } }),
    ]);
    if (!organization) throw new NotFoundException('External center not found.');
    if (!department) throw new NotFoundException('Department not found.');
    await this.ensureCenterDepartments(organizationId);
    const current = await this.db.workforceCenterDepartment.findUnique({ where: { organizationId_departmentId: { organizationId, departmentId } } });
    const status = input.status ?? current!.status;
    const requestedManagerAccess = input.managerAccessEnabled ?? current!.managerAccessEnabled;
    const managerAccessEnabled = status === 'ENABLED' ? requestedManagerAccess : false;
    if (!['LOCKED', 'ENABLED'].includes(status)) throw new BadRequestException('Invalid center department status.');
    if (status === 'ENABLED' && department.status !== 'ENABLED') throw new BadRequestException('Enable the headquarters department before enabling it for a center.');
    const updated = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.workforceCenterDepartment.update({
        where: { organizationId_departmentId: { organizationId, departmentId } },
        data: {
          status,
          managerAccessEnabled: status === 'LOCKED' ? false : managerAccessEnabled,
          updatedById: actorId,
          activatedAt: status === 'ENABLED' ? new Date() : null,
          lockedAt: status === 'LOCKED' ? new Date() : null,
        },
      });
      if (status === 'LOCKED') {
        await tx.workforceSeat.updateMany({
          where: { organizationId, scope: 'EXTERNAL_CENTER', technicalDepartmentId: departmentId, position: { canManageExternalCenter: false } },
          data: { accessStatus: 'LOCKED', enabledAt: null, disabledAt: new Date() },
        });
      }
      return row;
    });
    await this.audit.record({ actorId, action: 'CENTER_DEPARTMENT_ACCESS_CHANGED', resource: 'Organization', resourceId: organizationId, metadata: { departmentId, status, managerAccessEnabled: updated.managerAccessEnabled } });
    return updated;
  }

  async setAllCenterDepartmentAccess(actorId: string, organizationId: string, input: { status?: CenterDepartmentStatus; managerAccessEnabled?: boolean }) {
    await this.ensureCatalog();
    const organization = await this.db.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) throw new NotFoundException('External center not found.');
    await this.ensureCenterDepartments(organizationId);
    const departments = await this.db.workforceDepartment.findMany({ select: { id: true, status: true, centerDepartments: { where: { organizationId }, select: { status: true }, take: 1 } } });
    await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const department of departments) {
        const requestedStatus = input.status;
        const status = requestedStatus === 'ENABLED' && department.status !== 'ENABLED' ? 'LOCKED' : requestedStatus;
        const effectiveStatus = status ?? department.centerDepartments[0]?.status ?? 'LOCKED';
        const data: Prisma.WorkforceCenterDepartmentUpdateInput = { updatedBy: { connect: { id: actorId } } };
        if (status) {
          data.status = status;
          data.activatedAt = status === 'ENABLED' ? new Date() : null;
          data.lockedAt = status === 'LOCKED' ? new Date() : null;
        }
        if (input.managerAccessEnabled !== undefined) data.managerAccessEnabled = effectiveStatus === 'ENABLED' ? input.managerAccessEnabled : false;
        if (status === 'LOCKED') data.managerAccessEnabled = false;
        await tx.workforceCenterDepartment.update({ where: { organizationId_departmentId: { organizationId, departmentId: department.id } }, data });
      }
      if (input.status === 'LOCKED') {
        await tx.workforceSeat.updateMany({ where: { organizationId, scope: 'EXTERNAL_CENTER', position: { canManageExternalCenter: false } }, data: { accessStatus: 'LOCKED', enabledAt: null, disabledAt: new Date() } });
      }
    });
    await this.audit.record({ actorId, action: 'CENTER_ALL_DEPARTMENT_ACCESS_CHANGED', resource: 'Organization', resourceId: organizationId, metadata: input });
    return this.db.workforceCenterDepartment.findMany({ where: { organizationId }, include: { department: true }, orderBy: { department: { displayOrder: 'asc' } } });
  }

  async createHiringRequest(actorId: string, input: { organizationId?: string; positionId?: string; candidateAccountId?: string; justification?: string }) {
    if (!input.organizationId || !input.positionId || !input.candidateAccountId) throw new BadRequestException('Center, position, and candidate account are required.');
    const [organization, position, candidate] = await Promise.all([
      this.db.organization.findUnique({ where: { id: input.organizationId }, select: { id: true, status: true } }),
      this.db.workforcePosition.findUnique({ where: { id: input.positionId }, include: { department: true } }),
      this.db.account.findUnique({ where: { id: input.candidateAccountId }, select: { id: true, status: true } }),
    ]);
    if (!organization) throw new NotFoundException('External center not found.');
    if (!position) throw new NotFoundException('Position not found.');
    if (!candidate) throw new NotFoundException('Candidate account not found.');
    if (organization.status !== 'ACTIVE') throw new BadRequestException('External center must be active.');
    if (position.department.status !== 'ENABLED') throw new BadRequestException('The headquarters department must be enabled before recruiting for this position.');
    if (candidate.status !== 'ACTIVE') throw new BadRequestException('Candidate account must be active.');
    await this.ensureCenterDepartments(input.organizationId);
    const source = await this.hiringRequestSource(actorId, input.organizationId, position.departmentId, input.candidateAccountId);
    const duplicate = await this.db.workforceHiringRequest.findFirst({ where: { organizationId: input.organizationId, positionId: input.positionId, candidateAccountId: input.candidateAccountId, status: { in: ['PENDING_HR_REVIEW', 'HR_CHANGES_REQUIRED', 'PENDING_EXECUTIVE_APPROVAL'] } } });
    if (duplicate) throw new BadRequestException('A pending hiring request already exists for this candidate and position.');
    const request = await this.db.workforceHiringRequest.create({
      data: { organizationId: input.organizationId, departmentId: position.departmentId, positionId: position.id, candidateAccountId: input.candidateAccountId, requestedById: actorId, source, status: 'PENDING_HR_REVIEW', justification: input.justification?.trim() || null },
    });
    await this.audit.record({ actorId, action: 'CENTER_HIRING_REQUEST_SUBMITTED_TO_HR', resource: 'WorkforceHiringRequest', resourceId: request.id, metadata: { source, organizationId: input.organizationId, departmentId: position.departmentId, positionId: position.id, candidateAccountId: input.candidateAccountId } });
    return request;
  }

  async hiringContext(actorId: string) {
    await this.assertHumanResourcesRequester(actorId);
    await this.ensureCatalog();
    const [organizations, positions, accounts, requests] = await Promise.all([
      this.db.organization.findMany({ select: { id: true, displayName: true, status: true }, orderBy: { displayName: 'asc' } }),
      this.db.workforcePosition.findMany({ select: { id: true, titleAr: true, departmentId: true, department: { select: { nameAr: true } } }, orderBy: [{ department: { displayOrder: 'asc' } }, { displayOrder: 'asc' }] }),
      this.db.account.findMany({ where: { status: 'ACTIVE' }, select: { id: true, email: true, person: { select: { firstName: true, lastName: true, credentials: { include: { documents: true } } } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.db.workforceHiringRequest.findMany({ where: { status: { in: ['PENDING_HR_REVIEW', 'HR_CHANGES_REQUIRED', 'PENDING_EXECUTIVE_APPROVAL'] } }, include: { organization: true, department: true, position: true, candidateAccount: { include: { person: { include: { credentials: { include: { documents: true } } } } } }, requestedBy: { include: { person: true } } }, orderBy: { createdAt: 'asc' }, take: 200 }),
    ]);
    return { organizations, positions, accounts, requests };
  }

  async recruitmentContext(actorId: string) {
    await this.ensureCatalog();
    const [self, positions, organizations, managerSeats] = await Promise.all([
      this.db.account.findUnique({ where: { id: actorId }, select: { id: true, email: true, status: true, person: { select: { firstName: true, lastName: true } } } }),
      this.db.workforcePosition.findMany({ select: { id: true, titleAr: true, departmentId: true, department: { select: { nameAr: true, status: true } } }, orderBy: [{ department: { displayOrder: 'asc' } }, { displayOrder: 'asc' }] }),
      this.db.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true, displayName: true }, orderBy: { displayName: 'asc' } }),
      this.db.workforceSeat.findMany({ where: { accountId: actorId, scope: 'EXTERNAL_CENTER', accessStatus: 'ENABLED', position: { canManageExternalCenter: true } }, select: { organizationId: true, organization: { select: { id: true, displayName: true } } } }),
    ]);
    if (!self) throw new NotFoundException('Account not found.');
    const managerOrganizations = managerSeats.flatMap((seat) => seat.organization ? [seat.organization] : []);
    const managerAccounts = managerOrganizations.length ? await this.db.account.findMany({ where: { status: 'ACTIVE' }, select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }) : [];
    const requests = await this.db.workforceHiringRequest.findMany({ where: { OR: [{ requestedById: actorId }, { candidateAccountId: actorId }] }, include: { organization: true, department: true, position: true, candidateAccount: { include: { person: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { self, positions: positions.filter((item) => item.department.status === 'ENABLED'), organizations, managerOrganizations, managerAccounts, requests };
  }

  async resubmitHiringRequest(actorId: string, requestId: string, justification?: string) {
    const request = await this.db.workforceHiringRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Hiring request not found.');
    if (request.status !== 'HR_CHANGES_REQUIRED') throw new BadRequestException('Only requests returned by Human Resources can be resubmitted.');
    const manager = await this.db.workforceSeat.findFirst({ where: { accountId: actorId, organizationId: request.organizationId, scope: 'EXTERNAL_CENTER', accessStatus: 'ENABLED', position: { canManageExternalCenter: true } }, select: { id: true } });
    if (request.requestedById !== actorId && request.candidateAccountId !== actorId && !manager) throw new ForbiddenException('You cannot resubmit this hiring request.');
    const updated = await this.db.workforceHiringRequest.update({ where: { id: requestId }, data: { status: 'PENDING_HR_REVIEW', justification: justification?.trim() || request.justification, hrReviewedById: null, hrReviewedAt: null, hrVerification: Prisma.JsonNull } });
    await this.audit.record({ actorId, action: 'HIRING_REQUEST_RESUBMITTED_TO_HR', resource: 'WorkforceHiringRequest', resourceId: requestId });
    return updated;
  }

  async reviewHiringRequestByHr(actorId: string, requestId: string, input: { decision?: HrHiringDecision; note?: string; verification?: { identityVerified?: boolean; documentsComplete?: boolean; credentialsVerified?: boolean; qualificationMatched?: boolean; positionRequirementsMet?: boolean } }) {
    await this.assertHumanResourcesRequester(actorId);
    if (!input.decision || !['FORWARD', 'RETURN', 'REJECT'].includes(input.decision)) throw new BadRequestException('Invalid Human Resources decision.');
    if (input.decision !== 'FORWARD' && !input.note?.trim()) throw new BadRequestException('Human Resources must provide a reason for returning or rejecting the request.');
    const request = await this.db.workforceHiringRequest.findUnique({ where: { id: requestId }, include: { candidateAccount: { include: { person: { include: { credentials: { include: { documents: true } } } } } } } });
    if (!request) throw new NotFoundException('Hiring request not found.');
    if (request.status !== 'PENDING_HR_REVIEW') throw new BadRequestException('This request is not awaiting Human Resources review.');
    const verification = {
      identityVerified: Boolean(input.verification?.identityVerified),
      documentsComplete: Boolean(input.verification?.documentsComplete),
      credentialsVerified: Boolean(input.verification?.credentialsVerified),
      qualificationMatched: Boolean(input.verification?.qualificationMatched),
      positionRequirementsMet: Boolean(input.verification?.positionRequirementsMet),
    };
    if (input.decision === 'FORWARD') {
      if (!Object.values(verification).every(Boolean)) throw new BadRequestException('Complete every Human Resources verification item before forwarding.');
      const credentials = request.candidateAccount.person.credentials;
      const availableDocuments = credentials.flatMap((credential) => credential.documents).filter((document) => document.status === 'AVAILABLE');
      const validCredentials = credentials.filter((credential) => ['DOCUMENT_VERIFIED', 'VERIFIED'].includes(credential.verificationStatus) && (!credential.expiresAt || credential.expiresAt > new Date()));
      if (!availableDocuments.length) throw new BadRequestException('At least one available candidate document is required.');
      if (!validCredentials.length) throw new BadRequestException('At least one verified and unexpired credential is required.');
    }
    const status = input.decision === 'FORWARD' ? 'PENDING_EXECUTIVE_APPROVAL' : input.decision === 'RETURN' ? 'HR_CHANGES_REQUIRED' : 'REJECTED';
    const updated = await this.db.workforceHiringRequest.update({ where: { id: requestId }, data: { status, hrReviewedById: actorId, hrReviewedAt: new Date(), hrVerification: verification, hrNote: input.note?.trim() || null } });
    await this.audit.record({ actorId, action: input.decision === 'FORWARD' ? 'HR_HIRING_REQUEST_FORWARDED' : input.decision === 'RETURN' ? 'HR_HIRING_REQUEST_RETURNED' : 'HR_HIRING_REQUEST_REJECTED', resource: 'WorkforceHiringRequest', resourceId: requestId, metadata: { verification, note: input.note || null } });
    return updated;
  }

  async myCenterAccess(accountId: string) {
    const seats = await this.db.workforceSeat.findMany({
      where: { accountId, scope: 'EXTERNAL_CENTER', accessStatus: 'ENABLED' },
      include: {
        position: { select: { id: true, code: true, titleAr: true, permissions: true, canManageExternalCenter: true } },
        organization: { select: { id: true, displayName: true } },
        technicalDepartment: { select: { id: true, code: true, nameAr: true } },
      },
    });
    const result = [];
    for (const seat of seats) {
      if (!seat.organizationId) continue;
      if (seat.position.canManageExternalCenter) {
        const departments = await this.db.workforceCenterDepartment.findMany({
          where: { organizationId: seat.organizationId, status: 'ENABLED', managerAccessEnabled: true, department: { status: 'ENABLED' } },
          include: { department: { select: { id: true, code: true, nameAr: true } } },
          orderBy: { department: { displayOrder: 'asc' } },
        });
        result.push({ organization: seat.organization, seatId: seat.id, role: 'CENTER_MANAGER', position: seat.position, departments: departments.map((item) => item.department) });
        continue;
      }
      if (!seat.technicalDepartmentId) continue;
      const access = await this.db.workforceCenterDepartment.findUnique({ where: { organizationId_departmentId: { organizationId: seat.organizationId, departmentId: seat.technicalDepartmentId } }, include: { department: true } });
      if (access?.status === 'ENABLED' && access.department.status === 'ENABLED') result.push({ organization: seat.organization, seatId: seat.id, role: 'CENTER_EMPLOYEE', position: seat.position, departments: [seat.technicalDepartment] });
    }
    return result;
  }

  async reviewHiringRequest(actorId: string, requestId: string, decision: HiringDecision, reviewNote?: string) {
    if (!['APPROVE', 'REJECT'].includes(decision)) throw new BadRequestException('Invalid hiring decision.');
    const request = await this.db.workforceHiringRequest.findUnique({ where: { id: requestId }, include: { position: true, organization: true } });
    if (!request) throw new NotFoundException('Hiring request not found.');
    if (request.status !== 'PENDING_EXECUTIVE_APPROVAL') throw new BadRequestException('Hiring request has already been reviewed.');
    if (decision === 'REJECT') {
      const rejected = await this.db.workforceHiringRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', reviewedById: actorId, reviewedAt: new Date(), reviewNote: reviewNote?.trim() || null } });
      await this.audit.record({ actorId, action: 'EXECUTIVE_HIRING_REQUEST_REJECTED', resource: 'WorkforceHiringRequest', resourceId: requestId, metadata: { reviewNote: reviewNote || null } });
      return rejected;
    }
    await this.ensureCenterDepartments(request.organizationId);
    const managerPosition = await this.db.workforcePosition.findFirst({ where: { canManageExternalCenter: true }, select: { id: true } });
    const managerSeat = managerPosition ? await this.db.workforceSeat.findFirst({ where: { organizationId: request.organizationId, positionId: managerPosition.id, scope: 'EXTERNAL_CENTER' } }) : null;
    if (!managerSeat) throw new BadRequestException('Initialize the external center before approving hires.');
    const result = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      let targetSeat = await tx.workforceSeat.findFirst({ where: { organizationId: request.organizationId, positionId: request.positionId, scope: 'EXTERNAL_CENTER' } });
      if (targetSeat?.accountId && targetSeat.accountId !== request.candidateAccountId) throw new BadRequestException('This center position is already assigned to another employee.');
      if (!targetSeat) {
        targetSeat = await tx.workforceSeat.create({ data: { positionId: request.positionId, accountId: request.candidateAccountId, organizationId: request.organizationId, scope: 'EXTERNAL_CENTER', accessStatus: 'LOCKED', label: `موظف مركز خارجي: ${request.position.titleAr} · ${request.organization.displayName}`, administrativeManagerSeatId: managerSeat.id, technicalDepartmentId: request.departmentId } });
      } else {
        targetSeat = await tx.workforceSeat.update({ where: { id: targetSeat.id }, data: { accountId: request.candidateAccountId, accessStatus: 'LOCKED', administrativeManagerSeatId: targetSeat.id === managerSeat.id ? null : managerSeat.id, technicalDepartmentId: request.departmentId, enabledAt: null, disabledAt: new Date() } });
      }
      const approved = await tx.workforceHiringRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', reviewedById: actorId, reviewedAt: new Date(), reviewNote: reviewNote?.trim() || null, targetSeatId: targetSeat.id, assignedAt: new Date() } });
      return { approved, targetSeat };
    });
    await this.audit.record({ actorId, action: 'EXECUTIVE_HIRING_REQUEST_APPROVED', resource: 'WorkforceHiringRequest', resourceId: requestId, metadata: { targetSeatId: result.targetSeat.id, candidateAccountId: request.candidateAccountId } });
    return result;
  }

  async initializeExternalCenter(actorId: string, organizationId: string) {
    await this.ensureCatalog();
    const organization = await this.db.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found.');
    await this.ensureCenterDepartments(organizationId);
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
