import { Module } from '@nestjs/common';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';
import { CustomerServiceOperationsService } from './customer-service-operations.service';
import { CustomerServiceGovernanceService } from './customer-service-governance.service';

@Module({
  providers: [CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
  exports: [CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
})
export class CustomerServiceModule {}
