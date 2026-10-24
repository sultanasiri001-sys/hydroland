import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
const sharp:typeof import('sharp').default = require('sharp');
import { DatabaseService } from '../database/database.service';

type ImageRow = { revision:string; content:Uint8Array|null };
const tables:Record<string,string> = {trip:'Trip',course:'StoreCourseOffer',product:'StoreProduct',equipment:'CalendarResource'};
@Injectable()
export class ServiceImagesService {
 constructor(private readonly db:DatabaseService){}
 private validate(kind:string,id:string){
  if(!Object.hasOwn(tables,kind)||!id||id.length>128)throw new BadRequestException('الخدمة غير صالحة.');
 }
 private async owner(tx:Prisma.TransactionClient,accountId:string,kind:string,id:string){
  this.validate(kind,id);
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  if(!role)throw new ForbiddenException('يتطلب الإجراء دور مركز غوص نشطًا.');
  const member=await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organizationId:true}});
  if(!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');
  const rows=kind==='equipment'
   ?await tx.$queryRaw<Array<{id:string}>>`SELECT r.id FROM "CalendarResource" r JOIN "EquipmentBarcode" b ON b."resourceId"=r.id WHERE r.id::text=${id} AND r.type='EQUIPMENT' AND b."organizationId"::text=${member.organizationId} FOR UPDATE OF r`
   :await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"'+tables[kind]+'"')} WHERE id::text=${id} AND "organizationId"::text=${member.organizationId} FOR UPDATE`);
  if(!rows.length)throw new NotFoundException('الخدمة غير موجودة في مركزك.');
 }
 private async row(tx:Prisma.TransactionClient,kind:string,id:string){
  const rows=await tx.$queryRaw<ImageRow[]>`SELECT revision,content FROM "ServiceImage" WHERE kind=${kind} AND "entityId"=${id}`;return rows[0]??null;
 }
 private response(row:ImageRow|null){return {revision:row?.revision??null,image:row?.content?'data:image/webp;base64,'+Buffer.from(row.content).toString('base64'):null};}
 async get(accountId:string,kind:string,id:string){return this.db.serializable(async tx=>{await this.owner(tx,accountId,kind,id);return this.response(await this.row(tx,kind,id));});}
 async save(accountId:string,kind:string,id:string,input:Record<string,unknown>,remove=false){
  this.validate(kind,id);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['base64','expectedRevision'].includes(k))||!(input.expectedRevision===null||typeof input.expectedRevision==='string'))throw new BadRequestException('بيانات الصورة غير صالحة.');
  // Check permission before spending resources on image decoding, and again inside the write transaction.
  await this.db.serializable(tx=>this.owner(tx,accountId,kind,id));
  let content:Buffer|null=null;
  if(!remove){
   if(typeof input.base64!=='string'||!input.base64.length||input.base64.length>7_000_000||input.base64.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))throw new BadRequestException('اختر صورة JPEG أو PNG أو WebP بحجم لا يتجاوز 5 ميجابايت.');
   const bytes=Buffer.from(input.base64,'base64');
   if(bytes.length>5_000_000)throw new BadRequestException('حجم الصورة يتجاوز 5 ميجابايت.');
   try{
    const image=sharp(bytes,{limitInputPixels:25_000_000,failOn:'warning'}),meta=await image.metadata();
    if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)!==1)throw new Error('Unsupported image');
    content=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
    if(content.length>2_000_000)throw new Error('Image too large');
   }catch{throw new BadRequestException('تعذر قراءة الصورة. اختر صورة ثابتة سليمة من نوع JPEG أو PNG أو WebP.');}
  }
  return this.db.serializable(async tx=>{
   await this.owner(tx,accountId,kind,id);const existing=await this.row(tx,kind,id);
   if((existing?.revision??null)!==input.expectedRevision)throw new ConflictException('تغيّرت الصورة. حدّث الصورة ثم أعد المحاولة.');
   const revision=randomUUID();
   await tx.$executeRaw`INSERT INTO "ServiceImage"(kind,"entityId",revision,content,"updatedAt") VALUES(${kind},${id},${revision},${content},NOW()) ON CONFLICT(kind,"entityId") DO UPDATE SET revision=EXCLUDED.revision,content=EXCLUDED.content,"updatedAt"=NOW()`;
   return this.response({revision,content});
  });
 }
 async publicImage(kind:string,id:string){
  this.validate(kind,id);if(kind==='equipment')return null;
  const table=Prisma.raw('"'+tables[kind]+'"');
  const status=kind==='trip'?'OPEN':'ACTIVE';
  const date=kind==='course'?Prisma.sql`AND e."startsAt">NOW()`:Prisma.empty;
  const rows=await this.db.$queryRaw<ImageRow[]>(Prisma.sql`SELECT i.content,i.revision FROM "ServiceImage" i JOIN ${table} e ON e.id::text=i."entityId" JOIN "Organization" o ON o.id=e."organizationId" WHERE i.kind=${kind} AND i."entityId"=${id} AND e.status::text=${status} AND o.status::text='ACTIVE' ${date}`);
  return rows[0]?.content?Buffer.from(rows[0].content):null;
 }
}
