import { Injectable } from '@nestjs/common';

export interface OperationalEligibilityInput {
  relationshipActive: boolean;
  contractActive: boolean;
  requiredCredentialsValid: boolean;
  requiredDocumentsValid: boolean;
  centerAuthorized: boolean;
  rolePermitted: boolean;
  resourceAvailable: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  blockers: string[];
}

@Injectable()
export class EligibilityService {
  evaluate(input: OperationalEligibilityInput): EligibilityResult {
    const blockers: string[] = [];
    if (!input.relationshipActive) blockers.push('RELATIONSHIP_INACTIVE');
    if (!input.contractActive) blockers.push('CONTRACT_INACTIVE');
    if (!input.requiredCredentialsValid) blockers.push('CREDENTIALS_INVALID');
    if (!input.requiredDocumentsValid) blockers.push('DOCUMENTS_INVALID');
    if (!input.centerAuthorized) blockers.push('CENTER_NOT_AUTHORIZED');
    if (!input.rolePermitted) blockers.push('ROLE_NOT_PERMITTED');
    if (!input.resourceAvailable) blockers.push('RESOURCE_UNAVAILABLE');
    return { eligible: blockers.length === 0, blockers };
  }
}
