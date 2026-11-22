import { FinanceModule } from '../finance/finance.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyPostingService } from './loyalty-posting.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
@Module({imports:[AuthModule,FinanceModule],controllers:[RewardsController,LoyaltyController],providers:[RewardsService,LoyaltyPostingService],exports:[RewardsService]})
export class RewardsModule {}
