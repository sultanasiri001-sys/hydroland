import { BadRequestException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { financeKey } from '../finance/finance-native-key';
import { platformOrganization } from '../hr/staffing-catalog';
import { centerReportRange } from '../organizations/center-report-range';
import { AdminGuard } from './admin.guard';

// Both the offline verifier and the API read this versioned producer list.
const sources: [string, string, string, string][] = require('../../d12-audit-sources.json');
const mapping = sources.map(([category, action, resource]) => ({ category, action, resource }));
type Request = { auth: { accountId: string } };
type CurrencySum = { currency: string; minor: string };

async function requireDashboardOwner(tx: Prisma.TransactionClient, id: string) {
  const email = process.env.D12_OWNER_EMAIL?.trim().toLowerCase();
  const deny = () => new ForbiddenException('هذه اللوحة مخصصة لمدير المنصة.');
  if (!email) throw deny();
  const account = await tx.account.findFirst({
    where: { id, email, status: 'ACTIVE', emailVerifiedAt: { not: null }, roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } },
    select: { id: true },
  });
  if (!account || (await platformOrganization(tx))?.ownerId !== id) throw deny();
}

@Controller('admin/d12')
@UseGuards(AccessTokenGuard, AdminGuard)
export class D12DashboardController {
  constructor(private readonly db: DatabaseService) {}

  @Get('organizations')
  @Header('Cache-Control', 'private, no-store')
  organizations(@Req() request: Request, @Query('q') q?: string) {
    return this.db.serializable(async tx => {
      await requireDashboardOwner(tx, request.auth.accountId);
      if (q !== undefined && (typeof q !== 'string' || q.length > 120)) throw new BadRequestException();
      return tx.organization.findMany({
        where: { status: 'ACTIVE', ...(q ? { displayName: { contains: q.trim(), mode: 'insensitive' as const } } : {}) },
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }], take: 50, select: { id: true, displayName: true },
      });
    });
  }

  @Get('organizations/:id/summary')
  @Header('Cache-Control', 'private, no-store')
  summary(@Req() request: Request, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.db.serializable(async tx => {
      await requireDashboardOwner(tx, request.auth.accountId);
      if (!/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(id)) throw new BadRequestException();
      const org = await tx.organization.findFirst({ where: { id, status: 'ACTIVE' }, select: { id: true, displayName: true } });
      if (!org) throw new NotFoundException();
      const range = centerReportRange(from, to);
      // Production and clean databases use both timestamp types. Prisma stores naive
      // timestamps as UTC. A transaction-local timezone keeps both comparisons identical.
      await tx.$queryRaw`SELECT set_config('TimeZone', 'UTC', true)`;
      const createdAt = { gte: range.start, lt: range.end };
      const audit = await tx.$queryRaw<Array<{category: string; events: number; subjects: number}>>`
        WITH sources AS (SELECT * FROM jsonb_to_recordset(${JSON.stringify(mapping)}::jsonb)
          AS m(category text, action text, resource text))
        SELECT m.category, count(e."id")::integer AS events,
          count(DISTINCT (e.resource, e."resourceId")) FILTER (WHERE e."id" IS NOT NULL)::integer AS subjects
        FROM sources m LEFT JOIN "AuditEvent" e ON e.action=m.action AND e.resource=m.resource
          AND e.metadata->>'organizationId'=${id} AND e."resourceId" IS NOT NULL
          AND e."occurredAt">=${range.start} AND e."occurredAt"<${range.end}
        GROUP BY m.category ORDER BY m.category`;
      const offers = await tx.storeCourseOffer.count({ where: { organizationId: id, createdAt } });
      const payments = await tx.payment.count({ where: { booking: { trip: { organizationId: id } }, createdAt } });
      const revenue = await tx.$queryRaw<CurrencySum[]>`
        SELECT currency, SUM("amountMinor")::text AS minor FROM "FinanceEntry"
        WHERE "organizationId"=${financeKey('FinanceEntry', 'organizationId', id)}
          AND type='REVENUE' AND status='POSTED' AND "postedAt">=${range.start} AND "postedAt"<${range.end}
        GROUP BY currency ORDER BY currency`;
      // Receivables are the current balance across this organization's center units.
      const receivables = await tx.$queryRaw<CurrencySum[]>`
        SELECT r.currency, SUM(r."outstandingMinor")::text AS minor FROM "Receivable" r
        JOIN "OrgUnit" u ON u.id::text=r."centerOrgUnitId"::text
        WHERE u."organizationId"=${financeKey('Organization', 'id', id)} AND u.type='CENTER'
          AND r.status IN ('OPEN','PARTIALLY_PAID','OVERDUE') GROUP BY r.currency ORDER BY r.currency`;
      return {
        version: 'D12.dashboard.v1', organization: org, from: range.from, to: range.to,
        timeZone: range.timeZone, readAt: new Date().toISOString(),
        audit: audit.map(row => ({
          ...row,
          sources: mapping.filter(m => m.category === row.category).map(m => m.resource + ' / ' + m.action),
        })),
        offers, payments, revenue, receivables,
        unmeasured: ['publicSearch', 'confirmedPayout'],
      };
    });
  }
}
