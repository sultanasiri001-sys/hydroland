import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { assertEmploymentTransition } from './hr-policy';

@Injectable()
export class HrService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  employment(id: string) {
    return this.db.employment.findUnique({
      where: { id },
      include: { contracts: true, movements: true, leaveRequests: true, attendanceEntries: true, shifts: true, compensationTerms: true, performanceCycles: true, relationsCases: true, offboardingCases: true },
    });
  }

  async createEmployment(actorId: string, input: { accountId: string; organizationId: string; orgUnitId: string; positionId?: string; managerEmploymentId?: string; workerClass: any; startsAt?: string }) {
    const row = await this.db.employment.create({ data: { accountId: input.accountId, organizationId: input.organizationId, orgUnitId: input.orgUnitId, positionId: input.positionId, managerEmploymentId: input.managerEmploymentId, workerClass: input.workerClass, startsAt: input.startsAt ? new Date(input.startsAt) : undefined } });
    await this.audit.record({ actorId, action: 'HR_EMPLOYMENT_CREATED', resource: 'Employment', resourceId: row.id });
    return row;
  }

  async transition(actorId: string, id: string, status: any) {
    const current = await this.db.employment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Employment not found');
    try { assertEmploymentTransition(current.status, status); } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Invalid employment transition'); }
    const row = await this.db.employment.update({ where: { id }, data: { status, endsAt: status === 'TERMINATED' ? new Date() : undefined } });
    await this.audit.record({ actorId, action: 'HR_EMPLOYMENT_STATUS_CHANGED', resource: 'Employment', resourceId: id, metadata: { from: current.status, to: status } });
    return row;
  }

  async addContract(actorId: string, employmentId: string, input: { contractType: string; effectiveFrom: string; effectiveTo?: string; documentId?: string }) {
    const latest = await this.db.employmentContract.findFirst({ where: { employmentId }, orderBy: { version: 'desc' } });
    const row = await this.db.employmentContract.create({ data: { employmentId, version: (latest?.version ?? 0) + 1, contractType: input.contractType, effectiveFrom: new Date(input.effectiveFrom), effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined, documentId: input.documentId } });
    await this.audit.record({ actorId, action: 'HR_CONTRACT_CREATED', resource: 'EmploymentContract', resourceId: row.id });
    return row;
  }

  async requestLeave(actorId: string, employmentId: string, input: { type: string; startsAt: string; endsAt: string }) {
    if (new Date(input.endsAt) < new Date(input.startsAt)) throw new BadRequestException('Leave end must be after start');
    const row = await this.db.leaveRequest.create({ data: { employmentId, type: input.type, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), requestedByAccountId: actorId, status: 'SUBMITTED' } });
    await this.audit.record({ actorId, action: 'HR_LEAVE_REQUESTED', resource: 'LeaveRequest', resourceId: row.id });
    return row;
  }

  async attendance(actorId: string, employmentId: string, input: { workDate: string; clockInAt?: string; clockOutAt?: string; status?: string }) {
    const workDate = new Date(input.workDate);
    const row = await this.db.attendanceEntry.upsert({ where: { employmentId_workDate: { employmentId, workDate } }, create: { employmentId, workDate, clockInAt: input.clockInAt ? new Date(input.clockInAt) : undefined, clockOutAt: input.clockOutAt ? new Date(input.clockOutAt) : undefined, status: input.status ?? 'PENDING' }, update: { clockInAt: input.clockInAt ? new Date(input.clockInAt) : undefined, clockOutAt: input.clockOutAt ? new Date(input.clockOutAt) : undefined, status: input.status } });
    await this.audit.record({ actorId, action: 'HR_ATTENDANCE_RECORDED', resource: 'AttendanceEntry', resourceId: row.id });
    return row;
  }
  async createMovement(actorId: string, employmentId: string, input: { type: any; toOrgUnitId?: string; toPositionId?: string; effectiveAt?: string; reason?: string }) {
    const employment = await this.db.employment.findUnique({ where: { id: employmentId } });
    if (!employment) throw new NotFoundException('Employment not found');
    const row = await this.db.employmentMovement.create({ data: { employmentId, type: input.type, fromOrgUnitId: employment.orgUnitId, toOrgUnitId: input.toOrgUnitId, fromPositionId: employment.positionId, toPositionId: input.toPositionId, requestedByAccountId: actorId, effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined, reason: input.reason, status: 'SUBMITTED' } });
    await this.audit.record({ actorId, action: 'HR_MOVEMENT_REQUESTED', resource: 'EmploymentMovement', resourceId: row.id });
    return row;
  }

  async scheduleShift(actorId: string, employmentId: string, input: { startsAt: string; endsAt: string; shiftCode?: string }) {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new BadRequestException('Shift end must be after start');
    const row = await this.db.shiftAssignment.create({ data: { employmentId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), shiftCode: input.shiftCode } });
    await this.audit.record({ actorId, action: 'HR_SHIFT_SCHEDULED', resource: 'ShiftAssignment', resourceId: row.id });
    return row;
  }

  async approveLeave(actorId: string, id: string, approve: boolean) {
    const current = await this.db.leaveRequest.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Leave request not found');
    if (current.requestedByAccountId === actorId) throw new BadRequestException('HR_SELF_APPROVAL_DENIED');
    const row = await this.db.leaveRequest.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', approvedByAccountId: actorId } });
    await this.audit.record({ actorId, action: approve ? 'HR_LEAVE_APPROVED' : 'HR_LEAVE_REJECTED', resource: 'LeaveRequest', resourceId: id });
    return row;
  }

  async addCompensation(actorId: string, employmentId: string, input: { effectiveFrom: string; effectiveTo?: string; baseAmountMinor?: number; currency?: string; allowances?: object; benefits?: object }) {
    const row = await this.db.compensationTerm.create({ data: { employmentId, effectiveFrom: new Date(input.effectiveFrom), effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined, baseAmountMinor: input.baseAmountMinor, currency: input.currency ?? 'SAR', allowances: input.allowances as never, benefits: input.benefits as never, status: 'APPROVAL_REQUIRED' } });
    await this.audit.record({ actorId, action: 'HR_COMPENSATION_PROPOSED', resource: 'CompensationTerm', resourceId: row.id });
    return row;
  }

  async createPerformanceCycle(actorId: string, employmentId: string, input: { periodStart: string; periodEnd: string; goals?: object }) {
    if (new Date(input.periodEnd) <= new Date(input.periodStart)) throw new BadRequestException('Performance period end must be after start');
    const row = await this.db.performanceCycle.create({ data: { employmentId, periodStart: new Date(input.periodStart), periodEnd: new Date(input.periodEnd), goals: input.goals as never } });
    await this.audit.record({ actorId, action: 'HR_PERFORMANCE_CYCLE_CREATED', resource: 'PerformanceCycle', resourceId: row.id });
    return row;
  }

  async openRelationsCase(actorId: string, employmentId: string, input: { caseType: string; summary?: string }) {
    const row = await this.db.employeeRelationsCase.create({ data: { employmentId, caseType: input.caseType, openedByAccountId: actorId, summary: input.summary, status: 'SUBMITTED' } });
    await this.audit.record({ actorId, action: 'HR_EMPLOYEE_RELATIONS_CASE_OPENED', resource: 'EmployeeRelationsCase', resourceId: row.id });
    return row;
  }

  async openOffboarding(actorId: string, employmentId: string, input: { reason?: string; lastWorkingAt?: string }) {
    const row = await this.db.offboardingCase.create({ data: { employmentId, reason: input.reason, lastWorkingAt: input.lastWorkingAt ? new Date(input.lastWorkingAt) : undefined, status: 'SUBMITTED' } });
    await this.audit.record({ actorId, action: 'HR_OFFBOARDING_OPENED', resource: 'OffboardingCase', resourceId: row.id });
    return row;
  }

  async approveCompensation(actorId: string, id: string, approve: boolean) {
    const current = await this.db.compensationTerm.findUnique({ where: { id }, include: { employment: true } });
    if (!current) throw new NotFoundException('Compensation term not found');
    const row = await this.db.compensationTerm.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', approvedByAccountId: actorId } });
    await this.audit.record({ actorId, action: approve ? 'HR_COMPENSATION_APPROVED' : 'HR_COMPENSATION_REJECTED', resource: 'CompensationTerm', resourceId: id });
    return row;
  }

  async decideRelationsCase(actorId: string, id: string, approve: boolean, decision?: string) {
    const current = await this.db.employeeRelationsCase.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Employee relations case not found');
    if (current.openedByAccountId === actorId || current.reviewedByAccountId === actorId) throw new BadRequestException('HR_SEGREGATION_OF_DUTIES_DENIED');
    const row = await this.db.employeeRelationsCase.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', approvedByAccountId: actorId, decision } });
    await this.audit.record({ actorId, action: approve ? 'HR_RELATIONS_DECISION_APPROVED' : 'HR_RELATIONS_DECISION_REJECTED', resource: 'EmployeeRelationsCase', resourceId: id });
    return row;
  }

  async completeOffboarding(actorId: string, id: string, input: { clearance?: object; iamRevokedAt?: string }) {
    const current = await this.db.offboardingCase.findUnique({ where: { id }, include: { employment: true } });
    if (!current) throw new NotFoundException('Offboarding case not found');
    if (!input.iamRevokedAt) throw new BadRequestException('HR_IAM_REVOCATION_REQUIRED');
    const iamRevokedAt = new Date(input.iamRevokedAt);
    const row = await this.db.$transaction(async (tx) => {
      const closed = await tx.offboardingCase.update({ where: { id }, data: { status: 'CLOSED', clearance: input.clearance as never, iamRevokedAt, closedAt: new Date() } });
      if (current.employment.status === 'TERMINATED') await tx.employment.update({ where: { id: current.employmentId }, data: { status: 'OFFBOARDED' } });
      return closed;
    });
    await this.audit.record({ actorId, action: 'HR_OFFBOARDING_COMPLETED', resource: 'OffboardingCase', resourceId: id, metadata: { iamRevokedAt: iamRevokedAt.toISOString() } });
    return row;
  }

}
