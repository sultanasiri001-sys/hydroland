import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { platformOrganization } from '../hr/staffing-catalog';
import { OPERATIONAL_CONTROLS } from './operational-controls.catalog';

const ownerControls = new Set(OPERATIONAL_CONTROLS
  .filter(control => control.id !== 'TRAINING.SESSION_TIME_WINDOW')
  .map(control => control.id));

export async function requireCatalogOwner(tx: Prisma.TransactionClient, accountId: string, category: string, ruleKey: string) {
  if (category==='TRAINING' && ruleKey==='SESSION_TIME_WINDOW')
    throw new ForbiddenException('يتطلب تغيير موعد فتح الجلسة طلب تغيير معتمدًا من مالك الإصدار المفوض بعد المراجعة المستقلة.');
  if (!ownerControls.has(category + '.' + ruleKey)) return;
  const organization = await platformOrganization(tx);
  if (organization?.ownerId === accountId) {
    const owner = await tx.account.findFirst({
      where: { id: accountId, status: 'ACTIVE', emailVerifiedAt: { not: null },
        roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } }, select: { id: true },
    });
    if (owner) return;
  }
  throw new ForbiddenException('يتطلب تغيير هذا الضابط اعتماد مالك المنصة.');
}
