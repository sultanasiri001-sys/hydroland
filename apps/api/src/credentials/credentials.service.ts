import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  list(personId: string) {
    return this.prisma.professionalCredential.findMany({
      where: { personId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(personId: string, input: CreateCredentialDto) {
    let roleRequestId: string | undefined;
    if (input.roleRequestPublicId) {
      const request = await this.prisma.professionalRoleRequest.findFirst({
        where: { publicId: input.roleRequestPublicId, personId, archivedAt: null },
        select: { id: true, status: true },
      });
      if (!request) throw new NotFoundException('طلب الدور المهني غير موجود');
      if (!['DRAFT', 'INFO_REQUIRED'].includes(request.status)) {
        throw new BadRequestException('لا يمكن إضافة مؤهل إلى الطلب في حالته الحالية');
      }
      roleRequestId = request.id;
    }

    const issuedAt = input.issuedAt ? new Date(input.issuedAt) : undefined;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (issuedAt && expiresAt && expiresAt <= issuedAt) {
      throw new BadRequestException('تاريخ انتهاء المؤهل يجب أن يكون بعد تاريخ الإصدار');
    }

    return this.prisma.professionalCredential.create({
      data: {
        personId,
        roleRequestId,
        credentialType: input.credentialType.trim(),
        title: input.title.trim(),
        issuerName: input.issuerName.trim(),
        credentialNumber: input.credentialNumber?.trim(),
        issuedAt,
        expiresAt,
      },
    });
  }
}
