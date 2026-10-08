import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomerCaseType } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CustomerCaseService } from './customer-case.service';

@UseGuards(AccessTokenGuard)
@Controller('organizations/:organizationId/requests')
export class OrganizationCustomerCaseController {
  constructor(private readonly cases: CustomerCaseService) {}

  @Get()
  list(
    @Req() req: { auth: { accountId: string } },
    @Param('organizationId') organizationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.cases.listForOrganization(req.auth.accountId, organizationId, page, pageSize);
  }

  @Post()
  create(
    @Req() req: { auth: { accountId: string } },
    @Param('organizationId') organizationId: string,
    @Body() body: { type: CustomerCaseType; subject: string; description: string },
  ) {
    return this.cases.createForOrganization(req.auth.accountId, organizationId, body);
  }

  @Get(':caseId')
  get(@Req() req: { auth: { accountId: string } }, @Param('organizationId') organizationId: string, @Param('caseId') caseId: string) {
    return this.cases.getForOrganization(req.auth.accountId, organizationId, caseId);
  }

  @Post(':caseId/replies')
  reply(@Req() req: { auth: { accountId: string } }, @Param('organizationId') organizationId: string, @Param('caseId') caseId: string, @Body() body: { message: string }) {
    return this.cases.replyForOrganization(req.auth.accountId, organizationId, caseId, body.message);
  }
}
