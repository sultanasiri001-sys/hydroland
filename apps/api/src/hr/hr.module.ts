import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
