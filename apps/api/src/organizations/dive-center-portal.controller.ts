import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
type AuthenticatedRequest = { auth: { accountId: string } };
import { DiveCenterPortalService } from './dive-center-portal.service';

@Controller('center')
@UseGuards(AccessTokenGuard)
export class DiveCenterPortalController {
  constructor(private readonly portal:DiveCenterPortalService){}
  @Get('me/overview') overview(@Req() request:AuthenticatedRequest){return this.portal.overview(request.auth.accountId);}
  @Get('me/equipment/:resourceId/inspections') equipmentInspections(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string){return this.portal.equipmentInspections(request.auth.accountId,resourceId);}
  @Post('me/equipment/:resourceId/inspections') equipmentInspectionRecord(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string,@Body() body:{status?:string;inspectedAt?:string;serviceExpiresAt?:string|null;notes?:string|null}){return this.portal.recordEquipmentInspection(request.auth.accountId,resourceId,body);}

  @Get('me/equipment') equipment(@Req() request:AuthenticatedRequest){return this.portal.equipment(request.auth.accountId);}
  @Patch('me/equipment/:resourceId/move') equipmentMove(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string,@Body() body:{movementType?:string;toLocation?:string|null;tripId?:string|null;notes?:string|null}){return this.portal.moveEquipment(request.auth.accountId,resourceId,body);}

  @Get('me/equipment/:resourceId/history') equipmentHistory(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string){return this.portal.equipmentHistory(request.auth.accountId,resourceId);}

  @Get('me/customers') customers(@Req() request:AuthenticatedRequest){return this.portal.customers(request.auth.accountId);}

  @Get('me/team') team(@Req() request:AuthenticatedRequest){return this.portal.team(request.auth.accountId);}
  @Get('me/professionals') professionals(@Req() request:AuthenticatedRequest){return this.portal.professionals(request.auth.accountId);}

  @Get('me/trips') trips(@Req() request:AuthenticatedRequest){return this.portal.trips(request.auth.accountId);}
  @Get('me/trips/:tripId/bookings') bookings(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string){return this.portal.bookings(request.auth.accountId,tripId);}
}
