import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}
  async get(accountId: string) {
    return this.db.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        status: true,
        roleAssignments: {
          select: { id: true, role: true, status: true, activeAt: true, updatedAt: true },
          orderBy: { createdAt: 'asc' },
        },
        person: { select: { firstName: true, lastName: true, phone: true, professional: true } },
      },
    });
  }
  async update(accountId: string, input: { firstName?: string; lastName?: string; phone?: string; headline?: string; bio?: string; regionCode?: string }) {
    if (input.firstName !== undefined && !input.firstName.trim()) throw new BadRequestException('First name cannot be empty.');
    return this.db.account.update({
      where: { id: accountId },
      data: {
        person: {
          update: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            professional: {
              upsert: {
                create: { headline: input.headline, bio: input.bio, regionCode: input.regionCode },
                update: { headline: input.headline, bio: input.bio, regionCode: input.regionCode }
              }
            }
          }
        }
      },
      select: { id: true, person: { include: { professional: true } } }
    });
  }
}
