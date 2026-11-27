import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {ReviewGuard} from '../admin/review.guard';
import {TranslationModule} from '../translation/translation.module';
import {IntegrationModule} from '../integrations/integration.module';
import {TripIntelligenceController} from './trip-intelligence.controller';
import {TripIntelligenceService} from './trip-intelligence.service';
import {OfflinePayloadStorageService} from './offline-payload-storage.service';
import {OfflineTripAuthorizationService} from './offline-trip-authorization.service';
import {MobileOfflineController} from './mobile-offline.controller';
import {MobileOfflineService} from './mobile-offline.service';

@Module({imports:[AuditModule,AuthModule,DatabaseModule,TranslationModule,IntegrationModule],controllers:[TripIntelligenceController,MobileOfflineController],providers:[TripIntelligenceService,OfflinePayloadStorageService,OfflineTripAuthorizationService,MobileOfflineService,ReviewGuard],exports:[TripIntelligenceService]})
export class TripIntelligenceModule {}
