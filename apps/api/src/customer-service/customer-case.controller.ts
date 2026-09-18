import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CustomerCasePriority, CustomerCaseType } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CustomerCaseService } from './customer-case.service';

@UseGuards(AccessTokenGuard)
@Controller('customer-service/cases')
export class CustomerCaseController {
  constructor(private readonly cases: CustomerCaseService) {}
  @Get('mine') listMine(@Req() req: { auth: { accountId: string } }) { return this.cases.listMine(req.auth.accountId); }
  @Post() create(@Req() req: { auth: { accountId: string } }, @Body() body: { type: CustomerCaseType; subject: string; description: string; priority?: CustomerCasePriority; referenceType?: string; referenceId?: string }) { return this.cases.create(req.auth.accountId, body); }
  @Post(':id/replies') reply(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Body() body: { message: string }) { return this.cases.reply(req.auth.accountId, id, body.message); }
}
