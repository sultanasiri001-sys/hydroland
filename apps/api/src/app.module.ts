import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfessionalModule } from './professional/professional.module';
import { ProfileModule } from './profile/profile.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProfileModule,
    AccessModule,
    ProfessionalModule,
    CredentialsModule,
    DocumentsModule,
    ReviewModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
