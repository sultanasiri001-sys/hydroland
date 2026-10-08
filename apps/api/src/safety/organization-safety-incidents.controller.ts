import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { SafetyIncidentsService } from './safety-incidents.service';

type RequestWithAuth = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('organizations/:organizationId/safety/incidents')
export class OrganizationSafetyIncidentsController {
  constructor(private readonly incidents: SafetyIncidentsService) {}

  @Get()
  list(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string) {
    return this.incidents.listForOrganization(request.auth.accountId, organizationId);
  }

  @Post()
  create(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>) {
    const allowed = ['bookingId', 'severity', 'title', 'description', 'locationName'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new BadRequestException('حقول بلاغ السلامة غير صالحة.');
    if (typeof body.bookingId !== 'string' || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.severity !== 'string' || body.locationName !== undefined && typeof body.locationName !== 'string') throw new BadRequestException('بيانات بلاغ السلامة غير صالحة.');
    return this.incidents.createForOrganization(request.auth.accountId, organizationId, body as { bookingId: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; title: string; description: string; locationName?: string });
  }
}
