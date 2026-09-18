import { Module } from '@nestjs/common';
import { FinanceFoundationService } from './finance-foundation.service';

@Module({
  providers: [FinanceFoundationService],
  exports: [FinanceFoundationService],
})
export class FinanceModule {}
