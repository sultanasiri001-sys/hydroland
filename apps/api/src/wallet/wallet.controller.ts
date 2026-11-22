import { WalletPostingService } from './wallet-posting.service';
import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(AccessTokenGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService, private readonly postings: WalletPostingService) {}
  @Post('postings/:entryId')
  post(@Req() req:any,@Param('entryId') entryId:string){return this.postings.post(req.auth.accountId,entryId)}
  @Get('mine') mine(@Req() req:any){return this.wallet.mine(req.auth.accountId)}
  @Get('mine/entries') entries(@Req() req:any){return this.wallet.entries(req.auth.accountId)}
}
