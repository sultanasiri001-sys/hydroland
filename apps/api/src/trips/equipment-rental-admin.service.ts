import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EquipmentRentalService } from './equipment-rental.service';

type RentalIndexRow={id:string;status:string;paymentStatus:string;invoiceNumber:string;renterAccountId:string;dueAt:Date|null;returnIntentAt:Date|null;extensionStatus:string|null;extensionRequestedUntil:Date|null;reservedAt:Date;totalHalala:bigint};

@Injectable()
export class EquipmentRentalAdminService{
  constructor(private readonly db:DatabaseService,private readonly rentals:EquipmentRentalService){}

  async list(){
    const rows=await this.db.$queryRaw<RentalIndexRow[]>`SELECT "id","status","paymentStatus","invoiceNumber","renterAccountId","dueAt","returnIntentAt","extensionStatus","extensionRequestedUntil","reservedAt","totalHalala" FROM "EquipmentRental" WHERE "status" IN ('RESERVED','ACTIVE') OR "extensionStatus"='PENDING' ORDER BY CASE WHEN "extensionStatus"='PENDING' THEN 0 WHEN "returnIntentAt" IS NOT NULL THEN 1 WHEN "dueAt"<NOW() THEN 2 ELSE 3 END,"dueAt" ASC NULLS LAST,"reservedAt" DESC LIMIT 200`;
    const result=[];
    for(const row of rows){const rental=await this.rentals.get(row.id);result.push(rental);}
    return result;
  }
}
