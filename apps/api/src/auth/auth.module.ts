import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthChallengeDeliveryService } from './auth-challenge-delivery.service';
import { MfaService } from './mfa.service';
import { GoogleIdentityService } from './google-identity.service';
import { AccessTokenGuard } from './access-token.guard';
import { AuditModule } from '../audit/audit.module';
import { IntegrationModule } from '../integrations/integration.module';
@Module({ imports:[forwardRef(()=>AuditModule),forwardRef(()=>IntegrationModule)], controllers: [AuthController], providers: [AuthService, AuthChallengeDeliveryService, MfaService, GoogleIdentityService, AccessTokenGuard], exports: [AuthService, MfaService, GoogleIdentityService, AccessTokenGuard] })
export class AuthModule {}
