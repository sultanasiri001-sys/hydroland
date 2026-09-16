import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({imports:[DatabaseModule,AuthModule,AdminModule,AuditModule],controllers:[InventoryController],providers:[InventoryService],exports:[InventoryService]})
export class InventoryModule{}
