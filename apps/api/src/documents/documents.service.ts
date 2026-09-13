import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDocumentDto } from './dto/register-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(personId: string) {
    return this.prisma.documentRecord.findMany({
      where: { personId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(personId: string, input: RegisterDocumentDto) {
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

    return this.prisma.documentRecord.create({
      data: {
        personId,
        credentialId,
        roleRequestId,
        documentType: input.documentType.trim(),
        originalFileName: input.originalFileName.trim(),
        mimeType: input.mimeType.trim().toLowerCase(),
        byteSize: input.byteSize,
        sha256Hex: input.sha256Hex.toLowerCase(),
        storageObjectKey: input.storageObjectKey.trim(),
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
