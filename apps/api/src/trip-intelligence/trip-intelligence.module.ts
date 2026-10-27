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

@Module({imports:[AuditModule,AuthModule,DatabaseModule,TranslationModule,IntegrationModule],controllers:[TripIntelligenceController],providers:[TripIntelligenceService,OfflinePayloadStorageService,OfflineTripAuthorizationService,ReviewGuard],exports:[TripIntelligenceService]})
export class TripIntelligenceModule {}
