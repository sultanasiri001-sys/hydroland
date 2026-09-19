import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {TripIntelligenceController} from './trip-intelligence.controller';
import {TripIntelligenceService} from './trip-intelligence.service';

@Module({imports:[AuditModule],controllers:[TripIntelligenceController],providers:[TripIntelligenceService],exports:[TripIntelligenceService]})
export class TripIntelligenceModule {}
