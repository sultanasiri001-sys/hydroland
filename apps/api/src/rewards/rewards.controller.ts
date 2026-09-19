import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RewardsService } from './rewards.service';

@Controller('rewards')
@UseGuards(AccessTokenGuard)
export class RewardsController {
  constructor(private readonly rewards:RewardsService){}
  @Get('mine') mine(@Req() req:any){return this.rewards.mine(req.auth.accountId)}
  @Get('mine/entries') entries(@Req() req:any){return this.rewards.entries(req.auth.accountId)}
}
