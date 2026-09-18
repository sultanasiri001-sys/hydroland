import { BadRequestException, Injectable } from '@nestjs/common';
import { Facility, MaintainableAsset, MaintenancePlan } from './facilities-maintenance.domain';

@Injectable()
export class FacilitiesMaintenanceFoundationService {
  validateFacility(facility: Facility): Facility {
    if (!facility.id || !facility.organizationId || !facility.name.trim()) throw new BadRequestException('Facility identity is required.');
    return facility;
  }

  validateAsset(asset: MaintainableAsset, facility: Facility): MaintainableAsset {
    this.validateFacility(facility);
    if (!asset.id || !asset.organizationId || !asset.name.trim() || !asset.category.trim() || !asset.ownerAccountId) throw new BadRequestException('Maintainable asset identity, category and owner are required.');
    if (asset.organizationId !== facility.organizationId || asset.facilityId !== facility.id) throw new BadRequestException('Maintainable asset facility scope mismatch.');
    return asset;
  }

  validatePlan(plan: MaintenancePlan, asset: MaintainableAsset): MaintenancePlan {
    if (!plan.id || !plan.organizationId || !plan.name.trim()) throw new BadRequestException('Maintenance plan identity is required.');
    if (plan.organizationId !== asset.organizationId || plan.assetId !== asset.id) throw new BadRequestException('Maintenance plan asset scope mismatch.');
    if (!Number.isInteger(plan.intervalDays) || plan.intervalDays <= 0) throw new BadRequestException('Maintenance interval must be a positive whole number of days.');
    return plan;
  }
}
