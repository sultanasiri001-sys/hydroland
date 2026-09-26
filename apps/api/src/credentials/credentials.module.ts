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

@Module({imports:[AuthModule,AdminModule,TripsModule,AuditModule,NotificationsModule,IntegrationModule],controllers:[CredentialsController],providers:[CredentialsService,CredentialObjectStorageService,CertificationVerificationEvidenceService]})
export class CredentialsModule {}
