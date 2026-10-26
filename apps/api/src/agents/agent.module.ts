import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminModule } from '../admin/admin.module';
import { IntegrationModule } from '../integrations/integration.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentRuntimeController } from './agent-runtime.controller';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentModelProviderService } from './agent-model-provider.service';
import { AgentRuntimeWorker } from './agent-runtime.worker';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';
@Module({imports:[AuthModule,AuditModule,AdminModule,IntegrationModule],controllers:[AgentController,AgentRuntimeController],providers:[AgentService,AgentRuntimeService,AgentModelProviderService,AgentRuntimeWorker,GovernanceReviewInboxService]})
export class AgentModule {}
