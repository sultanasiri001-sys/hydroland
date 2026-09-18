import { Module } from '@nestjs/common';
import { LegalGovernanceFoundationService } from './legal-governance-foundation.service';
import { LegalGovernanceWorkflowService } from './legal-governance-workflow.service';
import { LegalGovernanceOperationsService } from './legal-governance-operations.service';
@Module({ providers:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService], exports:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService] })
export class LegalGovernanceModule {}
