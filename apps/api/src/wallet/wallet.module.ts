import { WalletPostingService } from './wallet-posting.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
@Module({imports:[AuthModule],controllers:[WalletController],providers:[WalletService,WalletPostingService],exports:[WalletService]})
export class WalletModule {}
