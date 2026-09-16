import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { WorkforceController } from './workforce.controller';
import { WorkforceHiringController } from './workforce-hiring.controller';
import { WorkforceService } from './workforce.service';

@Module({
  imports: [DatabaseModule, AuthModule, AdminModule, AuditModule],
  controllers: [WorkforceController, WorkforceHiringController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
