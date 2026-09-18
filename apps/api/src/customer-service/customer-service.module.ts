import { Module } from '@nestjs/common';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';
import { CustomerServiceOperationsService } from './customer-service-operations.service';

@Module({
  providers: [CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService],
  exports: [CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService],
})
export class CustomerServiceModule {}
