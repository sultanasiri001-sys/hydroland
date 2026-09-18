import { Module } from '@nestjs/common';
import { LegalGovernanceFoundationService } from './legal-governance-foundation.service';
import { LegalGovernanceWorkflowService } from './legal-governance-workflow.service';
@Module({ providers:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService], exports:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService] })
export class LegalGovernanceModule {}
