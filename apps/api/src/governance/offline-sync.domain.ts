export interface OfflineEvidenceEvent {
  id: string;
  deviceId: string;
  actorId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  deviceOccurredAt: string;
  receivedAt?: string;
  synchronizedAt?: string;
  sequence: number;
}

export function sortOfflineEvents(events: OfflineEvidenceEvent[]): OfflineEvidenceEvent[] {
  return [...events].sort((a, b) => a.sequence - b.sequence || a.deviceOccurredAt.localeCompare(b.deviceOccurredAt));
}
