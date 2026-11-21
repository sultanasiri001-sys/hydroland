import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { platformOrganization } from '../hr/staffing-catalog';
import { escalationMs } from './a06-schedule-evidence';

const resource = 'integration.provider.escalation.render';
const logger = new Logger('RenderProviderEscalation');

export async function deliverProviderEscalations(tx: Prisma.TransactionClient, audit: AuditService) {
  const [lock] = await tx.$queryRaw<Array<{ acquired: boolean; now: Date }>>`
    SELECT pg_try_advisory_xact_lock(hashtext(${resource})::bigint) AS acquired, clock_timestamp() AS now`;
  if (!lock.acquired) return;
  const rows = await audit.providerHealth(tx);
  for (const row of rows) {
    if (!row.observedAt || row.state === 'UNKNOWN') continue;
    const failed = row.state === 'DEGRADED' && row.category === 'PROVIDER_FAILURE';
    const recovered = row.state === 'AVAILABLE' && row.category === 'SUCCESS';
    if (!failed && !recovered) continue;
    const observed = Date.parse(row.observedAt);
    if (!Number.isFinite(observed) || observed > lock.now.getTime() ||
        (failed && lock.now.getTime() - observed < escalationMs)) continue;

    const last = await tx.auditEvent.findFirst({
      where: { resource, resourceId: row.provider }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { action: true, metadata: true },
    });
    const metadata = last?.metadata;
    const previous = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata.observedAt : null;
    if (typeof previous === 'string' && observed <= Date.parse(previous)) continue;
    if (recovered && last?.action !== 'provider.escalated') continue;

    // Share the source writer's lock, then verify the transition is still current.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'a06.provider.' + row.provider})::bigint)`;
    const current = await tx.auditEvent.findFirst({
      where: { resource: 'integration.provider.health', resourceId: 'a06.provider.' + row.provider },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], select: { occurredAt: true, metadata: true },
    });
    const signal = current?.metadata;
    if (current?.occurredAt.toISOString() !== row.observedAt || !signal || typeof signal !== 'object' ||
        Array.isArray(signal) || signal.state !== row.state || signal.category !== row.category) continue;

    const platform = await platformOrganization(tx);
    const owner = platform && await tx.account.findFirst({
      where: { id: platform.ownerId, status: 'ACTIVE', emailVerifiedAt: { not: null },
        roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } }, select: { id: true },
    });
    if (!owner) {
      logger.warn('Provider escalation recipient unavailable; delivery will be retried');
      continue;
    }
    const title = failed ? 'استمرار تعطل مزود الخدمة' : 'عودة مزود الخدمة';
    const message = failed ? 'استمرت حالة التعطل المسجلة ٣٠ دقيقة على الأقل.' : 'سجل التطبيق نجاحًا بعد تنبيه التعطل.';
    const receipt = await tx.notification.create({ data: { accountId: owner.id, type: 'A06_PROVIDER_STATUS',
      status: 'SENT', sentAt: lock.now, payload: { title, message: row.provider + ' — ' + message,
        provider: row.provider, observedAt: row.observedAt, state: row.state } }, select: { id: true } });
    await tx.auditEvent.create({ data: { resource, resourceId: row.provider,
      action: failed ? 'provider.escalated' : 'provider.recovered', occurredAt: lock.now,
      metadata: { observedAt: row.observedAt, notificationId: receipt.id } } });
  }
}
