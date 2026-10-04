import { CenterTripManagementService } from './center-trip-management.service';
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
type AuthenticatedRequest = { auth: { accountId: string } };
import { LicenseAttachmentInput, LicenseRecordInput } from './center-license.service';
import { DiveCenterPortalService } from './dive-center-portal.service';

@Controller('center')
@UseGuards(AccessTokenGuard)
export class DiveCenterPortalController {
  constructor(private readonly portal:DiveCenterPortalService,private readonly tripManagement:CenterTripManagementService){}
  @Patch(':id/business-profile') updateBusinessProfile(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.portal.updateBusinessProfile(request.auth.accountId,id,body);}
  @Get('me/reports') reports(@Req() request:AuthenticatedRequest,@Query('from') from?:string,@Query('to') to?:string){return this.portal.reports(request.auth.accountId,from,to);}
  @Get('me/overview') overview(@Req() request:AuthenticatedRequest){return this.portal.overview(request.auth.accountId);}
  @Get('me/safety') safety(@Req() request:AuthenticatedRequest){return this.portal.safety(request.auth.accountId);}

  @Get('me/documents') documents(@Req() request:AuthenticatedRequest){return this.portal.documents(request.auth.accountId);}

  @Patch('me/licenses/:id/register') registerLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string){return this.portal.registerLicense(request.auth.accountId,id);}
  @Post('me/licenses/:id/reviews') routeLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:{toUnitId?:string}){return this.portal.routeLicense(request.auth.accountId,id,body?.toUnitId);}
  @Patch('me/license-reviews/:id/assign') assignReview(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:{assigneeAccountId?:string}){return this.portal.assignLicenseReview(request.auth.accountId,id,body?.assigneeAccountId);}
  @Patch('me/license-reviews/:id/decision') decideReview(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:{decision?:string}){return this.portal.decideLicenseReview(request.auth.accountId,id,body?.decision);}

  @Post('me/licenses/:id/submit') submitLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string){return this.portal.submitLicense(request.auth.accountId,id);}
  @Post('me/licenses/save') saveLicense(@Req() request:AuthenticatedRequest,@Body() body:LicenseRecordInput & LicenseAttachmentInput){return this.portal.saveLicense(request.auth.accountId,body);}
  @Post('me/licenses') createLicense(@Req() request:AuthenticatedRequest,@Body() body:LicenseRecordInput){return this.portal.createLicense(request.auth.accountId,body);}
  @Post('me/licenses/:id/renew') renewLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:LicenseRecordInput){return this.portal.createLicense(request.auth.accountId,body,id);}
  @Patch('me/licenses/:id/attachment') attachLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:LicenseAttachmentInput){return this.portal.attachLicense(request.auth.accountId,id,body);}
  @Get('me/licenses/:id/attachment') async downloadLicense(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Res() res:any){
    const file=await this.portal.downloadLicense(request.auth.accountId,id);
    res.setHeader('Content-Type',file.mimeType);
    res.setHeader('Content-Disposition',`attachment; filename="${file.filename}"`);
    res.setHeader('Cache-Control','private, no-store');
    return res.send(file.bytes);
  }

  @Get('me/equipment/lookup/:code') equipmentLookup(@Req() request:AuthenticatedRequest,@Param('code') code:string){return this.portal.equipmentLookup(request.auth.accountId,code);}
  @Get('me/equipment') equipment(@Req() request:AuthenticatedRequest){return this.portal.equipment(request.auth.accountId);}
  @Patch('me/equipment/:resourceId/move') equipmentMove(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string,@Body() body:{movementType?:string;toLocation?:string|null;tripId?:string|null;notes?:string|null}){return this.portal.moveEquipment(request.auth.accountId,resourceId,body);}

  @Get('me/equipment/:resourceId/history') equipmentHistory(@Req() request:AuthenticatedRequest,@Param('resourceId') resourceId:string){return this.portal.equipmentHistory(request.auth.accountId,resourceId);}

  @Get('me/customers') customers(@Req() request:AuthenticatedRequest){return this.portal.customers(request.auth.accountId);}

  @Get('me/team') team(@Req() request:AuthenticatedRequest){return this.portal.team(request.auth.accountId);}
  @Get('me/professionals') professionals(@Req() request:AuthenticatedRequest){return this.portal.professionals(request.auth.accountId);}

  @Post('me/trips') createTrip(@Req() request:AuthenticatedRequest,@Body() body:Record<string,unknown>){return this.tripManagement.save(request.auth.accountId,body);}
  @Patch('me/trips/:tripId') updateTrip(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string,@Body() body:Record<string,unknown>){return this.tripManagement.save(request.auth.accountId,body,tripId);}
  @Post('me/trips/:tripId/publish') publishTrip(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string,@Body() body:Record<string,unknown>){return this.tripManagement.publish(request.auth.accountId,tripId,body);}
  @Get('me/trips') trips(@Req() request:AuthenticatedRequest){return this.tripManagement.list(request.auth.accountId);}
  @Get('me/trips/:tripId/bookings') bookings(@Req() request:AuthenticatedRequest,@Param('tripId') tripId:string){return this.portal.bookings(request.auth.accountId,tripId);}
}
