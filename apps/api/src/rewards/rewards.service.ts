import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
}
