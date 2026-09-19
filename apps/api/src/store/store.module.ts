import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
@Module({imports:[AuthModule,AdminModule],controllers:[StoreController],providers:[StoreService]})
export class StoreModule {}
