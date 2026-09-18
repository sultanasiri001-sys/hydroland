import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [AuthModule, AccessModule, OrganizationModule],
  controllers: [HealthController],
})
export class AppModule {}
