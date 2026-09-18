import { Injectable } from '@nestjs/common';
import { SkillProgressStatus } from './domain';
import { DigitalTrainingRecord, TrainingSession } from './training.domain';

export interface TrainingGovernanceSnapshot {
  trainingRecordId: string;
  completionPercent: number;
  completedSessions: number;
  activeSessions: number;
  suspended: boolean;
  alerts: string[];
  generatedAt: string;
}

@Injectable()
export class TrainingGovernanceService {
  snapshot(record: DigitalTrainingRecord, sessions: TrainingSession[], at = new Date().toISOString()): TrainingGovernanceSnapshot {
    const skills = record.stages.flatMap((stage) => stage.skills);
    const completedSkills = skills.filter((skill) => skill.status === SkillProgressStatus.COMPLETED).length;
    const relevantSessions = sessions.filter((session) => session.trainingRecordId === record.id);
    const alerts: string[] = [];

    if (record.status === 'SUSPENDED') alerts.push('TRAINING_SUSPENDED');
    if (skills.some((skill) => skill.status === SkillProgressStatus.NEEDS_REASSESSMENT)) alerts.push('SKILL_REMEDIATION_REQUIRED');
    if (relevantSessions.some((session) => session.status === 'IN_PROGRESS')) alerts.push('ACTIVE_SESSION');

    return {
      trainingRecordId: record.id,
      completionPercent: skills.length === 0 ? 0 : Math.round((completedSkills / skills.length) * 100),
      completedSessions: relevantSessions.filter((session) => session.status === 'COMPLETED').length,
      activeSessions: relevantSessions.filter((session) => session.status === 'IN_PROGRESS').length,
      suspended: record.status === 'SUSPENDED',
      alerts,
      generatedAt: at,
    };
  }

  automationSignals(snapshot: TrainingGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.suspended) signals.push('REQUIRE_MANAGEMENT_REVIEW');
    if (snapshot.alerts.includes('SKILL_REMEDIATION_REQUIRED')) signals.push('CREATE_REMEDIATION_FOLLOWUP');
    if (snapshot.completionPercent === 100) signals.push('CHECK_COMPLETION_ELIGIBILITY');
    return signals;
  }
}
