import { BadRequestException, Injectable } from '@nestjs/common';
import { DigitalTrainingRecord, TrainingSession } from './training.domain';
import { TrainingEligibilityService, OperationalEligibilityInput } from './training-eligibility.service';

export interface TrainingResourceState {
  instructorAvailable: boolean;
  facilityAvailable: boolean;
  equipmentAvailable: boolean;
  safetyCleared: boolean;
  weatherCleared: boolean;
}

export interface TrainingOperationReadiness {
  ready: boolean;
  blockers: string[];
}

@Injectable()
export class TrainingOperationsService {
  constructor(private readonly eligibility: TrainingEligibilityService) {}

  readiness(eligibilityInput: OperationalEligibilityInput, resources: TrainingResourceState): TrainingOperationReadiness {
    const base = this.eligibility.evaluate(eligibilityInput);
    const blockers = [...base.blockers];
    if (!resources.instructorAvailable) blockers.push('INSTRUCTOR_UNAVAILABLE');
    if (!resources.facilityAvailable) blockers.push('FACILITY_UNAVAILABLE');
    if (!resources.equipmentAvailable) blockers.push('EQUIPMENT_UNAVAILABLE');
    if (!resources.safetyCleared) blockers.push('SAFETY_NOT_CLEARED');
    if (!resources.weatherCleared) blockers.push('WEATHER_NOT_CLEARED');
    return { ready: blockers.length === 0, blockers };
  }

  startSession(record: DigitalTrainingRecord, session: TrainingSession, readiness: TrainingOperationReadiness): TrainingSession {
    if (!readiness.ready) throw new BadRequestException('Training operation is not ready.');
    if (session.trainingRecordId !== record.id) throw new BadRequestException('Session does not belong to training record.');
    if (record.status === 'SUSPENDED' || record.status === 'COMPLETED') throw new BadRequestException('Training record cannot start a session.');
    if (session.status !== 'SCHEDULED' && session.status !== 'CHECK_IN_OPEN') throw new BadRequestException('Session cannot be started from its current state.');
    return { ...session, status: 'IN_PROGRESS', evidence: { ...session.evidence, startedAt: session.evidence.startedAt ?? new Date().toISOString() } };
  }

  completeSession(session: TrainingSession, endedAt = new Date().toISOString()): TrainingSession {
    if (session.status !== 'IN_PROGRESS') throw new BadRequestException('Only an active training session can be completed.');
    if (!session.evidence.studentCheckInAt || !session.evidence.instructorCheckInAt) throw new BadRequestException('Student and instructor check-in evidence is required.');
    return { ...session, status: 'COMPLETED', evidence: { ...session.evidence, endedAt } };
  }
}
