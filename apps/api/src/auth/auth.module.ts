import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { AccessTokenGuard } from './access-token.guard';
import { AuditModule } from '../audit/audit.module';
@Module({ imports:[forwardRef(()=>AuditModule)], controllers: [AuthController], providers: [AuthService, MfaService, AccessTokenGuard], exports: [AuthService, MfaService, AccessTokenGuard] })
export class AuthModule {}
