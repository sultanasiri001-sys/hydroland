import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { IntegrationService } from '../integrations/integration.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly integrations: IntegrationService,
  ) {}

  @Get()
  getHealth() {
    return {
      service: 'hydroland-api',
      status: 'ok',
      version: '0.1.0',
      commit: process.env.RENDER_GIT_COMMIT || 'local',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return {
        service: 'hydroland-api',
        status: 'ready',
        database: 'ok',
        commit: process.env.RENDER_GIT_COMMIT || 'local',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        service: 'hydroland-api',
        status: 'not_ready',
        database: 'unavailable',
        commit: process.env.RENDER_GIT_COMMIT || 'local',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('integrations/payment')
  getPaymentReadiness() {
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
    return {
      service: 'hydroland-api',
      integration: 'PAYMENT_PSP',
      status: integration.status,
      provider: checks.providerConfigured ? 'MOYASAR' : 'UNCONFIGURED',
      locallyConfigured,
      productionReady: locallyConfigured && integration.status === 'PRODUCTION_ENABLED',
      sandboxReady: locallyConfigured && integration.status === 'SANDBOX',
      checks,
      commit: process.env.RENDER_GIT_COMMIT || 'local',
      timestamp: new Date().toISOString(),
    };
  }
}
