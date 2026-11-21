import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { StoreFeedbackService } from './store-feedback.service';
type UserRequest={auth:{accountId:string}};

@Controller('store')
export class StoreFeedbackController{
  constructor(private readonly feedback:StoreFeedbackService){}
  @Get('products/:id/feedback') list(@Param('id') id:string){return this.feedback.publicList(id)}
  @UseGuards(AccessTokenGuard) @Get('products/:id/feedback/mine') mine(@Req() req:UserRequest,@Param('id') id:string){return this.feedback.mine(req.auth.accountId,id)}
  @UseGuards(AccessTokenGuard) @Post('products/:id/feedback') save(@Req() req:UserRequest,@Param('id') id:string,@Body() input:Record<string,unknown>){return this.feedback.save(req.auth.accountId,id,input)}
  @UseGuards(AccessTokenGuard) @Get('provider/feedback') queue(@Req() req:UserRequest){return this.feedback.queue(req.auth.accountId,false)}
  @UseGuards(AccessTokenGuard) @Patch('provider/feedback/:id') moderate(@Req() req:UserRequest,@Param('id') id:string,@Body() input:Record<string,unknown>){return this.feedback.moderate(req.auth.accountId,false,id,input)}
  @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/feedback') admin(@Req() req:UserRequest){return this.feedback.queue(req.auth.accountId,true)}
  @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/feedback/:id') review(@Req() req:UserRequest,@Param('id') id:string,@Body() input:Record<string,unknown>){return this.feedback.moderate(req.auth.accountId,true,id,input)}
}
