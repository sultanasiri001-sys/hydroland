import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { DiveCenterPortalService } from './dive-center-portal.service';

@Controller('center')
@UseGuards(AuthGuard)
export class DiveCenterPortalController {
  constructor(private readonly portal:DiveCenterPortalService){}
  @Get('me/overview') overview(@Req() request:AuthenticatedRequest){return this.portal.overview(request.auth.accountId);}
  @Get('me/trips') trips(@Req() request:AuthenticatedRequest){return this.portal.trips(request.auth.accountId);}
  @Get('me/trips/:tripId/bookings') bookings(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string){return this.portal.bookings(request.auth.accountId,tripId);}
}
