import { Module } from '@nestjs/common';
import { LegalGovernanceFoundationService } from './legal-governance-foundation.service';
import { LegalGovernanceWorkflowService } from './legal-governance-workflow.service';
import { LegalGovernanceOperationsService } from './legal-governance-operations.service';
import { LegalGovernanceIntelligenceService } from './legal-governance-intelligence.service';
@Module({ providers:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService, LegalGovernanceIntelligenceService], exports:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService, LegalGovernanceIntelligenceService] })
export class LegalGovernanceModule {}
