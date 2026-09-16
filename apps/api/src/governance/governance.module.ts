import { Module } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { PolicyEngineService } from './policy-engine.service';

@Module({
  providers: [PolicyEngineService, GovernanceService],
  exports: [PolicyEngineService, GovernanceService],
})
export class GovernanceModule {}
