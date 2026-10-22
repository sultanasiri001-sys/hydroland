import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IntegrationModule } from '../integrations/integration.module';
import { TechnologySecurityModule } from '../technology-security/technology-security.module';
import { HrModule } from './hr.module';
import { StaffingAdminController } from './staffing-admin.controller';
import { StaffingAdminService } from './staffing-admin.service';

@Module({imports:[DatabaseModule,AdminModule,AuditModule,AuthModule,HrModule,IntegrationModule,TechnologySecurityModule],controllers:[StaffingAdminController],providers:[StaffingAdminService]})
export class StaffingAdminModule {}
