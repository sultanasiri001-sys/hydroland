import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CustomerCaseController } from './customer-case.controller';
import { CustomerCaseService } from './customer-case.service';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';
import { CustomerServiceOperationsService } from './customer-service-operations.service';
import { CustomerServiceGovernanceService } from './customer-service-governance.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CustomerCaseController],
  providers: [CustomerCaseService, CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
  exports: [CustomerCaseService, CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
})
export class CustomerServiceModule {}
