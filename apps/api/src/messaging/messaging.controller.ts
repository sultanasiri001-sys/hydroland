import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { MessagingService } from './messaging.service';

type AuthRequest={auth:{accountId:string}};

@UseGuards(AccessTokenGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly messaging:MessagingService){}

  @Get('conversations')
  list(@Req() request:AuthRequest){return this.messaging.listConversations(request.auth.accountId)}

  @Post('conversations')
  create(@Req() request:AuthRequest,@Body() body:unknown){return this.messaging.createConversation(request.auth.accountId,(body??{}) as Record<string,unknown>)}

  @Get('conversations/:id')
  get(@Req() request:AuthRequest,@Param('id') id:string){return this.messaging.getConversation(request.auth.accountId,id)}

  @Get('conversations/:id/messages')
  history(@Req() request:AuthRequest,@Param('id') id:string,@Query('before') before:unknown){return this.messaging.listMessages(request.auth.accountId,id,before)}

  @Post('conversations/:id/messages')
  send(@Req() request:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.messaging.sendMessage(request.auth.accountId,id,(body??{}) as Record<string,unknown>)}

  @Post('conversations/:id/read')
  read(@Req() request:AuthRequest,@Param('id') id:string){return this.messaging.markRead(request.auth.accountId,id)}
}
