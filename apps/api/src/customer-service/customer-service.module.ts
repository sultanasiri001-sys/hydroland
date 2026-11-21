import { PrivacyGrievanceController } from './privacy-grievance.controller';
import { PrivacyGrievanceService } from './privacy-grievance.service';
import { PrivacyGrievanceScheduler } from './privacy-grievance.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { CustomerCaseController } from './customer-case.controller';
import { OrganizationCustomerCaseController } from './organization-customer-case.controller';
import { CustomerCaseService } from './customer-case.service';
import { CustomerCaseManagementController } from './customer-case-management.controller';
import { CustomerCaseManagementService } from './customer-case-management.service';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';
import { CustomerServiceOperationsService } from './customer-service-operations.service';
import { CustomerServiceGovernanceService } from './customer-service-governance.service';

import { ProviderAppealRehearsalController } from './provider-appeal-rehearsal.controller';

const rehearsalControllers = process.env.NODE_ENV === 'test' && process.env.HYDROLAND_PROVIDER_REHEARSAL === '1'
  ? [ProviderAppealRehearsalController] : [];

@Module({
  imports: [NotificationsModule, AuthModule, AdminModule, AuditModule, DatabaseModule],
  controllers: [PrivacyGrievanceController, CustomerCaseController, CustomerCaseManagementController, OrganizationCustomerCaseController, ...rehearsalControllers],
  providers: [PrivacyGrievanceService, PrivacyGrievanceScheduler, CustomerCaseService, CustomerCaseManagementService, CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
  exports: [PrivacyGrievanceService, CustomerCaseService, CustomerCaseManagementService, CustomerServiceFoundationService, CustomerServiceWorkflowService, CustomerServiceOperationsService, CustomerServiceGovernanceService],
})
export class CustomerServiceModule {}
