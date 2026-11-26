import { Body, Controller, Get, Header, Param, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CommerceAllocationInput, CommerceSourceFinanceService } from '../commerce/commerce-source-finance.service';
import { CommerceSourceTransferService } from '../commerce/commerce-source-transfer.service';
import { CenterTransferReview, CenterTransferSubmission } from '../commerce/center-service-transfer.service';
import { financeHttp } from './finance-http';

type Request = { auth: { accountId: string } };
@Controller('finance')
@UseGuards(AccessTokenGuard)
export class CommerceSourceFinanceController {
  constructor(private readonly finance: CommerceSourceFinanceService, private readonly transfers: CommerceSourceTransferService) {}
  @Get('owner/commerce-centers') @Header('Cache-Control', 'no-store')
  centers(@Req() req: Request) { return financeHttp(() => this.finance.centers(req.auth.accountId)); }
  @Get('centers/:centerId/commerce-sources') @Header('Cache-Control', 'no-store')
  list(@Req() req: Request, @Param('centerId') center: string) { return financeHttp(() => this.finance.list(req.auth.accountId, center)); }
  @Get('centers/:centerId/commerce-sources/:type/:id') @Header('Cache-Control', 'no-store')
  read(@Req() req: Request, @Param('centerId') center: string, @Param('type') type: string, @Param('id') id: string) {
    return financeHttp(() => this.finance.read(req.auth.accountId, center, type, id));
  }
  @Post('centers/:centerId/commerce-sources/:type/:id/invoice-finalization')
  finalize(@Req() req: Request, @Param('centerId') center: string, @Param('type') type: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return financeHttp(() => this.finance.finalize(req.auth.accountId, center, type, id, body));
  }
  @Post('centers/:centerId/commerce-sources/:type/:id/allocation')
  allocate(@Req() req: Request, @Param('centerId') center: string, @Param('type') type: string, @Param('id') id: string, @Body() body: CommerceAllocationInput) {
    return financeHttp(() => this.finance.allocate(req.auth.accountId, center, type, id, body));
  }
  @Post('centers/:centerId/commerce-sources/:type/:id/allocation/revoke')
  revoke(@Req() req: Request, @Param('centerId') center: string, @Param('type') type: string, @Param('id') id: string,
    @Body() body: { allocationApprovalEventId: string; reason: string }) { return financeHttp(() => this.finance.revoke(req.auth.accountId, center, type, id, body)); }
  @Post('centers/:centerId/commerce-sources/:type/:id/prepare')
  prepare(@Req() req: Request, @Param('centerId') center: string, @Param('type') type: string, @Param('id') id: string,
    @Body() body: { financeAccountId: string; allocationApprovalEventId: string }) { return financeHttp(() => this.finance.prepare(req.auth.accountId, center, type, id, body)); }
  @Get('centers/:centerId/commerce-transfers') @Header('Cache-Control', 'no-store')
  transferList(@Req() req: Request, @Param('centerId') center: string) { return financeHttp(() => this.transfers.list(req.auth.accountId, center)); }
  @Post('centers/:centerId/commerce-transfers')
  submit(@Req() req: Request, @Param('centerId') center: string, @Body() body: CenterTransferSubmission) { return financeHttp(() => this.transfers.submit(req.auth.accountId, center, body)); }
  @Post('centers/:centerId/commerce-transfers/:id/review')
  review(@Req() req: Request, @Param('centerId') center: string, @Param('id') id: string, @Body() body: CenterTransferReview) {
    return financeHttp(() => this.transfers.review(req.auth.accountId, center, id, body));
  }
  @Get('centers/:centerId/commerce-transfers/:id/document') @Header('Cache-Control', 'no-store')
  async document(@Req() req: Request, @Param('centerId') center: string, @Param('id') id: string, @Query('kind') kind = 'transfer') {
    const bytes = await financeHttp(() => this.transfers.download(req.auth.accountId, center, id, kind));
    return new StreamableFile(bytes, { type: 'application/pdf', disposition: 'attachment; filename="external-transfer.pdf"' });
  }
}
