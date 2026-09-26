import { Controller, Get } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('health/integrations')
export class DistressAisReadinessController {
  constructor(private readonly integrations:IntegrationService){}

  @Get('distress-ais')
  getDistressAisReadiness(){
    const integration=this.integrations.status('DISTRESS_AIS');
    const provider=process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase()||'';
    const checks={
      lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',
      aisProviderConfigured:provider==='MARINETRAFFIC_AIS_ONLY',
      aisCredentialsConfigured:Boolean(process.env.MARINETRAFFIC_API_KEY?.trim()),
      distressProviderConfigured:false,
    };
    const aisReady=checks.lifecycleOperational&&checks.aisProviderConfigured&&checks.aisCredentialsConfigured;
    return{
      service:'hydroland-api',
      integration:'DISTRESS_AIS',
      status:integration.status,
      provider:checks.aisProviderConfigured?'MARINETRAFFIC_AIS_ONLY':'UNCONFIGURED',
      aisReady,
      distressReady:false,
      productionReady:false,
      sandboxReady:false,
      checks,
      limitation:'AIS situational awareness only; distress signaling is not implemented.',
      commit:process.env.RENDER_GIT_COMMIT||'local',
      timestamp:new Date().toISOString(),
    };
  }
}
