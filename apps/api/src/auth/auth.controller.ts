import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('capabilities')
  capabilities() {
    return {
      layer: 'GENERAL-L1',
      status: 'foundation',
      capabilities: ['identity', 'authentication', 'authorization', 'scoping', 'audit'],
    };
  }
}
