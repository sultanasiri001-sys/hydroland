import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get,
  NotFoundException, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';

const evidenceType = 'PROVIDER_QUALITY_TRIP_REHEARSAL_V1';
type ActorRequest = { auth: { accountId: string } };

function requiredText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength)
    throw new BadRequestException('A valid reference or reason is required.');
  return value.trim();
}

@UseGuards(AccessTokenGuard)
@Controller('organizations/:org/provider-quality')
export class ProviderAppealRehearsalController {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async member(tx: Prisma.TransactionClient, org: string, actor: string) {
    return tx.organizationMember.findFirst({
      where: { organizationId: org, accountId: actor, status: 'ACTIVE', organization: { status: 'ACTIVE' }, account: { status: 'ACTIVE' } },
      select: { role: true },
    });
  }

  private async independentReviewer(tx: Prisma.TransactionClient, org: string, actor: string) {
    const role = await tx.roleAssignment.findFirst({
      where: { accountId: actor, status: 'ACTIVE', role: { in: ['REVIEWER', 'ADMIN'] }, account: { status: 'ACTIVE' } },
    });
    const organization = await tx.organization.findFirst({ where: { id: org, status: 'ACTIVE' }, select: { ownerId: true } });
    if (!role || !organization || organization.ownerId === actor || await this.member(tx, org, actor))
      throw new ForbiddenException('An independent platform reviewer is required.');
  }

  private async observation(tx: Prisma.TransactionClient, org: string, id: string) {
    const entry = await tx.customerCase.findFirst({ where: { id, organizationId: org, referenceType: evidenceType } });
    if (!entry) throw new NotFoundException('Observation not found.');
    return entry;
  }

  @Post('observations')
  observe(@Req() req: ActorRequest, @Param('org') org: string, @Body() input: { tripId?: string; reason?: string }) {
    const actor = req.auth.accountId;
    const tripId = requiredText(input?.tripId, 160);
    const reason = requiredText(input?.reason, 2000);
    return this.db.serializable(async tx => {
      await this.independentReviewer(tx, org, actor);
      const trip = await tx.trip.findFirst({ where: { id: tripId, organizationId: org }, select: { id: true } });
      if (!trip) throw new NotFoundException('Source trip not found for this provider.');
      const entry = await tx.customerCase.create({
        data: { organizationId: org, customerId: actor, type: 'QUESTION', subject: 'ملاحظة جودة قيد المراجعة',
          description: reason, referenceType: evidenceType, referenceId: trip.id },
      });
      await this.audit.record({ actorId: actor, action: 'provider_quality.observed', resource: 'CustomerCase',
        resourceId: entry.id, metadata: { organizationId: org, tripId, policy: evidenceType } }, tx);
      return entry;
    });
  }

  @Post(':id/appeals')
  appeal(@Req() req: ActorRequest, @Param('org') org: string, @Param('id') id: string, @Body() input: { reason?: string }) {
    const actor = req.auth.accountId;
    const reason = requiredText(input?.reason, 2000);
    return this.db.serializable(async tx => {
      const member = await this.member(tx, org, actor);
      if (!member || !['OWNER', 'ADMIN', 'OPERATOR'].includes(member.role)) throw new ForbiddenException();
      const entry = await this.observation(tx, org, id);
      if (entry.customerId === actor) throw new ForbiddenException();
      if (entry.status !== 'OPEN') throw new ConflictException('An observation accepts one appeal.');
      const reply = await tx.customerInteraction.create({ data: { caseId: id, actorId: actor, actorType: 'CUSTOMER', channel: 'WEB', message: reason } });
      await tx.customerCase.update({ where: { id }, data: { status: 'ASSIGNED' } });
      await this.audit.record({ actorId: actor, action: 'provider_quality.appealed', resource: 'CustomerCase', resourceId: id,
        metadata: { organizationId: org, replyId: reply.id } }, tx);
      return { id, status: 'UNDER_REVIEW' };
    });
  }

  @Post(':id/decision')
  decide(@Req() req: ActorRequest, @Param('org') org: string, @Param('id') id: string,
    @Body() input: { outcome?: 'RETRACT' | 'UPHOLD'; reason?: string }) {
    const actor = req.auth.accountId;
    const outcome = input?.outcome;
    if (outcome !== 'RETRACT' && outcome !== 'UPHOLD') throw new BadRequestException('Choose a review outcome.');
    const reason = requiredText(input?.reason, 2000);
    return this.db.serializable(async tx => {
      await this.independentReviewer(tx, org, actor);
      const entry = await this.observation(tx, org, id);
      if (entry.customerId === actor || await tx.auditEvent.findFirst({ where: {
        action: 'provider_quality.appealed', resource: 'CustomerCase', resourceId: id, actor: { account: { id: actor } },
      } })) throw new ForbiddenException('A different reviewer must decide.');
      if (entry.status !== 'ASSIGNED') throw new ConflictException('No pending appeal.');
      const decision = await tx.customerInteraction.create({ data: { caseId: id, actorId: actor, actorType: 'STAFF', channel: 'WEB', message: reason } });
      await tx.customerCase.update({ where: { id }, data: { status: 'RESOLVED', assignedAccountId: actor } });
      await this.audit.record({ actorId: actor, action: 'provider_quality.decided', resource: 'CustomerCase', resourceId: id,
        metadata: { organizationId: org, outcome, decisionId: decision.id, policy: evidenceType } }, tx);
      return { id, outcome, reason };
    });
  }

  @Get(':id')
  read(@Req() req: ActorRequest, @Param('org') org: string, @Param('id') id: string) {
    return this.db.serializable(async tx => {
      if (!await this.member(tx, org, req.auth.accountId)) await this.independentReviewer(tx, org, req.auth.accountId);
      const entry = await this.observation(tx, org, id);
      const history = await tx.auditEvent.findMany({ where: { resource: 'CustomerCase', resourceId: id, action: { startsWith: 'provider_quality.' } },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { action: true, actorId: true, occurredAt: true, metadata: true } });
      const replies = await tx.customerInteraction.findMany({ where: { caseId: id }, orderBy: [{ createdAt: 'asc' }, {id:'asc'}],
        select: {id:true, actorType:true, message:true, createdAt:true} });
      const decision = history.find(event => event.action === 'provider_quality.decided');
      const data = decision?.metadata as { outcome?: string } | null;
      return { observation: entry, effectiveOutcome: data?.outcome ?? null, history, replies };
    });
  }
}
