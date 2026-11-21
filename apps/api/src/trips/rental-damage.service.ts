import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

const summary = {id:true,itemId:true,amountMinor:true,currency:true,status:true,kind:true,disputeReason:true,reviewReason:true,payableAt:true} as const;
type Tx = Prisma.TransactionClient;
type Source = {itemId:string; organizationId:string; renterId:string; rentalId:string; resourceId:string; handoverReceiptId:string; returnReceiptId:string};
const eligible = Prisma.sql`
  FROM "EquipmentRentalItem" i JOIN "EquipmentRental" r ON r."id"=i."rentalId"
  JOIN "AuditEvent" ret ON ret."resource"='EquipmentRental' AND ret."resourceId"=r."id"
    AND ret."action"='EQUIPMENT_RENTAL_ITEM_RETURNED' AND ret."metadata"->>'resourceId'=i."resourceId"
  JOIN "AuditEvent" h ON h."id"::text=ret."metadata"->>'handoverReceiptId' AND h."resourceId"=r."id"
    AND h."resource"='EquipmentRental' AND h."action"='EQUIPMENT_RENTAL_ITEM_HANDED_OVER'
    AND h."metadata"->>'resourceId'=i."resourceId"
  WHERE i."returnedAt" IS NOT NULL AND i."returnCondition"='DAMAGED' AND ret."metadata"->'newDamageConfirmed'='true'::jsonb
    AND length(trim(h."metadata"->>'handoverCondition'))>0 AND length(trim(ret."metadata"->>'notes'))>0
    AND r."contractSnapshot"->'damagePolicy'->>'version'='RENTAL_DAMAGE_1'
    AND r."contractSnapshot"->'damagePolicy'->>'renterLiability'='NEW_DAMAGE_AT_RETURN_ONLY'
    AND r."contractSnapshot"->'damagePolicy'->'upfrontDepositMinor'='0'::jsonb
    AND r."contractSnapshot"->>'customerAccountId'=r."renterAccountId"
    AND r."contractSnapshot"->>'sourceId'=r."id"`;
function reasonText(value:unknown) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>1000)throw new BadRequestException('أدخل سببًا لا يتجاوز ١٠٠٠ حرف.');
  return value.trim();
}
@Injectable()
export class RentalDamageService {
  constructor(private readonly db:DatabaseService, private readonly audit:AuditService, private readonly notices:NotificationsService) {}

  private async centers(tx:Tx, actor:string) {
    const memberships=await tx.organizationMember.findMany({where:{accountId:actor,status:'ACTIVE',role:{in:['OWNER','ADMIN']},
      account:{status:'ACTIVE',roleAssignments:{some:{role:'DIVE_CENTER',status:'ACTIVE'}}},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},select:{organizationId:true}});
    if(!memberships.length)throw new ForbiddenException('تتطلب المطالبة صلاحية إدارة مركز الغوص.');
    return memberships.map(row=>row.organizationId);
  }
  async centerItems(actor:string) {
    return this.db.serializable(async tx=>{
      const centers=await this.centers(tx,actor);
      const items=await tx.$queryRaw<Array<{itemId:string; rentalId:string; invoiceNumber:string; equipment:string; baseline:string; damage:string}>>`
        SELECT i."id" AS "itemId",r."id" AS "rentalId",r."invoiceNumber",i."equipmentNameSnapshot" AS equipment,
          h."metadata"->>'handoverCondition' AS baseline,ret."metadata"->>'notes' AS damage ${eligible}
          AND r."contractSnapshot"->>'organizationId' IN (${Prisma.join(centers)}) ORDER BY i."returnedAt" DESC,i."id"`;
      const claims=items.length?await tx.rentalDamageClaim.findMany({where:{itemId:{in:items.map(v=>v.itemId)},organizationId:{in:centers}},select:summary}):[];
      const byItem=new Map(claims.map(c=>[c.itemId,c]));
      return items.map(item=>({...item,claim:byItem.get(item.itemId)??null}));
    });
  }
  async submit(actor:string,itemId:string,body:{amountMinor?:string;kind?:string},file?:{buffer:Buffer;mimetype:string}) {
    const raw=body?.amountMinor;
    if(typeof raw!=='string'||!/^\d{1,10}$/.test(raw)||Number(raw)<1||Number(raw)>2147483647||!['ESTIMATE','REPAIR_INVOICE'].includes(body?.kind??''))throw new BadRequestException('أدخل نوع المستند وتكلفة الإصلاح بالهللات.');
    if(!file||file.mimetype!=='application/pdf'||file.buffer.length>10_000_000||file.buffer.subarray(0,5).toString()!=='%PDF-')throw new BadRequestException('أرفق مستند إصلاح بصيغة PDF.');
    const amountMinor=Number(raw), kind=body.kind!, bytes=file.buffer;
    return this.db.serializable(async tx=>{
      const centers=await this.centers(tx,actor);
      const rows=await tx.$queryRaw<Source[]>`SELECT i."id" AS "itemId",r."id" AS "rentalId",r."renterAccountId" AS "renterId",
        i."resourceId",r."contractSnapshot"->>'organizationId' AS "organizationId",h."id"::text AS "handoverReceiptId",ret."id"::text AS "returnReceiptId" ${eligible}
        AND i."id"=${itemId} AND r."contractSnapshot"->>'organizationId' IN (${Prisma.join(centers)}) FOR UPDATE OF i`;
      if(rows.length!==1)throw new NotFoundException('لم يثبت ضرر جديد لهذه القطعة عند الإرجاع.');
      const source=rows[0];
      if(actor===source.renterId)throw new ForbiddenException('يتعذر إصدار مطالبة لنفس الحساب.');
      try{const doc=await PDFDocument.load(bytes,{updateMetadata:false});if(!doc.getPageCount())throw new Error();}catch{throw new BadRequestException('ملف PDF غير قابل للقراءة.');}
      const sha256=createHash('sha256').update(bytes).digest('hex');
      const existing=await tx.rentalDamageClaim.findUnique({where:{itemId},select:{...summary,sha256:true}});
      if(existing){
        if(existing.sha256!==sha256||existing.amountMinor!==amountMinor||existing.kind!==kind)throw new ConflictException('سبق تسجيل مطالبة مختلفة لهذه القطعة.');
        return tx.rentalDamageClaim.findUniqueOrThrow({where:{itemId},select:summary});
      }
      const claim=await tx.rentalDamageClaim.create({data:{id:randomUUID(),itemId,organizationId:source.organizationId,customerAccountId:source.renterId,
        submittedBy:actor,handoverReceiptId:source.handoverReceiptId,returnReceiptId:source.returnReceiptId,amountMinor,currency:'SAR',kind,pdf:new Uint8Array(bytes),sha256},select:summary});
      await this.record(tx,actor,source.renterId,claim.id,'AWAITING_RENTER',{itemId,amountMinor,sha256,rentalId:source.rentalId});
      return claim;
    });
  }

