import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { IntegrationService } from './integration.service';
import { DistressAisReadinessPayload } from './integration.types';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('health/integrations')
export class DistressAisReadinessController {
  constructor(private readonly integrations:IntegrationService){}

  @Get('distress-ais')
  getDistressAisReadiness():DistressAisReadinessPayload{
    const integration=this.integrations.status('DISTRESS_AIS');
    const provider=process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase()||'';
    const checks={
      lifecycleOperational:integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX',
      aisProviderConfigured:provider==='MARINETRAFFIC_AIS_ONLY',
      aisCredentialsConfigured:/^[0-9a-f]{40}$/i.test(process.env.MARINETRAFFIC_API_KEY?.trim()||''),
      distressProviderConfigured:false,
    };
    const aisConfigured=checks.lifecycleOperational&&checks.aisProviderConfigured&&checks.aisCredentialsConfigured;
    const aisReady=false;
    return{
      service:'hydroland-api',
      integration:'DISTRESS_AIS',
      status:integration.status,
      provider:checks.aisProviderConfigured?'MARINETRAFFIC_AIS_ONLY':'UNCONFIGURED',
      aisReady,
      aisConfigured,
      ...this.integrations.marineReadiness('DISTRESS_AIS',aisConfigured),
      dataFreshness:{status:'UNASSESSED',reasonCodes:['OPERATIONAL_FRESHNESS_POLICY_NOT_VERIFIED']},
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
