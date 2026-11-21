import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreOfferingsController } from './store-offerings.controller';
import { StoreOfferingsService } from './store-offerings.service';
import { StoreGoodsService } from './store-goods.service';
import { StoreGoodsController } from './store-goods.controller';
@Module({imports:[AuthModule,AdminModule,AuditModule],controllers:[StoreGoodsController,StoreController,StoreOfferingsController],providers:[StoreGoodsService,StoreService,StoreOfferingsService]})
export class StoreModule {}

