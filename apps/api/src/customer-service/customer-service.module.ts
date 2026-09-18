import { Module } from '@nestjs/common';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';

@Module({
  providers: [CustomerServiceFoundationService, CustomerServiceWorkflowService],
  exports: [CustomerServiceFoundationService, CustomerServiceWorkflowService],
})
export class CustomerServiceModule {}
