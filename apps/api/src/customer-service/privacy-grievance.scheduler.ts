import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrivacyGrievanceService } from './privacy-grievance.service';

@Injectable()
export class PrivacyGrievanceScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(PrivacyGrievanceScheduler.name);
  constructor(private readonly cases: PrivacyGrievanceService) {}
  onModuleInit() {
    this.timer=setInterval(() => { void this.run(); },60_000);
    this.timer.unref();
    void this.run();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async run() {
    if (this.running) return;
    this.running=true;
    try { await this.cases.escalateDue(); }
    catch { this.logger.error('Could not process overdue privacy grievances.'); }
    finally { this.running=false; }
  }
}
