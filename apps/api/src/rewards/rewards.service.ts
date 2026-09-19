import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

// Internal trusted-domain mutation contract; no public mutation endpoint is exposed.
type RewardMutation={accountId:string;type:'EARN'|'REDEEM'|'EXPIRE'|'ADJUSTMENT';points:number;idempotencyKey:string;referenceType?:string;referenceId?:string;expiresAt?:Date;metadata?:Prisma.InputJsonValue};

@Injectable()
export class RewardsService {
  constructor(private readonly db:DatabaseService){}
  async mine(accountId:string){
    const account=await this.db.rewardAccount.findUnique({where:{accountId},select:{id:true,points:true,createdAt:true,updatedAt:true}});
    return account??{id:null,points:0,createdAt:null,updatedAt:null};
  }
  async entries(accountId:string){
    const account=await this.db.rewardAccount.findUnique({where:{accountId},select:{id:true}});
    if(!account)return [];
    return this.db.rewardEntry.findMany({where:{rewardAccountId:account.id},select:{id:true,type:true,points:true,balanceAfter:true,referenceType:true,referenceId:true,expiresAt:true,createdAt:true},orderBy:{createdAt:'desc'},take:100});
  }
  async apply(input:RewardMutation){
    if(!Number.isInteger(input.points)||input.points<1||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid reward mutation.');
    if(input.type==='ADJUSTMENT')throw new BadRequestException('Reward adjustment is not enabled.');
    const key=input.idempotencyKey.trim();
    return this.db.$transaction(async tx=>{
      const existing=await tx.rewardEntry.findUnique({where:{idempotencyKey:key}});
      if(existing){
        const account=await tx.rewardAccount.findUnique({where:{id:existing.rewardAccountId},select:{accountId:true}});
        if(!account||account.accountId!==input.accountId||existing.type!==input.type||existing.points!==input.points||existing.referenceType!==(input.referenceType??null)||existing.referenceId!==(input.referenceId??null))throw new ConflictException('Idempotency key cannot be reused with different reward details.');
        return existing;
      }
      const account=await tx.rewardAccount.upsert({where:{accountId:input.accountId},create:{accountId:input.accountId},update:{}});
      if(input.type==='REDEEM'||input.type==='EXPIRE'){
        const changed=await tx.rewardAccount.updateMany({where:{id:account.id,points:{gte:input.points}},data:{points:{decrement:input.points}}});
        if(changed.count!==1)throw new ConflictException('Insufficient reward points.');
      }else await tx.rewardAccount.update({where:{id:account.id},data:{points:{increment:input.points}}});
      const current=await tx.rewardAccount.findUniqueOrThrow({where:{id:account.id},select:{points:true}});
      return tx.rewardEntry.create({data:{rewardAccountId:account.id,type:input.type,points:input.points,balanceAfter:current.points,idempotencyKey:key,referenceType:input.referenceType,referenceId:input.referenceId,expiresAt:input.expiresAt,metadata:input.metadata}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
}
