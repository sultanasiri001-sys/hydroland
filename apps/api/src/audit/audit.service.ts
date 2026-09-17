import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db:DatabaseService){}

  private async resolveActorId(actorId?:string){
    if(!actorId)return undefined;
    const person=await this.db.person.findUnique({where:{id:actorId},select:{id:true}});
    if(person)return person.id;
    const account=await this.db.account.findUnique({where:{id:actorId},select:{personId:true}});
    return account?.personId;
  }

  async record(input:{actorId?:string;action:string;resource:string;resourceId?:string;metadata?:object}){
    const actorId=await this.resolveActorId(input.actorId);
    return this.db.auditEvent.create({data:{action:input.action,resource:input.resource,resourceId:input.resourceId,actorId,metadata:input.metadata as never}});
  }

  async mine(accountId:string){
    const account=await this.db.account.findUnique({where:{id:accountId},select:{personId:true}});
    if(!account)return [];
    return this.db.auditEvent.findMany({where:{actorId:account.personId},orderBy:{occurredAt:'desc'},take:100});
  }
}
