import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReviewGuard implements CanActivate {
  constructor(private readonly db:DatabaseService){}

  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<{auth?:{accountId:string}}>();
    if(!request.auth?.accountId)throw new ForbiddenException();
    const role=await this.db.roleAssignment.findFirst({where:{accountId:request.auth.accountId,status:'ACTIVE',role:{in:['ADMIN','REVIEWER']}},select:{id:true}});
    if(!role)throw new ForbiddenException('Review scope required.');
    return true;
  }
}
