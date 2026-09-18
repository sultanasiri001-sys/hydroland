import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApprovalEngineService } from './approval-engine.service';
import { PolicyEngineService } from './policy-engine.service';

@Module({
  imports: [AuditModule],
  providers: [PolicyEngineService, ApprovalEngineService],
  exports: [PolicyEngineService, ApprovalEngineService, AuditModule],
})
export class GovernanceModule {}
