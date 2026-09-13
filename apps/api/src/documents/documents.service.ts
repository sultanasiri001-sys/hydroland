import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from './document-policy';
import { DocumentStorageService } from './document-storage.service';
import { RegisterDocumentDto } from './dto/register-document.dto';
import { RequestUploadDto } from './dto/request-upload.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
  ) {}

  listMine(personId: string) {
    return this.prisma.documentRecord.findMany({
      where: { personId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        publicId: true,
        documentType: true,
        originalFileName: true,
        mimeType: true,
        byteSize: true,
        sha256Hex: true,
        scanStatus: true,
        scannedAt: true,
        createdAt: true,
      },
    });
  }

  async requestUpload(personId: string, input: RequestUploadDto) {
    const mimeType = input.mimeType.trim().toLowerCase();
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) throw new BadRequestException('نوع الملف غير مسموح');
    if (input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) throw new BadRequestException('حجم الملف غير مسموح');

    if (input.credentialPublicId) {
      const credential = await this.prisma.professionalCredential.findFirst({
        where: { publicId: input.credentialPublicId, personId, archivedAt: null }, select: { id: true },
      });
      if (!credential) throw new NotFoundException('المؤهل غير موجود');
    }

    if (input.roleRequestPublicId) {
      const request = await this.prisma.professionalRoleRequest.findFirst({
        where: { publicId: input.roleRequestPublicId, personId, archivedAt: null }, select: { status: true },
      });
      if (!request) throw new NotFoundException('طلب الدور المهني غير موجود');
      if (!['DRAFT', 'INFO_REQUIRED'].includes(request.status)) throw new BadRequestException('لا يمكن إضافة إثبات لهذا الطلب في حالته الحالية');
    }

    return {
      documentType: input.documentType.trim(),
      originalFileName: input.originalFileName.trim(),
      mimeType,
      byteSize: input.byteSize,
      ...this.storage.createUploadIntent(personId, input.originalFileName.trim()),
    };
  }

  async createReadUrl(personId: string, publicId: string) {
    const document = await this.prisma.documentRecord.findFirst({
      where: { publicId, personId, archivedAt: null },
      select: { storageObjectKey: true, scanStatus: true },
    });
    if (!document) throw new NotFoundException('الوثيقة غير موجودة');
    if (document.scanStatus !== 'CLEAN') throw new BadRequestException('لا يمكن عرض الوثيقة قبل اكتمال الفحص الأمني بنجاح');
    return { readUrl: this.storage.createTemporaryReadUrl(document.storageObjectKey) };
  }

  async register(personId: string, input: RegisterDocumentDto) {
    const mimeType = input.mimeType.trim().toLowerCase();
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) throw new BadRequestException('نوع الملف غير مسموح');
    if (input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) throw new BadRequestException('حجم الملف غير مسموح');

    let credentialId: string | undefined;
    let roleRequestId: string | undefined;

    if (input.credentialPublicId) {
      const credential = await this.prisma.professionalCredential.findFirst({
        where: { publicId: input.credentialPublicId, personId, archivedAt: null }, select: { id: true },
      });
      if (!credential) throw new NotFoundException('المؤهل غير موجود');
      credentialId = credential.id;
    }

    if (input.roleRequestPublicId) {
      const request = await this.prisma.professionalRoleRequest.findFirst({
        where: { publicId: input.roleRequestPublicId, personId, archivedAt: null }, select: { id: true, status: true },
      });
      if (!request) throw new NotFoundException('طلب الدور المهني غير موجود');
      if (!['DRAFT', 'INFO_REQUIRED'].includes(request.status)) throw new BadRequestException('لا يمكن إضافة إثبات لهذا الطلب في حالته الحالية');
      roleRequestId = request.id;
    }

    const storageObjectKey = input.storageObjectKey.trim();
    if (!storageObjectKey.startsWith(`private/documents/${personId}/`)) throw new BadRequestException('مسار التخزين غير صالح لهذا المستخدم');

    return this.prisma.documentRecord.create({
      data: {
        personId,
        credentialId,
        roleRequestId,
        documentType: input.documentType.trim(),
        originalFileName: input.originalFileName.trim(),
        mimeType,
        byteSize: input.byteSize,
        sha256Hex: input.sha256Hex.toLowerCase(),
        storageObjectKey,
      },
      select: {
        publicId: true,
        documentType: true,
        originalFileName: true,
        mimeType: true,
        byteSize: true,
        scanStatus: true,
        createdAt: true,
      },
    });
  }
}
