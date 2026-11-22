import { BadRequestException, ConflictException, NotFoundException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AuthorizedStockIssue {
  organizationId: string;
  requestId: string;
  lotId: string;
  quantity: number;
  custodianId: string;
  approvedBy: string;
  postedBy: string;
}

// Internal posting boundary. The caller supplies an independently authorized issue, never a public request body.
@Injectable()
export class InventoryIssueLedgerService {
  constructor(private readonly db: DatabaseService) {}

  async acknowledge(organizationId: string, requestId: string, accountId: string) {
    const where = { organizationId, requestId, custodianId: accountId };
    return this.db.serializable(async tx => {
      await tx.warehouseIssuePosting.updateMany({
        where: { ...where, acknowledgedAt: null },
        data: { acknowledgedAt: new Date() },
      });
      const receipt = await tx.warehouseIssuePosting.findFirst({
        where,
        select: { requestId: true, lotId: true, quantity: true, acknowledgedAt: true },
      });
      if (!receipt) throw new NotFoundException('العهدة غير متاحة.');
      return receipt;
    });
  }

  async post(issue: AuthorizedStockIssue) {
    const {organizationId,requestId,lotId,quantity,custodianId,approvedBy,postedBy} = issue;
    if (![organizationId,requestId,lotId,custodianId,approvedBy,postedBy].every(v=>typeof v==='string' && v.length>0 && v.length<=150 && v===v.trim())
      || !Number.isSafeInteger(quantity) || quantity<1 || quantity>2147483647) throw new BadRequestException('Invalid approved stock issue.');
    return this.db.serializable(async tx=>{
      const where={organizationId_requestId:{organizationId,requestId}};
      const previous=await tx.warehouseIssuePosting.findUnique({where});
      if(previous) {
        if(previous.lotId!==lotId || previous.quantity!==quantity || previous.custodianId!==custodianId
          || previous.approvedBy!==approvedBy || previous.postedBy!==postedBy) throw new ConflictException('Issue reference has different details.');
        return previous;
      }
      const updated=await tx.warehouseStockLot.updateMany({where:{organizationId,lotId,onHand:{gte:quantity}},data:{onHand:{decrement:quantity}}});
      if(!updated.count)throw new ConflictException('The lot does not cover this issue.');
      const lot=await tx.warehouseStockLot.findUniqueOrThrow({where:{organizationId_lotId:{organizationId,lotId}},select:{onHand:true}});
      return tx.warehouseIssuePosting.create({data:{organizationId,requestId,lotId,quantity,custodianId,approvedBy,postedBy,balanceAfter:lot.onHand}});
    }).catch(error=>{
      if(error?.code==='P2002')throw new ConflictException('Issue reference was claimed concurrently.');
      throw error;
    });
  }
}
