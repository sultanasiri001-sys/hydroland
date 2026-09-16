import { Injectable } from '@nestjs/common';
import { ApprovalWorkflowDefinition } from './domain';
import { ProfessionalCredential, SmartContract, TemporaryAssignment } from './workforce.domain';

export interface EligibilityInput {
  personActive: boolean;
  contract?: SmartContract;
  requiredCredentials: string[];
  credentials: ProfessionalCredential[];
  centerAuthorized: boolean;
  rolePermitted: boolean;
  at?: Date;
}

export interface ResourceBooking {
  resourceId: string;
  startsAt: string;
  endsAt: string;
}

@Injectable()
export class GovernanceService {
  isOperationallyEligible(input: EligibilityInput): boolean {
    if (!input.personActive || !input.contract || input.contract.status !== 'ACTIVE') return false;
    if (!input.centerAuthorized || !input.rolePermitted) return false;

    const at = input.at ?? new Date();
    if (at < new Date(input.contract.startsAt)) return false;
    if (input.contract.endsAt && at > new Date(input.contract.endsAt)) return false;

    return input.requiredCredentials.every((type) =>
      input.credentials.some((credential) =>
        credential.credentialType === type &&
        credential.status === 'VERIFIED' &&
        (!credential.expiresAt || at <= new Date(credential.expiresAt)),
      ),
    );
  }

  hasConflict(candidate: ResourceBooking, existing: ResourceBooking[]): boolean {
    const start = new Date(candidate.startsAt).getTime();
    const end = new Date(candidate.endsAt).getTime();
    return existing.some((booking) =>
      booking.resourceId === candidate.resourceId &&
      start < new Date(booking.endsAt).getTime() &&
      end > new Date(booking.startsAt).getTime(),
    );
  }

  activeApprovalSteps(workflow: ApprovalWorkflowDefinition): ApprovalWorkflowDefinition['steps'] {
    return workflow.steps.filter((step) => step.required).sort((a, b) => a.order - b.order);
  }

  assignmentIsActive(assignment: TemporaryAssignment, at = new Date()): boolean {
    return at >= new Date(assignment.startsAt) && at <= new Date(assignment.endsAt);
  }
}
