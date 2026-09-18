import { Module } from '@nestjs/common';import { DocumentService } from './document.service';import { LocalPrivateObjectStorage } from './private-storage.service';
@Module({providers:[DocumentService,LocalPrivateObjectStorage],exports:[DocumentService]}) export class DocumentsModule{}
