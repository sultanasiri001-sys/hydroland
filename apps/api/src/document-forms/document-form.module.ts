import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentFormService } from './document-form.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentPersistenceService } from './document-persistence.service';
import { DocumentPersistenceController } from './document-persistence.controller';
@Module({imports:[AuthModule],controllers:[DocumentPersistenceController],providers:[DocumentFormService,DocumentLifecycleService,DocumentPersistenceService],exports:[DocumentFormService,DocumentLifecycleService,DocumentPersistenceService]})
export class DocumentFormModule {}
