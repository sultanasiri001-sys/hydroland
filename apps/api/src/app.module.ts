import { Module } from '@nestjs/common';
import { ActivationModule } from './activation/activation.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
@Module({ imports:[DatabaseModule,AuthModule,ProfileModule,CredentialsModule,ActivationModule,AuditModule,NotificationsModule], controllers:[HealthController] })
export class AppModule {}