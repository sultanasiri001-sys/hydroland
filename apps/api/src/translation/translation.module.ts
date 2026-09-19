import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {TranslationController} from './translation.controller';
import {TranslationService} from './translation.service';
@Module({imports:[DatabaseModule],controllers:[TranslationController],providers:[TranslationService],exports:[TranslationService]})
export class TranslationModule{}
