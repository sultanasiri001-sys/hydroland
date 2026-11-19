import { D12DashboardController } from './d12-dashboard.controller';
import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {AdminController} from './admin.controller';
import {AdminGuard} from './admin.guard';
import {ReviewGuard} from './review.guard';
import {AdminService} from './admin.service';

@Module({imports:[AuthModule,AuditModule],controllers:[AdminController,D12DashboardController],providers:[AdminGuard,ReviewGuard,AdminService],exports:[AdminGuard,ReviewGuard,AdminService]})
export class AdminModule {}
