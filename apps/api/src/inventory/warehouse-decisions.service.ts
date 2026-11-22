import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryIssueLedgerService } from './inventory-issue-ledger.service';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { eligibleReviewParticipant, reviewPlatform } from '../document-forms/internal-document-review.domain';
import { templateObject } from '../document-forms/document-template-input';
import { decisionDigest, scopeId } from '../document-forms/owner-administrative-decision.domain';

type Kind = 'COUNT' | 'PURCHASE' | 'ISSUE';
interface Purchase { purchaseReference: string; supplierId: string; itemId: string; quantity: number; unitCostMinor: number }
interface Count { lotId: string; counted: number; reason: string; expected: number; revision: number }

function integer(value: unknown, minimum: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > 2147483647) {
    throw new BadRequestException('الكمية أو التكلفة خارج النطاق.');
  }
  return value;
}

function purchaseInput(body: unknown): Purchase {
  const x = templateObject(body, ['purchaseReference','supplierId','itemId','quantity','unitCostMinor']);
  scopeId(x.purchaseReference); scopeId(x.supplierId); scopeId(x.itemId);
  return { purchaseReference: x.purchaseReference, supplierId: x.supplierId, itemId: x.itemId,
    quantity: integer(x.quantity, 1), unitCostMinor: integer(x.unitCostMinor, 0) };
}

function issueInput(body: unknown) {
  const x = templateObject(body, ['lotId','custodianId','quantity']);
  scopeId(x.lotId); scopeId(x.custodianId);
  return { lotId: x.lotId, custodianId: x.custodianId, quantity: integer(x.quantity, 1) };
}

function countInput(body: unknown) {
  const x = templateObject(body, ['lotId','counted','reason']);
  scopeId(x.lotId);
  if (typeof x.reason !== 'string' || !x.reason.trim() || x.reason.length > 500) throw new BadRequestException('أدخل سبب الجرد.');
  return { lotId: x.lotId, counted: integer(x.counted, 0), reason: x.reason.trim() };
}

@Injectable()
export class WarehouseDecisionsService {
  constructor(private readonly db: DatabaseService, private readonly issues: InventoryIssueLedgerService) {}

  async submit(actor: string, id: string, kind: Kind, body: unknown) {
    scopeId(id);
    return this.db.serializable(async tx => {
      const org = await reviewPlatform(tx);
      const maker = await eligibleReviewParticipant(tx, org.id, 'INVENTORY_LOGISTICS', actor, 'EMPLOYEE');
      const where = { organizationId_id: { organizationId: org.id, id } };
      const input = kind === 'COUNT' ? countInput(body) : kind === 'ISSUE' ? issueInput(body) : purchaseInput(body);
      const old = await tx.warehouseDecisionRequest.findUnique({ where });
      if (old) {
        const saved = old.details as Record<string, unknown>;
        if (old.makerId !== actor || old.kind !== kind || Object.entries(input).some(([k,v]) => saved[k] !== v)) {
          throw new ConflictException('مرجع مستخدم لطلب مختلف.');
        }
        return old;
      }
      let details: Prisma.InputJsonObject = { ...input };
      if ('lotId' in input) {
        const lot = await tx.warehouseStockLot.findUnique({where:{organizationId_lotId:{organizationId:org.id,lotId:input.lotId}}});
        if (!lot) throw new NotFoundException('دفعة غير متاحة.');
        if ('counted' in input) details = { ...input, expected: lot.onHand, revision: lot.revision };
        else await this.custodian(tx, org.id, input.custodianId);
      } else {
        const item = await tx.storeProduct.findFirst({ where: { id: input.itemId, organizationId: org.id, kind: 'GOODS' } });
        if (!item) throw new NotFoundException('الصنف خارج نطاق الجهة.');
      }
      return tx.warehouseDecisionRequest.create({ data: { organizationId: org.id, id, kind, details, makerId: actor, makerPersonId: maker.binding.personId } });
    }).catch(error => {
      if (error?.code === 'P2002') throw new ConflictException('مرجع الطلب مسجل؛ أعد قراءة الطلب.');
      throw error;
    });
  }

