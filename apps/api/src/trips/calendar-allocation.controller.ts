import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CalendarAllocationService } from './calendar-allocation.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin/calendar')
export class CalendarAllocationController {
  constructor(private readonly calendar: CalendarAllocationService) {}

  @Get()
  calendarFeed(@Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.calendar(from ?? '', to ?? '');
  }

  @Get('resources')
  resources() {
    return this.calendar.resources();
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
