import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
@Module({ imports:[DatabaseModule,AuthModule,AdminModule,AuditModule], controllers:[HrController], providers:[HrService] })
export class HrModule {}
