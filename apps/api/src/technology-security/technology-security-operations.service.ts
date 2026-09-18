import { BadRequestException, Injectable } from '@nestjs/common';
import { CybersecurityFinding, TechnologyAsset, TechnologyService } from './technology-security.domain';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';

export type TechnologyOperationType = 'TRIP' | 'TRAINING' | 'PAYMENT' | 'BOOKING' | 'STORE' | 'CENTER_OPERATION' | 'INTEGRATION';

export interface TechnologyOperationalContext {
  organizationId: string;
  operationType: TechnologyOperationType;
  operationId: string;
  service: TechnologyService;
  assets: TechnologyAsset[];
  findings: CybersecurityFinding[];
  integrationAvailable: boolean;
}

export interface TechnologyOperationalReadiness {
  allowed: boolean;
  blockers: string[];
}

@Injectable()
export class TechnologySecurityOperationsService {
  constructor(private readonly foundation: TechnologySecurityFoundationService) {}

  readiness(context: TechnologyOperationalContext): TechnologyOperationalReadiness {
    if (!context.organizationId || !context.operationId) throw new BadRequestException('Operational technology scope is required.');
    this.foundation.validateService(context.service, context.assets);
    if (context.service.organizationId !== context.organizationId) throw new BadRequestException('Technology service organization mismatch.');

    const blockers: string[] = [];
    if (!context.service.active) blockers.push('TECHNOLOGY_SERVICE_INACTIVE');
    if (!context.integrationAvailable) blockers.push('INTEGRATION_UNAVAILABLE');

    for (const finding of context.findings) {
      const asset = context.assets.find((item) => item.id === finding.assetId);
      if (!asset) throw new BadRequestException('Cybersecurity finding asset is missing.');
      this.foundation.validateFinding(finding, asset);
      if (finding.organizationId !== context.organizationId) throw new BadRequestException('Cybersecurity finding organization mismatch.');
      if (finding.status === 'OPEN' || finding.status === 'MITIGATING') {
        if (finding.severity === 'CRITICAL') blockers.push('CRITICAL_SECURITY_FINDING');
        else if (finding.severity === 'HIGH') blockers.push('HIGH_SECURITY_FINDING');
      }
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: TechnologyOperationalContext): TechnologyOperationalReadiness {
    const readiness = this.readiness(context);
    if (!readiness.allowed) throw new BadRequestException(`Technology/security readiness blocked: ${readiness.blockers.join(', ')}`);
    return readiness;
  }
}
