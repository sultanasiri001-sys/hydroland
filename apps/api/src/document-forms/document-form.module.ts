import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentFormService } from './document-form.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentPersistenceService } from './document-persistence.service';
import { DocumentPersistenceController } from './document-persistence.controller';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentPrintService } from './document-print.service';
import { DocumentPdfService } from './document-pdf.service';
import { DocumentBrandingService } from './document-branding.service';
import { DocumentAssetService } from './document-asset.service';
@Module({imports:[AuthModule],controllers:[DocumentPersistenceController],providers:[DocumentFormService,DocumentLifecycleService,DocumentAuthorizationService,DocumentPersistenceService,DocumentPrintService,DocumentPdfService,DocumentBrandingService,DocumentAssetService],exports:[DocumentFormService,DocumentLifecycleService,DocumentPersistenceService,DocumentPrintService,DocumentPdfService,DocumentBrandingService,DocumentAssetService]})
export class DocumentFormModule {}
