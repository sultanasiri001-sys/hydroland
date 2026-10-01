import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
type AuthenticatedRequest = { auth: { accountId: string } };
import { DiveCenterPortalService } from './dive-center-portal.service';

@Controller('center')
@UseGuards(AccessTokenGuard)
export class DiveCenterPortalController {
  constructor(private readonly portal:DiveCenterPortalService){}
  @Get('me/overview') overview(@Req() request:AuthenticatedRequest){return this.portal.overview(request.auth.accountId);}
  @Get('me/inventory') inventory(@Req() request:AuthenticatedRequest){return this.portal.inventory(request.auth.accountId);}

  @Get('me/customers') customers(@Req() request:AuthenticatedRequest){return this.portal.customers(request.auth.accountId);}

  @Get('me/team') team(@Req() request:AuthenticatedRequest){return this.portal.team(request.auth.accountId);}
  @Get('me/professionals') professionals(@Req() request:AuthenticatedRequest){return this.portal.professionals(request.auth.accountId);}

  @Get('me/trips') trips(@Req() request:AuthenticatedRequest){return this.portal.trips(request.auth.accountId);}
  @Get('me/trips/:tripId/bookings') bookings(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string){return this.portal.bookings(request.auth.accountId,tripId);}
}
