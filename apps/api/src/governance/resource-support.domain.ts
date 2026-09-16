export enum SupportResourceType {
  INSTRUCTOR = 'INSTRUCTOR',
  STAFF = 'STAFF',
  TRIP_CREW = 'TRIP_CREW',
  EQUIPMENT = 'EQUIPMENT',
  INVENTORY = 'INVENTORY',
  VESSEL = 'VESSEL',
  FACILITY = 'FACILITY',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export enum SupportRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SUPPORTING_CENTER_REVIEW = 'SUPPORTING_CENTER_REVIEW',
  EXECUTIVE_REVIEW = 'EXECUTIVE_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  RETURN_DUE = 'RETURN_DUE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SupportPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export interface InterCenterSupportRequest {
  id: string;
  requestingCenterId: string;
  requestingDepartmentId: string;
  supportingCenterId?: string;
  resourceType: SupportResourceType;
  resourceId?: string;
  quantity: number;
  startAt: string;
  endAt: string;
  reason: string;
  priority: SupportPriority;
  status: SupportRequestStatus;
  costCenterId?: string;
  estimatedCost?: number;
  approvedCost?: number;
  createdBy: string;
  createdAt: string;
}

export interface ResourceReservation {
  id: string;
  resourceType: SupportResourceType;
  resourceId: string;
  centerId: string;
  startsAt: string;
  endsAt: string;
  sourceType: 'TRAINING' | 'TRIP' | 'SUPPORT' | 'MAINTENANCE' | 'OTHER';
  sourceId: string;
}

export function hasResourceConflict(
  candidate: Pick<ResourceReservation, 'resourceId' | 'startsAt' | 'endsAt'>,
  existing: ResourceReservation[],
): boolean {
  const start = new Date(candidate.startsAt).getTime();
  const end = new Date(candidate.endsAt).getTime();
  return existing.some((reservation) => {
    if (reservation.resourceId !== candidate.resourceId) return false;
    const reservedStart = new Date(reservation.startsAt).getTime();
    const reservedEnd = new Date(reservation.endsAt).getTime();
    return start < reservedEnd && end > reservedStart;
  });
}
