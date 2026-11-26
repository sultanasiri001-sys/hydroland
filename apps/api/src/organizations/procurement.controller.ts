import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProcurementService } from './procurement.service';

type Request = { auth: { accountId: string } };

@Controller('organizations/:organizationId/procurement')
@UseGuards(AccessTokenGuard)
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get('workspace') @Header('Cache-Control', 'private, no-store')
  workspace(@Req() req: Request, @Param('organizationId') organizationId: string) { return this.procurement.workspace(req.auth.accountId, organizationId); }

  @Post('templates/install') @Header('Cache-Control', 'private, no-store')
  install(@Req() req: Request, @Param('organizationId') organizationId: string, @Body() body: unknown) { return this.procurement.installTemplates(req.auth.accountId, organizationId, body); }

  @Get('orders/:id') @Header('Cache-Control', 'private, no-store')
  detail(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string) { return this.procurement.detail(req.auth.accountId, organizationId, id); }

  @Post('orders') @Header('Cache-Control', 'private, no-store')
  create(@Req() req: Request, @Param('organizationId') organizationId: string, @Body() body: unknown) { return this.procurement.create(req.auth.accountId, organizationId, body); }

  @Post('orders/:id/recommend') @Header('Cache-Control', 'private, no-store')
  recommend(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'RECOMMEND', body); }

  @Post('orders/:id/approve') @Header('Cache-Control', 'private, no-store')
  approve(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'APPROVE', body); }

  @Post('orders/:id/invoice') @Header('Cache-Control', 'private, no-store')
  invoice(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'INVOICE', body); }

  @Post('orders/:id/receipts') @Header('Cache-Control', 'private, no-store')
  receive(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'RECEIVE', body); }

  @Post('orders/:id/receipt-acceptance') @Header('Cache-Control', 'private, no-store')
  receiptAcceptance(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'RECEIPT_ACCEPTANCE', body); }

  @Post('orders/:id/settlement/prepare') @Header('Cache-Control', 'private, no-store')
  prepareSettlement(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'PREPARE_SETTLEMENT', body); }

  @Post('orders/:id/settlement/approve') @Header('Cache-Control', 'private, no-store')
  approveSettlement(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'APPROVE_SETTLEMENT', body); }

  @Post('orders/:id/settlement/confirm') @Header('Cache-Control', 'private, no-store')
  confirmSettlement(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'CONFIRM_SETTLEMENT', body); }

  @Post('orders/:id/cancel') @Header('Cache-Control', 'private, no-store')
  cancel(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'CANCEL', body); }

  @Post('orders/:id/reverse') @Header('Cache-Control', 'private, no-store')
  reverse(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'REVERSE', body); }

  @Post('orders/:id/recovery/prepare') @Header('Cache-Control', 'private, no-store')
  prepareRecovery(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'PREPARE_RECOVERY', body); }

  @Post('orders/:id/recovery/approve') @Header('Cache-Control', 'private, no-store')
  approveRecovery(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'APPROVE_RECOVERY', body); }

  @Post('orders/:id/recovery/confirm') @Header('Cache-Control', 'private, no-store')
  confirmRecovery(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'CONFIRM_RECOVERY', body); }

  @Post('orders/:id/acceptance') @Header('Cache-Control', 'private, no-store')
  acceptance(@Req() req: Request, @Param('organizationId') organizationId: string, @Param('id') id: string, @Body() body: unknown) { return this.procurement.mutate(req.auth.accountId, organizationId, id, 'ACCEPTANCE', body); }
}
