import { BadRequestException, Controller, Get, Header, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';

type AuthenticatedRequest = { auth: { accountId: string } };
const PAGE_SIZE = 25;

/** Read-only template history. Never joins employee/record/signature payloads. */
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentTemplateHistoryController {
  constructor(
    private readonly db: DatabaseService,
    private readonly authorization: DocumentAuthorizationService,
  ) {}

  @Get('organizations/:organizationId/templates/:code/history')
  @Header('Cache-Control', 'private, no-store')
  async history(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
    @Param('code') code: string,
    @Query('beforeVersion') beforeVersion?: string,
  ) {
    if (typeof code !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(code)) {
      throw new BadRequestException('Invalid template code.');
    }
    let cursor: number | undefined;
    if (beforeVersion !== undefined) {
      if (typeof beforeVersion !== 'string' || !/^[1-9][0-9]*$/.test(beforeVersion)) {
        throw new BadRequestException('beforeVersion must be a positive safe integer.');
      }
      cursor = Number(beforeVersion);
      if (!Number.isSafeInteger(cursor)) {
        throw new BadRequestException('beforeVersion must be a positive safe integer.');
      }
    }
    return this.db.serializable(async tx => {
      // Reuses owner-only internal access and organization membership checks.
      // Authorize before any template lookup, including missing/reserved codes.
      await this.authorization.assert(request.auth.accountId, organizationId, 'TEMPLATE_LIST', tx);
      if (code.toUpperCase() === COOPERATION_CODE.toUpperCase() || isLibraryCode(code.toUpperCase())) {
        throw new BadRequestException('Use the contract library for contract template history.');
      }
      const anchor = await tx.documentTemplate.findFirst({
        where: { organizationId, code },
        orderBy: { version: 'desc' },
        select: { department: true },
      });
      if (!anchor) throw new NotFoundException('Document template not found in organization scope.');
      const rows = await tx.documentTemplate.findMany({
        where: { organizationId, code, ...(cursor === undefined ? {} : { version: { lt: cursor } }) },
        orderBy: { version: 'desc' },
        take: PAGE_SIZE + 1,
        select: {
          id: true, organizationId: true, code: true, department: true,
          version: true, status: true, titleAr: true, titleEn: true,
          printable: true, fields: true,
        },
      });
      if (rows.some(row => row.department !== anchor.department)) {
        throw new BadRequestException('Template history has conflicting department ownership.');
      }
      const items = rows.slice(0, PAGE_SIZE);
      return {
        organizationId, code, department: anchor.department, items,
        nextBeforeVersion: rows.length > PAGE_SIZE ? items[items.length - 1].version : null,
      };
    });
  }
}
