import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly s:AdminService){}

  @Get('overview') overview(){return this.s.overview()}
  @Get('review-queue') queue(){return this.s.queue()}
  @Get('accounts') accounts(){return this.s.listAccounts()}

  @Patch('accounts/:accountId/status')
  setAccountStatus(
    @Req() req:{auth:{accountId:string}},
    @Param('accountId') accountId:string,
    @Body() body:{status:AccountStatus;reason?:string},
  ){
    return this.s.setAccountStatus(req.auth.accountId,accountId,body.status,body.reason);
  }
}
