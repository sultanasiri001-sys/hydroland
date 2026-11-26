import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProcurementLabController } from './procurement-lab.controller';
import { ProcurementLabService } from './procurement-lab.service';
import { ProcurementApiService } from './procurement-api.service';

@Module({ imports: [AuthModule], controllers: [ProcurementLabController], providers: [ProcurementLabService, ProcurementApiService] })
export class ProcurementLabModule {}
