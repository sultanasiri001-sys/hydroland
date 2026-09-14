import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule {}
