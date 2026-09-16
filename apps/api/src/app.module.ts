import { Module } from '@nestjs/common';
import { GovernanceModule } from './governance/governance.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [GovernanceModule],
  controllers: [HealthController],
})
export class AppModule {}
