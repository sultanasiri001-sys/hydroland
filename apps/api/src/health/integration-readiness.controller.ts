import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationReadinessPayload } from '../integrations/integration.types';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('health/integrations')
export class IntegrationReadinessController {
  constructor(private readonly integrations: IntegrationService) {}

  @Get('payment')
  getPaymentReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('PAYMENT_PSP');
    const provider = process.env.HYDROLAND_PAYMENT_PROVIDER?.trim().toUpperCase() || '';
    const checks = {
      lifecycleOperational: integration.status === 'PRODUCTION_ENABLED' || integration.status === 'SANDBOX',
      providerConfigured: provider === 'MOYASAR',
      credentialsConfigured: Boolean(process.env.MOYASAR_SECRET_KEY?.trim()),
      webhookConfigured: Boolean(process.env.MOYASAR_WEBHOOK_SECRET?.trim()),
      publicWebOriginConfigured: Boolean(process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim()),
    };
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'PAYMENT_PSP',status:integration.status,provider:checks.providerConfigured?'MOYASAR':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('email')
  getEmailReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('EMAIL');
    const provider = process.env.HYDROLAND_EMAIL_PROVIDER?.trim().toUpperCase() || '';
    const checks = {
      lifecycleOperational: integration.status === 'PRODUCTION_ENABLED' || integration.status === 'SANDBOX',
      providerConfigured: provider === 'RESEND',
      credentialsConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      senderConfigured: Boolean(process.env.HYDROLAND_EMAIL_FROM?.trim()),
      publicWebOriginConfigured: Boolean(process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim()),
    };
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'EMAIL',status:integration.status,provider:checks.providerConfigured?'RESEND':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('sms')
  getSmsReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('SMS');
    const provider = process.env.HYDROLAND_SMS_PROVIDER?.trim().toUpperCase() || '';
    const checks = {lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',providerConfigured:provider==='UNIFONIC',credentialsConfigured:Boolean(process.env.UNIFONIC_SMS_APPSID?.trim()),senderConfigured:Boolean(process.env.UNIFONIC_SMS_SENDER_ID?.trim())};
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'SMS',status:integration.status,provider:checks.providerConfigured?'UNIFONIC':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('whatsapp')
  getWhatsAppReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('WHATSAPP');
    const provider = process.env.HYDROLAND_WHATSAPP_PROVIDER?.trim().toUpperCase() || '';
    const checks = {lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',providerConfigured:provider==='UNIFONIC',publicIdConfigured:Boolean(process.env.UNIFONIC_WHATSAPP_PUBLIC_ID?.trim()),secretConfigured:Boolean(process.env.UNIFONIC_WHATSAPP_SECRET?.trim())};
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'WHATSAPP',status:integration.status,provider:checks.providerConfigured?'UNIFONIC':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('object-storage')
  getObjectStorageReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('OBJECT_STORAGE');
    const provider = process.env.HYDROLAND_OBJECT_STORAGE_PROVIDER?.trim().toUpperCase() || '';
    const checks = {lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',providerConfigured:provider==='CLOUDFLARE_R2',accountConfigured:Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim()),bucketConfigured:Boolean(process.env.CLOUDFLARE_R2_BUCKET?.trim()),accessKeyConfigured:Boolean(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim()),secretConfigured:Boolean(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim())};
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'OBJECT_STORAGE',status:integration.status,provider:checks.providerConfigured?'CLOUDFLARE_R2':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('translation')
  getTranslationReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('TRANSLATION_ENGINE');
    const provider = process.env.HYDROLAND_TRANSLATION_PROVIDER?.trim().toUpperCase() || '';
    const checks = {lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',providerConfigured:provider==='GOOGLE_CLOUD',credentialsConfigured:Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim())};
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'TRANSLATION_ENGINE',status:integration.status,provider:checks.providerConfigured?'GOOGLE_CLOUD':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }

  @Get('esign')
  getEsignReadiness():IntegrationReadinessPayload {
    const integration = this.integrations.status('ESIGN');
    const provider = process.env.HYDROLAND_ESIGN_PROVIDER?.trim().toUpperCase() || '';
    const checks = {lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',providerConfigured:provider==='SIGNIT',credentialsConfigured:Boolean(process.env.SIGNIT_API_KEY?.trim()),documentHostsConfigured:Boolean(process.env.HYDROLAND_ESIGN_DOCUMENT_HOSTS?.trim())};
    const locallyConfigured = Object.values(checks).every(Boolean);
    return {service:'hydroland-api',integration:'ESIGN',status:integration.status,provider:checks.providerConfigured?'SIGNIT':'UNCONFIGURED',locallyConfigured,productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',sandboxReady:locallyConfigured&&integration.status==='SANDBOX',checks,commit:process.env.RENDER_GIT_COMMIT||'local',timestamp:new Date().toISOString()};
  }
}
