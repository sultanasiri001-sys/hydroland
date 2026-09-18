import { BadRequestException, Injectable } from '@nestjs/common';
import { SkillProgressStatus } from './domain';
import { CourseSuspensionRequest, DigitalTrainingRecord, InstructorTransfer, TrainingSession, TrainingSkillRecord } from './training.domain';

@Injectable()
export class TrainingWorkflowService {
  signOffSkill(skill: TrainingSkillRecord, instructorId: string, at = new Date().toISOString()): TrainingSkillRecord {
    if (!instructorId) throw new BadRequestException('Instructor identity is required.');
    if (skill.status === 'COMPLETED') throw new BadRequestException('Completed skill cannot be silently re-signed.');
    return { ...skill, status: SkillProgressStatus.COMPLETED, signedOffByInstructorId: instructorId, signedOffAt: at };
  }

  acknowledgeSkill(skill: TrainingSkillRecord, studentId: string, objection?: string, at = new Date().toISOString()): TrainingSkillRecord {
    if (!studentId) throw new BadRequestException('Student identity is required.');
    if (!skill.signedOffByInstructorId || !skill.signedOffAt) throw new BadRequestException('Instructor sign-off is required before student acknowledgement.');
    return { ...skill, studentAcknowledgedAt: at, studentObjection: objection?.trim() || undefined };
  }

  scheduleSession(record: DigitalTrainingRecord, session: TrainingSession): DigitalTrainingRecord {
    if (record.status === 'COMPLETED' || record.status === 'SUSPENDED') throw new BadRequestException('Training record is not schedulable.');
    if (session.trainingRecordId !== record.id) throw new BadRequestException('Session does not belong to the training record.');
    if (!record.stages.some((stage) => stage.id === session.stageId)) throw new BadRequestException('Session stage is not part of the training record.');
    return { ...record, status: record.status === 'NOT_STARTED' ? 'SCHEDULED' : record.status };
  }

  decideSuspension(request: CourseSuspensionRequest, decision: 'APPROVED' | 'MODIFIED' | 'REJECTED'): CourseSuspensionRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Suspension request is not pending.');
    return { ...request, status: decision };
  }

  transferInstructor(input: Omit<InstructorTransfer, 'transferredAt'>, approverIds: string[], at = new Date().toISOString()): InstructorTransfer {
    if (input.fromInstructorId === input.toInstructorId) throw new BadRequestException('Instructor transfer requires a different instructor.');
    if (!approverIds.length) throw new BadRequestException('Instructor transfer requires approval.');
    const overlap = input.completedSkillIds.some((id) => input.remainingSkillIds.includes(id));
    if (overlap) throw new BadRequestException('Completed and remaining skills must not overlap.');
    return { ...input, approvedBy: [...new Set(approverIds)], transferredAt: at };
  }
}
