import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; import { AdminModule } from '../admin/admin.module'; import { AuditModule } from '../audit/audit.module'; import { IntegrationController } from './integration.controller'; import { IntegrationService } from './integration.service';
@Module({
  imports: [AdminModule,AuditModule, AuthModule],controllers:[IntegrationController],providers:[IntegrationService],exports:[IntegrationService]}) export class IntegrationModule {}