  async workspace(actor: string) {
    return this.db.serializable(async tx => {
      const org = await reviewPlatform(tx);
      const employee = async (dept: string) => {
        try { return (await eligibleReviewParticipant(tx, org.id, dept, actor, 'EMPLOYEE')).binding; }
        catch (error) { if (error instanceof ForbiddenException) return null; throw error; }
      };
      const inventory = await employee('INVENTORY_LOGISTICS');
      const finance = await employee('FINANCE');
      const executive = org.ownerId === actor ? { personId: org.ownerPersonId } : await employee('EXECUTIVE_GOVERNANCE');
      const operations: Kind[] = ['PURCHASE','COUNT','ISSUE'];
      const finalKinds: string[] = [];
      if (executive) {
        for (const kind of operations) {
          const mandate = await tx.operationalSetting.findUnique({ where: { key: 'WAREHOUSE_FINAL_APPROVER:v1:' + org.id + ':' + kind } });
          if ((mandate?.value as { accountId?: string } | null)?.accountId === actor) finalKinds.push(kind);
        }
      }
      const custody = await tx.warehouseIssuePosting.findMany({ where: { organizationId: org.id, custodianId: actor, acknowledgedAt: null },
        orderBy: [{createdAt:'asc'},{requestId:'asc'}], take: 50, select: { requestId:true,lotId:true,quantity:true } });
      if (!inventory && !finance && !executive && !custody.length) throw new ForbiddenException('مساحة المستودع غير متاحة.');
      const visible: Prisma.WarehouseDecisionRequestWhereInput[] = [];
      if (inventory) visible.push({ makerId:actor }, {kind:{in:['COUNT','ISSUE']}}, {kind:'PURCHASE',finalizedAt:{not:null}});
      if (finance) visible.push({kind:'PURCHASE'});
      if (finalKinds.length) visible.push({kind:{in:finalKinds}});
      const rows = await tx.warehouseDecisionRequest.findMany({ where: { organizationId:org.id,...(org.ownerId===actor?{}:{OR:visible}) },
        orderBy:[{createdAt:'desc'},{id:'desc'}],take:50 });
      const receipts = inventory ? await tx.warehousePurchaseReceipt.findMany({
        where:{organizationId:org.id}, orderBy:[{createdAt:'desc'},{receiptId:'desc'}], take:50,
        select:{receiptId:true,lineId:true,lot:{select:{itemId:true,locationId:true,received:true,onHand:true,unitCostMinor:true}}}
      }) : [];
      return { organizationId:org.id, inventory:Boolean(inventory), custody, receipts, requests: rows.map(row => {
        const reviewer = row.kind==='PURCHASE' ? finance : inventory;
        return { ...row, digest:this.digest(row),
          review:Boolean(!row.reviewedAt && reviewer && reviewer.personId!==row.makerPersonId),
          finalize:Boolean(row.reviewedAt && !row.finalizedAt && finalKinds.includes(row.kind) && executive &&
            executive.personId!==row.makerPersonId && executive.personId!==row.reviewerPersonId) };
      }) };
    });
  }

  async detail(actor: string, id: string) {
    scopeId(id);
    return this.db.serializable(async tx => {
      const org = await reviewPlatform(tx);
      const row = await tx.warehouseDecisionRequest.findUnique({ where: { organizationId_id: { organizationId: org.id, id } } });
      if (!row) throw new NotFoundException('الطلب غير متاح.');
      if (actor !== org.ownerId) {
        const mandate = await tx.operationalSetting.findUnique({ where: { key: 'WAREHOUSE_FINAL_APPROVER:v1:' + org.id + ':' + row.kind } });
        const dept = (mandate?.value as { accountId?: string } | null)?.accountId === actor ? 'EXECUTIVE_GOVERNANCE' :
          row.makerId === actor || row.kind !== 'PURCHASE' ? 'INVENTORY_LOGISTICS' : 'FINANCE';
        await eligibleReviewParticipant(tx, org.id, dept, actor, 'EMPLOYEE');
      }
      return row;
    });
  }

