import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TripsModule } from '../trips/trips.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({imports:[AuthModule,TripsModule,AuditModule],controllers:[CredentialsController],providers:[CredentialsService]})
export class CredentialsModule {}
