import { Body, Controller, Post } from '@nestjs/common';
import { ApprovalEngineService, ApprovalInstance, ApprovalDecision } from './approval-engine.service';
import { ApprovalWorkflowDefinition } from './domain';
import { EligibilityService, OperationalEligibilityInput } from './eligibility.service';
import { hasResourceConflict, ResourceReservation } from './resource-support.domain';

@Controller('governance')
export class GovernanceController {
  constructor(
    private readonly approvals: ApprovalEngineService,
    private readonly eligibility: EligibilityService,
  ) {}

  @Post('eligibility/evaluate')
  evaluateEligibility(@Body() input: OperationalEligibilityInput) {
    return this.eligibility.evaluate(input);
  }

  @Post('approvals/start')
  startApproval(
    @Body() input: { id: string; workflow: ApprovalWorkflowDefinition; resourceType: string; resourceId: string },
  ) {
    return this.approvals.start(input.id, input.workflow, input.resourceType, input.resourceId);
  }

  @Post('approvals/decide')
  decideApproval(
    @Body() input: { instance: ApprovalInstance; workflow: ApprovalWorkflowDefinition; decision: ApprovalDecision },
  ) {
    return this.approvals.decide(input.instance, input.workflow, input.decision);
  }

  @Post('resources/conflicts/check')
  checkResourceConflict(
    @Body() input: {
      candidate: Pick<ResourceReservation, 'resourceId' | 'startsAt' | 'endsAt'>;
      existing: ResourceReservation[];
    },
  ) {
    return { conflict: hasResourceConflict(input.candidate, input.existing) };
  }
}
