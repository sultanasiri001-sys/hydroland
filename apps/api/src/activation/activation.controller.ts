import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewGuard } from '../admin/review.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ActivationService } from './activation.service';

@UseGuards(AccessTokenGuard)
@Controller('activation-requests')
export class ActivationController {
  constructor(private readonly service:ActivationService){}

  @Post()
  request(@Req() req:{auth:{accountId:string}},@Body() body:{role:string}){
    return this.service.request(req.auth.accountId,body.role);
  }

  @Get('mine')
  mine(@Req() req:{auth:{accountId:string}}){
    return this.service.mine(req.auth.accountId);
  }

  @UseGuards(ReviewGuard)
  @Get('review-queue')
  reviewQueue(){
    return this.service.reviewQueue();
  }

  @Post(':id/resubmit')
  resubmit(@Req() req:{auth:{accountId:string}},@Param('id') id:string){
    return this.service.resubmit(req.auth.accountId,id);
  }

  @UseGuards(ReviewGuard)
  @Post(':id/decision')
  decide(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:{outcome:'APPROVED'|'REJECTED'|'MORE_INFORMATION_REQUIRED';reason?:string}){
    return this.service.decide(req.auth.accountId,id,body.outcome,body.reason);
  }
}
