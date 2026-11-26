import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProcurementApiService } from './procurement-api.service';
import { procurementExchangeContract } from './procurement-api-contract';
import { ProcurementLabService } from './procurement-lab.service';

type Request = { auth: { accountId: string } };

@Controller('procurement-lab')
@UseGuards(AccessTokenGuard)
export class ProcurementLabController {
  constructor(private readonly lab: ProcurementLabService, private readonly api: ProcurementApiService) {}

  @Get('workspace') @Header('Cache-Control', 'private, no-store')
  async workspace(@Req() req: Request) {
    const [workspace, integration] = await Promise.all([this.lab.workspace(req.auth.accountId), this.api.get(req.auth.accountId)]);
    return { ...workspace, integration, contract: procurementExchangeContract(), technicalStatus: 'READY_FOR_INTERNAL_TEST', commit: process.env.RENDER_GIT_COMMIT || 'local' };
  }

  @Get('contract') @Header('Cache-Control', 'private, no-store')
  contract(@Req() req: Request) { return this.api.contract(req.auth.accountId); }

  @Post('exchange/validate') @Header('Cache-Control', 'private, no-store')
  validate(@Req() req: Request, @Body() body: unknown) { return this.api.validate(req.auth.accountId, body); }

  @Post('integration') @Header('Cache-Control', 'private, no-store')
  integration(@Req() req: Request, @Body() body: unknown) { return this.api.save(req.auth.accountId, body); }

  @Post('integration/check') @Header('Cache-Control', 'private, no-store')
  check(@Req() req: Request, @Body() body: unknown) { return this.api.check(req.auth.accountId, body); }

  @Post('sessions') @Header('Cache-Control', 'private, no-store')
  create(@Req() req: Request, @Body() body: unknown) { return this.lab.create(req.auth.accountId, body); }

  @Get('sessions/:id') @Header('Cache-Control', 'private, no-store')
  detail(@Req() req: Request, @Param('id') id: string) { return this.lab.detail(req.auth.accountId, id); }

  @Post('sessions/:id/actions') @Header('Cache-Control', 'private, no-store')
  act(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) { return this.lab.act(req.auth.accountId, id, body); }
}
