import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthEmailOutboxWorker } from '../auth/auth-email-outbox.worker';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationController } from './integration.controller';
import { DistressAisReadinessController } from './distress-ais-readiness.controller';
import { OfficialOnboardingReadinessController } from './official-onboarding-readiness.controller';
import { CertificationReadinessController } from './certification-readiness.controller';
import { IntegrationService } from './integration.service';
import { EmailDeliveryService } from './email-delivery.service';
import { UnifonicMessagingService } from './unifonic-messaging.service';
import { SignitEsignService } from './signit-esign.service';
import { MarineTrafficAisService } from './marinetraffic-ais.service';
import { PadiEcardEvidenceService } from './padi-ecard-evidence.service';
@Module({
  imports:[AdminModule,AuditModule,AuthModule],
  controllers:[IntegrationController,DistressAisReadinessController,OfficialOnboardingReadinessController,CertificationReadinessController],
  providers:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService,PadiEcardEvidenceService,AuthEmailOutboxWorker],
  exports:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService,PadiEcardEvidenceService],
})
export class IntegrationModule {}
