import { Module } from '@nestjs/common';
import { LegalGovernanceFoundationService } from './legal-governance-foundation.service';
import { LegalGovernanceWorkflowService } from './legal-governance-workflow.service';
import { LegalGovernanceOperationsService } from './legal-governance-operations.service';
import { LegalGovernanceIntelligenceService } from './legal-governance-intelligence.service';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DepartmentReferencesController } from './department-references.controller';
import { DepartmentReferencesService } from './department-references.service';
@Module({ imports:[DatabaseModule, AuthModule, AdminModule], controllers:[DepartmentReferencesController], providers:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService, LegalGovernanceIntelligenceService, DepartmentReferencesService], exports:[LegalGovernanceFoundationService, LegalGovernanceWorkflowService, LegalGovernanceOperationsService, LegalGovernanceIntelligenceService] })
export class LegalGovernanceModule {}
