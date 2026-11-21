import { Prisma } from '@prisma/client';

type TripSlot = { id: string; type: string; startsAt: Date; endsAt: Date; organizationId?: string | null };

export async function tripCalendarReservation(tx: Prisma.TransactionClient, trip: TripSlot, enforce: boolean) {
  const calendarEvent = await tx.calendarEvent.findUnique({ where: { referenceType_referenceId: { referenceType: 'TRIP', referenceId: trip.id } }, include: { allocations: { where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, include: { resource: true } } } });
  const allocations = calendarEvent?.allocations ?? [];
  const conflicts = allocations.length ? await tx.calendarAllocation.findMany({ where: { resourceId: { in: allocations.map(a => a.resourceId) }, status: 'ACTIVE', eventId: { not: calendarEvent!.id }, startsAt: { lt: trip.endsAt }, endsAt: { gt: trip.startsAt }, event: { status: 'ACTIVE' } }, orderBy: { id: 'asc' }, select: { id: true, eventId: true, resourceId: true, startsAt: true, endsAt: true, updatedAt: true } }) : [];
  const requiredTypes = trip.type.toUpperCase().includes('BOAT') ? ['BOAT'] : trip.type.toUpperCase().includes('SHORE') ? ['SITE'] : [];
  const calendarIssues: string[] = [];
  if (!calendarEvent || calendarEvent.status !== 'ACTIVE') calendarIssues.push('CALENDAR_EVENT_MISSING_OR_INACTIVE');
  if (enforce && calendarEvent && trip.organizationId && calendarEvent.organizationId !== trip.organizationId) calendarIssues.push('CALENDAR_SUPPLIER_MISMATCH');
  if (calendarEvent && (calendarEvent.startsAt.getTime() !== trip.startsAt.getTime() || calendarEvent.endsAt.getTime() !== trip.endsAt.getTime())) calendarIssues.push('CALENDAR_TIME_MISMATCH');
  if (allocations.some(a => !a.resource.active)) calendarIssues.push('CALENDAR_RESOURCE_INACTIVE');
  if (allocations.some(a => a.startsAt.getTime() !== trip.startsAt.getTime() || a.endsAt.getTime() !== trip.endsAt.getTime())) calendarIssues.push('CALENDAR_ALLOCATION_TIME_MISMATCH');
  if (requiredTypes.some(type => !allocations.some(a => a.resource.type === type && a.resource.active))) calendarIssues.push('CALENDAR_REQUIRED_RESOURCE_MISSING');
  if (conflicts.length) calendarIssues.push('CALENDAR_RESOURCE_CONFLICT');
  const calendarReservation = { status: calendarIssues.length ? 'NEEDS_ATTENTION' : 'RESERVED', issues: calendarIssues, activeAllocationCount: allocations.length, confirmationGateEnforced: enforce };
  return { calendarEvent, conflicts, calendarReservation };
}
