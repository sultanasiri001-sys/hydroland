import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { platformOrganization } from '../hr/staffing-catalog';
import { notificationDecision, ObserverState, scheduleSignal } from './a06-schedule-evidence';

const stateKey = 'A06_INDEPENDENT_SCHEDULE_OBSERVER:v1';
const productionApi = 'srv-dakelt142hec73aavvsg';

@Injectable()
export class A06IndependentObserver implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(A06IndependentObserver.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    if (process.env.NODE_ENV !== 'production' || process.env.RENDER_SERVICE_ID !== productionApi) return;
    void this.observe();
    this.timer = setInterval(() => void this.observe(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async observe() {
    if (this.running) return;
    this.running = true;
    try {
      if (!await this.db.tryAcquireLease('A06_INDEPENDENT_SCHEDULE', 4.5 * 60_000)) return;
      const now = Date.now();
      const signal = await scheduleSignal(now);
      await this.db.serializable(async tx => {
        const existing = await tx.operationalSetting.findUnique({ where: { key: stateKey } });
        const previous = existing?.value as ObserverState | undefined;
        const { send, state } = notificationDecision(previous, signal, now);
        if (send) {
          const platform = await platformOrganization(tx);
          const account = platform && await tx.account.findFirst({
            where: { id: platform.ownerId, status: 'ACTIVE', emailVerifiedAt: { not: null },
              roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } },
            select: { id: true },
          });
          if (!account) throw new Error('Platform owner unavailable for schedule notification');
          const message = signal === 'SCHEDULE_GAP'
            ? 'لم يظهر تشغيل مجدول ناجح لمراقب المزودين بدأ في آخر ٣٠ دقيقة.'
            : 'تعذرت قراءة بيانات تشغيل مراقب المزودين لمدة ٣٠ دقيقة.';
          await tx.notification.create({ data: { accountId: account.id, type: 'A06_MONITOR_SCHEDULE', status: 'SENT',
            sentAt: new Date(now), payload: { title: 'تأخر التحقق من مراقب المزودين', message, signal, checkedAt: new Date(now).toISOString() } } });
        }
        if (previous?.unavailableSince === state.unavailableSince && previous?.notified === state.notified) return;
        await tx.operationalSetting.upsert({ where: { key: stateKey }, create: { key: stateKey, value: state },
          update: { value: state, updatedAt: new Date(now) } });
      });
      if (signal !== 'CURRENT') this.logger.warn(signal);
    } catch {
      this.logger.error('Independent schedule observation or alert delivery failed');
    } finally {
      this.running = false;
    }
  }
}
