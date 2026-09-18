import { Module } from '@nestjs/common';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';

@Module({
  providers: [CustomerServiceFoundationService],
  exports: [CustomerServiceFoundationService],
})
export class CustomerServiceModule {}
