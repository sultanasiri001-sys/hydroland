import { Body, Controller, Get, Header, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PrivateAudioService } from './private-audio.service';
type Actor = { auth: { accountId: string } };
@Controller('messages/conversations')
@UseGuards(AccessTokenGuard)
export class PrivateAudioController {
  constructor(private readonly audio: PrivateAudioService) {}
  @Post(':conversation/audio')
  send(@Req() req: Actor, @Param('conversation') conversation: string, @Body() body: Parameters<PrivateAudioService['send']>[2]) { return this.audio.send(req.auth.accountId, conversation, body ?? {}); }
  @Get(':conversation/messages/:message/audio')
  @Header('Cache-Control','private, no-store')
  async read(@Req() req: Actor, @Param('conversation') conversation: string, @Param('message') message: string, @Res() res: any) {
    const bytes = await this.audio.read(req.auth.accountId, conversation, message);
    res.setHeader('Content-Type','audio/wav'); res.setHeader('Content-Disposition','inline; filename="private-audio.wav"'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    return res.send(bytes);
  }
}
