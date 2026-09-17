import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type CreateDiveLogInput = {
  siteName: string;
  regionCode?: string;
  diveDate: string;
  maxDepthM: number;
  durationMin: number;
  buddyName?: string;
  instructorName?: string;
  notes?: string;
};

@Injectable()
export class DiveLogsService {
  constructor(private readonly db: DatabaseService) {}

  list(accountId: string) {
    return this.db.diveLog.findMany({
      where: { accountId },
      orderBy: { diveDate: 'desc' },
      include: {
        sourceTrip: {
          select: { id: true, title: true, type: true, startsAt: true, endsAt: true },
        },
        sourceParticipant: {
          select: {
            id: true,
            fullName: true,
            certificationTitle: true,
            certificationNumber: true,
            certificationIssuer: true,
            eligibilityStatus: true,
          },
        },
      },
    });
  }

  async create(accountId: string, input: CreateDiveLogInput) {
    const siteName = input.siteName?.trim();
    const diveDate = new Date(input.diveDate);
    if (!siteName) throw new BadRequestException('Dive site is required.');
    if (Number.isNaN(diveDate.getTime())) throw new BadRequestException('Valid dive date required.');
    if (!Number.isFinite(input.maxDepthM) || input.maxDepthM <= 0 || input.maxDepthM > 150) throw new BadRequestException('Invalid max depth.');
    if (!Number.isInteger(input.durationMin) || input.durationMin < 1 || input.durationMin > 600) throw new BadRequestException('Invalid duration.');
    return this.db.diveLog.create({
      data: {
        accountId,
        siteName,
        regionCode: input.regionCode?.trim() || null,
        diveDate,
        maxDepthM: input.maxDepthM,
        durationMin: input.durationMin,
        buddyName: input.buddyName?.trim() || null,
        instructorName: input.instructorName?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      include: {
        sourceTrip: { select: { id: true, title: true, type: true, startsAt: true, endsAt: true } },
        sourceParticipant: { select: { id: true, fullName: true } },
      },
    });
  }
}
