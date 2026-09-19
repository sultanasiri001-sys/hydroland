import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {ReviewGuard} from '../admin/review.guard';
import {TripIntelligenceController} from './trip-intelligence.controller';
import {TripIntelligenceService} from './trip-intelligence.service';

@Module({imports:[AuditModule,AuthModule,DatabaseModule],controllers:[TripIntelligenceController],providers:[TripIntelligenceService,ReviewGuard],exports:[TripIntelligenceService]})
export class TripIntelligenceModule {}
