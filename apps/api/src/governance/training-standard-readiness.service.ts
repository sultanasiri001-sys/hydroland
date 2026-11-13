import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { assertTrainingStandardReady, standardRequest } from './training-standard-store';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Read-only adoption preflight. This never binds, upgrades or approves a course. */
@Injectable()
export class TrainingStandardReadinessService {
  constructor(private readonly db: DatabaseService, private readonly authorization: TrainingAuthorizationService) {}

  async read(actorId: string, enrollmentId: string) {
    if (typeof enrollmentId !== 'string' || !enrollmentId.trim() || enrollmentId.length > 100) throw new BadRequestException('مرجع دورة التدريب غير صالح.');
    const result = await this.db.serializable(async tx => {
      await this.authorization.assertAdministrativeEnrollmentAccess(actorId, enrollmentId, tx);
      const enrollment = await tx.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollmentId }, select: {
        id: true, courseCode: true, status: true, metadata: true, instructorAccountId: true, studentAccountId: true, centerOrganizationId: true,
        record: { select: { id: true, _count: { select: { sessions: true } } } },
      } });
      const sessions = enrollment.record?._count.sessions ?? 0;
      const signedSkills = enrollment.record ? await tx.trainingSkill.count({ where: {
        trainingStage: { trainingRecordId: enrollment.record.id }, signedOffAt: { not: null },
      } }) : 0;
      const binding = object(object(enrollment.metadata).trainingStandard);
      const hasStandardBinding = typeof binding.profileId === 'string' && Boolean(binding.profileId.trim());
      let prerequisitesSatisfied = false, reasonCode: string | null = null;
      try {
        await standardRequest(() => assertTrainingStandardReady(tx, enrollment, enrollment.instructorAccountId));
        prerequisitesSatisfied = true;
      } catch (error) {
        // An operational/query/programming failure must not become a readiness result.
        if (!(error instanceof ConflictException) && !(error instanceof ForbiddenException)) throw error;
        const response = object(error.getResponse());
        const known = ['STANDARD_SELECTION_REQUIRED', 'TRAINING_STANDARD_NOT_APPROVED', 'AGENCY_INSTRUCTOR_CREDENTIAL_REQUIRED'];
        reasonCode = typeof response.code === 'string' && known.includes(response.code) ? response.code : 'STANDARD_PREREQUISITES_REVIEW_REQUIRED';
      }
      const existingEvidence = sessions > 0 || signedSkills > 0;
      const existingCourseRequiresReview = !hasStandardBinding && (existingEvidence || !['PENDING', 'ACTIVE'].includes(enrollment.status));
      return {
        scope: 'READ_ONLY_STANDARD_ADOPTION_PREFLIGHT', previewOnly: true, operationalAuthorization: false,
        enrollmentId: enrollment.id, courseCode: enrollment.courseCode, courseStatus: enrollment.status,
        hasStandardBinding, standardPrerequisitesSatisfied: prerequisitesSatisfied,
        state: prerequisitesSatisfied ? 'STANDARD_PREREQUISITES_VALID' : !hasStandardBinding ? existingCourseRequiresReview ? 'EXISTING_COURSE_REVIEW_REQUIRED' : 'SOURCE_SELECTION_REQUIRED' : 'STANDARD_PREREQUISITES_BLOCKED',
        reasonCode, existingEvidence: { sessions, signedSkills },
        existingCourseRequiresReview, automaticHistoryAdoptionAllowed: false, asOf: new Date().toISOString(),
      };
    });
    // Recheck after asynchronous reading so a revoked operator does not receive
    // the buffered result. The same existing administrative scope is used.
    await this.authorization.assertAdministrativeEnrollmentAccess(actorId, enrollmentId);
    return result;
  }
}
