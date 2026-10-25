import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OwnerAdministrativeDecisionController } from './owner-administrative-decision.controller';
import { DocumentFormService } from './document-form.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentPersistenceService } from './document-persistence.service';
import { DocumentPersistenceController } from './document-persistence.controller';
import { DocumentWorkflowReadinessController } from './document-workflow-readiness.controller';
import { DocumentTemplatePreviewController } from './document-template-preview.controller';
import { DocumentTemplateSetupController } from './document-template-setup.controller';
import { DocumentTemplateHistoryController } from './document-template-history.controller';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentListService } from './document-list.service';
import { DocumentPrintService } from './document-print.service';
import { DocumentPdfService } from './document-pdf.service';
import { DocumentBrandingService } from './document-branding.service';
import { DocumentAssetService } from './document-asset.service';
import { CooperationContractController } from './cooperation-contract.controller';
import { CooperationContractService } from './cooperation-contract.service';
import { ContractLibraryController } from './contract-library.controller';
import { ContractLibraryService } from './contract-library.service';
@Module({imports:[AuthModule],controllers:[OwnerAdministrativeDecisionController,DocumentPersistenceController,DocumentWorkflowReadinessController,DocumentTemplateSetupController,DocumentTemplateHistoryController,DocumentTemplatePreviewController,CooperationContractController,ContractLibraryController],providers:[DocumentFormService,DocumentLifecycleService,DocumentAuthorizationService,DocumentListService,DocumentPersistenceService,DocumentPrintService,DocumentPdfService,DocumentBrandingService,DocumentAssetService,CooperationContractService,ContractLibraryService],exports:[DocumentFormService,DocumentLifecycleService,DocumentListService,DocumentPersistenceService,DocumentPrintService,DocumentPdfService,DocumentBrandingService,DocumentAssetService]})
export class DocumentFormModule {}
