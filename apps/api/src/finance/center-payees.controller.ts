import { Controller, ForbiddenException, Get, Header, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { revealSecret } from '../auth/mfa-crypto';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';

type Request = { auth: {accountId: string} };

@Controller('finance/centers/:center/payees')
@UseGuards(AccessTokenGuard)
export class CenterPayeesController {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService) {}

  private async scope(tx: Prisma.TransactionClient, actorId: string, center: string) {
    try {
      const scope = await this.access.requireBranchAccountant(actorId, center, tx);
      await this.access.requireCenterOrganizationAccountant(actorId, scope.organizationId, tx);
      return scope.organizationId;
    } catch (error) {
      if (error instanceof Error && ['FINANCE_CENTER_MAPPING_AMBIGUOUS','FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED'].includes(error.message)) {
        throw new ForbiddenException();
      }
      throw error;
    }
  }

  private payees(center: string) {
    return Prisma.sql`FROM "ProviderPayoutProfile" b JOIN "Account" a ON a.id=b."accountId"
      JOIN "Person" p ON p.id=a."personId"
      WHERE b."encryptedIban" IS NOT NULL AND a.status='ACTIVE'
      AND EXISTS (SELECT 1 FROM "Organization" c WHERE c.id::text=${center} AND c.status='ACTIVE')
      AND EXISTS (SELECT 1 FROM "RoleAssignment" r WHERE r."accountId"=a.id AND r.status='ACTIVE' AND (
        (r.role='INSTRUCTOR' AND (EXISTS (SELECT 1 FROM "OrganizationMember" m WHERE m."accountId"=a.id
          AND m."organizationId"::text=${center} AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN','INSTRUCTOR'))
          OR EXISTS (SELECT 1 FROM "InstructorEarning" e WHERE e."instructorAccountId"::text=a.id::text
            AND e."centerOrganizationId"::text=${center} AND e.status='APPROVED')))
        OR (r.role='BOAT_OWNER' AND EXISTS (SELECT 1 FROM "Organization" o JOIN "MarineAsset" v ON v."organizationId"::text=o.id::text
          WHERE o."ownerId"=a.id AND o.kind='MARINE_OPERATOR' AND o.status='ACTIVE' AND v.status='ACTIVE' AND v."reviewCenterId"::text=${center}))))`;
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: Request, @Param('center') center: string) {
    return this.db.serializable(async tx => {
      const organization = await this.scope(tx, req.auth.accountId, center);
      return tx.$queryRaw<Array<{id:string;name:string;lastFour:string}>>`SELECT a.id, concat_ws(' ',p."firstName",p."lastName") AS name,
        b."lastFour" ${this.payees(organization)} ORDER BY name,a.id`;
    });
  }

  @Post(':id/bank')
  @Header('Cache-Control', 'private, no-store')
  bank(@Req() req: Request, @Param('center') center: string, @Param('id') id: string) {
    return this.db.serializable(async tx => {
      const organization = await this.scope(tx, req.auth.accountId, center);
      const [row] = await tx.$queryRaw<Array<{holder:string;encryptedIban:string}>>`SELECT b.holder,b."encryptedIban"
        ${this.payees(organization)} AND a.id::text=${id}`;
      if (!row) throw new NotFoundException();
      const actor = await tx.account.findUniqueOrThrow({where:{id:req.auth.accountId},select:{personId:true}});
      const iban = revealSecret(row.encryptedIban, 'provider-payout:' + id);
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'CENTER_PAYEE_BANK_VIEWED',resource:'ProviderPayoutProfile',
        resourceId:id,metadata:{centerOrganizationId:organization}}});
      return {holder:row.holder, iban};
    });
  }
}
