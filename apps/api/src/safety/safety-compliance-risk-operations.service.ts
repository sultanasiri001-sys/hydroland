import { BadRequestException, Injectable } from '@nestjs/common';
import { RiskRecord } from './safety-compliance-risk.domain';
import { SafetyComplianceRiskFoundationService } from './safety-compliance-risk-foundation.service';

export interface SafetyOperationalContext {
  organizationId: string;
  operationType: 'TRIP' | 'TRAINING' | 'RENTAL' | 'VESSEL' | 'CENTER_OPERATION';
  operationId: string;
  documentsValid: boolean;
  participantEligibility: boolean;
  equipmentReady: boolean;
  weatherCleared: boolean;
  permitsValid: boolean;
  openRisks: RiskRecord[];
}

export interface SafetyOperationalReadiness {
  allowed: boolean;
  decision: 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED' | 'NOT_ALLOWED';
  blockers: string[];
}

@Injectable()
export class SafetyComplianceRiskOperationsService {
  constructor(private readonly foundation: SafetyComplianceRiskFoundationService) {}

  readiness(context: SafetyOperationalContext): SafetyOperationalReadiness {
    if (!context.organizationId || !context.operationId) throw new BadRequestException('Operational safety scope is required.');
    context.openRisks.forEach((risk) => {
      this.foundation.validateRisk(risk);
      if (risk.organizationId !== context.organizationId) throw new BadRequestException('Risk organization scope mismatch.');
    });

    const blockers: string[] = [];
    if (!context.documentsValid) blockers.push('DOCUMENTS_INVALID');
    if (!context.participantEligibility) blockers.push('PARTICIPANT_NOT_ELIGIBLE');
    if (!context.equipmentReady) blockers.push('EQUIPMENT_NOT_READY');
    if (!context.weatherCleared) blockers.push('WEATHER_NOT_CLEARED');
    if (!context.permitsValid) blockers.push('PERMITS_INVALID');

    const critical = context.openRisks.some((risk) => risk.active && risk.level === 'CRITICAL');
    const high = context.openRisks.some((risk) => risk.active && risk.level === 'HIGH');
    if (critical) blockers.push('CRITICAL_OPEN_RISK');
    if (high) blockers.push('HIGH_OPEN_RISK');

    if (critical) return { allowed: false, decision: 'NOT_ALLOWED', blockers };
    if (blockers.length) return { allowed: false, decision: high ? 'REVIEW_REQUIRED' : 'DEFERRED', blockers };
    return { allowed: true, decision: 'ALLOWED', blockers: [] };
  }
}
