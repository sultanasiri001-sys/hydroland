import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health/health.controller';
import { ProfessionalModule } from './professional/professional.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule, AccessModule, ProfessionalModule, CredentialsModule, DocumentsModule],
  controllers: [HealthController],
})
export class AppModule {}
