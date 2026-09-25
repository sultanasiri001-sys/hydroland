import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { GoogleIdentityService } from './google-identity.service';
import { EmailVerificationService } from './email-verification.service';
import { AccessTokenGuard } from './access-token.guard';
import { AuditModule } from '../audit/audit.module';
@Module({ imports:[forwardRef(()=>AuditModule)], controllers: [AuthController], providers: [AuthService, MfaService, GoogleIdentityService, EmailVerificationService, AccessTokenGuard], exports: [AuthService, MfaService, GoogleIdentityService, EmailVerificationService, AccessTokenGuard] })
export class AuthModule {}
