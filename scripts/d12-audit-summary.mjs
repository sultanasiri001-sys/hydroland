import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Each row is one existing organization-scoped producer, with the exact action and resource it writes.
const sources = [
  ['booking', 'organization.booking.requested', 'Booking', 'trips/trips.service.ts'],
  ['eligibility', 'organization.booking.participant.updated', 'BookingParticipant', 'trips/booking-participant.service.ts'],
  ['trip', 'CENTER_TRIP_PUBLISHED', 'Trip', 'organizations/center-trip-management.service.ts'],
  ['trip', 'MARINE_TRIP_PUBLISHED', 'Trip', 'marine-operations/marine-trip-management.service.ts'],
  ['crewReplacement', 'CREW_ASSIGNMENT_REASSIGNED', 'CrewAssignment', 'trips/crew-assignment.service.ts'],
  ['assignment', 'ADMIN_ROUTING_ASSIGNED', 'AdministrativeRouting', 'administrative-affairs/administrative-affairs-persistence.service.ts'],
  ['case', 'organization.customer_case.created', 'CustomerCase', 'customer-service/customer-case.service.ts'],
  ['case', 'organization.customer_case.replied', 'CustomerCase', 'customer-service/customer-case.service.ts'],
  ['incident', 'organization.safety_incident.reported', 'SafetyIncident', 'safety/safety-incidents.service.ts'],
  ['approval', 'OWNER_ADMINISTRATIVE_APPROVAL_RECORDED', 'OwnerAdministrativeApproval', 'document-forms/owner-administrative-approval.controller.ts'],
];
const byAction = new Map(sources.map(([category, action, resource]) => [action, { category, resource }]));
const unmeasured = ['search', 'offer', 'payment', 'payout'];
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);

function utc(value) {
  if (value instanceof Date) value = value.toISOString();
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) throw new Error('Expected a UTC timestamp ending in Z.');
  const normalized = value.slice(0, 19) + '.' + value.slice(19, -1).replace('.', '').padEnd(3, '0') + 'Z';
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== normalized) throw new Error('Invalid UTC date or time.');
  return normalized;
}

export async function summarizeAudit(events, { organization, from, until }) {
  if (!validId(organization)) throw new Error('Supply one organization ID.');
  const start = utc(from), end = utc(until);
  if (end <= start) throw new Error('The end of the reporting interval must follow its start.');
  const counts = new Map(sources.map(([category]) => [category, { events: 0, subjects: new Set() }]));
  const seen = new Map();
  for await (const event of events) {
    // Never infer a tenant from an actor or from a resource identifier.
    if (event?.metadata?.organizationId !== organization) continue;
    const source = byAction.get(event.action);
    if (!source || event.resource !== source.resource) continue;
    const at = utc(event.occurredAt);
    if (at < start || at >= end) continue;
    if (!validId(event.id) || !validId(event.resourceId)) throw new Error('A mapped event lacks a valid source identity.');
    const identity = JSON.stringify([at, event.action, event.resource, event.resourceId]);
    if (seen.has(event.id)) {
      if (seen.get(event.id) !== identity) throw new Error('The same audit ID has inconsistent source fields.');
      continue;
    }
    seen.set(event.id, identity);
    const category = counts.get(source.category);
    category.events++;
    category.subjects.add(JSON.stringify([event.resource, event.resourceId]));
  }
  const digest = createHash('sha256');
  digest.update(JSON.stringify(['D12.v1', organization, start, end]) + '\n');
  for (const id of [...seen.keys()].sort()) digest.update(JSON.stringify([id, seen.get(id)]) + '\n');
  return {
    schemaVersion: 'D12.v1', source: 'AuditEvent', from: start, until: end, sourceDigest: digest.digest('hex'),
    categories: Object.fromEntries([...counts].map(([category, value]) => [category, {
      events: value.events, distinctSubjects: value.subjects.size,
      sources: sources.filter(([key]) => key === category).map(([, action, resource, file]) => ({ action, resource, file: 'apps/api/src/' + file })),
    }])),
    unmeasured,
  };
}

async function* readExport() {
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { throw new Error('A line in the audit export is not valid JSON.'); }
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Each line must contain one audit record.');
    yield event;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { organization: { type: 'string' }, from: { type: 'string' }, until: { type: 'string' } } });
    const result = await summarizeAudit(readExport(), values);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
