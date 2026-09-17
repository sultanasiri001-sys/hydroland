import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

type AccountStatusValue='PENDING_VERIFICATION'|'ACTIVE'|'SUSPENDED'|'ARCHIVED';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly s:AdminService){}

  @Get('overview') overview(){return this.s.overview()}
  @Get('review-queue') queue(){return this.s.queue()}
  @Get('accounts') accounts(@Req() req:{auth:{accountId:string}}){return this.s.listAccounts(req.auth.accountId)}

  @Patch('accounts/:accountId/status')
  setAccountStatus(
    @Req() req:{auth:{accountId:string}},
    @Param('accountId') accountId:string,
    @Body() body:{status:AccountStatusValue;reason?:string},
  ){
    return this.s.setAccountStatus(req.auth.accountId,accountId,body.status,body.reason);
  }
}
