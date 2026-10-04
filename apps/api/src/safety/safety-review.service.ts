import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { safetyTripRevision, safetyTripSelect } from './safety-assessment-context';

type SafetyDecision = 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED';
const decisions: SafetyDecision[] = ['ALLOWED', 'REVIEW_REQUIRED', 'DEFERRED'];

@Injectable()
export class SafetyReviewService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  history(tripId: string) {
    return this.db.safetyChecklist.findMany({ where: { tripId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  async decide(reviewerAccountId: string, checklistId: string, decision: SafetyDecision, notes?: string, tripId?: string) {
    if (!decisions.includes(decision)) throw new BadRequestException('Invalid safety decision.');
    if (notes !== undefined && (typeof notes !== 'string' || notes.trim().length > 2000)) throw new BadRequestException('Invalid safety review notes.');
    return this.db.serializable(async tx => {
      if (!await tx.roleAssignment.findFirst({ where: { accountId: reviewerAccountId, role: { in: ['ADMIN', 'REVIEWER'] }, status: 'ACTIVE', account: { status: 'ACTIVE' } } })) throw new ForbiddenException('Active safety review authority required.');
      const checklist = await tx.safetyChecklist.findFirst({ where: { id: checklistId, ...(tripId ? { tripId } : {}) }, include: { trip: { select: safetyTripSelect } } });
      if (!checklist) throw new NotFoundException('Safety checklist not found for this trip.');
      const items = checklist.items && typeof checklist.items === 'object' && !Array.isArray(checklist.items) ? Object.values(checklist.items as Record<string, unknown>) : [];
      if (decision === 'ALLOWED') {
        if (!items.length || items.some(value => value !== true)) throw new ConflictException('Failed or incomplete safety checklist items cannot be marked ALLOWED.');
        const submission = await tx.auditEvent.findFirst({ where: { action: 'SAFETY_ASSESSMENT_CREATED', resource: 'SafetyChecklist', resourceId: checklistId }, orderBy: { occurredAt: 'asc' }, select: { metadata: true } });
        const context = submission?.metadata as Record<string, unknown> | null;
        if (context?.source === 'center') {
          const latest = await tx.safetyChecklist.findFirst({ where: { tripId: checklist.tripId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
          if (context.tripRevision !== safetyTripRevision(checklist.trip) || latest?.id !== checklistId || ['COMPLETED', 'CANCELLED'].includes(checklist.trip.status) || checklist.trip.startsAt <= new Date()) throw new ConflictException('تغير سياق الرحلة أو يوجد فحص أحدث. يلزم فحص جديد صالح قبل الاعتماد.');
        }
      }
      const savedNotes = notes?.trim() || checklist.notes;
      const updated = await tx.safetyChecklist.update({ where: { id: checklistId }, data: { decision, notes: savedNotes, decidedAt: new Date() } });
      await this.audit.record({ actorId: reviewerAccountId, action: 'SAFETY_DECISION_SET', resource: 'SafetyChecklist', resourceId: checklistId, metadata: { reviewerAccountId, tripId: checklist.tripId, previousDecision: checklist.decision, decision } }, tx);
      return updated;
    });
  }
}
