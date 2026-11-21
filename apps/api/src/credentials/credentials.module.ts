import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integration.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../trips/trips.module';
import { CertificationVerificationEvidenceService } from './certification-verification-evidence.service';
import { CredentialObjectStorageService } from './credential-object-storage.service';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

import { InstructorDocumentsController } from './instructor-documents.controller';
import { InstructorDocumentsService } from './instructor-documents.service';

@Module({imports:[AuthModule,AdminModule,TripsModule,AuditModule,NotificationsModule,IntegrationModule],controllers:[CredentialsController,InstructorDocumentsController],providers:[InstructorDocumentsService,CredentialsService,CredentialObjectStorageService,CertificationVerificationEvidenceService]})
export class CredentialsModule {}
