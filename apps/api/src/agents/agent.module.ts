import { Module } from '@nestjs/common'; import { AuthModule } from '../auth/auth.module'; import { AuditModule } from '../audit/audit.module'; import { AgentController } from './agent.controller'; import { AgentService } from './agent.service';
@Module({imports:[AuthModule,AuditModule],controllers:[AgentController],providers:[AgentService]}) export class AgentModule {}
