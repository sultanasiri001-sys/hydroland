import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { OrganizationModule } from './organization/organization.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, AuthModule, AccessModule, OrganizationModule],
  controllers: [HealthController],
})
export class AppModule {}
