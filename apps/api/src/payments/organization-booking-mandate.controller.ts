import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { OrganizationBookingMandateService } from '../finance/organization-booking-mandate.service';

@UseGuards(AccessTokenGuard)
@Controller('organizations/:organizationId/booking-payment-mandates/:documentId')
export class OrganizationBookingMandateController {
  constructor(private readonly mandates: OrganizationBookingMandateService) {}

  @Get()
  preview(@Req() request: { auth: { accountId: string } }, @Param('organizationId') organization: string, @Param('documentId') document: string) {
    return this.mandates.preview(request.auth.accountId, organization, document);
  }

  @Post('approve')
  approve(@Req() request: { auth: { accountId: string } }, @Param('organizationId') organization: string, @Param('documentId') document: string,
    @Body() input: Record<string, unknown>) {
    return this.mandates.approve(request.auth.accountId, organization, document, input);
  }
}
