import { BadRequestException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';
import { documentWorkflowReadiness } from './document-workflow-readiness';

/** Private, scoped diagnostics only. No IAM, approval, signing, or setup writes. */
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentWorkflowReadinessController {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  @Get('organizations/:organizationId/documents/:documentId/workflow-readiness')
  @Header('Cache-Control', 'private, no-store')
  async inspect(@Req() request: { auth: { accountId: string } }, @Param('organizationId') organizationId: string, @Param('documentId') documentId: string) {
    if (![organizationId, documentId].every(value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value))) {
      throw new BadRequestException('Invalid document workflow scope.');
    }
    return this.db.serializable(async tx => {
      // Authorize before inspecting any document, including absent/foreign IDs.
      const access = await this.authz.assert(request.auth.accountId, organizationId, 'DOCUMENT_READ', tx);
      const record = await tx.managedDocument.findFirst({
        where: { id: documentId, organizationId },
        select: { id: true, organizationId: true, version: true, status: true,
          createdByAccountId: true, approvedByAccountId: true, template: { select: { code: true } } },
      });
      if (!record) throw new NotFoundException('Document not found in organization scope.');
      if (record.template.code === COOPERATION_CODE || isLibraryCode(record.template.code)) {
        throw new ForbiddenException('Use the specialized contract workflow.');
      }
      const internalOwnerOnly = 'accessBasis' in access && access.accessBasis === 'PLATFORM_OWNER';
      return { ...documentWorkflowReadiness(record, { accountId: request.auth.accountId, role: access.role, internalOwnerOnly }), observedAt: new Date().toISOString() };
    });
  }
}
