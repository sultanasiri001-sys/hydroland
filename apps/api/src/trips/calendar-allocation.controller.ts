import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CalendarAllocationService } from './calendar-allocation.service';
import { CalendarResourceService } from './calendar-resource.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin/calendar')
export class CalendarAllocationController {
  constructor(private readonly calendar: CalendarAllocationService,private readonly resourcesAdmin:CalendarResourceService) {}

  @Get()
  calendarFeed(@Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.calendar(from ?? '', to ?? '');
  }

  @Get('resources')
  resources() {
    return this.calendar.resources();
  }

  @Post('resources')
  createResource(@Req()req:{auth:{accountId:string}},@Body()body:{type?:string;name?:string;referenceId?:string|null}){
    return this.resourcesAdmin.create(req.auth.accountId,body);
  }

  @Patch('resources/:resourceId/status')
  resourceStatus(@Req()req:{auth:{accountId:string}},@Param('resourceId')resourceId:string,@Body()body:{active:boolean}){
    return this.resourcesAdmin.setActive(req.auth.accountId,resourceId,Boolean(body.active));
  }

  @Get(':tripId/allocations')
  allocations(@Param('tripId') tripId: string) {
    return this.calendar.tripAllocations(tripId);
  }

  @Post(':tripId/allocations')
  allocate(@Param('tripId') tripId: string, @Body() body: { resourceIds?: string[] }) {
    return this.calendar.allocate(tripId, Array.isArray(body.resourceIds) ? body.resourceIds : []);
  }
}
