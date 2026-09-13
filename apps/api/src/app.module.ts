import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { ProfileModule } from './profile/profile.module';
@Module({ imports: [DatabaseModule, AuthModule, ProfileModule], controllers: [HealthController] })
export class AppModule {}
