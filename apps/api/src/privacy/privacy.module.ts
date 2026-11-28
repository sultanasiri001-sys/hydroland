import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { PrivateErasureJournal } from './erasure-journal';
import { PrivacyErasureController } from './privacy-erasure.controller';
import { PrivacyErasureService } from './privacy-erasure.service';
import { PrivacyRecoveryService } from './privacy-recovery.service';
import { PrivacyAdministrationService } from './privacy-administration.service';
import { PrivacyAdministrationController } from './privacy-administration.controller';
import { IntegrationService } from '../integrations/integration.service';
@Module({imports:[AuthModule,AuditModule,DatabaseModule],controllers:[PrivacyErasureController,PrivacyAdministrationController],providers:[IntegrationService,PrivateErasureJournal,PrivacyErasureService,PrivacyRecoveryService,PrivacyAdministrationService],exports:[PrivacyErasureService,PrivacyRecoveryService]})
export class PrivacyModule {}
