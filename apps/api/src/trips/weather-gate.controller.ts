import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WeatherGateMode, WeatherGateService } from './weather-gate.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin/weather-gate')
export class WeatherGateController {
  constructor(private readonly weatherGate: WeatherGateService) {}

  @Get()
  settings() {
    return this.weatherGate.settings();
  }

  @Patch()
  configure(@Req() req:{auth:{accountId:string}},@Body() body: { enabled?: boolean; mode?: WeatherGateMode }) {
    return this.weatherGate.configure(req.auth.accountId,body);
  }
}