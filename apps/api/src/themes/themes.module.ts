import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  imports: [DatabaseModule, AuthModule, AdminModule, AuditModule],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule {}
