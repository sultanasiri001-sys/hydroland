import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';

@Module({
  imports:[AuthModule,AdminModule,AuditModule,NotificationsModule],
  controllers:[ActivationController],
  providers:[ActivationService],
})
export class ActivationModule {}
