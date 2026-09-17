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
}
