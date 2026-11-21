import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InvoicePermissionsService } from './invoice-permissions.service';

type Request = {auth: {accountId: string}};

@Controller('invoice-permissions')
@UseGuards(AccessTokenGuard)
export class InvoicePermissionsController {
  constructor(private readonly permissions: InvoicePermissionsService) {}

  @Get('centers')
  @Header('Cache-Control', 'private, no-store')
  centers(@Req() req: Request) {
    return this.permissions.listCenters(req.auth.accountId);
  }

  @Get('centers/:id')
  @Header('Cache-Control', 'private, no-store')
  view(@Req() req: Request, @Param('id') id: string) {
    return this.permissions.centerView(req.auth.accountId, id);
  }

  @Post('centers/:id/requests')
  submit(@Req() req: Request, @Param('id') id: string, @Body() input: Record<string, unknown>) {
    return this.permissions.submit(req.auth.accountId, id, input);
  }

  @Get('review')
  @Header('Cache-Control', 'private, no-store')
  review(@Req() req: Request) {
    return this.permissions.queue(req.auth.accountId);
  }

  @Post('review/:id')
  decide(@Req() req: Request, @Param('id') id: string, @Body() input: Record<string, unknown>) {
    return this.permissions.decide(req.auth.accountId, id, input);
  }
}
