import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports:[AuthModule,AdminModule,AuditModule],
  controllers:[CommunityController],
  providers:[CommunityService],
})
export class CommunityModule {}
