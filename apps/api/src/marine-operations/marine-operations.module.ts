import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AdminModule} from '../admin/admin.module';
import {AuthModule} from '../auth/auth.module';
import {IntegrationModule} from '../integrations/integration.module';
import {CredentialObjectStorageService} from '../credentials/credential-object-storage.service';
import {MarineOperationsController} from './marine-operations.controller';
import {MarineOperationsService} from './marine-operations.service';
@Module({imports:[AuthModule,AdminModule,IntegrationModule,AuditModule],controllers:[MarineOperationsController],providers:[MarineOperationsService,CredentialObjectStorageService],exports:[MarineOperationsService]})
export class MarineOperationsModule{}
