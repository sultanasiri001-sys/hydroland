import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IntegrationModule } from '../integrations/integration.module';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { TranslationRouterService } from './translation-router.service';

@Module({
  imports: [AuthModule, DatabaseModule, IntegrationModule],
  controllers: [TranslationController],
  providers: [TranslationService, TranslationRouterService],
  exports: [TranslationService, TranslationRouterService],
})
export class TranslationModule {}
