import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db:DatabaseService){}

  list(accountId:string){
    return this.db.notification.findMany({where:{accountId},orderBy:{createdAt:'desc'},take:100});
  }

  notify(accountId:string,type:string,payload:Record<string,unknown>){
    return this.db.notification.create({data:{accountId,type,payload:payload as never,status:'SENT',sentAt:new Date()}});
  }

  async read(accountId:string,id:string){
    const result=await this.db.notification.updateMany({where:{id,accountId},data:{status:'READ'}});
    if(!result.count)throw new NotFoundException('Notification not found.');
    return{id,status:'READ'};
  }
}
