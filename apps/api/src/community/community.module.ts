import { DocumentFormModule } from '../document-forms/document-form.module';
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CommunityController } from './community.controller';
import { CommunityPolicyService } from './community-policy.service';
import { CommunityService } from './community.service';

@Module({
  imports:[AuthModule,AdminModule,AuditModule,DocumentFormModule],
  controllers:[CommunityController],
  providers:[CommunityService,CommunityPolicyService],
  exports:[CommunityPolicyService],
})
export class CommunityModule {}
