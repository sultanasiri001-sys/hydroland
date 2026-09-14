import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { DiveLogReviewController } from './dive-log-review.controller';
import { DiveLogReviewService } from './dive-log-review.service';
import { DiveLogsController } from './dive-logs.controller';
import { DiveLogsService } from './dive-logs.service';

@Module({
  imports: [DatabaseModule, AdminModule, AuditModule],
  controllers: [DiveLogsController, DiveLogReviewController],
  providers: [DiveLogsService, DiveLogReviewService],
})
export class DiveLogsModule {}
