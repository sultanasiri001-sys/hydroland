import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';

@Injectable()
export class DocumentListService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}

  async list(accountId:string,organizationId:string){
    await this.authz.assert(accountId,organizationId,'DOCUMENT_LIST');
    return this.db.managedDocument.findMany({
      where:{organizationId},
      include:{template:true},
      orderBy:[{updatedAt:'desc'},{createdAt:'desc'}],
    });
  }
}
