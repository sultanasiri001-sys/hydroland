import { DocumentFormModule } from '../document-forms/document-form.module';
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CommunityController } from './community.controller';
import { CommunityPolicyService } from './community-policy.service';
import { CommunityService } from './community.service';
import { F03ProgramService } from './f03-program.service';
import { F03BuddyService } from './f03-buddy.service';
import { F03Controller } from './f03.controller';

@Module({
  imports:[AuthModule,AdminModule,AuditModule,DocumentFormModule],
  controllers:[CommunityController,F03Controller],
  providers:[CommunityService,CommunityPolicyService,F03ProgramService,F03BuddyService],
  exports:[CommunityPolicyService],
})
export class CommunityModule {}
