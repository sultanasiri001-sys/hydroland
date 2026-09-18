export enum SupportResourceType {
  INSTRUCTOR = 'INSTRUCTOR',
  EMPLOYEE = 'EMPLOYEE',
  TRIP_CREW = 'TRIP_CREW',
  EQUIPMENT = 'EQUIPMENT',
  INVENTORY = 'INVENTORY',
  VESSEL = 'VESSEL',
  VEHICLE = 'VEHICLE',
  FACILITY = 'FACILITY',
  OTHER = 'OTHER',
}

export enum SupportRequestStatus {
  DRAFT = 'DRAFT', SUBMITTED = 'SUBMITTED', UNDER_REVIEW = 'UNDER_REVIEW', SUPPORTING_CENTER_REVIEW = 'SUPPORTING_CENTER_REVIEW', EXECUTIVE_REVIEW = 'EXECUTIVE_REVIEW', APPROVED = 'APPROVED', REJECTED = 'REJECTED', ACTIVE = 'ACTIVE', RETURN_DUE = 'RETURN_DUE', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED',
}

export enum SupportPriority { NORMAL = 'NORMAL', HIGH = 'HIGH', URGENT = 'URGENT', EMERGENCY = 'EMERGENCY' }

export interface InterCenterSupportRequest {
  id: string;
  requestingCenterId: string;
  requestingDepartmentId: string;
  supportingCenterId?: string;
  resourceType: SupportResourceType;
  resourceId?: string;
  quantity: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  priority: SupportPriority;
  status: SupportRequestStatus;
  costCenterId?: string;
  estimatedCostMinor?: number;
  approvedCostMinor?: number;
  currency?: string;
  createdBy: string;
  createdAt: string;
}

// Canonical persistence for actual reservations remains CalendarResource/CalendarAllocation.
export interface ResourceReservationIntent {
  resourceType: SupportResourceType;
  resourceId: string;
  centerId: string;
  startsAt: string;
  endsAt: string;
  sourceType: 'TRAINING' | 'TRIP' | 'SUPPORT' | 'MAINTENANCE' | 'OTHER';
  sourceId: string;
}

export function overlaps(candidate: Pick<ResourceReservationIntent, 'startsAt' | 'endsAt'>, existing: Pick<ResourceReservationIntent, 'startsAt' | 'endsAt'>): boolean {
  return new Date(candidate.startsAt).getTime() < new Date(existing.endsAt).getTime() && new Date(candidate.endsAt).getTime() > new Date(existing.startsAt).getTime();
}
