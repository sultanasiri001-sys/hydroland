import { Controller, Get } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { OfficialOnboardingReadinessPayload } from './integration.types';

@Controller('health/integrations')
export class OfficialOnboardingReadinessController {
  constructor(private readonly integrations:IntegrationService){}

  @Get('nafath')
  getNafathReadiness():OfficialOnboardingReadinessPayload{
    const integration=this.integrations.status('NAFATH');
    const provider=process.env.HYDROLAND_NAFATH_PROVIDER?.trim().toUpperCase()||'';
    const checks={
      providerSelected:provider==='NAFATH',
      accessApproved:process.env.HYDROLAND_NAFATH_ACCESS_APPROVED?.trim().toLowerCase()==='true',
      issuerConfigured:Boolean(process.env.NAFATH_OIDC_ISSUER?.trim()),
      clientIdConfigured:Boolean(process.env.NAFATH_CLIENT_ID?.trim()),
      clientSecretConfigured:Boolean(process.env.NAFATH_CLIENT_SECRET?.trim()),
      adapterImplemented:false,
    };
    return{
      service:'hydroland-api',
      integration:'NAFATH',
      status:integration.status,
      provider:checks.providerSelected?'NAFATH':'UNCONFIGURED',
      contractAccessReady:checks.providerSelected&&checks.accessApproved&&checks.issuerConfigured&&checks.clientIdConfigured&&checks.clientSecretConfigured,
      productionReady:false,
      sandboxReady:false,
      checks,
      blocker:'APPROVED_NAFATH_CONTRACT_AND_ADAPTER_REQUIRED',
      commit:process.env.RENDER_GIT_COMMIT||'local',
      timestamp:new Date().toISOString(),
    };
  }

  @Get('regulatory')
  getRegulatoryReadiness():OfficialOnboardingReadinessPayload{
    const integration=this.integrations.status('REGULATORY');
    const provider=process.env.HYDROLAND_REGULATORY_PROVIDER?.trim().toUpperCase()||'';
    const checks={
      providerSelected:provider==='SAUDI_MINISTRY_OF_TOURISM',
      accessApproved:process.env.HYDROLAND_REGULATORY_ACCESS_APPROVED?.trim().toLowerCase()==='true',
      baseUrlConfigured:Boolean(process.env.SAUDI_TOURISM_API_BASE_URL?.trim()),
      credentialsConfigured:Boolean(process.env.SAUDI_TOURISM_API_TOKEN?.trim()),
      licensingContractConfigured:Boolean(process.env.SAUDI_TOURISM_LICENSING_CONTRACT_VERSION?.trim()),
      adapterImplemented:false,
    };
    return{
      service:'hydroland-api',
      integration:'REGULATORY',
      status:integration.status,
      provider:checks.providerSelected?'SAUDI_MINISTRY_OF_TOURISM':'UNCONFIGURED',
      contractAccessReady:checks.providerSelected&&checks.accessApproved&&checks.baseUrlConfigured&&checks.credentialsConfigured&&checks.licensingContractConfigured,
      productionReady:false,
      sandboxReady:false,
      checks,
      blocker:'LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED',
      commit:process.env.RENDER_GIT_COMMIT||'local',
      timestamp:new Date().toISOString(),
    };
  }
}
