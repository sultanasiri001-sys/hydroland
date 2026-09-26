import { Controller, Get } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';

@Controller('health/integrations')
export class SettlementReadinessController {
  constructor(private readonly integrations:IntegrationService){}

  @Get('settlement')
  getSettlementReadiness(){
    const integration=this.integrations.status('BANKING_SETTLEMENT');
    const provider=process.env.HYDROLAND_SETTLEMENT_PROVIDER?.trim().toUpperCase()||'';
    const checks={
      lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',
      providerConfigured:provider==='MOYASAR',
      credentialsConfigured:Boolean(process.env.MOYASAR_SECRET_KEY?.trim()),
    };
    const locallyConfigured=Object.values(checks).every(Boolean);
    return{
      service:'hydroland-api',
      integration:'BANKING_SETTLEMENT',
      status:integration.status,
      provider:checks.providerConfigured?'MOYASAR':'UNCONFIGURED',
      locallyConfigured,
      productionReady:locallyConfigured&&integration.status==='PRODUCTION_ENABLED',
      sandboxReady:locallyConfigured&&integration.status==='SANDBOX',
      checks,
      commit:process.env.RENDER_GIT_COMMIT||'local',
      timestamp:new Date().toISOString(),
    };
  }
}
