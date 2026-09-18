import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './access-token.guard';
@Module({ controllers: [AuthController], providers: [AuthService, AccessTokenGuard], exports: [AuthService, AccessTokenGuard] })
export class AuthModule {}
