import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CrewAssignmentService } from './crew-assignment.service';

@Injectable()
export class CrewEscalationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrewEscalationScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly db: DatabaseService, private readonly crew: CrewAssignmentService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.run();
    }, 60 * 60 * 1000);
    this.timer.unref?.();
    void this.run();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      const acquired = await this.db.tryAcquireLease('CREW_ESCALATION', 55 * 60 * 1000);
      if (!acquired) return;
      const result = await this.crew.escalatePending(24);
      if (result.checked > 0) this.logger.log(`Crew escalation checked ${result.checked} pending assignment(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Crew escalation failed: ${message}`);
    } finally {
      this.running = false;
    }
  }
}
