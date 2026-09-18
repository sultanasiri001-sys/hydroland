import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PostgresUnitOfWork } from './postgres-uow.service';
import { NotificationOutboxService } from '../notifications/notification-outbox.service';
@Global()
@Module({providers:[DatabaseService,PostgresUnitOfWork,NotificationOutboxService],exports:[DatabaseService,PostgresUnitOfWork,NotificationOutboxService]})
export class DatabaseModule {}
