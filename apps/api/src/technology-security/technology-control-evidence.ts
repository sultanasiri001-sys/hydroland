import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { changeOperationalControl, readOperationalControls } from '../trips/operational-controls.service';
import { record } from '../hr/staffing-catalog';
import type { ControlChange, TechnologyRequestRecord } from './technology-request.domain';

type Tx = Prisma.TransactionClient;
type Control = Awaited<ReturnType<typeof readOperationalControls>>[number];

export function proposedControlChange(control: Control): ControlChange | undefined {
  if (!control.canDisable || (control.state !== 'ENABLED' && control.state !== 'DISABLED')) return;
  return {id:control.id, previousState:control.state, state:control.state === 'ENABLED' ? 'DISABLED' : 'ENABLED',
    expectedRevision:control.revision};
}

async function current(tx: Tx, id: string) {
  const control = (await readOperationalControls(tx)).find(item => item.id === id);
  if (!control) throw new ConflictException('تعذر العثور على الضابط المرتبط بالطلب.');
  return control;
}

export async function confirmControlBaseline(tx: Tx, change: ControlChange) {
  const live = proposedControlChange(await current(tx, change.id));
  if (!live || live.expectedRevision !== change.expectedRevision || live.state !== change.state)
    throw new ConflictException('تغير إصدار الضابط أو انطباقه منذ إعداد الطلب.');
}

export async function executeApprovedControl(tx: Tx, audit: AuditService, row: TechnologyRequestRecord, rollback: boolean) {
  const change = row.controlChange!;
  if (!row.approval) throw new ConflictException('يلزم اعتماد طلب تغيير الضابط.');
  let expectedRevision = change.expectedRevision;
  if (rollback) {
    await confirmControlOutcome(tx, row, false);
    const forward = await tx.auditEvent.findUniqueOrThrow({where:{id:row.executionAuditId!}});
    expectedRevision = record(forward.metadata).revision as string;
  }
  const result = await changeOperationalControl(tx, audit, row.assignee.accountId, change.id, {
    state:rollback ? change.previousState : change.state,
    expectedRevision,
    reason:(rollback ? 'رجوع معتمد بموجب الطلب ' : 'تنفيذ معتمد بموجب الطلب ') + row.requestProof.reference,
  }, {
    technologyRequestId:row.id, requestRevision:row.revision, approvedByAccountId:row.approval.accountId, rollback,
  });
  if (!result.receipt || result.receipt.actorId !== row.assignee.personId)
    throw new ConflictException('تعذر تثبيت إيصال مستقل لهذا الطلب.');
  return result.receipt.id;
}

export async function confirmControlOutcome(tx: Tx, row: TechnologyRequestRecord, rollback: boolean) {
  const change = row.controlChange!;
  const eventId = rollback ? row.rollbackAuditId : row.executionAuditId;
  const event = eventId ? await tx.auditEvent.findUnique({where:{id:eventId}}) : null;
  const live = await current(tx, change.id);
  const meta = record(event?.metadata);
  if (!event || event.action !== 'OPERATIONAL_CONTROL_CHANGED' || event.resource !== 'PolicyControl' ||
      event.resourceId !== change.id || event.actorId !== row.assignee.personId ||
      meta.technologyRequestId !== row.id || meta.approvedByAccountId !== row.approval?.accountId ||
      meta.accountId !== row.assignee.accountId || meta.rollback !== rollback || meta.revision !== live.revision ||
      live.state !== (rollback ? change.previousState : change.state))
    throw new ConflictException('تغيرت الحالة الفعلية أو إصدار الضابط، ويلزم تحقق جديد.');
}
