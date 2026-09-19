import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {ReviewGuard} from '../admin/review.guard';
import {TranslationModule} from '../translation/translation.module';
import {TripIntelligenceController} from './trip-intelligence.controller';
import {TripIntelligenceService} from './trip-intelligence.service';
import {OfflinePayloadStorageService} from './offline-payload-storage.service';

@Module({imports:[AuditModule,AuthModule,DatabaseModule,TranslationModule],controllers:[TripIntelligenceController],providers:[TripIntelligenceService,OfflinePayloadStorageService,ReviewGuard],exports:[TripIntelligenceService]})
export class TripIntelligenceModule {}
