import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecutiveDecision, ExecutiveMandate, GovernanceBody } from './executive-governance.domain';

@Injectable()
export class ExecutiveGovernanceFoundationService {
  validateBody(body: GovernanceBody): void {
    if (!body.id || !body.organizationId || !body.name?.trim() || !body.chairAccountId) throw new BadRequestException('Governance body identity, organization, name and chair are required.');
    if (!body.memberAccountIds.length) throw new BadRequestException('Governance body requires at least one member.');
  }

  validateMandate(mandate: ExecutiveMandate): void {
    if (!mandate.id || !mandate.organizationId || !mandate.title?.trim() || !mandate.ownerAccountId) throw new BadRequestException('Executive mandate identity, organization, title and owner are required.');
    if (!mandate.authorityScope.length) throw new BadRequestException('Executive mandate requires an authority scope.');
  }

  validateDecision(decision: ExecutiveDecision, body: GovernanceBody): void {
    this.validateBody(body);
    if (!decision.id || !decision.referenceNumber?.trim() || !decision.title?.trim() || !decision.issuedByAccountId) throw new BadRequestException('Executive decision identity, reference, title and issuer are required.');
    if (decision.organizationId !== body.organizationId || decision.governanceBodyId !== body.id) throw new BadRequestException('Executive decision governance scope mismatch.');
  }
}
