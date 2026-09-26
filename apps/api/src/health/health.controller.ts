import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  getHealth() {
    return {
      service: 'hydroland-api',
      status: 'ok',
      version: '0.1.0',
      commit: process.env.RENDER_GIT_COMMIT || 'local',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return {
        service: 'hydroland-api',
        status: 'ready',
        database: 'ok',
        commit: process.env.RENDER_GIT_COMMIT || 'local',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        service: 'hydroland-api',
        status: 'not_ready',
        database: 'unavailable',
        commit: process.env.RENDER_GIT_COMMIT || 'local',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
