import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';
import { TechnologySecurityWorkflowService } from './technology-security-workflow.service';

@Module({
  providers: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService],
  exports: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService],
})
export class TechnologySecurityModule {}
