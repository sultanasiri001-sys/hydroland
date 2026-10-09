import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StoreProductStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

const productFields = ['sku','nameAr','description','priceMinor','stockQuantity','kind','status'];
const courseFields = ['courseCode','title','description','locationName','startsAt','endsAt','capacity','priceMinor','status'];

@Injectable()
export class StoreOfferingsService {
  constructor(private readonly db: DatabaseService) {}

  private async scope(tx: Prisma.TransactionClient, accountId: string) {
    const role = await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
    const member = role && await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organization:{select:{id:true,displayName:true}}}});
    if (!member) throw new ForbiddenException('تتطلب إدارة العروض صلاحية مالك أو مدير مركز نشط.');
    return member.organization;
  }

  private object(input: Record<string,unknown>, allowed: string[]) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key=>!allowed.includes(key))) throw new BadRequestException('حقول العرض غير صالحة.');
  }
  private text(input: Record<string,unknown>, key: string, max: number, optional = false) {
    const value=input[key];
    if (typeof value !== 'string' || (!optional && !value.trim()) || value.trim().length>max) throw new BadRequestException('تحقق من نصوص العرض وأطوالها.');
    return value.trim();
  }
  private integer(input: Record<string,unknown>, key: string, min = 0) {
    const value=input[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value<min || value>2147483647) throw new BadRequestException('السعر والسعة أو المخزون يجب أن تكون أرقامًا صحيحة ضمن الحد المسموح.');
    return value;
  }
  private status(input: Record<string,unknown>): StoreProductStatus {
    if (!['DRAFT','ACTIVE','INACTIVE'].includes(String(input.status))) throw new BadRequestException('حالة العرض غير صالحة.');
    return input.status as StoreProductStatus;
  }
  private revision(value: unknown) {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new BadRequestException('حدّث العرض قبل إجراء التعديل.');
    return new Date(value);
  }
  private requestId(value: unknown) {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('معرّف طلب الحفظ غير صالح.');
    return value;
  }
  private checkRevision(before: {updatedAt: Date}, value: unknown) {
    if (before.updatedAt.getTime()!==this.revision(value).getTime()) throw new ConflictException('تغير العرض. أعد تحميله قبل الحفظ.');
  }
  private same(before: Record<string,unknown>, data: Record<string,unknown>) {
    return Object.entries(data).every(([key,value])=>value instanceof Date ? (before[key] instanceof Date && (before[key] as Date).getTime()===value.getTime()) : before[key]===value);
  }
  private async audited(tx: Prisma.TransactionClient, actorId: string, organizationId: string, resource: string, resourceId: string, action: string) {
    await tx.auditEvent.create({data:{action,resource,resourceId,metadata:{actorId,organizationId}}});
  }

  private async retryUnique<T>(work:()=>Promise<T>):Promise<T>{
    try{return await work()}catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return work();
      throw error;
    }
  }

  catalog(accountId: string) {
    return this.db.serializable(async tx=>{
      const organization=await this.scope(tx,accountId);
      const products=await tx.storeProduct.findMany({where:{organizationId:organization.id},orderBy:{createdAt:'desc'},include:{_count:{select:{items:true}}}});
      const courses=await tx.storeCourseOffer.findMany({where:{organizationId:organization.id},orderBy:{startsAt:'desc'},include:{_count:{select:{enrollments:true}}}});
      return {organization,products,courses};
    });
  }

  saveProduct(accountId: string, input: Record<string,unknown>, id?: string) {
    this.object(input,[...productFields,id?'expectedUpdatedAt':'requestId']);
    const kind=input.kind;
    if (kind!=='GOODS' && kind!=='SERVICE') throw new BadRequestException('اختر سلعة أو خدمة.');
    const data={sku:this.text(input,'sku',80),nameAr:this.text(input,'nameAr',240),description:this.text(input,'description',4000,true),priceMinor:this.integer(input,'priceMinor'),stockQuantity:this.integer(input,'stockQuantity'),kind,status:this.status(input),currency:'SAR'};
    const productId=id||this.requestId(input.requestId);
    return this.retryUnique(()=>this.db.serializable(async tx=>{
      const organization=await this.scope(tx,accountId),before=await tx.storeProduct.findUnique({where:{id:productId}});
      if (id && (!before || before.organizationId!==organization.id)) throw new NotFoundException('العرض غير موجود في المركز.');
      if (before) {
        if (before.organizationId!==organization.id) throw new ConflictException('تعذر إعادة استخدام طلب الحفظ.');
        if (!id) { if(this.same(before,data)) return before; throw new ConflictException('سبق حفظ هذا الطلب ببيانات مختلفة.'); }
        this.checkRevision(before,input.expectedUpdatedAt);
        if (before.kind!==kind && await tx.storeOrderItem.count({where:{productId}})) throw new ConflictException('لا يمكن تغيير نوع عرض مرتبط بطلبات.');
      }
      const duplicate=await tx.storeProduct.findUnique({where:{sku:data.sku}});
      if (duplicate && duplicate.id!==productId) throw new ConflictException('رمز المنتج مستخدم. اختر رمزًا آخر.');
      const saved=id ? await tx.storeProduct.update({where:{id:productId},data:{...data,updatedAt:new Date(Math.max(Date.now(),before!.updatedAt.getTime()+1))}}) : await tx.storeProduct.create({data:{id:productId,organizationId:organization.id,...data}});
      await this.audited(tx,accountId,organization.id,'StoreProduct',productId,id?'STORE_OFFER_UPDATED':'STORE_OFFER_CREATED');
      return saved;
    }));
  }

  saveCourse(accountId: string, input: Record<string,unknown>, id?: string) {
    this.object(input,[...courseFields,id?'expectedUpdatedAt':'requestId']);
    const date=(key:string)=>{const value=input[key];if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new BadRequestException('أدخل مواعيد الدورة مع المنطقة الزمنية.');return new Date(value)};
    const data={courseCode:this.text(input,'courseCode',80),title:this.text(input,'title',240),description:this.text(input,'description',4000,true),locationName:this.text(input,'locationName',240),startsAt:date('startsAt'),endsAt:date('endsAt'),capacity:this.integer(input,'capacity',1),priceMinor:this.integer(input,'priceMinor'),currency:'SAR',status:this.status(input)};
    if (data.endsAt<=data.startsAt || data.startsAt<=new Date()) throw new BadRequestException('يجب أن تبدأ الدورة مستقبلًا وتنتهي بعد بدايتها.');
    const courseId=id||this.requestId(input.requestId);
    return this.retryUnique(()=>this.db.serializable(async tx=>{
      const organization=await this.scope(tx,accountId),before=await tx.storeCourseOffer.findUnique({where:{id:courseId}});
      if(id&&(!before||before.organizationId!==organization.id))throw new NotFoundException('الدورة غير موجودة في المركز.');
      if(before){
        if(before.organizationId!==organization.id)throw new ConflictException('تعذر إعادة استخدام طلب الحفظ.');
        if(!id){if(this.same(before,data))return before;throw new ConflictException('سبق حفظ هذا الطلب ببيانات مختلفة.');}
        this.checkRevision(before,input.expectedUpdatedAt);
        const enrolled=await tx.trainingEnrollment.count({where:{storeCourseOfferId:courseId,status:{not:'CANCELLED'}}});
        if(data.capacity<enrolled)throw new ConflictException('لا يمكن خفض السعة دون عدد المسجلين.');
        if(enrolled&&(before.courseCode!==data.courseCode||before.startsAt.getTime()!==data.startsAt.getTime()||before.endsAt.getTime()!==data.endsAt.getTime()||before.locationName!==data.locationName))throw new ConflictException('الدورة مرتبطة بطلاب. لا يمكن تغيير برنامجها أو موعدها أو موقعها من المتجر.');
      }
      const saved=id?await tx.storeCourseOffer.update({where:{id:courseId},data:{...data,updatedAt:new Date(Math.max(Date.now(),before!.updatedAt.getTime()+1))}}):await tx.storeCourseOffer.create({data:{id:courseId,organizationId:organization.id,...data}});
      await this.audited(tx,accountId,organization.id,'StoreCourseOffer',courseId,id?'STORE_COURSE_UPDATED':'STORE_COURSE_CREATED');
      return saved;
    }));
  }

  changeStatus(accountId:string, type:'products'|'courses', id:string, input:Record<string,unknown>, remove=false){
    this.object(input,remove?['expectedUpdatedAt']:['expectedUpdatedAt','status']);
    const status=remove?undefined:this.status(input);
    return this.db.serializable(async tx=>{
      const organization=await this.scope(tx,accountId);
      const before=type==='products'?await tx.storeProduct.findFirst({where:{id,organizationId:organization.id}}):await tx.storeCourseOffer.findFirst({where:{id,organizationId:organization.id}});
      if(!before)throw new NotFoundException('العرض غير موجود في المركز.');
      this.checkRevision(before,input.expectedUpdatedAt);
      if(remove){
        const used=type==='products'?await tx.storeOrderItem.count({where:{productId:id}}):await tx.trainingEnrollment.count({where:{storeCourseOfferId:id}});
        if(before.status==='ACTIVE'||used)throw new ConflictException('أوقف العرض أولًا. العروض المرتبطة بطلبات أو تسجيلات تُحفظ ولا تُحذف.');
        if(type==='products')await tx.storeProduct.delete({where:{id}});else await tx.storeCourseOffer.delete({where:{id}});
      }else{
        if(type==='courses'&&status==='ACTIVE'&&'startsAt' in before&&before.startsAt<=new Date())throw new ConflictException('لا يمكن نشر دورة بدأ موعدها.');
        if(type==='products')await tx.storeProduct.update({where:{id},data:{status,updatedAt:new Date(Math.max(Date.now(),before.updatedAt.getTime()+1))}});else await tx.storeCourseOffer.update({where:{id},data:{status,updatedAt:new Date(Math.max(Date.now(),before.updatedAt.getTime()+1))}});
      }
      await this.audited(tx,accountId,organization.id,type==='products'?'StoreProduct':'StoreCourseOffer',id,remove?'STORE_OFFER_DELETED':'STORE_OFFER_STATUS_CHANGED');
      return {id,deleted:remove,...(!remove?{status}:{}),existingOrdersPreserved:true};
    });
  }

  async publicCourses(){
    const rows=await this.db.storeCourseOffer.findMany({where:{status:'ACTIVE',startsAt:{gt:new Date()},organization:{status:'ACTIVE'}},orderBy:{startsAt:'asc'},include:{organization:{select:{displayName:true}},_count:{select:{enrollments:{where:{status:{not:'CANCELLED'}}}}}}});
    return rows.map(({_count,...row})=>({...row,remainingSeats:Math.max(0,row.capacity-_count.enrollments)}));
  }

  enroll(accountId:string,courseId:string){
    return this.db.serializable(async tx=>{
      const account=await tx.account.findFirst({where:{id:accountId,status:'ACTIVE'},select:{id:true}});
      if(!account)throw new ForbiddenException('يتطلب التسجيل حسابًا نشطًا.');
      const course=await tx.storeCourseOffer.findFirst({where:{id:courseId,status:'ACTIVE',startsAt:{gt:new Date()},organization:{status:'ACTIVE'}}});
      if(!course)throw new NotFoundException('الدورة غير متاحة للتسجيل.');
      const existing=await tx.trainingEnrollment.findFirst({where:{storeCourseOfferId:courseId,studentAccountId:accountId,status:{not:'CANCELLED'}}});
      if(existing)return existing;
      const count=await tx.trainingEnrollment.count({where:{storeCourseOfferId:courseId,status:{not:'CANCELLED'}}});
      if(count>=course.capacity)throw new ConflictException('اكتملت مقاعد الدورة.');
      const enrollment=await tx.trainingEnrollment.create({data:{studentAccountId:accountId,courseCode:course.courseCode,centerOrganizationId:course.organizationId,storeCourseOfferId:course.id,status:'PENDING',metadata:{source:'UNIFIED_STORE',title:course.title,priceMinor:course.priceMinor,currency:course.currency,startsAt:course.startsAt.toISOString(),endsAt:course.endsAt.toISOString(),locationName:course.locationName,financialActionExecuted:false}}});
      await this.audited(tx,accountId,course.organizationId,'TrainingEnrollment',enrollment.id,'STORE_COURSE_ENROLLED');
      return enrollment;
    });
  }
}
