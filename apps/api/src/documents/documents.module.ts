import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentStorageService } from './document-storage.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentStorageService],
  exports: [DocumentsService, DocumentStorageService],
})
export class DocumentsModule {}
