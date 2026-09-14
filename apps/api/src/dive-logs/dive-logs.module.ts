import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DiveLogsController } from './dive-logs.controller';
import { DiveLogsService } from './dive-logs.service';

@Module({ imports: [DatabaseModule], controllers: [DiveLogsController], providers: [DiveLogsService] })
export class DiveLogsModule {}
