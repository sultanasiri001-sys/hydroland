import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

export type AdministrativeOwnedDomain =
  | 'ADMIN_RECORD' | 'CORRESPONDENCE' | 'MEETING' | 'MINUTES'
  | 'ADMIN_ROUTING' | 'ADMIN_ACTION_ITEM' | 'ADMIN_ARCHIVE';

export type ExternalAuthoritativeDomain =
  | 'HR' | 'FINANCE' | 'LEGAL' | 'EXECUTIVE_GOVERNANCE' | 'IAM'
  | 'SAFETY' | 'MARINE_OPERATIONS' | 'FACILITIES_MAINTENANCE'
  | 'INVENTORY' | 'CUSTOMER_SERVICE' | 'MARKETING' | 'RESEARCH_MARKET';

export type AdministrativeIntegrationMode = 'REFERENCE' | 'ROUTE' | 'EVIDENCE' | 'NOTIFY';

@Injectable()
export class AdministrativeAffairsOwnershipGuard {
  private readonly owned = new Set<AdministrativeOwnedDomain>([
    'ADMIN_RECORD','CORRESPONDENCE','MEETING','MINUTES','ADMIN_ROUTING','ADMIN_ACTION_ITEM','ADMIN_ARCHIVE',
  ]);

  assertOwnMutation(domain:string): asserts domain is AdministrativeOwnedDomain {
    if(!this.owned.has(domain as AdministrativeOwnedDomain)) {
      throw new ForbiddenException(`ADMIN_DOMAIN_OWNERSHIP_DENIED:${domain}`);
    }
  }

  assertExternalIntegration(domain:ExternalAuthoritativeDomain, mode:AdministrativeIntegrationMode): void {
    if(!domain || !mode) throw new BadRequestException('ADMIN_INTEGRATION_SCOPE_REQUIRED');
    if(!['REFERENCE','ROUTE','EVIDENCE','NOTIFY'].includes(mode)) throw new ForbiddenException('ADMIN_EXTERNAL_MUTATION_DENIED');
  }

  assertNoAuthorityGrant(input:{grantsExecutiveAuthority?:boolean;grantsIamPrivilege?:boolean;changesDomainState?:boolean}): void {
    if(input.grantsExecutiveAuthority) throw new ForbiddenException('ADMIN_EXECUTIVE_AUTHORITY_GRANT_DENIED');
    if(input.grantsIamPrivilege) throw new ForbiddenException('ADMIN_IAM_PRIVILEGE_GRANT_DENIED');
    if(input.changesDomainState) throw new ForbiddenException('ADMIN_EXTERNAL_DOMAIN_STATE_MUTATION_DENIED');
  }
}
