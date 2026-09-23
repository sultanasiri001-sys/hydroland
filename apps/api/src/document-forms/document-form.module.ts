import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentFormService } from './document-form.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentPersistenceService } from './document-persistence.service';
import { DocumentPersistenceController } from './document-persistence.controller';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentPrintService } from './document-print.service';
@Module({imports:[AuthModule],controllers:[DocumentPersistenceController],providers:[DocumentFormService,DocumentLifecycleService,DocumentAuthorizationService,DocumentPersistenceService,DocumentPrintService],exports:[DocumentFormService,DocumentLifecycleService,DocumentPersistenceService,DocumentPrintService]})
export class DocumentFormModule {}
