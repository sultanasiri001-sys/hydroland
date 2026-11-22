import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { templateObject } from '../document-forms/document-template-input';
import { WarehouseDecisionsService } from './warehouse-decisions.service';
import { WarehouseReceivingService } from './warehouse-receiving.service';

type Request = { auth: { accountId: string } };
type Decision = Awaited<ReturnType<WarehouseDecisionsService['detail']>>;

@Controller('warehouse')
@UseGuards(AccessTokenGuard)
export class WarehouseDecisionsController {
  constructor(private readonly decisions: WarehouseDecisionsService, private readonly receiving: WarehouseReceivingService) {}

  private async view(result: Promise<Decision>) {
    const row = await result;
    return { ...row, digest: this.decisions.digest(row), finalDigest: this.decisions.finalDigest(row) };
  }

  @Post('purchase-requests/:id') @Header('Cache-Control','private, no-store')
  purchase(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.view(this.decisions.submit(req.auth.accountId, id, 'PURCHASE', body));
  }

  @Post('counts/:id') @Header('Cache-Control','private, no-store')
  count(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.view(this.decisions.submit(req.auth.accountId, id, 'COUNT', body));
  }

  @Post('issue-requests/:id') @Header('Cache-Control','private, no-store')
  issueRequest(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.view(this.decisions.submit(req.auth.accountId, id, 'ISSUE', body));
  }

  @Post('issue-requests/:id/post') @Header('Cache-Control','private, no-store')
  postIssue(@Req() req: Request, @Param('id') id: string) {
    return this.decisions.postIssue(req.auth.accountId, id);
  }

  @Get('workspace') @Header('Cache-Control','private, no-store')
  workspace(@Req() req: Request) { return this.decisions.workspace(req.auth.accountId); }

  @Get('requests/:id') @Header('Cache-Control','private, no-store')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.view(this.decisions.detail(req.auth.accountId, id));
  }

  @Post('requests/:id/review') @Header('Cache-Control','private, no-store')
  review(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { digest } = templateObject(body, ['digest']);
    return this.view(this.decisions.decide(req.auth.accountId, id, 'review', typeof digest === 'string' ? digest : ''));
  }

  @Post('procurement-representatives/:id') @Header('Cache-Control','private, no-store')
  assign(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.decisions.assign(req.auth.accountId,id,body);
  }

  @Post('requests/:id/recommend') @Header('Cache-Control','private, no-store')
  recommend(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.view(this.decisions.recommend(req.auth.accountId,id,body));
  }

  @Post('requests/:id/finalize') @Header('Cache-Control','private, no-store')
  finalize(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { digest } = templateObject(body,['digest','decision','note']);
    return this.view(this.decisions.decide(req.auth.accountId,id,'finalize',typeof digest==='string'?digest:'',body));
  }

  @Post('receipts/:id') @Header('Cache-Control','private, no-store')
  receive(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.receiving.receiveFromAccount(req.auth.accountId, id, body);
  }
}
