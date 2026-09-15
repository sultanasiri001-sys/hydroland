import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {AdminController} from './admin.controller';
import {AdminGuard} from './admin.guard';
import {ReviewGuard} from './review.guard';
import {AdminService} from './admin.service';

@Module({imports:[AuthModule,AuditModule],controllers:[AdminController],providers:[AdminGuard,ReviewGuard,AdminService],exports:[AdminGuard,ReviewGuard]})
export class AdminModule {}
