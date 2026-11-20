import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PublicSearchEventsController } from './public-search-events.controller';
@Module({imports:[forwardRef(()=>AuthModule)],controllers:[AuditController,PublicSearchEventsController],providers:[AuditService],exports:[AuditService]})
export class AuditModule {}