  async mine(actor:string,itemId:string) {
    return this.db.rentalDamageClaim.findFirst({where:{itemId,customerAccountId:actor},select:summary});
  }
  async evidence(actor:string,id:string) {
    return this.db.serializable(async tx=>{
      const row=await tx.rentalDamageClaim.findUnique({where:{id},select:{customerAccountId:true,organizationId:true}});
      if(!row)throw new NotFoundException();
      if(row.customerAccountId!==actor&&!(await this.centers(tx,actor)).includes(row.organizationId))throw new ForbiddenException();
      const file=await tx.rentalDamageClaim.findUniqueOrThrow({where:{id},select:{pdf:true,sha256:true}});
      if(createHash('sha256').update(file.pdf).digest('hex')!==file.sha256)throw new ConflictException('تعذّر التحقق من مستند المطالبة.');
      return Buffer.from(file.pdf);
    });
  }
  async decide(actor:string,id:string,view:'renter'|'review',input:{decision?:string;reason?:string}) {
    const decision=input?.decision;
    if(!(view==='renter'?['ACCEPT','DISPUTE']:['UPHOLD','DISMISS']).includes(decision??''))throw new BadRequestException('اختر قرارًا صالحًا.');
    const reason=decision==='ACCEPT'?null:reasonText(input.reason);
    return this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "RentalDamageClaim" WHERE "id"=${id} FOR UPDATE`;
      const claim=await tx.rentalDamageClaim.findUnique({where:{id},select:{...summary,organizationId:true,customerAccountId:true,submittedBy:true,reviewedBy:true}});
      if(!claim)throw new NotFoundException();
      const review=view==='review';
      if(review){
        if(!(await this.centers(tx,actor)).includes(claim.organizationId)||actor===claim.customerAccountId||actor===claim.submittedBy)throw new ForbiddenException('تتطلب المراجعة شخصًا آخر مخولًا من المركز.');
        const people=await tx.account.findMany({where:{id:{in:[actor,claim.customerAccountId,claim.submittedBy]}},select:{personId:true}});
        if(new Set(people.map(p=>p.personId)).size!==3)throw new ForbiddenException('تتطلب المراجعة أشخاصًا مستقلين.');
      }else if(claim.customerAccountId!==actor)throw new NotFoundException();
      const status=decision==='DISPUTE'?'DISPUTED':decision==='DISMISS'?'DISMISSED':'PAYABLE';
      if(claim.status!==(review?'DISPUTED':'AWAITING_RENTER')){
        const replay=review?claim.reviewedBy===actor&&claim.reviewReason===reason:!claim.reviewedBy&&claim.disputeReason===reason;
        if(replay&&claim.status===status)return tx.rentalDamageClaim.findUniqueOrThrow({where:{id},select:summary});
        throw new ConflictException('تغيرت حالة المطالبة. حدّث التفاصيل.');
      }
      const updated=await tx.rentalDamageClaim.update({where:{id},data:{status,payableAt:status==='PAYABLE'?new Date():null,
        ...(review?{reviewedBy:actor,reviewReason:reason}:decision==='DISPUTE'?{disputeReason:reason}:{})},select:summary});
      await this.record(tx,actor,claim.customerAccountId,id,status,{itemId:claim.itemId,decision,reason});
      if(status==='DISPUTED')await this.notices.notify(claim.submittedBy,'RENTAL_DAMAGE_DISPUTED',{claimId:id,itemId:claim.itemId,title:'اعتراض على مطالبة ضرر معدات'},tx);
      return updated;
    });
  }
  private async record(tx:Tx,actor:string,renter:string,id:string,status:string,details:Record<string,unknown>) {
    await this.audit.record({actorId:actor,resource:'RentalDamageClaim',resourceId:id,action:'RENTAL_DAMAGE_'+status,metadata:details},tx);
    await this.notices.notify(renter,'RENTAL_DAMAGE_'+status,{claimId:id,status,title:'تحديث مطالبة ضرر معدات',...details},tx);
  }
}
