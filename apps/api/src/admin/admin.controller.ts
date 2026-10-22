import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

type AccountStatusValue='ACTIVE'|'SUSPENDED';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly s:AdminService){}

  @Get('overview') overview(){return this.s.overview()}
  @Get('review-queue') queue(){return this.s.queue()}
  @Get('accounts') accounts(@Req() req:{auth:{accountId:string}},@Query('cursor') cursor?:string,@Query('search') search?:string){return this.s.listAccounts(req.auth.accountId,{cursor,search})}

  @Patch('accounts/:accountId/status')
  setAccountStatus(
    @Req() req:{auth:{accountId:string}},
    @Param('accountId') accountId:string,
    @Body() body:{status:AccountStatusValue;reason?:unknown;expectedUpdatedAt?:unknown;reviewed?:unknown},
  ){
    return this.s.setAccountStatus(req.auth.accountId,accountId,body?.status,body?.reason,body?.expectedUpdatedAt,body?.reviewed);
  }
}
