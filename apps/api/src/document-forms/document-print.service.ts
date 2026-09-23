import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';

export interface DocumentPrintContract {
  documentId:string;
  organizationId:string;
  referenceNumber:string;
  department:string;
  status:string;
  documentVersion:number;
  contentHash:string;
  template:{id:string;code:string;titleAr:string;titleEn:string;version:number;printable:boolean};
  fields:Array<{key:string;labelAr:string;labelEn:string;type:string;required:boolean;value:unknown}>;
  approvals:{createdByAccountId:string;approvedByAccountId:string|null;signedByAccountId:string|null;archivedByAccountId:string|null;approvedAt:Date|null;signedAt:Date|null;archivedAt:Date|null};
  createdAt:Date;
  updatedAt:Date;
}

@Injectable()
export class DocumentPrintService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}

  async contract(accountId:string,id:string):Promise<DocumentPrintContract>{
    const d=await this.db.managedDocument.findUnique({where:{id},include:{template:true}});
    if(!d) throw new NotFoundException('Document not found.');
    await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    if(!d.template.printable) throw new BadRequestException('Document template is not printable.');
    const definitions=Array.isArray(d.template.fields)?d.template.fields as Array<Record<string,unknown>>:[];
    const payload=d.payload&&typeof d.payload==='object'&&!Array.isArray(d.payload)?d.payload as Record<string,unknown>:{};
    const fields=definitions.map(f=>({
      key:String(f.key??''),
      labelAr:String(f.labelAr??''),
      labelEn:String(f.labelEn??''),
      type:String(f.type??'TEXT'),
      required:Boolean(f.required),
      value:payload[String(f.key??'')]??null,
    }));
    return {
      documentId:d.id,organizationId:d.organizationId,referenceNumber:d.referenceNumber,department:d.department,status:d.status,
      documentVersion:d.version,contentHash:d.contentHash,
      template:{id:d.template.id,code:d.template.code,titleAr:d.template.titleAr,titleEn:d.template.titleEn,version:d.template.version,printable:d.template.printable},
      fields,
      approvals:{createdByAccountId:d.createdByAccountId,approvedByAccountId:d.approvedByAccountId,signedByAccountId:d.signedByAccountId,archivedByAccountId:d.archivedByAccountId,approvedAt:d.approvedAt,signedAt:d.signedAt,archivedAt:d.archivedAt},
      createdAt:d.createdAt,updatedAt:d.updatedAt,
    };
  }
}
