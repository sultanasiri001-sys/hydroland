import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type OfflineTripReader = { accountId: string; sessionId: string };

@Injectable()
export class OfflineTripAuthorizationService {
  constructor(private readonly db: DatabaseService) {}

  async assertAccess(reader: OfflineTripReader, tripId: string): Promise<void> {
    // Identity comes only from AccessTokenGuard. Recheck the persisted session and
    // account here as reads/signing may outlive the controller guard's check.
    if (!reader?.accountId || !reader.sessionId) throw new UnauthorizedException('Active session required.');
    // One statement evaluates identity, current entitlements and resource scope
    // together. Separate checks can miss a revocation between their snapshots.
    const [access] = await this.db.$queryRaw<Array<{ authenticated: boolean; permitted: boolean }>>`
      WITH reader AS (
        SELECT a."id" FROM "Account" a JOIN "Session" s ON s."accountId" = a."id"
        WHERE a."id"::text = ${reader.accountId} AND s."id"::text = ${reader.sessionId}
          AND a."status" = 'ACTIVE' AND a."emailVerifiedAt" IS NOT NULL
          AND s."revokedAt" IS NULL AND s."tokenHash" NOT LIKE 'mfa:%'
          -- Canonical Prisma timestamps store UTC without a zone; the historical
          -- identity migration uses timestamptz. EPOCH handles both consistently.
          AND EXTRACT(EPOCH FROM s."expiresAt") > ${Date.now() / 1000}
      )
      SELECT EXISTS(SELECT 1 FROM reader) AS authenticated,
        EXISTS(
          SELECT 1 FROM reader a JOIN "Trip" t ON t."id"::text = ${tripId}
          WHERE
            -- Canonical BookingManagementService admin scope, not reviewer scope.
            EXISTS(SELECT 1 FROM "RoleAssignment" r WHERE r."accountId" = a."id"
              AND r."role" = 'ADMIN' AND r."status" = 'ACTIVE')
            OR (
              EXISTS(SELECT 1 FROM "RoleAssignment" r WHERE r."accountId" = a."id"
                AND r."role" = 'DIVE_CENTER' AND r."status" = 'ACTIVE')
              -- Preserve CenterTripManagementService's single oldest active center.
              AND t."organizationId" = (
                SELECT m."organizationId" FROM "OrganizationMember" m
                JOIN "Organization" o ON o."id" = m."organizationId"
                WHERE m."accountId" = a."id" AND m."status" = 'ACTIVE'
                  AND m."role" IN ('OWNER','ADMIN') AND o."kind" = 'DIVE_CENTER' AND o."status" = 'ACTIVE'
                ORDER BY m."createdAt" ASC LIMIT 1
              )
            )
            OR (
              EXISTS(SELECT 1 FROM "RoleAssignment" r WHERE r."accountId" = a."id"
                AND r."role" = 'BOAT_OWNER' AND r."status" = 'ACTIVE')
              -- Same active operational memberships as MarineTripManagementService.
              AND EXISTS(
                SELECT 1 FROM "OrganizationMember" m JOIN "Organization" o ON o."id" = m."organizationId"
                WHERE m."accountId" = a."id" AND m."organizationId" = t."organizationId"
                  AND m."status" = 'ACTIVE' AND m."role" IN ('OWNER','ADMIN','OPERATOR','STAFF')
                  AND o."kind" = 'MARINE_OPERATOR' AND o."status" = 'ACTIVE'
              )
            )
        ) AS permitted
    `;
    if (!access?.authenticated) throw new UnauthorizedException('Active session required.');
    // A booking, participant/crew link or author/reviewer role alone does not
    // establish access to the full private package. Fail closed until specified.
    if (!access.permitted) throw new ForbiddenException('Offline trip resource access denied.');
  }

  async read<T>(reader: OfflineTripReader, tripId: string, work: () => Promise<T>): Promise<T> {
    await this.assertAccess(reader, tripId);
    try {
      return await work();
    } finally {
      // Fresh reads, not a repeatable-read snapshot: revocation while awaiting
      // metadata/storage must prevent both data and resource-specific errors.
      await this.assertAccess(reader, tripId);
    }
  }
}
