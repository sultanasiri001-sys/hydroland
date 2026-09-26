import { Controller, Get } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('health/integrations')
export class CertificationReadinessController {
  constructor(private readonly integrations:IntegrationService){}

  @Get('certification')
  getCertificationReadiness(){
    const integration=this.integrations.status('CERTIFICATION');
    return{
      service:'hydroland-api',
      integration:'CERTIFICATION',
      status:integration.status,
      partialProvider:'PADI_ECARD_HUMAN_VERIFICATION',
      padiEvidenceUrlValidationReady:true,
      automatedApiVerificationReady:false,
      humanReviewRequired:true,
      productionReady:false,
      sandboxReady:false,
      blocker:'OFFICIAL_CERTIFICATION_API_CONTRACT_REQUIRED',
      commit:process.env.RENDER_GIT_COMMIT||'local',
      timestamp:new Date().toISOString(),
    };
  }
}
