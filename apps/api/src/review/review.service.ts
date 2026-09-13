import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReviewRoleRequestDto } from './dto/review-role-request.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  listPending() {
    return this.prisma.professionalRoleRequest.findMany({
      where: { status: { in: ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'] }, archivedAt: null },
      include: {
        person: { select: { publicId: true, firstName: true, lastName: true } },
        role: { select: { key: true, nameAr: true } },
        credentials: { where: { archivedAt: null }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async claim(reviewerPersonId: string, publicId: string) {
    const request = await this.prisma.professionalRoleRequest.findUnique({
      where: { publicId },
      include: { role: { select: { nameAr: true } } },
    });
    if (!request || request.archivedAt) throw new NotFoundException('طلب الدور المهني غير موجود');
    if (request.personId === reviewerPersonId) throw new ForbiddenException('لا يمكن مراجعة طلبك بنفسك');
    if (!['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(request.status)) {
      throw new BadRequestException('الطلب غير متاح للمراجعة في حالته الحالية');
    }
    if (request.reviewerPersonId && request.reviewerPersonId !== reviewerPersonId) {
      throw new ForbiddenException('تم استلام الطلب بواسطة مراجع آخر');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.professionalRoleRequest.update({
        where: { id: request.id },
        data: { status: 'UNDER_REVIEW', reviewerPersonId },
      });
      await tx.notification.create({
        data: {
          personId: request.personId,
          type: 'PROFESSIONAL_ROLE_UNDER_REVIEW',
          titleAr: 'بدأت مراجعة طلبك المهني',
          bodyAr: `طلب دور ${request.role.nameAr} أصبح الآن تحت المراجعة.`,
          referenceType: 'ProfessionalRoleRequest',
          referenceId: request.publicId,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorPersonId: reviewerPersonId,
          action: 'professional.role_request.claim',
          entityType: 'ProfessionalRoleRequest',
          entityId: request.publicId,
          result: 'SUCCESS',
          referenceId: request.publicId,
          context: { previousStatus: request.status, nextStatus: 'UNDER_REVIEW' },
        },
      });
      return updated;
    });
  }

  async decide(reviewerPersonId: string, publicId: string, input: ReviewRoleRequestDto) {
    const request = await this.prisma.professionalRoleRequest.findUnique({
      where: { publicId },
      include: { role: { select: { nameAr: true } } },
    });
    if (!request || request.archivedAt) throw new NotFoundException('طلب الدور المهني غير موجود');
    if (request.personId === reviewerPersonId) throw new ForbiddenException('لا يمكن اعتماد أو رفض طلبك بنفسك');
    if (request.reviewerPersonId !== reviewerPersonId) throw new ForbiddenException('يجب استلام الطلب قبل اتخاذ القرار');
    if (request.status !== 'UNDER_REVIEW') throw new BadRequestException('الطلب ليس تحت المراجعة');
    if (input.decision !== 'APPROVED' && !input.reviewerNote?.trim()) {
      throw new BadRequestException('ملاحظة المراجع مطلوبة لهذا القرار');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.professionalRoleRequest.update({
        where: { id: request.id },
        data: { status: input.decision, reviewerNote: input.reviewerNote?.trim(), reviewedAt: new Date() },
      });

      let activatedRole = false;
      if (input.decision === 'APPROVED') {
        const active = await tx.personRole.findFirst({ where: { personId: request.personId, roleId: request.roleId, revokedAt: null } });
        if (!active) {
          await tx.personRole.create({
            data: {
              personId: request.personId,
              roleId: request.roleId,
              scope: input.scopeRef ? 'ORGANIZATION' : 'OWN',
              scopeRef: input.scopeRef?.trim(),
            },
          });
          activatedRole = true;
        }
      }

      const notification = input.decision === 'APPROVED'
        ? { type: 'PROFESSIONAL_ROLE_APPROVED', titleAr: 'تم اعتماد طلبك المهني', bodyAr: `تم اعتماد طلب دور ${request.role.nameAr}.` }
        : input.decision === 'INFO_REQUIRED'
          ? { type: 'PROFESSIONAL_ROLE_INFO_REQUIRED', titleAr: 'معلومات إضافية مطلوبة', bodyAr: `يحتاج طلب دور ${request.role.nameAr} إلى معلومات إضافية. راجع ملاحظة المراجع.` }
          : { type: 'PROFESSIONAL_ROLE_REJECTED', titleAr: 'تم رفض طلبك المهني', bodyAr: `تم رفض طلب دور ${request.role.nameAr}. راجع ملاحظة المراجع.` };

      await tx.notification.create({
        data: {
          personId: request.personId,
          ...notification,
          referenceType: 'ProfessionalRoleRequest',
          referenceId: request.publicId,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorPersonId: reviewerPersonId,
          action: 'professional.role_request.decision',
          entityType: 'ProfessionalRoleRequest',
          entityId: request.publicId,
          result: 'SUCCESS',
          reason: input.reviewerNote?.trim(),
          referenceId: request.publicId,
          context: {
            decision: input.decision,
            previousStatus: request.status,
            roleActivated: activatedRole,
            scope: input.scopeRef ? 'ORGANIZATION' : 'OWN',
            scopeRef: input.scopeRef?.trim() ?? null,
          },
        },
      });
      return updated;
    });
  }
}
