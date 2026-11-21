import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

import { isProductionProviderMonitor } from './a06-schedule-evidence';

import { deliverProviderEscalations } from './render-provider-escalation';

const cadenceMs = 15 * 60_000;
const monitor = 'integration.provider.monitor.render';
const resourceId = 'quarter-hour';

@Injectable()
export class RenderProviderObserver implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private inflight?: Promise<void>;
  private readonly logger = new Logger(RenderProviderObserver.name);

  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  onApplicationBootstrap() {
    if (!isProductionProviderMonitor()) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), 60_000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.inflight;
  }

  private poll() {
    if (this.inflight) return;
    this.inflight = this.db.$transaction(tx => this.capture(tx))
      .then(receipt => {
        if (!receipt) return;
        const log = JSON.stringify({source: monitor, ...receipt});
        if (receipt.missedSlots || receipt.providers.some(p => p.state === 'DEGRADED')) this.logger.warn(log);
        else this.logger.log(log);
      })
      .catch(() => this.logger.error('Render provider observation failed. The current quarter will be retried.'))
      .then(() => this.db.$transaction(tx => deliverProviderEscalations(tx, this.audit)))
      .catch(() => this.logger.error('Provider escalation delivery failed. The next poll will retry.'))
      .finally(() => { this.inflight = undefined; });
  }

  async capture(tx: Prisma.TransactionClient) {
    // Across replicas/redeploys, exactly one transaction records the current
    // quarter. A failed read or write rolls back and leaves the quarter open.
    const [lock] = await tx.$queryRaw<Array<{acquired: boolean}>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${monitor})::bigint) AS acquired`;
    if (!lock.acquired) return;
    const [clock] = await tx.$queryRaw<Array<{now: Date}>>`SELECT clock_timestamp() AS now`;
    const slot = Math.floor(clock.now.getTime() / cadenceMs);
    const last = await tx.auditEvent.findFirst({
      where: {resource: monitor, resourceId}, orderBy: {occurredAt: 'desc'}, select: {occurredAt: true},
    });
    const previousSlot = last && Math.floor(last.occurredAt.getTime() / cadenceMs);
    if (previousSlot !== null && previousSlot >= slot) return;

    const providers = await this.audit.providerHealth(tx);
    for (const p of providers) {
      const valid = p.state === 'UNKNOWN' ? p.category === null && p.observedAt === null
        : p.observedAt !== null && Date.parse(p.observedAt) <= clock.now.getTime() + 60_000 &&
          (p.state === 'AVAILABLE' ? p.category === 'SUCCESS' : p.category === 'PROVIDER_FAILURE');
      if (!valid) throw new Error('Inconsistent provider observation');
    }
    const receipt = {
      slotStart: new Date(slot * cadenceMs).toISOString(),
      sampledAt: clock.now.toISOString(),
      missedSlots: previousSlot === null ? null : slot - previousSlot - 1,
      providers,
    };
    await tx.auditEvent.create({data: {
      action: 'integration.provider.monitor.sampled', resource: monitor, resourceId,
      occurredAt: clock.now, metadata: receipt,
    }});
    return receipt;
  }
}
