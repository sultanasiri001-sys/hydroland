import { Injectable } from '@nestjs/common';
import { Facility, MaintainableAsset } from './facilities-maintenance.domain';
import { MaintenanceWorkOrder } from './facilities-maintenance-workflow.service';

export interface FacilitiesMaintenanceGovernanceSnapshot {
  activeFacilities: number;
  outOfServiceAssets: number;
  criticalUnavailableAssets: number;
  openWorkOrders: number;
  overdueWorkOrders: number;
  completedWorkOrders: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class FacilitiesMaintenanceGovernanceService {
  snapshot(facilities: Facility[], assets: MaintainableAsset[], workOrders: MaintenanceWorkOrder[], now = new Date()): FacilitiesMaintenanceGovernanceSnapshot {
    const activeFacilities = facilities.filter((item) => item.active).length;
    const outOfServiceAssets = assets.filter((item) => item.status === 'OUT_OF_SERVICE').length;
    const criticalUnavailableAssets = assets.filter((item) => (item.criticality === 'HIGH' || item.criticality === 'CRITICAL') && item.status !== 'ACTIVE').length;
    const openWorkOrders = workOrders.filter((item) => !['COMPLETED', 'CLOSED', 'REJECTED'].includes(item.status)).length;
    const overdueWorkOrders = workOrders.filter((item) => item.scheduledAt && item.scheduledAt.getTime() < now.getTime() && !['COMPLETED', 'CLOSED', 'REJECTED'].includes(item.status)).length;
    const completedWorkOrders = workOrders.filter((item) => item.status === 'COMPLETED' || item.status === 'CLOSED').length;
    const alerts: string[] = [];
    if (criticalUnavailableAssets) alerts.push('CRITICAL_ASSET_AVAILABILITY_REVIEW');
    if (overdueWorkOrders) alerts.push('OVERDUE_MAINTENANCE_ESCALATION');
    if (outOfServiceAssets) alerts.push('OUT_OF_SERVICE_ASSET_REVIEW');
    return { activeFacilities, outOfServiceAssets, criticalUnavailableAssets, openWorkOrders, overdueWorkOrders, completedWorkOrders, alerts, generatedAt: now };
  }

  automationSignals(snapshot: FacilitiesMaintenanceGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.criticalUnavailableAssets) signals.push('REQUIRE_MAINTENANCE_MANAGEMENT_REVIEW');
    if (snapshot.overdueWorkOrders) signals.push('ESCALATE_OVERDUE_WORK_ORDERS');
    if (snapshot.outOfServiceAssets) signals.push('CREATE_ASSET_RECOVERY_FOLLOWUP');
    if (snapshot.openWorkOrders) signals.push('REVIEW_OPEN_MAINTENANCE_WORK');
    return signals;
  }
}
