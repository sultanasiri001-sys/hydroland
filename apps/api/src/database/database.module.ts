import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PostgresUnitOfWork } from './postgres-uow.service';
@Global()
@Module({providers:[DatabaseService,PostgresUnitOfWork],exports:[DatabaseService,PostgresUnitOfWork]})
export class DatabaseModule {}
