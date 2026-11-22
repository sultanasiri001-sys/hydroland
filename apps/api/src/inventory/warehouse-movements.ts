import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';

type Tx = Prisma.TransactionClient;

export async function qualifiedSupplier(tx: Tx, org: string, documentId: string) {
  const { d, sourceHash } = await reviewSource(tx,org,documentId);
  if (d.template.code !== 'INV-SUPPLIER-QUALIFICATION' || d.department !== 'INVENTORY_LOGISTICS' ||
      d.template.status !== 'ACTIVE' || !['APPROVED','SIGNED'].includes(d.status)) throw new ConflictException('يلزم سجل تأهيل مورد معتمد.');
  validateDocumentPayload(d.template.fields, d.payload);
  const {supplierRef,supplierAcceptanceRef,nextSupplierReviewDate} = d.payload as Record<string,unknown>;
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh'}).format(new Date());
  if (typeof supplierRef !== 'string' || !supplierRef.trim() || typeof supplierAcceptanceRef!=='string' || !supplierAcceptanceRef.trim() ||
    typeof nextSupplierReviewDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(nextSupplierReviewDate) || nextSupplierReviewDate < today)
    throw new ConflictException('راجع قرار تأهيل المورد وصلاحيته.');
  return { supplierRef, supplierAcceptanceRef, supplierVersion:d.version, supplierHash:sourceHash };
}

export async function activeDestination(tx:Tx,org:string,locationId:string) {
  if (!await tx.warehouseLocation.findFirst({where:{organizationId:org,id:locationId,status:'RECORDED'},select:{id:true}}))
    throw new NotFoundException('موقع الوصول غير متاح.');
}

export async function returnableIssue(tx: Tx, org:string, issueId:string, custodian:string, quantity:number) {
  const issue=await tx.warehouseIssuePosting.findFirst({where:{organizationId:org,requestId:issueId,custodianId:custodian,acknowledgedAt:{not:null}}});
  if (!issue) throw new NotFoundException('العهدة المستلمة غير متاحة.');
  if (quantity > issue.quantity - issue.returned) throw new ConflictException('الكمية تتجاوز المتبقي من العهدة.');
  return issue;
}

export async function receiveMovement(tx:Tx, org:string, id:string, actor:string, personId:string) {
  const where={organizationId_id:{organizationId:org,id}};
  const row=await tx.warehouseDecisionRequest.findUnique({where});
  if (!row || !['TRANSFER','RETURN'].includes(row.kind)) throw new NotFoundException('مستند التسليم غير متاح.');
  if (row.makerPersonId===personId) throw new ForbiddenException('الاستلام يتطلب موظفًا غير المسلّم.');
  if (!row.finalizedAt || row.finalDecision!=='APPROVE') throw new ConflictException('يلزم اعتماد الإدارة العليا قبل الاستلام.');
  if (row.postedAt) {
    if (row.postedBy!==actor) throw new ConflictException('سبق توثيق الاستلام.');
    return row;
  }
  const d=row.details as {lotId:string;quantity:number;destinationId?:string;issueId?:string};
  const key={organizationId_lotId:{organizationId:org,lotId:d.lotId}};
  const lot=await tx.warehouseStockLot.findUniqueOrThrow({where:key});
  if (row.kind==='TRANSFER') {
    await activeDestination(tx,org,d.destinationId!);
    const changed=await tx.warehouseStockLot.updateMany({where:{organizationId:org,lotId:lot.lotId,onHand:{gte:d.quantity}},
      data:{onHand:{decrement:d.quantity},revision:{increment:1}}});
    if (!changed.count) throw new ConflictException('رصيد الدفعة غير كافٍ للتحويل.');
    await tx.warehouseStockLot.create({data:{organizationId:org,lotId:id,parentLotId:lot.lotId,itemId:lot.itemId,locationId:d.destinationId!,
      purchaseReference:lot.purchaseReference,receiptReference:lot.receiptReference,received:d.quantity,onHand:d.quantity,unitCostMinor:lot.unitCostMinor}});
  } else {
    const issue=await returnableIssue(tx,org,d.issueId!,row.makerId,d.quantity);
    if (issue.lotId!==lot.lotId || lot.onHand>2147483647-d.quantity) throw new ConflictException('تعذر مطابقة دفعة الإرجاع.');
    await tx.warehouseIssuePosting.update({where:{organizationId_requestId:{organizationId:org,requestId:issue.requestId}},data:{returned:{increment:d.quantity}}});
    const onHand=lot.onHand+d.quantity;
    await tx.warehouseStockLot.update({where:key,data:{onHand,countedCeiling:Math.max(onHand,lot.countedCeiling),revision:{increment:1}}});
  }
  return tx.warehouseDecisionRequest.update({where,data:{postedAt:new Date(),postedBy:actor}});
}
