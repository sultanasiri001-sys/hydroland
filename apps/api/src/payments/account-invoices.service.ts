import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { DatabaseService } from '../database/database.service';
import { invoiceRegister, InvoiceKey, InvoiceRow } from './account-invoice-register';

@Injectable()
export class AccountInvoicesService {
  constructor(private readonly db: DatabaseService) {}

  async list(account: string, view: string, offset: number, key?: InvoiceKey) {
    if (!['all','purchases','sales'].includes(view) || !Number.isSafeInteger(offset) || offset<0) throw new BadRequestException();
    const rows=await this.db.$queryRaw<InvoiceRow[]>`
      SELECT * FROM (${invoiceRegister(account,key)}) r
      WHERE (${view}='all' OR (${view}='purchases' AND "isPurchase") OR (${view}='sales' AND "isSale"))
      ORDER BY "occurredAt" DESC,"sourceType","sourceId" LIMIT 31 OFFSET ${offset}`;
    return {items:rows.slice(0,30),nextOffset:rows.length>30 ? offset+30 : null};
  }

  private async one(tx: Prisma.TransactionClient, account: string, key: InvoiceKey) {
    const [row]=await tx.$queryRaw<InvoiceRow[]>(invoiceRegister(account,key));
    if (!row) throw new NotFoundException();
    return row;
  }

  download(account: string, key: InvoiceKey) {
    return this.db.$transaction(async tx=>{
      const row=await this.one(tx,account,key);
      if (!row.hasDocument || !row.sellerId) throw new NotFoundException();
      const file=await tx.accountInvoiceDocument.findFirstOrThrow({where:{...key,sellerId:row.sellerId},select:{content:true}});
      return Buffer.from(file.content);
    },{isolationLevel:'RepeatableRead'});
  }

  async attach(account: string, key: InvoiceKey, number: unknown, file?: {buffer: Buffer; mimetype: string}) {
    const original=typeof number==='string' ? number.trim() : '';
    if (!original || original.length>100 || /[\x00-\x1f\x7f]/.test(original) || !file?.buffer?.length
      || file.mimetype!=='application/pdf' || file.buffer.length>5_000_000 || file.buffer.subarray(0,5).toString()!=='%PDF-') {
      throw new BadRequestException('أدخل رقم الفاتورة وملف PDF صالحًا حتى 5 ميغابايت.');
    }
    const bytes=file.buffer, digest=createHash('sha256').update(bytes).digest('hex');
    // Authorize the actual seller before parsing or storing its document.
    const authorize=async (tx:Prisma.TransactionClient)=>{
      const row=await this.one(tx,account,key);
      if (!row.canAttach || !row.sellerId) throw new NotFoundException();
      if (row.nativeStatus==='VOID' || (row.number && row.number!==original)) throw new ConflictException('رقم الفاتورة أو حالتها لا يطابق السجل.');
      return {sellerId:row.sellerId,buyerOrganizationId:row.buyerOrganizationId};
    };
    await this.db.$transaction(authorize);
    try {
      if (!(await PDFDocument.load(bytes,{updateMetadata:false})).getPageCount()) throw new Error();
    } catch {throw new BadRequestException('تعذرت قراءة ملف الفاتورة.');}
    return this.db.serializable(async tx=>{
      const {sellerId,buyerOrganizationId}=await authorize(tx);
      // Both a replay and competing uploads must preserve the first original.
      await tx.accountInvoiceDocument.createMany({data:{...key,sellerId,buyerOrganizationId,number:original,content:Uint8Array.from(bytes),sha256:digest,attachedBy:account},skipDuplicates:true});
      const saved=await tx.accountInvoiceDocument.findUnique({where:{sourceType_sourceId:key},select:{sellerId:true,buyerOrganizationId:true,number:true,sha256:true}});
      if (saved?.sellerId!==sellerId || saved.buyerOrganizationId!==buyerOrganizationId || saved.number!==original || saved.sha256!==digest) throw new ConflictException('يوجد مستند مختلف بنفس الرقم أو لنفس العملية.');
      return {number:original,hasDocument:true};
    });
  }
}
