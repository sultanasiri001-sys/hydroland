import { Module } from '@nestjs/common';
import { ExecutiveGovernanceFoundationService } from './executive-governance-foundation.service';

@Module({
  providers: [ExecutiveGovernanceFoundationService],
  exports: [ExecutiveGovernanceFoundationService],
})
export class ExecutiveGovernanceModule {}