  async decide(actor: string, id: string, stage: 'review' | 'finalize', expectedDigest: string) {
    scopeId(id);
    if (!/^[0-9a-f]{64}$/.test(expectedDigest)) throw new BadRequestException('بصمة تفاصيل الطلب مطلوبة.');
    return this.db.serializable(async tx => {
      const org = await reviewPlatform(tx);
      const where = { organizationId_id: { organizationId: org.id, id } };
      const row = await tx.warehouseDecisionRequest.findUnique({ where });
      if (!row) throw new NotFoundException('الطلب غير متاح.');
      if (stage === 'review') {
        const department = row.kind === 'PURCHASE' ? 'FINANCE' : 'INVENTORY_LOGISTICS';
        const reviewer = await eligibleReviewParticipant(tx, org.id, department, actor, 'EMPLOYEE');
        if (reviewer.binding.personId === row.makerPersonId) throw new ForbiddenException('المراجعة تتطلب شخصًا مستقلًا.');
        if (expectedDigest !== this.digest(row)) throw new ConflictException('تغيرت تفاصيل الطلب.');
        if (row.reviewerId === actor) return row;
        if (row.reviewerId) throw new ConflictException('تمت المراجعة.');
        return tx.warehouseDecisionRequest.update({ where, data: { reviewerId: actor, reviewerPersonId: reviewer.binding.personId, reviewedAt: new Date() } });
      }
      // A named operational mandate is distinct from document approval and warehouse location ownership.
      const mandate = await tx.operationalSetting.findUnique({ where: { key: 'WAREHOUSE_FINAL_APPROVER:v1:' + org.id + ':' + row.kind } });
      if (!mandate || (mandate.value as { accountId?: string } | null)?.accountId !== actor) throw new ForbiddenException('لم يثبت التفويض النهائي لهذه العملية.');
      const personId = org.ownerId === actor ? org.ownerPersonId :
        (await eligibleReviewParticipant(tx, org.id, 'EXECUTIVE_GOVERNANCE', actor, 'EMPLOYEE')).binding.personId;
      if (personId === row.makerPersonId || personId === row.reviewerPersonId) throw new ForbiddenException('الاعتماد يتطلب شخصًا مستقلًا.');
      if (expectedDigest !== this.digest(row)) throw new ConflictException('تغيرت تفاصيل الطلب.');
      if (row.finalActorId === actor) return row;
      if (!row.reviewedAt || row.finalizedAt) throw new ConflictException('الطلب غير متاح للاعتماد.');
      if (row.kind === 'COUNT') {
        const d = row.details as unknown as Count;
        const change = await tx.warehouseStockLot.updateMany({ where: { organizationId: org.id, lotId: d.lotId, revision: d.revision, onHand: d.expected },
          data: { onHand: d.counted, countedCeiling: d.counted, revision: { increment: 1 } } });
        if (!change.count) throw new ConflictException('تغير الرصيد بعد الجرد؛ أعد العد في محضر جديد.');
      } else if (row.kind === 'PURCHASE') {
        const d = row.details as unknown as Purchase;
        await tx.warehousePurchaseLine.create({data:{...d,organizationId:org.id,lineId:id,approvalReference:id}});
      }
      return tx.warehouseDecisionRequest.update({ where, data: { finalActorId: actor, finalizedAt: new Date() } });
    });
  }

  private async custodian(tx: Prisma.TransactionClient, organizationId: string, accountId: string) {
    const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId, status: 'ACTIVE',
      account: { status: 'ACTIVE', emailVerifiedAt: { not: null } } }, select: { account: { select: { personId: true } } } });
    if (!member) throw new NotFoundException('مستلم العهدة غير متاح في الجهة.');
    return member.account.personId;
  }

  async postIssue(actor: string, id: string) {
    scopeId(id);
    return this.db.serializable(async tx => {
      const org = await reviewPlatform(tx);
      const employee = await eligibleReviewParticipant(tx, org.id, 'INVENTORY_LOGISTICS', actor, 'EMPLOYEE');
      const row = await tx.warehouseDecisionRequest.findUnique({ where: { organizationId_id: { organizationId: org.id, id } } });
      if (!row || row.kind !== 'ISSUE') throw new NotFoundException('طلب الصرف غير متاح.');
      if (!row.finalActorId || !row.finalizedAt) throw new ConflictException('طلب الصرف بانتظار الاعتماد.');
      const d = row.details as { lotId: string; custodianId: string; quantity: number };
      const recipient = await this.custodian(tx, org.id, d.custodianId);
      const approver = await tx.account.findUniqueOrThrow({ where: { id: row.finalActorId }, select: {personId:true} });
      if ([recipient, approver.personId].includes(employee.binding.personId)) throw new ForbiddenException('يلزم فصل منفذ الصرف عن المعتمد والمستلم.');
      return this.issues.postWithin(tx, { ...d, organizationId: org.id, requestId: id, approvedBy: row.finalActorId, postedBy: actor });
    });
  }

  digest(row: { organizationId: string; id: string; kind: string; details: Prisma.JsonValue; makerId: string }) {
    return decisionDigest({ organizationId: row.organizationId, id: row.id, kind: row.kind, details: row.details, makerId: row.makerId });
  }
}
