import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

const THEME_CATALOG = [
  { id: 'ocean-horizon', nameAr: 'الأفق البحري', category: 'core' },
  { id: 'winter-current', nameAr: 'تيار الشتاء', category: 'seasonal' },
  { id: 'spring-reef', nameAr: 'شعاب الربيع', category: 'seasonal' },
  { id: 'summer-coast', nameAr: 'ساحل الصيف', category: 'seasonal' },
  { id: 'autumn-depth', nameAr: 'عمق الخريف', category: 'seasonal' },
  { id: 'founding-day', nameAr: 'يوم التأسيس', category: 'national' },
  { id: 'national-day', nameAr: 'اليوم الوطني', category: 'national' },
  { id: 'eid-al-fitr', nameAr: 'عيد الفطر', category: 'holiday' },
  { id: 'eid-al-adha', nameAr: 'عيد الأضحى', category: 'holiday' },
  { id: 'marine-event', nameAr: 'فعالية بحرية', category: 'event' },
] as const;

type ThemeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type ThemeScheduleRow = {
  id: string;
  themeId: string;
  name: string | null;
  status: ThemeStatus;
  startsAt: Date;
  endsAt: Date;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ThemesService {
  constructor(private readonly db: DatabaseService) {}

  catalog() {
    return THEME_CATALOG;
  }

  async active() {
    const rows = await this.db.$queryRawUnsafe<ThemeScheduleRow[]>(
      'SELECT * FROM "ThemeSchedule" WHERE "status" = \'PUBLISHED\' AND "startsAt" <= NOW() AND "endsAt" >= NOW() ORDER BY "startsAt" DESC LIMIT 1',
    );
    return rows[0] ?? { themeId: 'ocean-horizon', status: 'FALLBACK' };
  }

  async listSchedules() {
    return this.db.$queryRawUnsafe<ThemeScheduleRow[]>(
      'SELECT * FROM "ThemeSchedule" ORDER BY "startsAt" DESC',
    );
  }

  async schedule(input: { themeId?: string; name?: string; startsAt?: string; endsAt?: string; status?: ThemeStatus }, createdById?: string) {
    const themeId = input.themeId ?? '';
    if (!THEME_CATALOG.some(theme => theme.id === themeId)) throw new BadRequestException('Unknown theme.');
    if (!input.startsAt || !input.endsAt) throw new BadRequestException('startsAt and endsAt are required.');
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Invalid theme schedule window.');
    }
    const status: ThemeStatus = input.status ?? 'DRAFT';
    const id = randomUUID();
    const rows = await this.db.$queryRawUnsafe<ThemeScheduleRow[]>(
      'INSERT INTO "ThemeSchedule" ("id","themeId","name","status","startsAt","endsAt","createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      id,
      themeId,
      input.name ?? null,
      status,
      startsAt,
      endsAt,
      createdById ?? null,
    );
    return rows[0];
  }

  async setStatus(id: string, status: ThemeStatus) {
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) throw new BadRequestException('Invalid theme status.');
    const rows = await this.db.$queryRawUnsafe<ThemeScheduleRow[]>(
      'UPDATE "ThemeSchedule" SET "status"=$2,"updatedAt"=NOW() WHERE "id"=$1 RETURNING *',
      id,
      status,
    );
    if (!rows[0]) throw new NotFoundException('Theme schedule not found.');
    return rows[0];
  }
}
