import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from './document-policy';
import { DocumentStorageService } from './document-storage.service';
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

    let credentialId: string | undefined;
    let roleRequestId: string | undefined;

    if (input.credentialPublicId) {
      const credential = await this.prisma.professionalCredential.findFirst({
        where: { publicId: input.credentialPublicId, personId, archivedAt: null },
        select: { id: true },
      });
      if (!credential) throw new NotFoundException('المؤهل غير موجود');
      credentialId = credential.id;
    }

    if (input.roleRequestPublicId) {
      const request = await this.prisma.professionalRoleRequest.findFirst({
        where: { publicId: input.roleRequestPublicId, personId, archivedAt: null },
        select: { id: true, status: true },
      });
      if (!request) throw new NotFoundException('طلب الدور المهني غير موجود');
      if (!['DRAFT', 'INFO_REQUIRED'].includes(request.status)) {
        throw new BadRequestException('لا يمكن إضافة إثبات لهذا الطلب في حالته الحالية');
      }
      roleRequestId = request.id;
    }

    const storageIntent = this.storage.createUploadIntent(personId, input.originalFileName.trim());
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const intent = await this.prisma.documentUploadIntent.create({
      data: {
        personId,
        credentialId,
        roleRequestId,
        documentType: input.documentType.trim(),
        originalFileName: input.originalFileName.trim(),
        declaredMimeType: mimeType,
        declaredByteSize: input.byteSize,
        storageObjectKey: storageIntent.objectKey,
        expiresAt,
      },
      select: {
        publicId: true,
        documentType: true,
        originalFileName: true,
        declaredMimeType: true,
        declaredByteSize: true,
        status: true,
        expiresAt: true,
      },
    });

    return {
      ...intent,
      storageVisibility: storageIntent.storageVisibility,
      uploadUrl: storageIntent.uploadUrl,
      uploadUrlStatus: storageIntent.uploadUrlStatus,
      expiresInSeconds: 900,
    };
  }

  async completeUpload(personId: string, intentPublicId: string) {
    const intent = await this.prisma.documentUploadIntent.findFirst({
      where: { publicId: intentPublicId, personId, archivedAt: null },
      select: {
        id: true,
        publicId: true,
        personId: true,
        credentialId: true,
        roleRequestId: true,
        documentType: true,
        originalFileName: true,
        declaredMimeType: true,
        declaredByteSize: true,
        storageObjectKey: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!intent) throw new NotFoundException('طلب رفع الوثيقة غير موجود');
    if (intent.expiresAt <= new Date()) {
      await this.prisma.documentUploadIntent.update({ where: { id: intent.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('انتهت صلاحية طلب رفع الوثيقة');
    }
    if (intent.status !== 'CREATED' && intent.status !== 'UPLOADED') {
      throw new BadRequestException('لا يمكن إكمال رفع الوثيقة من حالته الحالية');
    }

    const verified = await this.storage.verifyUploadedObject(intent.storageObjectKey);
    const mimeType = verified.mimeType.trim().toLowerCase();

    if (verified.objectKey !== intent.storageObjectKey) throw new BadRequestException('مسار الملف المتحقق منه لا يطابق طلب الرفع');
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) throw new BadRequestException('نوع الملف الفعلي غير مسموح');
    if (mimeType !== intent.declaredMimeType) throw new BadRequestException('نوع الملف الفعلي لا يطابق النوع المعلن');
    if (verified.byteSize < 1 || verified.byteSize > MAX_DOCUMENT_BYTES) throw new BadRequestException('حجم الملف الفعلي غير مسموح');
    if (verified.byteSize !== intent.declaredByteSize) throw new BadRequestException('حجم الملف الفعلي لا يطابق الحجم المعلن');
    if (!/^[a-f0-9]{64}$/i.test(verified.sha256Hex)) throw new BadRequestException('بصمة الملف المتحققة غير صالحة');
    if (verified.malwareScanStatus !== 'CLEAN') throw new BadRequestException('تم رفض الوثيقة في الفحص الأمني');

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.documentUploadIntent.findUnique({ where: { id: intent.id }, select: { status: true } });
      if (!current || (current.status !== 'CREATED' && current.status !== 'UPLOADED')) {
        throw new BadRequestException('تمت معالجة طلب رفع الوثيقة مسبقاً');
      }

      const document = await tx.documentRecord.create({
        data: {
          personId: intent.personId,
          credentialId: intent.credentialId,
          roleRequestId: intent.roleRequestId,
          documentType: intent.documentType,
          originalFileName: intent.originalFileName,
          mimeType,
          byteSize: verified.byteSize,
          sha256Hex: verified.sha256Hex.toLowerCase(),
          storageObjectKey: intent.storageObjectKey,
          scanStatus: 'CLEAN',
          scanDetail: verified.malwareScanDetail,
          scannedAt: verified.scannedAt,
        },
        select: {
          publicId: true,
          documentType: true,
          originalFileName: true,
          mimeType: true,
          byteSize: true,
          scanStatus: true,
          scannedAt: true,
          createdAt: true,
        },
      });

      await tx.documentUploadIntent.update({
        where: { id: intent.id },
        data: { status: 'CONSUMED', uploadedAt: new Date(), completedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          actorPersonId: personId,
          action: 'document.upload.complete',
          entityType: 'DocumentRecord',
          entityId: document.publicId,
          result: 'SUCCESS',
          referenceId: intent.publicId,
          context: {
            uploadIntentPublicId: intent.publicId,
            mimeType,
            byteSize: verified.byteSize,
            malwareScanStatus: verified.malwareScanStatus,
          },
        },
      });

      return document;
    });
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
}
