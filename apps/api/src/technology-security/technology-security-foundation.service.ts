import { BadRequestException, Injectable } from '@nestjs/common';
import { CybersecurityFinding, TechnologyAsset, TechnologyService } from './technology-security.domain';

@Injectable()
export class TechnologySecurityFoundationService {
  validateAsset(asset: TechnologyAsset): TechnologyAsset {
    if (!asset.id || !asset.organizationId || !asset.name.trim() || !asset.ownerAccountId) throw new BadRequestException('Technology asset identity and owner are required.');
    return asset;
  }

  validateFinding(finding: CybersecurityFinding, asset: TechnologyAsset): CybersecurityFinding {
    this.validateAsset(asset);
    if (!finding.id || !finding.organizationId || !finding.title.trim()) throw new BadRequestException('Cybersecurity finding identity and title are required.');
    if (finding.organizationId !== asset.organizationId || finding.assetId !== asset.id) throw new BadRequestException('Cybersecurity finding asset scope mismatch.');
    if ((finding.severity === 'HIGH' || finding.severity === 'CRITICAL') && !finding.evidenceReferences.length) throw new BadRequestException('High and critical findings require evidence.');
    return finding;
  }

  validateService(service: TechnologyService, assets: TechnologyAsset[]): TechnologyService {
    if (!service.id || !service.organizationId || !service.name.trim() || !service.ownerAccountId) throw new BadRequestException('Technology service identity and owner are required.');
    if (!service.assetIds.length) throw new BadRequestException('Technology service requires at least one asset.');
    const scoped = new Set(assets.filter((asset) => asset.organizationId === service.organizationId).map((asset) => asset.id));
    if (service.assetIds.some((id) => !scoped.has(id))) throw new BadRequestException('Technology service asset scope mismatch.');
    return service;
  }
}
