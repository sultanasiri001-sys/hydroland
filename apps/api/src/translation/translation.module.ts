import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {IntegrationModule} from '../integrations/integration.module';
import {TranslationController} from './translation.controller';
import {TranslationService} from './translation.service';
import {TranslationRouterService} from './translation-router.service';
@Module({imports:[DatabaseModule,IntegrationModule],controllers:[TranslationController],providers:[TranslationService,TranslationRouterService],exports:[TranslationService,TranslationRouterService]})
export class TranslationModule{}
