import { BadRequestException, Injectable } from '@nestjs/common';
import { MaintainableAsset } from './facilities-maintenance.domain';
import { MaintenanceWorkOrder } from './facilities-maintenance-workflow.service';

export type MaintenanceOperationType = 'TRIP' | 'TRAINING' | 'WAREHOUSE' | 'CENTER_OPERATION' | 'VESSEL_SUPPORT';

export interface MaintenanceOperationalContext {
  organizationId: string;
  operationType: MaintenanceOperationType;
  operationId: string;
  assets: MaintainableAsset[];
  workOrders: MaintenanceWorkOrder[];
  requiredSparePartsAvailable: boolean;
  facilityOperational: boolean;
}

export interface MaintenanceOperationalReadiness {
  allowed: boolean;
  blockers: string[];
}

@Injectable()
export class FacilitiesMaintenanceOperationsService {
  readiness(context: MaintenanceOperationalContext): MaintenanceOperationalReadiness {
    if (!context.organizationId || !context.operationId) throw new BadRequestException('Maintenance operational scope is required.');
    const blockers: string[] = [];
    if (!context.facilityOperational) blockers.push('FACILITY_NOT_OPERATIONAL');
    if (!context.requiredSparePartsAvailable) blockers.push('REQUIRED_SPARE_PARTS_UNAVAILABLE');

    for (const asset of context.assets) {
      if (asset.organizationId !== context.organizationId) throw new BadRequestException('Maintainable asset organization mismatch.');
      if (asset.status === 'OUT_OF_SERVICE' || asset.status === 'RETIRED') blockers.push('REQUIRED_ASSET_UNAVAILABLE');
      const blockingOrder = context.workOrders.some((order) =>
        order.organizationId === context.organizationId &&
        order.assetId === asset.id &&
        order.status !== 'COMPLETED' &&
        order.status !== 'CLOSED' &&
        order.status !== 'REJECTED'
      );
      if (blockingOrder && (asset.criticality === 'HIGH' || asset.criticality === 'CRITICAL')) blockers.push('CRITICAL_MAINTENANCE_WORK_OPEN');
    }

    for (const order of context.workOrders) {
      if (order.organizationId !== context.organizationId) throw new BadRequestException('Maintenance work order organization mismatch.');
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: MaintenanceOperationalContext): MaintenanceOperationalReadiness {
    const readiness = this.readiness(context);
    if (!readiness.allowed) throw new BadRequestException(`Maintenance readiness blocked: ${readiness.blockers.join(', ')}`);
    return readiness;
  }
}
