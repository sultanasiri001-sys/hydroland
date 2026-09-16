import { Module } from '@nestjs/common';
import { ApprovalEngineService } from './approval-engine.service';
import { EligibilityService } from './eligibility.service';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
import { PolicyEngineService } from './policy-engine.service';

@Module({
  controllers: [GovernanceController],
  providers: [PolicyEngineService, GovernanceService, ApprovalEngineService, EligibilityService],
  exports: [PolicyEngineService, GovernanceService, ApprovalEngineService, EligibilityService],
})
export class GovernanceModule {}
