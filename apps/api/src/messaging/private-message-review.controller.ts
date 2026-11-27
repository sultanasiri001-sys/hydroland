import { Body, Controller, Get, Header, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PrivateMessageReviewService } from './private-message-review.service';

type Actor = { auth: { accountId: string } };

@Controller()
@UseGuards(AccessTokenGuard)
export class PrivateMessageReviewController {
  constructor(private readonly review: PrivateMessageReviewService) {}

  @Post('messages/conversations/:conversation/messages/:message/withdraw')
  withdraw(@Req() req: Actor, @Param('conversation') conversation: string, @Param('message') message: string) {
    return this.review.withdraw(req.auth.accountId, conversation, message);
  }
  @Post('messages/conversations/:conversation/messages/:message/report')
  report(@Req() req: Actor, @Param('conversation') conversation: string, @Param('message') message: string) {
    return this.review.report(req.auth.accountId, conversation, message);
  }
  @Get('customer-service/admin/cases/:caseId/message-evidence')
  @Header('Cache-Control','private, no-store')
  read(@Req() req: Actor, @Param('caseId') caseId: string) {
    return this.review.read(req.auth.accountId, caseId);
  }
  @Get('customer-service/admin/cases/:caseId/message-audio-evidence')
  async audio(@Req() req: Actor, @Param('caseId') caseId: string, @Res() res: any) {
    const bytes=await this.review.audio(req.auth.accountId,caseId);
    res.setHeader('Content-Type','audio/wav');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    return res.send(bytes);
  }
  @Post('customer-service/admin/cases/:caseId/release-message-hold')
  release(@Req() req: Actor, @Param('caseId') caseId: string, @Body() body: {reason?: unknown}) {
    return this.review.release(req.auth.accountId, caseId, body?.reason);
  }
}
