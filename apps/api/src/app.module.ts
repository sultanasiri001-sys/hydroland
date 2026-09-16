import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AgentModule } from './agents/agent.module';
import { ActivationModule } from './activation/activation.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { DiveLogsModule } from './dive-logs/dive-logs.module';
import { HealthController } from './health/health.controller';
import { IntegrationModule } from './integrations/integration.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SafetyModule } from './safety/safety.module';
import { TripsModule } from './trips/trips.module';
import { PaymentsModule } from './payments/payments.module';
import { ProfileModule } from './profile/profile.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TrainingModule } from './training/training.module';
import { ThemesModule } from './themes/themes.module';
@Module({ imports:[DatabaseModule,AuthModule,ProfileModule,CredentialsModule,ActivationModule,AuditModule,NotificationsModule,TripsModule,SafetyModule,PaymentsModule,AdminModule,DiveLogsModule,OrganizationsModule,TrainingModule,IntegrationModule,AgentModule,ThemesModule], controllers:[HealthController] })
export class AppModule {}
