import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthEmailOutboxWorker } from '../auth/auth-email-outbox.worker';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationController } from './integration.controller';
import { DistressAisReadinessController } from './distress-ais-readiness.controller';
import { OfficialOnboardingReadinessController } from './official-onboarding-readiness.controller';
import { IntegrationService } from './integration.service';
import { EmailDeliveryService } from './email-delivery.service';
import { UnifonicMessagingService } from './unifonic-messaging.service';
import { SignitEsignService } from './signit-esign.service';
import { MarineTrafficAisService } from './marinetraffic-ais.service';
@Module({
  imports:[AdminModule,AuditModule,AuthModule],
  controllers:[IntegrationController,DistressAisReadinessController,OfficialOnboardingReadinessController],
  providers:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService,AuthEmailOutboxWorker],
  exports:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService],
})
export class IntegrationModule {}
