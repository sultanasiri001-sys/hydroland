import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AssetPassportsService } from './asset-passports.service';

@UseGuards(AccessTokenGuard)
@Controller('asset-passports')
export class AssetPassportsController {
  constructor(private readonly passports: AssetPassportsService) {}

  @Get('verify/:token')
  @Header('Cache-Control', 'private, no-store')
  verify(@Req() request: { auth: { accountId: string } }, @Param('token') token: string) {
    return this.passports.verify(request.auth.accountId, token);
  }

  @Get('sources/:kind/:id')
  @Header('Cache-Control', 'private, no-store')
  read(@Req() request: { auth: { accountId: string } }, @Param('kind') kind: string, @Param('id') id: string) {
    return this.passports.read(request.auth.accountId, kind, id);
  }

  @Post('sources/:kind/:id/issue')
  @Header('Cache-Control', 'private, no-store')
  issue(@Req() request: { auth: { accountId: string } }, @Param('kind') kind: string, @Param('id') id: string, @Body() body: unknown) {
    return this.passports.execute(request.auth.accountId, kind, id, 'ISSUE', body);
  }

  @Post('sources/:kind/:id/update')
  @Header('Cache-Control', 'private, no-store')
  update(@Req() request: { auth: { accountId: string } }, @Param('kind') kind: string, @Param('id') id: string, @Body() body: unknown) {
    return this.passports.execute(request.auth.accountId, kind, id, 'UPDATE', body);
  }

  @Post('sources/:kind/:id/revoke')
  @Header('Cache-Control', 'private, no-store')
  revoke(@Req() request: { auth: { accountId: string } }, @Param('kind') kind: string, @Param('id') id: string, @Body() body: unknown) {
    return this.passports.execute(request.auth.accountId, kind, id, 'REVOKE', body);
  }
}
