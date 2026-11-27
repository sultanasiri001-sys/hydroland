import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerNoticeEmailWorker } from './customer-notice-email.worker';
import { CustomerChannelWorker } from './customer-channel.worker';
import { CustomerChannelTransport } from './customer-channel.transport';
import { CustomerNoticePreferenceService } from '../notifications/customer-notice-preference.service';
import { CustomerChannelReviewController, CustomerNoticePreferenceController } from '../notifications/customer-notice-preference.controller';
import { AuthEmailOutboxWorker } from '../auth/auth-email-outbox.worker';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationController } from './integration.controller';
import { DistressAisReadinessController } from './distress-ais-readiness.controller';
import { OfficialOnboardingReadinessController } from './official-onboarding-readiness.controller';
import { IntegrationService } from './integration.service';
import { RenderProviderObserver } from '../health/render-provider-observer';
import { A06IndependentObserver } from '../health/a06-independent-observer';
import { A06ProviderObservationController } from '../health/a06-provider-observation.controller';
import { A06GitHubActionsOidcGuard } from '../health/a06-github-actions-oidc.guard';
import { EmailDeliveryService } from './email-delivery.service';
import { UnifonicMessagingService } from './unifonic-messaging.service';
import { SignitEsignService } from './signit-esign.service';
import { MarineTrafficAisService } from './marinetraffic-ais.service';
@Module({
  imports:[AdminModule,AuditModule,AuthModule],
  controllers:[IntegrationController,DistressAisReadinessController,OfficialOnboardingReadinessController,A06ProviderObservationController,CustomerNoticePreferenceController,CustomerChannelReviewController],
  providers:[RenderProviderObserver,IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService,AuthEmailOutboxWorker,CustomerNoticeEmailWorker,CustomerChannelWorker,CustomerChannelTransport,CustomerNoticePreferenceService,A06GitHubActionsOidcGuard,A06IndependentObserver],
  exports:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService,MarineTrafficAisService],
})
export class IntegrationModule {}
