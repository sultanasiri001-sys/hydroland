import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
}
