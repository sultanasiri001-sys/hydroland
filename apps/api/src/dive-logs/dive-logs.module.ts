import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DiveLogReviewController } from './dive-log-review.controller';
import { DiveLogReviewGuard } from './dive-log-review.guard';
import { DiveLogReviewService } from './dive-log-review.service';
import { DiveLogsController } from './dive-logs.controller';
import { DiveLogsService } from './dive-logs.service';

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [DiveLogsController, DiveLogReviewController],
  providers: [DiveLogsService, DiveLogReviewService, DiveLogReviewGuard],
})
export class DiveLogsModule {}
