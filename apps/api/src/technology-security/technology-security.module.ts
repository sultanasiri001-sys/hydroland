import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';
import { TechnologySecurityWorkflowService } from './technology-security-workflow.service';
import { TechnologySecurityOperationsService } from './technology-security-operations.service';

@Module({
  providers: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService],
  exports: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService],
})
export class TechnologySecurityModule {}
