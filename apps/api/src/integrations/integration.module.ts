import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { EmailDeliveryService } from './email-delivery.service';
@Module({
  imports:[AdminModule,AuditModule,forwardRef(()=>AuthModule)],
  controllers:[IntegrationController],
  providers:[IntegrationService,EmailDeliveryService],
  exports:[IntegrationService,EmailDeliveryService],
})
export class IntegrationModule {}
