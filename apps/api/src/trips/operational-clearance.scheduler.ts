import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OperationalClearanceService } from './operational-clearance.service';

@Injectable()
export class OperationalClearanceScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly db: DatabaseService, private readonly clearance: OperationalClearanceService) {}

  onModuleInit() {
    void this.scan();
    this.timer = setInterval(() => void this.scan(), 5 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async scan() {
    if (this.running) return;
    this.running = true;
    try {
      const acquired = await this.db.tryAcquireLease('OPERATIONAL_CLEARANCE_SCAN', 4 * 60 * 1000);
      if (!acquired) return;
      const trips = await this.db.trip.findMany({ where: { status: { in: ['OPEN', 'CLOSED'] } }, select: { id: true } });
      for (const trip of trips) {
        try {
          await this.clearance.revokeIfStale(trip.id);
        } catch {
          // A later scan retries transient failures.
        }
      }
    } finally {
      this.running = false;
    }
  }
}
