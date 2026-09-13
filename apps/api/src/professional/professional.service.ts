import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';

@Injectable()
export class ProfessionalService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyRequests(personId: string) {
    return this.prisma.professionalRoleRequest.findMany({
      where: { personId, archivedAt: null },
      include: { role: { select: { key: true, nameAr: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRoleRequest(personId: string, input: CreateRoleRequestDto) {
    const role = await this.prisma.role.findUnique({ where: { key: input.roleKey.trim() } });
    if (!role) throw new NotFoundException('الدور المهني المطلوب غير موجود');

    const openRequest = await this.prisma.professionalRoleRequest.findFirst({
      where: {
        personId,
        roleId: role.id,
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUIRED', 'RESUBMITTED'] },
      },
    });
    if (openRequest) throw new BadRequestException('يوجد طلب مفتوح بالفعل لهذا الدور');

    return this.prisma.professionalRoleRequest.create({
      data: {
        personId,
        roleId: role.id,
        applicantNote: input.applicantNote?.trim(),
      },
      include: { role: { select: { key: true, nameAr: true } } },
    });
  }

  async submit(personId: string, publicId: string) {
    const request = await this.prisma.professionalRoleRequest.findFirst({
      where: { publicId, personId, archivedAt: null },
    });
    if (!request) throw new NotFoundException('طلب الدور المهني غير موجود');
    if (!['DRAFT', 'INFO_REQUIRED'].includes(request.status)) {
      throw new BadRequestException('لا يمكن إرسال الطلب من حالته الحالية');
    }

    return this.prisma.professionalRoleRequest.update({
      where: { id: request.id },
      data: {
        status: request.status === 'INFO_REQUIRED' ? 'RESUBMITTED' : 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }
}
