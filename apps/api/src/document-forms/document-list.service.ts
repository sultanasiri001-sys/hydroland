import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { LIBRARY_PREFIX } from './contract-library.domain';

@Injectable()
export class DocumentListService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}

  async list(accountId:string,organizationId:string){
    await this.authz.assert(accountId,organizationId,'DOCUMENT_LIST');
    return this.db.managedDocument.findMany({
      where:{organizationId,template:{NOT:[{code:COOPERATION_CODE},{code:{startsWith:LIBRARY_PREFIX}}]}},
      include:{template:true},
      orderBy:[{updatedAt:'desc'},{createdAt:'desc'}],
    });
  }
}
