import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TripsModule } from '../trips/trips.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({imports:[AuthModule,AdminModule,TripsModule,AuditModule],controllers:[CredentialsController],providers:[CredentialsService]})
export class CredentialsModule {}
