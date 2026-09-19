import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

type WalletMutation={accountId:string;type:'CREDIT'|'DEBIT'|'REFUND'|'ADJUSTMENT';amountMinor:number;idempotencyKey:string;referenceType?:string;referenceId?:string;metadata?:Prisma.InputJsonValue};

@Injectable()
export class WalletService {
  constructor(private readonly db:DatabaseService){}
  async mine(accountId:string){
    const wallet=await this.db.wallet.findUnique({where:{accountId},select:{id:true,currency:true,balanceMinor:true,createdAt:true,updatedAt:true}});
    return wallet??{id:null,currency:'SAR',balanceMinor:0,createdAt:null,updatedAt:null};
  }
  async entries(accountId:string){
    const wallet=await this.db.wallet.findUnique({where:{accountId},select:{id:true}});
    if(!wallet)return [];
    return this.db.walletEntry.findMany({where:{walletId:wallet.id},select:{id:true,type:true,amountMinor:true,balanceAfterMinor:true,referenceType:true,referenceId:true,createdAt:true},orderBy:{createdAt:'desc'},take:100});
  }
  async apply(input:WalletMutation){
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<1||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid wallet mutation.');
    const key=input.idempotencyKey.trim();
    return this.db.$transaction(async tx=>{
      const existing=await tx.walletEntry.findUnique({where:{idempotencyKey:key}});
      if(existing){
        const wallet=await tx.wallet.findUnique({where:{id:existing.walletId},select:{accountId:true}});
        if(!wallet||wallet.accountId!==input.accountId||existing.type!==input.type||existing.amountMinor!==input.amountMinor||existing.referenceType!==(input.referenceType??null)||existing.referenceId!==(input.referenceId??null))throw new ConflictException('Idempotency key cannot be reused with different wallet details.');
        return existing;
      }
      const wallet=await tx.wallet.upsert({where:{accountId:input.accountId},create:{accountId:input.accountId},update:{}});
      const delta=input.type==='DEBIT'?-input.amountMinor:input.type==='ADJUSTMENT'?0:input.amountMinor;
      if(input.type==='ADJUSTMENT')throw new BadRequestException('Adjustment requires an explicit signed policy and is not enabled.');
      if(delta<0){
        const changed=await tx.wallet.updateMany({where:{id:wallet.id,balanceMinor:{gte:input.amountMinor}},data:{balanceMinor:{decrement:input.amountMinor}}});
        if(changed.count!==1)throw new ConflictException('Insufficient wallet balance.');
      }else await tx.wallet.update({where:{id:wallet.id},data:{balanceMinor:{increment:input.amountMinor}}});
      const current=await tx.wallet.findUniqueOrThrow({where:{id:wallet.id},select:{balanceMinor:true}});
      return tx.walletEntry.create({data:{walletId:wallet.id,type:input.type,amountMinor:input.amountMinor,balanceAfterMinor:current.balanceMinor,idempotencyKey:key,referenceType:input.referenceType,referenceId:input.referenceId,metadata:input.metadata}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
}
