import { Controller, Get, UseGuards } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { A06GitHubActionsOidcGuard } from './a06-github-actions-oidc.guard';

@Controller('health/integrations')
@UseGuards(A06GitHubActionsOidcGuard)
export class A06ProviderObservationController {
  constructor(private readonly integrations:IntegrationService){}
  @Get('provider-observations')
  async getProviderObservations(){
    return {service:'hydroland-api',cadenceMinutes:15,escalateAfterMinutes:30,
      providers:await this.integrations.providerObservations(),timestamp:new Date().toISOString()};
  }
}
