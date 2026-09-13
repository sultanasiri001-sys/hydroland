import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getByPersonId(personId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { personId },
      include: {
        person: {
          select: {
            publicId: true,
            firstName: true,
            middleName: true,
            lastName: true,
            preferredLanguage: true,
            status: true,
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('الملف الشخصي غير موجود');
    return profile;
  }

  async updateByPersonId(personId: string, input: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({ where: { personId } });
    if (!existing) throw new NotFoundException('الملف الشخصي غير موجود');

    return this.prisma.profile.update({
      where: { personId },
      data: {
        displayName: input.displayName?.trim(),
        bio: input.bio?.trim(),
        regionCode: input.regionCode?.trim(),
        city: input.city?.trim(),
      },
    });
  }
}
