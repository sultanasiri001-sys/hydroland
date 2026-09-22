import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './access-token.guard';
import { AuditModule } from '../audit/audit.module';
@Module({ imports:[AuditModule], controllers: [AuthController], providers: [AuthService, AccessTokenGuard], exports: [AuthService, AccessTokenGuard] })
export class AuthModule {}
