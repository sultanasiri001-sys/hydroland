import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WeatherGateMode, WeatherGateService } from './weather-gate.service';
import { StormglassWeatherService } from './stormglass-weather.service';
import { TripWeatherReviewService, TripWeatherReviewStatus } from './trip-weather-review.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin/weather-gate')
export class WeatherGateController {
  constructor(private readonly weatherGate: WeatherGateService,private readonly stormglass:StormglassWeatherService,private readonly reviews:TripWeatherReviewService) {}

  @Get()
  settings() {
    return this.weatherGate.settings();
  }

  @Get('snapshot')
  snapshot(@Req() req:{query:{latitude?:string;longitude?:string;at?:string}}) {
    return this.stormglass.snapshot(Number(req.query.latitude),Number(req.query.longitude),req.query.at);
  }

  @Get('trips/:tripId')
  tripState(@Param('tripId') tripId:string){return this.reviews.state(tripId);}

  @Post('trips/:tripId/refresh')
  refreshTrip(@Req() req:{auth:{accountId:string}},@Param('tripId') tripId:string){return this.reviews.refresh(req.auth.accountId,tripId);}

  @Post('trips/:tripId/decision')
  decideTrip(@Req() req:{auth:{accountId:string}},@Param('tripId') tripId:string,@Body() body:{status?:TripWeatherReviewStatus;notes?:string|null}){return this.reviews.decide(req.auth.accountId,tripId,body);}

  @Patch()
  configure(@Req() req:{auth:{accountId:string}},@Body() body: { enabled?: boolean; mode?: WeatherGateMode }) {
    return this.weatherGate.configure(req.auth.accountId,body);
  }
}
