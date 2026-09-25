import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WeatherGateMode, WeatherGateService } from './weather-gate.service';
import { StormglassWeatherService } from './stormglass-weather.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin/weather-gate')
export class WeatherGateController {
  constructor(private readonly weatherGate: WeatherGateService,private readonly stormglass:StormglassWeatherService) {}

  @Get()
  settings() {
    return this.weatherGate.settings();
  }

  @Get('snapshot')
  snapshot(@Req() req:{query:{latitude?:string;longitude?:string}}) {
    return this.stormglass.snapshot(Number(req.query.latitude),Number(req.query.longitude));
  }

  @Patch()
  configure(@Req() req:{auth:{accountId:string}},@Body() body: { enabled?: boolean; mode?: WeatherGateMode }) {
    return this.weatherGate.configure(req.auth.accountId,body);
  }
}
