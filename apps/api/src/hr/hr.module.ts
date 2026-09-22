import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HrService } from './hr.service';

@Module({
  imports: [DatabaseModule],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
