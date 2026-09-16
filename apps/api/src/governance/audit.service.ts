import { Injectable } from '@nestjs/common';
import { AuditEvent } from './domain';

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  append(event: AuditEvent): AuditEvent {
    this.events.push(Object.freeze({ ...event }));
    return event;
  }

  list(resourceType?: string, resourceId?: string): AuditEvent[] {
    return this.events.filter((event) =>
      (!resourceType || event.resourceType === resourceType) &&
      (!resourceId || event.resourceId === resourceId),
    );
  }
}
