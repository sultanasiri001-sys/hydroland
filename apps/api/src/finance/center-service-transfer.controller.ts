import { Body, Controller, Get, Header, Param, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CenterServiceTransferService, CenterTransferReview, CenterTransferSubmission } from '../commerce/center-service-transfer.service';
import { financeHttp } from './finance-http';

type Request = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class CenterServiceTransferController {
  constructor(private readonly transfers: CenterServiceTransferService) {}

  @Get('owner/service-transfer-centers')
  @Header('Cache-Control', 'no-store')
  centers(@Req() request: Request) {
    return financeHttp(() => this.transfers.ownerCenters(request.auth.accountId));
  }

  @Get('centers/:centerId/service-transfers')
  @Header('Cache-Control', 'no-store')
  list(@Req() request: Request, @Param('centerId') centerId: string, @Query('bookingId') bookingId?: string) {
    return financeHttp(() => this.transfers.list(request.auth.accountId, centerId, bookingId));
  }

  @Post('centers/:centerId/service-transfers')
  submit(@Req() request: Request, @Param('centerId') centerId: string, @Body() body: CenterTransferSubmission) {
    return financeHttp(() => this.transfers.submit(request.auth.accountId, centerId, body));
  }

  @Post('centers/:centerId/service-transfers/:id/review')
  review(@Req() request: Request, @Param('centerId') centerId: string, @Param('id') id: string, @Body() body: CenterTransferReview) {
    return financeHttp(() => this.transfers.review(request.auth.accountId, centerId, id, body));
  }

  @Get('centers/:centerId/service-transfers/:id/document')
  @Header('Cache-Control', 'no-store')
  async document(@Req() request: Request, @Param('centerId') centerId: string, @Param('id') id: string, @Query('kind') kind = 'transfer') {
    const bytes = await financeHttp(() => this.transfers.download(request.auth.accountId, centerId, id, kind));
    return new StreamableFile(bytes, { type: 'application/pdf', disposition: 'attachment; filename="external-transfer.pdf"' });
  }
}
