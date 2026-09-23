import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
